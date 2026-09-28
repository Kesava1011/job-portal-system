'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Search,
  Trash2,
  Eye,
  MapPin,
  Clock,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import adminService from '../../../services/adminService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';
import { formatDate, formatSalary } from '../../../lib/utils';

export default function AdminJobsPage() {
  const { user, isAdmin, loading: authLoading } = useRoleGuard('admin');
  const router = useRouter();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await adminService.getJobs({ search, status: statusFilter });
      if (res.success) {
        setJobs(res.jobs || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve jobs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchJobs();
    }
  }, [user, isAdmin, search, statusFilter]);

  const handleDeleteJob = async (jobId, title) => {
    if (!confirm(`ADMIN MODERATION: Are you sure you want to permanently delete "${title}"?`)) return;

    try {
      const res = await adminService.deleteJob(jobId);
      if (res.success) {
        setAlert({ type: 'success', message: 'Job posting permanently deleted by Admin.' });
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete job.' });
    }
  };

  if (authLoading || !user || !isAdmin) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="admin" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Job Moderation</h1>
              <p className="text-xs text-slate-500 mt-1">
                Monitor and moderate all employer job postings across the portal
              </p>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search job title or hiring company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="w-full md:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            {loading ? (
              <LoadingSpinner text="Loading jobs..." />
            ) : jobs.length === 0 ? (
              <EmptyState
                title="No job listings found"
                description="Try clearing your search term or adjusting status filter."
                icon={Briefcase}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">Job Title</th>
                      <th className="p-3">Company & Recruiter</th>
                      <th className="p-3">Type & Location</th>
                      <th className="p-3">Salary</th>
                      <th className="p-3">Applicants</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-xl text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          <Link href={`/jobs/${j.id}`} className="hover:text-blue-600 transition-colors">
                            {j.title}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-normal">Posted {formatDate(j.created_at)}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{j.company_name || '—'}</p>
                          {j.recruiter_name ? (
                            <p className="text-[10px] text-slate-400">Recruiter: {j.recruiter_name}</p>
                          ) : j.recruiter_email ? (
                            <p className="text-[10px] text-slate-400">{j.recruiter_email}</p>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-700">{j.job_type}</span>
                          <p className="text-[10px] text-slate-400">{j.location}</p>
                        </td>
                        <td className="p-3 font-semibold text-emerald-700">
                          {formatSalary(j.min_salary, j.max_salary)}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                            {j.applicants_count || 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            j.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/jobs/${j.id}`}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                              title="View job"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteJob(j.id, j.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Remove inappropriate posting"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
