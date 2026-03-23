import { useAuthStore } from '../../stores/auth.store';
import { useSocketStore } from '../../stores/socket.store';
import NotificationBell from '../notifications/NotificationBell';
import { Users } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();
  const { onlineCount } = useSocketStore();

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'ADMIN' && onlineCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <Users className="w-3.5 h-3.5" />
            <span>{onlineCount} online</span>
          </div>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
