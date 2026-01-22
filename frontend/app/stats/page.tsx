'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import LevelProgress from '@/components/LevelProgress';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import StatsCharts from '@/components/StatsCharts';
import WeaponShowcase from '@/components/WeaponShowcase';
import Footer from '@/components/Footer';
import { api, Profile, Gamification, Stats } from '@/lib/api';

export default function StatsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, gamData, statsData] = await Promise.all([
          api.getProfile(),
          api.getGamification(),
          api.getStats(),
        ]);
        setProfile(profileData);
        setGamification(gamData);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [showLevelUp, setShowLevelUp] = useState(false);

  // Simulation for level up (Demo purpose)
  const handleSimulateLevelUp = () => {
     setShowLevelUp(true);
  };

  return (
    <div className="flex min-h-screen bg-[var(--valo-darker)]">
      {/* Level Up Overlay */}
      {showLevelUp && gamification && (
        <LevelUpOverlay
           level={gamification.level + 1} // Demo next level
           title="PROMOTION"
           rankIcon={gamification.rank_icon}
           onDismiss={() => setShowLevelUp(false)}
        />
      )}

      <Sidebar
        agentName={profile?.agent_name || 'AGENT'}
        userName={profile?.full_name || profile?.first_name}
        valorantAgent={profile?.valorant_agent || 'jett'}
        levelTitle={gamification?.level_title || 'RECRUIT'}
        level={gamification?.level || 1}
        rankIcon={gamification?.rank_icon}
        onDeploy={() => {}}
        isDeploying={false}
      />

      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 overflow-auto">
          <header className="mb-8 flex justify-between items-end">
            <div>
                <div className="flex items-center gap-2 text-[var(--valo-text-dim)] text-sm mb-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--valo-green)] pulse-green"></span>
                  PERFORMANCE METRICS
                </div>
                <h1 className="font-display text-4xl font-bold tracking-wider text-[var(--valo-text)]">
                  CAREER STATS
                </h1>
            </div>
            {/* Secret Dev Button */}
            <button 
               onClick={handleSimulateLevelUp}
               className="text-[10px] text-[var(--valo-gray-light)] hover:text-[var(--valo-text-dim)] uppercase tracking-widest border border-transparent hover:border-[var(--valo-gray-light)] px-2 py-1"
            >
               [SIMULATE PROMOTION]
            </button>
          </header>

          {loading ? (
            <div className="text-center py-12 text-[var(--valo-text-dim)]">
              Loading statistics...
            </div>
          ) : (
            <>
              {/* Level Progression Map */}
              {gamification && (
                <LevelProgress
                  currentLevel={gamification.level}
                  levelTitle={gamification.level_title}
                  totalXp={gamification.total_xp}
                  currentXpInLevel={gamification.current_xp_in_level}
                  xpForNextLevel={gamification.xp_for_next_level}
                />
              )}

              {/* Weapon Loadout / Armory */}
              <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                 <WeaponShowcase />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="tech-border p-5 text-center card-hover cursor-pointer group">
                  <div className="font-display text-4xl font-bold text-[var(--valo-text)] mb-1 group-hover:text-[var(--valo-cyan)] transition-colors">
                    {stats?.total || 0}
                  </div>
                  <div className="text-sm text-[var(--valo-text-dim)]">TOTAL TARGETS</div>
                </div>
                <div className="tech-border p-5 text-center card-hover cursor-pointer group">
                  <div className="font-display text-4xl font-bold text-[var(--valo-green)] mb-1">
                    {stats?.applied || 0}
                  </div>
                  <div className="text-sm text-[var(--valo-text-dim)]">DEPLOYED</div>
                </div>
                <div className="tech-border p-5 text-center card-hover cursor-pointer group">
                  <div className="font-display text-4xl font-bold text-[var(--valo-yellow)] mb-1">
                    {stats?.pending || 0}
                  </div>
                  <div className="text-sm text-[var(--valo-text-dim)]">PENDING</div>
                </div>
                <div className="tech-border p-5 text-center card-hover cursor-pointer group">
                  <div className="font-display text-4xl font-bold text-[var(--valo-red)] mb-1">
                    {stats?.failed || 0}
                  </div>
                  <div className="text-sm text-[var(--valo-text-dim)]">FAILED</div>
                </div>
              </div>

              {/* Charts */}
              {stats && (
                <StatsCharts
                  bySource={stats.by_source}
                  applied={stats.applied}
                  pending={stats.pending}
                  failed={stats.failed}
                  total={stats.total}
                  weeklyActivity={stats.weekly_activity}
                />
              )}

              {/* Streak & Daily Stats */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="tech-border p-6 text-center card-hover cursor-pointer">
                  <div className="font-display text-5xl font-bold text-[var(--valo-cyan)] mb-2">
                    {gamification?.streak || 0}
                  </div>
                  <div className="text-[var(--valo-text-dim)]">DAY STREAK 🔥</div>
                  <p className="text-xs text-[var(--valo-text-dim)] mt-2">
                    Apply daily to maintain your streak and earn bonus XP!
                  </p>
                </div>
                <div className="tech-border p-6 text-center card-hover cursor-pointer">
                  <div className="font-display text-5xl font-bold text-[var(--valo-green)] mb-2">
                    {gamification?.applications_today || 0}
                  </div>
                  <div className="text-[var(--valo-text-dim)]">DEPLOYED TODAY</div>
                  <p className="text-xs text-[var(--valo-text-dim)] mt-2">
                    Complete 5 applications today to finish your daily quest!
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
