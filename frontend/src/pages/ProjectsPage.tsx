import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, ExternalLink } from 'lucide-react';
import { projectsApi, clientsApi } from '../api';
import { Project, Client } from '../types';
import { useAuthStore } from '../stores/auth.store';
import Header from '../components/common/Header';
import { formatDate } from '../utils';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({ name: '', description: '', clientId: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    clientsApi.list().then(r => setClients(r.data.data || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await projectsApi.list();
      setProjects(r.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!form.name || !form.clientId) return;
    setCreating(true);
    try {
      await projectsApi.create(form);
      setShowCreate(false);
      setForm({ name: '', description: '', clientId: '' });
      load();
    } catch { /* show error */ }
    finally { setCreating(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Projects" subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div />
          {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">New Project</h2>

              <div>
                <label className="label">Project Name *</label>
                <input className="input" placeholder="e.g. Brand Redesign" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="Optional..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <label className="label">Client *</label>
                <select className="input" value={form.clientId}
                  onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={createProject} disabled={creating} className="btn-primary flex-1 justify-center">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No projects yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="card p-5 cursor-pointer hover:shadow-md hover:border-brand-200 transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                    <FolderKanban className="w-4.5 h-4.5 w-[18px] h-[18px] text-brand-600" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <h3 className="font-semibold text-slate-900 mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto pt-3 border-t border-slate-100">
                  <span className="font-medium text-slate-600">{project.client?.name}</span>
                  <span>·</span>
                  <span>{project._count?.tasks || 0} tasks</span>
                  <span>·</span>
                  <span>{formatDate(project.createdAt)}</span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="text-slate-400">PM:</span>
                  <span className="font-medium">{project.manager?.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
