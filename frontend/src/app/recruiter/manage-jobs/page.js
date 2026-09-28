'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  MapPin,
  Clock,
  Trash2,
  Edit,
  Eye,
  PlusCircle,
  CheckCircle,
  Calendar,
  Award,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import jobService from '../../../services/jobService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import { formatDate, formatSalary } from '../../../lib/utils';

export default function ManageJobsPage() {
  const { user, isRecruiter, loading: authLoading } = useRoleGuard('recruiter');
  const router = useRouter();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchJobs = async () => {
    try {
      const res = await jobService.getRecruiterJobs();
      if (res.success) {
        setJobs(res.jobs || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load your job postings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isRecruiter) {
      fetchJobs();
    }
    if (typeof window !== 'undefined') {
      const savedAlert = sessionStorage.getItem('manage_jobs_alert');
      if (savedAlert) {
        try {
          setAlert(JSON.parse(savedAlert));
          sessionStorage.removeItem('manage_jobs_alert');
        } catch (e) {}
      }
    }
  }, [user, isRecruiter]);

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to permanently delete this job posting? All related candidate applications will also be removed.')) return;
    try {
      const res = await jobService.deleteJob(jobId);
      if (res.success) {
        setAlert({ type: 'success', message: 'Job posting deleted.' });
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete job.' });
    }
  };

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    try {
      const res = await jobService.updateJob(job.id, { status: newStatus });
      if (res.success) {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
        );
        setAlert({ type: 'success', message: `Job marked as ${newStatus}.` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update job status.' });
    }
  };

  if (authLoading || !user || !isRecruiter) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="recruiter" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Manage Job Postings</h1>
              <p className="text-xs text-slate-500 mt-1">
                Oversee vacancies, applicant pipelines, and posting lifecycles
              </p>
            </div>

            <Link
              href="/recruiter/post-job"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5 self-start"
            >
              <PlusCircle className="w-4 h-4" /> Post New Job
            </Link>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {loading ? (
            <LoadingSpinner text="Retrieving posted jobs..." />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No Jobs Posted Yet"
              description="Create your first job listing to start receiving candidate applications."
              actionText="Post Your First Job"
              icon={Briefcase}
              onAction={() => router.push('/recruiter/post-job')}
            />
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <h3 className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                        </Link>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          {job.job_type}
                        </span>
                        <span>{formatSalary(job.min_salary, job.max_salary)}</span>
                        <span>• Posted {formatDate(job.created_at)}</span>
                      </div>
                    </div>

                    {/* Quick applicant funnel numbers */}
                    <div className="flex items-center gap-2 self-start bg-slate-50 p-2 rounded-2xl border border-slate-100 text-xs">
                      <div className="px-3 text-center border-r border-slate-200">
                        <p className="font-black text-slate-900">{job.applicants_count || 0}</p>
                        <p className="text-[10px] text-slate-400">Total</p>
                      </div>
                      <div className="px-3 text-center border-r border-slate-200">
                        <p className="font-black text-purple-600">{job.shortlisted_count || 0}</p>
                        <p className="text-[10px] text-slate-400">Shortlisted</p>
                      </div>
                      <div className="px-3 text-center border-r border-slate-200">
                        <p className="font-black text-indigo-600">{job.interview_count || 0}</p>
                        <p className="text-[10px] text-slate-400">Interview</p>
                      </div>
                      <div className="px-3 text-center">
                        <p className="font-black text-emerald-600">{job.selected_count || 0}</p>
                        <p className="text-[10px] text-slate-400">Selected</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <Link
                      href={`/recruiter/applicants?jobId=${job.id}`}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      View {job.applicants_count || 0} Applicants
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(job)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors"
                      >
                        {job.status === 'active' ? 'Close Job' : 'Reactivate'}
                      </button>

                      <Link
                        href={`/recruiter/edit-job/${job.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 font-semibold transition-all"
                        title="Edit Job"
                        id={`edit-job-btn-${job.id}`}
                      >
                        <Edit className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Edit</span>
                      </Link>

                      <Link
                        href={`/jobs/${job.id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
                        title="View Public Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
