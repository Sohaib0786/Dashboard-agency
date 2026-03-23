import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { ActivityLog, Notification } from '../types';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  activities: ActivityLog[];
  connect: (token: string) => void;
  disconnect: () => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  addActivity: (activity: ActivityLog) => void;
  setOnlineCount: (count: number) => void;
  onNotification: ((n: Notification) => void) | null;
  setNotificationHandler: (fn: (n: Notification) => void) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineCount: 0,
  activities: [],
  onNotification: null,

  connect: (token: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io('/', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    socket.on('activity:new', (data: ActivityLog) => {
      set(s => ({ activities: [data, ...s.activities].slice(0, 100) }));
    });

    socket.on('activity:global', (data: ActivityLog) => {
      set(s => ({ activities: [data, ...s.activities].slice(0, 100) }));
    });

    socket.on('activity:catchup', (data: ActivityLog[]) => {
      set(s => {
        const ids = new Set(s.activities.map(a => a.id));
        const fresh = data.filter(a => !ids.has(a.id));
        return { activities: [...fresh, ...s.activities].slice(0, 100) };
      });
    });

    socket.on('presence:count', ({ count }: { count: number }) => {
      set({ onlineCount: count });
    });

    socket.on('notification:new', (n: Notification) => {
      const handler = get().onNotification;
      if (handler) handler(n);
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false, activities: [] });
  },

  joinProject: (projectId: string) => {
    get().socket?.emit('join:project', projectId);
  },

  leaveProject: (projectId: string) => {
    get().socket?.emit('leave:project', projectId);
  },

  addActivity: (activity: ActivityLog) => {
    set(s => ({ activities: [activity, ...s.activities].slice(0, 100) }));
  },

  setOnlineCount: (count: number) => set({ onlineCount: count }),

  setNotificationHandler: (fn) => set({ onNotification: fn }),
}));
