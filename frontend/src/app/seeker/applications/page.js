'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Building,
  MapPin,
  DollarSign,
  AlertCircle,
  Trash2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import applicationService from '../../../services/applicationService';
import Sidebar from '../../../components/Sidebar';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import { formatDate, formatSalary } from '../../../lib/utils';
import { APPLICATION_STATUS_LIST } from '../../../types';

export default function SeekerApplicationsPage() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const router = useRouter();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [alert, setAlert] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await applicationService.getSeekerApplications({ status: filterStatus });
      if (res.success) {
        setApplications(res.applications || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve applications.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isSeeker) {
      fetchApplications();
    }
  }, [user, isSeeker, filterStatus]);

  const handleWithdraw = async (appId) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    try {
      const res = await applicationService.withdrawApplication(appId);
      if (res.success) {
        setAlert({ type: 'success', message: 'Application withdrawn successfully.' });
        setApplications((prev) => prev.filter((a) => a.id !== appId));
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to withdraw application.' });
    }
  };

  if (authLoading || !user || !isSeeker) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="job_seeker" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Application History</h1>
              <p className="text-xs text-slate-500 mt-1">
                Real-time tracking from Applied → Under Review → Shortlisted → Interview → Selection
              </p>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
              >
                <option value="All">All Statuses ({applications.length})</option>
                {APPLICATION_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Workflow Stage Visual Header */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Standard Recruitment Workflow
            </p>
            <div className="flex items-center gap-2 min-w-[500px]">
              {APPLICATION_STATUS_LIST.map((st, idx) => (
                <React.Fragment key={st}>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold">
                    {st}
                  </div>
                  {idx < APPLICATION_STATUS_LIST.length - 1 && (
                    <span className="text-slate-300 font-bold">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Retrieving applications..." />
          ) : applications.length === 0 ? (
            <EmptyState
              title="No Applications Found"
              description={
                filterStatus !== 'All'
                  ? `You have no applications with status "${filterStatus}".`
                  : "You haven't submitted any job applications yet."
              }
              actionText="Search Jobs"
              onAction={() => router.push('/jobs')}
            />
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-base flex-shrink-0">
                      {app.company_name?.charAt(0) || 'C'}
                    </div>

                    <div>
                      <Link
                        href={`/jobs/${app.job_id}`}
                        className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                      >
                        {app.job_title}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{app.company_name}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {app.job_location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          {formatSalary(app.min_salary, app.max_salary)}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" /> Applied {formatDate(app.applied_at)}
                        </span>
                      </div>

                      {/* Recruiter feedback / notes */}
                      {app.notes && (
                        <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Recruiter Note:</span> {app.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <ApplicationStatusBadge status={app.status} />

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/jobs/${app.job_id}`}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                      >
                        View Job
                      </Link>

                      {app.status === 'Applied' && (
                        <button
                          onClick={() => handleWithdraw(app.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Withdraw application"
                        >
                          <Trash2 className="w-3 h-3" />
                          Withdraw
                        </button>
                      )}
                    </div>
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
