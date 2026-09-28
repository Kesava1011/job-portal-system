'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bookmark,
  Building,
  MapPin,
  DollarSign,
  Briefcase,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import applicationService from '../../../services/applicationService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import { formatSalary, formatDate } from '../../../lib/utils';

export default function SavedJobsPage() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const router = useRouter();

  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchSavedJobs = async () => {
    try {
      const res = await applicationService.getSavedJobs();
      if (res.success) {
        setSavedJobs(res.savedJobs || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve saved jobs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isSeeker) {
      fetchSavedJobs();
    }
  }, [user, isSeeker]);

  const handleRemove = async (jobId) => {
    try {
      const res = await applicationService.toggleSaveJob(jobId);
      if (res.success) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
        setAlert({ type: 'success', message: 'Job removed from saved list.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to remove job.' });
    }
  };

  if (authLoading || !user || !isSeeker || loading) {
    return <LoadingSpinner text="Loading saved jobs..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="job_seeker" />

        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Saved Jobs</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your bookmarked opportunities ready for review and application
            </p>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {loading ? (
            <LoadingSpinner text="Loading your saved jobs..." />
          ) : savedJobs.length === 0 ? (
            <EmptyState
              title="No Saved Jobs"
              description="Click the bookmark icon on any job card to save interesting opportunities here."
              actionText="Browse Jobs"
              icon={Bookmark}
              onAction={() => router.push('/jobs')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-blue-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{job.company_name}</p>
                        <Link href={`/jobs/${job.id}`}>
                          <h3 className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors mt-0.5">
                            {job.title}
                          </h3>
                        </Link>
                      </div>
                      <button
                        onClick={() => handleRemove(job.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remove bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4 text-xs text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.location}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                        {job.job_type}
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center gap-1 font-semibold">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        {formatSalary(job.min_salary, job.max_salary)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-3 line-clamp-2">{job.description}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Saved {formatDate(job.saved_at)}</span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1"
                    >
                      View & Apply <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
