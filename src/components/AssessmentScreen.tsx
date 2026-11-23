import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Flame,
  MessageCircle,
  Scale,
  Sparkles,
} from 'lucide-react';
import { getCoachingTiers } from '../data/coachingData';
import {
  buildWhatsAppUrl,
  calculateNutritionPlan,
  formatPlanWhatsAppMessage,
  formatTierPricing,
  PERSONAL_WHATSAPP_NUMBER,
  validateAssessmentBiometrics,
  validateLeadForm,
  type ActivityLevel,
  type AthleteAssessmentInput,
  type BillingCycle,
  type Language,
  type NutritionPlanResult,
  type TierCode,
  type TrainingGoal,
  type TrainingLocation,
} from '../utils/coachingMath';

export interface EnrolledAthletePlan {
  athleteName: string;
  phone: string;
  email: string;
  selectedTier: TierCode;
  billingCycle: BillingCycle;
  assessment: AthleteAssessmentInput;
  nutrition: NutritionPlanResult;
  enrolledAtIso: string;
}

interface AssessmentScreenProps {
  lang: Language;
  initialGoal: TrainingGoal;
  initialTier: TierCode | null;
  billingCycle: BillingCycle;
  onChangeBillingCycle: (cycle: BillingCycle) => void;
  onBackToLanding: () => void;
  onCompleteEnrollment: (plan: EnrolledAthletePlan) => void;
  onOpenPortal: () => void;
}

export function AssessmentScreen({
  lang,
  initialGoal,
  initialTier,
  billingCycle,
  onChangeBillingCycle,
  onBackToLanding,
  onCompleteEnrollment,
  onOpenPortal,
}: AssessmentScreenProps) {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<string>('29');
  const [heightCm, setHeightCm] = useState<string>('178');
  const [currentWeightKg, setCurrentWeightKg] = useState<string>('88');
  const [targetWeightKg, setTargetWeightKg] = useState<string>('78');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<TrainingGoal>(initialGoal);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<number>(4);
  const [location, setLocation] = useState<TrainingLocation>('gym');

  const [manualTier, setManualTier] = useState<TierCode | null>(initialTier);

  const [athleteName, setAthleteName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [enrolledSuccess, setEnrolledSuccess] = useState<EnrolledAthletePlan | null>(null);

  const tiers = getCoachingTiers(lang);
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  const numericAssessment: AthleteAssessmentInput = useMemo(
    () => ({
      age: Number(age),
      heightCm: Number(heightCm),
      currentWeightKg: Number(currentWeightKg),
      targetWeightKg: Number(targetWeightKg),
      gender,
      activityLevel,
      goal,
      trainingDaysPerWeek,
      location,
    }),
    [age, heightCm, currentWeightKg, targetWeightKg, gender, activityLevel, goal, trainingDaysPerWeek, location]
  );

  const nutritionPlan = useMemo(
    () => calculateNutritionPlan(numericAssessment, lang),
    [numericAssessment, lang]
  );

  const activeTierCode = manualTier ?? nutritionPlan.recommendedTier;
  const activeTierObj = tiers.find((t) => t.code === activeTierCode) ?? tiers[1];
  const tierPricing = formatTierPricing(activeTierObj.monthlyPriceSar, billingCycle, lang);

  const t =
    lang === 'en'
      ? {
          back: 'Back to Home',
          title: 'Performance Assessment & Custom Plan Builder',
          subtitle:
            'Enter your biometrics and target to calculate calories, macros, and your recommended split in real time.',
          billingAria: 'Subscription cycle',
          monthly: 'Monthly',
          quarterly: 'Quarterly (-20%)',
          sec1: '1. Biometrics',
          genderLabel: 'Gender',
          male: 'Male',
          female: 'Female',
          ageLabel: 'Age (years)',
          heightLabel: 'Height (cm)',
          weightLabel: 'Current Weight (kg)',
          targetLabel: 'Target Weight (kg)',
          activityLabel: 'Daily Activity Level',
          actSedentary: 'Sedentary (under 4,000 steps)',
          actModerate: 'Moderately Active (6,000–8,000 steps)',
          actActive: 'Active (9,000+ steps/day)',
          actAthlete: 'High Daily Physical Output',
          sec2: '2. Goal & Weekly Schedule',
          goalFatLoss: 'Fat Loss & Shred',
          goalFatLossSub: 'Calibrated deficit + lean retention',
          goalMuscle: 'Lean Muscle Gain',
          goalMuscleSub: 'Controlled surplus + overload',
          goalRecomp: 'Athletic Recomposition',
          goalRecompSub: 'Body comp + conditioning',
          daysLabel: 'Available Training Days / Week',
          daysSuffix: 'days',
          locLabel: 'Training Environment',
          locGym: 'Commercial Gym',
          locHome: 'Home Setup',
          sec3: '3. Selected Coaching Tier',
          smartRec: 'Recommended for your profile:',
          currency: 'SAR',
          outputKicker: 'Live Calculated Outputs',
          outputTitle: 'Your Nutrition & Training Blueprint',
          calLabel: 'Daily Target Calories',
          calUnit: 'kcal / day',
          bmrLabel: 'Basal Metabolic Rate (BMR)',
          tdeeLabel: 'Total Daily Burn (TDEE)',
          kcalShort: 'kcal',
          protein: 'Protein',
          carbs: 'Carbs',
          fats: 'Healthy Fats',
          gram: 'g',
          timelineLabel: 'Estimated Timeline',
          weeksLabel: 'weeks',
          kgPerWeek: 'kg/wk',
          splitLabel: 'Recommended Split',
          enrolledTitle: 'Your training profile is active!',
          enrolledDesc1: 'Welcome,',
          enrolledDesc2: 'Your targets have been saved',
          enrolledDesc3: 'on tier',
          enrolledCheck1: 'Your Client Portal & workout log are now unlocked',
          enrolledCheck2: 'Coach Tariq will review your profile within 24 hours',
          sendWaBtn: 'Send My Plan Details via WhatsApp',
          openPortalBtn: 'Enter Client Portal Now',
          enrollTitle: 'Confirm & Save Your Plan',
          perMonth: 'SAR/mo',
          enrollSub: 'Your numbers will sync directly with the Client Portal.',
          nameLabel: 'Full Name',
          namePlaceholder: 'Your full name',
          phoneLabel: 'WhatsApp Number',
          emailLabel: 'Email Address',
          submitBtn: 'Save My Plan & Activate Portal',
        }
      : {
          back: 'العودة إلى الرئيسية',
          title: 'تقييم الأداء وبناء خطتك المخصصة',
          subtitle:
            'أدخل قياساتك وحدد هدفك ليقوم المحرك بحساب السعرات والماكروز وتوزيع التدريب فوراً.',
          billingAria: 'دورة الاشتراك',
          monthly: 'شهري',
          quarterly: 'ربع سنوي (-20%)',
          sec1: '1. البيانات الجسدية',
          genderLabel: 'الجنس',
          male: 'ذكر',
          female: 'أنثى',
          ageLabel: 'العمر (سنة)',
          heightLabel: 'الطول (سم)',
          weightLabel: 'الوزن الحالي (كجم)',
          targetLabel: 'الوزن المستهدف (كجم)',
          activityLabel: 'معدل النشاط اليومي',
          actSedentary: 'مكتبي قليل الحركة (أقل من 4,000 خطوة)',
          actModerate: 'متوسط الحركة (6,000 - 8,000 خطوة)',
          actActive: 'نشيط (9,000+ خطوة يومياً)',
          actAthlete: 'مجهود بدني عالٍ يومياً',
          sec2: '2. الهدف التدريبي والجدول',
          goalFatLoss: 'التنشيف وحرق الدهون',
          goalFatLossSub: 'عجز حراري ذكي + حفظ العضل',
          goalMuscle: 'البناء العضلي الصافي',
          goalMuscleSub: 'فائض محسوب + أحمال تصاعدية',
          goalRecomp: 'إعادة التشكيل والأداء',
          goalRecompSub: 'تحسين التكوين واللياقة',
          daysLabel: 'أيام التمرين المتاحة أسبوعياً',
          daysSuffix: 'أيام',
          locLabel: 'بيئة التدريب',
          locGym: 'نادٍ رياضي متكامل',
          locHome: 'تدريب منزلي',
          sec3: '3. الباقة المختارة',
          smartRec: 'الترشيح الذكي لبياناتك:',
          currency: 'ر.س',
          outputKicker: 'المخرجات المحسوبة لحظياً',
          outputTitle: 'خريطتك الغذائية والتدريبية',
          calLabel: 'السعرات اليومية المستهدفة',
          calUnit: 'سعرة / يوم',
          bmrLabel: 'الحرق الأساسي BMR',
          tdeeLabel: 'الحرق الكلي TDEE',
          kcalShort: 'سعرة',
          protein: 'البروتين',
          carbs: 'الكربوهيدرات',
          fats: 'الدهون الصحية',
          gram: 'جم',
          timelineLabel: 'المدة المتوقعة للهدف',
          weeksLabel: 'أسبوعاً',
          kgPerWeek: 'كجم/أسبوع',
          splitLabel: 'الجدول المقترح',
          enrolledTitle: 'تم تفعيل ملفك التدريبي بنجاح!',
          enrolledDesc1: 'أهلاً بك يا',
          enrolledDesc2: 'تم حفظ أهدافك',
          enrolledDesc3: 'على باقة',
          enrolledCheck1: 'تم فتح بوابة المتدرب الخاصة بك وجدول التمارين فوراً',
          enrolledCheck2: 'سيراجع الكابتن طارق ملفك ويتواصل معك خلال 24 ساعة',
          sendWaBtn: 'إرسال تفاصيل خطتي على واتساب',
          openPortalBtn: 'الدخول إلى بوابة المتدرب الآن',
          enrollTitle: 'تأكيد الاشتراك وحفظ الخطة',
          perMonth: 'ر.س/شهر',
          enrollSub: 'سيتم ربط أرقامك ببوابة المتدرب مباشرة.',
          nameLabel: 'الاسم الكامل',
          namePlaceholder: 'الاسم الثلاثي',
          phoneLabel: 'رقم الواتساب',
          emailLabel: 'البريد الإلكتروني',
          submitBtn: 'حفظ خطتي وتفعيل بوابة المتدرب',
        };

  const handleEnrollSubmit = (e: FormEvent) => {
    e.preventDefault();
    const bioErrors = validateAssessmentBiometrics(numericAssessment, lang);
    const contactErrors = validateLeadForm({ name: athleteName, phone, email }, lang);
    const mergedErrors = { ...bioErrors, ...contactErrors };
    setFormErrors(mergedErrors);

    if (Object.keys(mergedErrors).length > 0) {
      return;
    }

    const plan: EnrolledAthletePlan = {
      athleteName: athleteName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      selectedTier: activeTierCode,
      billingCycle,
      assessment: numericAssessment,
      nutrition: nutritionPlan,
      enrolledAtIso: new Date().toISOString(),
    };

    onCompleteEnrollment(plan);
    setEnrolledSuccess(plan);
  };

  return (
    <main className="min-h-screen bg-[#0f131c] py-10 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#94A3B8] hover:text-[#E2F124] cursor-pointer mb-3"
            >
              <BackArrow className="w-4 h-4" aria-hidden="true" />
              <span>{t.back}</span>
            </button>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{t.title}</h1>
            <p className="text-sm sm:text-base text-[#CBD5E1] mt-2">{t.subtitle}</p>
          </div>

          <div
            role="group"
            aria-label={t.billingAria}
            className="inline-flex items-center gap-1.5 p-1.5 rounded-xl bg-[#161B26] border border-white/10"
          >
            <button
              type="button"
              onClick={() => onChangeBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.monthly}
            </button>
            <button
              type="button"
              onClick={() => onChangeBillingCycle('quarterly')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer ${
                billingCycle === 'quarterly'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.quarterly}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 glass-card rounded-2xl p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">{t.sec1}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.genderLabel}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`py-2.5 rounded-lg text-sm font-bold border cursor-pointer transition-colors ${
                        gender === 'male'
                          ? 'bg-[#E2F124] text-[#12161F] border-[#E2F124]'
                          : 'bg-[#12161F] text-[#CBD5E1] border-white/15 hover:border-white/30'
                      }`}
                    >
                      {t.male}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`py-2.5 rounded-lg text-sm font-bold border cursor-pointer transition-colors ${
                        gender === 'female'
                          ? 'bg-[#E2F124] text-[#12161F] border-[#E2F124]'
                          : 'bg-[#12161F] text-[#CBD5E1] border-white/15 hover:border-white/30'
                      }`}
                    >
                      {t.female}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="bio-age" className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.ageLabel}
                  </label>
                  <input
                    id="bio-age"
                    type="number"
                    min={16}
                    max={75}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white text-start tabular-metric focus:outline-none focus:border-[#E2F124]"
                  />
                  {formErrors.age && <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.age}</p>}
                </div>

                <div>
                  <label htmlFor="bio-height" className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.heightLabel}
                  </label>
                  <input
                    id="bio-height"
                    type="number"
                    min={130}
                    max={225}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white text-start tabular-metric focus:outline-none focus:border-[#E2F124]"
                  />
                  {formErrors.heightCm && (
                    <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.heightCm}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="bio-weight" className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.weightLabel}
                  </label>
                  <input
                    id="bio-weight"
                    type="number"
                    min={40}
                    max={220}
                    step="0.5"
                    value={currentWeightKg}
                    onChange={(e) => setCurrentWeightKg(e.target.value)}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white text-start tabular-metric focus:outline-none focus:border-[#E2F124]"
                  />
                  {formErrors.currentWeightKg && (
                    <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.currentWeightKg}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="bio-target" className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.targetLabel}
                  </label>
                  <input
                    id="bio-target"
                    type="number"
                    min={40}
                    max={220}
                    step="0.5"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value)}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white text-start tabular-metric focus:outline-none focus:border-[#E2F124]"
                  />
                  {formErrors.targetWeightKg && (
                    <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.targetWeightKg}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="bio-activity" className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.activityLabel}
                  </label>
                  <select
                    id="bio-activity"
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                  >
                    <option value="sedentary">{t.actSedentary}</option>
                    <option value="moderate">{t.actModerate}</option>
                    <option value="active">{t.actActive}</option>
                    <option value="athlete">{t.actAthlete}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">{t.sec2}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setGoal('fat_loss')}
                  className={`p-4 rounded-xl border text-start cursor-pointer transition-colors ${
                    goal === 'fat_loss'
                      ? 'bg-[#E2F124]/15 border-[#E2F124] text-white'
                      : 'bg-[#12161F] border-white/10 text-[#CBD5E1] hover:border-white/25'
                  }`}
                >
                  <span className="block font-bold text-sm mb-1">{t.goalFatLoss}</span>
                  <span className="block text-xs text-[#94A3B8]">{t.goalFatLossSub}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoal('muscle_gain')}
                  className={`p-4 rounded-xl border text-start cursor-pointer transition-colors ${
                    goal === 'muscle_gain'
                      ? 'bg-[#E2F124]/15 border-[#E2F124] text-white'
                      : 'bg-[#12161F] border-white/10 text-[#CBD5E1] hover:border-white/25'
                  }`}
                >
                  <span className="block font-bold text-sm mb-1">{t.goalMuscle}</span>
                  <span className="block text-xs text-[#94A3B8]">{t.goalMuscleSub}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoal('athletic_recomp')}
                  className={`p-4 rounded-xl border text-start cursor-pointer transition-colors ${
                    goal === 'athletic_recomp'
                      ? 'bg-[#E2F124]/15 border-[#E2F124] text-white'
                      : 'bg-[#12161F] border-white/10 text-[#CBD5E1] hover:border-white/25'
                  }`}
                >
                  <span className="block font-bold text-sm mb-1">{t.goalRecomp}</span>
                  <span className="block text-xs text-[#94A3B8]">{t.goalRecompSub}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.daysLabel}
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setTrainingDaysPerWeek(days)}
                        className={`py-2.5 rounded-lg text-sm font-bold tabular-metric border cursor-pointer ${
                          trainingDaysPerWeek === days
                            ? 'bg-[#E2F124] text-[#12161F] border-[#E2F124]'
                            : 'bg-[#12161F] text-[#CBD5E1] border-white/15'
                        }`}
                      >
                        {days} {t.daysSuffix}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                    {t.locLabel}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocation('gym')}
                      className={`py-2.5 rounded-lg text-sm font-bold border cursor-pointer ${
                        location === 'gym'
                          ? 'bg-[#E2F124] text-[#12161F] border-[#E2F124]'
                          : 'bg-[#12161F] text-[#CBD5E1] border-white/15'
                      }`}
                    >
                      {t.locGym}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation('home')}
                      className={`py-2.5 rounded-lg text-sm font-bold border cursor-pointer ${
                        location === 'home'
                          ? 'bg-[#E2F124] text-[#12161F] border-[#E2F124]'
                          : 'bg-[#12161F] text-[#CBD5E1] border-white/15'
                      }`}
                    >
                      {t.locHome}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-xl font-bold text-white">{t.sec3}</h2>
                <span className="text-xs text-[#E2F124]">
                  {t.smartRec} {nutritionPlan.recommendedTier}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tiers.map((tier) => {
                  const p = formatTierPricing(tier.monthlyPriceSar, billingCycle, lang);
                  const isActive = activeTierCode === tier.code;
                  return (
                    <button
                      key={tier.code}
                      type="button"
                      onClick={() => setManualTier(tier.code)}
                      className={`p-4 rounded-xl border text-start cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[#E2F124]/15 border-[#E2F124]'
                          : 'bg-[#12161F] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-oswald-accent text-sm font-bold text-[#E2F124]">
                          {tier.code}
                        </span>
                        <span className="tabular-metric text-base font-bold text-white">
                          {p.activePrice} {t.currency}
                        </span>
                      </div>
                      <span className="block text-xs text-[#CBD5E1]">{tier.arabicName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card-featured rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs font-semibold text-[#E2F124] mb-1">{t.outputKicker}</p>
                  <h2 className="text-2xl font-bold text-white">{t.outputTitle}</h2>
                </div>
                <Flame className="w-7 h-7 text-[#E2F124]" aria-hidden="true" />
              </div>

              <div className="rounded-xl bg-[#12161F] border border-white/10 p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="block text-xs text-[#94A3B8] mb-1">{t.calLabel}</span>
                  <span
                    data-testid="calculated-calories"
                    className="tabular-metric text-4xl font-bold text-[#E2F124]"
                  >
                    {nutritionPlan.targetCalories}
                  </span>
                  <span className="text-sm text-[#CBD5E1] ms-2">{t.calUnit}</span>
                </div>
                <div className="text-start sm:text-end shrink-0">
                  <span className="block text-xs text-[#94A3B8]">{t.bmrLabel}</span>
                  <span className="tabular-metric text-sm font-bold text-white whitespace-nowrap">
                    {nutritionPlan.bmr} {t.kcalShort}
                  </span>
                  <span className="block text-xs text-[#94A3B8] mt-1.5">{t.tdeeLabel}</span>
                  <span className="tabular-metric text-sm font-bold text-white whitespace-nowrap">
                    {nutritionPlan.tdee} {t.kcalShort}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl bg-[#12161F] border border-white/10 p-3.5 text-center">
                  <span className="block text-xs text-[#94A3B8] mb-1">{t.protein}</span>
                  <span
                    data-testid="calculated-protein"
                    className="tabular-metric text-xl font-bold text-white"
                  >
                    {nutritionPlan.proteinGrams} {t.gram}
                  </span>
                </div>
                <div className="rounded-xl bg-[#12161F] border border-white/10 p-3.5 text-center">
                  <span className="block text-xs text-[#94A3B8] mb-1">{t.carbs}</span>
                  <span className="tabular-metric text-xl font-bold text-white">
                    {nutritionPlan.carbsGrams} {t.gram}
                  </span>
                </div>
                <div className="rounded-xl bg-[#12161F] border border-white/10 p-3.5 text-center">
                  <span className="block text-xs text-[#94A3B8] mb-1">{t.fats}</span>
                  <span className="tabular-metric text-xl font-bold text-white">
                    {nutritionPlan.fatsGrams} {t.gram}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#94A3B8] flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                    {t.timelineLabel}
                  </span>
                  <span className="tabular-metric font-bold text-white">
                    {nutritionPlan.estimatedWeeks} {t.weeksLabel} ({nutritionPlan.weeklyRateKg}{' '}
                    {t.kgPerWeek})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#94A3B8] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                    {t.splitLabel}
                  </span>
                  <span className="font-bold text-white">{nutritionPlan.splitTitle}</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8">
              {enrolledSuccess ? (
                <div role="status" className="space-y-4">
                  <div className="flex items-center gap-2.5 text-[#E2F124] font-bold text-xl">
                    <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <span>{t.enrolledTitle}</span>
                  </div>
                  <p className="text-sm text-[#CBD5E1] leading-relaxed">
                    {t.enrolledDesc1} {enrolledSuccess.athleteName}. {t.enrolledDesc2} (
                    {enrolledSuccess.nutrition.targetCalories} {t.calUnit},{' '}
                    {enrolledSuccess.nutrition.proteinGrams} {t.gram}) {t.enrolledDesc3}{' '}
                    <span className="font-oswald-accent text-[#E2F124]">
                      {enrolledSuccess.selectedTier}
                    </span>
                    .
                  </p>
                  <ul className="space-y-2 text-xs text-[#CBD5E1] py-2 border-y border-white/10">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                      <span>{t.enrolledCheck1}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                      <span>{t.enrolledCheck2}</span>
                    </li>
                  </ul>
                  <div className="space-y-2.5">
                    <a
                      href={buildWhatsAppUrl(
                        formatPlanWhatsAppMessage(
                          {
                            athleteName: enrolledSuccess.athleteName,
                            phone: enrolledSuccess.phone,
                            email: enrolledSuccess.email,
                            selectedTier: enrolledSuccess.selectedTier,
                            targetCalories: enrolledSuccess.nutrition.targetCalories,
                            proteinGrams: enrolledSuccess.nutrition.proteinGrams,
                            splitTitle: enrolledSuccess.nutrition.splitTitle,
                          },
                          lang
                        ),
                        PERSONAL_WHATSAPP_NUMBER
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-sm font-bold cursor-pointer btn-kinetic-primary"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{t.sendWaBtn}</span>
                    </a>
                    <button
                      type="button"
                      onClick={onOpenPortal}
                      className="w-full rounded-lg px-6 py-3 text-sm font-bold cursor-pointer btn-kinetic-ghost"
                    >
                      {t.openPortalBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnrollSubmit} noValidate className="space-y-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{t.enrollTitle}</h3>
                    <span className="tabular-metric text-sm font-bold text-[#E2F124]">
                      {tierPricing.activePrice} {t.perMonth}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mb-3">
                    {activeTierObj.arabicName} ({activeTierCode}) · {t.enrollSub}
                  </p>

                  <div>
                    <label htmlFor="enroll-name" className="block text-sm font-semibold text-white mb-1">
                      {t.nameLabel}
                    </label>
                    <input
                      id="enroll-name"
                      type="text"
                      value={athleteName}
                      onChange={(e) => setAthleteName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/60 text-start focus:outline-none focus:border-[#E2F124]"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="enroll-phone" className="block text-sm font-semibold text-white mb-1">
                      {t.phoneLabel}
                    </label>
                    <input
                      id="enroll-phone"
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966 50 123 4567"
                      className={`w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/60 ${
                        lang === 'ar' ? 'text-right' : 'text-left'
                      } focus:outline-none focus:border-[#E2F124]`}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="enroll-email" className="block text-sm font-semibold text-white mb-1">
                      {t.emailLabel}
                    </label>
                    <input
                      id="enroll-email"
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="athlete@example.com"
                      className={`w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/60 ${
                        lang === 'ar' ? 'text-right' : 'text-left'
                      } focus:outline-none focus:border-[#E2F124]`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-[#ffb4ab]">{formErrors.email}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg px-6 py-3.5 text-sm font-bold cursor-pointer btn-kinetic-primary"
                  >
                    {t.submitBtn}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
