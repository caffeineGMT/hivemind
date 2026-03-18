import { useQuery } from '@tanstack/react-query';
import { api, ActivityEntry } from '../api';
import ActivityRow from '../components/ActivityRow';

export default function Activity({ companyId }: { companyId: string }) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', companyId],
    queryFn: () => api.getActivity(companyId),
    refetchInterval: 3000,
  });

  if (isLoading || !activity) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Activity Log</h2>
        <p className="mt-1 text-sm text-zinc-500">{activity.length} events</p>
      </div>

      {activity.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
          No activity recorded yet
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
          <div className="divide-y divide-zinc-800/30">
            {activity.map((entry: ActivityEntry) => (
              <ActivityRow key={entry.id} entry={entry} showDate />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
