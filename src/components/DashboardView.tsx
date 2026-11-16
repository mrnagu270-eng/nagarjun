import { useEffect, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { fetchDashboardSummary } from '../lib/firestoreService';
import type { DashboardSummary, UserProfile } from '../types';
import { ProgressChart } from './ProgressChart';
import type { NavSection } from './Sidebar';

interface DashboardViewProps {
  user: UserProfile;
  onNavigate: (section: NavSection) => void;
  refreshKey: number;
}

function getBmiTextTone(category: string): string {
  switch (category) {
    case 'Underweight':
      return 'text-sky-700';
    case 'Normal weight':
      return 'text-emerald-700';
    case 'Overweight':
      return 'text-amber-700';
    default:
      return 'text-rose-700';
  }
}

export function DashboardView({ user, onNavigate, refreshKey }: DashboardViewProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchDashboardSummary(user)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white p-6" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error || 'Dashboard data unavailable.'}
      </div>
    );
  }

  const { bmi, weightStats, workoutStats, nutritionToday, recentProgress, recommendedWorkouts } =
    summary;

  const deltaSign = weightStats.deltaKg > 0 ? '+' : '';
  const caloriePct = Math.min(
    100,
    Math.round((nutritionToday.calories / Math.max(1, user.daily_calorie_target)) * 100)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Current Weight</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {weightStats.currentKg.toFixed(1)} kg
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {deltaSign}
              {weightStats.deltaKg.toFixed(1)} kg since start
            </span>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            Target: {weightStats.targetKg.toFixed(1)} kg
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Body Mass Index</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {bmi.value.toFixed(1)}
            </span>
            <span className={`text-sm font-semibold ${getBmiTextTone(bmi.category)}`}>
              {bmi.category}
            </span>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            Healthy range: {bmi.healthyMinKg.toFixed(1)}–{bmi.healthyMaxKg.toFixed(1)} kg
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Fitness Goal</div>
          <div className="mt-2 truncate font-display text-xl font-semibold text-slate-900">
            {user.goal}
          </div>
          <div className="mt-3.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            Daily energy budget: {user.daily_calorie_target} kcal
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Workout Summary</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {workoutStats.totalSessions}
            </span>
            <span className="text-xs text-slate-500">
              sessions · {workoutStats.sessionsThisWeek} this week
            </span>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600 tabular-nums">
            {workoutStats.totalMinutes} min active · {workoutStats.totalCaloriesBurned} kcal burned
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Progress Summary
              </h2>
              <p className="text-xs text-slate-500">
                Recent body weight trajectory across recorded check-ins
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('progress')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>View Full History</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5">
            <ProgressChart records={recentProgress} mode="weight" height={230} />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent Check-Ins</h3>
              <button
                type="button"
                onClick={() => onNavigate('progress')}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Weight / Activity</span>
              </button>
            </div>

            {recentProgress.length === 0 ? (
              <p className="text-xs text-slate-500">No check-ins logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Activity</th>
                      <th className="py-2 pr-3 text-right font-medium">Weight</th>
                      <th className="py-2 text-right font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...recentProgress]
                      .reverse()
                      .slice(0, 5)
                      .map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pr-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                            {entry.recorded_date}
                          </td>
                          <td className="py-2.5 pr-3 text-slate-900">
                            {entry.workout_title || entry.activity_type}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-slate-900 tabular-nums whitespace-nowrap">
                            {entry.weight_kg !== null ? `${entry.weight_kg.toFixed(1)} kg` : '—'}
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                            {entry.duration_min > 0 ? `${entry.duration_min} min` : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6 xl:col-span-4">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Today&apos;s Nutrition
                </h2>
                <p className="text-xs text-slate-500">Logged intake vs daily target</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('diet')}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
              >
                Open Diet Log
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {nutritionToday.calories} kcal
                </span>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  of {user.daily_calorie_target} kcal ({caloriePct}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-700 transition-all"
                  style={{ width: `${caloriePct}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-3 text-center">
                <div>
                  <div className="text-[11px] text-slate-500">Protein</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {nutritionToday.protein_g}g
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Carbs</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {nutritionToday.carbs_g}g
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Fat</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {nutritionToday.fat_g}g
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Recommended Workouts
                </h2>
                <p className="text-xs text-slate-500">Aligned with {user.goal.toLowerCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('workouts')}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
              >
                Browse All
              </button>
            </div>

            <div className="mt-2 divide-y divide-slate-100">
              {recommendedWorkouts.map((workout) => (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => onNavigate('workouts')}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {workout.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{workout.muscle_group}</span>
                      <span aria-hidden="true">·</span>
                      <span>{workout.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{workout.duration_min} min</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-medium text-teal-700 tabular-nums whitespace-nowrap shrink-0">
                    {workout.calories_est} kcal
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
