'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Search,
  Filter,
  Eye,
  Building,
  User,
  Clock,
  Briefcase,
  FileText,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import adminService from '../../../services/adminService';
import Sidebar from '../../../components/Sidebar';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';
import { formatDate } from '../../../lib/utils';

export default function AdminApplicationsPage() {
  const { user, isAdmin, loading: authLoading } = useRoleGuard('admin');
  const router = useRouter();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await adminService.getApplications({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
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
    if (user && isAdmin) {
      fetchApplications();
    }
  }, [user, isAdmin, statusFilter, search]);

  if (authLoading || !user || !isAdmin) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="admin" />

        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Application Pipeline Audit</h1>
            <p className="text-xs text-slate-500 mt-1">
              Global oversight of candidate applications submitted across all platform job postings
            </p>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search candidate name, email, job title, company, or recruiter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="w-full md:w-52">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="All">All Application Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Under Review">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            {loading ? (
              <LoadingSpinner text="Loading applications..." />
            ) : applications.length === 0 ? (
              <EmptyState
                title="No applications found"
                description="Try clearing your search query or choosing another status filter."
                icon={FileText}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">Candidate</th>
                      <th className="p-3">Applied Job</th>
                      <th className="p-3">Company & Recruiter</th>
                      <th className="p-3">Date Applied</th>
                      <th className="p-3 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{a.first_name} {a.last_name}</p>
                          <p className="text-[11px] text-slate-400">{a.candidate_email}</p>
                        </td>
                        <td className="p-3">
                          <Link href={`/jobs/${a.job_id}`} className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                            {a.job_title}
                          </Link>
                          <p className="text-[10px] text-slate-400">{a.job_type} &bull; {a.job_location || 'Remote'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{a.company_name || '—'}</p>
                          {a.recruiter_name ? (
                            <p className="text-[10px] text-slate-400">Recruiter: {a.recruiter_name}</p>
                          ) : a.recruiter_email ? (
                            <p className="text-[10px] text-slate-400">{a.recruiter_email}</p>
                          ) : null}
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(a.applied_at)}</td>
                        <td className="p-3">
                          <ApplicationStatusBadge status={a.status} />
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

