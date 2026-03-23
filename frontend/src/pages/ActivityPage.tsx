import { useEffect, useState } from 'react';
import { activityApi } from '../api';
import { ActivityLog } from '../types';
import { useSocketStore } from '../stores/socket.store';
import Header from '../components/common/Header';
import ActivityFeed from '../components/activity/ActivityFeed';

export default function ActivityPage() {
  const { activities: liveActivities } = useSocketStore();
  const [dbActivities, setDbActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityApi.feed({ limit: 50 })
      .then(r => setDbActivities(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Merge live + DB activities deduped
  const all = (() => {
    const ids = new Set(liveActivities.map(a => a.id));
    const fresh = dbActivities.filter(a => !ids.has(a.id));
    return [...liveActivities, ...fresh].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  })();

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity Feed" subtitle="Live updates from all your projects" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <ActivityFeed activities={all} loading={loading} title="All Activity" />
      </div>
    </div>
  );
}
