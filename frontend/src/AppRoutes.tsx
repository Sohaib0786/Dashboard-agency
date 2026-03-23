import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TasksPage from './pages/TasksPage';
import ActivityPage from './pages/ActivityPage';
import UsersPage from './pages/UsersPage';

export default function AppRoutes() {
  const { user } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="projects"
          element={
            <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="projects/:id"
          element={
            <ProtectedRoute roles={['ADMIN', 'PROJECT_MANAGER']}>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="tasks" element={<TasksPage />} />
        <Route path="activity" element={<ActivityPage />} />

        <Route
          path="users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
