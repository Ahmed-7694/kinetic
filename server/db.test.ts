import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KineticDatabase } from './db';
import { createPortalAccount as createLegacyPortalAccount } from './authAndStore';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-sqlite-test-'));
}

test('SQLite database migrates legacy JSON files seamlessly and prevents plaintext leaks', () => {
  const dir = makeTempDir();
  const legacyPortalPath = path.join(dir, 'portal-accounts.json');
  createLegacyPortalAccount(legacyPortalPath, {
    username: 'legacy_athlete',
    password: 'OldPassword1',
    displayName: 'متدرب سابق',
    tierCode: 'PRO',
    targetCalories: 2400,
  });

  const dbPath = path.join(dir, 'kinetic.db');
  const db = new KineticDatabase(dbPath);
  db.migrateLegacyJsonIfNeeded(dir);

  const accounts = db.listPortalAccounts();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].username, 'legacy_athlete');
  assert.equal(accounts[0].workoutDays.length > 0, true);
  assert.equal(accounts[0].nutritionPlan.meals.length > 0, true);
  assert.equal(accounts[0].supplements.length > 0, true);
  assert.equal(accounts[0].weeklyGoals.length > 0, true);
  assert.equal(accounts[0].weeklyRecords.length, 1);
  assert.match(accounts[0].weeklyRecords[0].hijriRangeAr, /هـ/);

  const verified = db.verifyPortalCredentials('legacy_athlete', 'OldPassword1');
  assert.equal(verified.ok, true);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('SQLite 16-week rolling window keeps weeks 1..16 and automatically evicts Week 1 upon adding Week 17', () => {
  const db = new KineticDatabase(':memory:');
  const created = db.createPortalAccount({
    username: 'khalid_fit',
    password: 'sDf',
    displayName: 'خالد المنصور',
    initialWeightKg: 92.0,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const accountId = created.account.id;
  assert.equal(created.account.weeklyRecords.length, 1);
  assert.equal(created.account.weeklyRecords[0].weekNumber, 1);

  for (let wk = 2; wk <= 16; wk++) {
    const res = db.addPortalWeekRecord(accountId, {
      weightKg: Number((92 - wk * 0.5).toFixed(1)),
      adherencePct: 95,
      goalsSummary: `أهداف الأسبوع ${wk}`,
      athleteNotes: `تحديث ${wk}`,
    });
    assert.ok(res);
    assert.equal(res.addedWeek.weekNumber, wk);
    assert.equal(res.evictedWeekNumbers.length, 0);
    assert.equal(res.account.weeklyRecords.length, wk);
  }

  // Insert Week 17 -> Week 1 must be deleted atomically from SQLite
  const week17Res = db.addPortalWeekRecord(accountId, {
    weightKg: 83.2,
    adherencePct: 99,
    goalsSummary: 'أهداف الأسبوع 17',
    coachNotes: 'مستوى رائع',
    athleteNotes: 'وصلنا للأسبوع 17',
  });
  assert.ok(week17Res);
  assert.equal(week17Res.addedWeek.weekNumber, 17);
  assert.deepEqual(week17Res.evictedWeekNumbers, [1]);
  assert.equal(week17Res.account.weeklyRecords.length, 16);
  assert.equal(week17Res.account.weeklyRecords[0].weekNumber, 2);
  assert.equal(week17Res.account.weeklyRecords[15].weekNumber, 17);
  assert.match(week17Res.account.weeklyRecords[15].gregorianRangeAr, /من .+ إلى .+/);
  assert.match(week17Res.account.weeklyRecords[15].hijriRangeAr, /من .+ إلى .+ هـ/);

  db.close();
});

test('SQLite stores custom workouts, meals, supplements, chat messages, and strips secrets on export', () => {
  const db = new KineticDatabase(':memory:');
  const created = db.createPortalAccount({
    username: 'sara_pro',
    password: 'MyPass99',
    displayName: 'سارة التميمي',
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const accountId = created.account.id;
  const customWorkouts = [...created.account.workoutDays];
  customWorkouts[0].exercises[0].weightKg = '85 كجم';
  customWorkouts[0].exercises[0].notes = 'ثبات ثانيتين بالأسفل';

  const updated = db.updatePortalAccount(accountId, {
    coachNotes: 'ركزي على جودة النوم هذا الأسبوع',
    workoutDays: customWorkouts,
  });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.account.coachNotes, 'ركزي على جودة النوم هذا الأسبوع');
    assert.equal(updated.account.workoutDays[0].exercises[0].weightKg, '85 كجم');
  }

  const msg1 = db.addChatMessage(accountId, 'admin', 'الكابتن طارق', 'كيف كان تمرين اليوم؟');
  const msg2 = db.addChatMessage(accountId, 'portal', 'سارة التميمي', 'ممتاز وزدت الوزن بالسكوات');
  assert.ok(msg1);
  assert.ok(msg2);

  const history = db.listChatMessages(accountId);
  assert.equal(history.length, 2);
  assert.equal(history[0].senderRole, 'admin');
  assert.equal(history[1].senderRole, 'portal');

  const portalExport = db.exportPortalAccountData(accountId);
  assert.ok(portalExport);
  const portalExportStr = JSON.stringify(portalExport);
  assert.equal(portalExportStr.includes('passwordHash'), false);
  assert.equal(portalExportStr.includes('salt'), false);
  assert.equal(portalExport.chatMessages.length, 2);

  const adminExport = db.exportAllAdminData();
  const adminExportStr = JSON.stringify(adminExport);
  assert.equal(adminExportStr.includes('passwordHash'), false);
  assert.equal(adminExportStr.includes('salt'), false);
  assert.equal(adminExport.portalAccounts.length, 1);

  assert.equal(db.deletePortalAccount(accountId), true);
  assert.deepEqual(db.listChatMessages(accountId), []);

  db.close();
});
