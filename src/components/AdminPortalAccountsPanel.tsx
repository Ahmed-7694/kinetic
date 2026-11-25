import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  Dumbbell,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  KeyRound,
  MessageSquare,
  Pill,
  Plus,
  Save,
  Settings2,
  Target,
  Trash2,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react';
import type { Language } from '../utils/coachingMath';
import {
  validatePortalAccountFormInput,
  type PortalAccountPublic,
  type PortalTierCode,
} from '../utils/cmsSchema';
import {
  formatCoachingReportTxt,
  formatPortalWeeksCsv,
  MAX_PORTAL_WEEKS,
  type PortalChatMessage,
  type PortalNutritionPlan,
  type PortalSupplementItem,
  type PortalWeeklyGoal,
  type PortalWorkoutDay,
} from '../utils/portalPlanning';
import { downloadJsonFile, downloadTextFile } from '../utils/downloadFile';
import { PortalChatPanel } from './PortalChatPanel';

interface AdminPortalAccountsPanelProps {
  lang: Language;
  adminToken: string;
  onSessionExpired: () => void;
}

type AdminControlSubTab =
  | 'credentials'
  | 'goals'
  | 'workouts'
  | 'nutrition'
  | 'weeks16'
  | 'chat'
  | 'exports';

interface CreateDraftState {
  username: string;
  password: string;
  displayName: string;
  tierCode: PortalTierCode;
  targetCalories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatsGrams: string;
  splitTitle: string;
  initialWeightKg: string;
}

function makeDefaultCreateDraft(lang: Language): CreateDraftState {
  return {
    username: '',
    password: '',
    displayName: '',
    tierCode: 'PRO',
    targetCalories: '2240',
    proteinGrams: '190',
    carbsGrams: '230',
    fatsGrams: '62',
    splitTitle:
      lang === 'en' ? 'Balanced Upper / Lower (4 Days)' : 'علوي / سفلي متوازن (4 أيام)',
    initialWeightKg: '82',
  };
}

interface FullAccountEditorState {
  username: string;
  password: string;
  displayName: string;
  tierCode: PortalTierCode;
  targetCalories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatsGrams: string;
  splitTitle: string;
  active: boolean;
  coachNotes: string;
  weeklyGoals: PortalWeeklyGoal[];
  workoutDays: PortalWorkoutDay[];
  nutritionPlan: PortalNutritionPlan;
  supplements: PortalSupplementItem[];
}

function toEditorState(acc: PortalAccountPublic): FullAccountEditorState {
  return {
    username: acc.username,
    password: '',
    displayName: acc.displayName,
    tierCode: acc.tierCode,
    targetCalories: String(acc.targetCalories),
    proteinGrams: String(acc.proteinGrams),
    carbsGrams: String(acc.carbsGrams),
    fatsGrams: String(acc.fatsGrams),
    splitTitle: acc.splitTitle,
    active: acc.active,
    coachNotes: acc.coachNotes ?? '',
    weeklyGoals: JSON.parse(JSON.stringify(acc.weeklyGoals)) as PortalWeeklyGoal[],
    workoutDays: JSON.parse(JSON.stringify(acc.workoutDays)) as PortalWorkoutDay[],
    nutritionPlan: JSON.parse(JSON.stringify(acc.nutritionPlan)) as PortalNutritionPlan,
    supplements: JSON.parse(JSON.stringify(acc.supplements)) as PortalSupplementItem[],
  };
}

export function AdminPortalAccountsPanel({
  lang,
  adminToken,
  onSessionExpired,
}: AdminPortalAccountsPanelProps) {
  const [accounts, setAccounts] = useState<PortalAccountPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Create form
  const [createDraft, setCreateDraft] = useState<CreateDraftState>(() =>
    makeDefaultCreateDraft(lang)
  );
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Full Control Workspace for a selected athlete
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [controlTab, setControlTab] = useState<AdminControlSubTab>('credentials');
  const [editor, setEditor] = useState<FullAccountEditorState | null>(null);
  const [selectedWorkoutDayIdx, setSelectedWorkoutDayIdx] = useState(0);
  const [showEditPw, setShowEditPw] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Admin Week 1..16 add state
  const [wkWeight, setWkWeight] = useState('');
  const [wkAdherence, setWkAdherence] = useState('95');
  const [wkStartDate, setWkStartDate] = useState('');
  const [wkGoals, setWkGoals] = useState('');
  const [wkCoachNote, setWkCoachNote] = useState('');

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const t =
    lang === 'en'
      ? {
          title: 'Full Athlete Accounts Control',
          subtitle:
            'Create portal accounts (no self-signup) and manage every detail of each athlete: credentials, weekly goals, detailed exercises, nutrition meals, supplements, 16-week Gregorian/Hijri records, live chat, and downloads.',
          createHeading: 'Create New Athlete Account',
          usernameLabel: 'Login Username',
          usernamePh: 'e.g. khalid_fit',
          passwordLabel: 'Login Password',
          passwordPh: 'At least 3 chars',
          displayLabel: 'Athlete Name',
          displayPh: 'e.g. Khalid Al-Mansour',
          tierLabel: 'Tier',
          splitLabel: 'Split Title',
          calLabel: 'Calories',
          proLabel: 'Protein (g)',
          carbLabel: 'Carbs (g)',
          fatLabel: 'Fats (g)',
          initWeightLabel: 'Start Weight (kg)',
          createBtn: 'Create Account',
          creatingBtn: 'Creating...',
          listHeading: 'Provisioned Athlete Accounts',
          loadingTxt: 'Loading accounts...',
          emptyTxt: 'No Client Portal accounts exist yet.',
          activeBadge: 'Active',
          disabledBadge: 'Disabled',
          fullControlBtn: 'Full Control',
          closeControlBtn: 'Close Panel',
          chatBtn: 'Chat',
          dlQuickBtn: 'Download',
          deleteBtn: 'Delete',
          confirmDelMsg: 'Delete permanently?',
          confirmDelYes: 'Confirm Delete',
          cancelBtn: 'Cancel',
          tabCredentials: 'Credentials & Macros',
          tabGoals: 'Weekly Goals',
          tabWorkouts: 'Workouts & Exercises',
          tabNutrition: 'Diet & Supplements',
          tabWeeks: '16-Week History',
          tabChat: 'Live Chat',
          tabExports: 'Download Account',
          saveAllBtn: 'Save All Account Changes',
          savingBtn: 'Saving...',
          newPwLabel: 'New Password (optional)',
          newPwPh: 'Leave blank to keep current',
          statusLabel: 'Account Access',
          statusActive: 'Active (Can Sign In)',
          statusDisabled: 'Disabled (Blocked)',
          coachNotesLabel: 'General Coach Directives (visible in athlete portal)',
          addGoalBtn: 'Add Weekly Goal',
          goalTitleLabel: 'Goal Title',
          goalMetricLabel: 'Target Metric',
          goalProgLabel: 'Progress Note',
          goalCatLabel: 'Category',
          addDayBtn: 'Add Workout Day',
          removeDayBtn: 'Delete Day',
          dayLabel: 'Day Title',
          dayFocus: 'Session Focus',
          dayDuration: 'Duration (min)',
          dayWarmup: 'Warmup Protocol',
          addExerciseBtn: 'Add Exercise',
          exName: 'Exercise Name',
          exSets: 'Sets',
          exReps: 'Reps',
          exRest: 'Rest (sec)',
          exWeight: 'Target Weight / Load',
          exRpe: 'RPE / Intensity',
          exTempo: 'Tempo',
          exNotes: 'Notes',
          exCue: 'Form / Video Cue',
          waterLabel: 'Daily Water (L)',
          sleepLabel: 'Sleep Target (hrs)',
          stepsLabel: 'Daily Steps',
          mealTimingLabel: 'Meal Timing Rule',
          nutNotesLabel: 'Nutrition Guidelines',
          mealsHeading: 'Meal Plan',
          addMealBtn: 'Add Meal',
          mealTime: 'Time',
          mealTitle: 'Meal Title',
          mealFoods: 'Ingredients & Portions',
          mealCals: 'Calories',
          mealNotes: 'Meal Notes',
          supHeading: 'Supplements & Add-ons',
          addSupBtn: 'Add Supplement',
          supName: 'Supplement Name',
          supDosage: 'Dosage',
          supTiming: 'Timing',
          supPurpose: 'Purpose',
          supNotes: 'Notes',
          addWeekHeading: 'Add New Week Record (Week 17 auto-removes Week 1)',
          addWeekBtn: 'Add Week Entry',
          weekStartOpt: 'Start Date (optional)',
          weekGoalsPh: 'Goals summary...',
          weekCoachPh: 'Coach review note...',
          createdOk: 'Client portal account created.',
          updatedOk: 'All changes saved to database for this athlete.',
          deletedOk: 'Client portal account deleted.',
          weekAddedOk: 'Week record saved.',
          weekEvictedSuffix: 'Oldest week auto-removed:',
          duplicateErr: 'This username is already taken.',
          genericErr: 'Operation failed. Verify inputs and try again.',
          dlJsonBtn: 'Download Complete Account (JSON)',
          dlReportBtn: 'Download Coaching Report (TXT)',
          dlCsvBtn: 'Download 16-Week History (CSV)',
        }
      : {
          title: 'التحكم الكامل بحسابات المتدربين',
          subtitle:
            'أنشئ حسابات بوابة المتدرب (بدون تسجيل ذاتي) وتحكّم بالكامل في كل حساب: بيانات الدخول، أهداف الأسبوع، التمارين بالتفصيل، النظام الغذائي، الإضافات، سجل 16 أسبوع بالميلادي والهجري، الشات، والتنزيل.',
          createHeading: 'إنشاء حساب متدرب جديد',
          usernameLabel: 'اسم المستخدم للدخول',
          usernamePh: 'مثال: khalid_fit',
          passwordLabel: 'كلمة المرور للدخول',
          passwordPh: '3 أحرف على الأقل',
          displayLabel: 'اسم المتدرب الظاهر',
          displayPh: 'مثال: خالد المنصور',
          tierLabel: 'الباقة',
          splitLabel: 'عنوان الجدول',
          calLabel: 'السعرات',
          proLabel: 'بروتين (جم)',
          carbLabel: 'كارب (جم)',
          fatLabel: 'دهون (جم)',
          initWeightLabel: 'وزن البداية (كجم)',
          createBtn: 'إنشاء الحساب',
          creatingBtn: 'جارٍ الإنشاء...',
          listHeading: 'حسابات المتدربين المسجلة',
          loadingTxt: 'جارٍ تحميل الحسابات...',
          emptyTxt: 'لا توجد حسابات لبوابة المتدرب حتى الآن.',
          activeBadge: 'مفعّل',
          disabledBadge: 'موقوف',
          fullControlBtn: 'تحكم كامل بالحساب',
          closeControlBtn: 'إغلاق لوحة التحكم',
          chatBtn: 'شات مباشر',
          dlQuickBtn: 'تنزيل الحساب',
          deleteBtn: 'حذف',
          confirmDelMsg: 'تأكيد الحذف النهائي؟',
          confirmDelYes: 'نعم، احذف الحساب',
          cancelBtn: 'إلغاء',
          tabCredentials: 'الدخول والماكروز',
          tabGoals: 'أهداف الأسبوع',
          tabWorkouts: 'التمارين بالتفصيل',
          tabNutrition: 'الغذاء والإضافات',
          tabWeeks: 'سجل 16 أسبوع',
          tabChat: 'الشات مع المتدرب',
          tabExports: 'تنزيل بيانات المتدرب',
          saveAllBtn: 'حفظ جميع تعديلات هذا الحساب',
          savingBtn: 'جارٍ الحفظ...',
          newPwLabel: 'كلمة مرور جديدة (اختياري)',
          newPwPh: 'اتركه فارغاً للإبقاء على الحالية',
          statusLabel: 'صلاحية الدخول',
          statusActive: 'مفعّل (مسموح بالدخول)',
          statusDisabled: 'موقوف (ممنوع من الدخول)',
          coachNotesLabel: 'توجيهات المدرب العامة للمتدرب',
          addGoalBtn: 'إضافة هدف أسبوعي',
          goalTitleLabel: 'عنوان الهدف',
          goalMetricLabel: 'المعيار المستهدف',
          goalProgLabel: 'التقدم الحالي',
          goalCatLabel: 'التصنيف',
          addDayBtn: 'إضافة يوم تمرين',
          removeDayBtn: 'حذف اليوم',
          dayLabel: 'اسم اليوم',
          dayFocus: 'تركيز التمرين',
          dayDuration: 'المدة (دقيقة)',
          dayWarmup: 'بروتوكول الإحماء',
          addExerciseBtn: 'إضافة تمرين لهذا اليوم',
          exName: 'اسم التمرين',
          exSets: 'المجموعات',
          exReps: 'التكرارات',
          exRest: 'الراحة (ث)',
          exWeight: 'الوزن / الحمل',
          exRpe: 'الشدة (RPE)',
          exTempo: 'التوقيت (Tempo)',
          exNotes: 'ملاحظات التمرين',
          exCue: 'توجيه الأداء والفيديو',
          waterLabel: 'الماء اليومي (لتر)',
          sleepLabel: 'النوم المستهدف (ساعة)',
          stepsLabel: 'الخطوات اليومية',
          mealTimingLabel: 'توجيه توقيت الوجبات',
          nutNotesLabel: 'ملاحظات النظام الغذائي والبدائل',
          mealsHeading: 'الوجبات التفصيلية',
          addMealBtn: 'إضافة وجبة',
          mealTime: 'الوقت',
          mealTitle: 'اسم الوجبة',
          mealFoods: 'المكونات والكميات',
          mealCals: 'السعرات',
          mealNotes: 'ملاحظات الوجبة',
          supHeading: 'المكملات والإضافات',
          addSupBtn: 'إضافة مكمل / إضافة',
          supName: 'اسم المكمل / الإضافة',
          supDosage: 'الجرعة',
          supTiming: 'التوقيت',
          supPurpose: 'الغرض',
          supNotes: 'ملاحظات',
          addWeekHeading: 'إضافة سجل أسبوع جديد (الأسبوع 17 يحذف الأسبوع 1 تلقائياً)',
          addWeekBtn: 'إضافة الأسبوع',
          weekStartOpt: 'تاريخ بداية الأسبوع (اختياري)',
          weekGoalsPh: 'ملخص أهداف الأسبوع...',
          weekCoachPh: 'تقييم وملاحظات المدرب للأسبوع...',
          createdOk: 'تم إنشاء حساب المتدرب في قاعدة البيانات بنجاح.',
          updatedOk: 'تم حفظ جميع التعديلات لحساب المتدرب بنجاح.',
          deletedOk: 'تم حذف حساب المتدرب بنجاح.',
          weekAddedOk: 'تم تسجيل بيانات الأسبوع بنجاح.',
          weekEvictedSuffix: 'تم الوصول للأسبوع 17 فحُذف الأقدم تلقائياً:',
          duplicateErr: 'اسم المستخدم مستخدم بالفعل لحساب آخر.',
          genericErr: 'تعذر تنفيذ العملية. تحقق من المدخلات وأعد المحاولة.',
          dlJsonBtn: 'تنزيل ملف الحساب الكامل (JSON)',
          dlReportBtn: 'تنزيل التقرير التدريبي الشامل (TXT)',
          dlCsvBtn: 'تنزيل سجل 16 أسبوع بالميلادي والهجري (CSV)',
        };

  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const genericErrRef = useRef(t.genericErr);
  genericErrRef.current = t.genericErr;

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/portal-accounts', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (response.status === 401) {
        onSessionExpiredRef.current();
        return;
      }
      if (!response.ok) {
        setFeedback({ type: 'error', text: genericErrRef.current });
        return;
      }
      const data = (await response.json()) as { accounts?: PortalAccountPublic[] };
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    } catch {
      setFeedback({ type: 'error', text: genericErrRef.current });
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const openControlPanel = (acc: PortalAccountPublic, tab: AdminControlSubTab = 'credentials') => {
    setSelectedAccountId(acc.id);
    setControlTab(tab);
    setEditor(toEditorState(acc));
    setSelectedWorkoutDayIdx(0);
    setEditErrors({});
    setShowEditPw(false);
    setConfirmDeleteId(null);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const errors = validatePortalAccountFormInput(
      {
        username: createDraft.username,
        password: createDraft.password,
        displayName: createDraft.displayName,
      },
      false,
      lang
    );
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const response = await fetch('/api/admin/portal-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          username: createDraft.username.trim(),
          password: createDraft.password,
          displayName: createDraft.displayName.trim(),
          tierCode: createDraft.tierCode,
          targetCalories: Number(createDraft.targetCalories) || 2240,
          proteinGrams: Number(createDraft.proteinGrams) || 190,
          carbsGrams: Number(createDraft.carbsGrams) || 230,
          fatsGrams: Number(createDraft.fatsGrams) || 62,
          splitTitle: createDraft.splitTitle.trim(),
          initialWeightKg: Number(createDraft.initialWeightKg) || 82,
          active: true,
        }),
      });
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (response.status === 409) {
        setFeedback({ type: 'error', text: t.duplicateErr });
        return;
      }
      if (!response.ok) {
        setFeedback({ type: 'error', text: t.genericErr });
        return;
      }

      const payload = (await response.json()) as { account: PortalAccountPublic };
      setAccounts((prev) => [...prev, payload.account]);
      setCreateDraft(makeDefaultCreateDraft(lang));
      setShowCreatePw(false);
      setFeedback({ type: 'success', text: t.createdOk });
    } catch {
      setFeedback({ type: 'error', text: t.genericErr });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFullAccount = async () => {
    if (!selectedAccountId || !editor) return;
    setFeedback(null);

    const errors = validatePortalAccountFormInput(
      {
        username: editor.username,
        password: editor.password,
        displayName: editor.displayName,
      },
      true,
      lang
    );
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      setControlTab('credentials');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/portal-accounts/${encodeURIComponent(selectedAccountId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            username: editor.username.trim(),
            ...(editor.password.length > 0 ? { password: editor.password } : {}),
            displayName: editor.displayName.trim(),
            tierCode: editor.tierCode,
            targetCalories: Number(editor.targetCalories) || 2240,
            proteinGrams: Number(editor.proteinGrams) || 190,
            carbsGrams: Number(editor.carbsGrams) || 230,
            fatsGrams: Number(editor.fatsGrams) || 62,
            splitTitle: editor.splitTitle.trim(),
            active: editor.active,
            coachNotes: editor.coachNotes,
            weeklyGoals: editor.weeklyGoals,
            workoutDays: editor.workoutDays,
            nutritionPlan: editor.nutritionPlan,
            supplements: editor.supplements,
          }),
        }
      );

      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (response.status === 409) {
        setFeedback({ type: 'error', text: t.duplicateErr });
        return;
      }
      if (!response.ok) {
        setFeedback({ type: 'error', text: t.genericErr });
        return;
      }

      const payload = (await response.json()) as { account: PortalAccountPublic };
      setAccounts((prev) =>
        prev.map((item) => (item.id === selectedAccountId ? payload.account : item))
      );
      setEditor(toEditorState(payload.account));
      setFeedback({ type: 'success', text: t.updatedOk });
    } catch {
      setFeedback({ type: 'error', text: t.genericErr });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    setFeedback(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/portal-accounts/${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (!response.ok) {
        setFeedback({ type: 'error', text: t.genericErr });
        return;
      }
      setAccounts((prev) => prev.filter((item) => item.id !== accountId));
      setConfirmDeleteId(null);
      if (selectedAccountId === accountId) {
        setSelectedAccountId(null);
        setEditor(null);
      }
      setFeedback({ type: 'success', text: t.deletedOk });
    } catch {
      setFeedback({ type: 'error', text: t.genericErr });
    } finally {
      setBusy(false);
    }
  };

  const handleAdminAddWeek = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    const weightVal = Number(wkWeight);
    if (!Number.isFinite(weightVal) || weightVal < 35 || weightVal > 250) {
      setFeedback({ type: 'error', text: t.genericErr });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const rawAdh = wkAdherence.trim() === '' ? 95 : Number(wkAdherence);
      const adherencePct = Number.isFinite(rawAdh)
        ? Math.min(100, Math.max(0, Math.round(rawAdh)))
        : 95;

      const response = await fetch(
        `/api/admin/portal-accounts/${encodeURIComponent(selectedAccountId)}/weeks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            startDateIso: wkStartDate.trim() || undefined,
            weightKg: weightVal,
            adherencePct,
            goalsSummary: wkGoals.trim() || undefined,
            coachNotes: wkCoachNote.trim() || undefined,
          }),
        }
      );
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      if (!response.ok) {
        setFeedback({ type: 'error', text: t.genericErr });
        return;
      }
      const data = (await response.json()) as {
        account: PortalAccountPublic;
        evictedWeekNumbers?: number[];
      };
      setAccounts((prev) =>
        prev.map((item) => (item.id === selectedAccountId ? data.account : item))
      );
      setWkWeight('');
      setWkStartDate('');
      setWkGoals('');
      setWkCoachNote('');

      const evMsg =
        data.evictedWeekNumbers && data.evictedWeekNumbers.length > 0
          ? ` (${t.weekEvictedSuffix} ${data.evictedWeekNumbers.join(', ')})`
          : '';
      setFeedback({ type: 'success', text: `${t.weekAddedOk}${evMsg}` });
    } catch {
      setFeedback({ type: 'error', text: t.genericErr });
    } finally {
      setBusy(false);
    }
  };

  const handleAdminDeleteWeek = async (weekId: string) => {
    if (!selectedAccountId) return;
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/portal-accounts/${encodeURIComponent(selectedAccountId)}/weeks/${encodeURIComponent(
          weekId
        )}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      if (res.status === 401) {
        onSessionExpired();
        return;
      }
      if (!res.ok) {
        setFeedback({ type: 'error', text: t.genericErr });
        return;
      }
      const data = (await res.json()) as { account: PortalAccountPublic };
      setAccounts((prev) =>
        prev.map((item) => (item.id === selectedAccountId ? data.account : item))
      );
    } catch {
      setFeedback({ type: 'error', text: t.genericErr });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadAthleteAccount = async (
    acc: PortalAccountPublic,
    format: 'json' | 'txt' | 'csv'
  ) => {
    const safeSlug = acc.username.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (format === 'csv') {
      const csv = formatPortalWeeksCsv(acc, lang);
      downloadTextFile(`athlete-${safeSlug}-16weeks.csv`, csv, 'text/csv;charset=utf-8');
      return;
    }

    try {
      const res = await fetch(`/api/admin/portal-accounts/${encodeURIComponent(acc.id)}/export`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onSessionExpired();
        return;
      }
      if (!res.ok) {
        setFeedback({ type: 'error', text: t.genericErr });
        return;
      }
      const exported = (await res.json()) as {
        account: PortalAccountPublic;
        chatMessages: PortalChatMessage[];
      };

      if (format === 'json') {
        downloadJsonFile(`athlete-${safeSlug}-full-account.json`, exported);
      } else {
        const txt = formatCoachingReportTxt(exported.account, exported.chatMessages, lang);
        downloadTextFile(`athlete-${safeSlug}-report.txt`, txt);
      }
    } catch {
      setFeedback({ type: 'error', text: t.genericErr });
    }
  };

  const activeDay = editor?.workoutDays[selectedWorkoutDayIdx] ?? editor?.workoutDays[0];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-[#E2F124] mb-1">
          <Users className="w-5 h-5" aria-hidden="true" />
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
        </div>
        <p className="text-xs sm:text-sm text-[#94A3B8]">{t.subtitle}</p>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-[#E2F124]/10 border-[#E2F124]/40 text-[#E2F124]'
              : 'bg-[#ffb4ab]/10 border-[#ffb4ab]/40 text-[#ffb4ab]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Create New Client Account Form */}
      <form
        onSubmit={handleCreateSubmit}
        noValidate
        className="rounded-xl bg-[#12161F] border border-white/10 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-[#E2F124]">
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          <h3>{t.createHeading}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="create-portal-username"
              className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
            >
              {t.usernameLabel}
            </label>
            <input
              id="create-portal-username"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={createDraft.username}
              onChange={(e) => {
                setCreateDraft((prev) => ({ ...prev, username: e.target.value }));
                if (createErrors.username) setCreateErrors((p) => ({ ...p, username: '' }));
              }}
              placeholder={t.usernamePh}
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
            />
            {createErrors.username && (
              <p className="mt-1 text-xs text-[#ffb4ab]">{createErrors.username}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="create-portal-password"
              className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
            >
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="create-portal-password"
                type={showCreatePw ? 'text' : 'password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={createDraft.password}
                onChange={(e) => {
                  setCreateDraft((prev) => ({ ...prev, password: e.target.value }));
                  if (createErrors.password) setCreateErrors((p) => ({ ...p, password: '' }));
                }}
                placeholder={t.passwordPh}
                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3.5 py-2.5 pe-10 text-sm text-white focus:outline-none focus:border-[#E2F124]"
              />
              <button
                type="button"
                onClick={() => setShowCreatePw((p) => !p)}
                className="absolute inset-y-0 end-2 px-1.5 flex items-center text-[#94A3B8] hover:text-white cursor-pointer"
              >
                {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {createErrors.password && (
              <p className="mt-1 text-xs text-[#ffb4ab]">{createErrors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="create-portal-display"
              className="block text-xs font-semibold text-[#CBD5E1] mb-1.5"
            >
              {t.displayLabel}
            </label>
            <input
              id="create-portal-display"
              type="text"
              value={createDraft.displayName}
              onChange={(e) => {
                setCreateDraft((prev) => ({ ...prev, displayName: e.target.value }));
                if (createErrors.displayName) setCreateErrors((p) => ({ ...p, displayName: '' }));
              }}
              placeholder={t.displayPh}
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
            />
            {createErrors.displayName && (
              <p className="mt-1 text-xs text-[#ffb4ab]">{createErrors.displayName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label htmlFor="create-portal-tier" className="block text-xs text-[#94A3B8] mb-1">
              {t.tierLabel}
            </label>
            <select
              id="create-portal-tier"
              value={createDraft.tierCode}
              onChange={(e) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  tierCode: e.target.value as PortalTierCode,
                }))
              }
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
            >
              <option value="CORE">CORE</option>
              <option value="PRO">PRO</option>
              <option value="ELITE">ELITE</option>
            </select>
          </div>
          <div>
            <label htmlFor="create-portal-cal" className="block text-xs text-[#94A3B8] mb-1">
              {t.calLabel}
            </label>
            <input
              id="create-portal-cal"
              type="number"
              value={createDraft.targetCalories}
              onChange={(e) =>
                setCreateDraft((prev) => ({ ...prev, targetCalories: e.target.value }))
              }
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-[#E2F124] font-bold tabular-metric focus:outline-none focus:border-[#E2F124]"
            />
          </div>
          <div>
            <label htmlFor="create-portal-pro" className="block text-xs text-[#94A3B8] mb-1">
              {t.proLabel}
            </label>
            <input
              id="create-portal-pro"
              type="number"
              value={createDraft.proteinGrams}
              onChange={(e) =>
                setCreateDraft((prev) => ({ ...prev, proteinGrams: e.target.value }))
              }
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
            />
          </div>
          <div>
            <label htmlFor="create-portal-carb" className="block text-xs text-[#94A3B8] mb-1">
              {t.carbLabel}
            </label>
            <input
              id="create-portal-carb"
              type="number"
              value={createDraft.carbsGrams}
              onChange={(e) => setCreateDraft((prev) => ({ ...prev, carbsGrams: e.target.value }))}
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
            />
          </div>
          <div>
            <label htmlFor="create-portal-fat" className="block text-xs text-[#94A3B8] mb-1">
              {t.fatLabel}
            </label>
            <input
              id="create-portal-fat"
              type="number"
              value={createDraft.fatsGrams}
              onChange={(e) => setCreateDraft((prev) => ({ ...prev, fatsGrams: e.target.value }))}
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
            />
          </div>
          <div>
            <label htmlFor="create-portal-wt" className="block text-xs text-[#94A3B8] mb-1">
              {t.initWeightLabel}
            </label>
            <input
              id="create-portal-wt"
              type="number"
              step="0.1"
              value={createDraft.initialWeightKg}
              onChange={(e) =>
                setCreateDraft((prev) => ({ ...prev, initialWeightKg: e.target.value }))
              }
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="create-portal-split" className="block text-xs text-[#94A3B8] mb-1">
              {t.splitLabel}
            </label>
            <input
              id="create-portal-split"
              type="text"
              value={createDraft.splitTitle}
              onChange={(e) => setCreateDraft((prev) => ({ ...prev, splitTitle: e.target.value }))}
              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold cursor-pointer btn-kinetic-primary disabled:opacity-60"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{busy ? t.creatingBtn : t.createBtn}</span>
        </button>
      </form>

      {/* Accounts Directory */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">
          {t.listHeading} ({accounts.length})
        </h3>

        {loading ? (
          <div className="p-6 rounded-xl bg-[#12161F] border border-white/10 text-sm text-[#94A3B8]">
            {t.loadingTxt}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#12161F] border border-dashed border-white/15 text-sm text-[#94A3B8]">
            {t.emptyTxt}
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              const isConfirmingDelete = confirmDeleteId === acc.id;

              return (
                <div
                  key={acc.id}
                  data-testid={`portal-account-card-${acc.username}`}
                  className={`rounded-xl bg-[#12161F] border p-5 space-y-5 ${
                    isSelected ? 'border-[#E2F124]/60' : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-white">{acc.displayName}</span>
                        <span
                          dir="ltr"
                          className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono text-[#E2F124]"
                        >
                          @{acc.username}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#E2F124]/15 text-[11px] font-bold text-[#E2F124]">
                          {acc.tierCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            acc.active
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-[#ffb4ab]/15 text-[#ffb4ab]'
                          }`}
                        >
                          {acc.active ? t.activeBadge : t.disabledBadge}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] tabular-metric">
                        {acc.targetCalories} kcal · {acc.proteinGrams}P/{acc.carbsGrams}C/
                        {acc.fatsGrams}F · {acc.workoutDays.length} days ·{' '}
                        {acc.weeklyRecords.length}/{MAX_PORTAL_WEEKS} wks
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          isSelected
                            ? (setSelectedAccountId(null), setEditor(null))
                            : openControlPanel(acc, 'credentials')
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold btn-kinetic-primary cursor-pointer"
                      >
                        <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{isSelected ? t.closeControlBtn : t.fullControlBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openControlPanel(acc, 'chat')}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold btn-kinetic-ghost cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#E2F124]" aria-hidden="true" />
                        <span>{t.chatBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDownloadAthleteAccount(acc, 'json')}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold btn-kinetic-ghost cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#CBD5E1]" aria-hidden="true" />
                        <span>{t.dlQuickBtn}</span>
                      </button>

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDeleteAccount(acc.id)}
                            className="rounded-lg px-3 py-2 text-xs font-bold bg-[#ffb4ab] text-[#2a0606] cursor-pointer"
                          >
                            {t.confirmDelYes}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold btn-kinetic-ghost cursor-pointer"
                          >
                            {t.cancelBtn}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(acc.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#ffb4ab] border border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.deleteBtn}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Full Control Sub-Workspace */}
                  {isSelected && editor && selectedAccount && (
                    <div className="pt-5 border-t border-white/10 space-y-5">
                      {/* Sub-navigation Tabs */}
                      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#161B26] border border-white/10">
                        {(
                          [
                            { id: 'credentials', label: t.tabCredentials, icon: KeyRound },
                            { id: 'goals', label: t.tabGoals, icon: Target },
                            { id: 'workouts', label: t.tabWorkouts, icon: Dumbbell },
                            { id: 'nutrition', label: t.tabNutrition, icon: Utensils },
                            { id: 'weeks16', label: t.tabWeeks, icon: Calendar },
                            { id: 'chat', label: t.tabChat, icon: MessageSquare },
                            { id: 'exports', label: t.tabExports, icon: Download },
                          ] as const
                        ).map((tab) => {
                          const Icon = tab.icon;
                          const active = controlTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setControlTab(tab.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                active
                                  ? 'bg-[#E2F124] text-[#12161F]'
                                  : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* SubTab 1: Credentials, Macros & Coach Directives */}
                      {controlTab === 'credentials' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-[#CBD5E1] mb-1">
                                {t.usernameLabel}
                              </label>
                              <input
                                type="text"
                                autoCapitalize="none"
                                value={editor.username}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, username: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                              />
                              {editErrors.username && (
                                <p className="mt-1 text-xs text-[#ffb4ab]">{editErrors.username}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-[#CBD5E1] mb-1">
                                {t.newPwLabel}
                              </label>
                              <div className="relative">
                                <input
                                  type={showEditPw ? 'text' : 'password'}
                                  autoCapitalize="none"
                                  value={editor.password}
                                  onChange={(e) =>
                                    setEditor((prev) =>
                                      prev ? { ...prev, password: e.target.value } : prev
                                    )
                                  }
                                  placeholder={t.newPwPh}
                                  className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 pe-9 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEditPw((p) => !p)}
                                  className="absolute inset-y-0 end-2 px-1 flex items-center text-[#94A3B8] hover:text-white cursor-pointer"
                                >
                                  {showEditPw ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              {editErrors.password && (
                                <p className="mt-1 text-xs text-[#ffb4ab]">{editErrors.password}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-[#CBD5E1] mb-1">
                                {t.displayLabel}
                              </label>
                              <input
                                type="text"
                                value={editor.displayName}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, displayName: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.statusLabel}
                              </label>
                              <select
                                value={editor.active ? 'active' : 'disabled'}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, active: e.target.value === 'active' } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E2F124]"
                              >
                                <option value="active">{t.statusActive}</option>
                                <option value="disabled">{t.statusDisabled}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.tierLabel}
                              </label>
                              <select
                                value={editor.tierCode}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev
                                      ? { ...prev, tierCode: e.target.value as PortalTierCode }
                                      : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                              >
                                <option value="CORE">CORE</option>
                                <option value="PRO">PRO</option>
                                <option value="ELITE">ELITE</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.calLabel}
                              </label>
                              <input
                                type="number"
                                value={editor.targetCalories}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, targetCalories: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-[#E2F124] font-bold tabular-metric"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.proLabel}
                              </label>
                              <input
                                type="number"
                                value={editor.proteinGrams}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, proteinGrams: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.carbLabel}
                              </label>
                              <input
                                type="number"
                                value={editor.carbsGrams}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, carbsGrams: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.fatLabel}
                              </label>
                              <input
                                type="number"
                                value={editor.fatsGrams}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev ? { ...prev, fatsGrams: e.target.value } : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-2 text-sm text-white tabular-metric"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-[#CBD5E1] mb-1">
                              {t.splitLabel}
                            </label>
                            <input
                              type="text"
                              value={editor.splitTitle}
                              onChange={(e) =>
                                setEditor((prev) =>
                                  prev ? { ...prev, splitTitle: e.target.value } : prev
                                )
                              }
                              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#CBD5E1] mb-1">
                              {t.coachNotesLabel}
                            </label>
                            <textarea
                              rows={3}
                              value={editor.coachNotes}
                              onChange={(e) =>
                                setEditor((prev) =>
                                  prev ? { ...prev, coachNotes: e.target.value } : prev
                                )
                              }
                              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* SubTab 2: Weekly Goals Editor */}
                      {controlTab === 'goals' && (
                        <div className="space-y-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setEditor((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        weeklyGoals: [
                                          ...prev.weeklyGoals,
                                          {
                                            id: `goal-${Date.now()}`,
                                            title:
                                              lang === 'en'
                                                ? 'New Weekly Target'
                                                : 'هدف أسبوعي جديد',
                                            targetMetric: '4 / 4',
                                            currentProgress: '',
                                            category: 'training',
                                            completed: false,
                                          },
                                        ],
                                      }
                                    : prev
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold bg-[#E2F124] text-[#12161F] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t.addGoalBtn}</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            {editor.weeklyGoals.map((goal, idx) => (
                              <div
                                key={goal.id}
                                className="rounded-xl bg-[#161B26] border border-white/10 p-4 space-y-3"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[11px] text-[#94A3B8] mb-1">
                                      {t.goalTitleLabel}
                                    </label>
                                    <input
                                      type="text"
                                      value={goal.title}
                                      onChange={(e) =>
                                        setEditor((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                weeklyGoals: prev.weeklyGoals.map((g, i) =>
                                                  i === idx ? { ...g, title: e.target.value } : g
                                                ),
                                              }
                                            : prev
                                        )
                                      }
                                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-[#94A3B8] mb-1">
                                      {t.goalMetricLabel}
                                    </label>
                                    <input
                                      type="text"
                                      value={goal.targetMetric}
                                      onChange={(e) =>
                                        setEditor((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                weeklyGoals: prev.weeklyGoals.map((g, i) =>
                                                  i === idx
                                                    ? { ...g, targetMetric: e.target.value }
                                                    : g
                                                ),
                                              }
                                            : prev
                                        )
                                      }
                                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-[#94A3B8] mb-1">
                                      {t.goalCatLabel}
                                    </label>
                                    <select
                                      value={goal.category}
                                      onChange={(e) =>
                                        setEditor((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                weeklyGoals: prev.weeklyGoals.map((g, i) =>
                                                  i === idx
                                                    ? {
                                                        ...g,
                                                        category: e.target
                                                          .value as PortalWeeklyGoal['category'],
                                                      }
                                                    : g
                                                ),
                                              }
                                            : prev
                                        )
                                      }
                                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white"
                                    >
                                      <option value="training">training</option>
                                      <option value="nutrition">nutrition</option>
                                      <option value="recovery">recovery</option>
                                      <option value="habit">habit</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <input
                                    type="text"
                                    value={goal.currentProgress}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              weeklyGoals: prev.weeklyGoals.map((g, i) =>
                                                i === idx
                                                  ? { ...g, currentProgress: e.target.value }
                                                  : g
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.goalProgLabel}
                                    className="flex-1 min-w-[180px] rounded-lg bg-[#12161F] border border-white/15 px-3 py-1.5 text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              weeklyGoals: prev.weeklyGoals.filter(
                                                (_, i) => i !== idx
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    className="text-xs font-semibold text-[#ffb4ab] hover:underline cursor-pointer"
                                  >
                                    {t.deleteBtn}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SubTab 3: Detailed Workout Days & Every Exercise */}
                      {controlTab === 'workouts' && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {editor.workoutDays.map((day, idx) => (
                                <button
                                  key={day.id}
                                  type="button"
                                  onClick={() => setSelectedWorkoutDayIdx(idx)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                    selectedWorkoutDayIdx === idx
                                      ? 'bg-[#E2F124] text-[#12161F]'
                                      : 'bg-[#161B26] text-[#CBD5E1] border border-white/10'
                                  }`}
                                >
                                  {day.label}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const nextNum = editor.workoutDays.length + 1;
                                setEditor((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        workoutDays: [
                                          ...prev.workoutDays,
                                          {
                                            id: `day-${Date.now()}`,
                                            label:
                                              lang === 'en'
                                                ? `Day ${nextNum}`
                                                : `اليوم ${nextNum}`,
                                            focus:
                                              lang === 'en'
                                                ? 'Custom Focus'
                                                : 'تركيز تدريبي مخصص',
                                            durationMinutes: 50,
                                            warmupNote: '',
                                            exercises: [],
                                          },
                                        ],
                                      }
                                    : prev
                                );
                                setSelectedWorkoutDayIdx(editor.workoutDays.length);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-[#E2F124] text-[#12161F] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t.addDayBtn}</span>
                            </button>
                          </div>

                          {activeDay && (
                            <div className="rounded-xl bg-[#161B26] border border-white/10 p-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                                    {t.dayLabel}
                                  </label>
                                  <input
                                    type="text"
                                    value={activeDay.label}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              workoutDays: prev.workoutDays.map((d, i) =>
                                                i === selectedWorkoutDayIdx
                                                  ? { ...d, label: e.target.value }
                                                  : d
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                                    {t.dayFocus}
                                  </label>
                                  <input
                                    type="text"
                                    value={activeDay.focus}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              workoutDays: prev.workoutDays.map((d, i) =>
                                                i === selectedWorkoutDayIdx
                                                  ? { ...d, focus: e.target.value }
                                                  : d
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                                    {t.dayDuration}
                                  </label>
                                  <input
                                    type="number"
                                    value={activeDay.durationMinutes}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              workoutDays: prev.workoutDays.map((d, i) =>
                                                i === selectedWorkoutDayIdx
                                                  ? {
                                                      ...d,
                                                      durationMinutes: Number.isFinite(v)
                                                        ? Math.max(0, Math.round(v))
                                                        : 0,
                                                    }
                                                  : d
                                              ),
                                            }
                                          : prev
                                      );
                                    }}
                                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white tabular-metric"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={activeDay.warmupNote}
                                  onChange={(e) =>
                                    setEditor((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            workoutDays: prev.workoutDays.map((d, i) =>
                                              i === selectedWorkoutDayIdx
                                                ? { ...d, warmupNote: e.target.value }
                                                : d
                                            ),
                                          }
                                        : prev
                                    )
                                  }
                                  placeholder={t.dayWarmup}
                                  className="flex-1 min-w-[220px] rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-xs text-white"
                                />
                                {editor.workoutDays.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              workoutDays: prev.workoutDays.filter(
                                                (_, i) => i !== selectedWorkoutDayIdx
                                              ),
                                            }
                                          : prev
                                      );
                                      setSelectedWorkoutDayIdx(0);
                                    }}
                                    className="text-xs font-semibold text-[#ffb4ab] hover:underline cursor-pointer"
                                  >
                                    {t.removeDayBtn}
                                  </button>
                                )}
                              </div>

                              {/* Exercises List */}
                              <div className="space-y-3 pt-2 border-t border-white/10">
                                {activeDay.exercises.map((ex, eIdx) => (
                                  <div
                                    key={ex.id}
                                    className="rounded-lg bg-[#12161F] border border-white/10 p-3.5 space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <input
                                        type="text"
                                        value={ex.name}
                                        onChange={(e) =>
                                          setEditor((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  workoutDays: prev.workoutDays.map((d, dI) =>
                                                    dI === selectedWorkoutDayIdx
                                                      ? {
                                                          ...d,
                                                          exercises: d.exercises.map((item, i) =>
                                                            i === eIdx
                                                              ? { ...item, name: e.target.value }
                                                              : item
                                                          ),
                                                        }
                                                      : d
                                                  ),
                                                }
                                              : prev
                                          )
                                        }
                                        placeholder={t.exName}
                                        className="flex-1 rounded-lg bg-[#161B26] border border-white/15 px-3 py-1.5 text-sm font-bold text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditor((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  workoutDays: prev.workoutDays.map((d, dI) =>
                                                    dI === selectedWorkoutDayIdx
                                                      ? {
                                                          ...d,
                                                          exercises: d.exercises.filter(
                                                            (_, i) => i !== eIdx
                                                          ),
                                                        }
                                                      : d
                                                  ),
                                                }
                                              : prev
                                          )
                                        }
                                        className="text-xs text-[#ffb4ab] hover:underline cursor-pointer"
                                      >
                                        {t.deleteBtn}
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                                      <div>
                                        <label className="block text-[10px] text-[#94A3B8]">
                                          {t.exSets}
                                        </label>
                                        <input
                                          type="number"
                                          value={ex.sets}
                                          onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setEditor((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    workoutDays: prev.workoutDays.map((d, dI) =>
                                                      dI === selectedWorkoutDayIdx
                                                        ? {
                                                            ...d,
                                                            exercises: d.exercises.map((item, i) =>
                                                              i === eIdx
                                                                ? {
                                                                    ...item,
                                                                    sets: Number.isFinite(v)
                                                                      ? Math.max(1, Math.round(v))
                                                                      : 1,
                                                                  }
                                                                : item
                                                            ),
                                                          }
                                                        : d
                                                    ),
                                                  }
                                                : prev
                                            );
                                          }}
                                          className="w-full rounded bg-[#161B26] border border-white/15 px-2 py-1.5 text-xs text-white tabular-metric"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-[#94A3B8]">
                                          {t.exReps}
                                        </label>
                                        <input
                                          type="text"
                                          value={ex.reps}
                                          onChange={(e) =>
                                            setEditor((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    workoutDays: prev.workoutDays.map((d, dI) =>
                                                      dI === selectedWorkoutDayIdx
                                                        ? {
                                                            ...d,
                                                            exercises: d.exercises.map((item, i) =>
                                                              i === eIdx
                                                                ? { ...item, reps: e.target.value }
                                                                : item
                                                            ),
                                                          }
                                                        : d
                                                    ),
                                                  }
                                                : prev
                                            )
                                          }
                                          className="w-full rounded bg-[#161B26] border border-white/15 px-2 py-1.5 text-xs text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-[#94A3B8]">
                                          {t.exRest}
                                        </label>
                                        <input
                                          type="number"
                                          value={ex.restSeconds}
                                          onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setEditor((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    workoutDays: prev.workoutDays.map((d, dI) =>
                                                      dI === selectedWorkoutDayIdx
                                                        ? {
                                                            ...d,
                                                            exercises: d.exercises.map((item, i) =>
                                                              i === eIdx
                                                                ? {
                                                                    ...item,
                                                                    restSeconds: Number.isFinite(v)
                                                                      ? Math.max(0, Math.round(v))
                                                                      : 0,
                                                                  }
                                                                : item
                                                            ),
                                                          }
                                                        : d
                                                    ),
                                                  }
                                                : prev
                                            );
                                          }}
                                          className="w-full rounded bg-[#161B26] border border-white/15 px-2 py-1.5 text-xs text-white tabular-metric"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-[#94A3B8]">
                                          {t.exWeight}
                                        </label>
                                        <input
                                          type="text"
                                          value={ex.weightKg}
                                          onChange={(e) =>
                                            setEditor((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    workoutDays: prev.workoutDays.map((d, dI) =>
                                                      dI === selectedWorkoutDayIdx
                                                        ? {
                                                            ...d,
                                                            exercises: d.exercises.map((item, i) =>
                                                              i === eIdx
                                                                ? {
                                                                    ...item,
                                                                    weightKg: e.target.value,
                                                                  }
                                                                : item
                                                            ),
                                                          }
                                                        : d
                                                    ),
                                                  }
                                                : prev
                                            )
                                          }
                                          className="w-full rounded bg-[#161B26] border border-white/15 px-2 py-1.5 text-xs text-[#E2F124]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-[#94A3B8]">
                                          {t.exRpe}
                                        </label>
                                        <input
                                          type="text"
                                          value={ex.targetRpe}
                                          onChange={(e) =>
                                            setEditor((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    workoutDays: prev.workoutDays.map((d, dI) =>
                                                      dI === selectedWorkoutDayIdx
                                                        ? {
                                                            ...d,
                                                            exercises: d.exercises.map((item, i) =>
                                                              i === eIdx
                                                                ? {
                                                                    ...item,
                                                                    targetRpe: e.target.value,
                                                                  }
                                                                : item
                                                            ),
                                                          }
                                                        : d
                                                    ),
                                                  }
                                                : prev
                                            )
                                          }
                                          className="w-full rounded bg-[#161B26] border border-white/15 px-2 py-1.5 text-xs text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-[#94A3B8]">
                                          {t.exTempo}
                                        </label>
                                        <input
                                          type="text"
                                          value={ex.tempo}
                                          onChange={(e) =>
                                            setEditor((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    workoutDays: prev.workoutDays.map((d, dI) =>
                                                      dI === selectedWorkoutDayIdx
                                                        ? {
                                                            ...d,
                                                            exercises: d.exercises.map((item, i) =>
                                                              i === eIdx
                                                                ? { ...item, tempo: e.target.value }
                                                                : item
                                                            ),
                                                          }
                                                        : d
                                                    ),
                                                  }
                                                : prev
                                            )
                                          }
                                          className="w-full rounded bg-[#161B26] border border-white/15 px-2 py-1.5 text-xs text-white"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={ex.notes}
                                        onChange={(e) =>
                                          setEditor((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  workoutDays: prev.workoutDays.map((d, dI) =>
                                                    dI === selectedWorkoutDayIdx
                                                      ? {
                                                          ...d,
                                                          exercises: d.exercises.map((item, i) =>
                                                            i === eIdx
                                                              ? { ...item, notes: e.target.value }
                                                              : item
                                                          ),
                                                        }
                                                      : d
                                                  ),
                                                }
                                              : prev
                                          )
                                        }
                                        placeholder={t.exNotes}
                                        className="rounded bg-[#161B26] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                      />
                                      <input
                                        type="text"
                                        value={ex.videoCue}
                                        onChange={(e) =>
                                          setEditor((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  workoutDays: prev.workoutDays.map((d, dI) =>
                                                    dI === selectedWorkoutDayIdx
                                                      ? {
                                                          ...d,
                                                          exercises: d.exercises.map((item, i) =>
                                                            i === eIdx
                                                              ? { ...item, videoCue: e.target.value }
                                                              : item
                                                          ),
                                                        }
                                                      : d
                                                  ),
                                                }
                                              : prev
                                          )
                                        }
                                        placeholder={t.exCue}
                                        className="rounded bg-[#161B26] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                      />
                                    </div>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditor((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            workoutDays: prev.workoutDays.map((d, i) =>
                                              i === selectedWorkoutDayIdx
                                                ? {
                                                    ...d,
                                                    exercises: [
                                                      ...d.exercises,
                                                      {
                                                        id: `ex-${Date.now()}`,
                                                        name:
                                                          lang === 'en'
                                                            ? 'New Exercise'
                                                            : 'تمرين جديد',
                                                        sets: 3,
                                                        reps: '10 - 12',
                                                        restSeconds: 90,
                                                        weightKg: '60 كجم',
                                                        targetRpe: 'RPE 8',
                                                        tempo: '3-1-1-0',
                                                        notes: '',
                                                        videoCue: '',
                                                      },
                                                    ],
                                                  }
                                                : d
                                            ),
                                          }
                                        : prev
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold btn-kinetic-ghost cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#E2F124]" aria-hidden="true" />
                                  <span>{t.addExerciseBtn}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SubTab 4: Nutrition Meal Plan & Supplements */}
                      {controlTab === 'nutrition' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.waterLabel}
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={editor.nutritionPlan.dailyWaterLiters}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          nutritionPlan: {
                                            ...prev.nutritionPlan,
                                            dailyWaterLiters: Number.isFinite(v)
                                              ? Math.max(0, v)
                                              : 0,
                                          },
                                        }
                                      : prev
                                  );
                                }}
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.sleepLabel}
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={editor.nutritionPlan.sleepHoursTarget}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          nutritionPlan: {
                                            ...prev.nutritionPlan,
                                            sleepHoursTarget: Number.isFinite(v)
                                              ? Math.max(0, v)
                                              : 0,
                                          },
                                        }
                                      : prev
                                  );
                                }}
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.stepsLabel}
                              </label>
                              <input
                                type="number"
                                value={editor.nutritionPlan.stepsTarget}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          nutritionPlan: {
                                            ...prev.nutritionPlan,
                                            stepsTarget: Number.isFinite(v)
                                              ? Math.max(0, Math.round(v))
                                              : 0,
                                          },
                                        }
                                      : prev
                                  );
                                }}
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.mealTimingLabel}
                              </label>
                              <input
                                type="text"
                                value={editor.nutritionPlan.mealTimingNote}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          nutritionPlan: {
                                            ...prev.nutritionPlan,
                                            mealTimingNote: e.target.value,
                                          },
                                        }
                                      : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[#94A3B8] mb-1">
                                {t.nutNotesLabel}
                              </label>
                              <input
                                type="text"
                                value={editor.nutritionPlan.coachNutritionNotes}
                                onChange={(e) =>
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          nutritionPlan: {
                                            ...prev.nutritionPlan,
                                            coachNutritionNotes: e.target.value,
                                          },
                                        }
                                      : prev
                                  )
                                }
                                className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-xs text-white"
                              />
                            </div>
                          </div>

                          {/* Meals List */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                                <span>{t.mealsHeading}</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          nutritionPlan: {
                                            ...prev.nutritionPlan,
                                            meals: [
                                              ...prev.nutritionPlan.meals,
                                              {
                                                id: `meal-${Date.now()}`,
                                                timeLabel: '04:00 PM',
                                                title:
                                                  lang === 'en' ? 'New Meal' : 'وجبة جديدة',
                                                ingredients: '',
                                                calories: 500,
                                                proteinGrams: 40,
                                                carbsGrams: 50,
                                                fatsGrams: 12,
                                                notes: '',
                                              },
                                            ],
                                          },
                                        }
                                      : prev
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold bg-[#E2F124] text-[#12161F] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.addMealBtn}</span>
                              </button>
                            </div>

                            {editor.nutritionPlan.meals.map((meal, idx) => (
                              <div
                                key={meal.id}
                                className="rounded-xl bg-[#161B26] border border-white/10 p-4 space-y-2.5"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                  <input
                                    type="text"
                                    value={meal.timeLabel}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx ? { ...m, timeLabel: e.target.value } : m
                                                ),
                                              },
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.mealTime}
                                    className="rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-[#E2F124]"
                                  />
                                  <input
                                    type="text"
                                    value={meal.title}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx ? { ...m, title: e.target.value } : m
                                                ),
                                              },
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.mealTitle}
                                    className="sm:col-span-2 rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs font-bold text-white"
                                  />
                                  <input
                                    type="number"
                                    value={meal.calories}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx
                                                    ? { ...m, calories: Number.isFinite(v) ? Math.max(0, v) : 0 }
                                                    : m
                                                ),
                                              },
                                            }
                                          : prev
                                      );
                                    }}
                                    placeholder={t.mealCals}
                                    className="rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-white tabular-metric"
                                  />
                                </div>
                                <textarea
                                  rows={2}
                                  value={meal.ingredients}
                                  onChange={(e) =>
                                    setEditor((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            nutritionPlan: {
                                              ...prev.nutritionPlan,
                                              meals: prev.nutritionPlan.meals.map((m, i) =>
                                                i === idx
                                                  ? { ...m, ingredients: e.target.value }
                                                  : m
                                              ),
                                            },
                                          }
                                        : prev
                                    )
                                  }
                                  placeholder={t.mealFoods}
                                  className="w-full rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="number"
                                    value={meal.proteinGrams}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx
                                                    ? {
                                                        ...m,
                                                        proteinGrams: Number.isFinite(v) ? Math.max(0, v) : 0,
                                                      }
                                                    : m
                                                ),
                                              },
                                            }
                                          : prev
                                      );
                                    }}
                                    className="w-20 rounded bg-[#12161F] border border-white/15 px-2 py-1 text-xs text-white tabular-metric"
                                    aria-label={t.proLabel}
                                  />
                                  <input
                                    type="number"
                                    value={meal.carbsGrams}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx
                                                    ? {
                                                        ...m,
                                                        carbsGrams: Number.isFinite(v) ? Math.max(0, v) : 0,
                                                      }
                                                    : m
                                                ),
                                              },
                                            }
                                          : prev
                                      );
                                    }}
                                    className="w-20 rounded bg-[#12161F] border border-white/15 px-2 py-1 text-xs text-white tabular-metric"
                                    aria-label={t.carbLabel}
                                  />
                                  <input
                                    type="number"
                                    value={meal.fatsGrams}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx
                                                    ? {
                                                        ...m,
                                                        fatsGrams: Number.isFinite(v) ? Math.max(0, v) : 0,
                                                      }
                                                    : m
                                                ),
                                              },
                                            }
                                          : prev
                                      );
                                    }}
                                    className="w-20 rounded bg-[#12161F] border border-white/15 px-2 py-1 text-xs text-white tabular-metric"
                                    aria-label={t.fatLabel}
                                  />
                                  <input
                                    type="text"
                                    value={meal.notes}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.map((m, i) =>
                                                  i === idx ? { ...m, notes: e.target.value } : m
                                                ),
                                              },
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.mealNotes}
                                    className="flex-1 min-w-[140px] rounded bg-[#12161F] border border-white/15 px-2.5 py-1 text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              nutritionPlan: {
                                                ...prev.nutritionPlan,
                                                meals: prev.nutritionPlan.meals.filter(
                                                  (_, i) => i !== idx
                                                ),
                                              },
                                            }
                                          : prev
                                      )
                                    }
                                    className="text-xs text-[#ffb4ab] hover:underline cursor-pointer"
                                  >
                                    {t.deleteBtn}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Supplements & Add-ons */}
                          <div className="space-y-3 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Pill className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                                <span>{t.supHeading}</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditor((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          supplements: [
                                            ...prev.supplements,
                                            {
                                              id: `sup-${Date.now()}`,
                                              name:
                                                lang === 'en'
                                                  ? 'New Supplement'
                                                  : 'مكمل أو إضافة جديدة',
                                              dosage: '5g',
                                              timing: '',
                                              purpose: '',
                                              notes: '',
                                            },
                                          ],
                                        }
                                      : prev
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold bg-[#E2F124] text-[#12161F] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.addSupBtn}</span>
                              </button>
                            </div>

                            {editor.supplements.map((sup, idx) => (
                              <div
                                key={sup.id}
                                className="rounded-xl bg-[#161B26] border border-white/10 p-4 space-y-2"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={sup.name}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              supplements: prev.supplements.map((s, i) =>
                                                i === idx ? { ...s, name: e.target.value } : s
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.supName}
                                    className="rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs font-bold text-white"
                                  />
                                  <input
                                    type="text"
                                    value={sup.dosage}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              supplements: prev.supplements.map((s, i) =>
                                                i === idx ? { ...s, dosage: e.target.value } : s
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.supDosage}
                                    className="rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-[#E2F124]"
                                  />
                                  <input
                                    type="text"
                                    value={sup.timing}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              supplements: prev.supplements.map((s, i) =>
                                                i === idx ? { ...s, timing: e.target.value } : s
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.supTiming}
                                    className="rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={sup.purpose}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              supplements: prev.supplements.map((s, i) =>
                                                i === idx ? { ...s, purpose: e.target.value } : s
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.supPurpose}
                                    className="flex-1 min-w-[160px] rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={sup.notes}
                                    onChange={(e) =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              supplements: prev.supplements.map((s, i) =>
                                                i === idx ? { ...s, notes: e.target.value } : s
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    placeholder={t.supNotes}
                                    className="flex-1 min-w-[160px] rounded bg-[#12161F] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditor((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              supplements: prev.supplements.filter(
                                                (_, i) => i !== idx
                                              ),
                                            }
                                          : prev
                                      )
                                    }
                                    className="text-xs text-[#ffb4ab] hover:underline cursor-pointer"
                                  >
                                    {t.deleteBtn}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Save All Changes Bar for tabs 1..4 */}
                      {(controlTab === 'credentials' ||
                        controlTab === 'goals' ||
                        controlTab === 'workouts' ||
                        controlTab === 'nutrition') && (
                        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSaveFullAccount()}
                            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs sm:text-sm font-bold btn-kinetic-primary cursor-pointer disabled:opacity-60"
                          >
                            <Save className="w-4 h-4" aria-hidden="true" />
                            <span>{busy ? t.savingBtn : t.saveAllBtn}</span>
                          </button>
                        </div>
                      )}

                      {/* SubTab 5: 16-Week Gregorian + Hijri Tracker */}
                      {controlTab === 'weeks16' && (
                        <div className="space-y-4">
                          <form
                            onSubmit={handleAdminAddWeek}
                            className="rounded-xl bg-[#161B26] border border-white/10 p-4 space-y-3"
                          >
                            <p className="text-xs font-bold text-[#E2F124]">{t.addWeekHeading}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <input
                                type="number"
                                step="0.1"
                                value={wkWeight}
                                onChange={(e) => setWkWeight(e.target.value)}
                                placeholder={t.initWeightLabel}
                                className="rounded bg-[#12161F] border border-white/15 px-3 py-2 text-xs text-white tabular-metric"
                              />
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={wkAdherence}
                                onChange={(e) => setWkAdherence(e.target.value)}
                                placeholder="Adherence %"
                                className="rounded bg-[#12161F] border border-white/15 px-3 py-2 text-xs text-white tabular-metric"
                              />
                              <input
                                type="date"
                                value={wkStartDate}
                                onChange={(e) => setWkStartDate(e.target.value)}
                                aria-label={t.weekStartOpt}
                                className="rounded bg-[#12161F] border border-white/15 px-3 py-2 text-xs text-white tabular-metric"
                              />
                              <button
                                type="submit"
                                disabled={busy}
                                className="rounded-lg px-3 py-2 text-xs font-bold btn-kinetic-primary cursor-pointer"
                              >
                                {t.addWeekBtn}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={wkGoals}
                                onChange={(e) => setWkGoals(e.target.value)}
                                placeholder={t.weekGoalsPh}
                                className="rounded bg-[#12161F] border border-white/15 px-3 py-2 text-xs text-white"
                              />
                              <input
                                type="text"
                                value={wkCoachNote}
                                onChange={(e) => setWkCoachNote(e.target.value)}
                                placeholder={t.weekCoachPh}
                                className="rounded bg-[#12161F] border border-white/15 px-3 py-2 text-xs text-white"
                              />
                            </div>
                          </form>

                          <div className="space-y-2.5 max-h-80 overflow-y-auto">
                            {[...selectedAccount.weeklyRecords].reverse().map((wk) => (
                              <div
                                key={wk.id}
                                className="rounded-xl bg-[#161B26] border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2 font-bold">
                                    <span className="text-[#E2F124]">#{wk.weekNumber}</span>
                                    <span className="text-white">{wk.weightKg} kg</span>
                                    <span className="text-[#94A3B8]">
                                      · {wk.adherencePct}% ·{' '}
                                      {lang === 'en' ? wk.gregorianRangeEn : wk.gregorianRangeAr}
                                    </span>
                                  </div>
                                  <div className="text-[#CBD5E1]">
                                    {lang === 'en' ? wk.hijriRangeEn : wk.hijriRangeAr}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleAdminDeleteWeek(wk.id)}
                                  className="text-[#ffb4ab] hover:underline font-semibold cursor-pointer shrink-0"
                                >
                                  {t.deleteBtn}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SubTab 6: Direct WebSocket Chat */}
                      {controlTab === 'chat' && (
                        <PortalChatPanel
                          lang={lang}
                          role="admin"
                          token={adminToken}
                          accountId={selectedAccount.id}
                          peerLabel={`${selectedAccount.displayName} (@${selectedAccount.username})`}
                          onAuthExpired={onSessionExpired}
                        />
                      )}

                      {/* SubTab 7: Download This Athlete Account */}
                      {controlTab === 'exports' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              void handleDownloadAthleteAccount(selectedAccount, 'json')
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold btn-kinetic-primary cursor-pointer"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                            <span>{t.dlJsonBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownloadAthleteAccount(selectedAccount, 'txt')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold btn-kinetic-ghost cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
                            <span>{t.dlReportBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownloadAthleteAccount(selectedAccount, 'csv')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold btn-kinetic-ghost cursor-pointer"
                          >
                            <FileSpreadsheet
                              className="w-4 h-4 text-[#E2F124]"
                              aria-hidden="true"
                            />
                            <span>{t.dlCsvBtn}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
