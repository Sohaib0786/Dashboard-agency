import { useEffect, useState } from 'react';
import { FolderKanban, CheckSquare, AlertCircle, Users, Clock, Zap } from 'lucide-react';
import { dashboardApi } from '../api';
import { useAuthStore } from '../stores/auth.store';
import { useSocketStore } from '../stores/socket.store';
import Header from '../components/common/Header';
import StatCard from '../components/dashboard/StatCard';
import ActivityFeed from '../components/activity/ActivityFeed';
import TaskCard from '../components/tasks/TaskCard';
import { AdminDashboard, PmDashboard, DevDashboard, Task, TaskStatus } from '../types';
import { STATUS_LABELS, formatDate } from '../utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { activities } = useSocketStore();
  const [data, setData] = useState<AdminDashboard | PmDashboard | DevDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleTaskStatusChange(id: string, status: TaskStatus) {
    if (!data || user?.role !== 'DEVELOPER') return;
    const devData = data as DevDashboard;
    const updated = devData.tasks.map(t => t.id === id ? { ...t, status } : t);
    setData({ ...devData, tasks: updated });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-slate-400">Loading dashboard...</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`${user?.name?.split(' ')[0]}'s Dashboard`}
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {user?.role === 'ADMIN' && data && <AdminView data={data as AdminDashboard} activities={activities} />}
        {user?.role === 'PROJECT_MANAGER' && data && <PmView data={data as PmDashboard} activities={activities} />}
        {user?.role === 'DEVELOPER' && data && (
          <DevView data={data as DevDashboard} onStatusChange={handleTaskStatusChange} activities={activities} />
        )}
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ──────────────────────────────────────────────────────────────
function AdminView({ data, activities }: { data: AdminDashboard; activities: typeof useSocketStore extends () => infer R ? R['activities'] : never }) {
  const { onlineCount } = useSocketStore();
  const totalTasks = data.tasksByStatus.reduce((s, t) => s + t.count, 0);
  const doneTasks = data.tasksByStatus.find(t => t.status === 'DONE')?.count || 0;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={data.totalProjects} icon={FolderKanban} color="brand" />
        <StatCard label="Total Tasks" value={totalTasks} icon={CheckSquare} color="slate" />
        <StatCard label="Overdue Tasks" value={data.overdueCount} icon={AlertCircle} color="red" />
        <StatCard label="Users Online" value={onlineCount} icon={Users} color="green" pulse />
      </div>

      {/* Task status breakdown */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">Tasks by Status</h2>
        <div className="space-y-2.5">
          {data.tasksByStatus.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-24 shrink-0">{STATUS_LABELS[status as TaskStatus]}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: totalTasks ? `${(count / totalTasks) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Completion rate</span>
          <span className="font-semibold text-green-600">
            {totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}%
          </span>
        </div>
      </div>

      <ActivityFeed activities={activities.length ? activities : data.recentActivity} title="Global Activity Feed" />
    </>
  );
}

// ─── PM VIEW ─────────────────────────────────────────────────────────────────
function PmView({ data, activities }: { data: PmDashboard; activities: ActivityLog[] }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Projects" value={data.projects.length} icon={FolderKanban} color="brand" />
        <StatCard
          label="Due This Week"
          value={data.upcomingDueDates.length}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Critical Tasks"
          value={data.tasksByPriority.find(t => t.priority === 'CRITICAL')?.count || 0}
          icon={Zap}
          color="red"
        />
        <StatCard
          label="Total Tasks"
          value={data.tasksByPriority.reduce((s, t) => s + t.count, 0)}
          icon={CheckSquare}
          color="slate"
        />
      </div>

      {/* Projects summary */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">My Projects</h2>
        <div className="space-y-3">
          {data.projects.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-400">{p.client?.name}</p>
              </div>
              <span className="badge bg-slate-100 text-slate-600">{p._count?.tasks || 0} tasks</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming due dates */}
      {data.upcomingDueDates.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Due This Week</h2>
          <div className="space-y-2">
            {data.upcomingDueDates.map(task => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400">{task.assignee?.name || 'Unassigned'}</p>
                </div>
                <span className="text-xs text-amber-600 font-medium shrink-0 ml-3">{formatDate(task.dueDate!)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivityFeed activities={activities} title="Team Activity" />
    </>
  );
}

// ─── DEVELOPER VIEW ───────────────────────────────────────────────────────────
function DevView({ data, onStatusChange, activities }: {
  data: DevDashboard;
  onStatusChange: (id: string, s: TaskStatus) => void;
  activities: ActivityLog[];
}) {
  const done = data.tasksByStatus.find(t => t.status === 'DONE')?.count || 0;
  const total = data.tasksByStatus.reduce((s, t) => s + t.count, 0);
  const overdue = data.tasksByStatus.find(t => t.status === 'OVERDUE')?.count || 0;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Tasks" value={data.tasks.length} icon={CheckSquare} color="brand" />
        <StatCard label="Completed" value={done} icon={CheckSquare} color="green" />
        <StatCard label="Overdue" value={overdue} icon={AlertCircle} color="red" />
        <StatCard label="Total Assigned" value={total} icon={Zap} color="slate" />
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 text-sm mb-3">My Tasks</h2>
        <div className="space-y-3">
          {data.tasks.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active tasks assigned to you</p>
            </div>
          ) : (
            data.tasks.map(task => (
              <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
            ))
          )}
        </div>
      </div>

      <ActivityFeed activities={activities} title="My Task Activity" />
    </>
  );
}

// Re-export type for the activity param
type ActivityLog = import('../../types').ActivityLog;
