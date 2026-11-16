import { useState, type FormEvent } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { ArrowRight } from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { createUserProfile } from '../lib/firestoreService';
import { calculateBmi, type FitnessGoal, type UserProfile } from '../types';

interface AuthViewProps {
  firebaseUser: User | null;
  onProfileReady: (profile: UserProfile) => void;
}

const GOALS: FitnessGoal[] = [
  'Lose Weight',
  'Build Muscle',
  'Maintain Fitness',
  'Improve Endurance',
];

export function AuthView({ firebaseUser, onProfileReady }: AuthViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Onboarding profile state for newly signed-in users
  const [name, setName] = useState(firebaseUser?.displayName || '');
  const [age, setAge] = useState('27');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('74');
  const [targetWeightKg, setTargetWeightKg] = useState('70');
  const [goal, setGoal] = useState<FitnessGoal>('Lose Weight');

  const previewBmi = calculateBmi(Number(heightCm) || 175, Number(weightKg) || 74);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to sign in with Google right now.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProfile(e: FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setError(null);
    setLoading(true);
    try {
      const profile = await createUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email || 'user@formline.app',
        photoUrl: firebaseUser.photoURL,
        name: name.trim() || firebaseUser.displayName || 'Athlete',
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        target_weight_kg: Number(targetWeightKg),
        goal,
      });
      onProfileReady(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your fitness profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-12">
      <div className="relative hidden overflow-hidden bg-slate-900 lg:col-span-5 lg:block">
        {!heroImgFailed ? (
          <img
            src="/src/assets/images/auth_studio_hero_1794849940192.jpg"
            alt="Minimalist daylight strength and conditioning studio"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/15" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-xs font-medium tracking-wide text-teal-300">
            Formline Personal Training Workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-balance">
            Structured training, nutrition clarity, and measurable body metrics.
          </h1>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-5 text-xs text-slate-200">
            <div>
              <div className="font-mono text-base font-semibold text-white tabular-nums">18+</div>
              <div className="mt-0.5 text-slate-300">Guided workouts</div>
            </div>
            <div>
              <div className="font-mono text-base font-semibold text-white tabular-nums">20+</div>
              <div className="mt-0.5 text-slate-300">Macro food profiles</div>
            </div>
            <div>
              <div className="font-mono text-base font-semibold text-white tabular-nums">Cloud</div>
              <div className="mt-0.5 text-slate-300">Permanent sync</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-7 lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center justify-between gap-4">
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              Formline
            </span>
            {firebaseUser && (
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Switch Account
              </button>
            )}
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            {!firebaseUser ? (
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-900">
                  Sign in or create your account
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  Your workouts, body measurements, meal logs, and progress history are stored
                  permanently in the cloud across every session and device.
                </p>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-teal-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <div className="font-semibold text-slate-900">Private &amp; Persistent</div>
                    <p className="mt-0.5 text-slate-500">
                      Protected by per-user cloud security rules.
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Immediate Setup</div>
                    <p className="mt-0.5 text-slate-500">
                      New accounts set age, height, weight, and goal next.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="font-display text-2xl font-semibold text-slate-900">
                  Complete your fitness profile
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Signed in as <span className="font-medium text-slate-700">{firebaseUser.email}</span>.
                  Enter your baseline metrics to personalize your dashboard.
                </p>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreateProfile} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="onb-name" className="block text-sm font-medium text-slate-700">
                        Full name
                      </label>
                      <input
                        id="onb-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jordan Taylor"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="onb-age" className="block text-sm font-medium text-slate-700">
                        Age (years)
                      </label>
                      <input
                        id="onb-age"
                        type="number"
                        min={13}
                        max={110}
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="onb-height"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Height (cm)
                      </label>
                      <input
                        id="onb-height"
                        type="number"
                        min={100}
                        max={250}
                        step="0.5"
                        required
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="onb-weight"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Current weight (kg)
                      </label>
                      <input
                        id="onb-weight"
                        type="number"
                        min={25}
                        max={320}
                        step="0.1"
                        required
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="onb-target"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Target weight (kg)
                      </label>
                      <input
                        id="onb-target"
                        type="number"
                        min={25}
                        max={320}
                        step="0.1"
                        required
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="onb-goal" className="block text-sm font-medium text-slate-700">
                        Primary fitness goal
                      </label>
                      <select
                        id="onb-goal"
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
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                    <span className="text-slate-600">Estimated Starting BMI</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {previewBmi.value.toFixed(1)} · {previewBmi.category}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                  >
                    <span>{loading ? 'Creating Profile...' : 'Save Profile & Open Dashboard'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
