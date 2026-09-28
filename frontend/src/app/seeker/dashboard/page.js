'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  CheckCircle,
  Calendar,
  Bookmark,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  User,
  Clock,
  Building,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import StatCard from '../../../components/StatCard';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import { formatDate } from '../../../lib/utils';

export default function SeekerDashboard() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (user && isSeeker) {
      Promise.all([
        userService.getSeekerDashboard(),
        userService.getRecommendations(3),
      ])
        .then(([dashRes, recRes]) => {
          if (!isMounted) return;
          if (dashRes.success) {
            setStats(dashRes.stats);
            setRecentApplications(dashRes.recentApplications || []);
          }
          if (recRes.success) {
            setRecommendations(recRes.recommendations || []);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error(err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user, isSeeker]);

  if (authLoading || !user || !isSeeker || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner text="Loading candidate dashboard..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Navigation Sidebar */}
        <Sidebar role="job_seeker" />

        {/* Main Dashboard Content */}
        <main className="flex-1 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[11px] font-bold uppercase tracking-wider">
                Candidate Workspace
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2">
                Hello, {user?.profile?.first_name || 'Candidate'}!
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl mt-1 leading-relaxed">
                Welcome back. You have {stats?.totalApplications || 0} active applications submitted. Check your interview requests and skill match recommendations below.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/seeker/recommendations"
                  className="px-4 py-2 bg-white text-blue-700 font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  View Top Job Matches
                </Link>
                <Link
                  href="/seeker/resume-builder"
                  className="px-4 py-2 bg-blue-700/80 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Resume Builder
                </Link>
              </div>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Applied"
              value={stats?.totalApplications || 0}
              icon={Briefcase}
              color="blue"
              description="Submitted jobs"
            />
            <StatCard
              title="Shortlisted"
              value={stats?.shortlistedCount || 0}
              icon={CheckCircle}
              color="purple"
              description="Advanced by recruiters"
            />
            <StatCard
              title="Interviews"
              value={stats?.interviewsCount || 0}
              icon={Calendar}
              color="indigo"
              description="Scheduled meetings"
            />
            <StatCard
              title="Saved Jobs"
              value={stats?.savedCount || 0}
              icon={Bookmark}
              color="amber"
              description="In your bookmarks"
            />
          </div>

          {/* Two Columns: Recent Applications & Recommended Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Applications */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900">Recent Applications</h3>
                <Link
                  href="/seeker/applications"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentApplications.length === 0 ? (
                <EmptyState
                  title="No Applications Yet"
                  description="Start applying to jobs matching your technical profile."
                  actionText="Search Jobs"
                  onAction={() => router.push('/jobs')}
                />
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {app.company_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 line-clamp-1">{app.job_title}</p>
                          <p className="text-[11px] text-slate-500">{app.company_name} • {app.job_location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <ApplicationStatusBadge status={app.status} />
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(app.applied_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Jobs Preview */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">Top Matches for Your Skills</h3>
                </div>
                <Link
                  href="/seeker/recommendations"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  All Matches <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recommendations.length === 0 ? (
                <EmptyState
                  title="No Recommendations Yet"
                  description="Add your skills in your profile to trigger AI recommendations."
                  actionText="Update Profile Skills"
                  onAction={() => router.push('/seeker/profile')}
                />
              ) : (
                <div className="space-y-3">
                  {recommendations.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100/80 flex items-center justify-between hover:bg-blue-50/70 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-800">{job.title}</p>
                        <p className="text-[11px] text-slate-500">{job.company_name} • {job.location}</p>
                        {job.match?.matchedSkills?.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {job.match.matchedSkills.slice(0, 3).map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
                          {job.match?.matchLabel || `${job.match?.matchPercentage}%`}
                        </span>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          View Job
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
