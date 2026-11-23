import { useState } from 'react';
import { getTransformationCases } from '../data/coachingData';
import type { Language } from '../utils/coachingMath';

type TransformationFilter = 'all' | 'fat_loss' | 'muscle_gain';

interface TransformationsSectionProps {
  lang: Language;
}

export function TransformationsSection({ lang }: TransformationsSectionProps) {
  const [filter, setFilter] = useState<TransformationFilter>('all');
  const cases = getTransformationCases(lang);

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
          {visibleCases.map((item) => {
            const weightDelta = (item.endWeightKg - item.startWeightKg).toFixed(1);
            const deltaDisplay =
              Number(weightDelta) > 0
                ? `+${weightDelta} ${t.unitKg}`
                : `${weightDelta} ${t.unitKg}`;

            return (
              <article
                key={item.id}
                className="glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
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

                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/10 mb-5">
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
                      <span className="tabular-metric text-lg sm:text-xl font-bold text-white">
                        {item.bodyFatDelta}
                      </span>
                    </div>
                  </div>

                  <blockquote className="text-sm sm:text-base text-[#CBD5E1] leading-[1.7]">
                    {lang === 'en' ? `"${item.quote}"` : `«${item.quote}»`}
                  </blockquote>
                </div>

                <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-2">
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
