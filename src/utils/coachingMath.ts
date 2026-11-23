export type Language = 'ar' | 'en';
export type TrainingGoal = 'fat_loss' | 'muscle_gain' | 'athletic_recomp';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'athlete';
export type TrainingLocation = 'gym' | 'home';
export type BillingCycle = 'monthly' | 'quarterly';
export type TierCode = 'CORE' | 'PRO' | 'ELITE';

export interface AthleteAssessmentInput {
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  gender: 'male' | 'female';
  activityLevel: ActivityLevel;
  goal: TrainingGoal;
  trainingDaysPerWeek: number;
  location: TrainingLocation;
}

export interface NutritionPlanResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  fatsGrams: number;
  carbsGrams: number;
  weeklyRateKg: number;
  estimatedWeeks: number;
  recommendedTier: TierCode;
  splitTitle: string;
}

export interface LeadFormInput {
  name: string;
  phone: string;
  email: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  targetRpe: string;
}

export interface WorkoutDay {
  id: string;
  label: string;
  focus: string;
  durationMinutes: number;
  exercises: WorkoutExercise[];
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  moderate: 1.45,
  active: 1.65,
  athlete: 1.8,
};

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function calculateNutritionPlan(
  input: AthleteAssessmentInput,
  lang: Language = 'ar'
): NutritionPlanResult {
  const age = clampNumber(input.age, 16, 75);
  const heightCm = clampNumber(input.heightCm, 130, 225);
  const currentWeightKg = clampNumber(input.currentWeightKg, 40, 220);
  const targetWeightKg = clampNumber(input.targetWeightKg, 40, 220);
  const trainingDays = clampNumber(input.trainingDaysPerWeek, 2, 6);

  // Mifflin-St Jeor equation
  const genderOffset = input.gender === 'male' ? 5 : -161;
  const bmr = Math.round(10 * currentWeightKg + 6.25 * heightCm - 5 * age + genderOffset);
  const multiplier = ACTIVITY_MULTIPLIERS[input.activityLevel] ?? 1.45;
  const tdee = Math.round(bmr * multiplier);

  let calorieDelta = 0;
  let proteinPerKg = 2.0;
  let weeklyRateKg = 0.25;

  if (input.goal === 'fat_loss') {
    calorieDelta = -450;
    proteinPerKg = 2.2;
    weeklyRateKg = 0.5;
  } else if (input.goal === 'muscle_gain') {
    calorieDelta = 300;
    proteinPerKg = 2.0;
    weeklyRateKg = 0.3;
  } else {
    calorieDelta = -150;
    proteinPerKg = 2.1;
    weeklyRateKg = 0.25;
  }

  const minSafeCalories = input.gender === 'male' ? 1500 : 1250;
  const targetCalories = Math.max(minSafeCalories, Math.round(tdee + calorieDelta));

  const proteinGrams = Math.round(currentWeightKg * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  const fatsGrams = Math.round(Math.max(45, (targetCalories * 0.25) / 9));
  const fatCalories = fatsGrams * 9;

  const remainingCalories = Math.max(200, targetCalories - proteinCalories - fatCalories);
  const carbsGrams = Math.round(remainingCalories / 4);

  const weightDiff = Math.abs(currentWeightKg - targetWeightKg);
  const estimatedWeeks = weightDiff < 0.5 ? 8 : Math.max(4, Math.min(36, Math.ceil(weightDiff / weeklyRateKg)));

  let recommendedTier: TierCode = 'PRO';
  if (trainingDays >= 5 || weightDiff >= 12) {
    recommendedTier = 'ELITE';
  } else if (trainingDays <= 3 && input.goal === 'athletic_recomp' && weightDiff < 5) {
    recommendedTier = 'CORE';
  }

  let splitTitle =
    lang === 'en' ? 'Push / Pull / Legs (4 Days)' : 'الدفع / السحب / الأرجل (4 أيام)';
  if (trainingDays <= 3) {
    splitTitle =
      lang === 'en' ? 'Full Body Strength (3 Days)' : 'تدريب الجسم الكامل (3 أيام)';
  } else if (trainingDays === 4) {
    splitTitle =
      lang === 'en' ? 'Balanced Upper / Lower (4 Days)' : 'علوي / سفلي متوازن (4 أيام)';
  } else {
    splitTitle =
      lang === 'en'
        ? 'Push / Pull / Legs + Conditioning (5–6 Days)'
        : 'دفع / سحب / أرجل + تكييف بدني (5–6 أيام)';
  }

  return {
    bmr,
    tdee,
    targetCalories,
    proteinGrams,
    fatsGrams,
    carbsGrams,
    weeklyRateKg,
    estimatedWeeks,
    recommendedTier,
    splitTitle,
  };
}

export function formatTierPricing(
  monthlyPriceSar: number,
  billingCycle: BillingCycle,
  lang: Language = 'ar'
): { activePrice: number; originalPrice: number; savingsPercent: number; periodLabel: string } {
  if (billingCycle === 'quarterly') {
    const discountedMonthly = Math.round(monthlyPriceSar * 0.8);
    return {
      activePrice: discountedMonthly,
      originalPrice: monthlyPriceSar,
      savingsPercent: 20,
      periodLabel:
        lang === 'en' ? 'SAR / mo (billed quarterly)' : 'ر.س / شهرياً (دفع ربع سنوي)',
    };
  }
  return {
    activePrice: monthlyPriceSar,
    originalPrice: monthlyPriceSar,
    savingsPercent: 0,
    periodLabel: lang === 'en' ? 'SAR / month' : 'ر.س / شهرياً',
  };
}

export function validateLeadForm(
  form: LeadFormInput,
  lang: Language = 'ar'
): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedName = form.name.trim();
  const trimmedPhone = form.phone.trim();
  const trimmedEmail = form.email.trim();

  if (trimmedName.length < 2) {
    errors.name =
      lang === 'en'
        ? 'Please enter your full name (at least 2 characters).'
        : 'يرجى إدخال الاسم الكامل (حرفين على الأقل).';
  }

  const digitsOnly = trimmedPhone.replace(/[\s\-()+]/g, '');
  if (!/^\d{8,15}$/.test(digitsOnly)) {
    errors.phone =
      lang === 'en'
        ? 'Please enter a valid WhatsApp or phone number (8 to 15 digits).'
        : 'يرجى إدخال رقم جوال أو واتساب صحيح (8 إلى 15 رقماً).';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email =
      lang === 'en'
        ? 'Please enter a valid email address.'
        : 'يرجى إدخال بريد إلكتروني صحيح.';
  }

  return errors;
}

export function validateAssessmentBiometrics(
  input: AthleteAssessmentInput,
  lang: Language = 'ar'
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.age) || input.age < 16 || input.age > 75) {
    errors.age =
      lang === 'en'
        ? 'Age must be between 16 and 75 years.'
        : 'العمر يجب أن يكون بين 16 و 75 عاماً.';
  }
  if (!Number.isFinite(input.heightCm) || input.heightCm < 130 || input.heightCm > 225) {
    errors.heightCm =
      lang === 'en'
        ? 'Height must be between 130 and 225 cm.'
        : 'الطول يجب أن يكون بين 130 و 225 سم.';
  }
  if (!Number.isFinite(input.currentWeightKg) || input.currentWeightKg < 40 || input.currentWeightKg > 220) {
    errors.currentWeightKg =
      lang === 'en'
        ? 'Current weight must be between 40 and 220 kg.'
        : 'الوزن الحالي يجب أن يكون بين 40 و 220 كجم.';
  }
  if (!Number.isFinite(input.targetWeightKg) || input.targetWeightKg < 40 || input.targetWeightKg > 220) {
    errors.targetWeightKg =
      lang === 'en'
        ? 'Target weight must be between 40 and 220 kg.'
        : 'الوزن المستهدف يجب أن يكون بين 40 و 220 كجم.';
  }
  return errors;
}

export function calculateWorkoutCompletion(
  days: WorkoutDay[],
  completedExerciseIds: string[]
): { completed: number; total: number; percentage: number } {
  const completedSet = new Set(completedExerciseIds);
  let total = 0;
  let completed = 0;

  for (const day of days) {
    for (const ex of day.exercises) {
      total += 1;
      if (completedSet.has(ex.id)) {
        completed += 1;
      }
    }
  }

  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

export const PERSONAL_WHATSAPP_NUMBER = '201508952844';

export function buildWhatsAppUrl(
  message: string,
  phone: string = PERSONAL_WHATSAPP_NUMBER
): string {
  const digits = phone.replace(/\D/g, '') || PERSONAL_WHATSAPP_NUMBER;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatConsultationWhatsAppMessage(
  payload: {
    name: string;
    phone: string;
    email: string;
    goal: string;
  },
  lang: Language = 'ar'
): string {
  if (lang === 'en') {
    return [
      'Hello, I would like a training consultation via Kinetic Peak:',
      `Name: ${payload.name.trim()}`,
      `Phone: ${payload.phone.trim()}`,
      `Email: ${payload.email.trim()}`,
      `Primary Goal: ${payload.goal}`,
    ].join('\n');
  }
  return [
    'مرحباً، أرغب في استشارة تدريبية عبر منصة ذروة كينتك:',
    `الاسم: ${payload.name.trim()}`,
    `رقم التواصل: ${payload.phone.trim()}`,
    `البريد الإلكتروني: ${payload.email.trim()}`,
    `الهدف الأساسي: ${payload.goal}`,
  ].join('\n');
}

export function formatPlanWhatsAppMessage(
  payload: {
    athleteName: string;
    phone: string;
    email: string;
    selectedTier: TierCode;
    targetCalories: number;
    proteinGrams: number;
    splitTitle: string;
  },
  lang: Language = 'ar'
): string {
  if (lang === 'en') {
    return [
      'Hello, I built my custom training plan on Kinetic Peak:',
      `Name: ${payload.athleteName.trim()}`,
      `Phone: ${payload.phone.trim()}`,
      `Email: ${payload.email.trim()}`,
      `Selected Tier: ${payload.selectedTier}`,
      `Daily Calories: ${payload.targetCalories} kcal/day`,
      `Protein: ${payload.proteinGrams} g/day`,
      `Split: ${payload.splitTitle}`,
    ].join('\n');
  }
  return [
    'مرحباً، قمت بتصميم خطتي التدريبية عبر منصة ذروة كينتك:',
    `الاسم: ${payload.athleteName.trim()}`,
    `رقم التواصل: ${payload.phone.trim()}`,
    `البريد الإلكتروني: ${payload.email.trim()}`,
    `الباقة المختارة: ${payload.selectedTier}`,
    `السعرات المستهدفة: ${payload.targetCalories} سعرة/يوم`,
    `البروتين: ${payload.proteinGrams} جم/يوم`,
    `الجدول: ${payload.splitTitle}`,
  ].join('\n');
}

