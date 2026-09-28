'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Trash2,
  Building,
  MapPin,
  Briefcase,
} from 'lucide-react';
import Modal from './Modal';
import Alert from './Alert';
import LoadingSpinner from './LoadingSpinner';
import userService from '../services/userService';
import applicationService from '../services/applicationService';

export default function ApplyJobModal({ isOpen, onClose, job, onSuccess }) {
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [resumeMode, setResumeMode] = useState('saved'); // 'saved' | 'upload'
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  // Maximum file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];

  useEffect(() => {
    if (!isOpen) {
      setAlert(null);
      setUploadedFile(null);
      setCoverLetter('');
      setSubmitting(false);
      return;
    }

    let isMounted = true;
    async function fetchUserResumes() {
      setLoadingResumes(true);
      try {
        const res = await userService.getResumes();
        if (!isMounted) return;
        if (res.success && Array.isArray(res.resumes)) {
          setResumes(res.resumes);
          if (res.resumes.length > 0) {
            const def = res.resumes.find((r) => r.is_default);
            setSelectedResumeId(def ? String(def.id) : String(res.resumes[0].id));
            setResumeMode('saved');
          } else {
            setSelectedResumeId('');
            setResumeMode('upload');
          }
        } else {
          setResumeMode('upload');
        }
      } catch (err) {
        console.error('Failed to load user resumes:', err);
        if (isMounted) setResumeMode('upload');
      } finally {
        if (isMounted) setLoadingResumes(false);
      }
    }

    fetchUserResumes();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setAlert({
        type: 'error',
        message: 'Invalid file format. Only PDF, DOC, and DOCX files are supported.',
      });
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setAlert({
        type: 'error',
        message: 'File size exceeds the 10MB limit. Please upload a smaller resume file.',
      });
      e.target.value = '';
      return;
    }

    setAlert(null);
    setUploadedFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!job || !job.id) {
      setAlert({ type: 'error', message: 'Job posting information is missing. Please refresh.' });
      return;
    }

    // Validation: Require either saved resume or newly uploaded resume
    if (resumeMode === 'saved') {
      if (!selectedResumeId || resumes.length === 0) {
        setAlert({
          type: 'error',
          message: 'Please select an existing saved resume or switch to upload a new resume file.',
        });
        return;
      }
    } else if (resumeMode === 'upload') {
      if (!uploadedFile) {
        setAlert({
          type: 'error',
          message: 'Please upload a resume file (PDF, DOC, or DOCX) to apply.',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      let res;
      if (resumeMode === 'upload' && uploadedFile) {
        // Send multipart form-data
        const formData = new FormData();
        formData.append('jobId', String(job.id));
        formData.append('coverLetter', coverLetter ? coverLetter.trim() : '');
        formData.append('resume', uploadedFile);
        formData.append('requireResume', 'true');
        res = await applicationService.applyForJob(formData);
      } else {
        // Send JSON with existing resumeId
        res = await applicationService.applyForJob({
          jobId: job.id,
          resumeId: parseInt(selectedResumeId, 10),
          coverLetter: coverLetter ? coverLetter.trim() : '',
          requireResume: true,
        });
      }

      if (res.success) {
        const successMsg = res.message || 'Application submitted successfully!';
        setAlert({ type: 'success', message: successMsg });
        if (onSuccess) {
          onSuccess(res);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to submit application.' });
      }
    } catch (err) {
      console.error('Application submit error:', err);
      const errMsg = err.message || err.data?.message || 'Failed to submit application. Please try again.';
      setAlert({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Apply for ${job?.title || 'Position'}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        {/* Job Summary Banner */}
        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-center justify-between">
          <div>
            <p className="font-bold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              {job?.company_name || 'Hiring Company'}
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job?.location || 'Location'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> {job?.job_type || 'Full-time'}
              </span>
            </p>
          </div>
        </div>

        {/* Resume Mode Switcher */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Resume Selection</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setResumeMode('saved');
                setAlert(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                resumeMode === 'saved'
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  resumeMode === 'saved' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}
              >
                {resumeMode === 'saved' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Saved Resume</p>
                <p className="text-[11px] text-slate-500">Choose from your profile</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setResumeMode('upload');
                setAlert(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                resumeMode === 'upload'
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  resumeMode === 'upload' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                }`}
              >
                {resumeMode === 'upload' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Upload New</p>
                <p className="text-[11px] text-slate-500">PDF, DOC, or DOCX</p>
              </div>
            </button>
          </div>
        </div>

        {/* Saved Resume Dropdown */}
        {resumeMode === 'saved' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            {loadingResumes ? (
              <div className="py-4 text-center">
                <LoadingSpinner text="Loading your resumes..." />
              </div>
            ) : resumes.length === 0 ? (
              <div className="p-3.5 border border-dashed border-amber-300 bg-amber-50 rounded-2xl text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> No saved resumes found in your profile.
                </p>
                <p className="text-[11px] text-amber-700">
                  Please select &quot;Upload New&quot; above to attach a resume for this job application.
                </p>
              </div>
            ) : (
              <div>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                  id="saved-resume-select"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} {r.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selected resume will be shared with the recruiter for this application.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload New Resume Field */}
        {resumeMode === 'upload' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            {!uploadedFile ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
                <div className="p-2.5 bg-white group-hover:bg-blue-100 rounded-xl border border-slate-200 shadow-sm text-slate-500 group-hover:text-blue-600 mb-2 transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  Click to browse or drag & drop resume
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supported formats: PDF, DOC, DOCX (Max: 10MB)
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                  id="application-resume-file-input"
                />
              </label>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate" id="selected-resume-filename">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatFileSize(uploadedFile.size)} • Ready to submit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                  title="Remove selected file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cover Letter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Cover Letter / Personal Note (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Highlight your relevant experience, technical proficiencies, and reasons for applying..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            id="cover-letter-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            id="submit-application-btn"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? 'Submitting Application...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
