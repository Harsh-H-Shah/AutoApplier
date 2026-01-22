'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import ConfirmModal from '@/components/ConfirmModal';
import JobDetails from '@/components/JobDetails';
import ValorantDropdown from '@/components/ValorantDropdown';
import { api, Profile, Gamification, Job } from '@/lib/api';

export default function MissionsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [filter, setFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Selection
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  
  // Animation State
  const [exitingJobIds, setExitingJobIds] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: any = { per_page: 50 };
        if (filter !== 'all') params.status = filter;
        if (sourceFilter !== 'all') params.source = sourceFilter;
        if (typeFilter !== 'all') params.type = typeFilter;
        if (debouncedSearch) params.search = debouncedSearch;

        const [profileData, gamData, jobsData] = await Promise.all([
          api.getProfile(),
          api.getGamification(),
          api.getJobs(params),
        ]);
        setProfile(profileData);
        setGamification(gamData);
        setJobs(jobsData.jobs);
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filter, sourceFilter, typeFilter, debouncedSearch]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new': return 'status-green';
      case 'applied': return 'text-[var(--valo-green)] border border-[var(--valo-green)] bg-[var(--valo-green)]/10';
      case 'in_progress': return 'status-yellow';
      case 'failed': return 'status-red';
      case 'needs_review': return 'status-orange';
      default: return 'status-gray';
    }
  };

  const refresher = async () => {
      const params: any = { per_page: 50 };
      if (filter !== 'all') params.status = filter;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const jobsData = await api.getJobs(params);
      setJobs(jobsData.jobs);
  };

  const handleApplyJob = async (jobId: string) => {
    try {
      await api.triggerApply(jobId);
      await refresher();
    } catch (err) {
      console.error('Apply failed:', err);
    }
  };

  const handleMarkApplied = async (jobId: string) => {
    setExitingJobIds(prev => new Set(prev).add(jobId));

    setTimeout(async () => {
      try {
        await api.updateJob(jobId, { status: 'applied' });
        await refresher();
        
        setExitingJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });

        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
      } catch (err) {
        console.error('Update failed:', err);
        setExitingJobIds(prev => {
           const next = new Set(prev);
           next.delete(jobId);
           return next;
        });
      }
    }, 600);
  };

  const handleUndo = async (jobId: string) => {
    setExitingJobIds(prev => new Set(prev).add(jobId));

    setTimeout(async () => {
      try {
        await api.updateJob(jobId, { status: 'new' });
        await refresher();
        
        setExitingJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        
        // Don't close selected job, just update it
      } catch (err) {
        console.error('Undo failed:', err);
        setExitingJobIds(prev => {
           const next = new Set(prev);
           next.delete(jobId);
           return next;
        });
      }
    }, 600);
  };

  const handleDeleteClick = (jobId: string) => {
    setJobToDelete(jobId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      await api.deleteJob(jobToDelete);
      await refresher();
      
      if (selectedJob?.id === jobToDelete) setSelectedJob(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setShowDeleteModal(false);
      setJobToDelete(null);
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
                <span className="w-2 h-2 rounded-full bg-[var(--valo-cyan)] pulse-green"></span>
                MISSION BRIEFING
              </div>
              <h1 className="font-display text-4xl font-bold tracking-wider text-[var(--valo-text)]">
                ACTIVE MISSIONS
              </h1>
            </div>

            <div className="relative w-full md:w-96">
               <input 
                  type="text" 
                  placeholder="SEARCH TARGETS..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--valo-dark)] border border-[var(--valo-gray-light)] text-[var(--valo-text)] px-4 py-3 pl-10 focus:outline-none focus:border-[var(--valo-cyan)] tech-button"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
               />
               <svg className="w-5 h-5 text-[var(--valo-text-dim)] absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            </div>
          </header>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { key: 'all', label: 'ALL JOBS' },
                { key: 'new', label: 'NEW' },
                { key: 'in_progress', label: 'IN PROGRESS' },
                { key: 'applied', label: 'DEPLOYED' },
                { key: 'failed', label: 'FAILED' },
              ].map((status) => (
                <button
                  key={status.key}
                  onClick={() => setFilter(status.key)}
                  className={`px-6 py-2 font-bold tracking-wide transition-all duration-200 tech-button whitespace-nowrap ${
                    filter === status.key
                      ? 'tech-button-solid bg-[var(--valo-red)] text-white'
                      : 'text-[var(--valo-text-dim)] hover:text-[var(--valo-text)]'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-4">
               <ValorantDropdown
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={[
                      { key: 'all', label: 'ALL SOURCES' },
                      { key: 'linkedin', label: 'LINKEDIN' },
                      { key: 'jobright', label: 'JOBRIGHT' },
                      { key: 'simplify', label: 'SIMPLIFY' },
                      { key: 'cvrve', label: 'CVRVE' },
                      { key: 'dice', label: 'DICE' },
                      { key: 'builtin', label: 'BUILTIN' },
                      { key: 'weworkremotely', label: 'WWR' },
                      { key: 'manual', label: 'MANUAL' },
                  ]}
                  className="w-48"
               />

               <ValorantDropdown
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                      { key: 'all', label: 'ALL TYPES' },
                      { key: 'linkedin_easy', label: 'EASY APPLY' },
                      { key: 'workday', label: 'WORKDAY' },
                      { key: 'greenhouse', label: 'GREENHOUSE' },
                      { key: 'lever', label: 'LEVER' },
                      { key: 'ashby', label: 'ASHBY' },
                      { key: 'oracle', label: 'ORACLE' },
                      { key: 'smartrecruiters', label: 'SMART' },
                  ]}
                  className="w-48"
               />
            </div>
          </div>

          <div className="space-y-3 pb-20">
            {loading ? (
              <div className="text-center py-12 text-[var(--valo-text-dim)]">
                <svg className="w-8 h-8 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning database...
              </div>
            ) : jobs.length === 0 ? (
              <div className="tech-border p-8 text-center bg-[var(--valo-dark)]/50">
                <div className="text-5xl mb-4 opacity-50">📡</div>
                <div className="text-xl text-[var(--valo-text)]">
                  No missions found matching criteria.
                </div>
                <p className="text-[var(--valo-text-dim)] mt-2">
                  Adjust filters or run a new scan.
                </p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className={`tech-border overflow-hidden card-hover transition-all duration-500 ${
                     exitingJobIds.has(job.id) ? 'opacity-0 translate-x-full scale-95 pointer-events-none' : 'opacity-100 translate-x-0 scale-100'
                  }`}
                >
                  <div 
                    className="p-5 cursor-pointer relative group"
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--valo-red)] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-200"></div>

                    <div className="flex items-center justify-between pl-2">
                      <div>
                        <h3 className="font-display font-semibold text-xl text-[var(--valo-text)] group-hover:text-[var(--valo-red)] transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-sm text-[var(--valo-text-dim)] font-mono mt-1">
                          {job.company.toUpperCase()} <span className="text-[var(--valo-gray-light)]">|</span> {job.location || 'REMOTE'} <span className="text-[var(--valo-gray-light)]">|</span> <span className="text-[var(--valo-cyan)]">{job.source.toUpperCase()}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 text-xs font-bold tracking-wider uppercase border ${getStatusStyle(job.status)}`} style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%, 0 20%)' }}>
                          {job.status.replace('_', ' ')}
                        </span>
                        <svg 
                          className={`w-5 h-5 text-[var(--valo-text-dim)] transition-transform duration-300 ${selectedJob?.id === job.id ? 'rotate-180 text-[var(--valo-red)]' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {selectedJob?.id === job.id && (
                    <JobDetails 
                      job={job} 
                      onApply={handleApplyJob} 
                      onMarkApplied={(id) => handleMarkApplied(id)} 
                      onUndo={(id) => handleUndo(id)}
                      onDelete={handleDeleteClick} 
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </main>
        
        <Footer />
        
        <ConfirmModal
          isOpen={showDeleteModal}
          title="REJECT MISSION?"
          message="Are you sure you want to reject this mission? It will be removed from your active list and archived."
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDestructive={true}
        />
      </div>
    </div>
  );
}
