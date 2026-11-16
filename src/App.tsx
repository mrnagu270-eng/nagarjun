import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Menu, Plus } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { BmiCalculatorView } from './components/BmiCalculatorView';
import { DashboardView } from './components/DashboardView';
import { DietNutritionView } from './components/DietNutritionView';
import { ProfileView } from './components/ProfileView';
import { ProgressTrackingView } from './components/ProgressTrackingView';
import { Sidebar, type NavSection } from './components/Sidebar';
import { WorkoutsView } from './components/WorkoutsView';
import { auth } from './lib/firebase';
import { fetchUserProfile } from './lib/firestoreService';
import type { UserProfile } from './types';

const SECTION_META: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of weight, BMI, workout activity, and daily nutrition',
  },
  bmi: {
    title: 'BMI Calculator',
    subtitle: 'Automatic Body Mass Index calculation and healthy weight range',
  },
  workouts: {
    title: 'Workout Module',
    subtitle: 'Browse muscle groups, difficulty levels, and step-by-step instructions',
  },
  diet: {
    title: 'Diet & Nutrition',
    subtitle: 'Categorized food information, macronutrients, and daily intake tracking',
  },
  progress: {
    title: 'Progress Tracking',
    subtitle: 'Record weight and workouts, view previous records, and monitor trends',
  },
  profile: {
    title: 'User Profile',
    subtitle: 'Manage age, height, weight, target weight, and fitness goal',
  },
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      setLoadingProfile(true);
      try {
        const fetched = await fetchUserProfile(
          fbUser.uid,
          fbUser.email || 'user@formline.app',
          fbUser.photoURL
        );
        setProfile(fetched);
      } catch {
        setProfile(null);
      } finally {
        setLoadingProfile(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  async function refreshUserAndData() {
    setRefreshKey((k) => k + 1);
    if (firebaseUser) {
      const latest = await fetchUserProfile(
        firebaseUser.uid,
        firebaseUser.email || 'user@formline.app',
        firebaseUser.photoURL
      );
      if (latest) setProfile(latest);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setProfile(null);
    setActiveSection('dashboard');
  }

  if (!authReady || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">Loading Formline...</div>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return (
      <AuthView
        firebaseUser={firebaseUser}
        onProfileReady={(created) => setProfile(created)}
      />
    );
  }

  const meta = SECTION_META[activeSection];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        user={profile}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold text-slate-900">
                {meta.title}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('progress')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Check-In</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {activeSection === 'dashboard' && (
            <DashboardView
              user={profile}
              onNavigate={setActiveSection}
              refreshKey={refreshKey}
            />
          )}
          {activeSection === 'bmi' && (
            <BmiCalculatorView
              user={profile}
              onProfileUpdated={(updated) => {
                setProfile(updated);
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
          {activeSection === 'workouts' && (
            <WorkoutsView user={profile} onWorkoutLogged={refreshUserAndData} />
          )}
          {activeSection === 'diet' && (
            <DietNutritionView user={profile} onMealsChanged={refreshUserAndData} />
          )}
          {activeSection === 'progress' && (
            <ProgressTrackingView user={profile} onProgressUpdated={refreshUserAndData} />
          )}
          {activeSection === 'profile' && (
            <ProfileView
              user={profile}
              onProfileUpdated={(updated) => {
                setProfile(updated);
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
