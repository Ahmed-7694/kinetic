import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  Dumbbell,
  HelpCircle,
  LayoutTemplate,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import type { Language } from '../utils/coachingMath';
import {
  getDefaultSiteContentBundle,
  sanitizeWhatsAppNumber,
  type SiteContentBundle,
  type SiteLocaleContent,
} from '../utils/cmsSchema';
import { downloadJsonFile } from '../utils/downloadFile';
import { AdminPortalAccountsPanel } from './AdminPortalAccountsPanel';

type CmsSectionTab =
  | 'hero'
  | 'programs'
  | 'transformations'
  | 'coach'
  | 'pricing'
  | 'faq'
  | 'accounts';

interface AdminCmsScreenProps {
  lang: Language;
  adminUsername: string;
  adminToken: string;
  contentBundle: SiteContentBundle;
  onSaveContent: (updated: SiteContentBundle) => Promise<{ ok: boolean; error?: string }>;
  onResetContent: () => Promise<{ ok: boolean; error?: string }>;
  onBackToSite: () => void;
  onSignOut: () => void;
  onSessionExpired: () => void;
}

export function AdminCmsScreen({
  lang,
  adminUsername,
  adminToken,
  contentBundle,
  onSaveContent,
  onResetContent,
  onBackToSite,
  onSignOut,
  onSessionExpired,
}: AdminCmsScreenProps) {
  const [editLocale, setEditLocale] = useState<Language>(lang);
  const [activeTab, setActiveTab] = useState<CmsSectionTab>('hero');
  const [draft, setDraft] = useState<SiteContentBundle>(contentBundle);
  const [selectedProgramIdx, setSelectedProgramIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setDraft(contentBundle);
  }, [contentBundle]);

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  const activeLocaleContent = draft[editLocale];

  const updateLocaleField = (updater: (prev: SiteLocaleContent) => SiteLocaleContent) => {
    setDraft((prev) => ({
      ...prev,
      [editLocale]: updater(prev[editLocale]),
    }));
  };

  const t =
    lang === 'en'
      ? {
          breadcrumb: 'Administration / Site Content Manager',
          title: 'Manage Site Content',
          signedInAs: 'Signed in as:',
          editingLangLabel: 'Editing Language:',
          langAr: 'Arabic Content',
          langEn: 'English Content',
          backBtn: 'Back to Live Site',
          saveBtn: 'Save & Publish Changes',
          savingBtn: 'Saving...',
          signOutBtn: 'Sign Out',
          resetBtn: 'Reset All to Defaults',
          confirmResetMsg: 'Confirm restoring original default text and prices?',
          confirmResetYes: 'Yes, Restore Defaults',
          cancelBtn: 'Cancel',
          savedOk: 'Changes saved and published to the live website.',
          resetOk: 'Default website content has been restored.',
          saveErr: 'Could not save changes. Your session may have expired.',
          exportHeading: 'Download & Backup',
          dlSiteBtn: 'Download Site Content (JSON)',
          dlAdminAllBtn: 'Download Full CMS + Accounts Backup',
          dlSectionBtn: 'Download Current Locale Section',
          navHero: 'Hero & KPIs',
          navPrograms: 'Training Tracks',
          navTransformations: 'Transformations',
          navCoach: 'Coach Profile',
          navPricing: 'Pricing Tiers',
          navFaq: 'FAQ & WhatsApp',
          navAccounts: 'Portal Accounts',
          heroSecTitle: 'Hero Section & Key Metrics',
          eyebrowLabel: 'Top Kicker / Eyebrow',
          h1Label: 'Main Headline (H1)',
          subLabel: 'Supporting Description',
          ctaPrimaryLabel: 'Primary Button Label',
          ctaSecondaryLabel: 'Secondary Button Label',
          trustLabel: 'Bottom Trust Line',
          kpisHeading: '4 Hero KPI Cards',
          kpiVal: 'Metric Value',
          kpiDesc: 'Metric Label',
          progSecTitle: 'Training Programs & Tracks',
          progTitle: 'Track Title',
          progCode: 'Track Code',
          progSummary: 'Summary',
          progDuration: 'Duration',
          progFreq: 'Sessions / Week',
          progLen: 'Session Length',
          progOutcomes: 'Key Outcomes (one per line)',
          transSecTitle: 'Client Transformation Stories',
          addTransBtn: 'Add Transformation Story',
          deleteItem: 'Delete',
          clientName: 'Client Name',
          cityRole: 'City & Role',
          goalCat: 'Category',
          catFatLoss: 'Fat Loss',
          catMuscle: 'Muscle Gain',
          goalLabel: 'Goal Tag',
          weeksLabel: 'Timeframe (Weeks)',
          startW: 'Start Weight (kg)',
          endW: 'End Weight (kg)',
          netDelta: 'Net Result Label',
          programUsed: 'Program Used',
          quoteLabel: 'Client Quote',
          coachSecTitle: 'Head Coach Profile & Weekly Split',
          coachName: 'Coach Name',
          coachTitle: 'Title / Specialty',
          coachCreds: 'Credentials & Experience',
          coachBio: 'Biography',
          splitHeading: 'Weekly Split Preview Items',
          splitDay: 'Day',
          splitFocus: 'Session Focus',
          tierSecTitle: 'Coaching Tiers & Monthly Pricing',
          tierName: 'Plan Name',
          tierTagline: 'Tagline',
          tierPrice: 'Monthly Price (SAR)',
          tierBadge: 'Featured Badge Label',
          tierCta: 'CTA Button Label',
          tierDeliverables: 'Deliverables (one per line)',
          faqSecTitle: 'FAQ Items & WhatsApp Dispatch Number',
          waLabel: 'Target WhatsApp Number (shared across Arabic & English)',
          waHint: 'International digits without + (e.g. 201508952844)',
          addFaqBtn: 'Add FAQ Item',
          faqQ: 'Question',
          faqA: 'Answer',
        }
      : {
          breadcrumb: 'لوحة التحكم / إدارة محتوى الموقع',
          title: 'إدارة محتوى الموقع',
          signedInAs: 'الحساب المسجل:',
          editingLangLabel: 'تعديل محتوى النسخة:',
          langAr: 'المحتوى العربي',
          langEn: 'المحتوى الإنجليزي',
          backBtn: 'العودة للموقع',
          saveBtn: 'حفظ ونشر التعديلات',
          savingBtn: 'جارٍ الحفظ...',
          signOutBtn: 'تسجيل الخروج',
          resetBtn: 'استعادة المحتوى الافتراضي',
          confirmResetMsg: 'هل تريد تأكيد استعادة جميع النصوص والأسعار الافتراضية؟',
          confirmResetYes: 'نعم، استعادة الافتراضي',
          cancelBtn: 'إلغاء',
          savedOk: 'تم حفظ التعديلات وتحديث محتوى الموقع بنجاح.',
          resetOk: 'تمت استعادة المحتوى الافتراضي للموقع بنجاح.',
          saveErr: 'تعذر حفظ التعديلات. قد تكون الجلسة انتهت، أعد تسجيل الدخول.',
          exportHeading: 'تنزيل المحتوى والنسخ الاحتياطي',
          dlSiteBtn: 'تنزيل محتوى الموقع بالكامل (JSON)',
          dlAdminAllBtn: 'تنزيل صفحة الإدارة + كل الحسابات (JSON)',
          dlSectionBtn: 'تنزيل محتوى القسم الحالي فقط',
          navHero: 'الواجهة الرئيسية والنتائج',
          navPrograms: 'المسارات التدريبية',
          navTransformations: 'قصص التحول',
          navCoach: 'نبذة المدرب',
          navPricing: 'الباقات والأسعار',
          navFaq: 'الأسئلة الشائعة والواتساب',
          navAccounts: 'حسابات بوابة المتدرب',
          heroSecTitle: 'محتوى الواجهة الرئيسية ومؤشرات الأداء',
          eyebrowLabel: 'العنوان الفرعي العلوي',
          h1Label: 'العنوان الرئيسي (H1)',
          subLabel: 'النص التوضيحي أسفل العنوان',
          ctaPrimaryLabel: 'نص الزر الرئيسي',
          ctaSecondaryLabel: 'نص الزر الثانوي',
          trustLabel: 'شريط الثقة أسفل الأزرار',
          kpisHeading: 'بطاقات المؤشرات الأربع (KPIs)',
          kpiVal: 'القيمة الرقمية',
          kpiDesc: 'وصف المؤشر',
          progSecTitle: 'إدارة المسارات والبرامج التدريبية',
          progTitle: 'اسم المسار',
          progCode: 'الكود التعريفي',
          progSummary: 'وصف المسار',
          progDuration: 'المدة',
          progFreq: 'عدد الحصص أسبوعياً',
          progLen: 'مدة الحصة',
          progOutcomes: 'النتائج المتوقعة (سطر لكل نقطة)',
          transSecTitle: 'إدارة قصص التحول الموثقة',
          addTransBtn: 'إضافة قصة تحول جديدة',
          deleteItem: 'حذف',
          clientName: 'اسم المشترك',
          cityRole: 'المهنة والمدينة',
          goalCat: 'التصنيف',
          catFatLoss: 'التنشيف وحرق الدهون',
          catMuscle: 'البناء العضلي',
          goalLabel: 'وسم الهدف',
          weeksLabel: 'المدة (أسابيع)',
          startW: 'وزن البداية (كجم)',
          endW: 'الوزن الحالي (كجم)',
          netDelta: 'صافي التغيير',
          programUsed: 'البرنامج المستخدم',
          quoteLabel: 'رأي المشترك',
          coachSecTitle: 'بيانات المدرب والجدول الأسبوعي',
          coachName: 'اسم المدرب',
          coachTitle: 'المسمى التخصصي',
          coachCreds: 'الشهادات والخبرة',
          coachBio: 'النبذة التعريفية',
          splitHeading: 'عناصر نموذج الجدول الأسبوعي',
          splitDay: 'اليوم',
          splitFocus: 'تركيز التمرين',
          tierSecTitle: 'باقات الاشتراك والأسعار الشهرية',
          tierName: 'اسم الباقة',
          tierTagline: 'الوصف المختصر',
          tierPrice: 'السعر الشهري (ر.س)',
          tierBadge: 'شارة التمييز',
          tierCta: 'نص زر الاشتراك',
          tierDeliverables: 'المميزات المشمولة (سطر لكل ميزة)',
          faqSecTitle: 'الأسئلة الشائعة ورقم الواتساب',
          waLabel: 'رقم الواتساب المستلم للرسائل (مشترك للنسختين العربية والإنجليزية)',
          waHint: 'أرقام دولية بدون علامة + (مثال: 201508952844)',
          addFaqBtn: 'إضافة سؤال شائع',
          faqQ: 'السؤال',
          faqA: 'الإجابة',
        };

  const navItems: { id: CmsSectionTab; label: string; icon: typeof LayoutTemplate }[] = [
    { id: 'accounts', label: t.navAccounts, icon: Users },
    { id: 'hero', label: t.navHero, icon: LayoutTemplate },
    { id: 'programs', label: t.navPrograms, icon: Dumbbell },
    { id: 'transformations', label: t.navTransformations, icon: Trophy },
    { id: 'coach', label: t.navCoach, icon: UserCheck },
    { id: 'pricing', label: t.navPricing, icon: CreditCard },
    { id: 'faq', label: t.navFaq, icon: HelpCircle },
  ];

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    const cleanedBundle: SiteContentBundle = {
      ...draft,
      whatsappNumber: sanitizeWhatsAppNumber(draft.whatsappNumber),
    };
    const res = await onSaveContent(cleanedBundle);
    setSaving(false);
    if (res.ok) {
      setDraft(cleanedBundle);
      setStatusMessage({ type: 'success', text: t.savedOk });
    } else {
      setStatusMessage({ type: 'error', text: res.error || t.saveErr });
    }
  };

  const handleConfirmReset = async () => {
    setSaving(true);
    setStatusMessage(null);
    const res = await onResetContent();
    setSaving(false);
    setConfirmReset(false);
    if (res.ok) {
      setDraft(getDefaultSiteContentBundle());
      setStatusMessage({ type: 'success', text: t.resetOk });
    } else {
      setStatusMessage({ type: 'error', text: res.error || t.saveErr });
    }
  };

  const handleDownloadSiteContent = () => {
    downloadJsonFile('kinetic-peak-site-content.json', {
      exportedAt: new Date().toISOString(),
      whatsappNumber: sanitizeWhatsAppNumber(draft.whatsappNumber),
      ar: draft.ar,
      en: draft.en,
    });
  };

  const handleDownloadFullAdminBackup = async () => {
    try {
      const res = await fetch('/api/admin/export', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        onSessionExpired();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      downloadJsonFile('kinetic-peak-admin-full-backup.json', data);
    } catch {
      setStatusMessage({ type: 'error', text: t.saveErr });
    }
  };

  const activeProgram =
    activeLocaleContent.programs[selectedProgramIdx] ?? activeLocaleContent.programs[0];

  return (
    <main className="min-h-screen bg-[#0f131c] py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Workspace Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
          <div>
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#94A3B8] hover:text-[#E2F124] cursor-pointer mb-2"
            >
              <BackArrow className="w-4 h-4" aria-hidden="true" />
              <span>{t.backBtn}</span>
            </button>
            <p className="text-xs font-semibold text-[#E2F124] mb-1">{t.breadcrumb}</p>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{t.title}</h1>
              <span className="text-xs text-[#94A3B8]">
                {t.signedInAs} <strong className="text-white">{adminUsername}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeTab !== 'accounts' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap cursor-pointer btn-kinetic-primary disabled:opacity-60"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>{saving ? t.savingBtn : t.saveBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap cursor-pointer btn-kinetic-ghost"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>{t.signOutBtn}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            className={`mb-6 rounded-xl px-5 py-3.5 text-sm font-semibold flex items-center gap-2.5 border ${
              statusMessage.type === 'success'
                ? 'bg-[#E2F124]/10 border-[#E2F124]/40 text-[#E2F124]'
                : 'bg-[#ffb4ab]/10 border-[#ffb4ab]/40 text-[#ffb4ab]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Start Sidebar Navigation */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl bg-[#161B26] border border-white/10 p-4">
              <p className="text-xs font-semibold text-[#94A3B8] mb-2.5">{t.editingLangLabel}</p>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#12161F] border border-white/10">
                <button
                  type="button"
                  onClick={() => setEditLocale('ar')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    editLocale === 'ar'
                      ? 'bg-[#E2F124] text-[#12161F]'
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  {t.langAr}
                </button>
                <button
                  type="button"
                  onClick={() => setEditLocale('en')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    editLocale === 'en'
                      ? 'bg-[#E2F124] text-[#12161F]'
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  {t.langEn}
                </button>
              </div>
            </div>

            <nav
              aria-label={t.title}
              className="rounded-2xl bg-[#161B26] border border-white/10 p-2 space-y-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-start cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#E2F124] text-[#12161F]'
                        : 'text-[#CBD5E1] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="rounded-2xl bg-[#161B26] border border-white/10 p-4">
              {confirmReset ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">{t.confirmResetMsg}</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      disabled={saving}
                      className="w-full rounded-lg px-3 py-2 text-xs font-bold bg-[#ffb4ab] text-[#2a0606] cursor-pointer"
                    >
                      {t.confirmResetYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="w-full rounded-lg px-3 py-2 text-xs font-semibold btn-kinetic-ghost cursor-pointer"
                    >
                      {t.cancelBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/25 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.resetBtn}</span>
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-[#161B26] border border-white/10 p-4 space-y-2.5">
              <p className="text-xs font-bold text-[#E2F124]">{t.exportHeading}</p>
              <button
                type="button"
                onClick={handleDownloadSiteContent}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold btn-kinetic-ghost cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#E2F124] shrink-0" aria-hidden="true" />
                <span>{t.dlSiteBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadFullAdminBackup()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold btn-kinetic-primary cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t.dlAdminAllBtn}</span>
              </button>
              {activeTab !== 'accounts' && (
                <button
                  type="button"
                  onClick={() => {
                    const sectionMap: Record<
                      Exclude<CmsSectionTab, 'accounts'>,
                      unknown
                    > = {
                      hero: activeLocaleContent.hero,
                      programs: activeLocaleContent.programs,
                      transformations: activeLocaleContent.transformations,
                      coach: activeLocaleContent.coach,
                      pricing: activeLocaleContent.tiers,
                      faq: activeLocaleContent.faqs,
                    };
                    downloadJsonFile(`kinetic-${editLocale}-${activeTab}.json`, {
                      locale: editLocale,
                      section: activeTab,
                      data: sectionMap[activeTab],
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#CBD5E1] hover:text-white border border-white/10 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{t.dlSectionBtn}</span>
                </button>
              )}
            </div>
          </aside>

          {/* Main Editor Workspace */}
          <section
            dir={activeTab === 'accounts' ? (lang === 'ar' ? 'rtl' : 'ltr') : editLocale === 'ar' ? 'rtl' : 'ltr'}
            className="lg:col-span-9 rounded-2xl bg-[#161B26] border border-white/10 p-6 sm:p-8"
          >
            {activeTab === 'accounts' && (
              <AdminPortalAccountsPanel
                lang={lang}
                adminToken={adminToken}
                onSessionExpired={onSessionExpired}
              />
            )}

            {activeTab === 'hero' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white pb-3 border-b border-white/10">
                  {t.heroSecTitle}
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="cms-hero-eyebrow" className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.eyebrowLabel}
                    </label>
                    <input
                      id="cms-hero-eyebrow"
                      type="text"
                      value={activeLocaleContent.hero.eyebrow}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>

                  <div>
                    <label htmlFor="cms-hero-h1" className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.h1Label}
                    </label>
                    <input
                      id="cms-hero-h1"
                      type="text"
                      value={activeLocaleContent.hero.h1}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, h1: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>

                  <div>
                    <label htmlFor="cms-hero-sub" className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.subLabel}
                    </label>
                    <textarea
                      id="cms-hero-sub"
                      rows={3}
                      value={activeLocaleContent.hero.sub}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, sub: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cms-hero-cta1" className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                        {t.ctaPrimaryLabel}
                      </label>
                      <input
                        id="cms-hero-cta1"
                        type="text"
                        value={activeLocaleContent.hero.ctaPrimary}
                        onChange={(e) =>
                          updateLocaleField((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, ctaPrimary: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                      />
                    </div>
                    <div>
                      <label htmlFor="cms-hero-cta2" className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                        {t.ctaSecondaryLabel}
                      </label>
                      <input
                        id="cms-hero-cta2"
                        type="text"
                        value={activeLocaleContent.hero.ctaSecondary}
                        onChange={(e) =>
                          updateLocaleField((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, ctaSecondary: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cms-hero-trust" className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.trustLabel}
                    </label>
                    <input
                      id="cms-hero-trust"
                      type="text"
                      value={activeLocaleContent.hero.trust}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, trust: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-sm font-bold text-white mb-4">{t.kpisHeading}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeLocaleContent.hero.kpis.map((kpi, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#12161F] border border-white/10 space-y-3"
                      >
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">
                            {t.kpiVal} #{idx + 1}
                          </label>
                          <input
                            type="text"
                            value={kpi.value}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                hero: {
                                  ...prev.hero,
                                  kpis: prev.hero.kpis.map((k, kIdx) =>
                                    kIdx === idx ? { ...k, value: e.target.value } : k
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-[#E2F124] font-bold tabular-metric focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">
                            {t.kpiDesc} #{idx + 1}
                          </label>
                          <input
                            type="text"
                            value={kpi.label}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                hero: {
                                  ...prev.hero,
                                  kpis: prev.hero.kpis.map((k, kIdx) =>
                                    kIdx === idx ? { ...k, label: e.target.value } : k
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'programs' && activeProgram && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">{t.progSecTitle}</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLocaleContent.programs.map((prog, idx) => (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => setSelectedProgramIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          selectedProgramIdx === idx
                            ? 'bg-[#E2F124] text-[#12161F]'
                            : 'bg-[#12161F] text-[#CBD5E1] border border-white/10'
                        }`}
                      >
                        {prog.englishCode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.progTitle}
                    </label>
                    <input
                      type="text"
                      value={activeProgram.title}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === selectedProgramIdx ? { ...p, title: e.target.value } : p
                          ),
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.progCode}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={activeProgram.englishCode}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === selectedProgramIdx ? { ...p, englishCode: e.target.value } : p
                          ),
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-[#E2F124] font-bold focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    {t.progSummary}
                  </label>
                  <textarea
                    rows={3}
                    value={activeProgram.summary}
                    onChange={(e) =>
                      updateLocaleField((prev) => ({
                        ...prev,
                        programs: prev.programs.map((p, i) =>
                          i === selectedProgramIdx ? { ...p, summary: e.target.value } : p
                        ),
                      }))
                    }
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.progDuration}
                    </label>
                    <input
                      type="text"
                      value={activeProgram.durationWeeks}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === selectedProgramIdx ? { ...p, durationWeeks: e.target.value } : p
                          ),
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.progFreq}
                    </label>
                    <input
                      type="text"
                      value={activeProgram.sessionsPerWeek}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === selectedProgramIdx
                              ? { ...p, sessionsPerWeek: e.target.value }
                              : p
                          ),
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.progLen}
                    </label>
                    <input
                      type="text"
                      value={activeProgram.sessionLength}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === selectedProgramIdx ? { ...p, sessionLength: e.target.value } : p
                          ),
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    {t.progOutcomes}
                  </label>
                  <textarea
                    rows={4}
                    value={activeProgram.outcomes.join('\n')}
                    onChange={(e) =>
                      updateLocaleField((prev) => ({
                        ...prev,
                        programs: prev.programs.map((p, i) =>
                          i === selectedProgramIdx
                            ? {
                                ...p,
                                outcomes: e.target.value
                                  .split('\n')
                                  .map((line) => line.trim())
                                  .filter(Boolean),
                              }
                            : p
                        ),
                      }))
                    }
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'transformations' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">{t.transSecTitle}</h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateLocaleField((prev) => ({
                        ...prev,
                        transformations: [
                          ...prev.transformations,
                          {
                            id: `t-${Date.now()}`,
                            clientName:
                              editLocale === 'en' ? 'New Athlete' : 'متدرب جديد',
                            cityAndRole:
                              editLocale === 'en' ? 'Riyadh · Client' : 'الرياض · متدرب',
                            goalCategory: 'fat_loss',
                            goalLabel:
                              editLocale === 'en' ? 'Fat Loss' : 'تنشيف وحرق دهون',
                            timeframeWeeks: 12,
                            startWeightKg: 90,
                            endWeightKg: 81,
                            bodyFatDelta:
                              editLocale === 'en' ? '-8% Body Fat' : '-8% دهون',
                            quote:
                              editLocale === 'en'
                                ? 'Consistent plan and weekly check-ins made every week count.'
                                : 'الالتزام بالخطة والمتابعة الأسبوعية صنع الفارق من الشهر الأول.',
                            programUsed: 'PRO',
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold bg-[#E2F124] text-[#12161F] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>{t.addTransBtn}</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {activeLocaleContent.transformations.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl bg-[#12161F] border border-white/10 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-[#E2F124] tabular-metric">
                          #{idx + 1} · {item.clientName}
                        </span>
                        {activeLocaleContent.transformations.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.filter(
                                  (c) => c.id !== item.id
                                ),
                              }))
                            }
                            aria-label={`${t.deleteItem} ${item.clientName}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#ffb4ab] hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.deleteItem}</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.clientName}</label>
                          <input
                            type="text"
                            value={item.clientName}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id ? { ...c, clientName: e.target.value } : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.cityRole}</label>
                          <input
                            type="text"
                            value={item.cityAndRole}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id ? { ...c, cityAndRole: e.target.value } : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.goalCat}</label>
                          <select
                            value={item.goalCategory}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id
                                    ? {
                                        ...c,
                                        goalCategory:
                                          e.target.value === 'muscle_gain'
                                            ? 'muscle_gain'
                                            : 'fat_loss',
                                      }
                                    : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          >
                            <option value="fat_loss">{t.catFatLoss}</option>
                            <option value="muscle_gain">{t.catMuscle}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.weeksLabel}</label>
                          <input
                            type="number"
                            min={1}
                            max={104}
                            value={item.timeframeWeeks}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id
                                    ? { ...c, timeframeWeeks: Number(e.target.value) || 12 }
                                    : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.startW}</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.startWeightKg}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id
                                    ? { ...c, startWeightKg: Number(e.target.value) || 80 }
                                    : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.endW}</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.endWeightKg}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id
                                    ? { ...c, endWeightKg: Number(e.target.value) || 75 }
                                    : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.netDelta}</label>
                          <input
                            type="text"
                            value={item.bodyFatDelta}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                transformations: prev.transformations.map((c) =>
                                  c.id === item.id ? { ...c, bodyFatDelta: e.target.value } : c
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-[#94A3B8] mb-1">{t.quoteLabel}</label>
                        <textarea
                          rows={2}
                          value={item.quote}
                          onChange={(e) =>
                            updateLocaleField((prev) => ({
                              ...prev,
                              transformations: prev.transformations.map((c) =>
                                c.id === item.id ? { ...c, quote: e.target.value } : c
                              ),
                            }))
                          }
                          className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'coach' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white pb-3 border-b border-white/10">
                  {t.coachSecTitle}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.coachName}
                    </label>
                    <input
                      type="text"
                      value={activeLocaleContent.coach.name}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          coach: { ...prev.coach, name: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                      {t.coachTitle}
                    </label>
                    <input
                      type="text"
                      value={activeLocaleContent.coach.title}
                      onChange={(e) =>
                        updateLocaleField((prev) => ({
                          ...prev,
                          coach: { ...prev.coach, title: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    {t.coachCreds}
                  </label>
                  <input
                    type="text"
                    value={activeLocaleContent.coach.credentials}
                    onChange={(e) =>
                      updateLocaleField((prev) => ({
                        ...prev,
                        coach: { ...prev.coach, credentials: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                    {t.coachBio}
                  </label>
                  <textarea
                    rows={4}
                    value={activeLocaleContent.coach.bio}
                    onChange={(e) =>
                      updateLocaleField((prev) => ({
                        ...prev,
                        coach: { ...prev.coach, bio: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                  />
                </div>

                <div className="pt-3 border-t border-white/10">
                  <h3 className="text-sm font-bold text-white mb-3">{t.splitHeading}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeLocaleContent.coach.weeklySplitHighlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#12161F] border border-white/10 grid grid-cols-2 gap-2"
                      >
                        <div>
                          <label className="block text-[11px] text-[#94A3B8] mb-1">
                            {t.splitDay}
                          </label>
                          <input
                            type="text"
                            value={item.day}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                coach: {
                                  ...prev.coach,
                                  weeklySplitHighlights: prev.coach.weeklySplitHighlights.map(
                                    (s, sIdx) => (sIdx === idx ? { ...s, day: e.target.value } : s)
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-1.5 text-xs text-[#E2F124] font-bold focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#94A3B8] mb-1">
                            {t.splitFocus}
                          </label>
                          <input
                            type="text"
                            value={item.focus}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                coach: {
                                  ...prev.coach,
                                  weeklySplitHighlights: prev.coach.weeklySplitHighlights.map(
                                    (s, sIdx) => (sIdx === idx ? { ...s, focus: e.target.value } : s)
                                  ),
                                },
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white pb-3 border-b border-white/10">
                  {t.tierSecTitle}
                </h2>

                <div className="space-y-5">
                  {activeLocaleContent.tiers.map((tier) => (
                    <div
                      key={tier.code}
                      className="p-5 rounded-xl bg-[#12161F] border border-white/10 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-oswald-accent text-base font-bold text-[#E2F124]">
                          {tier.code}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.tierName}</label>
                          <input
                            type="text"
                            value={tier.arabicName}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                tiers: prev.tiers.map((item) =>
                                  item.code === tier.code
                                    ? { ...item, arabicName: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`cms-price-${tier.code}`}
                            className="block text-xs text-[#94A3B8] mb-1"
                          >
                            {t.tierPrice}
                          </label>
                          <input
                            id={`cms-price-${tier.code}`}
                            type="number"
                            min={50}
                            max={10000}
                            value={tier.monthlyPriceSar}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                tiers: prev.tiers.map((item) =>
                                  item.code === tier.code
                                    ? {
                                        ...item,
                                        monthlyPriceSar: Math.max(50, Number(e.target.value) || 390),
                                      }
                                    : item
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-[#E2F124] font-bold tabular-metric focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.tierCta}</label>
                          <input
                            type="text"
                            value={tier.ctaLabel}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                tiers: prev.tiers.map((item) =>
                                  item.code === tier.code
                                    ? { ...item, ctaLabel: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t.tierTagline}</label>
                          <input
                            type="text"
                            value={tier.tagline}
                            onChange={(e) =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                tiers: prev.tiers.map((item) =>
                                  item.code === tier.code
                                    ? { ...item, tagline: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                          />
                        </div>
                        {tier.featured && (
                          <div>
                            <label className="block text-xs text-[#94A3B8] mb-1">
                              {t.tierBadge}
                            </label>
                            <input
                              type="text"
                              value={tier.badgeText ?? ''}
                              onChange={(e) =>
                                updateLocaleField((prev) => ({
                                  ...prev,
                                  tiers: prev.tiers.map((item) =>
                                    item.code === tier.code
                                      ? { ...item, badgeText: e.target.value }
                                      : item
                                  ),
                                }))
                              }
                              className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-[#94A3B8] mb-1">
                          {t.tierDeliverables}
                        </label>
                        <textarea
                          rows={3}
                          value={tier.deliverables.join('\n')}
                          onChange={(e) =>
                            updateLocaleField((prev) => ({
                              ...prev,
                              tiers: prev.tiers.map((item) =>
                                item.code === tier.code
                                  ? {
                                      ...item,
                                      deliverables: e.target.value
                                        .split('\n')
                                        .map((l) => l.trim())
                                        .filter(Boolean),
                                    }
                                  : item
                              ),
                            }))
                          }
                          className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">{t.faqSecTitle}</h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateLocaleField((prev) => ({
                        ...prev,
                        faqs: [
                          ...prev.faqs,
                          {
                            id: `faq-${Date.now()}`,
                            question:
                              editLocale === 'en' ? 'New question' : 'سؤال جديد',
                            answer:
                              editLocale === 'en'
                                ? 'Answer details go here.'
                                : 'تفاصيل الإجابة تظهر هنا.',
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold bg-[#E2F124] text-[#12161F] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>{t.addFaqBtn}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#12161F] border border-[#E2F124]/30">
                  <label htmlFor="cms-whatsapp-num" className="block text-xs font-bold text-[#E2F124] mb-1.5">
                    {t.waLabel}
                  </label>
                  <input
                    id="cms-whatsapp-num"
                    type="text"
                    dir="ltr"
                    value={draft.whatsappNumber}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                    }
                    className="w-full sm:max-w-xs rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white tabular-metric focus:outline-none focus:border-[#E2F124]"
                  />
                  <p className="text-xs text-[#94A3B8] mt-1.5">{t.waHint}</p>
                </div>

                <div className="space-y-4">
                  {activeLocaleContent.faqs.map((faq, idx) => (
                    <div
                      key={faq.id}
                      className="p-4 rounded-xl bg-[#12161F] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#E2F124] tabular-metric">
                          FAQ #{idx + 1}
                        </span>
                        {activeLocaleContent.faqs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateLocaleField((prev) => ({
                                ...prev,
                                faqs: prev.faqs.filter((f) => f.id !== faq.id),
                              }))
                            }
                            aria-label={`${t.deleteItem} ${faq.question}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#ffb4ab] hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.deleteItem}</span>
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-[#94A3B8] mb-1">{t.faqQ}</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) =>
                            updateLocaleField((prev) => ({
                              ...prev,
                              faqs: prev.faqs.map((f) =>
                                f.id === faq.id ? { ...f, question: e.target.value } : f
                              ),
                            }))
                          }
                          className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#94A3B8] mb-1">{t.faqA}</label>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) =>
                            updateLocaleField((prev) => ({
                              ...prev,
                              faqs: prev.faqs.map((f) =>
                                f.id === faq.id ? { ...f, answer: e.target.value } : f
                              ),
                            }))
                          }
                          className="w-full rounded-lg bg-[#161B26] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
