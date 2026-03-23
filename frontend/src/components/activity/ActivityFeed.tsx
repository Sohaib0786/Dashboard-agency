import { Activity, Clock } from 'lucide-react';
import { ActivityLog } from '../../types';
import { formatRelativeTime } from '../../utils';

interface ActivityFeedProps {
  activities: ActivityLog[];
  loading?: boolean;
  title?: string;
  maxItems?: number;
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'STATUS_CHANGED': return '🔄';
    case 'TASK_CREATED': return '✨';
    case 'TASK_ASSIGNED': return '👤';
    case 'TASK_OVERDUE': return '⚠️';
    default: return '📝';
  }
}

function ActivityItem({ log }: { log: ActivityLog }) {
  const message = log.formattedMessage || formatFallback(log);

  return (
    <div className="flex items-start gap-3 py-3 group">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm shrink-0 mt-0.5">
        {getActionIcon(log.action)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-snug">{message}</p>
        <div className="flex items-center gap-2 mt-1">
          {log.project && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {log.project.name}
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(log.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatFallback(log: ActivityLog): string {
  const user = log.user?.name || 'Someone';
  const task = log.task?.title ? `"${log.task.title}"` : 'a task';
  switch (log.action) {
    case 'STATUS_CHANGED':
      return `${user} moved ${task} from ${log.fromValue} → ${log.toValue}`;
    case 'TASK_CREATED':
      return `${user} created ${task}`;
    default:
      return `${user} updated ${task}`;
  }
}

export default function ActivityFeed({ activities, loading, title = 'Activity Feed', maxItems }: ActivityFeedProps) {
  const items = maxItems ? activities.slice(0, maxItems) : activities;

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Activity className="w-4 h-4 text-brand-500" />
        <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
        {activities.length > 0 && (
          <span className="ml-auto badge bg-brand-50 text-brand-600">{activities.length}</span>
        )}
      </div>

      <div className="px-5 divide-y divide-slate-50">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No activity yet</p>
          </div>
        ) : (
          items.map(log => <ActivityItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
