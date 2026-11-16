import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus, Search, Trash2, X } from 'lucide-react';
import {
  addProgressRecord,
  createCustomWorkout,
  deleteCustomWorkout,
  listWorkouts,
} from '../lib/firestoreService';
import type { DifficultyLevel, MuscleGroup, UserProfile, WorkoutItem } from '../types';

interface WorkoutsViewProps {
  user: UserProfile;
  onWorkoutLogged: () => void;
}

const MUSCLE_GROUPS: Array<'All' | MuscleGroup> = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Full Body',
];

const DIFFICULTIES: Array<'All' | DifficultyLevel> = [
  'All',
  'Beginner',
  'Intermediate',
  'Advanced',
];

function getDifficultyColor(level: DifficultyLevel): string {
  if (level === 'Beginner') return 'text-emerald-700';
  if (level === 'Intermediate') return 'text-amber-700';
  return 'text-rose-700';
}

export function WorkoutsView({ user, onWorkoutLogged }: WorkoutsViewProps) {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [muscleGroup, setMuscleGroup] = useState<'All' | MuscleGroup>('All');
  const [difficulty, setDifficulty] = useState<'All' | DifficultyLevel>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [loggingSession, setLoggingSession] = useState(false);
  const [logDuration, setLogDuration] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logFeedback, setLogFeedback] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('Chest');
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('Beginner');
  const [newDuration, setNewDuration] = useState('30');
  const [newCalories, setNewCalories] = useState('220');
  const [newEquipment, setNewEquipment] = useState('Dumbbells');
  const [newTargets, setNewTargets] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadWorkouts() {
    setLoading(true);
    setError(null);
    try {
      const items = await listWorkouts(user.uid, {
        muscle_group: muscleGroup,
        difficulty,
        q: search,
      });
      setWorkouts(items);
      if (items.length > 0) {
        setSelectedId((prev) => (items.some((w) => w.id === prev) ? prev : items[0].id));
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workouts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, [user.uid, muscleGroup, difficulty, search]);

  const selected = workouts.find((w) => w.id === selectedId) || null;

  useEffect(() => {
    if (selected) {
      setLogDuration(String(selected.duration_min));
      setLogNotes('');
      setLogFeedback(null);
    }
  }, [selected?.id]);

  async function handleLogWorkout(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoggingSession(true);
    setLogFeedback(null);
    try {
      const dur = Math.max(5, Number(logDuration) || selected.duration_min);
      const ratio = dur / Math.max(1, selected.duration_min);
      const cals = Math.round(selected.calories_est * ratio);
      const today = new Date().toISOString().slice(0, 10);

      await addProgressRecord(user.uid, {
        recorded_date: today,
        weight_kg: null,
        activity_type: selected.muscle_group === 'Full Body' ? 'Cardio' : 'Strength Training',
        workout_title: selected.title,
        duration_min: dur,
        calories_burned: cals,
        notes: logNotes.trim() || `${selected.muscle_group} · ${selected.difficulty} session`,
      });
      setLogFeedback(`Logged ${dur} min (${cals} kcal) to Progress Tracking.`);
      setLogNotes('');
      onWorkoutLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log workout.');
    } finally {
      setLoggingSession(false);
    }
  }

  async function handleCreateWorkout(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const steps = newInstructions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const created = await createCustomWorkout(user.uid, {
        title: newTitle,
        muscle_group: newMuscle,
        difficulty: newDifficulty,
        duration_min: Number(newDuration) || 30,
        calories_est: Number(newCalories) || 220,
        equipment: newEquipment,
        target_muscles: newTargets || newMuscle,
        instructions: steps,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewTargets('');
      setNewInstructions('');
      await loadWorkouts();
      setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create workout.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCustom(id: string) {
    try {
      await deleteCustomWorkout(user.uid, id);
      await loadWorkouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove workout.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    difficulty === level
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercise or equipment..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Custom Workout</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setMuscleGroup(group)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                muscleGroup === group
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Exercise Directory
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {workouts.length} exercises
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">No matching workouts</p>
              <p className="mt-1 text-xs text-slate-500">
                Clear filters or add a custom exercise to your library.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMuscleGroup('All');
                  setDifficulty('All');
                  setSearch('');
                }}
                className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="max-h-[680px] divide-y divide-slate-100 overflow-y-auto">
              {workouts.map((w) => {
                const active = selected?.id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={`flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left transition-colors ${
                      active ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{w.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span>{w.muscle_group}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-medium ${getDifficultyColor(w.difficulty)}`}>
                          {w.difficulty}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{w.duration_min} min</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap shrink-0">
                      {w.calories_est} kcal
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          {selected ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{selected.muscle_group}</span>
                    <span aria-hidden="true">·</span>
                    <span className={`font-semibold ${getDifficultyColor(selected.difficulty)}`}>
                      {selected.difficulty}
                    </span>
                    {selected.is_custom && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-teal-700">Custom Routine</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl font-semibold text-slate-900">
                    {selected.title}
                  </h2>
                </div>

                {selected.is_custom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(selected.id)}
                    aria-label="Delete custom workout"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 pb-4">
                <div className="pr-3">
                  <div className="text-xs text-slate-500">Duration</div>
                  <div className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {selected.duration_min} min
                  </div>
                </div>
                <div className="px-3">
                  <div className="text-xs text-slate-500">Est. Energy</div>
                  <div className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {selected.calories_est} kcal
                  </div>
                </div>
                <div className="pl-3">
                  <div className="text-xs text-slate-500">Equipment</div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-900">
                    {selected.equipment}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-medium text-slate-500">Target Musculature</div>
                <p className="mt-1 text-sm text-slate-800">{selected.target_muscles}</p>
              </div>

              <div className="mt-6">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Execution Instructions
                </h3>
                <ol className="mt-3 space-y-3">
                  {selected.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <form onSubmit={handleLogWorkout} className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Log Completed Session
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <label htmlFor="log-dur" className="block text-xs text-slate-500">
                      Duration (min)
                    </label>
                    <input
                      id="log-dur"
                      type="number"
                      min={5}
                      max={300}
                      value={logDuration}
                      onChange={(e) => setLogDuration(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="log-notes" className="block text-xs text-slate-500">
                      Session Notes (optional)
                    </label>
                    <input
                      id="log-notes"
                      type="text"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Weight used, RPE, or form notes..."
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-3">
                    <button
                      type="submit"
                      disabled={loggingSession}
                      className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60 whitespace-nowrap"
                    >
                      {loggingSession ? 'Logging...' : 'Log Workout'}
                    </button>
                  </div>
                </div>
                {logFeedback && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{logFeedback}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Select an exercise from the list to inspect full instructions and log a session.
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Add Custom Workout
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkout} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Exercise Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Incline Dumbbell Curl"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Muscle Group</label>
                  <select
                    value={newMuscle}
                    onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                  >
                    {MUSCLE_GROUPS.filter((g) => g !== 'All').map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as DifficultyLevel)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                  >
                    {DIFFICULTIES.filter((d) => d !== 'All').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Est. kcal</label>
                  <input
                    type="number"
                    min={10}
                    max={3000}
                    value={newCalories}
                    onChange={(e) => setNewCalories(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Equipment</label>
                  <input
                    type="text"
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Target Muscles</label>
                <input
                  type="text"
                  value={newTargets}
                  onChange={(e) => setNewTargets(e.target.value)}
                  placeholder="e.g. Biceps long head, brachialis"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Step-by-Step Instructions (one step per line)
                </label>
                <textarea
                  rows={4}
                  required
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Set bench to 45 degrees...&#10;Curl smoothly without swinging shoulders..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {creating ? 'Saving...' : 'Save Workout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
