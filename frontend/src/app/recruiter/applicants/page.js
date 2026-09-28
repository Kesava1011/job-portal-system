'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle,
  FileText,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Phone,
  Mail,
  Edit2,
  Calendar,
  Download,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import api from '../../../lib/api';
import applicationService from '../../../services/applicationService';
import jobService from '../../../services/jobService';
import Sidebar from '../../../components/Sidebar';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import Modal from '../../../components/Modal';
import ResumeViewerModal from '../../../components/ResumeViewerModal';
import { formatDate, getMatchScoreColor } from '../../../lib/utils';
import { APPLICATION_STATUS_LIST } from '../../../types';

function ApplicantsContent() {
  const { user, isRecruiter, isAdmin, loading: authLoading } = useRoleGuard(['recruiter', 'admin']);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewerModalApp, setViewerModalApp] = useState(null);

  // Filters
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('jobId') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'All');
  const [search, setSearch] = useState('');

  // Status Change Modal
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    const urlJobId = searchParams.get('jobId');
    if (urlJobId !== null && urlJobId !== selectedJobId) {
      setSelectedJobId(urlJobId);
    }
    const urlStatus = searchParams.get('status');
    if (urlStatus !== null && urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }
  }, [searchParams]);

  // Fetch recruiter's jobs for filter dropdown
  useEffect(() => {
    if (user && isRecruiter) {
      jobService.getRecruiterJobs()
        .then((res) => {
          if (res.success) {
            setJobs(res.jobs || []);
          }
        })
        .catch(console.error);
    }
  }, [user, isRecruiter]);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const res = await applicationService.getRecruiterApplicants({
        jobId: selectedJobId || undefined,
        status: selectedStatus,
        search,
      });
      if (res.success) {
        setApplicants(res.applicants || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve applicants.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isRecruiter || isAdmin)) {
      fetchApplicants();
    }
  }, [user, isRecruiter, isAdmin, selectedJobId, selectedStatus, search]);

  const handleOpenStatusModal = (app) => {
    setStatusModalApp(app);
    setNewStatus(app.status);
    setStatusNotes(app.notes || '');
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalApp) return;

    setUpdatingStatus(true);
    try {
      const res = await applicationService.updateApplicationStatus(
        statusModalApp.application_id,
        newStatus,
        statusNotes
      );

      if (res.success) {
        setAlert({
          type: 'success',
          message: `Application status for candidate updated to ${newStatus}!`,
        });
        setStatusModalApp(null);
        fetchApplicants();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update application status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewResume = (app) => {
    if (!app.resume_file_url && !app.resume_id) {
      setAlert({
        type: 'error',
        message: `No resume document is available for ${app.first_name || 'this candidate'}.`,
      });
      return;
    }
    setViewerModalApp(app);
  };

  const handleDownloadResume = async (app) => {
    if (!app.resume_file_url && !app.resume_id) {
      setAlert({
        type: 'error',
        message: `No resume document is available for ${app.first_name || 'this candidate'}.`,
      });
      return;
    }

    setDownloadingId(app.application_id);
    try {
      const defaultFilename = `${app.first_name || 'Candidate'}_${app.last_name || ''}_Resume.pdf`.replace(/\s+/g, '_');
      const endpoint = app.resume_id
        ? `/resumes/${app.resume_id}/download`
        : `/applications/${app.application_id}/resume/download`;

      await api.download(endpoint, defaultFilename);
      setAlert({
        type: 'success',
        message: `Resume for ${app.first_name} ${app.last_name} downloaded successfully!`,
      });
    } catch (err) {
      console.error('Failed to download resume:', err);
      setAlert({
        type: 'error',
        message: err.message || `Unable to download resume for ${app.first_name} ${app.last_name}. Please verify the file is available.`,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (authLoading || !user || (!isRecruiter && !isAdmin)) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="recruiter" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Candidate Pipeline</h1>
              <p className="text-xs text-slate-500 mt-1">
                Evaluate applicants, review skill match analysis, and update application lifecycle
              </p>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Filter Controls Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search candidate name or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter by Job */}
            <div className="w-full md:w-56">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Job Postings</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="w-full md:w-44">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="All">All Statuses</option>
                {APPLICATION_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Applicants List */}
          {loading ? (
            <LoadingSpinner text="Loading applicants..." />
          ) : applicants.length === 0 ? (
            <EmptyState
              title="No Candidates Found"
              description="No candidates have applied under the selected criteria."
              icon={Users}
            />
          ) : (
            <div className="space-y-4">
              {applicants.map((app) => (
                <div
                  key={app.application_id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-emerald-300 transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-sm">
                        {app.first_name?.charAt(0) || 'C'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/recruiter/candidate/${app.job_seeker_id}?appId=${app.application_id}&jobId=${app.job_id}`}
                            className="text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                          >
                            {app.first_name} {app.last_name}
                          </Link>
                          {app.match && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getMatchScoreColor(
                                app.match.matchPercentage
                              )}`}
                            >
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              {app.match.matchLabel || `${app.match.matchPercentage}% Match`}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-600 mt-0.5">{app.headline || 'Software Developer'}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" /> {app.candidate_email}
                          </span>
                          {app.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {app.phone}
                            </span>
                          )}
                          {app.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" /> {app.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between gap-2">
                      <ApplicationStatusBadge status={app.status} />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Applied {formatDate(app.applied_at)}
                      </p>
                    </div>
                  </div>

                  {/* Applied for role info */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Position Applied:</span>{' '}
                      <strong className="text-slate-800">{app.job_title}</strong>
                    </div>

                    {app.skills && app.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-slate-400 mr-1">Skills:</span>
                        {app.skills.slice(0, 5).map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cover letter snippet */}
                  {app.cover_letter && (
                    <div className="text-xs text-slate-600 bg-emerald-50/30 p-3 rounded-xl border border-emerald-100">
                      <span className="font-bold text-slate-700">Cover Letter: </span>
                      <span className="italic line-clamp-2">&quot;{app.cover_letter}&quot;</span>
                    </div>
                  )}

                  {/* Notes snippet */}
                  {app.notes && (
                    <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <strong className="font-bold">Recruiter Notes:</strong> {app.notes}
                    </p>
                  )}

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/recruiter/candidate/${app.job_seeker_id}?appId=${app.application_id}&jobId=${app.job_id}`}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Full Candidate Profile
                      </Link>

                      {app.resume_file_url || app.resume_id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewResume(app)}
                            id={`view-resume-${app.application_id}`}
                            className="px-3.5 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                            title="View resume directly in browser"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Resume
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadResume(app)}
                            disabled={downloadingId === app.application_id}
                            id={`download-resume-${app.application_id}`}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-100 font-semibold rounded-xl flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-wait text-[11px]"
                            title="Download Resume offline copy"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                              {downloadingId === app.application_id ? 'Downloading...' : 'Download Resume'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span
                          id={`resume-not-available-${app.application_id}`}
                          className="px-3.5 py-1.5 bg-slate-50 text-slate-400 font-medium rounded-xl flex items-center gap-1.5 border border-slate-200 cursor-not-allowed text-[11px] select-none"
                          title="No resume document was attached or uploaded by this candidate"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" /> Resume not available
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenStatusModal(app)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Change Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Change Status Modal */}
      <Modal
        isOpen={Boolean(statusModalApp)}
        onClose={() => setStatusModalApp(null)}
        title={`Update Status: ${statusModalApp?.first_name} ${statusModalApp?.last_name}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Lifecycle Status *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
            >
              {APPLICATION_STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Recruiter Feedback / Screening Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Completed initial technical screening. Scheduled final round with Engineering Manager on Friday..."
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStatusModalApp(null)}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStatus}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm disabled:opacity-50"
            >
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Candidate Resume Viewer Modal */}
      {viewerModalApp && (
        <ResumeViewerModal
          isOpen={!!viewerModalApp}
          onClose={() => setViewerModalApp(null)}
          applicationId={viewerModalApp.application_id}
          resumeId={viewerModalApp.resume_id}
          candidateName={`${viewerModalApp.first_name || ''} ${viewerModalApp.last_name || ''}`.trim() || 'Candidate'}
          jobTitle={viewerModalApp.job_title}
          defaultFilename={`${viewerModalApp.first_name || 'Candidate'}_Resume.pdf`}
        />
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading applicants page..." />}>
      <ApplicantsContent />
    </Suspense>
  );
}
