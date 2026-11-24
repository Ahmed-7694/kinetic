import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  claimAdminCredentials,
  createPortalAccount,
  createSessionToken,
  deletePortalAccount,
  getAuthStatus,
  getPortalAccountById,
  listPortalAccounts,
  readCmsOverrides,
  resetCmsOverrides,
  resolveConfinedPath,
  updatePortalAccount,
  updatePortalAccountProgress,
  verifyAdminCredentials,
  verifyPortalCredentials,
  verifySessionToken,
  writeCmsOverrides,
} from './authAndStore';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kinetic-auth-test-'));
}

test('resolveConfinedPath rejects path traversal outside baseDir', () => {
  const base = '/tmp/safe-dir';
  assert.equal(resolveConfinedPath(base, 'cms.json'), path.resolve(base, 'cms.json'));
  assert.throws(() => resolveConfinedPath(base, '../escape.json'));
});

test('first-run claim registers hashed credentials, locks bootstrap, and verifies login', () => {
  const dir = makeTempDir();
  const authPath = resolveConfinedPath(dir, 'admin-auth.json');

  assert.equal(getAuthStatus(authPath).mode, 'setup');

  const claimRes = claimAdminCredentials(authPath, 'coach_tariq', 'StrongPass#2026');
  assert.equal(claimRes.ok, true);
  assert.equal(getAuthStatus(authPath).mode, 'claimed');

  // Bootstrap locks once claimed
  const secondClaim = claimAdminCredentials(authPath, 'attacker', 'AnotherPass#2026');
  assert.equal(secondClaim.ok, false);
  if (!secondClaim.ok) {
    assert.equal(secondClaim.code, 'ALREADY_CONFIGURED');
  }

  // Raw file does not store plaintext password
  const raw = fs.readFileSync(authPath, 'utf8');
  assert.equal(raw.includes('StrongPass#2026'), false);

  // Verify valid & invalid logins
  const okLogin = verifyAdminCredentials(authPath, 'COACH_TARIQ', 'StrongPass#2026');
  assert.equal(okLogin.ok, true);

  const badPass = verifyAdminCredentials(authPath, 'coach_tariq', 'WrongPass');
  assert.equal(badPass.ok, false);

  const badUser = verifyAdminCredentials(authPath, 'unknown_user', 'StrongPass#2026');
  assert.equal(badUser.ok, false);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('configured env passcode overrides claimed fallback hash', () => {
  const dir = makeTempDir();
  const authPath = resolveConfinedPath(dir, 'admin-auth.json');

  claimAdminCredentials(authPath, 'local_admin', 'LocalSecret123');
  assert.equal(getAuthStatus(authPath, 'env_admin', 'EnvSecret#999').mode, 'env');

  // Claimed credentials are ignored when env passcode is configured
  const oldLogin = verifyAdminCredentials(
    authPath,
    'local_admin',
    'LocalSecret123',
    'env_admin',
    'EnvSecret#999'
  );
  assert.equal(oldLogin.ok, false);

  const envLogin = verifyAdminCredentials(
    authPath,
    'env_admin',
    'EnvSecret#999',
    'env_admin',
    'EnvSecret#999'
  );
  assert.equal(envLogin.ok, true);

  const shortEnvLogin = verifyAdminCredentials(
    authPath,
    'env_admin',
    'abc',
    'env_admin',
    'abc'
  );
  assert.equal(shortEnvLogin.ok, true);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('HMAC bearer session token verifies valid payload and rejects tampered or expired tokens', () => {
  const secret = crypto.randomBytes(32);
  const token = createSessionToken('coach_tariq', secret, 60_000);
  const decoded = verifySessionToken(token, secret);
  assert.ok(decoded);
  assert.equal(decoded.sub, 'coach_tariq');

  const tampered = `${token.slice(0, -3)}xxx`;
  assert.equal(verifySessionToken(tampered, secret), null);

  const expired = createSessionToken('coach_tariq', secret, -100);
  assert.equal(verifySessionToken(expired, secret), null);
});

test('CMS content persistence write, read, and reset operate cleanly', () => {
  const dir = makeTempDir();
  const cmsPath = resolveConfinedPath(dir, 'cms-content.json');

  assert.equal(readCmsOverrides(cmsPath), null);
  writeCmsOverrides(cmsPath, { whatsappNumber: '201508952844', ar: { hero: { h1: 'عنوان محدث' } } });
  const loaded = readCmsOverrides(cmsPath);
  assert.ok(loaded);
  assert.equal(loaded.whatsappNumber, '201508952844');

  resetCmsOverrides(cmsPath);
  assert.equal(readCmsOverrides(cmsPath), null);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('portal session tokens carry role=portal and cannot impersonate admin role', () => {
  const secret = crypto.randomBytes(32);
  const portalToken = createSessionToken('khalid_fit', secret, {
    role: 'portal',
    accountId: 'portal_123',
    ttlMs: 60_000,
  });
  const decoded = verifySessionToken(portalToken, secret);
  assert.ok(decoded);
  assert.equal(decoded.role, 'portal');
  assert.equal(decoded.accountId, 'portal_123');

  const adminToken = createSessionToken('coach_tariq', secret, 60_000);
  const decodedAdmin = verifySessionToken(adminToken, secret);
  assert.ok(decodedAdmin);
  assert.equal(decodedAdmin.role, 'admin');
});

test('admin portal accounts lifecycle: create, hash, verify, update credentials, progress sync, disable, and delete', () => {
  const dir = makeTempDir();
  const portalPath = resolveConfinedPath(dir, 'portal-accounts.json');

  assert.deepEqual(listPortalAccounts(portalPath), []);

  const created = createPortalAccount(portalPath, {
    username: 'khalid_fit',
    password: 'sDf',
    displayName: 'خالد المنصور',
    tierCode: 'ELITE',
    targetCalories: 2450,
    proteinGrams: 205,
    carbsGrams: 255,
    fatsGrams: 68,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.equal(created.account.username, 'khalid_fit');
  assert.equal(created.account.tierCode, 'ELITE');

  // Raw file must never store plaintext password
  const rawJson = fs.readFileSync(portalPath, 'utf8');
  assert.equal(rawJson.includes('"sDf"'), false);

  // Duplicate username rejected (case-insensitive)
  const dup = createPortalAccount(portalPath, {
    username: 'KHALID_FIT',
    password: 'AnotherPassword',
    displayName: 'Duplicate',
  });
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.equal(dup.code, 'DUPLICATE_USERNAME');

  // Verify valid and invalid logins
  const loginOk = verifyPortalCredentials(portalPath, 'KHALID_FIT', 'sDf');
  assert.equal(loginOk.ok, true);

  const loginBad = verifyPortalCredentials(portalPath, 'khalid_fit', 'wrong');
  assert.equal(loginBad.ok, false);

  // Update credentials (username + password) and verify old password fails, new works
  const updated = updatePortalAccount(portalPath, created.account.id, {
    username: 'khalid_pro',
    password: 'NewPass#99',
    targetCalories: 2600,
  });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.account.username, 'khalid_pro');
    assert.equal(updated.account.targetCalories, 2600);
  }

  assert.equal(verifyPortalCredentials(portalPath, 'khalid_pro', 'sDf').ok, false);
  assert.equal(verifyPortalCredentials(portalPath, 'khalid_pro', 'NewPass#99').ok, true);

  // Progress persistence
  const withProgress = updatePortalAccountProgress(
    portalPath,
    created.account.id,
    ['ex-d1-1', 'ex-d1-3'],
    [{ week: 'الأسبوع 1', weightKg: 85.4, note: 'بداية موفقة' }]
  );
  assert.ok(withProgress);
  assert.deepEqual(withProgress.completedExerciseIds, ['ex-d1-1', 'ex-d1-3']);
  assert.equal(withProgress.weightCheckIns[0]?.weightKg, 85.4);

  // Disabling account blocks sign-in
  updatePortalAccount(portalPath, created.account.id, { active: false });
  const disabledLogin = verifyPortalCredentials(portalPath, 'khalid_pro', 'NewPass#99');
  assert.equal(disabledLogin.ok, false);
  if (!disabledLogin.ok) assert.equal(disabledLogin.code, 'ACCOUNT_DISABLED');

  // Deleting account removes it permanently
  assert.equal(deletePortalAccount(portalPath, created.account.id), true);
  assert.equal(deletePortalAccount(portalPath, created.account.id), false);
  assert.equal(getPortalAccountById(portalPath, created.account.id), null);
  assert.deepEqual(listPortalAccounts(portalPath), []);

  fs.rmSync(dir, { recursive: true, force: true });
});
