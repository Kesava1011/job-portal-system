'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Award,
  Layers,
  Sparkles,
  PlusCircle,
  X,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import jobService from '../../../services/jobService';
import Sidebar from '../../../components/Sidebar';
import Alert from '../../../components/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { JOB_TYPES } from '../../../types';

export default function PostJobPage() {
  const { user, isRecruiter, loading: authLoading } = useRoleGuard('recruiter');
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    jobType: 'Full-time',
    experienceLevel: 'Mid Level',
    experienceRequired: 2,
    minSalary: '',
    maxSalary: '',
    qualification: "Bachelor's Degree in Computer Science or related field",
    vacancies: 1,
    deadline: '',
  });

  const [skills, setSkills] = useState(['React', 'Node.js', 'PostgreSQL']);
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (s) => {
    setSkills(skills.filter((item) => item !== s));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.location) {
      setAlert({ type: 'warning', message: 'Title, description, and location are required.' });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const res = await jobService.createJob({
        ...formData,
        skills,
      });

      if (res.success) {
        router.push('/recruiter/manage-jobs');
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to post job.' });
    } finally {
      setLoading(false);
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
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Posting</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Post a Job Opening</h1>
            <p className="text-xs text-slate-500 mt-1">
              Define requirements, technical skills, and compensation to attract qualified candidates
            </p>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                1. Job Details & Role Information
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full-Stack Engineer, Frontend Architect"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Type *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience Level</label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Description *</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Key Requirements & Experience</label>
                <textarea
                  rows={3}
                  placeholder="Degrees, specific software proficiencies, distributed systems experience..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 2. Technical Skills */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                2. Required Technical Skills (Used for AI Match %)
              </h3>
              <p className="text-[11px] text-slate-500">
                Candidates with these skills will receive higher match ratings on their dashboards
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Next.js, PostgreSQL, Docker, AWS"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Add Skill
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="text-emerald-500 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Compensation & Parameters */}
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                3. Qualifications, Vacancies & Compensation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Salary ($ / yr)</label>
                  <input
                    type="number"
                    placeholder="90000"
                    value={formData.minSalary}
                    onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Salary ($ / yr)</label>
                  <input
                    type="number"
                    placeholder="140000"
                    value={formData.maxSalary}
                    onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.experienceRequired}
                    onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vacancies</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.vacancies}
                    onChange={(e) => setFormData({ ...formData, vacancies: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/recruiter/dashboard')}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Publish Job Opening'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
