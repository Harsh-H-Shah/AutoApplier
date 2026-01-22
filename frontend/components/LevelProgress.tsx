'use client';

interface LevelProgressProps {
  currentLevel: number;
  levelTitle: string;
  totalXp: number;
  currentXpInLevel: number;
  xpForNextLevel: number;
}

const LEVELS = [
  { level: 1, title: 'RECRUIT', xp: 0, icon: '🎯' },
  { level: 2, title: 'OPERATIVE', xp: 100, icon: '⚔️' },
  { level: 3, title: 'AGENT', xp: 250, icon: '🛡️' },
  { level: 4, title: 'SPECIALIST', xp: 500, icon: '🔥' },
  { level: 5, title: 'ELITE', xp: 1000, icon: '💎' },
  { level: 6, title: 'VETERAN', xp: 2000, icon: '⭐' },
  { level: 7, title: 'TACTICIAN', xp: 4000, icon: '🏆' },
  { level: 8, title: 'COMMANDER', xp: 8000, icon: '👑' },
  { level: 9, title: 'RADIANT', xp: 15000, icon: '✨' },
  { level: 10, title: 'PROTOCOL HUNTER', xp: 30000, icon: '🔱' },
];

export default function LevelProgress({ 
  currentLevel, 
  levelTitle, 
  totalXp, 
  currentXpInLevel, 
  xpForNextLevel 
}: LevelProgressProps) {
  const progressPercent = (currentXpInLevel / xpForNextLevel) * 100;
  
  return (
    <div className="tech-border bg-[var(--valo-gray)] rounded-lg p-6 mb-6">
      <h3 className="font-display text-xl font-bold tracking-wider text-[var(--valo-text)] mb-4">
        RANK PROGRESSION
      </h3>
      
      {/* Current Level Display */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-[var(--valo-darker)] flex items-center justify-center text-3xl border-2 border-[var(--valo-green)] glow-green">
            {LEVELS[currentLevel - 1]?.icon || '🎯'}
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-[var(--valo-green)]">
              LEVEL {currentLevel}
            </div>
            <div className="text-[var(--valo-text)]">{levelTitle}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-bold text-[var(--valo-cyan)]">
            {totalXp.toLocaleString()} XP
          </div>
          <div className="text-sm text-[var(--valo-text-dim)]">
            {currentXpInLevel} / {xpForNextLevel} to next rank
          </div>
        </div>
      </div>
      
      {/* XP Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-[var(--valo-text-dim)] mb-1">
          <span>LEVEL {currentLevel}</span>
          <span>LEVEL {currentLevel + 1}</span>
        </div>
        <div className="h-4 bg-[var(--valo-darker)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--valo-green)] to-[var(--valo-cyan)] rounded-full transition-all duration-1000 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Level Map */}
      <div className="relative">
        <div className="flex justify-between relative z-10">
          {LEVELS.map((level, index) => {
            const isCompleted = currentLevel > level.level;
            const isCurrent = currentLevel === level.level;
            
            return (
              <div key={level.level} className="flex flex-col items-center group">
                {/* Level Node */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-[var(--valo-green)] text-[var(--valo-dark)]'
                      : isCurrent
                      ? 'bg-[var(--valo-cyan)] text-[var(--valo-dark)] glow-cyan animate-pulse'
                      : 'bg-[var(--valo-darker)] text-[var(--valo-text-dim)] border border-[var(--valo-gray-light)]'
                  }`}
                  title={`${level.title} - ${level.xp.toLocaleString()} XP`}
                >
                  {isCompleted ? '✓' : level.level}
                </div>
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-[var(--valo-darker)] border border-[var(--valo-gray-light)] rounded px-2 py-1 text-xs whitespace-nowrap">
                    <div className="font-semibold text-[var(--valo-text)]">{level.title}</div>
                    <div className="text-[var(--valo-text-dim)]">{level.xp.toLocaleString()} XP</div>
                  </div>
                </div>
                
                {/* Level label */}
                <div className={`mt-1 text-xs ${
                  isCurrent ? 'text-[var(--valo-cyan)]' : 'text-[var(--valo-text-dim)]'
                }`}>
                  {level.icon}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Connection line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-[var(--valo-gray-light)] -z-0">
          <div 
            className="h-full bg-[var(--valo-green)]"
            style={{ width: `${((currentLevel - 1) / (LEVELS.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
