import { TaskStatus, TaskPriority } from '../../types';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, PRIORITY_DOT } from '../../utils';

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`badge ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`badge ${PRIORITY_COLORS[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function TaskStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  disabled?: boolean;
}) {
  const options: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as TaskStatus)}
      disabled={disabled}
      className="input text-sm py-1.5"
    >
      {options.map(s => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}
