'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  Briefcase,
  Building,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  PieChart,
  BarChart2,
  FileText,
  Hourglass,
  Layers,
  Activity,
  UserCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import adminService from '../../../services/adminService';
import Sidebar from '../../../components/Sidebar';
import StatCard from '../../../components/StatCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import {
  StatusDoughnutChart,
  JobTypesBarChart,
  UsersByRolePieChart,
  JobsByStatusBarChart,
} from '../../../components/ChartAnalytics';
import { formatDate } from '../../../lib/utils';

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading } = useRoleGuard('admin');
  const router = useRouter();

  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    setAlert(null);
    adminService.getStats()
      .then((res) => {
        if (res.success) {
          setStatsData(res);
        } else {
          setAlert({ type: 'error', message: res.message || 'Failed to retrieve system statistics.' });
        }
      })
      .catch((err) => {
        console.error(err);
        setAlert({ type: 'error', message: 'Failed to retrieve system statistics. Please verify backend connection.' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin]);

  if (authLoading || !user || !isAdmin || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner text="Loading system administration analytics..." />
      </div>
    );
  }

  const {
    stats,
    charts,
    recentJobs = [],
    recentUsers = [],
    recentApplications = [],
    recentStatusUpdates = [],
  } = statsData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="admin" />

        <main className="flex-1 space-y-8">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[11px] font-bold uppercase tracking-wider text-purple-200">
                  Global Administrator Oversight
                </span>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">Platform Administration</h1>
                <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-xl">
                  Real-time analytics, user access governance, job moderation, and verified system metrics.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/users"
                  className="px-4 py-2 bg-white text-purple-900 font-bold text-xs rounded-xl shadow hover:bg-purple-50 transition-colors"
                >
                  Manage Users
                </Link>
                <Link
                  href="/admin/jobs"
                  className="px-4 py-2 bg-purple-700/80 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
                >
                  Moderate Jobs
                </Link>
                <Link
                  href="/admin/applications"
                  className="px-4 py-2 bg-purple-700/80 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
                >
                  View Pipeline
                </Link>
              </div>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {!statsData ? (
            <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Failed to Load Platform Analytics</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Unable to retrieve administrative analytics. Please ensure the backend API server is running and reachable.
              </p>
              <button
                onClick={fetchStats}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {/* 1. ADMIN OVERVIEW: Platform Statistics Grid (9 Metrics) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Platform Overview</h2>
                  <span className="text-[11px] font-semibold text-slate-400">Live Database Metrics</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    color="blue"
                  />
                  <StatCard
                    title="Candidates"
                    value={stats?.jobSeekers || 0}
                    icon={Users}
                    color="indigo"
                  />
                  <StatCard
                    title="Recruiters"
                    value={stats?.recruiters || 0}
                    icon={Building}
                    color="emerald"
                  />
                  <StatCard
                    title="Total Jobs"
                    value={stats?.totalJobs || 0}
                    icon={Layers}
                    color="purple"
                  />
                  <StatCard
                    title="Active Jobs"
                    value={stats?.activeJobs || 0}
                    icon={Briefcase}
                    color="amber"
                  />
                  <StatCard
                    title="Total Applications"
                    value={stats?.applications || 0}
                    icon={FileText}
                    color="blue"
                  />
                  <StatCard
                    title="Pending / Review"
                    value={stats?.pendingApplications || 0}
                    icon={Hourglass}
                    color="amber"
                  />
                  <StatCard
                    title="Interviews"
                    value={stats?.interviews || 0}
                    icon={Calendar}
                    color="indigo"
                  />
                  <StatCard
                    title="Selected Candidates"
                    value={stats?.selectedCandidates || 0}
                    icon={CheckCircle}
                    color="emerald"
                  />
                </div>
              </section>

          {/* 5. PLATFORM ANALYTICS: Visual Breakdown Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Platform Analytics</h2>
              <span className="text-[11px] font-semibold text-slate-400">Powered by Chart.js</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Application Funnel Distribution */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Applications by Status</h3>
                    <p className="text-[11px] text-slate-400">Distribution across selection workflow stages</p>
                  </div>
                </div>
                <StatusDoughnutChart data={charts?.applicationStatus || []} />
              </div>

              {/* Chart 2: User Base by Role */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">User Accounts by Role</h3>
                    <p className="text-[11px] text-slate-400">Candidates, Recruiters, and Administrators</p>
                  </div>
                </div>
                <UsersByRolePieChart data={charts?.usersByRole || []} />
              </div>

              {/* Chart 3: Active Job Types Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Postings by Job Type</h3>
                    <p className="text-[11px] text-slate-400">Full-time, Remote, Internship, and Hybrid</p>
                  </div>
                </div>
                <JobTypesBarChart data={charts?.jobTypes || []} />
              </div>

              {/* Chart 4: Jobs by Status Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Jobs by Lifecycle Status</h3>
                    <p className="text-[11px] text-slate-400">Active vs Closed listings</p>
                  </div>
                </div>
                <JobsByStatusBarChart data={charts?.jobsByStatus || []} />
              </div>
            </div>
          </section>

          {/* 6. RECENT PLATFORM ACTIVITY: Real-time Database Feeds */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Recent Platform Activity</h2>
              <span className="text-[11px] font-semibold text-slate-400">Latest Records from Database</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Feed 1: Recent User Registrations */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-900">Recent User Registrations</h3>
                  </div>
                  <Link href="/admin/users" className="text-xs font-bold text-purple-600 hover:underline">
                    View All Users
                  </Link>
                </div>

                {recentUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent registrations.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentUsers.map((u) => (
                      <div key={u.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900">
                            {u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.email}
                          </p>
                          <p className="text-[11px] text-slate-500">{u.email} • Joined {formatDate(u.created_at)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'recruiter'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feed 2: Latest Posted Jobs */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    <h3 className="font-bold text-sm text-slate-900">Latest Posted Jobs</h3>
                  </div>
                  <Link href="/admin/jobs" className="text-xs font-bold text-purple-600 hover:underline">
                    Moderate Jobs
                  </Link>
                </div>

                {recentJobs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent job postings.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentJobs.map((j) => (
                      <div key={j.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors">
                        <div className="pr-2">
                          <p className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                            <Link href={`/jobs/${j.id}`}>{j.title}</Link>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {j.company_name || 'Hiring Company'} • {j.job_type} • {formatDate(j.created_at)}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          j.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {j.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feed 3: Recent Applications */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-sm text-slate-900">Recent Applications</h3>
                  </div>
                  <Link href="/admin/applications" className="text-xs font-bold text-purple-600 hover:underline">
                    View Pipeline
                  </Link>
                </div>

                {recentApplications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent applications submitted.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentApplications.map((app) => (
                      <div key={app.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900">
                            {app.first_name ? `${app.first_name} ${app.last_name || ''}` : 'Candidate'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Applied for <span className="font-medium text-slate-700">{app.job_title}</span> • {formatDate(app.applied_at)}
                          </p>
                        </div>
                        <ApplicationStatusBadge status={app.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feed 4: Recent Status Changes & Workflow Updates */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900">Recent Status Progression</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Candidate Pipeline</span>
                </div>

                {recentStatusUpdates.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No recent status transitions recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentStatusUpdates.map((su) => (
                      <div key={su.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900">
                            {su.first_name} {su.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {su.job_title} ({su.company_name})
                          </p>
                        </div>
                        <ApplicationStatusBadge status={su.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
          </>
          )}
        </main>
      </div>
    </div>
  );
}

