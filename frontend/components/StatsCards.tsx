'use client';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  sublabel?: string;
}

function StatCard({ label, value, icon, color, sublabel }: StatCardProps) {
  return (
    <div 
      className="tech-border bg-[var(--valo-gray)] rounded-lg p-5 card-hover transition-all duration-300"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-[var(--valo-text-dim)] tracking-wider mb-2 uppercase">
            {label}
          </div>
          <div 
            className="font-display text-4xl font-bold count-up"
            style={{ color }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {sublabel && (
            <div className="text-xs text-[var(--valo-text-dim)] mt-1">{sublabel}</div>
          )}
        </div>
        <div 
          className="text-3xl p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  totalJobs: number;
  appliedJobs: number;
  pendingJobs: number;
  failedJobs: number;
  level?: number;
  streak?: number;
}

export default function StatsCards({ 
  totalJobs,
  appliedJobs,
  pendingJobs,
  failedJobs,
  level = 1,
  streak = 0,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total Jobs Found"
        value={totalJobs}
        icon="🎯"
        color="#00D9FF"
        sublabel="In database"
      />
      <StatCard
        label="Applications Sent"
        value={appliedJobs}
        icon="✅"
        color="#00FFA3"
        sublabel="Successfully deployed"
      />
      <StatCard
        label="Pending"
        value={pendingJobs}
        icon="⏳"
        color="#FFE500"
        sublabel="Ready to apply"
      />
      <StatCard
        label="Current Streak"
        value={`${streak} days`}
        icon="🔥"
        color="#FF4655"
        sublabel={streak >= 7 ? 'ON FIRE!' : streak >= 3 ? 'Keep it up!' : 'Start applying!'}
      />
    </div>
  );
}
