import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckSquare } from 'lucide-react';
import { tasksApi } from '../api';
import { Task, TaskStatus } from '../types';
import { useAuthStore } from '../stores/auth.store';
import Header from '../components/common/Header';
import TaskCard from '../components/tasks/TaskCard';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskModal from '../components/tasks/TaskModal';

export default function TasksPage() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams: Record<string, string> = {};
      params.forEach((v, k) => { queryParams[k] = v; });
      const r = await tasksApi.list(queryParams);
      setTasks(r.data.data || []);
      setTotal(r.data.pagination?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [params.toString()]);

  useEffect(() => { load(); }, [load]);

  function handleStatusChange(id: string, status: TaskStatus) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));
  }

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';
  const title = user?.role === 'DEVELOPER' ? 'My Tasks' : 'All Tasks';

  return (
    <div className="flex flex-col h-full">
      <Header title={title} subtitle={`${total} task${total !== 1 ? 's' : ''}`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TaskFilters />
          {canCreate && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <CheckSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No tasks found</p>
            <p className="text-sm text-slate-400 mt-1">
              {params.size > 0 ? 'Try adjusting your filters' : 'Tasks will appear here once created'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  );
}
