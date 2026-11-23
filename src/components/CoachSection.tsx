import { COACH_PORTRAIT_URL, getCoachProfile } from '../data/coachingData';
import type { Language } from '../utils/coachingMath';
import { ImageWithFallback } from './ImageWithFallback';

interface CoachSectionProps {
  lang: Language;
  onOpenPortalPreview: () => void;
}

export function CoachSection({ lang, onOpenPortalPreview }: CoachSectionProps) {
  const profile = getCoachProfile(lang);

  const t =
    lang === 'en'
      ? {
          kicker: 'Coaching Leadership & Credentials',
          splitHeading: 'Sample weekly split inside the Client Portal:',
          previewNote: 'Preview the interactive Client Portal & workout log before enrolling',
          previewBtn: 'Preview Client Portal',
          imgAlt: 'Portrait of Coach Tariq Al-Harbi, certified strength and conditioning specialist',
        }
      : {
          kicker: 'القيادة التدريبية والخبرة الميدانية',
          splitHeading: 'نموذج توزيع الحصص الأسبوعي داخل بوابة المتدرب:',
          previewNote: 'يمكنك معاينة بوابة المتدرب التفاعلية وجدول التمارين قبل الاشتراك',
          previewBtn: 'معاينة بوابة المتدرب',
          imgAlt: 'صورة الكابتن طارق الحربي مدرب القوة والتكييف',
        };

  return (
    <section id="coach" className="py-16 lg:py-24 bg-[#12161F]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8">
          <div className="lg:col-span-5 flex">
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#181E2A] min-h-[380px] lg:min-h-[480px]">
              <ImageWithFallback
                src={COACH_PORTRAIT_URL}
                alt={t.imgAlt}
                fallbackTitle={profile.name}
                className="h-full w-full object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0f131c]/85 via-transparent to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-oswald-accent text-xs uppercase text-[#E2F124] mb-1">
                  HEAD PERFORMANCE COACH
                </p>
                <p className="text-xl font-bold text-white">{profile.name}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 glass-card rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold text-[#E2F124] mb-2">{t.kicker}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {profile.name}
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] mb-6">
                {profile.title} · {profile.credentials}
              </p>

              <p className="text-base text-[#CBD5E1] leading-[1.75] mb-8">{profile.bio}</p>

              <div>
                <h3 className="text-sm font-bold text-white mb-4">{t.splitHeading}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.weeklySplitHighlights.map((item) => (
                    <div
                      key={item.day}
                      className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-[#12161F]/80 border border-white/10"
                    >
                      <span className="text-sm font-bold text-[#E2F124]">{item.day}</span>
                      <span className="text-sm text-[#dfe2ef]">{item.focus}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm text-[#94A3B8]">{t.previewNote}</span>
              <button
                type="button"
                onClick={onOpenPortalPreview}
                className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer btn-kinetic-ghost"
              >
                {t.previewBtn}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
