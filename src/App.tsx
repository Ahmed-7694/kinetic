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
import { PortalLoginScreen, type PortalSession } from './components/PortalLoginScreen';
import { DemoNoticeBanner } from './components/DemoNoticeBanner';
import { AdminAuthModal, type AdminSession } from './components/AdminAuthModal';
import { AdminCmsScreen } from './components/AdminCmsScreen';
import { INITIAL_WEIGHT_CHECKINS, type WeightCheckIn } from './data/coachingData';
import type { BillingCycle, Language, TierCode, TrainingGoal } from './utils/coachingMath';
import {
  getDefaultSiteContentBundle,
  mergeSiteContentBundle,
  type PortalAccountPublic,
  type SiteContentBundle,
} from './utils/cmsSchema';
import type { PortalWeeklyGoal } from './utils/portalPlanning';

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

  const [cmsBundle, setCmsBundle] = useState<SiteContentBundle>(getDefaultSiteContentBundle);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [portalSession, setPortalSession] = useState<PortalSession | null>(null);

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
    let cancelled = false;
    fetch('/api/cms')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { overrides?: unknown } | null) => {
        if (!cancelled && data && data.overrides) {
          setCmsBundle(mergeSiteContentBundle(data.overrides));
        }
      })
      .catch(() => {
        // Fallback smoothly to built-in defaults
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (screen === 'admin' && !adminSession) {
      setAdminModalOpen(true);
      return;
    }
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

  const handleOpenAdminAccess = () => {
    if (adminSession) {
      setActiveScreen('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAdminModalOpen(true);
    }
  };

  const handleAdminAuthenticated = (session: AdminSession) => {
    setAdminSession(session);
    setAdminModalOpen(false);
    setActiveScreen('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCmsContent = async (
    updated: SiteContentBundle
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!adminSession) {
      setAdminModalOpen(true);
      return { ok: false, error: 'Session expired' };
    }
    try {
      const response = await fetch('/api/cms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.token}`,
        },
        body: JSON.stringify({ content: updated }),
      });
      if (response.status === 401) {
        setAdminSession(null);
        setAdminModalOpen(true);
        return { ok: false };
      }
      if (!response.ok) {
        return { ok: false };
      }
      setCmsBundle(mergeSiteContentBundle(updated));
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  const handleResetCmsContent = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!adminSession) {
      setAdminModalOpen(true);
      return { ok: false };
    }
    try {
      const response = await fetch('/api/cms/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`,
        },
      });
      if (response.status === 401) {
        setAdminSession(null);
        setAdminModalOpen(true);
        return { ok: false };
      }
      if (!response.ok) {
        return { ok: false };
      }
      setCmsBundle(getDefaultSiteContentBundle());
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  const handleAdminSignOut = () => {
    setAdminSession(null);
    setActiveScreen('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const syncPortalProgressToServer = async (
    nextExercises: string[],
    nextGoals?: PortalWeeklyGoal[]
  ) => {
    if (!portalSession) return;
    try {
      const response = await fetch('/api/portal/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${portalSession.token}`,
        },
        body: JSON.stringify({
          completedExerciseIds: nextExercises,
          ...(nextGoals ? { weeklyGoals: nextGoals } : {}),
        }),
      });
      if (response.status === 401) {
        setPortalSession(null);
        return;
      }
      if (response.ok) {
        const data = (await response.json()) as { account?: PortalAccountPublic };
        if (data.account) {
          setPortalSession((prev) => (prev ? { ...prev, account: data.account! } : prev));
        }
      }
    } catch {
      // Keep local view state responsive
    }
  };

  const handlePortalAuthenticated = (session: PortalSession) => {
    setPortalSession(session);
    setCompletedExerciseIds(session.account.completedExerciseIds ?? []);
    setWeightCheckIns(
      session.account.weightCheckIns && session.account.weightCheckIns.length > 0
        ? session.account.weightCheckIns
        : INITIAL_WEIGHT_CHECKINS
    );
    setActiveScreen('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePortalSignOut = () => {
    setPortalSession(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleExercise = (exerciseId: string) => {
    const nextExercises = completedExerciseIds.includes(exerciseId)
      ? completedExerciseIds.filter((id) => id !== exerciseId)
      : [...completedExerciseIds, exerciseId];
    setCompletedExerciseIds(nextExercises);
    void syncPortalProgressToServer(nextExercises);
  };

  const handleResetExercises = () => {
    setCompletedExerciseIds([]);
    void syncPortalProgressToServer([]);
  };

  const handleUpdateWeeklyGoals = (goals: PortalWeeklyGoal[]) => {
    setPortalSession((prev) =>
      prev ? { ...prev, account: { ...prev.account, weeklyGoals: goals } } : prev
    );
    void syncPortalProgressToServer(completedExerciseIds, goals);
  };

  const handleAddWeekRecord = async (payload: {
    startDateIso?: string;
    weightKg: number;
    adherencePct: number;
    goalsSummary?: string;
    athleteNotes?: string;
  }): Promise<{ evictedWeekNumbers?: number[] } | null> => {
    if (!portalSession) return null;
    try {
      const response = await fetch('/api/portal/weeks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${portalSession.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        setPortalSession(null);
        return null;
      }
      if (!response.ok) return null;
      const data = (await response.json()) as {
        account?: PortalAccountPublic;
        evictedWeekNumbers?: number[];
      };
      if (data.account) {
        setPortalSession((prev) => (prev ? { ...prev, account: data.account! } : prev));
        if (data.account.weightCheckIns.length > 0) {
          setWeightCheckIns(data.account.weightCheckIns);
        }
      }
      return { evictedWeekNumbers: data.evictedWeekNumbers };
    } catch {
      return null;
    }
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

  const localeContent = cmsBundle[lang];

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-[#0f131c] text-[#dfe2ef]">
      <Navbar
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
        activeScreen={activeScreen}
        isAdminAuthenticated={Boolean(adminSession)}
        onNavigateScreen={handleNavigateScreen}
        onOpenAdminAccess={handleOpenAdminAccess}
      />

      {activeScreen === 'landing' && (
        <main className="flex-1">
          <HeroSection
            lang={lang}
            content={localeContent.hero}
            onStartAssessment={() => handleNavigateScreen('assessment')}
            onExplorePrograms={() => handleNavigateScreen('landing', 'programs')}
          />
          <ProgramsSection
            lang={lang}
            tracks={localeContent.programs}
            onSelectGoalForAssessment={(goal) => {
              setAssessmentGoal(goal);
              setAssessmentTier(null);
              handleNavigateScreen('assessment');
            }}
          />
          <TransformationsSection lang={lang} cases={localeContent.transformations} />
          <CoachSection
            lang={lang}
            profile={localeContent.coach}
            onOpenPortalPreview={() => handleNavigateScreen('portal')}
          />
          <PricingSection
            lang={lang}
            tiers={localeContent.tiers}
            billingCycle={billingCycle}
            onChangeBillingCycle={setBillingCycle}
            onSelectTier={(tier) => {
              setAssessmentTier(tier);
              handleNavigateScreen('assessment');
            }}
          />
          <FaqAndContactSection
            lang={lang}
            faqs={localeContent.faqs}
            whatsappNumber={cmsBundle.whatsappNumber}
          />
        </main>
      )}

      {activeScreen === 'assessment' && (
        <AssessmentScreen
          lang={lang}
          tiers={localeContent.tiers}
          whatsappNumber={cmsBundle.whatsappNumber}
          initialGoal={assessmentGoal}
          initialTier={assessmentTier}
          billingCycle={billingCycle}
          onChangeBillingCycle={setBillingCycle}
          onBackToLanding={() => handleNavigateScreen('landing')}
          onCompleteEnrollment={handleCompleteEnrollment}
          onOpenPortal={() => handleNavigateScreen('portal')}
        />
      )}

      {activeScreen === 'portal' && !portalSession && (
        <PortalLoginScreen
          lang={lang}
          onAuthenticated={handlePortalAuthenticated}
          onBackToLanding={() => handleNavigateScreen('landing')}
          onOpenAdminAccess={handleOpenAdminAccess}
        />
      )}

      {activeScreen === 'portal' && portalSession && (
        <ClientPortalScreen
          lang={lang}
          portalToken={portalSession.token}
          portalAccount={portalSession.account}
          enrolledPlan={enrolledPlan}
          completedExerciseIds={completedExerciseIds}
          onToggleExercise={handleToggleExercise}
          onResetExercises={handleResetExercises}
          onUpdateWeeklyGoals={handleUpdateWeeklyGoals}
          onAddWeekRecord={handleAddWeekRecord}
          onEditAssessment={() => handleNavigateScreen('assessment')}
          onSignOut={handlePortalSignOut}
        />
      )}

      {activeScreen === 'admin' && adminSession && (
        <AdminCmsScreen
          lang={lang}
          adminUsername={adminSession.username}
          adminToken={adminSession.token}
          contentBundle={cmsBundle}
          onSaveContent={handleSaveCmsContent}
          onResetContent={handleResetCmsContent}
          onBackToSite={() => handleNavigateScreen('landing')}
          onSignOut={handleAdminSignOut}
          onSessionExpired={() => {
            setAdminSession(null);
            setAdminModalOpen(true);
          }}
        />
      )}

      <Footer
        lang={lang}
        onNavigateScreen={handleNavigateScreen}
        onOpenAdminAccess={handleOpenAdminAccess}
      />
      <DemoNoticeBanner lang={lang} />
      <AdminAuthModal
        lang={lang}
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onAuthenticated={handleAdminAuthenticated}
      />
    </div>
  );
}

