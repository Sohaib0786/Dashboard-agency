import { useEffect, useState, FormEvent } from 'react';
import { Users, Plus, Shield, Briefcase, Code2 } from 'lucide-react';
import { usersApi } from '../api';
import { User, Role } from '../types';
import Header from '../components/common/Header';
import { getInitials, formatDate } from '../utils';

const ROLE_ICONS: Record<Role, typeof Shield> = {
  ADMIN: Shield,
  PROJECT_MANAGER: Briefcase,
  DEVELOPER: Code2,
};

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'text-purple-600 bg-purple-50',
  PROJECT_MANAGER: 'text-brand-600 bg-brand-50',
  DEVELOPER: 'text-green-600 bg-green-50',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'DEVELOPER' as Role });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await usersApi.list();
      setUsers(r.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await usersApi.create(form);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'DEVELOPER' });
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  const grouped = {
    ADMIN: users.filter(u => u.role === 'ADMIN'),
    PROJECT_MANAGER: users.filter(u => u.role === 'PROJECT_MANAGER'),
    DEVELOPER: users.filter(u => u.role === 'DEVELOPER'),
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Team" subtitle={`${users.length} members`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4 text-sm text-slate-500">
            {Object.entries(grouped).map(([role, list]) => (
              <span key={role} className="flex items-center gap-1.5">
                <span className={`badge ${ROLE_COLORS[role as Role]}`}>{list.length}</span>
                <span className="capitalize">{role.toLowerCase().replace('_', ' ')}s</span>
              </span>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'] as Role[]).map(role => {
              const list = grouped[role];
              if (!list.length) return null;
              const Icon = ROLE_ICONS[role];
              return (
                <div key={role}>
                  <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    <Icon className="w-3.5 h-3.5" />
                    {role.replace('_', ' ')}S
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map(u => (
                      <div key={u.id} className="card p-4 flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-brand-700">{getInitials(u.name)}</span>
                          </div>
                          {u.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                        <span className={`badge ${ROLE_COLORS[u.role]} shrink-0`}>
                          {u.role === 'PROJECT_MANAGER' ? 'PM' : u.role === 'DEVELOPER' ? 'Dev' : 'Admin'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in p-6">
            <h2 className="font-semibold text-slate-900 mb-5">Add Team Member</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Jane Smith" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" placeholder="jane@agency.dev" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input" placeholder="Min 8 characters" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                  <option value="DEVELOPER">Developer</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={creating}>
                  {creating ? 'Creating...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
