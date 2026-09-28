'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  Award,
  Sparkles,
  Save,
  ArrowLeft,
  X,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { useRoleGuard } from '../../../../hooks/useRoleGuard';
import jobService from '../../../../services/jobService';
import Sidebar from '../../../../components/Sidebar';
import Alert from '../../../../components/Alert';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { JOB_TYPES } from '../../../../types';

export default function EditJobPage() {
  const { user, isRecruiter, loading: authLoading } = useRoleGuard('recruiter');
  const { id } = useParams();
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    location: '',
    jobType: 'Full-time',
    experienceLevel: 'Mid Level',
    experienceRequired: 2,
    minSalary: '',
    maxSalary: '',
    qualification: '',
    vacancies: 1,
    deadline: '',
    status: 'active',
  });

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!id || !user || !isRecruiter) return;

    async function loadJobData() {
      try {
        const res = await jobService.getJobById(id);
        if (!isMounted) return;
        if (res.success && res.job) {
          const j = res.job;

          // Enforce ownership: only the job's creator or admin may edit
          if (
            user &&
            user.role !== 'admin' &&
            user.recruiter_id &&
            j.recruiter_id &&
            j.recruiter_id !== user.recruiter_id
          ) {
            setIsUnauthorized(true);
            setAlert({
              type: 'error',
              message: 'Forbidden: You do not have permission to edit this job posting.',
            });
            setInitialLoading(false);
            return;
          }

          setFormData({
            title: j.title || '',
            company: j.company_name || '',
            description: j.description || '',
            requirements: j.requirements || '',
            location: j.location || '',
            jobType: j.job_type || 'Full-time',
            experienceLevel: j.experience_level || 'Mid Level',
            experienceRequired: j.experience_required ?? 0,
            minSalary: j.min_salary ?? '',
            maxSalary: j.max_salary ?? '',
            qualification: j.qualification || '',
            vacancies: j.vacancies ?? 1,
            deadline: j.deadline ? j.deadline.split('T')[0] : '',
            status: j.status || 'active',
          });

          if (Array.isArray(j.skills)) {
            setSkills(j.skills.map((s) => (typeof s === 'string' ? s : s.name)));
          }
        } else {
          setAlert({ type: 'error', message: 'Job posting not found.' });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching job details for edit:', err);
        setAlert({
          type: 'error',
          message: err.message || 'Failed to retrieve job details.',
        });
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadJobData();

    return () => {
      isMounted = false;
    };
  }, [id, user, isRecruiter]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter((item) => item !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title?.trim() || !formData.description?.trim() || !formData.location?.trim()) {
      setAlert({
        type: 'warning',
        message: 'Job title, description, and location are required.',
      });
      return;
    }

    if (formData.minSalary && formData.maxSalary) {
      if (parseFloat(formData.minSalary) > parseFloat(formData.maxSalary)) {
        setAlert({
          type: 'warning',
          message: 'Minimum salary cannot be greater than maximum salary.',
        });
        return;
      }
    }

    setSaving(true);
    setAlert(null);

    try {
      const payload = {
        title: formData.title.trim(),
        company: formData.company?.trim() || undefined,
        description: formData.description.trim(),
        requirements: formData.requirements?.trim() || '',
        location: formData.location.trim(),
        jobType: formData.jobType,
        experienceLevel: formData.experienceLevel,
        experienceRequired: formData.experienceRequired,
        minSalary: formData.minSalary,
        maxSalary: formData.maxSalary,
        qualification: formData.qualification?.trim() || '',
        vacancies: formData.vacancies,
        deadline: formData.deadline || null,
        status: formData.status,
        skills,
      };

      const res = await jobService.updateJob(id, payload);

      if (res.success) {
        // Store flash message in sessionStorage so Manage Jobs page can display it immediately
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            'manage_jobs_alert',
            JSON.stringify({
              type: 'success',
              message: `Job "${formData.title}" updated successfully!`,
            })
          );
        }
        router.push('/recruiter/manage-jobs');
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to update job.' });
      }
    } catch (err) {
      console.error('Failed to update job:', err);
      setAlert({ type: 'error', message: err.message || 'Failed to update job posting.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || !isRecruiter) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="recruiter" />

        <main className="flex-1 space-y-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/recruiter/manage-jobs"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Manage Jobs
            </Link>

            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                formData.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Status: {formData.status}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Edit Job Posting</h1>
            <p className="text-xs text-slate-500 mt-1">
              Update role details, company, compensation, and technical skills for this job listing.
            </p>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {initialLoading ? (
            <LoadingSpinner text="Loading job details..." />
          ) : isUnauthorized ? (
            <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Access Denied</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You do not have permission to modify this job posting. Only the recruiter who created this posting can edit it.
              </p>
              <Link
                href="/recruiter/manage-jobs"
                className="inline-block px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Return to My Jobs
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
            >
              {/* Section 1: Role Information */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                  1. Job Details & Role Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Full-Stack Engineer"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Company *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Google Cloud, Stripe, Acme Corp"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mountain View, CA or Remote"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Job Type *
                    </label>
                    <select
                      value={formData.jobType}
                      onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Experience Level
                    </label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceLevel: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Entry Level">Entry Level</option>
                      <option value="Mid Level">Mid Level</option>
                      <option value="Senior Level">Senior Level</option>
                      <option value="Lead / Principal">Lead / Principal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Outline core responsibilities, day-to-day work, engineering team goals..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Key Requirements & Experience
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Degrees, specific software proficiencies, distributed systems experience..."
                    value={formData.requirements}
                    onChange={(e) =>
                      setFormData({ ...formData, requirements: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section 2: Technical Skills */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  2. Required Technical Skills (Used for AI Match %)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Specify keywords and competencies used to calculate candidate match ratings.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Next.js, PostgreSQL, Docker, AWS"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Add Skill
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {skills.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No skills specified yet.</span>
                  ) : (
                    skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(s)}
                          className="text-emerald-500 hover:text-rose-600 transition-colors"
                          title={`Remove ${s}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Section 3: Compensation & Parameters */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">
                  3. Compensation, Vacancies, Deadline & Lifecycle
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Min Salary ($ / yr)
                    </label>
                    <input
                      type="number"
                      placeholder="90000"
                      value={formData.minSalary}
                      onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Salary ($ / yr)
                    </label>
                    <input
                      type="number"
                      placeholder="140000"
                      value={formData.maxSalary}
                      onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.experienceRequired}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceRequired: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vacancies
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.vacancies}
                      onChange={(e) => setFormData({ ...formData, vacancies: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Minimum Qualification
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bachelor's in CS"
                      value={formData.qualification}
                      onChange={(e) =>
                        setFormData({ ...formData, qualification: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Application Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Posting Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="active">Active (Visible publicly)</option>
                      <option value="closed">Closed (No new applicants)</option>
                      <option value="draft">Draft (Private)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/recruiter/manage-jobs')}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  id="update-job-button"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Changes...' : 'Update Job'}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
