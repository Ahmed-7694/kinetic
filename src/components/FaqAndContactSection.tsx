import { useState, type FormEvent } from 'react';
import { ChevronDown, CheckCircle2, MessageCircle } from 'lucide-react';
import { getFaqItems } from '../data/coachingData';
import {
  buildWhatsAppUrl,
  formatConsultationWhatsAppMessage,
  PERSONAL_WHATSAPP_NUMBER,
  validateLeadForm,
  type Language,
} from '../utils/coachingMath';

interface FaqAndContactSectionProps {
  lang: Language;
}

export function FaqAndContactSection({ lang }: FaqAndContactSectionProps) {
  const faqItems = getFaqItems(lang);
  const [openFaqId, setOpenFaqId] = useState<string>(faqItems[0].id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goalNote, setGoalNote] = useState(
    lang === 'en' ? 'Fat Loss & Body Recomposition' : 'حرق الدهون وشد الجسم'
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedLead, setSubmittedLead] = useState<{
    name: string;
    whatsappUrl: string;
  } | null>(null);

  const t =
    lang === 'en'
      ? {
          faqKicker: 'Frequently Asked Questions',
          faqHeading: 'Direct answers before you start',
          formKicker: 'Free Consultation',
          formHeading: 'Unsure which coaching tier fits you best?',
          formSub:
            'Submit your details to prepare and send your inquiry directly via WhatsApp.',
          successTitle: 'Your message is ready,',
          successDesc: 'Click below to send your consultation details directly to WhatsApp',
          sendWaBtn: 'Send via WhatsApp Now',
          sendAnother: 'Send another inquiry',
          nameLabel: 'Full Name',
          namePlaceholder: 'e.g. Abdullah Al-Subaie',
          phoneLabel: 'WhatsApp / Phone Number',
          emailLabel: 'Email Address',
          goalLabel: 'Primary Goal',
          goalOptions: [
            'Fat Loss & Body Recomposition',
            'Lean Muscle Gain & Strength',
            'Athletic Conditioning & Performance',
          ],
          submitBtn: 'Prepare & Send via WhatsApp',
          quickWa: 'Quick chat on WhatsApp:',
          quickWaMsg: 'Hello, I would like to inquire about coaching programs at Kinetic Peak.',
        }
      : {
          faqKicker: 'الأسئلة الشائعة',
          faqHeading: 'إجابات مباشرة قبل أن تبدأ',
          formKicker: 'استشارة مجانية',
          formHeading: 'هل لديك سؤال عن الباقة الأنسب لك؟',
          formSub:
            'أرسل بياناتك وسيتواصل معك فريق الكابتن طارق لتحديد المسار الأنسب لهدفك وظروفك.',
          successTitle: 'تم تجهيز رسالتك بنجاح،',
          successDesc: 'اضغط على الزر أدناه لإرسال بياناتك واستشارتك مباشرة إلى حساب الواتساب الشخصي',
          sendWaBtn: 'إرسال الرسالة عبر واتساب الآن',
          sendAnother: 'إرسال استفسار آخر',
          nameLabel: 'الاسم الكامل',
          namePlaceholder: 'مثال: عبد الله السبيعي',
          phoneLabel: 'رقم الواتساب / الجوال',
          emailLabel: 'البريد الإلكتروني',
          goalLabel: 'الهدف الأساسي',
          goalOptions: [
            'حرق الدهون وشد الجسم',
            'زيادة الكتلة العضلية والقوة',
            'تحسين اللياقة والأداء الرياضي',
          ],
          submitBtn: 'تجهيز وإرسال الرسالة عبر واتساب',
          quickWa: 'مراسلة سريعة على واتساب:',
          quickWaMsg: 'مرحباً، أود الاستفسار عن برامج التدريب في ذروة كينتك.',
        };

  const selectedGoal = t.goalOptions.includes(goalNote) ? goalNote : t.goalOptions[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateLeadForm({ name, phone, email }, lang);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    const message = formatConsultationWhatsAppMessage(
      {
        name,
        phone,
        email,
        goal: selectedGoal,
      },
      lang
    );
    const whatsappUrl = buildWhatsAppUrl(message, PERSONAL_WHATSAPP_NUMBER);
    setSubmittedLead({
      name: name.trim(),
      whatsappUrl,
    });
    setName('');
    setPhone('');
    setEmail('');
  };

  return (
    <section id="faq" className="py-16 lg:py-24 bg-[#12161F]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* FAQ Accordion */}
          <div className="lg:col-span-7">
            <p className="text-sm font-semibold text-[#E2F124] mb-2">{t.faqKicker}</p>
            <h2 className="text-3xl font-bold text-white mb-8">{t.faqHeading}</h2>

            <div className="space-y-3">
              {faqItems.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id} className="glass-card rounded-xl overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start font-bold text-white cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <span className="text-base">{item.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-[#E2F124] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-sm sm:text-base text-[#CBD5E1] leading-[1.7] border-t border-white/10">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consultation Lead Form */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-6 sm:p-8">
            <p className="text-sm font-semibold text-[#E2F124] mb-2">{t.formKicker}</p>
            <h3 className="text-2xl font-bold text-white mb-2">{t.formHeading}</h3>
            <p className="text-sm text-[#94A3B8] mb-6">{t.formSub}</p>

            {submittedLead ? (
              <div
                role="status"
                className="rounded-xl bg-[#12161F] border border-[#E2F124]/60 p-6 text-start space-y-4"
              >
                <div className="flex items-center gap-2.5 text-[#E2F124] font-bold text-lg">
                  <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>
                    {t.successTitle} {submittedLead.name}
                  </span>
                </div>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  {t.successDesc} (
                  <span dir="ltr" className="tabular-metric font-bold text-white">
                    {PERSONAL_WHATSAPP_NUMBER}
                  </span>
                  ).
                </p>
                <a
                  href={submittedLead.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold cursor-pointer btn-kinetic-primary"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t.sendWaBtn}</span>
                </a>
                <div>
                  <button
                    type="button"
                    onClick={() => setSubmittedLead(null)}
                    className="text-xs font-bold text-[#E2F124] underline cursor-pointer pt-1"
                  >
                    {t.sendAnother}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="lead-name" className="block text-sm font-semibold text-white mb-1.5">
                    {t.nameLabel}
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 text-sm text-white placeholder-[#94A3B8]/60 text-start focus:outline-none focus:border-[#E2F124] focus:ring-2 focus:ring-[#E2F124]/25"
                  />
                  {errors.name && <p className="mt-1 text-xs text-[#ffb4ab]">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="lead-phone" className="block text-sm font-semibold text-white mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <input
                    id="lead-phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 50 123 4567"
                    className={`w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 text-sm text-white placeholder-[#94A3B8]/60 ${
                      lang === 'ar' ? 'text-right' : 'text-left'
                    } focus:outline-none focus:border-[#E2F124] focus:ring-2 focus:ring-[#E2F124]/25`}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-[#ffb4ab]">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="lead-email" className="block text-sm font-semibold text-white mb-1.5">
                    {t.emailLabel}
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 text-sm text-white placeholder-[#94A3B8]/60 ${
                      lang === 'ar' ? 'text-right' : 'text-left'
                    } focus:outline-none focus:border-[#E2F124] focus:ring-2 focus:ring-[#E2F124]/25`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-[#ffb4ab]">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="lead-goal" className="block text-sm font-semibold text-white mb-1.5">
                    {t.goalLabel}
                  </label>
                  <select
                    id="lead-goal"
                    value={t.goalOptions.includes(goalNote) ? goalNote : t.goalOptions[0]}
                    onChange={(e) => setGoalNote(e.target.value)}
                    className="w-full rounded-lg bg-[#12161F] border border-white/15 px-4 py-3 text-sm text-white text-start focus:outline-none focus:border-[#E2F124] focus:ring-2 focus:ring-[#E2F124]/25"
                  >
                    {t.goalOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg px-6 py-3.5 text-sm font-bold cursor-pointer btn-kinetic-primary mt-2"
                >
                  {t.submitBtn}
                </button>
                <div className="pt-2 text-center">
                  <a
                    href={buildWhatsAppUrl(t.quickWaMsg, PERSONAL_WHATSAPP_NUMBER)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#E2F124] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#E2F124]" aria-hidden="true" />
                    <span>
                      {t.quickWa}{' '}
                      <span dir="ltr" className="tabular-metric">
                        {PERSONAL_WHATSAPP_NUMBER}
                      </span>
                    </span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
