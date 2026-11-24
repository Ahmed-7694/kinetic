import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultSiteContentBundle,
  mergeSiteContentBundle,
  sanitizeWhatsAppNumber,
  validateAdminCredentialsInput,
  validatePortalAccountFormInput,
  validatePortalLoginInput,
} from './cmsSchema';

test('mergeSiteContentBundle preserves defaults while applying partial bilingual overrides', () => {
  const merged = mergeSiteContentBundle({
    whatsappNumber: '+20 150-895-2844',
    ar: {
      hero: {
        h1: 'عنوان جديد مخصص لإدارة المحتوى',
      },
      tiers: [
        {
          code: 'PRO',
          monthlyPriceSar: 640,
        },
      ],
    },
    en: {
      coach: {
        name: 'Coach Tariq Pro',
      },
    },
  });

  assert.equal(merged.whatsappNumber, '201508952844');
  assert.equal(merged.ar.hero.h1, 'عنوان جديد مخصص لإدارة المحتوى');
  assert.ok(merged.ar.hero.sub.length > 10);
  const proTier = merged.ar.tiers.find((t) => t.code === 'PRO');
  assert.equal(proTier?.monthlyPriceSar, 640);
  assert.equal(merged.en.coach.name, 'Coach Tariq Pro');
  assert.equal(merged.en.programs.length, 3);
});

test('mergeSiteContentBundle handles corrupt or empty payloads safely', () => {
  const defaults = getDefaultSiteContentBundle();
  const merged = mergeSiteContentBundle(null);
  assert.equal(merged.ar.hero.h1, defaults.ar.hero.h1);
  assert.equal(merged.en.hero.h1, defaults.en.hero.h1);
});

test('sanitizeWhatsAppNumber strips punctuation and falls back on invalid lengths', () => {
  assert.equal(sanitizeWhatsAppNumber('+20 (150) 895-2844'), '201508952844');
  assert.equal(sanitizeWhatsAppNumber('123'), '201508952844');
});

test('validateAdminCredentialsInput enforces setup confirmation and login checks in both languages', () => {
  const setupErrorsAr = validateAdminCredentialsInput({
    username: 'ab',
    password: '123',
    confirmPassword: '456',
    isSetup: true,
  });
  assert.ok(setupErrorsAr.username);
  assert.ok(setupErrorsAr.password);
  assert.ok(setupErrorsAr.confirmPassword);

  const validSetup = validateAdminCredentialsInput({
    username: 'admin_user',
    password: 'StrongPassword1',
    confirmPassword: 'StrongPassword1',
    isSetup: true,
  });
  assert.deepEqual(validSetup, {});

  const loginEmptyEn = validateAdminCredentialsInput(
    { username: 'admin_user', password: '', isSetup: false },
    'en'
  );
  assert.equal(loginEmptyEn.password, 'Please enter your password.');
});

test('validatePortalAccountFormInput enforces username/displayName and optional edit password', () => {
  const createErr = validatePortalAccountFormInput(
    { username: 'a b', password: '12', displayName: 'x' },
    false,
    'en'
  );
  assert.ok(createErr.username);
  assert.ok(createErr.password);
  assert.ok(createErr.displayName);

  const validCreate = validatePortalAccountFormInput(
    { username: 'athlete_01', password: 'sDf', displayName: 'Khaled' },
    false,
    'ar'
  );
  assert.deepEqual(validCreate, {});

  const editKeepPassword = validatePortalAccountFormInput(
    { username: 'athlete_01', password: '', displayName: 'خالد المنصور' },
    true,
    'ar'
  );
  assert.deepEqual(editKeepPassword, {});
});

test('validatePortalLoginInput catches empty username or password', () => {
  const errs = validatePortalLoginInput(' ', '', 'ar');
  assert.ok(errs.username);
  assert.ok(errs.password);
  assert.deepEqual(validatePortalLoginInput('athlete_01', 'sDf', 'en'), {});
});
