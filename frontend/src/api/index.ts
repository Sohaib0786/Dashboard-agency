import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth.store";

// ─── AXIOS INSTANCE ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ─── TOKEN REFRESH STATE ──────────────────────────────────────────────────────
let isRefreshing = false;

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let failedQueue: QueueItem[] = [];

// Process queued requests
function processQueue(error: unknown, token?: string) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
}

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ─── RESPONSE INTERCEPTOR (REFRESH LOGIC) ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If not 401 → reject immediately
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Prevent infinite loop for refresh endpoint
    if (originalRequest.url?.includes("/auth/refresh")) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // If already retrying → queue requests
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Mark request as retried
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post<{
        success: boolean;
        data: { accessToken: string };
      }>("/auth/refresh");

      const newToken = data.data.accessToken;

      // Save new token
      useAuthStore.getState().setAccessToken(newToken);

      // Resolve queued requests
      processQueue(null, newToken);

      // Retry original request
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── API HELPERS ──────────────────────────────────────────────────────────────

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  logout: () => api.post("/auth/logout"),

  me: () => api.get("/auth/me"),
};

// Projects
export const projectsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/projects", { params }),

  get: (id: string) => api.get(`/projects/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post("/projects", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${id}`, data),

  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Tasks
export const tasksApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/tasks", { params }),

  get: (id: string) => api.get(`/tasks/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post("/tasks", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/tasks/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/tasks/${id}/status`, { status }),

  delete: (id: string) => api.delete(`/tasks/${id}`),

  activity: (id: string) => api.get(`/tasks/${id}/activity`),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get("/dashboard"),
};

// Activity
export const activityApi = {
  feed: (params?: Record<string, unknown>) =>
    api.get("/activity", { params }),
};

// Notifications
export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/notifications", { params }),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch("/notifications/read-all"),
};


// Users
export const usersApi = {
  list: () => api.get("/users"),

  developers: () => api.get("/users/developers"),

  create: (data: Record<string, unknown>) =>
    api.post("/users", data),
};


// Clients
export const clientsApi = {
  list: () => api.get("/clients"),

  create: (data: Record<string, unknown>) =>
    api.post("/clients", data),
};