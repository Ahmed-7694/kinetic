import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, ShieldAlert, UserCheck } from 'lucide-react';
import type { Language } from '../utils/coachingMath';
import { validatePortalLoginInput, type PortalAccountPublic } from '../utils/cmsSchema';

export interface PortalSession {
  token: string;
  account: PortalAccountPublic;
}

interface PortalLoginScreenProps {
  lang: Language;
  onAuthenticated: (session: PortalSession) => void;
  onBackToLanding: () => void;
  onOpenAdminAccess: () => void;
}

export function PortalLoginScreen({
  lang,
  onAuthenticated,
  onBackToLanding,
  onOpenAdminAccess,
}: PortalLoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  const t =
    lang === 'en'
      ? {
          back: 'Back to Home',
          kicker: 'Protected Athlete Workspace',
          title: 'Client Portal Sign In',
          subtitle:
            'Enter the username and password assigned to you by your coach to access your workouts, macro targets, and weekly weight log.',
          adminOnlyNotice:
            'Self-registration is disabled. Client Portal accounts can only be created and managed from inside the Admin Content Manager.',
          adminLink: 'Admin? Open Content Manager',
          usernameLabel: 'Portal Username',
          usernamePlaceholder: 'e.g. khalid_fit',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Enter your portal password',
          showPwAria: 'Show password',
          hidePwAria: 'Hide password',
          spaceHint: 'Note: Your password input includes a space at the beginning or end.',
          submitBtn: 'Sign In to Client Portal',
          submittingBtn: 'Signing in...',
          invalidCreds: 'Invalid username or password. Please verify the credentials provided by your coach.',
          accountDisabled: 'This portal account has been disabled by the administrator.',
          genericFail: 'Unable to reach the server. Please try again.',
        }
      : {
          back: 'العودة إلى الرئيسية',
          kicker: 'منطقة المشتركين المحمية',
          title: 'تسجيل الدخول إلى بوابة المتدرب',
          subtitle:
            'أدخل اسم المستخدم وكلمة المرور المخصّصة لك من الإدارة للوصول إلى جدول التمارين، الماكروز، وسجل الوزن الأسبوعي.',
          adminOnlyNotice:
            'التسجيل الذاتي غير متاح: لا يمكن إنشاء حساب متدرب جديد من هنا، بل يتم إنشاء الحسابات وتحديد بيانات الدخول من داخل صفحة إدارة المحتوى فقط.',
          adminLink: 'هل أنت المسؤول؟ افتح إدارة المحتوى',
          usernameLabel: 'اسم المستخدم',
          usernamePlaceholder: 'مثال: khalid_fit',
          passwordLabel: 'كلمة المرور',
          passwordPlaceholder: 'أدخل كلمة المرور',
          showPwAria: 'إظهار كلمة المرور',
          hidePwAria: 'إخفاء كلمة المرور',
          spaceHint: 'تنبيه: كلمة المرور المدخلة تحتوي على مسافة زائدة في البداية أو النهاية.',
          submitBtn: 'دخول إلى بوابة المتدرب',
          submittingBtn: 'جارٍ التحقق...',
          invalidCreds: 'اسم المستخدم أو كلمة المرور غير صحيحة. تأكد من البيانات المزوّدة من الإدارة.',
          accountDisabled: 'تم إيقاف هذا الحساب مؤقتاً من قِبل الإدارة.',
          genericFail: 'تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
        };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors = validatePortalLoginInput(username, password, lang);
    setFieldErrors(errors);
    setServerError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        token?: string;
        account?: PortalAccountPublic;
      };

      if (!response.ok || !payload.token || !payload.account) {
        if (response.status === 403) {
          setServerError(t.accountDisabled);
        } else if (response.status === 401) {
          setServerError(t.invalidCreds);
        } else {
          setServerError(t.genericFail);
        }
        return;
      }

      onAuthenticated({
        token: payload.token,
        account: payload.account,
      });
    } catch {
      setServerError(t.genericFail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#0f131c] pt-12 pb-28 lg:py-20">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#94A3B8] hover:text-[#E2F124] cursor-pointer mb-6"
        >
          <BackArrow className="w-4 h-4" aria-hidden="true" />
          <span>{t.back}</span>
        </button>

        <div className="glass-card rounded-2xl border border-white/15 p-6 sm:p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E2F124] mb-2">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>{t.kicker}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-sm text-[#CBD5E1] leading-relaxed mb-6">{t.subtitle}</p>

          {serverError && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/40 px-4 py-3 text-xs sm:text-sm text-[#ffb4ab]"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="portal-login-username"
                className="block text-sm font-semibold text-white mb-1.5"
              >
                {t.usernameLabel}
              </label>
              <input
                id="portal-login-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (serverError) setServerError('');
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: '' }));
                  }
                }}
                placeholder={t.usernamePlaceholder}
                className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 text-sm text-white placeholder-[#94A3B8]/60 text-start focus:outline-none focus:border-[#E2F124]"
              />
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-[#ffb4ab]">{fieldErrors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="portal-login-password"
                className="block text-sm font-semibold text-white mb-1.5"
              >
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="portal-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (serverError) setServerError('');
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder={t.passwordPlaceholder}
                  className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 pe-11 text-sm text-white placeholder-[#94A3B8]/60 text-start focus:outline-none focus:border-[#E2F124]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.hidePwAria : t.showPwAria}
                  className="absolute inset-y-0 end-2 px-2 flex items-center text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-[#ffb4ab]">{fieldErrors.password}</p>
              )}
              {!fieldErrors.password && password.length > 0 && password !== password.trim() && (
                <p className="mt-1 text-xs text-[#E2F124]">{t.spaceHint}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold cursor-pointer btn-kinetic-primary disabled:opacity-60"
            >
              <UserCheck className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? t.submittingBtn : t.submitBtn}</span>
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-[#12161F] border border-white/10 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs text-[#CBD5E1] leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-[#E2F124] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.adminOnlyNotice}</span>
            </div>
            <button
              type="button"
              onClick={onOpenAdminAccess}
              className="text-xs font-bold text-[#E2F124] hover:underline cursor-pointer"
            >
              {t.adminLink}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
