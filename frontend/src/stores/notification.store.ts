import { create } from 'zustand';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[], count: number) => void;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>(set => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),

  addNotification: (n) => set(s => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),

  markRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
    unreadCount: Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === id && !n.isRead) ? 1 : 0)),
  })),

  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),
}));
