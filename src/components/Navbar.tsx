import { useState } from 'react';
import { Globe, Lock, Menu, X } from 'lucide-react';
import type { Language } from '../utils/coachingMath';

export type AppScreen = 'landing' | 'assessment' | 'portal' | 'admin';

interface NavbarProps {
  lang: Language;
  onToggleLanguage: () => void;
  activeScreen: AppScreen;
  isAdminAuthenticated: boolean;
  onNavigateScreen: (screen: AppScreen, sectionId?: string) => void;
  onOpenAdminAccess: () => void;
}

export function Navbar({
  lang,
  onToggleLanguage,
  activeScreen,
  isAdminAuthenticated,
  onNavigateScreen,
  onOpenAdminAccess,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (screen: AppScreen, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigateScreen(screen, sectionId);
  };

  const handleAdminClick = () => {
    setMobileMenuOpen(false);
    onOpenAdminAccess();
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
          admin: isAdminAuthenticated ? 'Admin CMS' : 'Manage Content',
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
          admin: 'إدارة المحتوى',
          switchLang: 'English',
          switchAria: 'التبديل إلى اللغة الإنجليزية',
          cta: 'ابدأ خطتك الآن',
          openMenu: 'فتح القائمة',
          closeMenu: 'إغلاق القائمة',
        };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f131c]/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 lg:gap-8 px-4 sm:px-6 py-4">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('landing')}
          className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-[#E2F124] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2F124]"
        >
          {t.brand}
        </button>

        {/* Zone 2: Concise single-line nav links */}
        <nav
          aria-label={t.navLabel}
          className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-semibold text-[#CBD5E1]"
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
            data-testid="nav-admin-btn"
            onClick={handleAdminClick}
            aria-current={activeScreen === 'admin' ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 border-b-2 ${
              activeScreen === 'admin'
                ? 'border-[#E2F124] text-[#E2F124]'
                : 'border-transparent hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#E2F124] shrink-0" aria-hidden="true" />
            <span>{t.admin}</span>
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
          <button
            type="button"
            onClick={handleAdminClick}
            className="flex items-center gap-2 w-full text-start px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1E2533]/80 hover:bg-[#1E2533]"
          >
            <Lock className="w-4 h-4 text-[#E2F124] shrink-0" aria-hidden="true" />
            <span>{t.admin}</span>
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

