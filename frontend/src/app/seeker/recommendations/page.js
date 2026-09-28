'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Briefcase,
  MapPin,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import ApplyJobModal from '../../../components/ApplyJobModal';
import { formatSalary, getMatchScoreColor } from '../../../lib/utils';

export default function SeekerRecommendationsPage() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const router = useRouter();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Apply Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);

  const fetchRecommendations = async () => {
    try {
      const res = await userService.getRecommendations(15);
      if (res.success) {
        setRecommendations(res.recommendations || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load recommendations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isSeeker) {
      fetchRecommendations();
    }
  }, [user, isSeeker]);

  const handleOpenApplyModal = (job) => {
    setSelectedJob(job);
    setIsApplyModalOpen(true);
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Job Match Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Recommended For You</h1>
              <p className="text-xs text-slate-500 mt-1">
                Roles matched by comparing your skills (60%), experience (25%), and educational background (15%)
              </p>
            </div>

            <Link
              href="/seeker/profile"
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors self-start"
            >
              Update Skills Profile
            </Link>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {loading ? (
            <LoadingSpinner text="Analyzing jobs against candidate skillset..." />
          ) : recommendations.length === 0 ? (
            <EmptyState
              title="No Recommendations Available"
              description="Make sure you have added technical skills to your profile so our recommendation engine can rank matching vacancies."
              actionText="Add Skills to Profile"
              icon={Sparkles}
              onAction={() => router.push('/seeker/profile')}
            />
          ) : (
            <div className="space-y-4">
              {recommendations.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">{job.company_name}</p>
                      <Link href={`/jobs/${job.id}`}>
                        <h3 className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors">
                          {job.title}
                        </h3>
                      </Link>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1 text-blue-700 font-medium">
                          <Briefcase className="w-3.5 h-3.5 text-blue-500" /> {job.job_type}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          {formatSalary(job.min_salary, job.max_salary)}
                        </span>
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className="flex md:flex-col items-center md:items-end justify-between gap-2">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${getMatchScoreColor(
                          job.match?.matchPercentage || 50
                        )}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {job.match?.matchLabel || `${job.match?.matchPercentage}% Match`}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {job.match?.candidateExp} yrs / {job.match?.requiredExp} yrs required
                      </p>
                    </div>
                  </div>

                  {/* Skills Alignment Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    {/* Matched skills */}
                    <div>
                      <p className="font-bold text-emerald-700 flex items-center gap-1 mb-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched Skills ({job.match?.matchedSkills?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.match?.matchedSkills?.length > 0 ? (
                          job.match.matchedSkills.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No direct skill matches</span>
                        )}
                      </div>
                    </div>

                    {/* Missing skills */}
                    <div>
                      <p className="font-bold text-rose-700 flex items-center gap-1 mb-1.5 text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        Missing Required Skills ({job.match?.missingSkills?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.match?.missingSkills?.length > 0 ? (
                          job.match.missingSkills.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-semibold"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Full Skill Compatibility!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-slate-600 hover:text-blue-600 font-semibold"
                    >
                      Read Full Requirements
                    </Link>

                    {job.hasApplied ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold">
                        Already Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenApplyModal(job)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        Quick Apply <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Apply Modal */}
      {modalAlert && (
        <Alert type={modalAlert.type} message={modalAlert.message} onClose={() => setModalAlert(null)} />
      )}
      {selectedJob && isApplyModalOpen && (
        <ApplyJobModal
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setModalAlert(null);
          }}
          job={selectedJob}
          onSuccess={(res) => {
            const successMsg = res.message || 'Application submitted successfully!';
            setAlert({ type: 'success', message: successMsg });
            setRecommendations((prev) =>
              prev.map((j) => (j.id === selectedJob.id ? { ...j, hasApplied: true } : j))
            );
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      )}
    </div>
  );
}
