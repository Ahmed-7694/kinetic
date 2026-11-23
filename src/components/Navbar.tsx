import { useState } from 'react';
import { Globe, Menu, X } from 'lucide-react';
import type { Language } from '../utils/coachingMath';

export type AppScreen = 'landing' | 'assessment' | 'portal';

interface NavbarProps {
  lang: Language;
  onToggleLanguage: () => void;
  activeScreen: AppScreen;
  onNavigateScreen: (screen: AppScreen, sectionId?: string) => void;
}

export function Navbar({
  lang,
  onToggleLanguage,
  activeScreen,
  onNavigateScreen,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (screen: AppScreen, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigateScreen(screen, sectionId);
  };

  const t =
    lang === 'en'
      ? {
          brand: 'Kinetic Peak',
          navLabel: 'Primary Navigation',
          programs: 'Programs',
          transformations: 'Results',
          pricing: 'Pricing',
          portal: 'Client Portal',
          switchLang: 'العربية',
          switchAria: 'Switch language to Arabic',
          cta: 'Start Your Plan',
          openMenu: 'Open menu',
          closeMenu: 'Close menu',
        }
      : {
          brand: 'ذروة كينتك',
          navLabel: 'التنقل الرئيسي',
          programs: 'البرامج',
          transformations: 'التحولات',
          pricing: 'الباقات',
          portal: 'بوابة المتدرب',
          switchLang: 'English',
          switchAria: 'التبديل إلى اللغة الإنجليزية',
          cta: 'ابدأ خطتك الآن',
          openMenu: 'فتح القائمة',
          closeMenu: 'إغلاق القائمة',
        };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f131c]/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-4">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('landing')}
          className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-[#E2F124] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2F124]"
        >
          {t.brand}
        </button>

        {/* Zone 2: 5 concise single-line nav links including language toggle */}
        <nav
          aria-label={t.navLabel}
          className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#CBD5E1]"
        >
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'programs')}
            className="whitespace-nowrap shrink-0 cursor-pointer hover:text-white transition-colors py-1"
          >
            {t.programs}
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'transformations')}
            className="whitespace-nowrap shrink-0 cursor-pointer hover:text-white transition-colors py-1"
          >
            {t.transformations}
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'pricing')}
            className="whitespace-nowrap shrink-0 cursor-pointer hover:text-white transition-colors py-1"
          >
            {t.pricing}
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('portal')}
            aria-current={activeScreen === 'portal' ? 'page' : undefined}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 border-b-2 ${
              activeScreen === 'portal'
                ? 'border-[#E2F124] text-[#E2F124]'
                : 'border-transparent hover:text-white'
            }`}
          >
            {t.portal}
          </button>
          <button
            type="button"
            data-testid="language-toggle"
            aria-label={t.switchAria}
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer text-[#E2F124] hover:text-white transition-colors py-1"
          >
            <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.switchLang}</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA action + Mobile Language & Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            aria-label={t.switchAria}
            onClick={onToggleLanguage}
            className="md:hidden inline-flex items-center gap-1.5 h-11 px-3 rounded-lg bg-[#1E2533] border border-white/10 text-xs font-bold text-[#E2F124] whitespace-nowrap cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.switchLang}</span>
          </button>

          <button
            type="button"
            onClick={() => handleLinkClick('assessment')}
            className="hidden sm:inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer btn-kinetic-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E2F124]"
          >
            {t.cta}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t.closeMenu : t.openMenu}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#1E2533] border border-white/10 text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#161B26] px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'programs')}
            className="block w-full text-start px-3 py-2.5 rounded-lg text-sm font-semibold text-[#CBD5E1] hover:bg-[#1E2533] hover:text-white"
          >
            {t.programs}
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'transformations')}
            className="block w-full text-start px-3 py-2.5 rounded-lg text-sm font-semibold text-[#CBD5E1] hover:bg-[#1E2533] hover:text-white"
          >
            {t.transformations}
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'pricing')}
            className="block w-full text-start px-3 py-2.5 rounded-lg text-sm font-semibold text-[#CBD5E1] hover:bg-[#1E2533] hover:text-white"
          >
            {t.pricing}
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('portal')}
            className="block w-full text-start px-3 py-2.5 rounded-lg text-sm font-semibold text-[#E2F124] hover:bg-[#1E2533]"
          >
            {t.portal}
          </button>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleLinkClick('assessment')}
              className="w-full rounded-lg px-5 py-3 text-sm font-bold btn-kinetic-primary"
            >
              {t.cta}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
