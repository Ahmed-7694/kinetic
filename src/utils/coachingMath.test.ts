import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNutritionPlan,
  formatTierPricing,
  validateLeadForm,
  validateAssessmentBiometrics,
  calculateWorkoutCompletion,
  buildWhatsAppUrl,
  formatConsultationWhatsAppMessage,
  formatPlanWhatsAppMessage,
  PERSONAL_WHATSAPP_NUMBER,
  type WorkoutDay,
} from './coachingMath';

test('calculateNutritionPlan computes fat loss deficit and high protein targets accurately', () => {
  const result = calculateNutritionPlan({
    age: 29,
    heightCm: 178,
    currentWeightKg: 88,
    targetWeightKg: 78,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'fat_loss',
    trainingDaysPerWeek: 4,
    location: 'gym',
  });

  // BMR = 880 + 1112.5 - 145 + 5 = 1852.5 -> 1853
  assert.equal(result.bmr, 1853);
  // TDEE = 1853 * 1.45 = 2686.85 -> 2687
  assert.equal(result.tdee, 2687);
  // Target = 2687 - 450 = 2237
  assert.equal(result.targetCalories, 2237);
  // Protein = 88 * 2.2 = 193.6 -> 194
  assert.equal(result.proteinGrams, 194);
  assert.equal(result.estimatedWeeks, 20);
  assert.equal(result.recommendedTier, 'PRO');
});

test('calculateNutritionPlan recommends ELITE tier for 5+ days or large weight delta', () => {
  const result = calculateNutritionPlan({
    age: 34,
    heightCm: 175,
    currentWeightKg: 102,
    targetWeightKg: 84,
    gender: 'male',
    activityLevel: 'active',
    goal: 'fat_loss',
    trainingDaysPerWeek: 5,
    location: 'gym',
  });

  assert.equal(result.recommendedTier, 'ELITE');
  assert.ok(result.targetCalories >= 1500);
});

test('formatTierPricing applies 20% discount for quarterly billing', () => {
  const monthly = formatTierPricing(550, 'monthly');
  assert.equal(monthly.activePrice, 550);
  assert.equal(monthly.savingsPercent, 0);

  const quarterly = formatTierPricing(550, 'quarterly');
  assert.equal(quarterly.activePrice, 440);
  assert.equal(quarterly.originalPrice, 550);
  assert.equal(quarterly.savingsPercent, 20);
});

test('validateLeadForm rejects invalid inputs and accepts valid Arabic contact details', () => {
  const invalidErrors = validateLeadForm({
    name: 'أ',
    phone: '123',
    email: 'not-an-email',
  });
  assert.ok(invalidErrors.name);
  assert.ok(invalidErrors.phone);
  assert.ok(invalidErrors.email);

  const validErrors = validateLeadForm({
    name: 'خالد المنصور',
    phone: '+966501234567',
    email: 'khaled@example.com',
  });
  assert.deepEqual(validErrors, {});
});

test('validateAssessmentBiometrics catches out-of-range measurements', () => {
  const errors = validateAssessmentBiometrics({
    age: 12,
    heightCm: 90,
    currentWeightKg: 25,
    targetWeightKg: 250,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'fat_loss',
    trainingDaysPerWeek: 4,
    location: 'gym',
  });
  assert.ok(errors.age);
  assert.ok(errors.heightCm);
  assert.ok(errors.currentWeightKg);
  assert.ok(errors.targetWeightKg);
});

test('calculateWorkoutCompletion tracks percentage across workout days', () => {
  const days: WorkoutDay[] = [
    {
      id: 'd1',
      label: 'اليوم 1',
      focus: 'صدر وكتف',
      durationMinutes: 55,
      exercises: [
        { id: 'ex-1', name: 'ضغط صدر', sets: 4, reps: '8-10', restSeconds: 90, targetRpe: '8' },
        { id: 'ex-2', name: 'ضغط كتف', sets: 3, reps: '10-12', restSeconds: 75, targetRpe: '8' },
      ],
    },
    {
      id: 'd2',
      label: 'اليوم 2',
      focus: 'ظهر',
      durationMinutes: 50,
      exercises: [
        { id: 'ex-3', name: 'سحب علوي', sets: 4, reps: '8-10', restSeconds: 90, targetRpe: '8.5' },
        { id: 'ex-4', name: 'تجديف', sets: 3, reps: '10-12', restSeconds: 75, targetRpe: '8' },
      ],
    },
  ];

  const stats = calculateWorkoutCompletion(days, ['ex-1', 'ex-3', 'ex-4']);
  assert.equal(stats.completed, 3);
  assert.equal(stats.total, 4);
  assert.equal(stats.percentage, 75);
});

test('buildWhatsAppUrl encodes Arabic message targeting 201508952844', () => {
  assert.equal(PERSONAL_WHATSAPP_NUMBER, '201508952844');
  const message = formatConsultationWhatsAppMessage({
    name: 'أحمد علي',
    phone: '01012345678',
    email: 'ahmed@example.com',
    goal: 'حرق الدهون وشد الجسم',
  });
  const url = buildWhatsAppUrl(message);
  assert.ok(url.startsWith('https://wa.me/201508952844?text='));
  assert.ok(decodeURIComponent(url).includes('أحمد علي'));
  assert.ok(decodeURIComponent(url).includes('حرق الدهون وشد الجسم'));
});

test('formatPlanWhatsAppMessage includes tier, calories, and protein details', () => {
  const planMessage = formatPlanWhatsAppMessage({
    athleteName: 'كريم محمد',
    phone: '+201001234567',
    email: 'kareem@example.com',
    selectedTier: 'PRO',
    targetCalories: 2237,
    proteinGrams: 194,
    splitTitle: 'علوي / سفلي متوازن (4 أيام)',
  });
  const url = buildWhatsAppUrl(planMessage);
  assert.ok(url.startsWith('https://wa.me/201508952844?text='));
  assert.ok(decodeURIComponent(url).includes('PRO'));
  assert.ok(decodeURIComponent(url).includes('2237'));
});

test('English localization returns English validation, pricing, and split labels', () => {
  const plan = calculateNutritionPlan(
    {
      age: 30,
      heightCm: 180,
      currentWeightKg: 85,
      targetWeightKg: 78,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'fat_loss',
      trainingDaysPerWeek: 4,
      location: 'gym',
    },
    'en'
  );
  assert.equal(plan.splitTitle, 'Balanced Upper / Lower (4 Days)');

  const pricing = formatTierPricing(590, 'quarterly', 'en');
  assert.equal(pricing.periodLabel, 'SAR / mo (billed quarterly)');

  const errors = validateLeadForm({ name: 'A', phone: '12', email: 'bad' }, 'en');
  assert.ok(errors.name.includes('full name'));
  assert.ok(errors.phone.includes('8 to 15 digits'));
  assert.ok(errors.email.includes('valid email'));

  const enWa = formatConsultationWhatsAppMessage(
    { name: 'Youssef', phone: '01012345678', email: 'y@example.com', goal: 'Fat Loss' },
    'en'
  );
  assert.ok(enWa.includes('Primary Goal: Fat Loss'));
});


