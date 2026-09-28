'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Globe,
  Users,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Clock,
  Sparkles,
  Mail,
  Award,
  CheckCircle,
} from 'lucide-react';
import companyService from '../../../services/companyService';
import applicationService from '../../../services/applicationService';
import userService from '../../../services/userService';
import { formatSalary, formatDate, formatTimeAgo } from '../../../lib/utils';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';
import Modal from '../../../components/Modal';
import ApplyJobModal from '../../../components/ApplyJobModal';
import { useAuth } from '../../../hooks/useAuth';

export default function CompanyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isSeeker, isRecruiter } = useAuth();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [modalAlert, setModalAlert] = useState(null);

  // Quick Apply Modal states
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      companyService.getCompanyById(id)
        .then((res) => {
          if (res.success && res.company) {
            setCompany(res.company);
          } else {
            setCompany(null);
          }
        })
        .catch((err) => {
          console.error('Failed to load company profile:', err);
          setAlert({ type: 'error', message: 'Unable to load company profile.' });
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleOpenApplyModal = async (job) => {
    if (!user) {
      router.push(`/login?redirect=/companies/${id}`);
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
    setSelectedJob(job);
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
    if (!selectedJob) return;

    setModalAlert(null);
    setSubmittingApp(true);
    try {
      const parsedResumeId = selectedResumeId ? parseInt(selectedResumeId, 10) : null;
      const res = await applicationService.applyForJob({
        jobId: selectedJob.id,
        resumeId: !isNaN(parsedResumeId) ? parsedResumeId : null,
        coverLetter: coverLetter ? coverLetter.trim() : '',
      });

      if (res.success) {
        const successMsg = res.message || `Application for "${selectedJob.title}" submitted successfully!`;
        setModalAlert({ type: 'success', message: successMsg });
        setAlert({ type: 'success', message: successMsg });
        setTimeout(() => {
          setIsApplyModalOpen(false);
          setModalAlert(null);
          setCoverLetter('');
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
      <div className="min-h-screen py-16">
        <LoadingSpinner text="Loading company profile and open opportunities..." />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Company Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested company profile could not be found or may have been deactivated.
        </p>
        <Link
          href="/companies"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          Back to Companies Directory
        </Link>
      </div>
    );
  }

  const jobs = company.jobs || [];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div>
          <Link
            href="/companies"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Companies Directory
          </Link>
        </div>

        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {/* Company Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-lg flex-shrink-0">
                  {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {company.name}
                  </h1>
                  {company.industry && (
                    <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                      {company.industry}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                  {company.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {company.location}
                    </span>
                  )}
                  {company.company_size && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {company.company_size}
                    </span>
                  )}
                  {company.founded_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Est. {company.founded_year}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="w-4 h-4 text-slate-500" />
                  Website <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
              <a
                href="#open-jobs"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                View {jobs.length} Open {jobs.length === 1 ? 'Job' : 'Jobs'}
              </a>
            </div>
          </div>
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: About & Company Info */}
          <div className="space-y-6">
            {/* About Company */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                About {company.name}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {company.description || 'No detailed company description provided yet.'}
              </p>
            </div>

            {/* Company Overview Details Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Company Overview</h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Industry
                  </span>
                  <strong className="text-slate-800 font-semibold">{company.industry || 'Not specified'}</strong>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Headquarters
                  </span>
                  <strong className="text-slate-800 font-semibold">{company.location || 'Remote'}</strong>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> Company Size
                  </span>
                  <strong className="text-slate-800 font-semibold">{company.company_size || 'Startup'}</strong>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Founded Year
                  </span>
                  <strong className="text-slate-800 font-semibold">{company.founded_year || 'N/A'}</strong>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Open Positions
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                    {jobs.length} Active
                  </span>
                </div>
              </div>
            </div>

            {/* Hiring Team / Recruiters */}
            {company.recruiters && company.recruiters.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Talent Acquisition Team
                </h3>
                <div className="space-y-3">
                  {company.recruiters.map((rec) => (
                    <div key={rec.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {rec.first_name ? rec.first_name.charAt(0) : 'R'}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <h4 className="font-bold text-slate-900 truncate">
                          {rec.first_name} {rec.last_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{rec.designation || 'Hiring Partner'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Currently Open Jobs */}
          <div id="open-jobs" className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Open Positions at {company.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore active job vacancies and submit your application directly.
                </p>
              </div>

              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                {jobs.length} Available
              </span>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Open Vacancies Currently</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {company.name} does not have any active job postings right now. Check back later or explore other companies.
                </p>
                <Link
                  href="/jobs"
                  className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Explore Other Jobs
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="group bg-white rounded-3xl border border-slate-200 hover:border-blue-400 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <Link href={`/jobs/${job.id}`}>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-xs text-slate-500">
                          {job.job_type && (
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              {job.job_type}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {job.location}
                            </span>
                          )}
                          {job.experience_required && (
                            <span>{job.experience_required}+ yrs exp</span>
                          )}
                          {(job.min_salary || job.max_salary) && (
                            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                              <DollarSign className="w-3.5 h-3.5" />
                              {formatSalary(job.min_salary, job.max_salary)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(job.created_at)}
                      </div>
                    </div>

                    {/* Job Description preview */}
                    {job.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    )}

                    {/* Skills pills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500">
                        {job.applicants_count ? `${job.applicants_count} applicants` : 'Be the first to apply'}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                        >
                          View Details <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        {!isRecruiter && (
                          <button
                            onClick={() => handleOpenApplyModal(job)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                            id={`quick-apply-btn-${job.id}`}
                          >
                            Quick Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Apply Modal */}
      {modalAlert && (
        <Alert type={modalAlert.type} message={modalAlert.message} onClose={() => setModalAlert(null)} />
      )}
      {!isRecruiter && selectedJob && isApplyModalOpen && (
        <ApplyJobModal
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setModalAlert(null);
          }}
          job={selectedJob}
          onSuccess={(res) => {
            const successMsg = res.message || `Application for "${selectedJob.title}" submitted successfully!`;
            setAlert({ type: 'success', message: successMsg });
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      )}
    </div>
  );
}
