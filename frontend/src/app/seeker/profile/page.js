'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Plus,
  Trash2,
  Save,
  Globe,
  Award,
  BookOpen,
  Code,
  ExternalLink,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import { useAuth } from '../../../hooks/useAuth';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import Modal from '../../../components/Modal';
import Alert from '../../../components/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function SeekerProfilePage() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const { refreshUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Form states for basic profile
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    headline: '',
    bio: '',
    location: '',
    experienceYears: 0,
    currentSalary: '',
    expectedSalary: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });

  // Modal states for sub-items
  const [activeModal, setActiveModal] = useState(null); // 'skill', 'education', 'experience', 'project', 'certification'

  // Modal form data
  const [newSkill, setNewSkill] = useState({ skillName: '', proficiencyLevel: 'Intermediate', yearsOfExperience: 1 });
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '' });
  const [newExp, setNewExp] = useState({ companyName: '', title: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' });
  const [newProj, setNewProj] = useState({ title: '', description: '', techStack: '', liveUrl: '', repoUrl: '' });
  const [newCert, setNewCert] = useState({ name: '', issuingOrganization: '', issueDate: '', expirationDate: '', credentialId: '', credentialUrl: '' });

  const fetchProfile = async () => {
    try {
      const res = await userService.getProfile();
      if (res.success && res.profile) {
        setProfile(res.profile);
        setFormData({
          firstName: res.profile.first_name || '',
          lastName: res.profile.last_name || '',
          phone: res.profile.phone || '',
          headline: res.profile.headline || '',
          bio: res.profile.bio || '',
          location: res.profile.location || '',
          experienceYears: res.profile.experience_years || 0,
          currentSalary: res.profile.current_salary || '',
          expectedSalary: res.profile.expected_salary || '',
          githubUrl: res.profile.github_url || '',
          linkedinUrl: res.profile.linkedin_url || '',
          portfolioUrl: res.profile.portfolio_url || '',
        });
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load candidate profile.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isSeeker) {
      fetchProfile();
    }
  }, [user, isSeeker]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await userService.updateProfile(formData);
      if (res.success) {
        setAlert({ type: 'success', message: 'Profile details updated successfully!' });
        await refreshUser();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  // Add Skill
  const handleAddSkill = async (e) => {
    e.preventDefault();
    try {
      await userService.addSkill(newSkill);
      setNewSkill({ skillName: '', proficiencyLevel: 'Intermediate', yearsOfExperience: 1 });
      setActiveModal(null);
      fetchProfile();
      setAlert({ type: 'success', message: 'Technical skill added!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // Delete Skill
  const handleDeleteSkill = async (id) => {
    try {
      await userService.removeSkill(id);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Education
  const handleAddEducation = async (e) => {
    e.preventDefault();
    try {
      await userService.addEducation(newEdu);
      setNewEdu({ degree: '', institution: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '' });
      setActiveModal(null);
      fetchProfile();
      setAlert({ type: 'success', message: 'Education record added!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // Delete Education
  const handleDeleteEducation = async (id) => {
    try {
      await userService.deleteEducation(id);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Experience
  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      await userService.addExperience(newExp);
      setNewExp({ companyName: '', title: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' });
      setActiveModal(null);
      fetchProfile();
      setAlert({ type: 'success', message: 'Experience record added!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // Delete Experience
  const handleDeleteExperience = async (id) => {
    try {
      await userService.deleteExperience(id);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Project
  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      await userService.addProject(newProj);
      setNewProj({ title: '', description: '', techStack: '', liveUrl: '', repoUrl: '' });
      setActiveModal(null);
      fetchProfile();
      setAlert({ type: 'success', message: 'Project showcase added!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // Delete Project
  const handleDeleteProject = async (id) => {
    try {
      await userService.deleteProject(id);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Certification
  const handleAddCert = async (e) => {
    e.preventDefault();
    try {
      await userService.addCertification(newCert);
      setNewCert({ name: '', issuingOrganization: '', issueDate: '', expirationDate: '', credentialId: '', credentialUrl: '' });
      setActiveModal(null);
      fetchProfile();
      setAlert({ type: 'success', message: 'Certification credential added!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  // Delete Certification
  const handleDeleteCert = async (id) => {
    try {
      await userService.deleteCertification(id);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user || !isSeeker || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner text="Loading candidate profile..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="job_seeker" />

        <main className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Candidate Profile</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage your credentials, technical proficiencies, education, and portfolio
              </p>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Basic Info Form */}
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Personal Information & Headline
              </h3>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Professional Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Full-Stack Developer | React & Node.js"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="San Francisco, CA or Remote"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Experience (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Salary ($ / yr)</label>
                <input
                  type="number"
                  placeholder="e.g. 90000"
                  value={formData.currentSalary}
                  onChange={(e) => setFormData({ ...formData, currentSalary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Salary ($ / yr)</label>
                <input
                  type="number"
                  placeholder="e.g. 120000"
                  value={formData.expectedSalary}
                  onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">About Me (Bio)</label>
              <textarea
                rows={3}
                placeholder="Brief summary of your professional background, passions, and achievements..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Portfolio Website</label>
                <input
                  type="url"
                  placeholder="https://myportfolio.dev"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </form>

          {/* Technical Skills Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-600" />
                  Technical Skills ({profile?.skills?.length || 0})
                </h3>
                <p className="text-[11px] text-slate-400">Used by AI recommendation engine to match job requirements</p>
              </div>
              <button
                onClick={() => setActiveModal('skill')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </button>
            </div>

            {profile?.skills?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No skills added yet. Add your skills to see match percentages.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.skills?.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-normal">
                      {s.proficiency_level}
                    </span>
                    <button
                      onClick={() => handleDeleteSkill(s.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Education ({profile?.education?.length || 0})
              </h3>
              <button
                onClick={() => setActiveModal('education')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Education
              </button>
            </div>

            {profile?.education?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No education records added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile?.education?.map((edu) => (
                  <div key={edu.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{edu.degree}</p>
                      <p className="text-[11px] text-slate-600">{edu.institution} • {edu.field_of_study}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {edu.start_year} - {edu.end_year || 'Present'} {edu.grade ? `• Grade: ${edu.grade}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work Experience Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Work Experience ({profile?.experience?.length || 0})
              </h3>
              <button
                onClick={() => setActiveModal('experience')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            {profile?.experience?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No work experience added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile?.experience?.map((exp) => (
                  <div key={exp.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{exp.title}</p>
                      <p className="text-[11px] text-slate-600">{exp.company_name} • {exp.location}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{exp.start_date} to {exp.is_current ? 'Present' : exp.end_date}</p>
                      {exp.description && (
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                Key Projects ({profile?.projects?.length || 0})
              </h3>
              <button
                onClick={() => setActiveModal('project')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            {profile?.projects?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No projects added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile?.projects?.map((proj) => (
                  <div key={proj.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{proj.title}</p>
                      {proj.tech_stack && (
                        <p className="text-[11px] text-blue-600 font-mono mt-0.5">Stack: {proj.tech_stack}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{proj.description}</p>
                      <div className="flex gap-3 mt-2 text-[11px] text-blue-600">
                        {proj.live_url && (
                          <a href={proj.live_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                            Live Demo <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {proj.repo_url && (
                          <a href={proj.repo_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                            Source Code <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certifications Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Certifications ({profile?.certifications?.length || 0})
              </h3>
              <button
                onClick={() => setActiveModal('certification')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Certification
              </button>
            </div>

            {profile?.certifications?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No certifications added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile?.certifications?.map((c) => (
                  <div key={c.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-600">Issuer: {c.issuing_organization}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Issued: {c.issue_date} {c.expiration_date ? `• Expires: ${c.expiration_date}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCert(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Skill Modal */}
      <Modal isOpen={activeModal === 'skill'} onClose={() => setActiveModal(null)} title="Add Technical Skill">
        <form onSubmit={handleAddSkill} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Skill Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Next.js, Docker, Python"
              value={newSkill.skillName}
              onChange={(e) => setNewSkill({ ...newSkill, skillName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Proficiency Level</label>
            <select
              value={newSkill.proficiencyLevel}
              onChange={(e) => setNewSkill({ ...newSkill, proficiencyLevel: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Years of Experience</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={newSkill.yearsOfExperience}
              onChange={(e) => setNewSkill({ ...newSkill, yearsOfExperience: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Add Skill</button>
          </div>
        </form>
      </Modal>

      {/* Add Education Modal */}
      <Modal isOpen={activeModal === 'education'} onClose={() => setActiveModal(null)} title="Add Education Degree">
        <form onSubmit={handleAddEducation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Degree Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bachelor of Technology (B.Tech)"
              value={newEdu.degree}
              onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Institution / University *</label>
            <input
              type="text"
              required
              placeholder="e.g. National Institute of Technology"
              value={newEdu.institution}
              onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Field of Study</label>
            <input
              type="text"
              placeholder="e.g. Computer Science & Engineering"
              value={newEdu.fieldOfStudy}
              onChange={(e) => setNewEdu({ ...newEdu, fieldOfStudy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Year</label>
              <input
                type="number"
                placeholder="2018"
                value={newEdu.startYear}
                onChange={(e) => setNewEdu({ ...newEdu, startYear: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Year</label>
              <input
                type="number"
                placeholder="2022"
                value={newEdu.endYear}
                onChange={(e) => setNewEdu({ ...newEdu, endYear: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grade / GPA</label>
              <input
                type="text"
                placeholder="3.8 / 4.0"
                value={newEdu.grade}
                onChange={(e) => setNewEdu({ ...newEdu, grade: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Add Education</button>
          </div>
        </form>
      </Modal>

      {/* Add Experience Modal */}
      <Modal isOpen={activeModal === 'experience'} onClose={() => setActiveModal(null)} title="Add Work Experience">
        <form onSubmit={handleAddExperience} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                required
                placeholder="Software Engineer"
                value={newExp.title}
                onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company *</label>
              <input
                type="text"
                required
                placeholder="Tech Solutions Inc."
                value={newExp.companyName}
                onChange={(e) => setNewExp({ ...newExp, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              placeholder="San Francisco, CA or Remote"
              value={newExp.location}
              onChange={(e) => setNewExp({ ...newExp, location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="text"
                placeholder="e.g. 2021-06"
                value={newExp.startDate}
                onChange={(e) => setNewExp({ ...newExp, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="text"
                placeholder="e.g. Present"
                value={newExp.endDate}
                onChange={(e) => setNewExp({ ...newExp, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Key Achievements</label>
            <textarea
              rows={3}
              placeholder="Responsibilities, tools used, and results..."
              value={newExp.description}
              onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Add Experience</button>
          </div>
        </form>
      </Modal>

      {/* Add Project Modal */}
      <Modal isOpen={activeModal === 'project'} onClose={() => setActiveModal(null)} title="Add Project Showcase">
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. AI Resume Matcher"
              value={newProj.title}
              onChange={(e) => setNewProj({ ...newProj, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tech Stack</label>
            <input
              type="text"
              placeholder="e.g. Next.js, Express, PostgreSQL, Tailwind"
              value={newProj.techStack}
              onChange={(e) => setNewProj({ ...newProj, techStack: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the problem solved and core features..."
              value={newProj.description}
              onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Live Demo URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={newProj.liveUrl}
                onChange={(e) => setNewProj({ ...newProj, liveUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GitHub / Code URL</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={newProj.repoUrl}
                onChange={(e) => setNewProj({ ...newProj, repoUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Add Project</button>
          </div>
        </form>
      </Modal>

      {/* Add Certification Modal */}
      <Modal isOpen={activeModal === 'certification'} onClose={() => setActiveModal(null)} title="Add Certification">
        <form onSubmit={handleAddCert} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Certification Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. AWS Certified Solutions Architect"
              value={newCert.name}
              onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Issuing Organization *</label>
            <input
              type="text"
              required
              placeholder="e.g. Amazon Web Services, Google, Meta"
              value={newCert.issuingOrganization}
              onChange={(e) => setNewCert({ ...newCert, issuingOrganization: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Issue Date</label>
              <input
                type="text"
                placeholder="2023-04"
                value={newCert.issueDate}
                onChange={(e) => setNewCert({ ...newCert, issueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Credential ID</label>
              <input
                type="text"
                placeholder="AWS-123456"
                value={newCert.credentialId}
                onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Add Certification</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
