'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { api, Profile, Gamification, Email } from '@/lib/api';

export default function EmailsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileData, gamData, emailData] = await Promise.all([
          api.getProfile(),
          api.getGamification(),
          api.getEmails({ status: filter !== 'all' ? filter : undefined, limit: 100 }),
        ]);
        setProfile(profileData);
        setGamification(gamData);
        setEmails(emailData.emails);
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filter]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'sent': return 'text-[var(--valo-green)] border border-[var(--valo-green)] bg-[var(--valo-green)]/10';
      case 'draft': return 'status-gray';
      case 'scheduled': return 'status-yellow';
      case 'failed': return 'status-red';
      default: return 'status-gray';
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--valo-darker)]">
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

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 p-8 overflow-y-auto relative">
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--valo-text-dim)] text-sm mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--valo-purple)] pulse-purple"></span>
                COMMUNICATIONS
              </div>
              <h1 className="font-display text-4xl font-bold tracking-wider text-[var(--valo-text)]">
                OUTREACH LOGS
              </h1>
            </div>
          </header>

          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {[
              { key: 'all', label: 'ALL COMMS' },
              { key: 'draft', label: 'DRAFTS' },
              { key: 'scheduled', label: 'SCHEDULED' },
              { key: 'sent', label: 'DEPLOYED' },
            ].map((status) => (
              <button
                key={status.key}
                onClick={() => setFilter(status.key)}
                className={`px-6 py-2 font-bold tracking-wide transition-all duration-200 tech-button whitespace-nowrap ${
                  filter === status.key
                    ? 'tech-button-solid bg-[var(--valo-purple)] text-white'
                    : 'text-[var(--valo-text-dim)] hover:text-[var(--valo-text)]'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 pb-20">
            {loading ? (
              <div className="text-center py-12 text-[var(--valo-text-dim)]">
                <svg className="w-8 h-8 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Decrypting logs...
              </div>
            ) : emails.length === 0 ? (
              <div className="tech-border p-8 text-center bg-[var(--valo-dark)]/50">
                <div className="text-5xl mb-4 opacity-50">📭</div>
                <div className="text-xl text-[var(--valo-text)]">
                  No communications found.
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {emails.map((email, index) => (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                    className="tech-border p-5 bg-[var(--valo-dark)]/30 hover:bg-[var(--valo-dark)]/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-[var(--valo-text)] text-lg">{email.subject}</h3>
                      <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${getStatusStyle(email.status)}`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="text-[var(--valo-text-dim)] text-sm mb-4 line-clamp-2">
                        {email.body}
                    </p>
                    <div className="flex justify-between items-center text-xs text-[var(--valo-text-dim)] font-mono">
                         <span>ID: {email.id.substring(0, 8)}</span>
                         <span>{new Date(email.created_at).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
