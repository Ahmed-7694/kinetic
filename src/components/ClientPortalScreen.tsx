import { useState, type FormEvent } from 'react';
import { Check, Dumbbell, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { getDefaultWorkoutDays, type WeightCheckIn } from '../data/coachingData';
import { calculateWorkoutCompletion, type Language } from '../utils/coachingMath';
import type { EnrolledAthletePlan } from './AssessmentScreen';

interface ClientPortalScreenProps {
  lang: Language;
  enrolledPlan: EnrolledAthletePlan | null;
  completedExerciseIds: string[];
  onToggleExercise: (exerciseId: string) => void;
  onResetExercises: () => void;
  weightCheckIns: WeightCheckIn[];
  onAddWeightCheckIn: (entry: WeightCheckIn) => void;
  onEditAssessment: () => void;
}

export function ClientPortalScreen({
  lang,
  enrolledPlan,
  completedExerciseIds,
  onToggleExercise,
  onResetExercises,
  weightCheckIns,
  onAddWeightCheckIn,
  onEditAssessment,
}: ClientPortalScreenProps) {
  const workoutDays = getDefaultWorkoutDays(lang);
  const [selectedDayId, setSelectedDayId] = useState<string>(workoutDays[0].id);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [newWeightNote, setNewWeightNote] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);

  const t =
    lang === 'en'
      ? {
          demoName: 'Khaled Al-Mansour (Demo Profile)',
          defaultSplit: 'Balanced Upper / Lower (4 Days)',
          portalPrefix: 'Client Portal ·',
          recalibrate: 'Recalibrate Plan & Targets',
          calLabel: 'Daily Calorie Target',
          calUnit: 'kcal',
          macrosLabel: 'Daily Macro Targets',
          proteinUnit: 'g P',
          carbsUnit: 'g C',
          fatsUnit: 'g F',
          completionLabel: 'Weekly Workout Completion',
          of: 'of',
          exercisesDone: 'exercises completed',
          lastWeightLabel: 'Latest Logged Weight',
          kgUnit: 'kg',
          scheduleTitle: 'Weekly Training Schedule',
          resetWeek: 'Reset Week',
          daysAria: 'Training days',
          estDuration: 'Est. duration:',
          minUnit: 'min',
          setsWord: 'sets',
          repsWord: 'reps',
          restWord: 'rest',
          secUnit: 's',
          togglePrefix: 'Mark',
          toggleSuffix: 'completed',
          chartTitle: 'Weight Progression Curve',
          chartSub: 'Weekly morning fasted check-in',
          chartAria: 'Weekly weight trend chart',
          weightInputLabel: 'New Weight (kg)',
          weightPlaceholder: 'e.g. 84.5',
          noteLabel: 'Weekly Note (optional)',
          notePlaceholder: 'Strong session energy...',
          logWeightBtn: 'Log Weekly Weight',
          weightErr: 'Please enter a valid weight between 40 and 220 kg.',
          weekPrefix: 'Week',
          defaultNote: 'Logged via Client Portal',
        }
      : {
          demoName: 'خالد المنصور (نموذج تجريبي)',
          defaultSplit: 'علوي / سفلي متوازن (4 أيام)',
          portalPrefix: 'بوابة المتدرب ·',
          recalibrate: 'إعادة معايرة الخطة والأهداف',
          calLabel: 'هدف السعرات اليومي',
          calUnit: 'سعرة',
          macrosLabel: 'توزيع الماكروز اليومي',
          proteinUnit: 'جم بروتين',
          carbsUnit: 'جم كارب',
          fatsUnit: 'جم دهون',
          completionLabel: 'إنجاز الأسبوع التدريبي',
          of: 'من',
          exercisesDone: 'تمارين مكتملة',
          lastWeightLabel: 'آخر وزن مسجل',
          kgUnit: 'كجم',
          scheduleTitle: 'جدول التمارين الأسبوعي',
          resetWeek: 'تصفير الأسبوع',
          daysAria: 'أيام التمرين',
          estDuration: 'المدة المقدرة:',
          minUnit: 'دقيقة',
          setsWord: 'مجموعات',
          repsWord: 'تكرار',
          restWord: 'راحة',
          secUnit: 'ث',
          togglePrefix: 'تحديد',
          toggleSuffix: 'كمكتمل',
          chartTitle: 'منحنى تطور الوزن',
          chartSub: 'متابعة القياس الأسبوعي صباحاً قبل الإفطار',
          chartAria: 'رسم بياني لتطور الوزن الأسبوعي',
          weightInputLabel: 'الوزن الجديد (كجم)',
          weightPlaceholder: 'مثال: 84.5',
          noteLabel: 'ملاحظة الأسبوع (اختياري)',
          notePlaceholder: 'طاقة ممتازة...',
          logWeightBtn: 'تسجيل وزن الأسبوع',
          weightErr: 'يرجى إدخال وزن صحيح بين 40 و 220 كجم.',
          weekPrefix: 'الأسبوع',
          defaultNote: 'تسجيل أسبوعي عبر البوابة',
        };

  const athleteName = enrolledPlan ? enrolledPlan.athleteName : t.demoName;
  const tierCode = enrolledPlan ? enrolledPlan.selectedTier : 'PRO';
  const targetCalories = enrolledPlan ? enrolledPlan.nutrition.targetCalories : 2240;
  const proteinGrams = enrolledPlan ? enrolledPlan.nutrition.proteinGrams : 190;
  const carbsGrams = enrolledPlan ? enrolledPlan.nutrition.carbsGrams : 230;
  const fatsGrams = enrolledPlan ? enrolledPlan.nutrition.fatsGrams : 62;
  const splitTitle = enrolledPlan ? enrolledPlan.nutrition.splitTitle : t.defaultSplit;

  const activeDay = workoutDays.find((d) => d.id === selectedDayId) ?? workoutDays[0];
  const completion = calculateWorkoutCompletion(workoutDays, completedExerciseIds);

  const handleWeightSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(newWeightInput);
    if (!Number.isFinite(parsed) || parsed < 40 || parsed > 220) {
      setWeightError(t.weightErr);
      return;
    }
    setWeightError(null);
    const nextWeekNumber = weightCheckIns.length + 1;
    onAddWeightCheckIn({
      week: `${t.weekPrefix} ${nextWeekNumber}`,
      weightKg: Number(parsed.toFixed(1)),
      note: newWeightNote.trim() || t.defaultNote,
    });
    setNewWeightInput('');
    setNewWeightNote('');
  };

  const weights = weightCheckIns.map((w) => w.weightKg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = Math.max(1, maxW - minW);
  const chartWidth = 360;
  const chartHeight = 120;
  const points = weightCheckIns
    .map((entry, idx) => {
      const x =
        weightCheckIns.length === 1
          ? chartWidth / 2
          : 20 + (idx / (weightCheckIns.length - 1)) * (chartWidth - 40);
      const y = chartHeight - 16 - ((entry.weightKg - minW) / rangeW) * (chartHeight - 36);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <main className="min-h-screen bg-[#0f131c] py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 text-xs font-semibold text-[#E2F124] mb-1.5">
              <span className="font-oswald-accent uppercase">{tierCode} TIER</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>{splitTitle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {t.portalPrefix} {athleteName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEditAssessment}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer btn-kinetic-ghost"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#E2F124]" aria-hidden="true" />
              <span>{t.recalibrate}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <span className="block text-xs text-[#94A3B8] mb-1">{t.calLabel}</span>
            <span className="tabular-metric text-3xl font-bold text-[#E2F124]">
              {targetCalories}
            </span>
            <span className="text-xs text-[#CBD5E1] ms-2">{t.calUnit}</span>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <span className="block text-xs text-[#94A3B8] mb-1">{t.macrosLabel}</span>
            <div className="tabular-metric text-base font-bold text-white mt-1">
              {proteinGrams}
              {t.proteinUnit} · {carbsGrams}
              {t.carbsUnit} · {fatsGrams}
              {t.fatsUnit}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#94A3B8]">{t.completionLabel}</span>
              <span
                data-testid="workout-completion-pct"
                className="tabular-metric text-sm font-bold text-[#E2F124]"
              >
                {completion.percentage}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#12161F] overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#E2F124] transition-all duration-200"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <span className="block text-xs text-[#CBD5E1] mt-2 tabular-metric">
              {completion.completed} {t.of} {completion.total} {t.exercisesDone}
            </span>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <span className="block text-xs text-[#94A3B8] mb-1">{t.lastWeightLabel}</span>
            <span className="tabular-metric text-3xl font-bold text-white">
              {weightCheckIns[weightCheckIns.length - 1]?.weightKg}
            </span>
            <span className="text-xs text-[#CBD5E1] ms-2">{t.kgUnit}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 glass-card rounded-2xl p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <Dumbbell className="w-5 h-5 text-[#E2F124]" aria-hidden="true" />
                <h2 className="text-xl font-bold text-white">{t.scheduleTitle}</h2>
              </div>

              <button
                type="button"
                onClick={onResetExercises}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.resetWeek}</span>
              </button>
            </div>

            <div role="tablist" aria-label={t.daysAria} className="flex flex-wrap gap-2 mb-6">
              {workoutDays.map((day) => {
                const isSelected = day.id === selectedDayId;
                return (
                  <button
                    key={day.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedDayId(day.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#E2F124] text-[#12161F]'
                        : 'bg-[#12161F] text-[#CBD5E1] border border-white/10 hover:text-white'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">{activeDay.focus}</h3>
              <span className="tabular-metric text-xs text-[#94A3B8]">
                {t.estDuration} {activeDay.durationMinutes} {t.minUnit}
              </span>
            </div>

            <div className="space-y-3">
              {activeDay.exercises.map((exercise) => {
                const isDone = completedExerciseIds.includes(exercise.id);
                return (
                  <div
                    key={exercise.id}
                    className={`flex items-center justify-between gap-4 rounded-xl p-4 border transition-colors ${
                      isDone
                        ? 'bg-[#E2F124]/10 border-[#E2F124]/50'
                        : 'bg-[#12161F]/80 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        aria-label={`${t.togglePrefix} ${exercise.name} ${t.toggleSuffix}`}
                        onClick={() => onToggleExercise(exercise.id)}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border cursor-pointer transition-colors ${
                          isDone
                            ? 'bg-[#E2F124] border-[#E2F124] text-[#12161F]'
                            : 'bg-[#12161F] border-white/25 text-transparent hover:border-[#E2F124]'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                      </button>

                      <div>
                        <p
                          className={`text-sm sm:text-base font-bold ${
                            isDone ? 'text-[#E2F124] line-through' : 'text-white'
                          }`}
                        >
                          {exercise.name}
                        </p>
                        <p className="tabular-metric text-xs text-[#94A3B8] mt-1">
                          {exercise.sets} {t.setsWord} × {exercise.reps} {t.repsWord} · {t.restWord}{' '}
                          {exercise.restSeconds} {t.secUnit} · {exercise.targetRpe}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card rounded-2xl p-6 sm:p-7">
              <h2 className="text-xl font-bold text-white mb-1">{t.chartTitle}</h2>
              <p className="text-xs text-[#94A3B8] mb-5">{t.chartSub}</p>

              <div className="rounded-xl bg-[#12161F] border border-white/10 p-4 mb-5">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-32 overflow-visible"
                  role="img"
                  aria-label={t.chartAria}
                >
                  <polyline
                    fill="none"
                    stroke="#E2F124"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                  {weightCheckIns.map((entry, idx) => {
                    const x =
                      weightCheckIns.length === 1
                        ? chartWidth / 2
                        : 20 + (idx / (weightCheckIns.length - 1)) * (chartWidth - 40);
                    const y =
                      chartHeight -
                      16 -
                      ((entry.weightKg - minW) / rangeW) * (chartHeight - 36);
                    return (
                      <g key={`${entry.week}-${idx}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r="4.5"
                          fill="#12161F"
                          stroke="#E2F124"
                          strokeWidth="2.5"
                        />
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          fill="#dfe2ef"
                          fontSize="10"
                          fontFamily="IBM Plex Mono, monospace"
                        >
                          {entry.weightKg}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <form onSubmit={handleWeightSubmit} noValidate className="space-y-3 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="portal-weight"
                      className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                    >
                      {t.weightInputLabel}
                    </label>
                    <input
                      id="portal-weight"
                      type="number"
                      step="0.1"
                      value={newWeightInput}
                      onChange={(e) => setNewWeightInput(e.target.value)}
                      placeholder={t.weightPlaceholder}
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white text-start tabular-metric focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="portal-note"
                      className="block text-xs font-semibold text-[#CBD5E1] mb-1"
                    >
                      {t.noteLabel}
                    </label>
                    <input
                      id="portal-note"
                      type="text"
                      value={newWeightNote}
                      onChange={(e) => setNewWeightNote(e.target.value)}
                      placeholder={t.notePlaceholder}
                      className="w-full rounded-lg bg-[#12161F] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E2F124]"
                    />
                  </div>
                </div>
                {weightError && <p className="text-xs text-[#ffb4ab]">{weightError}</p>}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold cursor-pointer btn-kinetic-primary"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{t.logWeightBtn}</span>
                </button>
              </form>

              <div className="divide-y divide-white/10 max-h-56 overflow-y-auto">
                {[...weightCheckIns].reverse().map((item, index) => (
                  <div
                    key={`${item.week}-${index}`}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-bold text-white">{item.week}</span>
                      <span className="text-[#94A3B8] ms-2">· {item.note}</span>
                    </div>
                    <span className="tabular-metric font-bold text-[#E2F124] shrink-0">
                      {item.weightKg} {t.kgUnit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
