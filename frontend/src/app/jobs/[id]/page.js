'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Bookmark,
  Share2,
  ArrowLeft,
  Globe,
  Award,
  Users,
  Edit,
} from 'lucide-react';
import jobService from '../../../services/jobService';
import applicationService from '../../../services/applicationService';
import userService from '../../../services/userService';
import { formatSalary, formatDate, formatTimeAgo, getMatchScoreColor } from '../../../lib/utils';
import Modal from '../../../components/Modal';
import Alert from '../../../components/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ApplyJobModal from '../../../components/ApplyJobModal';
import { useAuth } from '../../../hooks/useAuth';

export default function JobDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isSeeker, isRecruiter } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [modalAlert, setModalAlert] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Apply modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);

  useEffect(() => {
    if (id) {
      jobService.getJobById(id)
        .then((res) => {
          if (res.success && res.job) {
            setJob(res.job);
            setIsSaved(res.job.isSaved || false);
          }
        })
        .catch((err) => {
          console.error(err);
          setAlert({ type: 'error', message: 'Failed to load job details.' });
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleToggleSave = async () => {
    if (!user || !isSeeker) {
      router.push('/login');
      return;
    }

    try {
      const res = await applicationService.toggleSaveJob(job.id);
      if (res.success) {
        setIsSaved(res.isSaved);
        setAlert({
          type: 'success',
          message: res.isSaved ? 'Job saved to your bookmarks!' : 'Job removed from bookmarks.',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenApplyModal = async () => {
    if (!user) {
      router.push(`/login?redirect=/jobs/${id}`);
      return;
    }
    if (isRecruiter) {
      setAlert({ type: 'warning', message: 'Recruiters cannot apply for jobs. Please manage postings from your Recruiter Dashboard.' });
      return;
    }
    if (!isSeeker) {
      setAlert({ type: 'warning', message: 'Only job seekers can apply for jobs.' });
      return;
    }

    setModalAlert(null);
    setIsApplyModalOpen(true);
    try {
      const res = await userService.getResumes();
      if (res.success && res.resumes?.length > 0) {
        setResumes(res.resumes);
        const def = res.resumes.find((r) => r.is_default);
        setSelectedResumeId(def ? def.id : res.resumes[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setModalAlert(null);

    if (!job || !job.id) {
      setModalAlert({ type: 'error', message: 'Job posting details could not be verified. Please refresh the page.' });
      return;
    }

    if (!user) {
      setModalAlert({ type: 'error', message: 'You must be signed in as a job seeker to submit an application.' });
      return;
    }

    if (!isSeeker) {
      setModalAlert({ type: 'error', message: 'Only job seeker accounts can submit job applications.' });
      return;
    }

    setSubmittingApp(true);
    try {
      const parsedResumeId = selectedResumeId ? parseInt(selectedResumeId, 10) : null;
      const res = await applicationService.applyForJob({
        jobId: job.id,
        resumeId: !isNaN(parsedResumeId) ? parsedResumeId : null,
        coverLetter: coverLetter ? coverLetter.trim() : '',
      });

      if (res.success) {
        const successMsg = res.message || 'Application submitted successfully!';
        setModalAlert({ type: 'success', message: successMsg });
        setAlert({ type: 'success', message: successMsg });
        setJob((prev) => ({ ...prev, hasApplied: true, applicationStatus: 'Applied' }));
        setTimeout(() => {
          setIsApplyModalOpen(false);
          setModalAlert(null);
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 1000);
      } else {
        const failMsg = res.message || 'Failed to submit application.';
        setModalAlert({ type: 'error', message: failMsg });
        setAlert({ type: 'error', message: failMsg });
      }
    } catch (err) {
      const errMsg = err.message || err.data?.message || 'Failed to submit application.';
      setModalAlert({ type: 'error', message: errMsg });
      setAlert({ type: 'error', message: errMsg });
    } finally {
      setSubmittingApp(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner text="Loading job posting details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Job Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">The requested job posting may have expired or been removed.</p>
        <Link href="/jobs" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all listings
        </Link>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Job Body */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Job Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {job.company_logo ? (
                  <img
                    src={job.company_logo}
                    alt={job.company_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100">
                    <Building2 className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                    {job.title}
                  </h1>
                  <p className="text-sm font-semibold text-slate-600 mt-1 flex items-center gap-2">
                    {job.company_id ? (
                      <Link
                        href={`/companies/${job.company_id}`}
                        className="text-slate-800 hover:text-blue-600 transition-colors font-bold underline-offset-2 hover:underline"
                      >
                        {job.company_name}
                      </Link>
                    ) : (
                      <span>{job.company_name}</span>
                    )}
                    {job.company_website && (
                      <a
                        href={job.company_website.startsWith('http') ? job.company_website : `https://${job.company_website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs font-normal ml-1"
                      >
                        <Globe className="w-3.5 h-3.5" /> Visit site
                      </a>
                    )}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {isRecruiter ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/recruiter/edit-job/${job.id}`}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                      id="recruiter-edit-job-btn"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Job
                    </Link>
                    <Link
                      href={`/recruiter/applicants?jobId=${job.id}`}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                      id="recruiter-view-applicants-btn"
                    >
                      <Users className="w-4 h-4" />
                      View Applicants ({job.applicants_count || 0})
                    </Link>
                    <Link
                      href="/recruiter/manage-jobs"
                      className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl transition-colors"
                      id="recruiter-manage-jobs-btn"
                    >
                      Manage Jobs
                    </Link>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleToggleSave}
                      className={`p-3 rounded-2xl border transition-all ${
                        isSaved
                          ? 'bg-amber-50 border-amber-300 text-amber-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      title={isSaved ? 'Saved to bookmarks' : 'Save job'}
                    >
                      <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-amber-500' : ''}`} />
                    </button>

                    {job.hasApplied ? (
                      <span className="px-6 py-3 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-2xl border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Applied ({job.applicationStatus})
                      </span>
                    ) : (
                      <button
                        onClick={handleOpenApplyModal}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all"
                        id="apply-now-btn"
                      >
                        Apply Now
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400">Location</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400">Job Type</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                  {job.job_type}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400">Salary</p>
                <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  {formatSalary(job.min_salary, job.max_salary)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400">Experience</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  {job.experience_required ? `${job.experience_required}+ yrs` : 'Entry Level'}
                </p>
              </div>
            </div>
          </div>

          {/* AI Skill Recommendation & Match Analysis Box */}
          {job.match && (
            <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white rounded-3xl border border-blue-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">AI Candidate Compatibility</h3>
                    <p className="text-[11px] text-slate-500">Based on your skills, experience & education</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-black border ${getMatchScoreColor(
                    job.match.matchPercentage
                  )}`}
                >
                  {job.match.matchLabel || `${job.match.matchPercentage}% Match`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-100">
                {/* Matched skills */}
                <div>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mb-2">
                    <CheckCircle className="w-3.5 h-3.5" /> Matched Skills ({job.match.matchedSkills?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.match.matchedSkills?.length > 0 ? (
                      job.match.matchedSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No common skills recorded yet</span>
                    )}
                  </div>
                </div>

                {/* Missing skills */}
                <div>
                  <p className="text-xs font-bold text-rose-700 flex items-center gap-1 mb-2">
                    <XCircle className="w-3.5 h-3.5" /> Missing Skills ({job.match.missingSkills?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.match.missingSkills?.length > 0 ? (
                      job.match.missingSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-rose-100/70 text-rose-800 text-[11px] font-semibold"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-semibold">You possess all required skills!</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Job Description */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">About the Position</h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </div>

            {job.requirements && (
              <div className="pt-6 border-t border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Key Requirements & Qualifications</h2>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {job.requirements}
                </div>
              </div>
            )}

            {/* Required Technical Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Required Technical Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200"
                    >
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Company Info, Job Overview, Recruiter Profile */}
        <aside className="space-y-6">
          {/* Overview summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Job Overview</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Posted Date</span>
                <span className="font-semibold text-slate-800">{formatDate(job.created_at)}</span>
              </li>
              <li className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Application Deadline</span>
                <span className="font-semibold text-slate-800">{job.deadline ? formatDate(job.deadline) : 'Rolling Basis'}</span>
              </li>
              <li className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Vacancies</span>
                <span className="font-semibold text-slate-800">{job.vacancies || 1} Openings</span>
              </li>
              <li className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Qualification</span>
                <span className="font-semibold text-slate-800">{job.qualification || 'Bachelor\'s Degree'}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-500">Total Applicants</span>
                <span className="font-semibold text-blue-600">{job.applicants_count || 0} applied</span>
              </li>
            </ul>

            {isRecruiter ? (
              <div className="mt-4 space-y-2">
                <Link
                  href={`/recruiter/applicants?jobId=${job.id}`}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  id="recruiter-pipeline-sidebar-btn"
                >
                  <Users className="w-4 h-4" />
                  Candidate Pipeline ({job.applicants_count || 0})
                </Link>
                <Link
                  href={`/recruiter/edit-job/${job.id}`}
                  className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  id="recruiter-edit-sidebar-btn"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Job Posting
                </Link>
                <Link
                  href="/recruiter/manage-jobs"
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  Back to Manage Jobs
                </Link>
              </div>
            ) : !job.hasApplied ? (
              <button
                onClick={handleOpenApplyModal}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all mt-4"
                id="apply-sidebar-btn"
              >
                Apply for this Position
              </button>
            ) : null}
          </div>

          {/* Company Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900">About the Employer</h3>
            <div>
              <p className="text-base font-bold text-slate-800">{job.company_name}</p>
              {job.company_industry && (
                <p className="text-xs text-slate-500">{job.company_industry} • {job.company_size || 'Global Enterprise'}</p>
              )}
            </div>

            {job.company_description && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-4">
                {job.company_description}
              </p>
            )}

            {job.recruiter_first_name && (
              <div className="pt-3 border-t border-slate-100 text-xs">
                <p className="text-slate-400 text-[11px] font-semibold">Hiring Lead</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {job.recruiter_first_name} {job.recruiter_last_name}
                </p>
                <p className="text-slate-500 text-[11px]">{job.recruiter_designation || 'Talent Acquisition'}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Apply Modal */}
      {modalAlert && (
        <Alert type={modalAlert.type} message={modalAlert.message} onClose={() => setModalAlert(null)} />
      )}
      {!isRecruiter && isApplyModalOpen && job && (
        <ApplyJobModal
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setModalAlert(null);
          }}
          job={job}
          onSuccess={(res) => {
            const successMsg = res.message || 'Application submitted successfully!';
            setAlert({ type: 'success', message: successMsg });
            setJob((prev) => ({ ...prev, hasApplied: true, applicationStatus: 'Applied' }));
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      )}
    </div>
  );
}
