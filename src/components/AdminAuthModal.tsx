import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';
import type { Language } from '../utils/coachingMath';
import { validateAdminCredentialsInput } from '../utils/cmsSchema';

export interface AdminSession {
  token: string;
  username: string;
}

interface AdminAuthModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (session: AdminSession) => void;
}

type AuthStatusMode = 'loading' | 'setup' | 'claimed' | 'env';

export function AdminAuthModal({
  lang,
  isOpen,
  onClose,
  onAuthenticated,
}: AdminAuthModalProps) {
  const [mode, setMode] = useState<AuthStatusMode>('loading');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setMode('loading');
    setServerError('');
    setFieldErrors({});
    setPassword('');
    setConfirmPassword('');

    fetch('/api/admin/status')
      .then((res) => res.json())
      .then((data: { mode?: string }) => {
        if (cancelled) return;
        if (data.mode === 'env' || data.mode === 'claimed') {
          setMode(data.mode);
        } else {
          setMode('setup');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMode('setup');
          setServerError(
            lang === 'en'
              ? 'Unable to reach verification server. Please try again.'
              : 'تعذر الاتصال بخادم التحقق. يرجى المحاولة مرة أخرى.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, lang]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSetup = mode === 'setup';

  const t =
    lang === 'en'
      ? {
          closeAria: 'Close sign-in dialog',
          kicker: 'Content Administration',
          setupTitle: 'Register Content Admin Account',
          setupSub:
            'No admin credentials are saved yet. Choose your username and password (at least 8 characters) to secure access and open the CMS.',
          loginTitle: 'Sign In to Manage Site Content',
          loginSub:
            'Enter your administrator credentials to unlock the live content management dashboard.',
          loading: 'Checking access configuration...',
          usernameLabel: 'Admin Username or Email',
          usernamePlaceholder: 'e.g. coach_admin',
          passwordLabel: 'Password',
          passwordPlaceholderSetup: 'At least 8 characters',
          passwordPlaceholderLogin: 'Enter your password',
          confirmLabel: 'Confirm Password',
          confirmPlaceholder: 'Re-enter password',
          showPwAria: 'Show password',
          hidePwAria: 'Hide password',
          setupBtn: 'Register & Open Content Manager',
          loginBtn: 'Sign In & Open Content Manager',
          submittingBtn: 'Verifying...',
          cancelBtn: 'Cancel',
          invalidLogin:
            mode === 'env'
              ? 'Invalid credentials. Access is using ADMIN_USERNAME / ADMIN_PASSCODE from Secrets—verify exact casing without quotes or spaces (use the eye icon to inspect), and restart the preview if you just updated Secrets.'
              : 'Invalid username or password. Please verify your credentials.',
          leadingTrailingSpaceHint:
            'Note: Your password input includes a space at the beginning or end.',
          alreadyClaimed: 'Admin credentials are already registered. Please sign in.',
          genericFail: 'Request failed. Please try again.',
        }
      : {
          closeAria: 'إغلاق نافذة تسجيل الدخول',
          kicker: 'إدارة محتوى الموقع',
          setupTitle: 'تسجيل بيانات إدارة المحتوى لأول مرة',
          setupSub:
            'لم يتم تعيين كلمة مرور مسبقاً لحماية الموقع. اختر اسم مستخدم وكلمة مرور (8 أحرف على الأقل) لتأمين الحساب والانتقال مباشرة إلى صفحة إدارة المحتوى.',
          loginTitle: 'تسجيل الدخول لإدارة محتوى الموقع',
          loginSub:
            'أدخل اسم المستخدم وكلمة المرور الصحيحة للانتقال إلى لوحة تعديل محتوى الموقع.',
          loading: 'جارٍ التحقق من إعدادات الدخول...',
          usernameLabel: 'اسم المستخدم أو البريد الإلكتروني',
          usernamePlaceholder: 'مثال: coach_admin',
          passwordLabel: 'كلمة المرور',
          passwordPlaceholderSetup: '8 أحرف على الأقل',
          passwordPlaceholderLogin: 'أدخل كلمة المرور',
          confirmLabel: 'تأكيد كلمة المرور',
          confirmPlaceholder: 'أعد إدخال كلمة المرور',
          showPwAria: 'إظهار كلمة المرور',
          hidePwAria: 'إخفاء كلمة المرور',
          setupBtn: 'تسجيل البيانات والانتقال لإدارة المحتوى',
          loginBtn: 'دخول إلى صفحة إدارة المحتوى',
          submittingBtn: 'جارٍ التحقق...',
          cancelBtn: 'إلغاء',
          invalidLogin:
            mode === 'env'
              ? 'اسم المستخدم أو كلمة المرور غير صحيحة. التحقق يعتمد على ADMIN_USERNAME / ADMIN_PASSCODE في Secrets — تأكد من مطابقة الأحرف وعدم وجود علامات اقتباس أو مسافات (استخدم أيقونة العين للمراجعة)، وأعد تشغيل المعاينة إذا قمت بتحديث Secrets للتو.'
              : 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مجدداً.',
          leadingTrailingSpaceHint:
            'تنبيه: كلمة المرور المدخلة تحتوي على مسافة زائدة في البداية أو النهاية.',
          alreadyClaimed: 'تم تسجيل حساب الإدارة مسبقاً، يرجى تسجيل الدخول بالبيانات المسجلة.',
          genericFail: 'تعذر إتمام الطلب. يرجى المحاولة مرة أخرى.',
        };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'loading') return;

    const errors = validateAdminCredentialsInput(
      {
        username,
        password,
        confirmPassword,
        isSetup,
      },
      lang
    );
    setFieldErrors(errors);
    setServerError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isSetup ? '/api/admin/claim' : '/api/admin/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        token?: string;
        username?: string;
        error?: string;
      };

      if (!response.ok || !payload.token || !payload.username) {
        if (response.status === 409) {
          setMode('claimed');
          setServerError(t.alreadyClaimed);
        } else if (response.status === 401) {
          setServerError(t.invalidLogin);
        } else {
          setServerError(t.genericFail);
        }
        return;
      }

      onAuthenticated({
        token: payload.token,
        username: payload.username,
      });
    } catch {
      setServerError(t.genericFail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center p-4 bg-[#070a10]/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-title"
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-[#161B26] border border-white/15 shadow-2xl p-5 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E2F124] mb-1.5">
              {isSetup ? (
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{t.kicker}</span>
            </div>
            <h2 id="admin-auth-title" className="text-xl sm:text-2xl font-bold text-white">
              {isSetup ? t.setupTitle : t.loginTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeAria}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#CBD5E1] leading-relaxed mb-6">
          {mode === 'loading' ? t.loading : isSetup ? t.setupSub : t.loginSub}
        </p>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/40 px-4 py-3 text-xs sm:text-sm text-[#ffb4ab]"
          >
            {serverError}
          </div>
        )}

        {mode === 'loading' ? (
          <div className="space-y-4 py-4">
            <div className="h-11 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-11 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-12 rounded-lg bg-white/10 animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="admin-auth-username"
                className="block text-sm font-semibold text-white mb-1.5"
              >
                {t.usernameLabel}
              </label>
              <input
                id="admin-auth-username"
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
                htmlFor="admin-auth-password"
                className="block text-sm font-semibold text-white mb-1.5"
              >
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="admin-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSetup ? 'new-password' : 'current-password'}
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
                  placeholder={isSetup ? t.passwordPlaceholderSetup : t.passwordPlaceholderLogin}
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
                <p className="mt-1 text-xs text-[#E2F124]">{t.leadingTrailingSpaceHint}</p>
              )}
            </div>

            {isSetup && (
              <div>
                <label
                  htmlFor="admin-auth-confirm"
                  className="block text-sm font-semibold text-white mb-1.5"
                >
                  {t.confirmLabel}
                </label>
                <input
                  id="admin-auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (serverError) setServerError('');
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  placeholder={t.confirmPlaceholder}
                  className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 text-sm text-white placeholder-[#94A3B8]/60 text-start focus:outline-none focus:border-[#E2F124]"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-[#ffb4ab]">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg px-5 py-3 text-sm font-bold whitespace-nowrap cursor-pointer btn-kinetic-primary disabled:opacity-60"
              >
                {submitting ? t.submittingBtn : isSetup ? t.setupBtn : t.loginBtn}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-3 text-sm font-semibold whitespace-nowrap cursor-pointer btn-kinetic-ghost"
              >
                {t.cancelBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
