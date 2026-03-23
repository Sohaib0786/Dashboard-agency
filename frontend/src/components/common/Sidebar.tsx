import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Activity,
  Users, Settings, LogOut, Wifi, WifiOff
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useSocketStore } from '../../stores/socket.store';
import { authApi } from '../../api';
import { getInitials } from '../../utils';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocketStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    logout();
    navigate('/login');
  }

  const isAdmin = user?.role === 'ADMIN';
  const isPM = user?.role === 'PROJECT_MANAGER';
  const isDev = user?.role === 'DEVELOPER';

  const navLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/projects', icon: FolderKanban, label: 'Projects', show: isAdmin || isPM },
    { to: '/tasks', icon: CheckSquare, label: 'My Tasks', show: isDev },
    { to: '/tasks', icon: CheckSquare, label: 'All Tasks', show: isAdmin || isPM },
    { to: '/activity', icon: Activity, label: 'Activity Feed' },
    { to: '/users', icon: Users, label: 'Team', show: isAdmin },
  ].filter(l => l.show !== false);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200"
      style={{ width: 'var(--sidebar-width)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm shadow-brand-200">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Agency</p>
          <p className="text-xs text-slate-400">Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navLinks.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={label}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-4 space-y-1 shrink-0">
        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
          ${isConnected ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-50'}`}>
          {isConnected
            ? <><Wifi className="w-3.5 h-3.5" /> Live</>
            : <><WifiOff className="w-3.5 h-3.5" /> Offline</>}
        </div>

        {/* Role badge */}
        <div className="px-3 py-2">
          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md capitalize">
            {user?.role?.replace('_', ' ').toLowerCase()}
          </span>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 group">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-700">{getInitials(user?.name || '')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 text-slate-500 transition-all"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
