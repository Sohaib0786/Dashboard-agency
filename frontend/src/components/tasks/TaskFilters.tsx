import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { TaskStatus, TaskPriority } from '../../types';
import { STATUS_LABELS, PRIORITY_LABELS } from '../../utils';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TaskFilters() {
  const [params, setParams] = useSearchParams();

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete('page');
    setParams(p);
  }

  function clearAll() {
    setParams(new URLSearchParams());
  }

  const hasFilters = params.has('status') || params.has('priority') || params.has('dueDateFrom') || params.has('dueDateTo');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      <select
        className="input py-1.5 text-xs w-auto"
        value={params.get('status') || ''}
        onChange={e => set('status', e.target.value)}
      >
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>

      <select
        className="input py-1.5 text-xs w-auto"
        value={params.get('priority') || ''}
        onChange={e => set('priority', e.target.value)}
      >
        <option value="">All priorities</option>
        {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
      </select>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500">From</label>
        <input
          type="date"
          className="input py-1.5 text-xs w-auto"
          value={params.get('dueDateFrom') || ''}
          onChange={e => set('dueDateFrom', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-500">To</label>
        <input
          type="date"
          className="input py-1.5 text-xs w-auto"
          value={params.get('dueDateTo') || ''}
          onChange={e => set('dueDateTo', e.target.value)}
        />
      </div>

      {hasFilters && (
        <button onClick={clearAll} className="btn-ghost text-xs py-1.5 text-red-500 hover:bg-red-50">
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
