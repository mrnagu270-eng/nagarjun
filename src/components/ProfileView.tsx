import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { updateUserProfile } from '../lib/firestoreService';
import { calculateBmi, type FitnessGoal, type UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  onProfileUpdated: (user: UserProfile) => void;
}

const GOALS: FitnessGoal[] = [
  'Lose Weight',
  'Build Muscle',
  'Maintain Fitness',
  'Improve Endurance',
];

export function ProfileView({ user, onProfileUpdated }: ProfileViewProps) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(String(user.age));
  const [heightCm, setHeightCm] = useState(String(user.height_cm));
  const [weightKg, setWeightKg] = useState(String(user.weight_kg));
  const [targetWeightKg, setTargetWeightKg] = useState(String(user.target_weight_kg));
  const [goal, setGoal] = useState<FitnessGoal>(user.goal);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(String(user.daily_calorie_target));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveBmi = calculateBmi(
    Number(heightCm) || user.height_cm,
    Number(weightKg) || user.weight_kg
  );
  const bmrApprox = Math.round(
    10 * (Number(weightKg) || 70) + 6.25 * (Number(heightCm) || 170) - 5 * (Number(age) || 28)
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateUserProfile(
        user.uid,
        user.email,
        user.photoUrl,
        user.created_at,
        {
          name: name.trim(),
          age: Number(age),
          height_cm: Number(heightCm),
          weight_kg: Number(weightKg),
          target_weight_kg: Number(targetWeightKg),
          goal,
          daily_calorie_target: Number(dailyCalorieTarget),
        }
      );
      onProfileUpdated(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Personal Profile &amp; Body Metrics
          </h2>
          <p className="text-xs text-slate-500">
            Update your age, height, weight, and primary training goal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="prof-email" className="block text-xs font-medium text-slate-700">
                Account Email
              </label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={user.email}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="prof-age" className="block text-xs font-medium text-slate-700">
                Age (years)
              </label>
              <input
                id="prof-age"
                type="number"
                min={13}
                max={110}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="prof-height" className="block text-xs font-medium text-slate-700">
                Height (cm)
              </label>
              <input
                id="prof-height"
                type="number"
                min={100}
                max={250}
                step="0.5"
                required
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="prof-weight" className="block text-xs font-medium text-slate-700">
                Current Weight (kg)
              </label>
              <input
                id="prof-weight"
                type="number"
                min={25}
                max={320}
                step="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="prof-target" className="block text-xs font-medium text-slate-700">
                Target Weight (kg)
              </label>
              <input
                id="prof-target"
                type="number"
                min={25}
                max={320}
                step="0.1"
                required
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="prof-goal" className="block text-xs font-medium text-slate-700">
                Fitness Goal
              </label>
              <select
                id="prof-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prof-calories" className="block text-xs font-medium text-slate-700">
                Daily Calorie Target (kcal)
              </label>
              <input
                id="prof-calories"
                type="number"
                min={1000}
                max={6000}
                step="25"
                required
                value={dailyCalorieTarget}
                onChange={(e) => setDailyCalorieTarget(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              <span>Profile metrics updated in cloud database.</span>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Physiological Baseline
          </h2>
          <p className="text-xs text-slate-500">
            Derived automatically from your current profile values
          </p>
        </div>

        <div className="mt-4 divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between py-3.5">
            <span className="text-slate-600">Current BMI</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {liveBmi.value.toFixed(1)} · {liveBmi.category}
            </span>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <span className="text-slate-600">Healthy Weight Band</span>
            <span className="font-mono font-medium text-slate-900 tabular-nums">
              {liveBmi.healthyMinKg.toFixed(1)} – {liveBmi.healthyMaxKg.toFixed(1)} kg
            </span>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <span className="text-slate-600">Est. Resting Energy (BMR)</span>
            <span className="font-mono font-medium text-slate-900 tabular-nums">
              ~{bmrApprox} kcal/day
            </span>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <span className="text-slate-600">Selected Goal</span>
            <span className="font-medium text-teal-700">{goal}</span>
          </div>
          <div className="flex items-center justify-between py-3.5">
            <span className="text-slate-600">Member Since</span>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              {user.created_at}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
