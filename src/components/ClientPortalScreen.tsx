import { useState, type FormEvent } from 'react';
import {
  Calendar,
  Check,
  Download,
  Droplets,
  Dumbbell,
  FileSpreadsheet,
  FileText,
  Flame,
  Footprints,
  LogOut,
  MessageSquare,
  Moon,
  Pill,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Target,
  Utensils,
} from 'lucide-react';
import { calculateWorkoutCompletion, type Language } from '../utils/coachingMath';
import type { PortalAccountPublic } from '../utils/cmsSchema';
import {
  buildSanitizedPortalExport,
  formatCoachingReportTxt,
  formatPortalWeeksCsv,
  MAX_PORTAL_WEEKS,
  type PortalChatMessage,
  type PortalWeeklyGoal,
} from '../utils/portalPlanning';
import { downloadJsonFile, downloadTextFile } from '../utils/downloadFile';
import type { EnrolledAthletePlan } from './AssessmentScreen';
import { PortalChatPanel } from './PortalChatPanel';

type PortalTabId = 'overview' | 'workouts' | 'history16' | 'chat' | 'downloads';

interface ClientPortalScreenProps {
  lang: Language;
  portalToken: string;
  portalAccount: PortalAccountPublic;
  enrolledPlan: EnrolledAthletePlan | null;
  completedExerciseIds: string[];
  onToggleExercise: (exerciseId: string) => void;
  onResetExercises: () => void;
  onUpdateWeeklyGoals: (goals: PortalWeeklyGoal[]) => void;
  onAddWeekRecord: (payload: {
    startDateIso?: string;
    weightKg: number;
    adherencePct: number;
    goalsSummary?: string;
    athleteNotes?: string;
  }) => Promise<{ evictedWeekNumbers?: number[] } | null>;
  onEditAssessment: () => void;
  onSignOut: () => void;
}

export function ClientPortalScreen({
  lang,
  portalToken,
  portalAccount,
  completedExerciseIds,
  onToggleExercise,
  onResetExercises,
  onUpdateWeeklyGoals,
  onAddWeekRecord,
  onEditAssessment,
  onSignOut,
}: ClientPortalScreenProps) {
  const [activeTab, setActiveTab] = useState<PortalTabId>('overview');
  const workoutDays = portalAccount.workoutDays;
  const [selectedDayId, setSelectedDayId] = useState<string>(workoutDays[0]?.id ?? 'day-1');

  const [newWeightInput, setNewWeightInput] = useState('');
  const [newAdherenceInput, setNewAdherenceInput] = useState('95');
  const [newStartDateInput, setNewStartDateInput] = useState('');
  const [newGoalsSummaryInput, setNewGoalsSummaryInput] = useState('');
  const [newWeightNote, setNewWeightNote] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [weekFeedback, setWeekFeedback] = useState<string | null>(null);
  const [submittingWeek, setSubmittingWeek] = useState(false);

  const [chatMessages, setChatMessages] = useState<PortalChatMessage[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const t =
    lang === 'en'
      ? {
          portalPrefix: 'Client Portal ·',
          recalibrate: 'Recalibrate',
          signOut: 'Sign Out',
          calLabel: 'Daily Calorie Target',
          calUnit: 'kcal',
          macrosLabel: 'Daily Macro Targets',
          proteinUnit: 'g P',
          carbsUnit: 'g C',
          fatsUnit: 'g F',
          completionLabel: 'Workout Completion',
          of: 'of',
          exercisesDone: 'exercises done',
          lastWeightLabel: 'Latest Weight',
          kgUnit: 'kg',
          tabOverview: 'Goals, Diet & Supplements',
          tabWorkouts: 'Workout Program',
          tabHistory: '16-Week History (Gregorian & Hijri)',
          tabChat: 'Coach Chat',
          tabDownloads: 'Download Data',
          weeklyGoalsTitle: 'Weekly Goals',
          coachNotesTitle: 'Coach Directives',
          habitsTitle: 'Daily Lifestyle Targets',
          waterLabel: 'Water',
          litersUnit: 'L / day',
          sleepLabel: 'Sleep',
          hoursUnit: 'hrs',
          stepsLabel: 'Steps',
          stepsUnit: 'steps',
          nutritionTitle: 'Daily Meal Plan',
          timingLabel: 'Meal Timing:',
          mealIngredients: 'Ingredients:',
          supplementsTitle: 'Supplements & Add-ons',
          dosageLabel: 'Dosage:',
          timingSupLabel: 'Timing:',
          purposeLabel: 'Purpose:',
          scheduleTitle: 'Detailed Workout Schedule',
          resetWeek: 'Reset Week',
          daysAria: 'Training days',
          warmupLabel: 'Warmup Protocol:',
          estDuration: 'Est. duration:',
          minUnit: 'min',
          setsWord: 'Sets',
          repsWord: 'Reps',
          restWord: 'Rest',
          secUnit: 's',
          loadWord: 'Target Load',
          tempoWord: 'Tempo',
          cueWord: 'Execution Cue:',
          notesWord: 'Notes:',
          togglePrefix: 'Mark',
          toggleSuffix: 'completed',
          historyTitle: '16-Week Rolling Log (Gregorian & Hijri)',
          historySub:
            'Stores up to 16 weeks with exact start-to-end Gregorian and Hijri dates. When Week 17 is logged, Week 1 is automatically removed.',
          weeksStored: 'weeks stored',
          chartAria: 'Weekly weight progression curve',
          addWeekHeading: 'Log New Week Check-in',
          weightInputLabel: 'Weight (kg)',
          weightPlaceholder: 'e.g. 84.5',
          adherenceLabel: 'Diet Adherence (%)',
          startDateLabel: 'Week Start Date (optional)',
          goalsSummaryLabel: 'Week Goals Summary',
          goalsSummaryPh: 'e.g. Complete 4 sessions + 9k steps',
          noteLabel: 'Athlete Notes (optional)',
          notePlaceholder: 'Strong energy and recovery...',
          logWeightBtn: 'Save Week Record',
          savingWeekBtn: 'Saving...',
          weightErr: 'Please enter a valid weight between 35 and 250 kg.',
          weekSaveErr: 'Could not save week record. Please try again.',
          evictedBannerPrefix: 'Week 17 reached: Oldest week(s) automatically archived/deleted:',
          weekWord: 'Week',
          gregorianWord: 'Gregorian:',
          hijriWord: 'Hijri:',
          adherenceWord: 'Adherence:',
          workoutWord: 'Workouts:',
          coachWeekNote: 'Coach:',
          athleteWeekNote: 'Athlete:',
          downloadsTitle: 'Download Your Portal Data',
          downloadsSub:
            'Export any section or a complete backup of your coaching program, 16-week Gregorian/Hijri log, and chat history directly to your device.',
          dlAllJson: 'Complete Portal Backup (JSON)',
          dlAllJsonDesc: 'Includes profile, goals, workouts, nutrition, supplements, 16-week history & chat.',
          dlReportTxt: 'Full Coaching Report (TXT)',
          dlReportTxtDesc: 'Clean readable summary of your entire training, nutrition & weekly plan.',
          dlWeeksCsv: '16-Week History Table (CSV / Excel)',
          dlWeeksCsvDesc: 'Includes Gregorian & Hijri dates, weight, adherence & notes (Arabic-safe UTF-8).',
          dlPlanJson: 'Workouts, Meals & Supplements (JSON)',
          dlPlanJsonDesc: 'Structured JSON of your current training split, exercises, meals & supplements.',
          dlChatTxt: 'Coach Chat Transcript (TXT)',
          dlChatTxtDesc: 'Full timestamped conversation history with your coach.',
          dlBtn: 'Download',
        }
      : {
          portalPrefix: 'بوابة المتدرب ·',
          recalibrate: 'إعادة المعايرة',
          signOut: 'تسجيل الخروج',
          calLabel: 'هدف السعرات اليومي',
          calUnit: 'سعرة',
          macrosLabel: 'توزيع الماكروز اليومي',
          proteinUnit: 'جم بروتين',
          carbsUnit: 'جم كارب',
          fatsUnit: 'جم دهون',
          completionLabel: 'إنجاز الأسبوع التدريبي',
          of: 'من',
          exercisesDone: 'تمارين مكتملة',
          lastWeightLabel: 'آخر وزن مسجل',
          kgUnit: 'كجم',
          tabOverview: 'الأهداف والغذاء والإضافات',
          tabWorkouts: 'نظام التمارين التفصيلي',
          tabHistory: 'سجل 16 أسبوع (ميلادي وهجري)',
          tabChat: 'الشات مع الإدارة',
          tabDownloads: 'تنزيل البيانات',
          weeklyGoalsTitle: 'أهداف الأسبوع',
          coachNotesTitle: 'توجيهات المدرب الخاصة بك',
          habitsTitle: 'الأهداف اليومية المساندة',
          waterLabel: 'شرب الماء',
          litersUnit: 'لتر / يوم',
          sleepLabel: 'النوم',
          hoursUnit: 'ساعات',
          stepsLabel: 'الخطوات',
          stepsUnit: 'خطوة',
          nutritionTitle: 'النظام الغذائي والوجبات التفصيلية',
          timingLabel: 'توقيت الوجبات:',
          mealIngredients: 'المكونات والكميات:',
          supplementsTitle: 'المكملات والإضافات الموصى بها',
          dosageLabel: 'الجرعة:',
          timingSupLabel: 'التوقيت:',
          purposeLabel: 'الفائدة:',
          scheduleTitle: 'جدول التمارين وكل تمرين بالتفصيل',
          resetWeek: 'تصفير الأسبوع',
          daysAria: 'أيام التمرين',
          warmupLabel: 'بروتوكول الإحماء:',
          estDuration: 'المدة المقدرة:',
          minUnit: 'دقيقة',
          setsWord: 'المجموعات',
          repsWord: 'التكرارات',
          restWord: 'الراحة',
          secUnit: 'ثانية',
          loadWord: 'الوزن / الحمل',
          tempoWord: 'سرعة الأداء (Tempo)',
          cueWord: 'توجيه الأداء:',
          notesWord: 'ملاحظات التمرين:',
          togglePrefix: 'تحديد',
          toggleSuffix: 'كمكتمل',
          historyTitle: 'سجل المتابعة لـ 16 أسبوعاً (بالميلادي والهجري)',
          historySub:
            'يحفظ البوابة سجل آخر 16 أسبوعاً مع التاريخ الدقيق من يوم كم لكم بالميلادي والهجري؛ وعند إضافة الأسبوع 17 يتم حذف الأسبوع 1 تلقائياً.',
          weeksStored: 'أسابيع محفوظة',
          chartAria: 'رسم بياني لتطور الوزن الأسبوعي',
          addWeekHeading: 'إضافة / تسجيل بيانات أسبوع جديد',
          weightInputLabel: 'الوزن الجديد (كجم)',
          weightPlaceholder: 'مثال: 84.5',
          adherenceLabel: 'نسبة الالتزام الغذائي (%)',
          startDateLabel: 'تاريخ بداية الأسبوع (اختياري)',
          goalsSummaryLabel: 'ملخص أهداف الأسبوع',
          goalsSummaryPh: 'مثال: إتمام 4 حصص + 8500 خطوة يومياً',
          noteLabel: 'ملاحظاتك للأسبوع (اختياري)',
          notePlaceholder: 'طاقة ممتازة وتحسن بالأوزان...',
          logWeightBtn: 'حفظ بيانات الأسبوع',
          savingWeekBtn: 'جارٍ الحفظ...',
          weightErr: 'يرجى إدخال وزن صحيح بين 35 و 250 كجم.',
          weekSaveErr: 'تعذر حفظ بيانات الأسبوع على الخادم. يرجى المحاولة مجدداً.',
          evictedBannerPrefix: 'تم الوصول للأسبوع 17: تم حذف الأسبوع الأقدم تلقائياً:',
          weekWord: 'الأسبوع',
          gregorianWord: 'بالميلادي:',
          hijriWord: 'بالهجري:',
          adherenceWord: 'الالتزام:',
          workoutWord: 'التمارين:',
          coachWeekNote: 'تقييم المدرب:',
          athleteWeekNote: 'ملاحظة المتدرب:',
          downloadsTitle: 'تنزيل بيانات حسابك على جهازك',
          downloadsSub:
            'يمكنك تنزيل أي قسم أو نسخة احتياطية كاملة تشمل برنامج التمارين، النظام الغذائي، الإضافات، سجل الـ 16 أسبوعاً بالميلادي والهجري، وسجل الشات مباشرة على جهازك.',
          dlAllJson: 'تنزيل جميع بيانات الحساب (JSON)',
          dlAllJsonDesc: 'يشمل الملف الكامل: الأهداف، التمارين، النظام الغذائي، الإضافات، سجل 16 أسبوع والشات.',
          dlReportTxt: 'تقرير تدريبي شامل قابل للقراءة (TXT)',
          dlReportTxtDesc: 'ملف نصي منسق يحتوي على كل تفاصيل جدولك ووجباتك وملاحظات المدرب.',
          dlWeeksCsv: 'جدول سجل 16 أسبوع (CSV للإكسل)',
          dlWeeksCsvDesc: 'جدول يضم التواريخ الميلادية والهجريّة والأوزان ونسب الالتزام بدعم كامل للغة العربية.',
          dlPlanJson: 'تنزيل نظام التمارين والغذاء والإضافات (JSON)',
          dlPlanJsonDesc: 'تفاصيل جميع الأيام والتمارين والوجبات والمكملات في ملف مستقل.',
          dlChatTxt: 'تنزيل سجل الشات مع الإدارة (TXT)',
          dlChatTxtDesc: 'نسخة نصية مؤرخة بجميع الرسائل بينك وبين إدارة التدريب.',
          dlBtn: 'تنزيل الملف',
        };

  const athleteName = portalAccount.displayName;
  const tierCode = portalAccount.tierCode;
  const targetCalories = portalAccount.targetCalories;
  const proteinGrams = portalAccount.proteinGrams;
  const carbsGrams = portalAccount.carbsGrams;
  const fatsGrams = portalAccount.fatsGrams;
  const splitTitle = portalAccount.splitTitle;

  const activeDay = workoutDays.find((d) => d.id === selectedDayId) ?? workoutDays[0];
  const completion = calculateWorkoutCompletion(workoutDays, completedExerciseIds);

  const weeklyRecords = portalAccount.weeklyRecords;
  const latestWeight =
    weeklyRecords[weeklyRecords.length - 1]?.weightKg ??
    portalAccount.weightCheckIns[portalAccount.weightCheckIns.length - 1]?.weightKg ??
    82;

  const handleToggleGoal = (goalId: string) => {
    const nextGoals = portalAccount.weeklyGoals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    onUpdateWeeklyGoals(nextGoals);
  };

  const handleWeekSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(newWeightInput);
    if (!Number.isFinite(parsed) || parsed < 35 || parsed > 250) {
      setWeightError(t.weightErr);
      return;
    }
    const rawAdh = newAdherenceInput.trim() === '' ? 95 : Number(newAdherenceInput);
    const adherencePct = Number.isFinite(rawAdh)
      ? Math.min(100, Math.max(0, Math.round(rawAdh)))
      : 95;

    setWeightError(null);
    setWeekFeedback(null);
    setSubmittingWeek(true);

    const result = await onAddWeekRecord({
      startDateIso: newStartDateInput.trim() || undefined,
      weightKg: Number(parsed.toFixed(1)),
      adherencePct,
      goalsSummary: newGoalsSummaryInput.trim() || undefined,
      athleteNotes: newWeightNote.trim() || undefined,
    });

    setSubmittingWeek(false);
    if (!result) {
      setWeightError(t.weekSaveErr);
      return;
    }

    setNewWeightInput('');
    setNewGoalsSummaryInput('');
    setNewWeightNote('');

    if (result.evictedWeekNumbers && result.evictedWeekNumbers.length > 0) {
      setWeekFeedback(
        `${t.evictedBannerPrefix} ${result.evictedWeekNumbers.map((n) => `${t.weekWord} ${n}`).join(', ')}`
      );
    }
  };

  const fetchFullExportFromServer = async (): Promise<{
    account: PortalAccountPublic;
    chatMessages: PortalChatMessage[];
  }> => {
    const res = await fetch('/api/portal/export', {
      headers: { Authorization: `Bearer ${portalToken}` },
    });
    if (res.ok) {
      return (await res.json()) as {
        account: PortalAccountPublic;
        chatMessages: PortalChatMessage[];
      };
    }
    const fallback = buildSanitizedPortalExport(
      portalAccount as unknown as PortalAccountPublic & Record<string, unknown>,
      chatMessages
    );
    return {
      account: fallback.account as unknown as PortalAccountPublic,
      chatMessages: fallback.chatMessages,
    };
  };

  const handleDownloadAction = async (kind: 'all_json' | 'report_txt' | 'weeks_csv' | 'plan_json' | 'chat_txt') => {
    setDownloadingKey(kind);
    try {
      const safeSlug = portalAccount.username.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (kind === 'all_json') {
        const data = await fetchFullExportFromServer();
        downloadJsonFile(`kinetic-${safeSlug}-full-portal.json`, data);
      } else if (kind === 'report_txt') {
        const data = await fetchFullExportFromServer();
        const txt = formatCoachingReportTxt(data.account, data.chatMessages, lang);
        downloadTextFile(`kinetic-${safeSlug}-coaching-report.txt`, txt);
      } else if (kind === 'weeks_csv') {
        const csv = formatPortalWeeksCsv(portalAccount, lang);
        downloadTextFile(`kinetic-${safeSlug}-16weeks-history.csv`, csv, 'text/csv;charset=utf-8');
      } else if (kind === 'plan_json') {
        downloadJsonFile(`kinetic-${safeSlug}-program-nutrition.json`, {
          athlete: portalAccount.displayName,
          username: portalAccount.username,
          splitTitle,
          macros: { targetCalories, proteinGrams, carbsGrams, fatsGrams },
          weeklyGoals: portalAccount.weeklyGoals,
          workoutDays: portalAccount.workoutDays,
          nutritionPlan: portalAccount.nutritionPlan,
          supplements: portalAccount.supplements,
        });
      } else if (kind === 'chat_txt') {
        const data = await fetchFullExportFromServer();
        const lines = data.chatMessages.map(
          (m) => `[${m.createdAt}] ${m.senderName} (${m.senderRole}): ${m.body}`
        );
        downloadTextFile(
          `kinetic-${safeSlug}-chat-transcript.txt`,
          lines.length > 0 ? lines.join('\n') : 'No chat messages recorded.'
        );
      }
    } finally {
      setDownloadingKey(null);
    }
  };

  const weights =
    weeklyRecords.length > 0
      ? weeklyRecords.map((w) => w.weightKg)
      : [latestWeight];
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = Math.max(1, maxW - minW);
  const chartWidth = 420;
  const chartHeight = 130;
  const points = weights
    .map((w, idx) => {
      const x =
        weights.length === 1
          ? chartWidth / 2
          : 24 + (idx / (weights.length - 1)) * (chartWidth - 48);
      const y = chartHeight - 18 - ((w - minW) / rangeW) * (chartHeight - 40);
      return `${x},${y}`;
    })
    .join(' ');

  const tabs: { id: PortalTabId; label: string; icon: typeof Target }[] = [
    { id: 'overview', label: t.tabOverview, icon: Utensils },
    { id: 'workouts', label: t.tabWorkouts, icon: Dumbbell },
    { id: 'history16', label: t.tabHistory, icon: Calendar },
    { id: 'chat', label: t.tabChat, icon: MessageSquare },
    { id: 'downloads', label: t.tabDownloads, icon: Download },
  ];

  return (
    <main className="min-h-screen bg-[#0f131c] pt-10 pb-28 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#E2F124] mb-1.5">
              <span className="font-oswald-accent uppercase">{tierCode} TIER</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>{splitTitle}</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span dir="ltr" className="font-mono text-[#CBD5E1]">@{portalAccount.username}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {t.portalPrefix} {athleteName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEditAssessment}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer btn-kinetic-ghost"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
              <span>{t.recalibrate}</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer btn-kinetic-ghost text-[#ffb4ab]"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>{t.signOut}</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <span className="block text-xs text-[#94A3B8] mb-1">{t.calLabel}</span>
            <span className="tabular-metric text-3xl font-bold text-[#E2F124]">
              {targetCalories}
            </span>
            <span className="text-xs text-[#CBD5E1] ms-2">{t.calUnit}</span>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <span className="block text-xs text-[#94A3B8] mb-1">{t.macrosLabel}</span>
            <div className="tabular-metric text-base font-bold text-white mt-1">
              {proteinGrams} {t.proteinUnit} · {carbsGrams} {t.carbsUnit} · {fatsGrams}{' '}
              {t.fatsUnit}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#94A3B8]">{t.completionLabel}</span>
              <span
                data-testid="workout-completion-pct"
                className="tabular-metric text-sm font-bold text-[#E2F124]"
              >
                {completion.percentage}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#12161F] overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#E2F124] transition-all duration-200"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <span className="block text-xs text-[#CBD5E1] mt-2 tabular-metric">
              {completion.completed} {t.of} {completion.total} {t.exercisesDone}
            </span>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <span className="block text-xs text-[#94A3B8] mb-1">{t.lastWeightLabel}</span>
            <span className="tabular-metric text-3xl font-bold text-white">{latestWeight}</span>
            <span className="text-xs text-[#CBD5E1] ms-2">{t.kgUnit}</span>
          </div>
        </div>

        {/* Main Portal Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Client Portal Sections"
          className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#161B26] border border-white/10"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={`portal-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#E2F124] text-[#12161F]'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Weekly Goals, Nutrition Plan & Supplements */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Weekly Goals */}
              <div className="lg:col-span-7 glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                  <Target className="w-5 h-5 text-[#E2F124]" aria-hidden="true" />
                  <h2 className="text-xl font-bold text-white">{t.weeklyGoalsTitle}</h2>
                </div>
                <div className="space-y-3">
                  {portalAccount.weeklyGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`flex items-start justify-between gap-4 rounded-xl p-4 border transition-colors ${
                        goal.completed
                          ? 'bg-[#E2F124]/10 border-[#E2F124]/40'
                          : 'bg-[#12161F] border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={goal.completed}
                          onClick={() => handleToggleGoal(goal.id)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border cursor-pointer ${
                            goal.completed
                              ? 'bg-[#E2F124] border-[#E2F124] text-[#12161F]'
                              : 'bg-[#161B26] border-white/25 text-transparent hover:border-[#E2F124]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                        </button>
                        <div>
                          <p
                            className={`text-sm font-bold ${
                              goal.completed ? 'text-[#E2F124] line-through' : 'text-white'
                            }`}
                          >
                            {goal.title}
                          </p>
                          <p className="text-xs text-[#94A3B8] mt-1 tabular-metric">
                            {goal.targetMetric}
                            {goal.currentProgress ? ` · ${goal.currentProgress}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-semibold text-[#CBD5E1] uppercase">
                        {goal.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Habits + Coach Notes */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <h2 className="text-lg font-bold text-white pb-3 border-b border-white/10">
                    {t.habitsTitle}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#12161F] border border-white/10 p-3.5 text-center">
                      <Droplets className="w-5 h-5 text-sky-400 mx-auto mb-1.5" aria-hidden="true" />
                      <span className="block text-[11px] text-[#94A3B8]">{t.waterLabel}</span>
                      <span className="tabular-metric text-sm font-bold text-white">
                        {portalAccount.nutritionPlan.dailyWaterLiters} {t.litersUnit}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#12161F] border border-white/10 p-3.5 text-center">
                      <Moon className="w-5 h-5 text-indigo-300 mx-auto mb-1.5" aria-hidden="true" />
                      <span className="block text-[11px] text-[#94A3B8]">{t.sleepLabel}</span>
                      <span className="tabular-metric text-sm font-bold text-white">
                        {portalAccount.nutritionPlan.sleepHoursTarget} {t.hoursUnit}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#12161F] border border-white/10 p-3.5 text-center">
                      <Footprints className="w-5 h-5 text-[#E2F124] mx-auto mb-1.5" aria-hidden="true" />
                      <span className="block text-[11px] text-[#94A3B8]">{t.stepsLabel}</span>
                      <span className="tabular-metric text-sm font-bold text-white">
                        {portalAccount.nutritionPlan.stepsTarget.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {portalAccount.coachNotes && (
                    <div className="rounded-xl bg-[#E2F124]/10 border border-[#E2F124]/30 p-4 space-y-1">
                      <span className="block text-xs font-bold text-[#E2F124]">
                        {t.coachNotesTitle}
                      </span>
                      <p className="text-xs sm:text-sm text-[#dfe2ef] leading-relaxed whitespace-pre-wrap">
                        {portalAccount.coachNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Meal Plan */}
            <div className="glass-card rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Utensils className="w-5 h-5 text-[#E2F124]" aria-hidden="true" />
                  <h2 className="text-xl font-bold text-white">{t.nutritionTitle}</h2>
                </div>
                <span className="text-xs text-[#CBD5E1]">
                  {t.timingLabel} {portalAccount.nutritionPlan.mealTimingNote}
                </span>
              </div>

              {portalAccount.nutritionPlan.coachNutritionNotes && (
                <p className="text-xs sm:text-sm text-[#CBD5E1] rounded-xl bg-[#12161F] border border-white/10 px-4 py-3">
                  {portalAccount.nutritionPlan.coachNutritionNotes}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portalAccount.nutritionPlan.meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-xl bg-[#12161F] border border-white/10 p-4 sm:p-5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#E2F124] tabular-metric">
                        {meal.timeLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white tabular-metric">
                        <Flame className="w-3.5 h-3.5 text-[#E2F124]" aria-hidden="true" />
                        {meal.calories} {t.calUnit}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{meal.title}</h3>
                    <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                      <strong className="text-white">{t.mealIngredients} </strong>
                      {meal.ingredients}
                    </p>
                    <div className="tabular-metric text-xs font-semibold text-[#94A3B8]">
                      {meal.proteinGrams}g P · {meal.carbsGrams}g C · {meal.fatsGrams}g F
                    </div>
                    {meal.notes && (
                      <p className="text-xs text-[#94A3B8] border-t border-white/10 pt-2">
                        {meal.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Supplements & Add-ons */}
            <div className="glass-card rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                <Pill className="w-5 h-5 text-[#E2F124]" aria-hidden="true" />
                <h2 className="text-xl font-bold text-white">{t.supplementsTitle}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portalAccount.supplements.map((sup) => (
                  <div
                    key={sup.id}
                    className="rounded-xl bg-[#12161F] border border-white/10 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white">{sup.name}</h3>
                      <span className="px-2.5 py-0.5 rounded bg-[#E2F124]/15 text-xs font-bold text-[#E2F124]">
                        {sup.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-[#CBD5E1]">
                      <strong className="text-white">{t.timingSupLabel} </strong>
                      {sup.timing}
                    </p>
                    <p className="text-xs text-[#CBD5E1]">
                      <strong className="text-white">{t.purposeLabel} </strong>
                      {sup.purpose}
                    </p>
                    {sup.notes && <p className="text-xs text-[#94A3B8]">{sup.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Detailed Workout Program */}
        {activeTab === 'workouts' && activeDay && (
          <div className="glass-card rounded-2xl p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <Dumbbell className="w-5 h-5 text-[#E2F124]" aria-hidden="true" />
                <h2 className="text-xl font-bold text-white">{t.scheduleTitle}</h2>
              </div>

              <button
                type="button"
                onClick={onResetExercises}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.resetWeek}</span>
              </button>
            </div>

            <div role="tablist" aria-label={t.daysAria} className="flex flex-wrap gap-2 mb-6">
              {workoutDays.map((day) => {
                const isSelected = day.id === activeDay.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedDayId(day.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#E2F124] text-[#12161F]'
                        : 'bg-[#12161F] text-[#CBD5E1] border border-white/10 hover:text-white'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pb-4 mb-5 border-b border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-white">{activeDay.focus}</h3>
                <span className="tabular-metric text-xs font-semibold text-[#E2F124]">
                  {t.estDuration} {activeDay.durationMinutes} {t.minUnit}
                </span>
              </div>
              {activeDay.warmupNote && (
                <p className="text-xs text-[#CBD5E1]">
                  <strong className="text-white">{t.warmupLabel} </strong>
                  {activeDay.warmupNote}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {activeDay.exercises.map((exercise, idx) => {
                const isDone = completedExerciseIds.includes(exercise.id);
                return (
                  <div
                    key={exercise.id}
                    className={`rounded-xl p-4 sm:p-5 border transition-colors ${
                      isDone
                        ? 'bg-[#E2F124]/10 border-[#E2F124]/50'
                        : 'bg-[#12161F]/90 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        aria-label={`${t.togglePrefix} ${exercise.name} ${t.toggleSuffix}`}
                        onClick={() => onToggleExercise(exercise.id)}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border cursor-pointer transition-colors ${
                          isDone
                            ? 'bg-[#E2F124] border-[#E2F124] text-[#12161F]'
                            : 'bg-[#161B26] border-white/25 text-transparent hover:border-[#E2F124]'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                      </button>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p
                            className={`text-base font-bold ${
                              isDone ? 'text-[#E2F124] line-through' : 'text-white'
                            }`}
                          >
                            {idx + 1}. {exercise.name}
                          </p>
                          <span className="px-2.5 py-0.5 rounded bg-white/10 text-xs font-bold text-[#E2F124] tabular-metric">
                            {exercise.targetRpe}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div className="rounded-lg bg-[#161B26] px-3 py-2 border border-white/5">
                            <span className="block text-[#94A3B8]">{t.setsWord}</span>
                            <span className="tabular-metric font-bold text-white">
                              {exercise.sets}
                            </span>
                          </div>
                          <div className="rounded-lg bg-[#161B26] px-3 py-2 border border-white/5">
                            <span className="block text-[#94A3B8]">{t.repsWord}</span>
                            <span className="tabular-metric font-bold text-white">
                              {exercise.reps}
                            </span>
                          </div>
                          <div className="rounded-lg bg-[#161B26] px-3 py-2 border border-white/5">
                            <span className="block text-[#94A3B8]">{t.restWord}</span>
                            <span className="tabular-metric font-bold text-white">
                              {exercise.restSeconds} {t.secUnit}
                            </span>
                          </div>
                          <div className="rounded-lg bg-[#161B26] px-3 py-2 border border-white/5">
                            <span className="block text-[#94A3B8]">{t.loadWord}</span>
                            <span className="font-bold text-[#E2F124]">
                              {exercise.weightKg || 'RPE'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-[#161B26] px-3 py-2 border border-white/5 col-span-2 sm:col-span-1">
                            <span className="block text-[#94A3B8]">{t.tempoWord}</span>
                            <span className="tabular-metric font-bold text-white">
                              {exercise.tempo || '3-1-1-0'}
                            </span>
                          </div>
                        </div>

                        {(exercise.notes || exercise.videoCue) && (
                          <div className="space-y-1 text-xs text-[#CBD5E1] pt-1">
                            {exercise.notes && (
                              <p>
                                <strong className="text-white">{t.notesWord} </strong>
                                {exercise.notes}
                              </p>
                            )}
                            {exercise.videoCue && (
                              <p className="text-[#94A3B8]">
                                <strong className="text-[#E2F124]">{t.cueWord} </strong>
                                {exercise.videoCue}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: 16-Week History (Gregorian & Hijri) */}
        {activeTab === 'history16' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 glass-card rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold text-white">{t.historyTitle}</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">{t.historySub}</p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-[#E2F124]/15 text-xs font-bold text-[#E2F124] tabular-metric">
                  {weeklyRecords.length} / {MAX_PORTAL_WEEKS} {t.weeksStored}
                </span>
              </div>

              {weekFeedback && (
                <div
                  role="status"
                  className="rounded-xl bg-[#E2F124]/10 border border-[#E2F124]/40 px-4 py-3 text-xs sm:text-sm font-semibold text-[#E2F124]"
                >
                  {weekFeedback}
                </div>
              )}

              <div className="space-y-3 max-h-[540px] overflow-y-auto pe-1">
                {[...weeklyRecords].reverse().map((wk) => (
                  <div
                    key={wk.id}
                    data-testid={`portal-week-row-${wk.weekNumber}`}
                    className="rounded-xl bg-[#12161F] border border-white/10 p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm sm:text-base font-bold text-[#E2F124]">
                        {t.weekWord} {wk.weekNumber}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-xs tabular-metric">
                        <span className="font-bold text-white">
                          {wk.weightKg} {t.kgUnit}
                        </span>
                        <span className="text-[#CBD5E1]">
                          {t.adherenceWord} {wk.adherencePct}%
                        </span>
                        <span className="text-[#94A3B8]">
                          {t.workoutWord} {wk.workoutCompletionPct}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs rounded-lg bg-[#161B26] p-3 border border-white/5">
                      <div>
                        <span className="text-[#94A3B8]">{t.gregorianWord} </span>
                        <span className="font-semibold text-white">
                          {lang === 'en' ? wk.gregorianRangeEn : wk.gregorianRangeAr}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">{t.hijriWord} </span>
                        <span className="font-semibold text-[#E2F124]">
                          {lang === 'en' ? wk.hijriRangeEn : wk.hijriRangeAr}
                        </span>
                      </div>
                    </div>

                    {wk.goalsSummary && (
                      <p className="text-xs text-[#CBD5E1]">{wk.goalsSummary}</p>
                    )}

                    {(wk.coachNotes || wk.athleteNotes) && (
                      <div className="text-xs text-[#94A3B8] space-y-1 border-t border-white/10 pt-2">
                        {wk.coachNotes && (
                          <p>
                            <strong className="text-[#E2F124]">{t.coachWeekNote} </strong>
                            {wk.coachNotes}
                          </p>
                        )}
                        {wk.athleteNotes && (
                          <p>
                            <strong className="text-white">{t.athleteWeekNote} </strong>
                            {wk.athleteNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <h3 className="text-lg font-bold text-white">{t.addWeekHeading}</h3>

                <div className="rounded-xl bg-[#12161F] border border-white/10 p-4">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-32 overflow-visible"
                    role="img"
                    aria-label={t.chartAria}
                  >
                    <polyline
                      fill="none"
                      stroke="#E2F124"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                    {weights.map((w, idx) => {
                      const x =
                        weights.length === 1
                          ? chartWidth / 2
                          : 24 + (idx / (weights.length - 1)) * (chartWidth - 48);
                      const y = chartHeight - 18 - ((w - minW) / rangeW) * (chartHeight - 40);
                      return (
                        <g key={idx}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#12161F"
                            stroke="#E2F124"
                            strokeWidth="2.5"
                          />
                          <text
                            x={x}
                            y={y - 9}
                            textAnchor="middle"
                            fill="#dfe2ef"
                            fontSize="9.5"
                            fontFamily="IBM Plex Mono, monospace"
                          >
                            {w}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <form onSubmit={handleWeekSubmit} noValidate className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="portal-week-weight"
                        className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                      >
                        {t.weightInputLabel}
                      </label>
                      <input
                        id="portal-week-weight"
                        type="number"
                        step="0.1"
                        value={newWeightInput}
                        onChange={(e) => setNewWeightInput(e.target.value)}
                        placeholder={t.weightPlaceholder}
                        className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="portal-week-adherence"
                        className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                      >
                        {t.adherenceLabel}
                      </label>
                      <input
                        id="portal-week-adherence"
                        type="number"
                        min={0}
                        max={100}
                        value={newAdherenceInput}
                        onChange={(e) => setNewAdherenceInput(e.target.value)}
                        className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="portal-week-date"
                      className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                    >
                      {t.startDateLabel}
                    </label>
                    <input
                      id="portal-week-date"
                      type="date"
                      value={newStartDateInput}
                      onChange={(e) => setNewStartDateInput(e.target.value)}
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="portal-week-goals"
                      className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                    >
                      {t.goalsSummaryLabel}
                    </label>
                    <input
                      id="portal-week-goals"
                      type="text"
                      value={newGoalsSummaryInput}
                      onChange={(e) => setNewGoalsSummaryInput(e.target.value)}
                      placeholder={t.goalsSummaryPh}
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="portal-week-note"
                      className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                    >
                      {t.noteLabel}
                    </label>
                    <input
                      id="portal-week-note"
                      type="text"
                      value={newWeightNote}
                      onChange={(e) => setNewWeightNote(e.target.value)}
                      placeholder={t.notePlaceholder}
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>

                  {weightError && <p className="text-xs text-[#ffb4ab]">{weightError}</p>}

                  <button
                    type="submit"
                    disabled={submittingWeek}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold cursor-pointer btn-kinetic-primary disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>{submittingWeek ? t.savingWeekBtn : t.logWeightBtn}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Live WebSocket Chat with Admin / Coach */}
        {activeTab === 'chat' && (
          <PortalChatPanel
            lang={lang}
            role="portal"
            token={portalToken}
            accountId={portalAccount.id}
            peerLabel={lang === 'en' ? 'Head Coach & Admin' : 'المدرب وإدارة المحتوى'}
            onAuthExpired={onSignOut}
            onMessagesLoaded={setChatMessages}
          />
        )}

        {/* TAB 5: Athlete Data Downloads */}
        {activeTab === 'downloads' && (
          <div className="glass-card rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="pb-3 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">{t.downloadsTitle}</h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">{t.downloadsSub}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'all_json' as const,
                  title: t.dlAllJson,
                  desc: t.dlAllJsonDesc,
                  icon: Download,
                },
                {
                  key: 'report_txt' as const,
                  title: t.dlReportTxt,
                  desc: t.dlReportTxtDesc,
                  icon: FileText,
                },
                {
                  key: 'weeks_csv' as const,
                  title: t.dlWeeksCsv,
                  desc: t.dlWeeksCsvDesc,
                  icon: FileSpreadsheet,
                },
                {
                  key: 'plan_json' as const,
                  title: t.dlPlanJson,
                  desc: t.dlPlanJsonDesc,
                  icon: Dumbbell,
                },
                {
                  key: 'chat_txt' as const,
                  title: t.dlChatTxt,
                  desc: t.dlChatTxtDesc,
                  icon: MessageSquare,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="rounded-xl bg-[#12161F] border border-white/10 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[#E2F124]">
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <h3 className="text-sm sm:text-base font-bold text-white">{card.title}</h3>
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{card.desc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={downloadingKey === card.key}
                      onClick={() => handleDownloadAction(card.key)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold btn-kinetic-primary cursor-pointer disabled:opacity-60 self-start"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.dlBtn}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
