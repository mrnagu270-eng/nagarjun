import { useState } from 'react';
import {
  Activity,
  Apple,
  Calculator,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  UserCheck,
  X,
} from 'lucide-react';
import type { UserProfile } from '../types';

export type NavSection =
  | 'dashboard'
  | 'bmi'
  | 'workouts'
  | 'diet'
  | 'progress'
  | 'profile';

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  user: UserProfile;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bmi', label: 'BMI Calculator', icon: Calculator },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'diet', label: 'Diet & Nutrition', icon: Apple },
  { id: 'progress', label: 'Progress Tracking', icon: Activity },
  { id: 'profile', label: 'User Profile', icon: UserCheck },
];

export function Sidebar({
  activeSection,
  onSelect,
  user,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarSrc =
    user.photoUrl || '/src/assets/images/athlete_profile_avatar_1794849940889.jpg';

  const content = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Formline
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          {!avatarFailed ? (
            <img
              src={avatarSrc}
              alt={user.name}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white shrink-0">
              {user.name
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">{user.name}</div>
            <div className="truncate text-xs text-slate-500">{user.goal}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
