import { getDefaultWorkoutDays, type WeightCheckIn } from '../data/coachingData';
import type { Language, TierCode, WorkoutDay } from './coachingMath';
import type { SiteContentBundle } from './cmsSchema';

export interface PortalExerciseDetail {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  weightKg: string;
  targetRpe: string;
  tempo: string;
  notes: string;
  videoCue: string;
}

export interface PortalWorkoutDay {
  id: string;
  label: string;
  focus: string;
  durationMinutes: number;
  warmupNote: string;
  exercises: PortalExerciseDetail[];
}

export type WeeklyGoalCategory = 'training' | 'nutrition' | 'recovery' | 'habit';

export interface PortalWeeklyGoal {
  id: string;
  title: string;
  targetMetric: string;
  currentProgress: string;
  category: WeeklyGoalCategory;
  completed: boolean;
}

export interface PortalMealItem {
  id: string;
  timeLabel: string;
  title: string;
  ingredients: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  notes: string;
}

export interface PortalNutritionPlan {
  dailyWaterLiters: number;
  sleepHoursTarget: number;
  stepsTarget: number;
  mealTimingNote: string;
  coachNutritionNotes: string;
  meals: PortalMealItem[];
}

export interface PortalSupplementItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  purpose: string;
  notes: string;
}

export interface PortalWeekRecord {
  id: string;
  weekNumber: number;
  startDateIso: string;
  endDateIso: string;
  gregorianRangeAr: string;
  gregorianRangeEn: string;
  hijriRangeAr: string;
  hijriRangeEn: string;
  weightKg: number;
  adherencePct: number;
  workoutCompletionPct: number;
  completedExercisesCount: number;
  goalsSummary: string;
  coachNotes: string;
  athleteNotes: string;
  recordedAt: string;
}

export interface PortalChatMessage {
  id: string;
  accountId: string;
  senderRole: 'admin' | 'portal';
  senderName: string;
  body: string;
  createdAt: string;
}

export const MAX_PORTAL_WEEKS = 16;

export interface DualDateRangeResult {
  startDateIso: string;
  endDateIso: string;
  gregorianRangeAr: string;
  gregorianRangeEn: string;
  hijriRangeAr: string;
  hijriRangeEn: string;
}

function parseIsoDateUtcNoon(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!match) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

export function toIsoDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addUtcDays(isoDate: string, days: number): string {
  const base = parseIsoDateUtcNoon(isoDate);
  base.setUTCDate(base.getUTCDate() + days);
  return toIsoDateString(base);
}

function safeFormatDate(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
  } catch {
    return toIsoDateString(date);
  }
}

export function formatDualDateRange(
  startDateIsoInput: string,
  endDateIsoInput?: string
): DualDateRangeResult {
  const startDt = parseIsoDateUtcNoon(startDateIsoInput);
  const startDateIso = toIsoDateString(startDt);
  const endDt = endDateIsoInput
    ? parseIsoDateUtcNoon(endDateIsoInput)
    : parseIsoDateUtcNoon(addUtcDays(startDateIso, 6));
  const endDateIso = toIsoDateString(endDt);

  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  const gStartAr = safeFormatDate(startDt, 'ar-EG-u-nu-latn', opts);
  const gEndAr = safeFormatDate(endDt, 'ar-EG-u-nu-latn', opts);
  const gStartEn = safeFormatDate(startDt, 'en-GB', opts);
  const gEndEn = safeFormatDate(endDt, 'en-GB', opts);

  const hStartAr = safeFormatDate(startDt, 'ar-SA-u-ca-islamic-umalqura-nu-latn', opts);
  const hEndAr = safeFormatDate(endDt, 'ar-SA-u-ca-islamic-umalqura-nu-latn', opts);
  const hStartEn = safeFormatDate(startDt, 'en-US-u-ca-islamic-umalqura', opts);
  const hEndEn = safeFormatDate(endDt, 'en-US-u-ca-islamic-umalqura', opts);

  return {
    startDateIso,
    endDateIso,
    gregorianRangeAr: `من ${gStartAr} إلى ${gEndAr}`,
    gregorianRangeEn: `${gStartEn} – ${gEndEn}`,
    hijriRangeAr: `من ${hStartAr} إلى ${hEndAr}`,
    hijriRangeEn: `${hStartEn} – ${hEndEn}`,
  };
}

export function computeNextWeekDates(
  existingWeeks: Pick<PortalWeekRecord, 'weekNumber' | 'startDateIso' | 'endDateIso'>[],
  customStartDateIso?: string
): { weekNumber: number; range: DualDateRangeResult } {
  const sorted = [...existingWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const last = sorted[sorted.length - 1];
  const nextWeekNumber = last ? last.weekNumber + 1 : 1;

  let startIso: string;
  if (customStartDateIso && /^\d{4}-\d{2}-\d{2}$/.test(customStartDateIso.trim())) {
    startIso = customStartDateIso.trim();
  } else if (last) {
    startIso = addUtcDays(last.endDateIso, 1);
  } else {
    startIso = toIsoDateString(new Date());
  }

  return {
    weekNumber: nextWeekNumber,
    range: formatDualDateRange(startIso),
  };
}

export function appendWeekToRollingWindow(
  existingWeeks: PortalWeekRecord[],
  newWeek: PortalWeekRecord,
  maxWeeks: number = MAX_PORTAL_WEEKS
): { weeks: PortalWeekRecord[]; evictedWeeks: PortalWeekRecord[] } {
  const combined = [...existingWeeks, newWeek].sort((a, b) => a.weekNumber - b.weekNumber);
  if (combined.length <= maxWeeks) {
    return { weeks: combined, evictedWeeks: [] };
  }
  const excess = combined.length - maxWeeks;
  return {
    weeks: combined.slice(excess),
    evictedWeeks: combined.slice(0, excess),
  };
}

export function createDefaultWorkoutDaysFromCoaching(lang: Language = 'ar'): PortalWorkoutDay[] {
  const base: WorkoutDay[] = getDefaultWorkoutDays(lang);
  return base.map((day) => ({
    id: day.id,
    label: day.label,
    focus: day.focus,
    durationMinutes: day.durationMinutes,
    warmupNote:
      lang === 'en'
        ? '8 min dynamic mobility + 2 ramp-up sets on first compound lift'
        : '8 دقائق إحماء ديناميكي وحركة مفاصل + مجموعتا تدرج بأوزان خفيفة لأول تمرين',
    exercises: day.exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds,
      weightKg: lang === 'en' ? 'Progressive' : 'تصاعدي حسب RPE',
      targetRpe: ex.targetRpe,
      tempo: '3-1-1-0',
      notes:
        lang === 'en'
          ? 'Control the eccentric phase and maintain full range of motion.'
          : 'تحكم بالنزول البطيء مع ثبات الجذع ومدى حركي كامل.',
      videoCue:
        lang === 'en'
          ? 'Keep ribs stacked over pelvis and drive smoothly through mid-foot.'
          : 'حافظ على استقامة الظهر وثبات الأكتاف دون اندفاع مفاجئ.',
    })),
  }));
}

export function createDefaultWeeklyGoals(lang: Language = 'ar'): PortalWeeklyGoal[] {
  if (lang === 'en') {
    return [
      {
        id: 'goal-1',
        title: 'Complete all 4 scheduled strength sessions',
        targetMetric: '4 / 4 Sessions',
        currentProgress: '2 / 4 Completed',
        category: 'training',
        completed: false,
      },
      {
        id: 'goal-2',
        title: 'Hit daily protein & calorie window within ±5%',
        targetMetric: '7 / 7 Days',
        currentProgress: 'On track',
        category: 'nutrition',
        completed: false,
      },
      {
        id: 'goal-3',
        title: 'Average 8,500+ daily steps & 3L water intake',
        targetMetric: '8,500 steps · 3L',
        currentProgress: '8,200 avg',
        category: 'habit',
        completed: false,
      },
      {
        id: 'goal-4',
        title: 'Sleep 7.5+ hours per night for recovery',
        targetMetric: '7.5 hrs / night',
        currentProgress: '7.4 hrs avg',
        category: 'recovery',
        completed: true,
      },
    ];
  }
  return [
    {
      id: 'goal-1',
      title: 'إتمام جميع حصص المقاومة المجدولة للأسبوع',
      targetMetric: '4 من 4 حصص',
      currentProgress: 'أُنجز 2 من 4',
      category: 'training',
      completed: false,
    },
    {
      id: 'goal-2',
      title: 'الالتزام بهدف البروتين والسعرات بهامش ±5%',
      targetMetric: '7 / 7 أيام',
      currentProgress: 'التزام ممتاز',
      category: 'nutrition',
      completed: false,
    },
    {
      id: 'goal-3',
      title: 'تحقيق 8,500 خطوة يومياً وشرب 3.5 لتر ماء',
      targetMetric: '8,500 خطوة · 3.5 لتر',
      currentProgress: '8,200 متوسط',
      category: 'habit',
      completed: false,
    },
    {
      id: 'goal-4',
      title: 'جودة نوم 7.5 ساعات ليلاً لتعزيز الاستشفاء',
      targetMetric: '7.5 ساعات / ليلة',
      currentProgress: '7.4 ساعات',
      category: 'recovery',
      completed: true,
    },
  ];
}

export function createDefaultNutritionPlan(
  targetCalories = 2240,
  proteinGrams = 190,
  carbsGrams = 230,
  fatsGrams = 62,
  lang: Language = 'ar'
): PortalNutritionPlan {
  const m1Cal = Math.round(targetCalories * 0.25);
  const m2Cal = Math.round(targetCalories * 0.35);
  const m3Cal = Math.round(targetCalories * 0.2);
  const m4Cal = Math.max(250, targetCalories - m1Cal - m2Cal - m3Cal);

  if (lang === 'en') {
    return {
      dailyWaterLiters: 3.5,
      sleepHoursTarget: 7.5,
      stepsTarget: 8500,
      mealTimingNote:
        'Anchor your largest carb portion 90 minutes pre-workout and within 2 hours post-workout.',
      coachNutritionNotes:
        'Use lean protein swaps (chicken breast, lean beef, egg whites, Greek yogurt) while hitting your daily protein target first.',
      meals: [
        {
          id: 'meal-1',
          timeLabel: '08:00 AM',
          title: 'Meal 1 · High-Protein Breakfast',
          ingredients: '3 whole eggs + 150g egg whites + 60g oats + berries + 10g almonds',
          calories: m1Cal,
          proteinGrams: Math.round(proteinGrams * 0.25),
          carbsGrams: Math.round(carbsGrams * 0.25),
          fatsGrams: Math.round(fatsGrams * 0.3),
          notes: 'Take Omega-3 & Vitamin D3 with breakfast.',
        },
        {
          id: 'meal-2',
          timeLabel: '01:30 PM',
          title: 'Meal 2 · Pre-Training Performance Lunch',
          ingredients: '200g grilled chicken breast + 200g cooked basmati rice + mixed greens + 1 tsp olive oil',
          calories: m2Cal,
          proteinGrams: Math.round(proteinGrams * 0.32),
          carbsGrams: Math.round(carbsGrams * 0.4),
          fatsGrams: Math.round(fatsGrams * 0.25),
          notes: 'Consume 90–120 min prior to training.',
        },
        {
          id: 'meal-3',
          timeLabel: '05:30 PM',
          title: 'Meal 3 · Post-Workout Recovery',
          ingredients: '1 scoop Whey Isolate (30g protein) + 1 large banana + 40g rice cakes',
          calories: m3Cal,
          proteinGrams: Math.round(proteinGrams * 0.2),
          carbsGrams: Math.round(carbsGrams * 0.25),
          fatsGrams: Math.round(fatsGrams * 0.1),
          notes: 'Mix with 5g Creatine Monohydrate.',
        },
        {
          id: 'meal-4',
          timeLabel: '08:30 PM',
          title: 'Meal 4 · Evening Lean Dinner',
          ingredients: '180g salmon or white fish + 220g roasted potato + steamed broccoli & salad',
          calories: m4Cal,
          proteinGrams: Math.max(20, proteinGrams - Math.round(proteinGrams * 0.77)),
          carbsGrams: Math.max(10, carbsGrams - Math.round(carbsGrams * 0.9)),
          fatsGrams: Math.max(8, fatsGrams - Math.round(fatsGrams * 0.65)),
          notes: 'Light hydration; avoid heavy caffeine after 3 PM.',
        },
      ],
    };
  }

  return {
    dailyWaterLiters: 3.5,
    sleepHoursTarget: 7.5,
    stepsTarget: 8500,
    mealTimingNote:
      'ركّز الجزء الأكبر من الكربوهيدرات قبل التمرين بـ 90 دقيقة وبعده مباشرة لدعم الأداء والاستشفاء.',
    coachNutritionNotes:
      'يمكنك التبديل بين مصادر البروتين (صدر دجاج، لحم هبر، سمك، تونة، زبادي يوناني) مع الحفاظ على إجمالي البروتين والسعرات اليومية.',
    meals: [
      {
        id: 'meal-1',
        timeLabel: '08:00 صباحاً',
        title: 'الوجبة الأولى · إفطار عالي البروتين',
        ingredients: '3 بيضات كاملة + 150 جم بياض بيض + 60 جم شوفان + توت + 10 جم لوز',
        calories: m1Cal,
        proteinGrams: Math.round(proteinGrams * 0.25),
        carbsGrams: Math.round(carbsGrams * 0.25),
        fatsGrams: Math.round(fatsGrams * 0.3),
        notes: 'تُؤخذ مع فيتامين D3 وأوميغا 3 لرفع الامتصاص.',
      },
      {
        id: 'meal-2',
        timeLabel: '01:30 ظهراً',
        title: 'الوجبة الثانية · غداء ما قبل التمرين',
        ingredients: '200 جم صدر دجاج مشوي + 200 جم أرز بسمتي مطبوخ + سلطة خضراء + ملعقة زيت زيتون',
        calories: m2Cal,
        proteinGrams: Math.round(proteinGrams * 0.32),
        carbsGrams: Math.round(carbsGrams * 0.4),
        fatsGrams: Math.round(fatsGrams * 0.25),
        notes: 'قبل التمرين بساعة ونصف إلى ساعتين.',
      },
      {
        id: 'meal-3',
        timeLabel: '05:30 مساءً',
        title: 'الوجبة الثالثة · استشفاء ما بعد التمرين',
        ingredients: 'سكوب واي بروتين أيزوليت + موزة كبيرة + 40 جم كعك أرز',
        calories: m3Cal,
        proteinGrams: Math.round(proteinGrams * 0.2),
        carbsGrams: Math.round(carbsGrams * 0.25),
        fatsGrams: Math.round(fatsGrams * 0.1),
        notes: 'يُضاف 5 جم كرياتين مونوهيدرات مع الشيك.',
      },
      {
        id: 'meal-4',
        timeLabel: '08:30 مساءً',
        title: 'الوجبة الرابعة · عشاء متوازن',
        ingredients: '180 جم سلمون أو فيليه سمك مشوي + 220 جم بطاطس مشوية + بروكلي وسلطة',
        calories: m4Cal,
        proteinGrams: Math.max(20, proteinGrams - Math.round(proteinGrams * 0.77)),
        carbsGrams: Math.max(10, carbsGrams - Math.round(carbsGrams * 0.9)),
        fatsGrams: Math.max(8, fatsGrams - Math.round(fatsGrams * 0.65)),
        notes: 'تجنب الكافيين بعد الساعة 3 عصراً لتحسين جودة النوم.',
      },
    ],
  };
}

export function createDefaultSupplements(lang: Language = 'ar'): PortalSupplementItem[] {
  if (lang === 'en') {
    return [
      {
        id: 'sup-1',
        name: 'Creatine Monohydrate (Creapure)',
        dosage: '5g daily',
        timing: 'Post-workout or with any meal',
        purpose: 'Strength output, ATP recovery & intracellular muscle volume',
        notes: 'Maintain 3.5L daily water intake consistently.',
      },
      {
        id: 'sup-2',
        name: 'Whey Protein Isolate',
        dosage: '30g (1 scoop)',
        timing: 'Post-workout / protein convenience',
        purpose: 'Fast amino delivery to hit daily protein targets',
        notes: 'Optional if whole food protein target is already met.',
      },
      {
        id: 'sup-3',
        name: 'Omega-3 Fish Oil + Vitamin D3',
        dosage: '2,000mg EPA/DHA + 2,000 IU',
        timing: 'With Meal 1',
        purpose: 'Joint health, inflammation control & hormonal support',
        notes: 'Always take with a fat-containing meal.',
      },
      {
        id: 'sup-4',
        name: 'Magnesium Glycinate',
        dosage: '350mg',
        timing: '45 min before sleep',
        purpose: 'Deep sleep quality, nervous system recovery & cramp prevention',
        notes: 'Avoid combining immediately with high-calcium dairy.',
      },
    ];
  }

  return [
    {
      id: 'sup-1',
      name: 'كرياتين مونوهيدرات (Creatine Monohydrate)',
      dosage: '5 جم يومياً',
      timing: 'بعد التمرين أو مع أي وجبة',
      purpose: 'زيادة القوة الانفجارية وسرعة الاستشفاء العضلي',
      notes: 'يلزم الاستمرار على شرب 3 إلى 3.5 لتر ماء يومياً.',
    },
    {
      id: 'sup-2',
      name: 'واي بروتين أيزوليت (Whey Isolate)',
      dosage: '30 جم (سكوب واحد)',
      timing: 'بعد التمرين مباشرة أو كوجبة خفيفة',
      purpose: 'تغطية احتياج البروتين اليومي بسرعة وسهولة',
      notes: 'يمكن استبداله بوجبة بروتين صلبة عند الحاجة.',
    },
    {
      id: 'sup-3',
      name: 'أوميغا 3 + فيتامين D3',
      dosage: '2000 ملجم EPA/DHA + 2000 وحدة دولية',
      timing: 'مع الوجبة الأولى',
      purpose: 'دعم صحة المفاصل، تقليل الالتهابات، وتحسين الاستشفاء',
      notes: 'يُؤخذ مع وجبة تحتوي على دهون صحية لضمان الامتصاص.',
    },
    {
      id: 'sup-4',
      name: 'مغنيسيوم جلايسينات (Magnesium Glycinate)',
      dosage: '350 ملجم',
      timing: 'قبل النوم بـ 45 دقيقة',
      purpose: 'تعميق جودة النوم واسترخاء الجهاز العصبي والعضلات',
      notes: 'يُفضّل فصله عن منتجات الألبان بساعة.',
    },
  ];
}

export function createInitialWeekRecord(
  weightKg = 82,
  lang: Language = 'ar',
  startDateIso?: string
): PortalWeekRecord {
  const start = startDateIso ?? toIsoDateString(new Date());
  const range = formatDualDateRange(start);
  return {
    id: `wk-1-${Date.now()}`,
    weekNumber: 1,
    startDateIso: range.startDateIso,
    endDateIso: range.endDateIso,
    gregorianRangeAr: range.gregorianRangeAr,
    gregorianRangeEn: range.gregorianRangeEn,
    hijriRangeAr: range.hijriRangeAr,
    hijriRangeEn: range.hijriRangeEn,
    weightKg: Number(weightKg.toFixed(1)),
    adherencePct: 100,
    workoutCompletionPct: 0,
    completedExercisesCount: 0,
    goalsSummary:
      lang === 'en'
        ? 'Baseline measurements & Phase 1 launch'
        : 'انطلاق المرحلة الأولى وتسجيل الوزن المبدئي',
    coachNotes:
      lang === 'en'
        ? 'Focus on clean technique and daily step consistency during Week 1.'
        : 'التركيز في الأسبوع الأول على ضبط التكنيك والالتزام بالخطوات والماء.',
    athleteNotes: lang === 'en' ? 'Starting baseline' : 'بداية البرنامج التدريبي',
    recordedAt: new Date().toISOString(),
  };
}

export interface PortalExportAccountLike {
  id: string;
  username: string;
  displayName: string;
  tierCode: TierCode;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  splitTitle: string;
  active: boolean;
  coachNotes: string;
  completedExerciseIds: string[];
  weightCheckIns: WeightCheckIn[];
  weeklyGoals: PortalWeeklyGoal[];
  workoutDays: PortalWorkoutDay[];
  nutritionPlan: PortalNutritionPlan;
  supplements: PortalSupplementItem[];
  weeklyRecords: PortalWeekRecord[];
  createdAt: string;
  updatedAt: string;
}

export function stripSensitiveKeys<T extends Record<string, unknown>>(
  record: T
): Omit<T, 'salt' | 'passwordHash'> {
  const copy = { ...record };
  delete (copy as Record<string, unknown>).salt;
  delete (copy as Record<string, unknown>).passwordHash;
  return copy as Omit<T, 'salt' | 'passwordHash'>;
}

export function buildSanitizedPortalExport(
  account: PortalExportAccountLike & Record<string, unknown>,
  chatMessages: PortalChatMessage[]
) {
  return {
    exportType: 'kinetic_peak_athlete_portal_backup',
    exportedAt: new Date().toISOString(),
    account: stripSensitiveKeys(account),
    chatMessages,
  };
}

export function buildSanitizedAdminFullExport(
  cmsBundle: SiteContentBundle,
  accounts: (PortalExportAccountLike & Record<string, unknown>)[],
  chatByAccount: Record<string, PortalChatMessage[]>
) {
  return {
    exportType: 'kinetic_peak_admin_cms_full_backup',
    exportedAt: new Date().toISOString(),
    siteContent: cmsBundle,
    portalAccounts: accounts.map((acc) => ({
      account: stripSensitiveKeys(acc),
      chatMessages: chatByAccount[acc.id] ?? [],
    })),
  };
}

function escapeCsvCell(val: string | number): string {
  const s = String(val ?? '');
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function formatPortalWeeksCsv(
  account: PortalExportAccountLike,
  lang: Language = 'ar'
): string {
  const headers =
    lang === 'en'
      ? [
          'Week #',
          'Start Date (ISO)',
          'End Date (ISO)',
          'Gregorian Range',
          'Hijri Range',
          'Weight (kg)',
          'Adherence (%)',
          'Workout Completion (%)',
          'Completed Exercises',
          'Goals Summary',
          'Coach Notes',
          'Athlete Notes',
        ]
      : [
          'رقم الأسبوع',
          'تاريخ البداية',
          'تاريخ النهاية',
          'التاريخ الميلادي (من - إلى)',
          'التاريخ الهجري (من - إلى)',
          'الوزن (كجم)',
          'الالتزام الغذائي (%)',
          'إنجاز التمارين (%)',
          'التمارين المكتملة',
          'ملخص الأهداف',
          'ملاحظات المدرب',
          'ملاحظات المتدرب',
        ];

  const rows = account.weeklyRecords.map((wk) =>
    [
      wk.weekNumber,
      wk.startDateIso,
      wk.endDateIso,
      lang === 'en' ? wk.gregorianRangeEn : wk.gregorianRangeAr,
      lang === 'en' ? wk.hijriRangeEn : wk.hijriRangeAr,
      wk.weightKg,
      wk.adherencePct,
      wk.workoutCompletionPct,
      wk.completedExercisesCount,
      wk.goalsSummary,
      wk.coachNotes,
      wk.athleteNotes,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  // UTF-8 BOM for clean Excel Arabic rendering
  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')}`;
}

export function formatCoachingReportTxt(
  account: PortalExportAccountLike,
  chatMessages: PortalChatMessage[],
  lang: Language = 'ar'
): string {
  const lines: string[] = [];
  if (lang === 'en') {
    lines.push(`=== KINETIC PEAK ATHLETE REPORT: ${account.displayName} (@${account.username}) ===`);
    lines.push(`Tier: ${account.tierCode} | Split: ${account.splitTitle}`);
    lines.push(
      `Targets: ${account.targetCalories} kcal | Protein ${account.proteinGrams}g | Carbs ${account.carbsGrams}g | Fats ${account.fatsGrams}g`
    );
    lines.push(
      `Habits: Water ${account.nutritionPlan.dailyWaterLiters}L | Sleep ${account.nutritionPlan.sleepHoursTarget}h | Steps ${account.nutritionPlan.stepsTarget}`
    );
    if (account.coachNotes) lines.push(`Coach Notes: ${account.coachNotes}`);
    lines.push('');
    lines.push('--- WEEKLY GOALS ---');
    account.weeklyGoals.forEach((g, idx) => {
      lines.push(
        `${idx + 1}. [${g.completed ? 'DONE' : 'ACTIVE'}] ${g.title} — Target: ${g.targetMetric} | Progress: ${g.currentProgress}`
      );
    });
    lines.push('');
    lines.push('--- WORKOUT PROGRAM ---');
    account.workoutDays.forEach((day) => {
      lines.push(`* ${day.label}: ${day.focus} (${day.durationMinutes} min)`);
      lines.push(`  Warmup: ${day.warmupNote}`);
      day.exercises.forEach((ex, i) => {
        lines.push(
          `  ${i + 1}) ${ex.name} | ${ex.sets}x${ex.reps} | Rest ${ex.restSeconds}s | Load: ${ex.weightKg} | ${ex.targetRpe} | Tempo: ${ex.tempo}`
        );
        if (ex.notes) lines.push(`     Notes: ${ex.notes}`);
      });
    });
    lines.push('');
    lines.push('--- NUTRITION MEAL PLAN ---');
    account.nutritionPlan.meals.forEach((m) => {
      lines.push(
        `* [${m.timeLabel}] ${m.title} (${m.calories} kcal | ${m.proteinGrams}P / ${m.carbsGrams}C / ${m.fatsGrams}F)`
      );
      lines.push(`  Foods: ${m.ingredients}`);
      if (m.notes) lines.push(`  Notes: ${m.notes}`);
    });
    lines.push('');
    lines.push('--- SUPPLEMENTS & ADD-ONS ---');
    account.supplements.forEach((s) => {
      lines.push(`* ${s.name} — ${s.dosage} (${s.timing}) | ${s.purpose}`);
    });
    lines.push('');
    lines.push(`--- 16-WEEK HISTORY (${account.weeklyRecords.length} weeks stored) ---`);
    account.weeklyRecords.forEach((wk) => {
      lines.push(
        `Week ${wk.weekNumber} | Gregorian: ${wk.gregorianRangeEn} | Hijri: ${wk.hijriRangeEn} | Weight: ${wk.weightKg} kg | Adherence: ${wk.adherencePct}%`
      );
      if (wk.coachNotes || wk.athleteNotes) {
        lines.push(`  Coach: ${wk.coachNotes} | Athlete: ${wk.athleteNotes}`);
      }
    });
    if (chatMessages.length > 0) {
      lines.push('');
      lines.push('--- CHAT TRANSCRIPT ---');
      chatMessages.forEach((msg) => {
        lines.push(`[${msg.createdAt}] ${msg.senderName} (${msg.senderRole}): ${msg.body}`);
      });
    }
    return lines.join('\n');
  }

  lines.push(`=== تقرير المتدرب الشامل - ذروة كينتك: ${account.displayName} (@${account.username}) ===`);
  lines.push(`الباقة: ${account.tierCode} | الجدول: ${account.splitTitle}`);
  lines.push(
    `الاحتياج اليومي: ${account.targetCalories} سعرة | بروتين ${account.proteinGrams} جم | كارب ${account.carbsGrams} جم | دهون ${account.fatsGrams} جم`
  );
  lines.push(
    `العادات اليومية: الماء ${account.nutritionPlan.dailyWaterLiters} لتر | النوم ${account.nutritionPlan.sleepHoursTarget} ساعات | الخطوات ${account.nutritionPlan.stepsTarget}`
  );
  if (account.coachNotes) lines.push(`توجيهات المدرب: ${account.coachNotes}`);
  lines.push('');
  lines.push('--- أهداف الأسبوع ---');
  account.weeklyGoals.forEach((g, idx) => {
    lines.push(
      `${idx + 1}. [${g.completed ? 'مكتمل' : 'قيد التنفيذ'}] ${g.title} — الهدف: ${g.targetMetric} | التقدم: ${g.currentProgress}`
    );
  });
  lines.push('');
  lines.push('--- برنامج التمارين التفصيلي ---');
  account.workoutDays.forEach((day) => {
    lines.push(`* ${day.label}: ${day.focus} (${day.durationMinutes} دقيقة)`);
    lines.push(`  الإحماء: ${day.warmupNote}`);
    day.exercises.forEach((ex, i) => {
      lines.push(
        `  ${i + 1}) ${ex.name} | ${ex.sets} مجموعات × ${ex.reps} | راحة ${ex.restSeconds} ث | الحمل: ${ex.weightKg} | ${ex.targetRpe} | التوقيت: ${ex.tempo}`
      );
      if (ex.notes) lines.push(`     ملاحظات: ${ex.notes}`);
    });
  });
  lines.push('');
  lines.push('--- النظام الغذائي والوجبات ---');
  account.nutritionPlan.meals.forEach((m) => {
    lines.push(
      `* [${m.timeLabel}] ${m.title} (${m.calories} سعرة | ${m.proteinGrams}P / ${m.carbsGrams}C / ${m.fatsGrams}F)`
    );
    lines.push(`  المكونات: ${m.ingredients}`);
    if (m.notes) lines.push(`  ملاحظة: ${m.notes}`);
  });
  lines.push('');
  lines.push('--- المكملات والإضافات ---');
  account.supplements.forEach((s) => {
    lines.push(`* ${s.name} — الجرعة: ${s.dosage} (${s.timing}) | الغرض: ${s.purpose}`);
  });
  lines.push('');
  lines.push(`--- سجل 16 أسبوع بالميلادي والهجري (${account.weeklyRecords.length} أسابيع محفوظة) ---`);
  account.weeklyRecords.forEach((wk) => {
    lines.push(
      `الأسبوع ${wk.weekNumber} | ميلادي: ${wk.gregorianRangeAr} | هجري: ${wk.hijriRangeAr} | الوزن: ${wk.weightKg} كجم | الالتزام: ${wk.adherencePct}%`
    );
    if (wk.coachNotes || wk.athleteNotes) {
      lines.push(`  ملاحظة المدرب: ${wk.coachNotes} | ملاحظة المتدرب: ${wk.athleteNotes}`);
    }
  });
  if (chatMessages.length > 0) {
    lines.push('');
    lines.push('--- سجل المحادثات ---');
    chatMessages.forEach((msg) => {
      lines.push(`[${msg.createdAt}] ${msg.senderName}: ${msg.body}`);
    });
  }
  return lines.join('\n');
}
