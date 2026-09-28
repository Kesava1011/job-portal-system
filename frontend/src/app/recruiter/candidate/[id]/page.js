'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Globe,
  Award,
  BookOpen,
  Code,
  FileText,
  Download,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Edit2,
  Calendar,
  Sparkles,
  Building,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { useRoleGuard } from '../../../../hooks/useRoleGuard';
import api from '../../../../lib/api';
import applicationService from '../../../../services/applicationService';
import Sidebar from '../../../../components/Sidebar';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Alert from '../../../../components/Alert';
import ResumeViewerModal from '../../../../components/ResumeViewerModal';
import ApplicationStatusBadge from '../../../../components/ApplicationStatusBadge';
import { formatSalary, formatDate, getMatchScoreColor } from '../../../../lib/utils';
import { APPLICATION_STATUS_LIST } from '../../../../types';

function CandidateDetailContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isRecruiter, isAdmin, loading: authLoading } = useRoleGuard(['recruiter', 'admin']);

  const appId = searchParams.get('appId');
  const jobId = searchParams.get('jobId');

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Status update
  const [currentStatus, setCurrentStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!user || (!isRecruiter && !isAdmin) || !id) {
      return;
    }

    setLoading(true);
    // Fetch comprehensive candidate dossier via dedicated endpoint
    applicationService.getCandidateDetail(id, { appId, jobId })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.candidate) {
          setCandidate(res.candidate);
          setCurrentStatus(res.candidate.status || 'Applied');
          setStatusNotes(res.candidate.notes || '');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Dedicated candidate detail failed, falling back to applicants list:', err);
        // Fallback to applicant list
        applicationService.getRecruiterApplicants({ search: '' })
          .then((res) => {
            if (!isMounted) return;
            if (res.success && res.applicants) {
              const found = res.applicants.find(
                (a) => (appId && String(a.application_id) === String(appId)) || String(a.job_seeker_id) === String(id)
              );
              if (found) {
                setCandidate(found);
                setCurrentStatus(found.status || 'Applied');
                setStatusNotes(found.notes || '');
              }
            }
          })
          .catch((e) => {
            if (isMounted) console.error(e);
          });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, appId, jobId, user, isRecruiter, isAdmin]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    const targetAppId = appId || candidate?.application_id || candidate?.application?.application_id;
    if (!targetAppId) {
      setAlert({ type: 'error', message: 'No associated application ID found to update status.' });
      return;
    }

    setUpdating(true);
    try {
      const res = await applicationService.updateApplicationStatus(targetAppId, currentStatus, statusNotes);
      if (res.success) {
        setCandidate((prev) => ({
          ...prev,
          status: currentStatus,
          notes: statusNotes,
          application: prev.application ? { ...prev.application, status: currentStatus, notes: statusNotes } : prev.application,
        }));
        setAlert({ type: 'success', message: `Candidate application status updated to "${currentStatus}".` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update status.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!candidate) return;
    setDownloadingResume(true);
    try {
      const resumeId =
        candidate.resume_id ||
        candidate.application?.resume_id ||
        candidate.resumes?.find((r) => (r.file_url && r.file_url.trim() !== '') || r.resume_data)?.id;

      const endpoint = resumeId
        ? `/resumes/${resumeId}/download`
        : (appId || candidate.application_id)
        ? `/applications/${appId || candidate.application_id}/resume/download`
        : null;

      if (!endpoint) {
        throw new Error('No resume record found for this candidate.');
      }

      const defaultFilename = `${candidate.first_name || 'Candidate'}_${candidate.last_name || ''}_Resume.pdf`.replace(/\s+/g, '_');
      await api.download(endpoint, defaultFilename);
      setAlert({
        type: 'success',
        message: `Resume for ${candidate.first_name} ${candidate.last_name} downloaded successfully!`,
      });
    } catch (err) {
      console.error('Failed to download resume:', err);
      setAlert({
        type: 'error',
        message: err.message || `Unable to download resume for ${candidate.first_name} ${candidate.last_name}. Please verify the file is available.`,
      });
    } finally {
      setDownloadingResume(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner text="Loading candidate dossier..." />;
  }

  if (!candidate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Candidate Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">Could not find records for candidate ID #{id}.</p>
        <Link href="/recruiter/applicants" className="mt-4 inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
          Back to Applicants
        </Link>
      </div>
    );
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const targetAppId = appId || candidate?.application_id || candidate?.application?.application_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/recruiter/applicants"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applicant Pipeline
        </Link>

        {candidate.job_title && (
          <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400">Application for:</span>
            <strong className="font-bold text-slate-900">{candidate.job_title}</strong>
          </div>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Candidate Overview, Contacts & Status Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                {candidate.first_name?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-black text-slate-900 truncate">
                  {candidate.first_name} {candidate.last_name}
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-2">
                  {candidate.headline || 'Job Applicant'}
                </p>
                <div className="mt-2.5">
                  <ApplicationStatusBadge status={candidate.status || 'Applied'} />
                </div>
              </div>
            </div>

            {/* Candidate Metadata */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{candidate.candidate_email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{candidate.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Experience: {candidate.experience_years || 0} years</span>
              </div>
              {candidate.expected_salary && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Expected: ${candidate.expected_salary.toLocaleString()} / yr</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(candidate.github_url || candidate.linkedin_url || candidate.portfolio_url) && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                {candidate.github_url && (
                  <a
                    href={candidate.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1"
                  >
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold flex items-center gap-1"
                  >
                    LinkedIn <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {candidate.portfolio_url && (
                  <a
                    href={candidate.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-semibold flex items-center gap-1"
                  >
                    Portfolio <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Resume Download / Missing State */}
            {(() => {
              const fileUrl =
                candidate.resume_file_url ||
                candidate.resume_id ||
                candidate.resumes?.find((r) => r.file_url && typeof r.file_url === 'string' && r.file_url.trim() !== '')?.file_url ||
                candidate.resumes?.some((r) => r.resume_data) ||
                null;

              if (fileUrl) {
                return (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsViewerOpen(true)}
                      id="view-resume-btn"
                      className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-blue-200"
                    >
                      <Eye className="w-4 h-4" />
                      View Submitted Resume
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadResume}
                      disabled={downloadingResume}
                      id="download-resume-btn"
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {downloadingResume ? 'Downloading...' : 'Download Submitted Resume'}
                    </button>
                  </div>
                );
              }

              return (
                <div className="pt-3 border-t border-slate-100">
                  <div
                    id="resume-not-available"
                    className="w-full py-2.5 bg-slate-50 text-slate-400 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-not-allowed select-none"
                    title="No resume document was attached or uploaded by this candidate"
                  >
                    <FileText className="w-4 h-4 text-slate-400" /> Resume not available
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Update Application Status Form */}
          {targetAppId && (
            <form onSubmit={handleUpdateStatus} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                Update Application Status
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lifecycle Status *</label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  {APPLICATION_STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recruiter Feedback / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes on screening performance, scheduled interviews, feedback..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Save Status Update'}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: AI Match, Cover Letter, Bio, Experience, Education, Projects, Certs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Match Score & Compatibility Card */}
          {candidate.match && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl border border-emerald-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">AI Candidate Skill Compatibility</h3>
                    <p className="text-xs text-slate-500">Based on required job skills and applicant profile</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border ${getMatchScoreColor(
                      candidate.match.matchPercentage
                    )}`}
                  >
                    {candidate.match.matchPercentage}% Compatibility ({candidate.match.matchLabel})
                  </span>
                </div>
              </div>

              {/* Skills Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                {candidate.match.matchingSkills && candidate.match.matchingSkills.length > 0 && (
                  <div className="bg-white/80 p-3.5 rounded-2xl border border-emerald-200/60">
                    <h4 className="font-bold text-emerald-800 flex items-center gap-1 mb-2">
                      <Check className="w-4 h-4 text-emerald-600" /> Matching Required Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.match.matchingSkills.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {candidate.match.missingSkills && candidate.match.missingSkills.length > 0 && (
                  <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-200/60">
                    <h4 className="font-bold text-amber-800 flex items-center gap-1 mb-2">
                      <X className="w-4 h-4 text-amber-600" /> Missing / Unlisted Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.match.missingSkills.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cover Letter */}
          {candidate.cover_letter && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Applicant Cover Letter
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {candidate.cover_letter}
              </p>
            </div>
          )}

          {/* Candidate Bio */}
          {candidate.bio && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                Candidate Biography & Career Objective
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{candidate.bio}</p>
            </div>
          )}

          {/* Work Experience */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              Work Experience ({candidate.experience?.length || 0})
            </h3>
            {candidate.experience && candidate.experience.length > 0 ? (
              <div className="space-y-4 divide-y divide-slate-100">
                {candidate.experience.map((exp, idx) => (
                  <div key={exp.id || idx} className={idx > 0 ? 'pt-4 space-y-1.5' : 'space-y-1.5'}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-black text-slate-900">{exp.title}</h4>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(exp.start_date)} — {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {exp.company_name}
                      </span>
                      {exp.location && <span>• {exp.location}</span>}
                    </div>
                    {exp.description && (
                      <p className="text-xs text-slate-500 leading-relaxed pt-1 whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No formal work experience records added.</p>
            )}
          </div>

          {/* Education */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Education History ({candidate.education?.length || 0})
            </h3>
            {candidate.education && candidate.education.length > 0 ? (
              <div className="space-y-4 divide-y divide-slate-100">
                {candidate.education.map((edu, idx) => (
                  <div key={edu.id || idx} className={idx > 0 ? 'pt-4 space-y-1.5' : 'space-y-1.5'}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-black text-slate-900">
                        {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {edu.start_year} — {edu.end_year || 'Present'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">{edu.institution}</div>
                    {edu.grade && <div className="text-[11px] text-slate-500">Grade / GPA: {edu.grade}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No education records provided.</p>
            )}
          </div>

          {/* Technical Skills Profile */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-600" />
              Skills & Proficiencies ({candidate.skills?.length || 0})
            </h3>
            {candidate.user_skills && candidate.user_skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {candidate.user_skills.map((us, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{us.name}</span>
                    <div className="flex items-center gap-2">
                      {us.years_of_experience && (
                        <span className="text-[11px] text-slate-500">{us.years_of_experience} yrs</span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                        {us.proficiency_level || 'Proficient'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : candidate.skills && candidate.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No skills listed.</p>
            )}
          </div>

          {/* Technical Projects */}
          {candidate.projects && candidate.projects.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                Featured Projects ({candidate.projects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.projects.map((proj, idx) => (
                  <div key={proj.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-black text-slate-900">{proj.title}</h4>
                    {proj.description && (
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{proj.description}</p>
                    )}
                    {proj.technologies && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.technologies.split(',').map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 text-[10px] rounded font-medium">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {(proj.project_url || proj.github_url) && (
                      <div className="flex items-center gap-3 pt-2 text-xs">
                        {proj.project_url && (
                          <a href={proj.project_url} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                            Live Demo <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {proj.github_url && (
                          <a href={proj.github_url} target="_blank" rel="noreferrer" className="text-slate-600 font-semibold hover:underline flex items-center gap-1">
                            GitHub <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {candidate.certifications && candidate.certifications.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Certifications & Credentials ({candidate.certifications.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.certifications.map((cert, idx) => (
                  <div key={cert.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <h4 className="text-xs font-black text-slate-900">{cert.name}</h4>
                    <div className="text-xs font-semibold text-amber-800">{cert.issuing_organization}</div>
                    {cert.issue_date && (
                      <div className="text-[11px] text-slate-500">
                        Issued: {formatDate(cert.issue_date)} {cert.expiration_date ? `• Expires: ${formatDate(cert.expiration_date)}` : ''}
                      </div>
                    )}
                    {cert.credential_url && (
                      <a href={cert.credential_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline pt-1">
                        Verify Credential <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resume Viewer Modal */}
      {isViewerOpen && candidate && (
        <ResumeViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          applicationId={appId || candidate.application_id || candidate.application?.application_id}
          resumeId={candidate.resume_id || candidate.application?.resume_id}
          candidateName={`${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Candidate'}
          jobTitle={candidate.job_title || candidate.application?.job_title}
          defaultFilename={`${candidate.first_name || 'Candidate'}_Resume.pdf`}
        />
      )}
    </div>
  );
}

export default function CandidateDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading candidate..." />}>
      <CandidateDetailContent />
    </Suspense>
  );
}
