import type { Language } from '../utils/coachingMath';
import type { AppScreen } from './Navbar';

interface FooterProps {
  lang: Language;
  onNavigateScreen: (screen: AppScreen, sectionId?: string) => void;
}

export function Footer({ lang, onNavigateScreen }: FooterProps) {
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
        }
      : {
          brand: 'ذروة كينتك',
          copy: `منصة تدريب رياضي وتغذية مبنية على الأداء · جميع الحقوق محفوظة © ${new Date().getFullYear()}`,
          programs: 'البرامج',
          transformations: 'التحولات',
          pricing: 'الباقات',
          assessment: 'حاسبة الخطة',
          portal: 'بوابة المتدرب',
        };

  return (
    <footer className="border-t border-white/10 bg-[#0a0e17] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="text-lg font-extrabold text-white mb-1">{t.brand}</p>
          <p className="text-xs text-[#94A3B8]">{t.copy}</p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-[#CBD5E1]">
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
        </div>
      </div>
    </footer>
  );
}
