import { useEffect, useState } from 'react';
import { Navbar, type AppScreen } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProgramsSection } from './components/ProgramsSection';
import { TransformationsSection } from './components/TransformationsSection';
import { CoachSection } from './components/CoachSection';
import { PricingSection } from './components/PricingSection';
import { FaqAndContactSection } from './components/FaqAndContactSection';
import { Footer } from './components/Footer';
import { AssessmentScreen, type EnrolledAthletePlan } from './components/AssessmentScreen';
import { ClientPortalScreen } from './components/ClientPortalScreen';
import { DemoNoticeBanner } from './components/DemoNoticeBanner';
import { INITIAL_WEIGHT_CHECKINS, type WeightCheckIn } from './data/coachingData';
import type { BillingCycle, Language, TierCode, TrainingGoal } from './utils/coachingMath';

const STORAGE_LANG_KEY = 'kinetic_slate_language_v1';
const STORAGE_PLAN_KEY = 'kinetic_slate_enrolled_plan_v1';
const STORAGE_EXERCISES_KEY = 'kinetic_slate_completed_exercises_v1';
const STORAGE_WEIGHTS_KEY = 'kinetic_slate_weight_checkins_v1';

function readInitialScreen(): AppScreen {
  if (typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  const screenParam = params.get('screen');
  if (screenParam === 'assessment' || screenParam === 'portal') {
    return screenParam;
  }
  if (params.get('autostart') === '1') {
    return 'portal';
  }
  return 'landing';
}

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ar';
  try {
    const saved = localStorage.getItem(STORAGE_LANG_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // Ignore storage errors
  }
  return 'ar';
}

export default function App() {
  const [lang, setLang] = useState<Language>(readInitialLanguage);
  const [activeScreen, setActiveScreen] = useState<AppScreen>(readInitialScreen);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('quarterly');
  const [assessmentGoal, setAssessmentGoal] = useState<TrainingGoal>('fat_loss');
  const [assessmentTier, setAssessmentTier] = useState<TierCode | null>(null);

  const [enrolledPlan, setEnrolledPlan] = useState<EnrolledAthletePlan | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PLAN_KEY);
      return raw ? (JSON.parse(raw) as EnrolledAthletePlan) : null;
    } catch {
      return null;
    }
  });

  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_EXERCISES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : ['ex-d1-1', 'ex-d1-2'];
    } catch {
      return ['ex-d1-1', 'ex-d1-2'];
    }
  });

  const [weightCheckIns, setWeightCheckIns] = useState<WeightCheckIn[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_WEIGHTS_KEY);
      return raw ? (JSON.parse(raw) as WeightCheckIn[]) : INITIAL_WEIGHT_CHECKINS;
    } catch {
      return INITIAL_WEIGHT_CHECKINS;
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title =
      lang === 'en'
        ? 'Kinetic Peak | Athletic Coaching & Performance Platform'
        : 'ذروة كينتك | منصة التدريب الرياضي والأداء البدني';
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, [lang]);

  useEffect(() => {
    try {
      if (enrolledPlan) {
        localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(enrolledPlan));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [enrolledPlan]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EXERCISES_KEY, JSON.stringify(completedExerciseIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [completedExerciseIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WEIGHTS_KEY, JSON.stringify(weightCheckIns));
    } catch {
      // Ignore storage quota errors
    }
  }, [weightCheckIns]);

  const handleToggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const handleNavigateScreen = (screen: AppScreen, sectionId?: string) => {
    setActiveScreen(screen);
    if (screen === 'landing' && sectionId) {
      setTimeout(() => {
        const target = document.getElementById(sectionId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleExercise = (exerciseId: string) => {
    setCompletedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleResetExercises = () => {
    setCompletedExerciseIds([]);
  };

  const handleAddWeightCheckIn = (entry: WeightCheckIn) => {
    setWeightCheckIns((prev) => [...prev, entry]);
  };

  const handleCompleteEnrollment = (plan: EnrolledAthletePlan) => {
    setEnrolledPlan(plan);
    setWeightCheckIns([
      {
        week: lang === 'en' ? 'Week 1' : 'الأسبوع 1',
        weightKg: plan.assessment.currentWeightKg,
        note: lang === 'en' ? 'Starting baseline weight' : 'وزن البداية المسجل',
      },
    ]);
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-[#0f131c] text-[#dfe2ef]">
      <Navbar
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
        activeScreen={activeScreen}
        onNavigateScreen={handleNavigateScreen}
      />

      {activeScreen === 'landing' && (
        <main className="flex-1">
          <HeroSection
            lang={lang}
            onStartAssessment={() => handleNavigateScreen('assessment')}
            onExplorePrograms={() => handleNavigateScreen('landing', 'programs')}
          />
          <ProgramsSection
            lang={lang}
            onSelectGoalForAssessment={(goal) => {
              setAssessmentGoal(goal);
              setAssessmentTier(null);
              handleNavigateScreen('assessment');
            }}
          />
          <TransformationsSection lang={lang} />
          <CoachSection lang={lang} onOpenPortalPreview={() => handleNavigateScreen('portal')} />
          <PricingSection
            lang={lang}
            billingCycle={billingCycle}
            onChangeBillingCycle={setBillingCycle}
            onSelectTier={(tier) => {
              setAssessmentTier(tier);
              handleNavigateScreen('assessment');
            }}
          />
          <FaqAndContactSection lang={lang} />
        </main>
      )}

      {activeScreen === 'assessment' && (
        <AssessmentScreen
          lang={lang}
          initialGoal={assessmentGoal}
          initialTier={assessmentTier}
          billingCycle={billingCycle}
          onChangeBillingCycle={setBillingCycle}
          onBackToLanding={() => handleNavigateScreen('landing')}
          onCompleteEnrollment={handleCompleteEnrollment}
          onOpenPortal={() => handleNavigateScreen('portal')}
        />
      )}

      {activeScreen === 'portal' && (
        <ClientPortalScreen
          lang={lang}
          enrolledPlan={enrolledPlan}
          completedExerciseIds={completedExerciseIds}
          onToggleExercise={handleToggleExercise}
          onResetExercises={handleResetExercises}
          weightCheckIns={weightCheckIns}
          onAddWeightCheckIn={handleAddWeightCheckIn}
          onEditAssessment={() => handleNavigateScreen('assessment')}
        />
      )}

      <Footer lang={lang} onNavigateScreen={handleNavigateScreen} />
      <DemoNoticeBanner lang={lang} />
    </div>
  );
}
