import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PORTAL_WEEKS,
  appendWeekToRollingWindow,
  buildSanitizedAdminFullExport,
  buildSanitizedPortalExport,
  computeNextWeekDates,
  createDefaultNutritionPlan,
  createDefaultSupplements,
  createDefaultWeeklyGoals,
  createDefaultWorkoutDaysFromCoaching,
  createInitialWeekRecord,
  formatCoachingReportTxt,
  formatDualDateRange,
  formatPortalWeeksCsv,
  type PortalWeekRecord,
} from './portalPlanning';
import { getDefaultSiteContentBundle } from './cmsSchema';

test('formatDualDateRange returns both Gregorian and Hijri start-end strings', () => {
  const res = formatDualDateRange('2026-11-24');
  assert.equal(res.startDateIso, '2026-11-24');
  assert.equal(res.endDateIso, '2026-11-30');
  assert.match(res.gregorianRangeAr, /من .+ إلى .+/);
  assert.match(res.hijriRangeAr, /من .+ إلى .+ هـ/);
  assert.match(res.gregorianRangeEn, /24 Nov 2026 – 30 Nov 2026/);
  assert.match(res.hijriRangeEn, /1448/);
});

test('16-week sliding window retains weeks 1..16, and adding Week 17 evicts Week 1', () => {
  let weeks: PortalWeekRecord[] = [createInitialWeekRecord(90, 'ar', '2026-01-01')];
  for (let w = 2; w <= MAX_PORTAL_WEEKS; w++) {
    const next = computeNextWeekDates(weeks);
    assert.equal(next.weekNumber, w);
    const entry: PortalWeekRecord = {
      id: `wk-${w}`,
      weekNumber: next.weekNumber,
      ...next.range,
      weightKg: Number((90 - w * 0.4).toFixed(1)),
      adherencePct: 95,
      workoutCompletionPct: 90,
      completedExercisesCount: 14,
      goalsSummary: `أهداف الأسبوع ${w}`,
      coachNotes: '',
      athleteNotes: '',
      recordedAt: new Date().toISOString(),
    };
    const res = appendWeekToRollingWindow(weeks, entry);
    weeks = res.weeks;
    assert.equal(res.evictedWeeks.length, 0);
  }

  assert.equal(weeks.length, 16);
  assert.equal(weeks[0].weekNumber, 1);
  assert.equal(weeks[15].weekNumber, 16);

  // Now add Week 17 -> Week 1 must be evicted and Weeks 2..17 remain!
  const next17 = computeNextWeekDates(weeks);
  assert.equal(next17.weekNumber, 17);
  const week17: PortalWeekRecord = {
    id: 'wk-17',
    weekNumber: 17,
    ...next17.range,
    weightKg: 82.9,
    adherencePct: 98,
    workoutCompletionPct: 100,
    completedExercisesCount: 16,
    goalsSummary: 'أهداف الأسبوع 17',
    coachNotes: 'ممتاز',
    athleteNotes: 'تطور مستمر',
    recordedAt: new Date().toISOString(),
  };

  const after17 = appendWeekToRollingWindow(weeks, week17);
  assert.equal(after17.weeks.length, 16);
  assert.equal(after17.evictedWeeks.length, 1);
  assert.equal(after17.evictedWeeks[0].weekNumber, 1);
  assert.equal(after17.weeks[0].weekNumber, 2);
  assert.equal(after17.weeks[15].weekNumber, 17);
});

test('sanitized exports strip salt and passwordHash and produce UTF-8 BOM CSV & readable TXT', () => {
  const workoutDays = createDefaultWorkoutDaysFromCoaching('ar');
  const nutritionPlan = createDefaultNutritionPlan(2300, 195, 240, 62, 'ar');
  const supplements = createDefaultSupplements('ar');
  const weeklyGoals = createDefaultWeeklyGoals('ar');
  const week1 = createInitialWeekRecord(85, 'ar', '2026-11-24');

  const dirtyAccount = {
    id: 'portal_1',
    username: 'athlete_1',
    displayName: 'أحمد العلي',
    tierCode: 'PRO' as const,
    targetCalories: 2300,
    proteinGrams: 195,
    carbsGrams: 240,
    fatsGrams: 62,
    splitTitle: 'علوي / سفلي',
    active: true,
    coachNotes: 'استمر بنفس الرتم',
    completedExerciseIds: ['ex-d1-1'],
    weightCheckIns: [{ week: 'الأسبوع 1', weightKg: 85, note: 'بداية' }],
    weeklyGoals,
    workoutDays,
    nutritionPlan,
    supplements,
    weeklyRecords: [week1],
    salt: 'secret-salt-value',
    passwordHash: 'secret-hash-value',
    createdAt: '2026-11-24T00:00:00Z',
    updatedAt: '2026-11-24T00:00:00Z',
  };

  const portalExport = buildSanitizedPortalExport(dirtyAccount, [
    {
      id: 'msg-1',
      accountId: 'portal_1',
      senderRole: 'admin',
      senderName: 'Coach',
      body: 'أهلاً بك في البوابة',
      createdAt: '2026-11-24T01:00:00Z',
    },
  ]);

  const jsonPortal = JSON.stringify(portalExport);
  assert.equal(jsonPortal.includes('secret-salt-value'), false);
  assert.equal(jsonPortal.includes('secret-hash-value'), false);
  assert.equal(portalExport.chatMessages.length, 1);

  const adminExport = buildSanitizedAdminFullExport(
    getDefaultSiteContentBundle(),
    [dirtyAccount],
    { portal_1: portalExport.chatMessages }
  );
  const jsonAdmin = JSON.stringify(adminExport);
  assert.equal(jsonAdmin.includes('secret-salt-value'), false);
  assert.equal(jsonAdmin.includes('secret-hash-value'), false);
  assert.equal(adminExport.portalAccounts.length, 1);

  const csv = formatPortalWeeksCsv(dirtyAccount, 'ar');
  assert.equal(csv.startsWith('\uFEFF'), true);
  assert.match(csv, /2026-11-24/);

  const txt = formatCoachingReportTxt(dirtyAccount, portalExport.chatMessages, 'ar');
  assert.match(txt, /أحمد العلي/);
  assert.match(txt, /كرياتين/);
  assert.match(txt, /أهلاً بك في البوابة/);
});

test('CSV export neutralizes spreadsheet formula injection characters (=, +, -, @, tab)', () => {
  const dirtyWeek = {
    ...createInitialWeekRecord(82, 'en', '2026-11-24'),
    goalsSummary: "=cmd|'/C calc'!A0",
    coachNotes: '+SUM(A1:A2)',
    athleteNotes: '@HYPERLINK("http://evil.example","click")',
  };
  const csv = formatPortalWeeksCsv(
    {
      id: 'p1',
      username: 'u1',
      displayName: 'Test',
      tierCode: 'CORE',
      targetCalories: 2000,
      proteinGrams: 160,
      carbsGrams: 200,
      fatsGrams: 60,
      splitTitle: 'Split',
      active: true,
      coachNotes: '',
      completedExerciseIds: [],
      weightCheckIns: [],
      weeklyGoals: [],
      workoutDays: [],
      nutritionPlan: createDefaultNutritionPlan(2000, 160, 200, 60, 'en'),
      supplements: [],
      weeklyRecords: [dirtyWeek],
      createdAt: '2026-11-24T00:00:00Z',
      updatedAt: '2026-11-24T00:00:00Z',
    },
    'en'
  );

  assert.equal(csv.includes("'=cmd|'/C calc'!A0"), true);
  assert.equal(csv.includes("'+SUM(A1:A2)"), true);
  assert.equal(csv.includes("'@HYPERLINK"), true);
});
