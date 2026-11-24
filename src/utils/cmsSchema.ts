import {
  COACH_PROFILE,
  COACHING_TIERS,
  FAQ_ITEMS,
  KPI_HIGHLIGHTS,
  PROGRAM_TRACKS,
  TRANSFORMATION_CASES,
  getCoachProfile,
  getCoachingTiers,
  getFaqItems,
  getKpiHighlights,
  getProgramTracks,
  getTransformationCases,
  type CoachingTier,
  type FaqItem,
  type ProgramTrack,
  type TransformationCase,
} from '../data/coachingData';
import { PERSONAL_WHATSAPP_NUMBER, type Language } from './coachingMath';
import type {
  PortalNutritionPlan,
  PortalSupplementItem,
  PortalWeekRecord,
  PortalWeeklyGoal,
  PortalWorkoutDay,
} from './portalPlanning';

export interface HeroCopyContent {
  eyebrow: string;
  h1: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trust: string;
  overlaySubtitle: string;
  overlayMetricLabel: string;
  kpis: { value: string; label: string }[];
}

export interface CoachProfileContent {
  name: string;
  title: string;
  credentials: string;
  bio: string;
  weeklySplitHighlights: { day: string; focus: string }[];
}

export interface SiteLocaleContent {
  hero: HeroCopyContent;
  programs: ProgramTrack[];
  transformations: TransformationCase[];
  coach: CoachProfileContent;
  tiers: CoachingTier[];
  faqs: FaqItem[];
}

export interface SiteContentBundle {
  whatsappNumber: string;
  ar: SiteLocaleContent;
  en: SiteLocaleContent;
}

export interface AdminCredentialsInput {
  username: string;
  password: string;
  confirmPassword?: string;
  isSetup: boolean;
}

const DEFAULT_HERO_AR: HeroCopyContent = {
  eyebrow: 'التدريب الشخصي المبني على الأداء والأرقام',
  h1: 'ابنِ جسداً قوياً ومتناسقاً بخطة علمية تفصّل على مقاس يومك',
  sub: 'لا مزيد من الجداول العشوائية أو الأنظمة الغذائية القاسية. تحصل على برنامج مقاومة وتغذية مرن محسوب بالسعرات والماكروز، مع مراجعة أسبوعية للأوزان وتصحيح الأداء الحركي.',
  ctaPrimary: 'صمم خطتك المخصصة',
  ctaSecondary: 'استكشف البرامج التدريبية',
  trust: 'حاسبة سعرات وماكروز فورية · خطط للنادي والمنزل · متابعة أسبوعية مباشرة',
  overlaySubtitle: 'انضباط تدريبي · مرونة غذائية · قياس أسبوعي',
  overlayMetricLabel: 'استجابة وتعديل أسبوعي',
  kpis: KPI_HIGHLIGHTS.map((item) => ({ ...item })),
};

const DEFAULT_HERO_EN: HeroCopyContent = {
  eyebrow: 'Performance-Driven Personal Coaching',
  h1: 'Build a stronger, leaner physique with a system engineered for your schedule',
  sub: 'No more random workouts or crash diets. Get a precision resistance split and flexible macro plan calibrated to your numbers, backed by weekly lift and check-in reviews.',
  ctaPrimary: 'Build Your Custom Plan',
  ctaSecondary: 'Explore Programs',
  trust: 'Instant calorie & macro calculator · Gym or home tracks · Weekly check-ins',
  overlaySubtitle: 'Structured Training · Flexible Macros · Weekly Check-ins',
  overlayMetricLabel: 'Weekly check-in response',
  kpis: getKpiHighlights('en').map((item) => ({ ...item })),
};

function cloneLocaleDefaults(lang: Language): SiteLocaleContent {
  const hero = lang === 'en' ? DEFAULT_HERO_EN : DEFAULT_HERO_AR;
  const coach = lang === 'en' ? getCoachProfile('en') : COACH_PROFILE;
  const programs = (lang === 'en' ? getProgramTracks('en') : PROGRAM_TRACKS).map((p) => ({
    ...p,
    outcomes: [...p.outcomes],
    methodologySteps: p.methodologySteps.map((s) => ({ ...s })),
  }));
  const transformations = (
    lang === 'en' ? getTransformationCases('en') : TRANSFORMATION_CASES
  ).map((c) => ({ ...c }));
  const tiers = (lang === 'en' ? getCoachingTiers('en') : COACHING_TIERS).map((t) => ({
    ...t,
    deliverables: [...t.deliverables],
  }));
  const faqs = (lang === 'en' ? getFaqItems('en') : FAQ_ITEMS).map((f) => ({ ...f }));

  return {
    hero: {
      ...hero,
      kpis: hero.kpis.map((k) => ({ ...k })),
    },
    programs,
    transformations,
    coach: {
      ...coach,
      weeklySplitHighlights: coach.weeklySplitHighlights.map((w) => ({ ...w })),
    },
    tiers,
    faqs,
  };
}

export function getDefaultSiteContentBundle(): SiteContentBundle {
  return {
    whatsappNumber: PERSONAL_WHATSAPP_NUMBER,
    ar: cloneLocaleDefaults('ar'),
    en: cloneLocaleDefaults('en'),
  };
}

export function sanitizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }
  return PERSONAL_WHATSAPP_NUMBER;
}

function asNonEmptyString(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.trim().length > 0 ? val : fallback;
}

function asString(val: unknown, fallback: string): string {
  return typeof val === 'string' ? val : fallback;
}

function asPositiveNumber(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function mergeLocaleContent(
  defaults: SiteLocaleContent,
  incoming: unknown
): SiteLocaleContent {
  if (!incoming || typeof incoming !== 'object') {
    return defaults;
  }
  const src = incoming as Record<string, unknown>;

  const heroSrc =
    src.hero && typeof src.hero === 'object' ? (src.hero as Record<string, unknown>) : {};
  const kpisSrc = Array.isArray(heroSrc.kpis) ? heroSrc.kpis : [];
  const kpis = defaults.hero.kpis.map((defKpi, idx) => {
    const k = kpisSrc[idx];
    if (k && typeof k === 'object') {
      const kObj = k as Record<string, unknown>;
      return {
        value: asNonEmptyString(kObj.value, defKpi.value),
        label: asNonEmptyString(kObj.label, defKpi.label),
      };
    }
    return defKpi;
  });

  const hero: HeroCopyContent = {
    eyebrow: asNonEmptyString(heroSrc.eyebrow, defaults.hero.eyebrow),
    h1: asNonEmptyString(heroSrc.h1, defaults.hero.h1),
    sub: asNonEmptyString(heroSrc.sub, defaults.hero.sub),
    ctaPrimary: asNonEmptyString(heroSrc.ctaPrimary, defaults.hero.ctaPrimary),
    ctaSecondary: asNonEmptyString(heroSrc.ctaSecondary, defaults.hero.ctaSecondary),
    trust: asNonEmptyString(heroSrc.trust, defaults.hero.trust),
    overlaySubtitle: asNonEmptyString(heroSrc.overlaySubtitle, defaults.hero.overlaySubtitle),
    overlayMetricLabel: asNonEmptyString(
      heroSrc.overlayMetricLabel,
      defaults.hero.overlayMetricLabel
    ),
    kpis,
  };

  const programsSrc = Array.isArray(src.programs) ? src.programs : [];
  const programs: ProgramTrack[] = defaults.programs.map((defProg) => {
    const match = programsSrc.find(
      (item) =>
        item && typeof item === 'object' && (item as Record<string, unknown>).id === defProg.id
    ) as Record<string, unknown> | undefined;
    if (!match) return defProg;
    const outcomes = Array.isArray(match.outcomes)
      ? match.outcomes.filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
      : defProg.outcomes;
    return {
      ...defProg,
      title: asNonEmptyString(match.title, defProg.title),
      englishCode: asNonEmptyString(match.englishCode, defProg.englishCode),
      summary: asNonEmptyString(match.summary, defProg.summary),
      durationWeeks: asNonEmptyString(match.durationWeeks, defProg.durationWeeks),
      sessionsPerWeek: asNonEmptyString(match.sessionsPerWeek, defProg.sessionsPerWeek),
      sessionLength: asNonEmptyString(match.sessionLength, defProg.sessionLength),
      outcomes: outcomes.length > 0 ? outcomes : defProg.outcomes,
    };
  });

  const transSrc = Array.isArray(src.transformations) ? src.transformations : null;
  const transformations: TransformationCase[] =
    transSrc && transSrc.length > 0
      ? transSrc
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item, idx) => ({
            id: asNonEmptyString(item.id, `t-custom-${idx + 1}`),
            clientName: asNonEmptyString(item.clientName, 'Athlete'),
            cityAndRole: asNonEmptyString(item.cityAndRole, ''),
            goalCategory: item.goalCategory === 'muscle_gain' ? 'muscle_gain' : 'fat_loss',
            goalLabel: asNonEmptyString(item.goalLabel, ''),
            timeframeWeeks: Math.round(asPositiveNumber(item.timeframeWeeks, 12)),
            startWeightKg: asPositiveNumber(item.startWeightKg, 80),
            endWeightKg: asPositiveNumber(item.endWeightKg, 75),
            bodyFatDelta: asNonEmptyString(item.bodyFatDelta, '-5%'),
            quote: asNonEmptyString(item.quote, ''),
            programUsed: asNonEmptyString(item.programUsed, 'PRO'),
          }))
      : defaults.transformations;

  const coachSrc =
    src.coach && typeof src.coach === 'object' ? (src.coach as Record<string, unknown>) : {};
  const splitSrc = Array.isArray(coachSrc.weeklySplitHighlights)
    ? coachSrc.weeklySplitHighlights
    : [];
  const weeklySplitHighlights = defaults.coach.weeklySplitHighlights.map((defSplit, idx) => {
    const s = splitSrc[idx];
    if (s && typeof s === 'object') {
      const sObj = s as Record<string, unknown>;
      return {
        day: asNonEmptyString(sObj.day, defSplit.day),
        focus: asNonEmptyString(sObj.focus, defSplit.focus),
      };
    }
    return defSplit;
  });

  const coach: CoachProfileContent = {
    name: asNonEmptyString(coachSrc.name, defaults.coach.name),
    title: asNonEmptyString(coachSrc.title, defaults.coach.title),
    credentials: asNonEmptyString(coachSrc.credentials, defaults.coach.credentials),
    bio: asNonEmptyString(coachSrc.bio, defaults.coach.bio),
    weeklySplitHighlights,
  };

  const tiersSrc = Array.isArray(src.tiers) ? src.tiers : [];
  const tiers: CoachingTier[] = defaults.tiers.map((defTier) => {
    const match = tiersSrc.find(
      (item) =>
        item && typeof item === 'object' && (item as Record<string, unknown>).code === defTier.code
    ) as Record<string, unknown> | undefined;
    if (!match) return defTier;
    const deliverables = Array.isArray(match.deliverables)
      ? match.deliverables.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      : defTier.deliverables;
    return {
      ...defTier,
      arabicName: asNonEmptyString(match.arabicName, defTier.arabicName),
      tagline: asNonEmptyString(match.tagline, defTier.tagline),
      monthlyPriceSar: Math.round(asPositiveNumber(match.monthlyPriceSar, defTier.monthlyPriceSar)),
      badgeText: defTier.featured
        ? asString(match.badgeText, defTier.badgeText ?? '')
        : defTier.badgeText,
      ctaLabel: asNonEmptyString(match.ctaLabel, defTier.ctaLabel),
      deliverables: deliverables.length > 0 ? deliverables : defTier.deliverables,
    };
  });

  const faqsSrc = Array.isArray(src.faqs) ? src.faqs : null;
  const faqs: FaqItem[] =
    faqsSrc && faqsSrc.length > 0
      ? faqsSrc
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item, idx) => ({
            id: asNonEmptyString(item.id, `faq-custom-${idx + 1}`),
            question: asNonEmptyString(item.question, ''),
            answer: asNonEmptyString(item.answer, ''),
          }))
          .filter((f) => f.question.length > 0 && f.answer.length > 0)
      : defaults.faqs;

  return {
    hero,
    programs,
    transformations,
    coach,
    tiers,
    faqs: faqs.length > 0 ? faqs : defaults.faqs,
  };
}

export function mergeSiteContentBundle(partial: unknown): SiteContentBundle {
  const defaults = getDefaultSiteContentBundle();
  if (!partial || typeof partial !== 'object') {
    return defaults;
  }
  const obj = partial as Record<string, unknown>;
  return {
    whatsappNumber: sanitizeWhatsAppNumber(
      typeof obj.whatsappNumber === 'string' ? obj.whatsappNumber : defaults.whatsappNumber
    ),
    ar: mergeLocaleContent(defaults.ar, obj.ar),
    en: mergeLocaleContent(defaults.en, obj.en),
  };
}

export function validateAdminCredentialsInput(
  input: AdminCredentialsInput,
  lang: Language = 'ar'
): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedUsername = input.username.trim();
  const password = input.password;

  if (trimmedUsername.length < 3 || trimmedUsername.length > 80) {
    errors.username =
      lang === 'en'
        ? 'Username or email must be between 3 and 80 characters.'
        : 'اسم المستخدم أو البريد يجب أن يكون بين 3 و 80 حرفاً.';
  }

  if (input.isSetup) {
    if (password.length < 8) {
      errors.password =
        lang === 'en'
          ? 'Password must be at least 8 characters long.'
          : 'كلمة المرور يجب أن لا تقل عن 8 أحرف.';
    }
    if (password !== (input.confirmPassword ?? '')) {
      errors.confirmPassword =
        lang === 'en' ? 'Passwords do not match.' : 'تأكيد كلمة المرور غير متطابق.';
    }
  } else if (password.length === 0) {
    errors.password =
      lang === 'en' ? 'Please enter your password.' : 'يرجى إدخال كلمة المرور.';
  }

  return errors;
}

export type PortalTierCode = 'CORE' | 'PRO' | 'ELITE';

export interface PortalWeightEntry {
  week: string;
  weightKg: number;
  note: string;
}

export interface PortalAccountPublic {
  id: string;
  username: string;
  displayName: string;
  tierCode: PortalTierCode;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  splitTitle: string;
  active: boolean;
  coachNotes: string;
  completedExerciseIds: string[];
  weightCheckIns: PortalWeightEntry[];
  weeklyGoals: PortalWeeklyGoal[];
  workoutDays: PortalWorkoutDay[];
  nutritionPlan: PortalNutritionPlan;
  supplements: PortalSupplementItem[];
  weeklyRecords: PortalWeekRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PortalAccountFormInput {
  username: string;
  password: string;
  displayName: string;
}

export function validatePortalAccountFormInput(
  input: PortalAccountFormInput,
  isEdit: boolean,
  lang: Language = 'ar'
): Record<string, string> {
  const errors: Record<string, string> = {};
  const trimmedUsername = input.username.trim();
  const trimmedDisplay = input.displayName.trim();

  if (trimmedUsername.length < 3 || trimmedUsername.length > 60) {
    errors.username =
      lang === 'en'
        ? 'Username must be between 3 and 60 characters.'
        : 'اسم المستخدم يجب أن يكون بين 3 و 60 حرفاً.';
  } else if (/\s/.test(trimmedUsername)) {
    errors.username =
      lang === 'en'
        ? 'Username cannot contain spaces.'
        : 'اسم المستخدم لا يجب أن يحتوي على مسافات.';
  }

  if (trimmedDisplay.length < 2 || trimmedDisplay.length > 80) {
    errors.displayName =
      lang === 'en'
        ? 'Athlete name must be between 2 and 80 characters.'
        : 'اسم المتدرب يجب أن يكون بين حرفين و 80 حرفاً.';
  }

  if (!isEdit && input.password.length < 3) {
    errors.password =
      lang === 'en'
        ? 'Password must be at least 3 characters.'
        : 'كلمة المرور يجب أن تكون 3 أحرف على الأقل.';
  } else if (isEdit && input.password.length > 0 && input.password.length < 3) {
    errors.password =
      lang === 'en'
        ? 'New password must be at least 3 characters (or leave empty to keep current).'
        : 'كلمة المرور الجديدة يجب أن لا تقل عن 3 أحرف (أو اتركها فارغة للإبقاء على الحالية).';
  }

  return errors;
}

export function validatePortalLoginInput(
  username: string,
  password: string,
  lang: Language = 'ar'
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (username.trim().length === 0) {
    errors.username =
      lang === 'en' ? 'Please enter your username.' : 'يرجى إدخال اسم المستخدم.';
  }
  if (password.length === 0) {
    errors.password =
      lang === 'en' ? 'Please enter your password.' : 'يرجى إدخال كلمة المرور.';
  }
  return errors;
}
