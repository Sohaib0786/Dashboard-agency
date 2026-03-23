import { useState } from 'react';
import { Calendar, User, ChevronRight, AlertCircle } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { StatusBadge, PriorityBadge, TaskStatusSelect } from '../common/Badges';
import { formatDate, formatRelativeTime } from '../../utils';
import { tasksApi } from '../../api';
import { useAuthStore } from '../../stores/auth.store';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (id: string, status: TaskStatus) => void;
  onClick?: () => void;
  compact?: boolean;
}

export default function TaskCard({ task, onStatusChange, onClick, compact }: TaskCardProps) {
  const { user } = useAuthStore();
  const [updating, setUpdating] = useState(false);

  const canChangeStatus = user?.role !== 'DEVELOPER' || task.assigneeId === user.id;

  async function handleStatusChange(newStatus: TaskStatus) {
    setUpdating(true);
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      onStatusChange?.(task.id, newStatus);
    } catch {
      // show error
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className={`card p-4 hover:shadow-md transition-all duration-150 group
        ${task.isOverdue ? 'border-red-200 bg-red-50/20' : ''}
        ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {task.isOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            <h3 className="text-sm font-medium text-slate-900 truncate">{task.title}</h3>
          </div>

          {!compact && task.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />

            {task.project && (
              <span className="badge bg-slate-100 text-slate-600">{task.project.name}</span>
            )}
          </div>
        </div>

        {onClick && (
          <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {task.assignee && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignee.name}
            </span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${task.isOverdue ? 'text-red-500 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              {task.isOverdue ? `Overdue · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {canChangeStatus && !compact && (
          <div onClick={e => e.stopPropagation()}>
            <TaskStatusSelect
              value={task.status === 'OVERDUE' ? 'TODO' : task.status}
              onChange={handleStatusChange}
              disabled={updating}
            />
          </div>
        )}
      </div>
    </div>
  );
}
