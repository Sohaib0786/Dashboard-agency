import React, { createContext, useContext, useEffect, useRef } from "react";
import { useAuthStore } from "../stores/auth.store";
import { useSocketStore } from "../stores/socket.store";
import { useNotificationStore } from "../stores/notification.store";
import { authApi, notificationsApi } from "../api";
import { Notification } from "../types";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    accessToken,
    setUser,
    setAccessToken,
    setLoading,
    isLoading,
  } = useAuthStore();

  const { connect, disconnect, setNotificationHandler } = useSocketStore();
  const { setNotifications, addNotification } = useNotificationStore();

  const initialized = useRef(false); // ✅ prevent double execution

  // ================= BOOTSTRAP =================
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        // ✅ First try refresh (single source of truth)
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!refreshRes.ok) throw new Error("No session");

        const refreshData = await refreshRes.json();

        if (!refreshData.success) throw new Error("Refresh failed");

        const token = refreshData.data.accessToken;
        setAccessToken(token);

        // ✅ Then call /me ONCE
        const { data } = await authApi.me();

        if (data.success) {
          setUser(data.data);
        }
      } catch (err) {
        console.log("No active session");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ================= SOCKET =================
  useEffect(() => {
    if (!accessToken || !user) return;

    connect(accessToken);

    // Notification handler
    setNotificationHandler((n: Notification) => {
      addNotification(n);
    });

    // Load notifications (only once per login)
    notificationsApi
      .list()
      .then(({ data }) => {
        if (data.success) {
          setNotifications(data.data.notifications, data.data.unreadCount);
        }
      })
      .catch(() => {});

    return () => {
      disconnect();
    };
  }, [accessToken, user?.id]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);