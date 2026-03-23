import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'brand' | 'green' | 'amber' | 'red' | 'slate';
  trend?: string;
  pulse?: boolean;
}

const colorMap = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatCard({ label, value, icon: Icon, color = 'brand', trend, pulse }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </div>
        {pulse && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
      {trend && (
        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </p>
      )}
    </div>
  );
}
