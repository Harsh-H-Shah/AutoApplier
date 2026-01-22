'use client';

interface DailyMissionProps {
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  priority?: boolean;
}

export default function DailyMission({ name, description, progress, target, completed, priority }: DailyMissionProps) {
  const progressPercent = Math.min((progress / target) * 100, 100);
  
  return (
    <div className="tech-border bg-[var(--valo-gray)] rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h3 className="font-display text-lg font-bold tracking-wider text-[var(--valo-text)]">
              DAILY MISSION: {name}
            </h3>
            <p className="text-sm text-[var(--valo-text-dim)]">{description}</p>
          </div>
        </div>
        
        {priority && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-[var(--valo-red)] font-semibold tracking-wider mb-1">
              PRIORITY OBJECTIVE
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--valo-text-dim)]">PROGRESS</span>
              <span className="font-display text-xl font-bold text-[var(--valo-green)]">
                {progress}<span className="text-[var(--valo-text-dim)]">/{target}</span>
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-[var(--valo-darker)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            completed ? 'bg-[var(--valo-green)] glow-green' : 'bg-[var(--valo-cyan)]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {completed && (
        <div className="mt-3 text-[var(--valo-green)] font-semibold text-sm flex items-center gap-2">
          <span>✓</span> MISSION COMPLETE
        </div>
      )}
    </div>
  );
}
