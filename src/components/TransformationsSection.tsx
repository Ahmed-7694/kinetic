import { useEffect, useId, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import {
  TRANSFORMATION_CASES,
  type TransformationCase,
} from '../data/coachingData';
import type { Language } from '../utils/coachingMath';

type TransformationFilter = 'all' | 'fat_loss' | 'muscle_gain';
type ViewMode = 'before' | 'compare' | 'after';

interface TransformationsSectionProps {
  lang: Language;
  cases: TransformationCase[];
}

interface ComparisonCopy {
  beforeTab: string;
  compareTab: string;
  afterTab: string;
  beforeWord: string;
  afterWord: string;
  unitKg: string;
  sliderAria: (name: string) => string;
  switcherAria: (name: string) => string;
  beforeAlt: (item: TransformationCase) => string;
  afterAlt: (item: TransformationCase) => string;
}

function TransformationComparison({
  item,
  index,
  isRtl,
  copy,
}: {
  item: TransformationCase;
  index: number;
  isRtl: boolean;
  copy: ComparisonCopy;
}) {
  const sliderId = useId();
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [sliderPct, setSliderPct] = useState<number>(50);
  const [brokenBefore, setBrokenBefore] = useState(false);
  const [brokenAfter, setBrokenAfter] = useState(false);

  const fallbackDefault =
    TRANSFORMATION_CASES.find((d) => d.id === item.id) ??
    TRANSFORMATION_CASES[index % TRANSFORMATION_CASES.length] ??
    TRANSFORMATION_CASES[0];

  const beforeSrc = item.beforeImageUrl || fallbackDefault?.beforeImageUrl || '';
  const afterSrc = item.afterImageUrl || fallbackDefault?.afterImageUrl || '';

  useEffect(() => {
    setBrokenBefore(false);
  }, [beforeSrc]);

  useEffect(() => {
    setBrokenAfter(false);
  }, [afterSrc]);

  // Inside the dir="ltr" visual frame:
  // - In LTR (English): Left = Before (button on left), Right = After (button on right).
  //   effectivePct=100 -> full Before; effectivePct=0 -> full After; clipPath inset(0 0 0 effectivePct%).
  // - In RTL (Arabic): Right = Before (button on right), Left = After (button on left).
  //   effectivePct=0 -> full Before; effectivePct=100 -> full After; clipPath inset(0 (100 - effectivePct)% 0 0).
  const effectivePct = isRtl
    ? viewMode === 'before'
      ? 0
      : viewMode === 'after'
        ? 100
        : sliderPct
    : viewMode === 'before'
      ? 100
      : viewMode === 'after'
        ? 0
        : sliderPct;

  const afterClipPath = isRtl
    ? `inset(0 ${100 - effectivePct}% 0 0)`
    : `inset(0 0 0 ${effectivePct}%)`;

  const handleSelectMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'compare' && (sliderPct < 10 || sliderPct > 90)) {
      setSliderPct(50);
    }
  };

  const renderFallbackCard = (stageLabel: string, weightKg: number, accentLime: boolean) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#12161F] via-[#1B2231] to-[#12161F] p-6 text-center">
      <span
        className={`text-xs font-bold tracking-wide mb-2 ${
          accentLime ? 'text-[#E2F124]' : 'text-[#CBD5E1]'
        }`}
      >
        {stageLabel}
      </span>
      <span
        className={`tabular-metric text-3xl font-extrabold ${
          accentLime ? 'text-[#E2F124]' : 'text-white'
        }`}
      >
        {weightKg} {copy.unitKg}
      </span>
      <span className="text-xs text-[#94A3B8] mt-1">{item.clientName}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div
        dir="ltr"
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#12161F] border border-white/10 select-none group"
      >
        {/* Base Layer: Before Photo */}
        {!beforeSrc || brokenBefore ? (
          renderFallbackCard(copy.beforeWord, item.startWeightKg, false)
        ) : (
          <img
            src={beforeSrc}
            alt={copy.beforeAlt(item)}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBrokenBefore(true)}
            className="absolute inset-0 w-full h-full object-cover object-[50%_18%]"
          />
        )}

        {/* Overlaid Layer: After Photo clipped seamlessly */}
        <div
          style={{ clipPath: afterClipPath }}
          className="absolute inset-0 transition-[clip-path] duration-200 ease-out"
        >
          {!afterSrc || brokenAfter ? (
            renderFallbackCard(copy.afterWord, item.endWeightKg, true)
          ) : (
            <img
              src={afterSrc}
              alt={copy.afterAlt(item)}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBrokenAfter(true)}
              className="absolute inset-0 w-full h-full object-cover object-[50%_18%]"
            />
          )}
        </div>

        {/* Contrast Gradient Scrims */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12161F]/85 via-transparent to-[#12161F]/25"
        />

        {/* Corner Weight Readouts aligned with each stage side */}
        {(viewMode === 'compare' || viewMode === 'before') && (
          <div
            className={`pointer-events-none absolute bottom-3 ${
              isRtl ? 'right-3' : 'left-3'
            } z-10 rounded-md bg-[#12161F]/85 backdrop-blur-sm border border-white/15 px-2.5 py-1 text-xs font-semibold text-white`}
          >
            <span>{copy.beforeWord}</span>
            <span className="text-[#94A3B8] mx-1.5">·</span>
            <span className="tabular-metric font-bold">
              {item.startWeightKg} {copy.unitKg}
            </span>
          </div>
        )}

        {(viewMode === 'compare' || viewMode === 'after') && (
          <div
            className={`pointer-events-none absolute bottom-3 ${
              isRtl ? 'left-3' : 'right-3'
            } z-10 rounded-md bg-[#12161F]/85 backdrop-blur-sm border border-[#E2F124]/40 px-2.5 py-1 text-xs font-semibold text-[#E2F124]`}
          >
            <span>{copy.afterWord}</span>
            <span className="text-white/40 mx-1.5">·</span>
            <span className="tabular-metric font-bold">
              {item.endWeightKg} {copy.unitKg}
            </span>
          </div>
        )}

        {/* Interactive Split Divider & Handle (Visible in Compare Mode) */}
        {viewMode === 'compare' && (
          <div
            aria-hidden="true"
            style={{ left: `${effectivePct}%` }}
            className="pointer-events-none absolute inset-y-0 z-10 -translate-x-1/2 flex flex-col items-center justify-center transition-[left] duration-200 ease-out"
          >
            <div className="w-0.5 flex-1 bg-[#E2F124] shadow-[0_0_14px_rgba(226,241,36,0.75)]" />
            <div className="w-9 h-9 rounded-full bg-[#E2F124] text-[#12161F] shadow-lg ring-4 ring-[#12161F]/60 flex items-center justify-center shrink-0">
              <MoveHorizontal className="w-4 h-4" />
            </div>
            <div className="w-0.5 flex-1 bg-[#E2F124] shadow-[0_0_14px_rgba(226,241,36,0.75)]" />
          </div>
        )}

        {/* Accessible Range Slider spanning the comparison stage */}
        <label htmlFor={sliderId} className="sr-only">
          {copy.sliderAria(item.clientName)}
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={effectivePct}
          aria-label={copy.sliderAria(item.clientName)}
          onChange={(e) => {
            setViewMode('compare');
            setSliderPct(Number(e.target.value));
          }}
          className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-ew-resize focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E2F124]"
        />
      </div>

      {/* Dynamic View Mode Switcher */}
      <div
        role="group"
        aria-label={copy.switcherAria(item.clientName)}
        className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#12161F] border border-white/10"
      >
        <button
          type="button"
          aria-pressed={viewMode === 'before'}
          onClick={() => handleSelectMode('before')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            viewMode === 'before'
              ? 'bg-white text-[#12161F]'
              : 'text-[#CBD5E1] hover:text-white'
          }`}
        >
          {copy.beforeTab}
        </button>
        <button
          type="button"
          aria-pressed={viewMode === 'compare'}
          onClick={() => handleSelectMode('compare')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            viewMode === 'compare'
              ? 'bg-[#E2F124] text-[#12161F]'
              : 'text-[#CBD5E1] hover:text-white'
          }`}
        >
          {copy.compareTab}
        </button>
        <button
          type="button"
          aria-pressed={viewMode === 'after'}
          onClick={() => handleSelectMode('after')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            viewMode === 'after'
              ? 'bg-[#E2F124] text-[#12161F]'
              : 'text-[#CBD5E1] hover:text-white'
          }`}
        >
          {copy.afterTab}
        </button>
      </div>
    </div>
  );
}

export function TransformationsSection({ lang, cases }: TransformationsSectionProps) {
  const [filter, setFilter] = useState<TransformationFilter>('all');

  const visibleCases =
    filter === 'all' ? cases : cases.filter((c) => c.goalCategory === filter);

  const t =
    lang === 'en'
      ? {
          kicker: 'Verified Numeric Outcomes',
          heading: 'Real transformations built from day one',
          filterAria: 'Filter transformation stories',
          all: 'All Results',
          fatLoss: 'Fat Loss',
          muscleGain: 'Muscle Gain',
          weeksSuffix: 'Weeks',
          before: 'Starting Weight',
          after: 'Current Weight',
          net: 'Net Result',
          unitKg: 'kg',
          deltaPrefix: 'Weight Delta:',
          beforeTab: 'Before',
          compareTab: 'Compare',
          afterTab: 'After',
          beforeWord: 'Before',
          afterWord: 'After',
        }
      : {
          kicker: 'نتائج موثقة بالأرقام',
          heading: 'تحولات حقيقية لمشتركين بدأوا من الصفر',
          filterAria: 'تصفية قصص التحول',
          all: 'جميع التحولات',
          fatLoss: 'التنشيف وحرق الدهون',
          muscleGain: 'البناء العضلي',
          weeksSuffix: 'أسبوعاً',
          before: 'قبل البدء',
          after: 'بعد الالتزام',
          net: 'صافي التغيير',
          unitKg: 'كجم',
          deltaPrefix: 'فارق الوزن:',
          beforeTab: 'قبل',
          compareTab: 'مقارنة ديناميكية',
          afterTab: 'بعد',
          beforeWord: 'قبل',
          afterWord: 'بعد',
        };

  const comparisonCopy: ComparisonCopy = {
    beforeTab: t.beforeTab,
    compareTab: t.compareTab,
    afterTab: t.afterTab,
    beforeWord: t.beforeWord,
    afterWord: t.afterWord,
    unitKg: t.unitKg,
    sliderAria: (name) =>
      lang === 'en'
        ? `Compare before and after transformation photos for ${name}`
        : `مقارنة صورة قبل وبعد للتحول الخاص بـ ${name}`,
    switcherAria: (name) =>
      lang === 'en'
        ? `Switch before or after view for ${name}`
        : `تبديل عرض قبل وبعد لـ ${name}`,
    beforeAlt: (item) =>
      lang === 'en'
        ? `${item.clientName} before starting coaching at ${item.startWeightKg} kg`
        : `${item.clientName} قبل بدء البرنامج بوزن ${item.startWeightKg} كجم`,
    afterAlt: (item) =>
      lang === 'en'
        ? `${item.clientName} after ${item.timeframeWeeks} weeks at ${item.endWeightKg} kg`
        : `${item.clientName} بعد ${item.timeframeWeeks} أسبوعاً بوزن ${item.endWeightKg} كجم`,
  };

  return (
    <section id="transformations" className="py-16 lg:py-24 bg-[#161B26] border-y border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#E2F124] mb-2">{t.kicker}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">{t.heading}</h2>
          </div>

          <div
            role="group"
            aria-label={t.filterAria}
            className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#12161F] border border-white/10 self-start md:self-auto max-w-full"
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                filter === 'all'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.all}
            </button>
            <button
              type="button"
              onClick={() => setFilter('fat_loss')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                filter === 'fat_loss'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.fatLoss}
            </button>
            <button
              type="button"
              onClick={() => setFilter('muscle_gain')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                filter === 'muscle_gain'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.muscleGain}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleCases.map((item, idx) => {
            const weightDelta = (item.endWeightKg - item.startWeightKg).toFixed(1);
            const deltaDisplay =
              Number(weightDelta) > 0
                ? `+${weightDelta} ${t.unitKg}`
                : `${weightDelta} ${t.unitKg}`;

            return (
              <article
                key={item.id}
                className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-5">
                  <TransformationComparison
                    item={item}
                    index={idx}
                    isRtl={lang === 'ar'}
                    copy={comparisonCopy}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">{item.clientName}</h3>
                      <p className="text-xs sm:text-sm text-[#94A3B8]">
                        {item.cityAndRole} · {item.programUsed}
                      </p>
                    </div>
                    <span className="tabular-metric text-sm font-bold text-[#E2F124]">
                      {item.timeframeWeeks} {t.weeksSuffix}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10">
                    <div>
                      <span className="block text-xs text-[#94A3B8] mb-1">{t.before}</span>
                      <span className="tabular-metric text-lg sm:text-xl font-bold text-white">
                        {item.startWeightKg} {t.unitKg}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-[#94A3B8] mb-1">{t.after}</span>
                      <span className="tabular-metric text-lg sm:text-xl font-bold text-[#E2F124]">
                        {item.endWeightKg} {t.unitKg}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-[#94A3B8] mb-1">{t.net}</span>
                      <span className="tabular-metric block text-sm sm:text-xl font-bold text-white leading-snug">
                        {item.bodyFatDelta}
                      </span>
                    </div>
                  </div>

                  <blockquote className="text-sm sm:text-base text-[#CBD5E1] leading-[1.7]">
                    {lang === 'en' ? `"${item.quote}"` : `«${item.quote}»`}
                  </blockquote>
                </div>

                <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
                  <span>{item.goalLabel}</span>
                  <span className="tabular-metric text-white font-semibold">
                    {t.deltaPrefix} {deltaDisplay}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
