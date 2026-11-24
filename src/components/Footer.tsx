import { Lock } from 'lucide-react';
import type { Language } from '../utils/coachingMath';
import type { AppScreen } from './Navbar';

interface FooterProps {
  lang: Language;
  onNavigateScreen: (screen: AppScreen, sectionId?: string) => void;
  onOpenAdminAccess: () => void;
}

export function Footer({ lang, onNavigateScreen, onOpenAdminAccess }: FooterProps) {
  const t =
    lang === 'en'
      ? {
          brand: 'Kinetic Peak',
          copy: `Performance-driven fitness & nutrition coaching · All rights reserved © ${new Date().getFullYear()}`,
          programs: 'Programs',
          transformations: 'Results',
          pricing: 'Pricing',
          assessment: 'Plan Builder',
          portal: 'Client Portal',
          admin: 'Manage Content',
        }
      : {
          brand: 'ذروة كينتك',
          copy: `منصة تدريب رياضي وتغذية مبنية على الأداء · جميع الحقوق محفوظة © ${new Date().getFullYear()}`,
          programs: 'البرامج',
          transformations: 'التحولات',
          pricing: 'الباقات',
          assessment: 'حاسبة الخطة',
          portal: 'بوابة المتدرب',
          admin: 'إدارة المحتوى',
        };

  return (
    <footer className="border-t border-white/10 bg-[#0a0e17] pt-10 pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="text-lg font-extrabold text-white mb-1">{t.brand}</p>
          <p className="text-xs text-[#94A3B8]">{t.copy}</p>
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-sm text-[#CBD5E1]">
          <button
            type="button"
            onClick={() => onNavigateScreen('landing', 'programs')}
            className="hover:text-white cursor-pointer"
          >
            {t.programs}
          </button>
          <button
            type="button"
            onClick={() => onNavigateScreen('landing', 'transformations')}
            className="hover:text-white cursor-pointer"
          >
            {t.transformations}
          </button>
          <button
            type="button"
            onClick={() => onNavigateScreen('landing', 'pricing')}
            className="hover:text-white cursor-pointer"
          >
            {t.pricing}
          </button>
          <button
            type="button"
            onClick={() => onNavigateScreen('assessment')}
            className="hover:text-[#E2F124] cursor-pointer"
          >
            {t.assessment}
          </button>
          <button
            type="button"
            onClick={() => onNavigateScreen('portal')}
            className="hover:text-[#E2F124] cursor-pointer"
          >
            {t.portal}
          </button>
          <button
            type="button"
            data-testid="footer-admin-btn"
            onClick={onOpenAdminAccess}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#161B26] px-3.5 py-2 text-xs font-bold text-white hover:border-[#E2F124]/60 hover:text-[#E2F124] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5 text-[#E2F124]" aria-hidden="true" />
            <span>{t.admin}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}

