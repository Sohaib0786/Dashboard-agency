import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '../../stores/notification.store';
import { notificationsApi } from '../../api';
import { formatRelativeTime } from '../../utils';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id).catch(() => {});
    markRead(id);
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead().catch(() => {});
    markAllRead();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                           bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse-soft">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl border border-slate-200 shadow-xl
                        shadow-slate-200/60 z-50 overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="badge bg-brand-50 text-brand-700">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors
                    ${!n.isRead ? 'bg-brand-50/30' : ''}`}
                >
                  {/* Type indicator */}
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? 'bg-brand-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
