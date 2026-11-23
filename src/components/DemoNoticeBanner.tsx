import { useState } from 'react';
import { Info, X } from 'lucide-react';
import type { Language } from '../utils/coachingMath';

interface DemoNoticeBannerProps {
  lang: Language;
}

export function DemoNoticeBanner({ lang }: DemoNoticeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const text =
    lang === 'en'
      ? 'Notice: This website is a demo prototype, not a real platform, and all displayed data is fictional.'
      : 'تنبيه: هذا الموقع نموذج تجريبي وليس موقعاً حقيقياً، والبيانات المعروضة فيه وهمية.';

  const ariaLabel = lang === 'en' ? 'Demo notice' : 'تنبيه نموذج تجريبي';
  const closeLabel = lang === 'en' ? 'Close notice' : 'إغلاق التنبيه';

  return (
    <aside
      role="note"
      aria-label={ariaLabel}
      className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-md z-50 rounded-xl glass-card border-[#E2F124]/60 shadow-2xl px-4 py-2.5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Info className="w-4 h-4 text-[#E2F124] shrink-0" aria-hidden="true" />
        <p className="text-xs sm:text-[13px] font-semibold text-[#dfe2ef] leading-snug text-start">
          {text}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={closeLabel}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 shrink-0 cursor-pointer transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
