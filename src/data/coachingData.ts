import type { Language, TierCode, TrainingGoal, WorkoutDay } from '../utils/coachingMath';

export interface ProgramTrack {
  id: TrainingGoal;
  title: string;
  englishCode: string;
  summary: string;
  durationWeeks: string;
  sessionsPerWeek: string;
  sessionLength: string;
  imageUrl: string;
  imageAlt: string;
  outcomes: string[];
  methodologySteps: { index: string; title: string; detail: string }[];
}

export interface TransformationCase {
  id: string;
  clientName: string;
  cityAndRole: string;
  goalCategory: 'fat_loss' | 'muscle_gain';
  goalLabel: string;
  timeframeWeeks: number;
  startWeightKg: number;
  endWeightKg: number;
  bodyFatDelta: string;
  quote: string;
  programUsed: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export interface CoachingTier {
  code: TierCode;
  arabicName: string;
  tagline: string;
  monthlyPriceSar: number;
  featured: boolean;
  badgeText?: string;
  deliverables: string[];
  ctaLabel: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface WeightCheckIn {
  week: string;
  weightKg: number;
  note: string;
}

export const HERO_IMAGE_URL = '/src/assets/images/hero_athletic_coach_1795356435238.jpg';
export const STRENGTH_IMAGE_URL = '/src/assets/images/program_strength_1795356435451.jpg';
export const CONDITIONING_IMAGE_URL = '/src/assets/images/program_conditioning_1795356435176.jpg';
export const COACH_PORTRAIT_URL = '/src/assets/images/coach_portrait_1795356435120.jpg';

export const T1_BEFORE_IMAGE_URL = '/src/assets/images/t1_before_fatloss_1795565854875.jpg';
export const T1_AFTER_IMAGE_URL = '/src/assets/images/t1_after_fatloss_1795565855876.jpg';
export const T2_BEFORE_IMAGE_URL = '/src/assets/images/t2_before_hypertrophy_1795565856338.jpg';
export const T2_AFTER_IMAGE_URL = '/src/assets/images/t2_after_hypertrophy_1795565856735.jpg';
export const T3_BEFORE_IMAGE_URL = '/src/assets/images/t3_before_recomp_1795565857598.jpg';
export const T3_AFTER_IMAGE_URL = '/src/assets/images/t3_after_recomp_1795565857623.jpg';
export const T4_BEFORE_IMAGE_URL = '/src/assets/images/t4_before_athletic_1795565857588.jpg';
export const T4_AFTER_IMAGE_URL = '/src/assets/images/t4_after_athletic_1795565857586.jpg';

export const KPI_HIGHLIGHTS = [
  { value: '+1,420', label: 'متدرب أتمّوا برامجهم بنجاح' },
  { value: '94%', label: 'معدل الالتزام الأسبوعي بالخطة' },
  { value: '12 أسبوعاً', label: 'متوسط المدة لظهور التحول الواضح' },
  { value: '4.9 / 5', label: 'متوسط تقييم المتابعة والتدريب' },
];

export function getKpiHighlights(lang: Language) {
  if (lang === 'en') {
    return [
      { value: '+1,420', label: 'Athletes who completed their programs' },
      { value: '94%', label: 'Weekly program adherence rate' },
      { value: '12 Weeks', label: 'Average timeline to visible transformation' },
      { value: '4.9 / 5', label: 'Average coaching & check-in rating' },
    ];
  }
  return KPI_HIGHLIGHTS;
}

export const PROGRAM_TRACKS: ProgramTrack[] = [
  {
    id: 'fat_loss',
    title: 'التنشيف وحرق الدهون العنيدة',
    englishCode: 'SHRED PROTOCOL',
    summary:
      'بروتوكول متدرج يوازن بين العجز الحراري الذكي وتدريبات المقاومة عالية الكثافة للحفاظ على الكتلة العضلية وخفض نسبة الدهون دون حرمان.',
    durationWeeks: '12 أسبوعاً',
    sessionsPerWeek: '4–5 حصص أسبوعياً',
    sessionLength: '50 دقيقة',
    imageUrl: CONDITIONING_IMAGE_URL,
    imageAlt: 'تدريب التكييف الأيضي وحرق الدهون على المسار الرياضي',
    outcomes: [
      'خسارة 0.5 إلى 0.8 كجم دهون أسبوعياً مع ثبات القوة العضلية',
      'خطة تغذية مرنة ببدائل محلية تناسب نمط عملك اليومي',
      'بروتوكول كارديو متصاعد لا يستهلك وقتك أو يرهق مفاصلك',
    ],
    methodologySteps: [
      {
        index: '01',
        title: 'تحديد نقطة الأساس الأيضية',
        detail: 'حساب دقيق للسعرات والماكروز وتقييم جودة النوم والجهد اليومي قبل خفض السعرات.',
      },
      {
        index: '02',
        title: 'حفظ الكتلة العضلية بالأحمال',
        detail: 'التركيز على التمارين المركبة ومستوى الشدة RPE 8 لمنع هبوط الكتلة العضلية أثناء التنشيف.',
      },
      {
        index: '03',
        title: 'تعديل أسبوعي وفق الاستجابة',
        detail: 'مراجعة قياسات الوزن والمحيط أسبوعياً لضبط الكربوهيدرات وتفادي ثبات الوزن.',
      },
    ],
  },
  {
    id: 'muscle_gain',
    title: 'البناء العضلي والقوة الهيكلية',
    englishCode: 'HYPERTROPHY LAB',
    summary:
      'برنامج تضخيم عضلي مبني على الزيادة التدريجية في الأحمال الميكانيكية وتوزيع الحجم التدريبي لتعظيم الاستشفاء والنمو الصافي.',
    durationWeeks: '16 أسبوعاً',
    sessionsPerWeek: '4–6 حصص أسبوعياً',
    sessionLength: '60 دقيقة',
    imageUrl: STRENGTH_IMAGE_URL,
    imageAlt: 'معدات القوة والأوزان الحرة لبناء العضلات',
    outcomes: [
      'زيادة صافية في الكتلة العضلية بأقل نسبة اكتساب دهون ممكنة',
      'تطور موثق في أوزان التمارين الأساسية كل أسبوعين',
      'فيديوهات تصحيح أداء لكل تمرين لضمان سلامة المفاصل',
    ],
    methodologySteps: [
      {
        index: '01',
        title: 'هندسة الحجم التدريبي الأسبوعي',
        detail: 'توزيع المجموعات الأسبوعية بين 12–18 مجموعة لكل عضلة حسب مستوى استشفائك.',
      },
      {
        index: '02',
        title: 'تتبع الأوزان والتكرارات بدقة',
        detail: 'جدول رقمي يحدد الوزن المستهدف والتكرارات والراحة بين المجموعات.',
      },
      {
        index: '03',
        title: 'فائض حراري منضبط',
        detail: 'تغطية احتياج البروتين والكربوهيدرات حول التمرين لدعم الأداء والاستشفاء.',
      },
    ],
  },
  {
    id: 'athletic_recomp',
    title: 'إعادة تشكيل الجسم والأداء الرياضي',
    englishCode: 'KINETIC RECOMP',
    summary:
      'مصمم للرياضيين وأصحاب الأعمال المشغولين الراغبين في رفع اللياقة القلبية، تحسين المرونة، وخفض الدهون بالتوازي مع زيادة القوة.',
    durationWeeks: '10 أسابيع',
    sessionsPerWeek: '3–4 حصص أسبوعياً',
    sessionLength: '45 دقيقة',
    imageUrl: HERO_IMAGE_URL,
    imageAlt: 'صالة تدريب متكاملة للأداء الرياضي وإعادة تشكيل الجسم',
    outcomes: [
      'رفع الكفاءة القلبية والتحمل خلال المجهود اليومي والرياضي',
      'تحسين توازن الجسم وتقوية العضلات المثبتة والعمود الفقري',
      'إمكانية التنفيذ في النادي الرياضي أو المنزل بمعدات أساسية',
    ],
    methodologySteps: [
      {
        index: '01',
        title: 'دمج القوة مع التكييف الهوائي',
        detail: 'تنظيم الحصص بحيث ترفع القوة الانفجارية دون تداخل سلبي مع التعافي.',
      },
      {
        index: '02',
        title: 'مرونة كاملة في التغذية',
        detail: 'خطة وجبات واضحة قابلة للتطبيق مع السفر والاجتماعات والمناسبات.',
      },
      {
        index: '03',
        title: 'اختبارات أداء شهرية',
        detail: 'قياس التقدم في القوة النسبية ومحيط الخصر ونسبة الدهون كل 4 أسابيع.',
      },
    ],
  },
];

const PROGRAM_TRACKS_EN: ProgramTrack[] = [
  {
    id: 'fat_loss',
    title: 'Precision Fat Loss & Conditioning',
    englishCode: 'SHRED PROTOCOL',
    summary:
      'A phased protocol balancing controlled caloric deficit with high-output resistance training to preserve lean muscle mass while stripping stubborn fat.',
    durationWeeks: '12 Weeks',
    sessionsPerWeek: '4–5 Sessions / wk',
    sessionLength: '50 min',
    imageUrl: CONDITIONING_IMAGE_URL,
    imageAlt: 'Metabolic conditioning and sled turf training session',
    outcomes: [
      'Lose 0.5 to 0.8 kg of fat per week while maintaining strength numbers',
      'Flexible macro-based meals built around everyday local foods',
      'Progressive conditioning protocol that protects your joints and schedule',
    ],
    methodologySteps: [
      {
        index: '01',
        title: 'Establish Metabolic Baseline',
        detail: 'Calibrate maintenance calories, sleep quality, and daily step count before entering a deficit.',
      },
      {
        index: '02',
        title: 'Preserve Lean Tissue via Tension',
        detail: 'Anchor sessions around compound lifts at RPE 8 so muscle tissue stays retained during fat loss.',
      },
      {
        index: '03',
        title: 'Weekly Response Adjustments',
        detail: 'Review weight trends and waist measurements weekly to fine-tune carbs and prevent plateaus.',
      },
    ],
  },
  {
    id: 'muscle_gain',
    title: 'Hypertrophy & Structural Strength',
    englishCode: 'HYPERTROPHY LAB',
    summary:
      'A structured hypertrophy block built on progressive mechanical overload and calibrated weekly set volume for clean lean-mass growth.',
    durationWeeks: '16 Weeks',
    sessionsPerWeek: '4–6 Sessions / wk',
    sessionLength: '60 min',
    imageUrl: STRENGTH_IMAGE_URL,
    imageAlt: 'Matte black dumbbells and strength rack equipment',
    outcomes: [
      'Measurable lean muscle gain with minimal unwanted fat accumulation',
      'Tracked progression across primary compound lifts every two weeks',
      'Form-check video feedback to protect joints under heavy loads',
    ],
    methodologySteps: [
      {
        index: '01',
        title: 'Weekly Volume Engineering',
        detail: 'Allocate 12–18 hard working sets per muscle group tuned to your recovery capacity.',
      },
      {
        index: '02',
        title: 'Precision Load & Rep Tracking',
        detail: 'Structured training sheets specifying target weights, rep ranges, and rest intervals.',
      },
      {
        index: '03',
        title: 'Controlled Caloric Surplus',
        detail: 'Fuel protein synthesis and peri-workout carbohydrates for consistent strength output.',
      },
    ],
  },
  {
    id: 'athletic_recomp',
    title: 'Body Recomposition & Athletic Output',
    englishCode: 'KINETIC RECOMP',
    summary:
      'Built for busy professionals and athletes aiming to elevate cardiovascular capacity, mobility, and strength while tightening body composition.',
    durationWeeks: '10 Weeks',
    sessionsPerWeek: '3–4 Sessions / wk',
    sessionLength: '45 min',
    imageUrl: HERO_IMAGE_URL,
    imageAlt: 'Performance gym setup for athletic recomposition training',
    outcomes: [
      'Higher aerobic capacity and sustained daily energy',
      'Improved posture, core stability, and joint resilience',
      'Executable in a commercial gym or minimal home setup',
    ],
    methodologySteps: [
      {
        index: '01',
        title: 'Concurrent Strength & Conditioning',
        detail: 'Sequence explosive strength and zone-based conditioning without recovery interference.',
      },
      {
        index: '02',
        title: 'Travel-Ready Nutrition Structure',
        detail: 'Practical meal templates built for busy workdays, travel, and social dinners.',
      },
      {
        index: '03',
        title: 'Monthly Performance Benchmarks',
        detail: 'Re-test relative strength, waist circumference, and body composition every 4 weeks.',
      },
    ],
  },
];

export function getProgramTracks(lang: Language): ProgramTrack[] {
  return lang === 'en' ? PROGRAM_TRACKS_EN : PROGRAM_TRACKS;
}

export const TRANSFORMATION_CASES: TransformationCase[] = [
  {
    id: 't1',
    clientName: 'فيصل العتيبي',
    cityAndRole: 'مهندس برمجيات · الرياض',
    goalCategory: 'fat_loss',
    goalLabel: 'تنشيف وحرق دهون',
    timeframeWeeks: 14,
    startWeightKg: 96.4,
    endWeightKg: 81.2,
    bodyFatDelta: '-11.5% دهون',
    quote:
      'كنت أعمل 10 ساعات يومياً وأعاني من آلام أسفل الظهر. الخطة اختصرت تمريني إلى 45 دقيقة أربع مرات بالأسبوع مع وجبات واضحة دون تعقيد.',
    programUsed: 'باقة PRO · بروتوكول التنشيف',
    beforeImageUrl: T1_BEFORE_IMAGE_URL,
    afterImageUrl: T1_AFTER_IMAGE_URL,
  },
  {
    id: 't2',
    clientName: 'عمر الدوسري',
    cityAndRole: 'طبيب مقيم · جدة',
    goalCategory: 'muscle_gain',
    goalLabel: 'بناء عضلي صافي',
    timeframeWeeks: 16,
    startWeightKg: 67.0,
    endWeightKg: 74.8,
    bodyFatDelta: '+6.2 كجم عضل صافي',
    quote:
      'أول مرة أزيد وزني بدون تراكم دهون البطن. المتابعة الأسبوعية وتعديل الأوزان في البوابة جعلت التطور مضموناً.',
    programUsed: 'باقة ELITE · مختبر التضخيم',
    beforeImageUrl: T2_BEFORE_IMAGE_URL,
    afterImageUrl: T2_AFTER_IMAGE_URL,
  },
  {
    id: 't3',
    clientName: 'بدر الشهري',
    cityAndRole: 'مدير مشاريع · الدمام',
    goalCategory: 'fat_loss',
    goalLabel: 'تنشيف وإعادة تشكيل',
    timeframeWeeks: 12,
    startWeightKg: 89.5,
    endWeightKg: 79.1,
    bodyFatDelta: '-9.0% دهون',
    quote:
      'أهم ميزة كانت المراجعة المباشرة لفيديوهات تماريني. صححت تكنيك السكوات والديدلفت وارتفعت أرقامي رغم العجز الحراري.',
    programUsed: 'باقة PRO · التنشيف الذكي',
    beforeImageUrl: T3_BEFORE_IMAGE_URL,
    afterImageUrl: T3_AFTER_IMAGE_URL,
  },
  {
    id: 't4',
    clientName: 'سلطان القحطاني',
    cityAndRole: 'لاعب كرة قدم هاوٍ · أبها',
    goalCategory: 'muscle_gain',
    goalLabel: 'قوة وأداء رياضي',
    timeframeWeeks: 12,
    startWeightKg: 72.5,
    endWeightKg: 77.6,
    bodyFatDelta: '+28% قوة الساقين',
    quote:
      'الجمع بين تمارين المقاومة والتكييف الأيضي انعكس فوراً على سرعتي وثباتي في الملعب طوال الـ 90 دقيقة.',
    programUsed: 'باقة ELITE · الأداء المتكامل',
    beforeImageUrl: T4_BEFORE_IMAGE_URL,
    afterImageUrl: T4_AFTER_IMAGE_URL,
  },
];

const TRANSFORMATION_CASES_EN: TransformationCase[] = [
  {
    id: 't1',
    clientName: 'Faisal Al-Otaibi',
    cityAndRole: 'Software Engineer · Riyadh',
    goalCategory: 'fat_loss',
    goalLabel: 'Fat Loss & Conditioning',
    timeframeWeeks: 14,
    startWeightKg: 96.4,
    endWeightKg: 81.2,
    bodyFatDelta: '-11.5% Body Fat',
    quote:
      'Working 10-hour shifts with lower-back stiffness, the 45-minute 4-day split and clear meal swaps fit seamlessly into my week.',
    programUsed: 'PRO Tier · Shred Protocol',
    beforeImageUrl: T1_BEFORE_IMAGE_URL,
    afterImageUrl: T1_AFTER_IMAGE_URL,
  },
  {
    id: 't2',
    clientName: 'Omar Al-Dosari',
    cityAndRole: 'Resident Physician · Jeddah',
    goalCategory: 'muscle_gain',
    goalLabel: 'Lean Hypertrophy',
    timeframeWeeks: 16,
    startWeightKg: 67.0,
    endWeightKg: 74.8,
    bodyFatDelta: '+6.2 kg Lean Mass',
    quote:
      'For the first time I gained weight cleanly without waist fat. Weekly check-ins and load targets kept every block moving forward.',
    programUsed: 'ELITE Tier · Hypertrophy Lab',
    beforeImageUrl: T2_BEFORE_IMAGE_URL,
    afterImageUrl: T2_AFTER_IMAGE_URL,
  },
  {
    id: 't3',
    clientName: 'Bader Al-Shehri',
    cityAndRole: 'Project Manager · Dammam',
    goalCategory: 'fat_loss',
    goalLabel: 'Cut & Recomposition',
    timeframeWeeks: 12,
    startWeightKg: 89.5,
    endWeightKg: 79.1,
    bodyFatDelta: '-9.0% Body Fat',
    quote:
      'Form reviews on my squat and deadlift videos made all the difference—my lifts went up even while cutting calories.',
    programUsed: 'PRO Tier · Smart Cut',
    beforeImageUrl: T3_BEFORE_IMAGE_URL,
    afterImageUrl: T3_AFTER_IMAGE_URL,
  },
  {
    id: 't4',
    clientName: 'Sultan Al-Qahtani',
    cityAndRole: 'Amateur Footballer · Abha',
    goalCategory: 'muscle_gain',
    goalLabel: 'Strength & Pitch Output',
    timeframeWeeks: 12,
    startWeightKg: 72.5,
    endWeightKg: 77.6,
    bodyFatDelta: '+28% Lower-Body Power',
    quote:
      'Combining resistance work with turf conditioning translated directly into my sprint speed and 90-minute match stamina.',
    programUsed: 'ELITE Tier · Integrated Output',
    beforeImageUrl: T4_BEFORE_IMAGE_URL,
    afterImageUrl: T4_AFTER_IMAGE_URL,
  },
];

export function getTransformationCases(lang: Language): TransformationCase[] {
  return lang === 'en' ? TRANSFORMATION_CASES_EN : TRANSFORMATION_CASES;
}

export const COACH_PROFILE = {
  name: 'الكابتن طارق الحربي',
  title: 'مدرب القوة والتكييف المعتمد · أخصائي تغذية رياضية',
  credentials: 'CSCS Certified · ISSN Sports Nutrition · خبرة ميدانية +9 سنوات',
  bio: 'ساعدت أكثر من 1,420 متدرباً في الخليج والعالم العربي على الانتقال من العشوائية في التمرين والأنظمة القاسية إلى منهجية علمية قابلة للاستمرار مدى الحياة. نعتمد في أكاديمية ذروة كينتك على الأرقام الواقعية، تصحيح الأداء الحركي، وبناء عادات تغذية مرنة تخدم يومك.',
  weeklySplitHighlights: [
    { day: 'الأحد', focus: 'دفع علوي وقوة الصدر' },
    { day: 'الإثنين', focus: 'سحب علوي وتقوية الظهر' },
    { day: 'الأربعاء', focus: 'القوة السفلية وتثبيت الجذع' },
    { day: 'الخميس', focus: 'تكييف أيضي ومقاومة شاملة' },
  ],
};

export function getCoachProfile(lang: Language) {
  if (lang === 'en') {
    return {
      name: 'Coach Tariq Al-Harbi',
      title: 'Certified Strength & Conditioning Specialist · Sports Nutritionist',
      credentials: 'CSCS Certified · ISSN Sports Nutrition · 9+ Years Coaching',
      bio: 'I have helped over 1,420 athletes and busy professionals replace random workouts and crash diets with an evidence-based system built for life. At Kinetic Peak, every training block is anchored in measurable loads, technique mastery, and sustainable flexible nutrition.',
      weeklySplitHighlights: [
        { day: 'Sunday', focus: 'Upper Push & Chest Strength' },
        { day: 'Monday', focus: 'Upper Pull & Back Density' },
        { day: 'Wednesday', focus: 'Lower Strength & Core Stability' },
        { day: 'Thursday', focus: 'Metabolic Conditioning & Full Body' },
      ],
    };
  }
  return COACH_PROFILE;
}

export const COACHING_TIERS: CoachingTier[] = [
  {
    code: 'CORE',
    arabicName: 'الباقة الأساسية',
    tagline: 'للملتزمين الباحثين عن خطة محكمة وتحديث شهري',
    monthlyPriceSar: 390,
    featured: false,
    deliverables: [
      'برنامج تدريبي مخصص للنادي أو المنزل',
      'خطة سعرات وماكروز مع قائمة بدائل غذائية',
      'دليل فيديو عربي لشرح الأداء الصحيح لكل تمرين',
      'تعديل الخطة ومراجعة التقدم كل 4 أسابيع',
    ],
    ctaLabel: 'اختر الباقة الأساسية',
  },
  {
    code: 'PRO',
    arabicName: 'باقة التحول المتقدمة',
    tagline: 'الخيار الأكثر طلباً لتحقيق نتائج أسرع بمتابعة أسبوعية',
    monthlyPriceSar: 590,
    featured: true,
    badgeText: 'الأكثر اختياراً',
    deliverables: [
      'كل مميزات الباقة الأساسية',
      'مراجعة وتقييم أسبوعي للأوزان والمقاسات وتعديل السعرات',
      'تواصل مباشر عبر الواتساب خلال 24 ساعة للاستفسارات',
      'تصحيح تكنيك الأداء عبر مراجعة فيديوهات التمرين',
      'بروتوكول مكملات واستشفاء مخصص لحالتك',
    ],
    ctaLabel: 'ابدأ بباقة PRO الآن',
  },
  {
    code: 'ELITE',
    arabicName: 'باقة النخبة VIP',
    tagline: 'إشراف شخصي يومي وتعديلات لحظية للأداء الرياضي العالي',
    monthlyPriceSar: 950,
    featured: false,
    deliverables: [
      'متابعة يومية مباشرة مع الكابتن طارق الحربي',
      'مكالمة فيديو نصف شهرية لتقييم التقدم وضبط الأهداف',
      'خطة تغذية متغيرة أيام التمرين وأيام الراحة (Carb Cycling)',
      'تكييف فوري للبرنامج أثناء السفر أو ضغط العمل',
      'أولوية مراجعة فحوصات الدم والمؤشرات الصحية مع التمرين',
    ],
    ctaLabel: 'انضم لباقة ELITE',
  },
];

const COACHING_TIERS_EN: CoachingTier[] = [
  {
    code: 'CORE',
    arabicName: 'Core Foundation Plan',
    tagline: 'For self-driven athletes seeking structured programming & monthly updates',
    monthlyPriceSar: 390,
    featured: false,
    deliverables: [
      'Custom gym or home resistance training program',
      'Calibrated calorie & macro targets with food swap lists',
      'Exercise execution video library for every movement',
      'Program review and progression update every 4 weeks',
    ],
    ctaLabel: 'Select Core Plan',
  },
  {
    code: 'PRO',
    arabicName: 'Pro Transformation Plan',
    tagline: 'Most popular tier for accelerated results with weekly coach check-ins',
    monthlyPriceSar: 590,
    featured: true,
    badgeText: 'Most Popular',
    deliverables: [
      'Everything included in Core Foundation',
      'Weekly check-ins on lift numbers, measurements & calorie adjustments',
      'Direct 24-hour WhatsApp coach messaging support',
      'Lifting technique feedback via form-check videos',
      'Personalized recovery & evidence-based supplement protocol',
    ],
    ctaLabel: 'Start with PRO Now',
  },
  {
    code: 'ELITE',
    arabicName: 'Elite VIP Coaching',
    tagline: 'Daily 1-on-1 oversight and real-time adjustments for peak output',
    monthlyPriceSar: 950,
    featured: false,
    deliverables: [
      'Daily direct check-ins with Coach Tariq Al-Harbi',
      'Bi-weekly 1-on-1 video strategy & progress call',
      'Training vs. rest-day nutrition periodization (Carb Cycling)',
      'Instant program adaptation for travel or heavy work weeks',
      'Priority review of lab biomarkers alongside training load',
    ],
    ctaLabel: 'Join ELITE Tier',
  },
];

export function getCoachingTiers(lang: Language): CoachingTier[] {
  return lang === 'en' ? COACHING_TIERS_EN : COACHING_TIERS;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'هل أحتاج إلى الاشتراك في نادٍ رياضي متكامل لتطبيق البرنامج؟',
    answer:
      'لا يشترط ذلك. أثناء التقييم الأولي تختار مكان التدريب المناسب لك (نادٍ متكامل أو تدريب منزلي بالدامبلز والمقاومة)، ونصمم جدولك بناءً على الأدوات المتاحة لديك فعلياً.',
  },
  {
    id: 'faq-2',
    question: 'هل خطة التغذية صارمة وتمنعني من الأكل مع العائلة أو في المطاعم؟',
    answer:
      'نعتمد على التغذية المرنة القائمة على السعرات والبروتين مع خيارات بدائل محلية وعربية واضحة، بالإضافة إلى دليل عملي للتعامل مع العزائم والسفر دون أن يتوقف تقدمك.',
  },
  {
    id: 'faq-3',
    question: 'كيف تتم المتابعة الأسبوعية وتصحيح التمارين؟',
    answer:
      'في نهاية كل أسبوع ترسل تقرير الوزن والمقاسات وصور التقدم الاختيارية ومقاطع قصيرة للتمارين الأساسية، ويتم تحليلها وتحديث أرقامك وخطة الأسبوع التالي خلال أقل من 24 ساعة.',
  },
  {
    id: 'faq-4',
    question: 'ماذا لو كنت مبتدئاً تماماً أو لدي إصابة قديمة في الركبة أو الظهر؟',
    answer:
      'نبدأ باختبار تقييم حركي ونختار تمارين آمنة تراعي حالة مفاصلك مع تقوية العضلات المحيطة بالإصابة بشكل تدريجي مدروس.',
  },
  {
    id: 'faq-5',
    question: 'متى أستلم خطتي بعد إكمال التقييم؟',
    answer:
      'تحصل على حسابك وأرقامك المبدئية فوراً عبر الحاسبة وبوابة المتدرب، وتستلم نسختك النهائية المراجعة من الكابتن خلال 24 إلى 48 ساعة من تأكيد الاشتراك.',
  },
];

const FAQ_ITEMS_EN: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Do I need a full commercial gym membership to follow the plan?',
    answer:
      'No. During the initial assessment you choose between a full gym or home training setup with dumbbells and bands, and we tailor every exercise to your available equipment.',
  },
  {
    id: 'faq-2',
    question: 'Is the nutrition plan restrictive or does it ban family meals and dining out?',
    answer:
      'We follow flexible macro-based nutrition built around calories and protein targets, complete with everyday meal swaps and practical dining-out guidelines.',
  },
  {
    id: 'faq-3',
    question: 'How do weekly check-ins and exercise form reviews work?',
    answer:
      'At the end of each week you submit your weight log, measurements, and short clips of key compound lifts. Your coach reviews everything and updates next week targets within 24 hours.',
  },
  {
    id: 'faq-4',
    question: 'What if I am a complete beginner or have a prior knee/back injury?',
    answer:
      'We start with a movement screening and select joint-friendly exercise variations that progressively strengthen the supporting musculature safely.',
  },
  {
    id: 'faq-5',
    question: 'When do I receive my personalized plan after completing the assessment?',
    answer:
      'Your calculated calories, macros, and portal preview are ready immediately, and your coach-reviewed custom schedule is finalized within 24 to 48 hours.',
  },
];

export function getFaqItems(lang: Language): FaqItem[] {
  return lang === 'en' ? FAQ_ITEMS_EN : FAQ_ITEMS;
}

export const DEFAULT_WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: 'day-1',
    label: 'اليوم الأول',
    focus: 'دفع علوي (صدر · كتف · ترايسبس)',
    durationMinutes: 50,
    exercises: [
      {
        id: 'ex-d1-1',
        name: 'ضغط صدر بالبار المائل (Incline Barbell Press)',
        sets: 4,
        reps: '6 - 8',
        restSeconds: 120,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d1-2',
        name: 'ضغط كتف بالدامبل جالساً (Seated Dumbbell Press)',
        sets: 3,
        reps: '8 - 10',
        restSeconds: 90,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d1-3',
        name: 'تفتيح صدر بالكابل (Cable Chest Fly)',
        sets: 3,
        reps: '12 - 15',
        restSeconds: 60,
        targetRpe: 'RPE 9',
      },
      {
        id: 'ex-d1-4',
        name: 'رفرفة جانبية بالدامبل (Lateral Raises)',
        sets: 4,
        reps: '12 - 15',
        restSeconds: 60,
        targetRpe: 'RPE 9',
      },
      {
        id: 'ex-d1-5',
        name: 'دفع ترايسبس بالحبل (Rope Tricep Pushdown)',
        sets: 3,
        reps: '10 - 12',
        restSeconds: 60,
        targetRpe: 'RPE 8.5',
      },
    ],
  },
  {
    id: 'day-2',
    label: 'اليوم الثاني',
    focus: 'سحب علوي (ظهر · كتف خلفي · بايسبس)',
    durationMinutes: 55,
    exercises: [
      {
        id: 'ex-d2-1',
        name: 'سحب عالي قبضة واسعة (Wide-Grip Lat Pulldown)',
        sets: 4,
        reps: '8 - 10',
        restSeconds: 90,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d2-2',
        name: 'تجديف مدعوم للصدر (Chest-Supported Row)',
        sets: 4,
        reps: '8 - 10',
        restSeconds: 90,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d2-3',
        name: 'سحب للوجه بالحبل (Face Pulls)',
        sets: 3,
        reps: '15',
        restSeconds: 60,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d2-4',
        name: 'مرجحة بايسبس بالبار المتعرج (EZ-Bar Curl)',
        sets: 3,
        reps: '10 - 12',
        restSeconds: 60,
        targetRpe: 'RPE 9',
      },
    ],
  },
  {
    id: 'day-3',
    label: 'اليوم الثالث',
    focus: 'القوة السفلية والجذع (أرجل · أوتار · كور)',
    durationMinutes: 55,
    exercises: [
      {
        id: 'ex-d3-1',
        name: 'سكوات خلفي بالبار (Barbell Back Squat)',
        sets: 4,
        reps: '6 - 8',
        restSeconds: 150,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d3-2',
        name: 'رفعة رومانية بالدامبل (Romanian Deadlift)',
        sets: 3,
        reps: '8 - 10',
        restSeconds: 120,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d3-3',
        name: 'دفع الأرجل على الجهاز (Leg Press)',
        sets: 3,
        reps: '10 - 12',
        restSeconds: 90,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d3-4',
        name: 'ثبات الجذع مع سحب الكابل (Pallof Press)',
        sets: 3,
        reps: '12 لكل جانب',
        restSeconds: 60,
        targetRpe: 'RPE 8',
      },
    ],
  },
  {
    id: 'day-4',
    label: 'اليوم الرابع',
    focus: 'تكييف أيضي ومقاومة شاملة',
    durationMinutes: 40,
    exercises: [
      {
        id: 'ex-d4-1',
        name: 'دفع الزلاجة الرياضية (Sled Push Intervals)',
        sets: 6,
        reps: '20 متر',
        restSeconds: 60,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d4-2',
        name: 'أرجحة الكيتل بيل (Kettlebell Swings)',
        sets: 4,
        reps: '15',
        restSeconds: 60,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d4-3',
        name: 'موجات الحبل القتالي (Battle Ropes)',
        sets: 4,
        reps: '30 ثانية',
        restSeconds: 45,
        targetRpe: 'RPE 9',
      },
    ],
  },
];

const DEFAULT_WORKOUT_DAYS_EN: WorkoutDay[] = [
  {
    id: 'day-1',
    label: 'Day 1',
    focus: 'Upper Push (Chest · Shoulders · Triceps)',
    durationMinutes: 50,
    exercises: [
      {
        id: 'ex-d1-1',
        name: 'Incline Barbell Chest Press',
        sets: 4,
        reps: '6 - 8',
        restSeconds: 120,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d1-2',
        name: 'Seated Dumbbell Shoulder Press',
        sets: 3,
        reps: '8 - 10',
        restSeconds: 90,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d1-3',
        name: 'Cable Chest Fly',
        sets: 3,
        reps: '12 - 15',
        restSeconds: 60,
        targetRpe: 'RPE 9',
      },
      {
        id: 'ex-d1-4',
        name: 'Dumbbell Lateral Raises',
        sets: 4,
        reps: '12 - 15',
        restSeconds: 60,
        targetRpe: 'RPE 9',
      },
      {
        id: 'ex-d1-5',
        name: 'Rope Tricep Pushdown',
        sets: 3,
        reps: '10 - 12',
        restSeconds: 60,
        targetRpe: 'RPE 8.5',
      },
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2',
    focus: 'Upper Pull (Back · Rear Delts · Biceps)',
    durationMinutes: 55,
    exercises: [
      {
        id: 'ex-d2-1',
        name: 'Wide-Grip Lat Pulldown',
        sets: 4,
        reps: '8 - 10',
        restSeconds: 90,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d2-2',
        name: 'Chest-Supported Row',
        sets: 4,
        reps: '8 - 10',
        restSeconds: 90,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d2-3',
        name: 'Cable Face Pulls',
        sets: 3,
        reps: '15',
        restSeconds: 60,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d2-4',
        name: 'EZ-Bar Bicep Curl',
        sets: 3,
        reps: '10 - 12',
        restSeconds: 60,
        targetRpe: 'RPE 9',
      },
    ],
  },
  {
    id: 'day-3',
    label: 'Day 3',
    focus: 'Lower Strength & Core Stability',
    durationMinutes: 55,
    exercises: [
      {
        id: 'ex-d3-1',
        name: 'Barbell Back Squat',
        sets: 4,
        reps: '6 - 8',
        restSeconds: 150,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d3-2',
        name: 'Dumbbell Romanian Deadlift',
        sets: 3,
        reps: '8 - 10',
        restSeconds: 120,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d3-3',
        name: 'Machine Leg Press',
        sets: 3,
        reps: '10 - 12',
        restSeconds: 90,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d3-4',
        name: 'Cable Pallof Press',
        sets: 3,
        reps: '12 / side',
        restSeconds: 60,
        targetRpe: 'RPE 8',
      },
    ],
  },
  {
    id: 'day-4',
    label: 'Day 4',
    focus: 'Metabolic Conditioning & Full Body',
    durationMinutes: 40,
    exercises: [
      {
        id: 'ex-d4-1',
        name: 'Sled Push Intervals',
        sets: 6,
        reps: '20 meters',
        restSeconds: 60,
        targetRpe: 'RPE 8.5',
      },
      {
        id: 'ex-d4-2',
        name: 'Kettlebell Swings',
        sets: 4,
        reps: '15',
        restSeconds: 60,
        targetRpe: 'RPE 8',
      },
      {
        id: 'ex-d4-3',
        name: 'Battle Ropes Waves',
        sets: 4,
        reps: '30 sec',
        restSeconds: 45,
        targetRpe: 'RPE 9',
      },
    ],
  },
];

export function getDefaultWorkoutDays(lang: Language): WorkoutDay[] {
  return lang === 'en' ? DEFAULT_WORKOUT_DAYS_EN : DEFAULT_WORKOUT_DAYS;
}

export const INITIAL_WEIGHT_CHECKINS: WeightCheckIn[] = [
  { week: 'الأسبوع 1', weightKg: 88.0, note: 'نقطة الانطلاق' },
  { week: 'الأسبوع 2', weightKg: 87.2, note: 'التزام 100% بالسعرات' },
  { week: 'الأسبوع 3', weightKg: 86.5, note: 'زيادة أوزان الدفع' },
  { week: 'الأسبوع 4', weightKg: 85.9, note: 'تحسن واضح في محيط الخصر' },
  { week: 'الأسبوع 5', weightKg: 85.1, note: 'ثبات الطاقة أثناء التمرين' },
];
