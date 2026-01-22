'use client';

import { CombatHistoryItem } from '@/lib/api';

interface CombatHistoryProps {
  history: CombatHistoryItem[];
}

function getStatusClass(color: string): string {
  switch (color) {
    case 'green': return 'status-green';
    case 'yellow': return 'status-yellow';
    case 'red': return 'status-red';
    case 'orange': return 'status-orange';
    default: return 'status-gray';
  }
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}

export default function CombatHistory({ history }: CombatHistoryProps) {
  return (
    <div className="tech-border bg-[var(--valo-gray)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--valo-gray-light)]">
        <h3 className="font-display text-lg font-bold tracking-wider text-[var(--valo-text)]">
          COMBAT HISTORY
        </h3>
        <span className="text-xs text-[var(--valo-cyan)] tracking-wider">
          INTELLIGENCE ARCHIVE
        </span>
      </div>
      
      {/* List */}
      <div className="divide-y divide-[var(--valo-gray-light)]">
        {history.length === 0 ? (
          <div className="px-5 py-8 text-center text-[var(--valo-text-dim)]">
            No combat records yet. Deploy to begin operations.
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-[var(--valo-darker)] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-[var(--valo-darker)] flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                
                {/* Info */}
                <div>
                  <div className="font-semibold text-[var(--valo-text)]">
                    {item.title}
                  </div>
                  <div className="text-sm text-[var(--valo-text-dim)]">
                    SECTOR: {item.company} • {formatTimeAgo(item.discovered_at)}
                  </div>
                </div>
              </div>
              
              {/* Status & XP */}
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded text-xs font-semibold tracking-wider ${getStatusClass(item.status_color)}`}>
                  {item.status_label}
                </span>
                {item.xp_reward > 0 && (
                  <span className="text-[var(--valo-green)] font-semibold">
                    +{item.xp_reward} XP
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
