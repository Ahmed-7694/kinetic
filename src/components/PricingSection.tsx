import { Check } from 'lucide-react';
import { getCoachingTiers } from '../data/coachingData';
import {
  formatTierPricing,
  type BillingCycle,
  type Language,
  type TierCode,
} from '../utils/coachingMath';

interface PricingSectionProps {
  lang: Language;
  billingCycle: BillingCycle;
  onChangeBillingCycle: (cycle: BillingCycle) => void;
  onSelectTier: (tier: TierCode) => void;
}

export function PricingSection({
  lang,
  billingCycle,
  onChangeBillingCycle,
  onSelectTier,
}: PricingSectionProps) {
  const tiers = getCoachingTiers(lang);

  const t =
    lang === 'en'
      ? {
          kicker: 'Coaching Tiers & Accountability',
          heading: 'Invest in a structured plan built for consistency',
          billingAria: 'Billing cycle',
          monthly: 'Monthly',
          quarterly: 'Quarterly (Save 20%)',
        }
      : {
          kicker: 'باقات التدريب والمتابعة',
          heading: 'استثمر في خطة واضحة تضمن استمراريتك',
          billingAria: 'دورة الفوترة',
          monthly: 'اشتراك شهري',
          quarterly: 'ربع سنوي (خصم 20%)',
        };

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-[#161B26] border-y border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-sm font-semibold text-[#E2F124] mb-2">{t.kicker}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">{t.heading}</h2>
          </div>

          <div
            role="group"
            aria-label={t.billingAria}
            className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#12161F] border border-white/10 self-start md:self-auto max-w-full"
          >
            <button
              type="button"
              onClick={() => onChangeBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.monthly}
            </button>
            <button
              type="button"
              onClick={() => onChangeBillingCycle('quarterly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                billingCycle === 'quarterly'
                  ? 'bg-[#E2F124] text-[#12161F]'
                  : 'text-[#CBD5E1] hover:text-white'
              }`}
            >
              {t.quarterly}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier) => {
            const pricing = formatTierPricing(tier.monthlyPriceSar, billingCycle, lang);

            return (
              <div
                key={tier.code}
                className={`relative rounded-2xl p-6 sm:p-8 flex flex-col justify-between ${
                  tier.featured ? 'glass-card-featured' : 'glass-card'
                }`}
              >
                {tier.featured && tier.badgeText && (
                  <div className="absolute -top-3.5 start-6 rounded-full bg-[#E2F124] text-[#12161F] px-3.5 py-1 text-xs font-extrabold shadow-sm">
                    {tier.badgeText}
                  </div>
                )}

                <div>
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white">{tier.arabicName}</h3>
                    <span className="font-oswald-accent text-base font-bold text-[#E2F124]">
                      {tier.code}
                    </span>
                  </div>
                  <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">{tier.tagline}</p>

                  <div className="pb-6 mb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-2.5">
                      <span className="tabular-metric text-4xl font-bold text-white">
                        {pricing.activePrice}
                      </span>
                      {pricing.savingsPercent > 0 && (
                        <span className="tabular-metric text-base text-[#94A3B8] line-through">
                          {pricing.originalPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#CBD5E1] mt-1">{pricing.periodLabel}</p>
                  </div>

                  <ul className="space-y-3.5 mb-8">
                    {tier.deliverables.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm text-[#dfe2ef] leading-relaxed"
                      >
                        <Check
                          className="w-4 h-4 text-[#E2F124] shrink-0 mt-1"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTier(tier.code)}
                  className={`w-full rounded-lg px-5 py-3.5 text-sm font-bold whitespace-nowrap cursor-pointer ${
                    tier.featured ? 'btn-kinetic-primary' : 'btn-kinetic-ghost'
                  }`}
                >
                  {tier.ctaLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
