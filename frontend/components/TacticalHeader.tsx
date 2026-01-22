'use client';

interface TacticalHeaderProps {
  streak: number;
  totalXp: number;
}

export default function TacticalHeader({ streak, totalXp }: TacticalHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 text-[var(--valo-text-dim)] text-sm mb-1">
          <span className="w-2 h-2 rounded-full bg-[var(--valo-green)] pulse-green"></span>
          SYSTEM STATUS: ONLINE
        </div>
        <h1 className="font-display text-4xl font-bold tracking-wider text-[var(--valo-text)]">
          TACTICAL DASHBOARD
        </h1>
      </div>
      
      <div className="flex items-center gap-8">
        {/* Streak Counter */}
        <div className="text-right">
          <div className="font-display text-3xl font-bold text-[var(--valo-cyan)] flex items-center gap-2">
            <span className="count-up">{streak.toString().padStart(2, '0')}</span>
            <span className="text-lg">🔥</span>
          </div>
          <div className="text-xs text-[var(--valo-text-dim)] tracking-wider">OPERATION STREAK</div>
        </div>
        
        {/* XP Counter */}
        <div className="text-right">
          <div className="font-display text-3xl font-bold text-[var(--valo-green)] flex items-center gap-2">
            <span className="count-up">{totalXp.toLocaleString()}</span>
            <span className="text-lg">⚡</span>
          </div>
          <div className="text-xs text-[var(--valo-text-dim)] tracking-wider">TOTAL RADIANT XP</div>
        </div>
      </div>
    </header>
  );
}
