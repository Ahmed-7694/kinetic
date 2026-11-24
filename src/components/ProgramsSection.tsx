import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { ProgramTrack } from '../data/coachingData';
import type { Language, TrainingGoal } from '../utils/coachingMath';
import { ImageWithFallback } from './ImageWithFallback';

interface ProgramsSectionProps {
  lang: Language;
  tracks: ProgramTrack[];
  onSelectGoalForAssessment: (goal: TrainingGoal) => void;
}

export function ProgramsSection({
  lang,
  tracks,
  onSelectGoalForAssessment,
}: ProgramsSectionProps) {
  const [selectedGoal, setSelectedGoal] = useState<TrainingGoal>('fat_loss');
  const activeProgram = tracks.find((track) => track.id === selectedGoal) ?? tracks[0];
  const ForwardArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  const t =
    lang === 'en'
      ? {
          kicker: 'Specialized Coaching Tracks',
          heading: 'Choose the track engineered for your goal',
          tablistLabel: 'Training tracks',
          tabFatLoss: 'Fat Loss & Shred',
          tabMuscle: 'Hypertrophy & Strength',
          tabRecomp: 'Athletic Recomp',
          footerNote: 'Includes assessment + training split + calorie calculator',
          cta: 'Calculate This Track',
          methodKicker: 'Inside the Program',
          methodHeading: 'Three steps turning consistency into measurable output',
          methodLeft: 'Available for gym or home',
          methodRight: 'Weekly progression updates',
        }
      : {
          kicker: 'المسارات التدريبية التخصصية',
          heading: 'اختر المسار المصمم لهدفك الجسدي',
          tablistLabel: 'المسارات التدريبية',
          tabFatLoss: 'التنشيف وحرق الدهون',
          tabMuscle: 'الضخامة العضلية',
          tabRecomp: 'الأداء الرياضي',
          footerNote: 'يشمل تقييم القياسات + جدول التمرين + حاسبة السعرات',
          cta: 'احسب أرقام هذا المسار',
          methodKicker: 'آلية العمل داخل البرنامج',
          methodHeading: 'ثلاث خطوات تحول التزامك إلى أرقام ملموسة',
          methodLeft: 'متاح للنادي الرياضي أو المنزل',
          methodRight: 'تعديل أسبوعي مستمر',
        };

  return (
    <section id="programs" className="py-16 lg:py-24 bg-[#12161F]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-semibold text-[#E2F124] mb-2">{t.kicker}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">{t.heading}</h2>
          </div>

          <div
            role="tablist"
            aria-label={t.tablistLabel}
            className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#181E2A] border border-white/10 max-w-full"
          >
            {tracks.map((track) => {
              const isSelected = track.id === selectedGoal;
              return (
                <button
                  key={track.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedGoal(track.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#E2F124] text-[#12161F]'
                      : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {track.id === 'fat_loss' && t.tabFatLoss}
                  {track.id === 'muscle_gain' && t.tabMuscle}
                  {track.id === 'athletic_recomp' && t.tabRecomp}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-6">
          <div className="lg:col-span-7 glass-card rounded-2xl overflow-hidden flex flex-col">
            <div className="relative h-64 sm:h-72 w-full overflow-hidden">
              <ImageWithFallback
                src={activeProgram.imageUrl}
                alt={activeProgram.imageAlt}
                fallbackTitle={activeProgram.title}
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#1E2533] via-[#1E2533]/25 to-transparent"
              />
              <div className="absolute bottom-4 right-6 left-6 flex flex-wrap items-center justify-between gap-2">
                <span className="font-oswald-accent text-sm font-bold uppercase text-[#E2F124]">
                  {activeProgram.englishCode}
                </span>
                <span className="text-xs sm:text-sm text-[#CBD5E1] tabular-metric">
                  {activeProgram.durationWeeks} · {activeProgram.sessionsPerWeek} · {activeProgram.sessionLength}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  {activeProgram.title}
                </h3>
                <p className="text-base text-[#CBD5E1] leading-[1.7] mb-6">
                  {activeProgram.summary}
                </p>

                <ul className="space-y-3">
                  {activeProgram.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-3 text-sm sm:text-base text-[#dfe2ef]">
                      <Check className="w-5 h-5 text-[#E2F124] shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm text-[#94A3B8]">{t.footerNote}</span>
                <button
                  type="button"
                  onClick={() => onSelectGoalForAssessment(activeProgram.id)}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer btn-kinetic-primary"
                >
                  <span>{t.cta}</span>
                  <ForwardArrow className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#94A3B8] mb-2">{t.methodKicker}</p>
              <h3 className="text-2xl font-bold text-white mb-6">{t.methodHeading}</h3>

              <div className="divide-y divide-white/10">
                {activeProgram.methodologySteps.map((step) => (
                  <div key={step.index} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-baseline gap-3 mb-1.5">
                      <span className="tabular-metric text-lg font-bold text-[#E2F124]">
                        {step.index}.
                      </span>
                      <h4 className="text-lg font-bold text-white">{step.title}</h4>
                    </div>
                    <p className="text-sm text-[#CBD5E1] leading-[1.65] ps-8">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-[#CBD5E1]">
              <span>{t.methodLeft}</span>
              <span className="text-[#E2F124] font-semibold">{t.methodRight}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
