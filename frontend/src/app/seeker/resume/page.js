'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  CheckCircle,
  Download,
  Trash2,
  Plus,
  Sparkles,
  Eye,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import Modal from '../../../components/Modal';
import { formatDate } from '../../../lib/utils';

export default function SeekerResumePage() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const router = useRouter();

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);

  // Upload modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // Preview modal
  const [previewResume, setPreviewResume] = useState(null);

  const fetchResumes = async () => {
    try {
      const res = await userService.getResumes();
      if (res.success) {
        setResumes(res.resumes || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve resumes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isSeeker) {
      fetchResumes();
    }
  }, [user, isSeeker]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setAlert({ type: 'warning', message: 'Please choose a resume file to upload.' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', uploadFile);
      if (uploadTitle) formData.append('title', uploadTitle);

      const res = await userService.uploadResume(formData);
      if (res.success) {
        setAlert({ type: 'success', message: 'Resume uploaded successfully!' });
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        fetchResumes();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to upload resume file.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await userService.setDefaultResume(id);
      if (res.success) {
        setAlert({ type: 'success', message: 'Default application resume updated.' });
        fetchResumes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      const res = await userService.deleteResume(id);
      if (res.success) {
        setAlert({ type: 'success', message: 'Resume deleted.' });
        setResumes((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadResume = async (resume) => {
    setDownloadingResumeId(resume.id);
    try {
      const defaultFilename = (resume.title || 'My_Resume.pdf').replace(/\s+/g, '_');
      await userService.downloadResume(resume.id, defaultFilename);
      setAlert({ type: 'success', message: `Resume "${resume.title || 'Resume'}" downloaded successfully!` });
    } catch (err) {
      console.error('Download error:', err);
      setAlert({ type: 'error', message: err.message || 'Failed to download resume.' });
    } finally {
      setDownloadingResumeId(null);
    }
  };

  if (authLoading || !user || !isSeeker) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="job_seeker" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Manage Resumes</h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload existing documents or craft custom resumes with the Resume Builder
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <Link
                href="/seeker/resume-builder"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Open Resume Builder
              </Link>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {loading ? (
            <LoadingSpinner text="Loading your resumes..." />
          ) : resumes.length === 0 ? (
            <EmptyState
              title="No Resumes Saved Yet"
              description="Upload a PDF/DOC resume or generate one using our structured Resume Builder."
              actionText="Create with Resume Builder"
              icon={FileText}
              onAction={() => router.push('/seeker/resume-builder')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between ${
                    resume.is_default ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{resume.title}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Added {formatDate(resume.created_at)}</p>
                        </div>
                      </div>

                      {resume.is_default ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(resume.id)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-blue-600"
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    {resume.parsed_data?.careerObjective && (
                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 italic">
                        &quot;{resume.parsed_data.careerObjective}&quot;
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {resume.file_url || resume.resume_data ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadResume(resume)}
                          disabled={downloadingResumeId === resume.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" /> {downloadingResumeId === resume.id ? 'Downloading...' : 'Download'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setPreviewResume(resume)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View JSON
                        </button>
                      )}

                      {resume.resume_data && (
                        <Link
                          href="/seeker/resume-builder"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Edit Builder
                        </Link>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Upload File Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Resume File">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resume Title</label>
            <input
              type="text"
              placeholder="e.g. Alex_Johnson_FullStack_2026.pdf"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Choose File (PDF, DOC, DOCX) *</label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview JSON Modal */}
      <Modal
        isOpen={Boolean(previewResume)}
        onClose={() => setPreviewResume(null)}
        title={previewResume?.title || 'Resume Details'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3 text-xs">
          <p className="font-bold text-slate-700">Career Objective:</p>
          <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
            {previewResume?.parsed_data?.careerObjective || 'No objective specified'}
          </p>

          <p className="font-bold text-slate-700 mt-2">Languages:</p>
          <div className="flex flex-wrap gap-1">
            {previewResume?.parsed_data?.languages?.map((l, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                {l}
              </span>
            ))}
          </div>

          <p className="font-bold text-slate-700 mt-2">Achievements:</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600">
            {previewResume?.parsed_data?.achievements?.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
