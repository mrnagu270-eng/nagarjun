import { useState } from 'react';
import { Check } from 'lucide-react';
import { addProgressRecord, updateUserProfile } from '../lib/firestoreService';
import { calculateBmi, type UserProfile } from '../types';

interface BmiCalculatorViewProps {
  user: UserProfile;
  onProfileUpdated: (user: UserProfile) => void;
}

const CATEGORIES = [
  {
    name: 'Underweight',
    range: 'Below 18.5',
    tone: 'text-sky-700',
    bar: 'bg-sky-500',
  },
  {
    name: 'Normal weight',
    range: '18.5 – 24.9',
    tone: 'text-emerald-700',
    bar: 'bg-emerald-600',
  },
  {
    name: 'Overweight',
    range: '25.0 – 29.9',
    tone: 'text-amber-700',
    bar: 'bg-amber-500',
  },
  {
    name: 'Obesity',
    range: '30.0 and above',
    tone: 'text-rose-700',
    bar: 'bg-rose-600',
  },
];

export function BmiCalculatorView({ user, onProfileUpdated }: BmiCalculatorViewProps) {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [heightCm, setHeightCm] = useState<number>(user.height_cm);
  const [weightKg, setWeightKg] = useState<number>(user.weight_kg);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bmi = calculateBmi(heightCm, weightKg);

  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  const weightLbs = Math.round(weightKg * 2.20462 * 10) / 10;

  function handleImperialHeight(nextFeet: number, nextInches: number) {
    const safeFeet = Math.max(3, Math.min(8, nextFeet || 5));
    const safeInches = Math.max(0, Math.min(11, nextInches || 0));
    const cm = Math.round((safeFeet * 12 + safeInches) * 2.54 * 10) / 10;
    setHeightCm(cm);
  }

  function handleImperialWeight(lbs: number) {
    const kg = Math.round((Math.max(66, Math.min(660, lbs || 150)) / 2.20462) * 10) / 10;
    setWeightKg(kg);
  }

  const markerPct = Math.max(2, Math.min(98, ((bmi.value - 14) / (38 - 14)) * 100));

  async function handleSaveToProfile() {
    setSaving(true);
    setError(null);
    setSavedNotice(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const roundedHeight = Math.round(heightCm * 10) / 10;
      const roundedWeight = Math.round(weightKg * 10) / 10;
      const updated = await updateUserProfile(
        user.uid,
        user.email,
        user.photoUrl,
        user.created_at,
        {
          name: user.name,
          age: user.age,
          height_cm: roundedHeight,
          weight_kg: roundedWeight,
          target_weight_kg: user.target_weight_kg,
          goal: user.goal,
          daily_calorie_target: user.daily_calorie_target,
        }
      );
      await addProgressRecord(user.uid, {
        recorded_date: today,
        weight_kg: roundedWeight,
        activity_type: 'Weigh-In',
        workout_title: 'BMI Check-In',
        duration_min: 0,
        calories_burned: 0,
        notes: `Saved from BMI Calculator (BMI ${bmi.value.toFixed(1)}, ${bmi.category}).`,
      });
      onProfileUpdated(updated);
      setSavedNotice('Height, weight, and weigh-in record saved to your cloud profile.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save measurements.');
    } finally {
      setSaving(false);
    }
  }

  const activeCategoryMeta = CATEGORIES.find((c) => c.name === bmi.category) || CATEGORIES[1];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Body Measurements
            </h2>
            <p className="text-xs text-slate-500">
              Adjust height and weight for instant BMI evaluation
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setUnit('metric')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                unit === 'metric'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Metric (cm / kg)
            </button>
            <button
              type="button"
              onClick={() => setUnit('imperial')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                unit === 'imperial'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Imperial (ft / lbs)
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {unit === 'metric' ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="bmi-height-cm" className="text-sm font-medium text-slate-700">
                    Height (cm)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="bmi-height-cm"
                      type="number"
                      min={100}
                      max={240}
                      step="0.5"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">cm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={120}
                  max={220}
                  step={0.5}
                  value={Math.min(220, Math.max(120, heightCm))}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  aria-label="Height slider in centimeters"
                  className="mt-3 w-full accent-teal-700"
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
                  <span>120 cm</span>
                  <span>170 cm</span>
                  <span>220 cm</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="bmi-weight-kg" className="text-sm font-medium text-slate-700">
                    Weight (kg)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="bmi-weight-kg"
                      type="number"
                      min={30}
                      max={250}
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value) || 70)}
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">kg</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={35}
                  max={180}
                  step={0.5}
                  value={Math.min(180, Math.max(35, weightKg))}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  aria-label="Weight slider in kilograms"
                  className="mt-3 w-full accent-teal-700"
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
                  <span>35 kg</span>
                  <span>105 kg</span>
                  <span>180 kg</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="block text-sm font-medium text-slate-700">
                  Height (feet &amp; inches)
                </span>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bmi-ft" className="text-xs text-slate-500">
                      Feet
                    </label>
                    <input
                      id="bmi-ft"
                      type="number"
                      min={3}
                      max={8}
                      value={feet}
                      onChange={(e) => handleImperialHeight(Number(e.target.value), inches)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="bmi-in" className="text-xs text-slate-500">
                      Inches
                    </label>
                    <input
                      id="bmi-in"
                      type="number"
                      min={0}
                      max={11}
                      value={inches}
                      onChange={(e) => handleImperialHeight(feet, Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="bmi-lbs" className="block text-sm font-medium text-slate-700">
                  Weight (lbs)
                </label>
                <input
                  id="bmi-lbs"
                  type="number"
                  min={70}
                  max={550}
                  step="0.5"
                  value={weightLbs}
                  onChange={(e) => handleImperialWeight(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                />
                <p className="mt-1.5 font-mono text-xs text-slate-500 tabular-nums">
                  Metric equivalent: {heightCm.toFixed(1)} cm · {weightKg.toFixed(1)} kg
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
          {savedNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => {
                setHeightCm(user.height_cm);
                setWeightKg(user.weight_kg);
                setSavedNotice(null);
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset to Profile
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveToProfile}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Measurements to Profile'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            BMI Evaluation
          </h2>
          <p className="text-xs text-slate-500">
            Calculated via standard formula: weight (kg) / height (m)²
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">Computed Score</div>
            <div className="mt-1 font-mono text-5xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {bmi.value.toFixed(1)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Classification</div>
            <div className={`mt-1 font-display text-2xl font-semibold ${activeCategoryMeta.tone}`}>
              {bmi.category}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-sky-500" style={{ width: '18.75%' }} />
            <div className="h-full bg-emerald-600" style={{ width: '27.08%' }} />
            <div className="h-full bg-amber-500" style={{ width: '20.83%' }} />
            <div className="h-full bg-rose-600" style={{ width: '33.34%' }} />
          </div>
          <div className="relative mt-1 h-4">
            <div
              className="absolute -top-4 -translate-x-1/2 transition-all duration-150"
              style={{ left: `${markerPct}%` }}
            >
              <div className="h-5 w-1 rounded-full bg-slate-900 ring-2 ring-white" />
            </div>
          </div>
          <div className="flex justify-between font-mono text-[11px] text-slate-500 tabular-nums">
            <span>14</span>
            <span>18.5</span>
            <span>25.0</span>
            <span>30.0</span>
            <span>38</span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{bmi.summary}</p>

        <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
          <span className="font-medium text-slate-700">
            Healthy Weight Range ({heightCm.toFixed(0)} cm)
          </span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {bmi.healthyMinKg.toFixed(1)} kg – {bmi.healthyMaxKg.toFixed(1)} kg
          </span>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold text-slate-900">Reference Categories</h3>
          <div className="mt-2 divide-y divide-slate-100">
            {CATEGORIES.map((cat) => {
              const isCurrent = cat.name === bmi.category;
              return (
                <div
                  key={cat.name}
                  className={`flex items-start justify-between gap-4 py-2.5 text-xs ${
                    isCurrent ? 'font-medium text-slate-900' : 'text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${cat.bar}`} />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-mono tabular-nums whitespace-nowrap">{cat.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
