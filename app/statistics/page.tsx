import { StatsDashboard } from '@/components/statistics/stats-dashboard';

export default function StatisticsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Statistics</h1>
      <StatsDashboard />
    </div>
  );
}
