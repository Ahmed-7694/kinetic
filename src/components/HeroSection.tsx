import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { getKpiHighlights, HERO_IMAGE_URL } from '../data/coachingData';
import type { Language } from '../utils/coachingMath';
import { ImageWithFallback } from './ImageWithFallback';

interface HeroSectionProps {
  lang: Language;
  onStartAssessment: () => void;
  onExplorePrograms: () => void;
}

export function HeroSection({ lang, onStartAssessment, onExplorePrograms }: HeroSectionProps) {
  const kpis = getKpiHighlights(lang);
  const ForwardArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  const t =
    lang === 'en'
      ? {
          eyebrow: 'Performance-Driven Personal Coaching',
          h1: 'Build a stronger, leaner physique with a system engineered for your schedule',
          sub: 'No more random workouts or crash diets. Get a precision resistance split and flexible macro plan calibrated to your numbers, backed by weekly lift and check-in reviews.',
          ctaPrimary: 'Build Your Custom Plan',
          ctaSecondary: 'Explore Programs',
          trust: 'Instant calorie & macro calculator · Gym or home tracks · Weekly check-ins',
          imgAlt: 'Athletic performance gym with trainer preparing Olympic barbell weights',
          imgFallback: 'Kinetic Peak Performance Lab',
          overlaySubtitle: 'Structured Training · Flexible Macros · Weekly Check-ins',
          overlayMetricLabel: 'Weekly check-in response',
        }
      : {
          eyebrow: 'التدريب الشخصي المبني على الأداء والأرقام',
          h1: 'ابنِ جسداً قوياً ومتناسقاً بخطة علمية تفصّل على مقاس يومك',
          sub: 'لا مزيد من الجداول العشوائية أو الأنظمة الغذائية القاسية. تحصل على برنامج مقاومة وتغذية مرن محسوب بالسعرات والماكروز، مع مراجعة أسبوعية للأوزان وتصحيح الأداء الحركي.',
          ctaPrimary: 'صمم خطتك المخصصة',
          ctaSecondary: 'استكشف البرامج التدريبية',
          trust: 'حاسبة سعرات وماكروز فورية · خطط للنادي والمنزل · متابعة أسبوعية مباشرة',
          imgAlt: 'صالة تدريب رياضي احترافية مع مدرب يجهز الأوزان الحرة',
          imgFallback: 'مختبر ذروة للأداء الرياضي',
          overlaySubtitle: 'انضباط تدريبي · مرونة غذائية · قياس أسبوعي',
          overlayMetricLabel: 'استجابة وتعديل أسبوعي',
        };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#181E2A] via-[#12161F] to-[#0f131c] pt-12 pb-16 lg:pt-16 lg:pb-20 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8 lg:gap-10">
          {/* Primary Reading Side */}
          <div className="lg:col-span-6 flex flex-col justify-center min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-[#E2F124] mb-4">
              <span className="font-oswald-accent uppercase tracking-widest">KINETIC SLATE</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>{t.eyebrow}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[52px] font-bold text-white leading-[1.22] tracking-tight mb-6">
              {t.h1}
            </h1>

            <p className="text-base sm:text-lg text-[#CBD5E1] leading-[1.7] max-w-xl mb-8">
              {t.sub}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
              <button
                type="button"
                onClick={onStartAssessment}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg px-6 sm:px-7 py-3.5 text-sm sm:text-base font-bold whitespace-nowrap shrink-0 cursor-pointer btn-kinetic-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E2F124]"
              >
                <span>{t.ctaPrimary}</span>
                <ForwardArrow className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onExplorePrograms}
                className="inline-flex items-center justify-center rounded-lg px-5 sm:px-6 py-3.5 text-sm sm:text-base font-semibold whitespace-nowrap shrink-0 cursor-pointer btn-kinetic-ghost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E2F124]"
              >
                {t.ctaSecondary}
              </button>
            </div>

            <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm text-[#94A3B8]">
              <ShieldCheck className="w-4 h-4 text-[#E2F124] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <span>{t.trust}</span>
            </div>
          </div>

          {/* Focal Visual Carrier */}
          <div className="lg:col-span-6 flex min-w-0">
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#161B26] min-h-[300px] lg:min-h-[460px]">
              <ImageWithFallback
                src={HERO_IMAGE_URL}
                alt={t.imgAlt}
                fallbackTitle={t.imgFallback}
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0f131c]/90 via-[#0f131c]/30 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
                <div>
                  <p className="font-oswald-accent text-xs uppercase text-[#E2F124] mb-1">
                    PERFORMANCE SYSTEM
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-white">
                    {t.overlaySubtitle}
                  </p>
                </div>
                <div className="text-start sm:text-end shrink-0">
                  <span className="tabular-metric block text-xl sm:text-2xl font-bold text-[#E2F124]">
                    24h
                  </span>
                  <span className="text-xs text-[#CBD5E1]">{t.overlayMetricLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column KPI Strip Below Hero Split */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between"
            >
              <span className="tabular-metric text-2xl sm:text-3xl font-bold text-[#E2F124] mb-1">
                {kpi.value}
              </span>
              <span className="text-sm text-[#CBD5E1] leading-snug">{kpi.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
