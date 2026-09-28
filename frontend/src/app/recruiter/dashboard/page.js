'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  CheckCircle,
  Calendar,
  Award,
  PlusCircle,
  ArrowRight,
  Clock,
  Eye,
  Building,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import jobService from '../../../services/jobService';
import Sidebar from '../../../components/Sidebar';
import StatCard from '../../../components/StatCard';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import { formatDate } from '../../../lib/utils';

export default function RecruiterDashboard() {
  const { user, isRecruiter, loading: authLoading } = useRoleGuard('recruiter');
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (user && isRecruiter) {
      jobService.getRecruiterDashboard()
        .then((res) => {
          if (!isMounted) return;
          if (res.success) {
            setStats(res.stats);
            setRecentApplications(res.recentApplications || []);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error(err);
          setAlert({ type: 'error', message: 'Failed to load recruiter analytics.' });
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user, isRecruiter]);

  if (authLoading || !user || !isRecruiter || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner text="Loading recruiter dashboard..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="recruiter" />

        <main className="flex-1 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Employer Talent Hub
                </span>
                <h1 className="text-2xl sm:text-3xl font-black mt-2">
                  Welcome, {user?.profile?.first_name || 'Recruiter'}!
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mt-1 leading-relaxed">
                  Managing {user?.profile?.company_name || 'Your Company'}. You have {stats?.totalApplications || 0} candidate applications across {stats?.jobsPosted || 0} active openings.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-col gap-2">
                <Link
                  href="/recruiter/post-job"
                  className="px-5 py-2.5 bg-white text-emerald-700 font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Post a New Job
                </Link>
                <Link
                  href="/recruiter/applicants"
                  className="px-5 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  Review Candidates
                </Link>
              </div>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Recruiter Metric Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
              title="Jobs Posted"
              value={stats?.jobsPosted || 0}
              icon={Briefcase}
              color="blue"
            />
            <StatCard
              title="Total Applicants"
              value={stats?.totalApplications || 0}
              icon={Users}
              color="indigo"
            />
            <StatCard
              title="Shortlisted"
              value={stats?.shortlistedCandidates || 0}
              icon={CheckCircle}
              color="purple"
            />
            <StatCard
              title="Interviews"
              value={stats?.interviewsScheduled || 0}
              icon={Calendar}
              color="amber"
            />
            <StatCard
              title="Selected"
              value={stats?.selectedCandidates || 0}
              icon={Award}
              color="emerald"
            />
          </div>

          {/* Recent Applications Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Recent Candidate Applications</h3>
                <p className="text-[11px] text-slate-500">Latest applicants across your posted openings</p>
              </div>
              <Link
                href="/recruiter/applicants"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                All Applicants <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <EmptyState
                title="No Applications Received Yet"
                description="Once candidates apply for your posted jobs, their profiles and resumes will appear here."
                actionText="Post a Job"
                onAction={() => router.push('/recruiter/post-job')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">Candidate</th>
                      <th className="p-3">Applied Role</th>
                      <th className="p-3">Applied Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              {app.first_name?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{app.first_name} {app.last_name}</p>
                              <p className="text-[11px] text-slate-400">{app.candidate_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{app.job_title}</td>
                        <td className="p-3 text-slate-400">{formatDate(app.applied_at)}</td>
                        <td className="p-3">
                          <ApplicationStatusBadge status={app.status} />
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/recruiter/candidate/${app.job_seeker_id}?appId=${app.id}&jobId=${app.job_id}`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </Link>
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
