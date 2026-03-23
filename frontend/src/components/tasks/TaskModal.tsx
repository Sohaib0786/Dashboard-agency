import { useState, useEffect, FormEvent } from 'react';
import { X } from 'lucide-react';
import { Task, TaskPriority, User, Project } from '../../types';
import { tasksApi, usersApi, projectsApi } from '../../api';
import { PRIORITY_LABELS } from '../../utils';

interface TaskModalProps {
  task?: Task | null;
  projectId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({ task, projectId, onClose, onSaved }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [selProjectId, setProjectId] = useState(task?.projectId || projectId || '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.split('T')[0] : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [developers, setDevelopers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    usersApi.developers().then(r => setDevelopers(r.data.data || [])).catch(() => {});
    if (!projectId) {
      projectsApi.list().then(r => setProjects(r.data.data || [])).catch(() => {});
    }
  }, [projectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!selProjectId) { setError('Project is required'); return; }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: selProjectId,
        assigneeId: assigneeId || undefined,
        priority,
        dueDate: dueDate || undefined,
      };

      if (task) {
        await tasksApi.update(task.id, payload);
      } else {
        await tasksApi.create(payload);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{task ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              placeholder="Task title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Optional description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {!projectId && (
            <div>
              <label className="label">Project *</label>
              <select className="input" value={selProjectId} onChange={e => setProjectId(e.target.value)} required>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Assign To</label>
            <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
