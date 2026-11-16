import { useEffect, useState, type FormEvent } from 'react';
import { Check, Trash2 } from 'lucide-react';
import {
  addProgressRecord,
  deleteProgressRecord,
  listProgressRecords,
} from '../lib/firestoreService';
import type { ActivityType, ProgressRecord, UserProfile } from '../types';
import { ProgressChart } from './ProgressChart';

interface ProgressTrackingViewProps {
  user: UserProfile;
  onProgressUpdated: () => void;
}

const ACTIVITIES: ActivityType[] = [
  'Strength Training',
  'Cardio',
  'Mobility & Recovery',
  'Weigh-In',
];

export function ProgressTrackingView({
  user,
  onProgressUpdated,
}: ProgressTrackingViewProps) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [chartMode, setChartMode] = useState<'weight' | 'activity'>('weight');
  const [filterType, setFilterType] = useState<'All' | ActivityType>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [recordedDate, setRecordedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState(String(user.weight_kg));
  const [activityType, setActivityType] = useState<ActivityType>('Strength Training');
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [durationMin, setDurationMin] = useState('35');
  const [caloriesBurned, setCaloriesBurned] = useState('250');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadRecords() {
    setLoading(true);
    setError(null);
    try {
      const items = await listProgressRecords(user.uid);
      setRecords(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load progress history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [user.uid]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const parsedWeight = weightKg.trim() !== '' ? Number(weightKg) : null;
      await addProgressRecord(user.uid, {
        recorded_date: recordedDate,
        weight_kg: parsedWeight,
        activity_type: activityType,
        workout_title: workoutTitle.trim() || activityType,
        duration_min: activityType === 'Weigh-In' ? 0 : Number(durationMin) || 0,
        calories_burned: activityType === 'Weigh-In' ? 0 : Number(caloriesBurned) || 0,
        notes: notes.trim(),
      });
      setWorkoutTitle('');
      setNotes('');
      setFeedback('Progress entry saved permanently.');
      await loadRecords();
      onProgressUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save progress record.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProgressRecord(user.uid, id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      onProgressUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete record.');
    }
  }

  const filteredRecords = records.filter((r) =>
    filterType === 'All' ? true : r.activity_type === filterType
  );

  const weightRecords = records.filter((r) => r.weight_kg !== null);
  const chronologicalWeights = [...weightRecords].sort((a, b) =>
    a.recorded_date.localeCompare(b.recorded_date)
  );
  const startW =
    chronologicalWeights.length > 0 ? Number(chronologicalWeights[0].weight_kg) : user.weight_kg;
  const latestW =
    chronologicalWeights.length > 0
      ? Number(chronologicalWeights[chronologicalWeights.length - 1].weight_kg)
      : user.weight_kg;
  const netDelta = Math.round((latestW - startW) * 10) / 10;
  const totalMinutes = records.reduce((s, r) => s + Number(r.duration_min || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Starting Weight</div>
          <div className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {startW.toFixed(1)} kg
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Latest Recorded</div>
          <div className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {latestW.toFixed(1)} kg
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Net Change</div>
          <div className="mt-1 font-mono text-xl font-semibold text-teal-700 tabular-nums">
            {netDelta > 0 ? '+' : ''}
            {netDelta.toFixed(1)} kg
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Logged Activity Volume</div>
          <div className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {totalMinutes} min
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-5">
          <div className="border-b border-slate-100 pb-3.5">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Record Weight &amp; Activity
            </h2>
            <p className="text-xs text-slate-500">
              Log a weigh-in, workout session, or recovery activity
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prog-date" className="block text-xs font-medium text-slate-700">
                  Date
                </label>
                <input
                  id="prog-date"
                  type="date"
                  required
                  value={recordedDate}
                  onChange={(e) => setRecordedDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prog-weight" className="block text-xs font-medium text-slate-700">
                  Weight (kg, optional)
                </label>
                <input
                  id="prog-weight"
                  type="number"
                  step="0.1"
                  min={25}
                  max={320}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="74.0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prog-activity" className="block text-xs font-medium text-slate-700">
                Activity Type
              </label>
              <select
                id="prog-activity"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {ACTIVITIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {activityType !== 'Weigh-In' && (
              <>
                <div>
                  <label htmlFor="prog-title" className="block text-xs font-medium text-slate-700">
                    Session / Exercise Name
                  </label>
                  <input
                    id="prog-title"
                    type="text"
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    placeholder="e.g. Upper Body Push or 5K Tempo Run"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="prog-dur" className="block text-xs font-medium text-slate-700">
                      Duration (min)
                    </label>
                    <input
                      id="prog-dur"
                      type="number"
                      min={0}
                      max={600}
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="prog-cal" className="block text-xs font-medium text-slate-700">
                      Calories Burned
                    </label>
                    <input
                      id="prog-cal"
                      type="number"
                      min={0}
                      max={5000}
                      value={caloriesBurned}
                      onChange={(e) => setCaloriesBurned(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="prog-notes" className="block text-xs font-medium text-slate-700">
                Notes
              </label>
              <textarea
                id="prog-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Energy levels, personal records, or recovery observations..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}
            {feedback && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <Check className="h-4 w-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
            >
              {submitting ? 'Saving Record...' : 'Save Progress Record'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Progress Chart
              </h2>
              <p className="text-xs text-slate-500">
                Hover over any data point to inspect session metrics
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setChartMode('weight')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartMode === 'weight'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weight Trend (kg)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('activity')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartMode === 'activity'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activity Duration (min)
              </button>
            </div>
          </div>

          <div className="mt-5">
            <ProgressChart records={records} mode={chartMode} height={270} />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Previous Progress Records
            </h2>
            <p className="text-xs text-slate-500">
              Chronological archive of weigh-ins and completed sessions
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...ACTIVITIES] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No records match the selected activity filter.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">Date</th>
                  <th className="py-2.5 pr-3 font-medium">Type</th>
                  <th className="py-2.5 pr-3 font-medium">Session &amp; Notes</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Weight</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Duration</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Burned</th>
                  <th className="py-2.5 text-right font-medium">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {rec.recorded_date}
                    </td>
                    <td className="py-3 pr-3 font-medium text-slate-700 whitespace-nowrap">
                      {rec.activity_type}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-slate-900">
                        {rec.workout_title || rec.activity_type}
                      </div>
                      {rec.notes && <div className="mt-0.5 text-slate-500">{rec.notes}</div>}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {rec.weight_kg !== null ? `${rec.weight_kg.toFixed(1)} kg` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {rec.duration_min > 0 ? `${rec.duration_min} min` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {rec.calories_burned > 0 ? `${rec.calories_burned} kcal` : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        aria-label="Delete progress record"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
