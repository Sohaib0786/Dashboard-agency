import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { projectsApi } from '../api';
import { Project, Task, TaskStatus } from '../types';
import { useAuthStore } from '../stores/auth.store';
import { useSocketStore } from '../stores/socket.store';
import Header from '../components/common/Header';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import ActivityFeed from '../components/activity/ActivityFeed';
import { STATUS_LABELS } from '../utils';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { joinProject, leaveProject, activities } = useSocketStore();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    load();
    joinProject(id);
    return () => leaveProject(id);
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const r = await projectsApi.get(id!);
      setProject(r.data.data);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setProject(p => p ? {
      ...p,
      tasks: p.tasks?.map(t => t.id === taskId ? { ...t, status } : t) || [],
    } : null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-slate-400">Loading project...</div>
    </div>
  );
  if (!project) return null;

  const tasksByStatus = {
    TODO: project.tasks?.filter(t => t.status === 'TODO') || [],
    IN_PROGRESS: project.tasks?.filter(t => t.status === 'IN_PROGRESS') || [],
    IN_REVIEW: project.tasks?.filter(t => t.status === 'IN_REVIEW') || [],
    DONE: project.tasks?.filter(t => t.status === 'DONE') || [],
    OVERDUE: project.tasks?.filter(t => t.isOverdue && t.status !== 'DONE') || [],
  };

  // Project activity from socket + initial from DB
  const projectActivity = activities.filter(a => a.projectId === id);

  return (
    <div className="flex flex-col h-full">
      <Header
        title={project.name}
        subtitle={`${project.client?.name} · PM: ${project.manager?.name}`}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/projects')} className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
            <button onClick={() => setShowTaskModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Task columns */}
          <div className="xl:col-span-2 space-y-6">
            {/* Overdue alert */}
            {tasksByStatus.OVERDUE.length > 0 && (
              <div className="card border-red-200 bg-red-50/50 p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-3">
                  ⚠️ Overdue ({tasksByStatus.OVERDUE.length})
                </h3>
                <div className="space-y-2">
                  {tasksByStatus.OVERDUE.map(t => (
                    <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} compact />
                  ))}
                </div>
              </div>
            )}

            {/* Status columns */}
            {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as TaskStatus[]).map(status => {
              const tasks = tasksByStatus[status];
              if (tasks.length === 0 && status === 'DONE') return null;
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">{STATUS_LABELS[status]}</h3>
                    <span className="badge bg-slate-100 text-slate-500">{tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.length === 0 ? (
                      <div className="card p-4 text-center text-sm text-slate-400 border-dashed">
                        No tasks in {STATUS_LABELS[status].toLowerCase()}
                      </div>
                    ) : (
                      tasks.map(t => (
                        <TaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Activity Feed */}
          <div className="space-y-4">
            <ActivityFeed
              activities={projectActivity}
              title="Live Activity"
            />
          </div>
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          projectId={id}
          onClose={() => setShowTaskModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
