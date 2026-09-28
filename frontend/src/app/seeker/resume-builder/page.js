'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Save,
  Printer,
  Sparkles,
  Eye,
  Edit3,
  Plus,
  Trash2,
  CheckCircle,
  Download,
  User,
  Briefcase,
  BookOpen,
  Code,
  Award,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import Alert from '../../../components/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function ResumeBuilderPage() {
  const { user, isSeeker, loading: authLoading } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'

  // Complete 12-section resume builder state
  const [title, setTitle] = useState('Full Stack Professional Resume');
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
  });
  const [careerObjective, setCareerObjective] = useState('');
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experience, setExperience] = useState([]);
  const [internships, setInternships] = useState([]);
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [links, setLinks] = useState({
    linkedin: '',
    github: '',
    portfolio: '',
  });

  const [resumeId, setResumeId] = useState(null);

  // Section 5: Experience states
  const [showAddExp, setShowAddExp] = useState(false);
  const [newExp, setNewExp] = useState({ title: '', company: '', location: '', dates: '', description: '' });
  const [editingExpIndex, setEditingExpIndex] = useState(null);
  const [editExpData, setEditExpData] = useState({ title: '', company: '', location: '', dates: '', description: '' });

  // Section 6: Education states
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', field: '', years: '', grade: '' });
  const [editingEduIndex, setEditingEduIndex] = useState(null);
  const [editEduData, setEditEduData] = useState({ degree: '', institution: '', field: '', years: '', grade: '' });

  // Section 7: Projects states
  const [showAddProj, setShowAddProj] = useState(false);
  const [newProj, setNewProj] = useState({ title: '', tech: '', url: '', description: '' });
  const [editingProjIndex, setEditingProjIndex] = useState(null);
  const [editProjData, setEditProjData] = useState({ title: '', tech: '', url: '', description: '' });

  // Section 8: Achievements states
  const [newAchText, setNewAchText] = useState('');
  const [editingAchIndex, setEditingAchIndex] = useState(null);
  const [editAchText, setEditAchText] = useState('');

  // Section 9: Languages states
  const [newLangText, setNewLangText] = useState('');
  const [editingLangIndex, setEditingLangIndex] = useState(null);
  const [editLangText, setEditLangText] = useState('');

  // Section 3: Skills state
  const [newSkillText, setNewSkillText] = useState('');

  const resumeRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  // Intelligent content score to guarantee resume fits strictly on ONE page
  const contentScore = useMemo(() => {
    let score = 0;
    if (careerObjective) score += Math.ceil(careerObjective.length / 80);
    if (skills?.length) score += Math.ceil(skills.length / 5);
    if (experience?.length) {
      experience.forEach((e) => {
        score += 2;
        if (e.description) score += Math.ceil(e.description.length / 70);
      });
    }
    if (internships?.length) {
      internships.forEach((item) => {
        score += 2;
        const desc = typeof item === 'object' ? (item.description || item.summary || '') : '';
        if (desc) score += Math.ceil(desc.length / 70);
      });
    }
    if (projects?.length) {
      projects.forEach((p) => {
        score += 2;
        if (p.description) score += Math.ceil(p.description.length / 70);
      });
    }
    if (education?.length) score += education.length * 1.5;
    if (certifications?.length) score += certifications.length;
    if (achievements?.length) score += achievements.length;
    if (languages?.length) score += 1;
    return score;
  }, [careerObjective, skills, experience, internships, projects, education, certifications, achievements, languages]);

  // Dynamic layout tier based on content volume
  const layoutTier = useMemo(() => {
    if (contentScore > 34) return 'compact';
    if (contentScore > 22) return 'moderate';
    return 'standard';
  }, [contentScore]);

  // Auto-fit verification to guarantee single A4 sheet without spill or overflow clipping
  useEffect(() => {
    if (activeTab === 'preview' && resumeRef.current) {
      const el = resumeRef.current;
      const targetHeight = el.clientHeight || 1122;
      const actualHeight = el.scrollHeight;
      if (actualHeight > targetHeight + 2) {
        const factor = Math.max(0.85, Math.min(1, (targetHeight - 8) / actualHeight));
        setScaleFactor(factor);
      } else {
        setScaleFactor(1);
      }
    }
  }, [activeTab, contentScore, personalInfo, careerObjective, skills, experience, internships, projects, education, certifications, achievements, languages, links]);

  // Function to load resume builder data from backend
  const loadResumeData = async () => {
    try {
      setLoading(true);
      const res = await userService.getResumeBuilderData();
      if (res.success) {
        const { hasSavedResume, resumeId: savedId, title: savedTitle, resumeData, profile: p } = res;

        if (savedId) {
          setResumeId(savedId);
        }
        if (savedTitle) {
          setTitle(savedTitle);
        }

        // Relational profile fallbacks
        const profileExperience = p?.experience?.map((e) => ({
          title: e.title,
          company: e.company_name,
          location: e.location || '',
          dates: `${e.start_date || ''} to ${e.is_current ? 'Present' : e.end_date || ''}`.trim(),
          description: e.description || '',
        })) || [];

        const profileEducation = p?.education?.map((e) => ({
          degree: e.degree,
          institution: e.institution,
          field: e.field_of_study || '',
          years: e.start_year ? `${e.start_year} - ${e.end_year || 'Present'}` : '',
          grade: e.grade || '',
        })) || [];

        const profileProjects = p?.projects?.map((pr) => ({
          title: pr.title,
          tech: pr.tech_stack || '',
          description: pr.description || '',
          url: pr.live_url || pr.repo_url || '',
        })) || [];

        const profileSkills = p?.skills?.map((s) => s.name) || ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Tailwind CSS'];

        if (hasSavedResume && resumeData) {
          // Pre-populate fields from the candidate's saved resume builder data
          setPersonalInfo({
            fullName: resumeData.personalInfo?.fullName || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || '',
            email: resumeData.personalInfo?.email || user?.email || '',
            phone: resumeData.personalInfo?.phone || p?.phone || '',
            location: resumeData.personalInfo?.location || p?.location || '',
            headline: resumeData.personalInfo?.headline || p?.headline || '',
          });
          setCareerObjective(resumeData.careerObjective || p?.bio || '');

          // Skills
          setSkills(
            Array.isArray(resumeData.skills) && resumeData.skills.length > 0
              ? resumeData.skills
              : profileSkills
          );

          // Education (Section 6)
          setEducation(
            Array.isArray(resumeData.education) && resumeData.education.length > 0
              ? resumeData.education
              : profileEducation
          );

          // Experience (Section 5)
          setExperience(
            Array.isArray(resumeData.experience) && resumeData.experience.length > 0
              ? resumeData.experience
              : profileExperience
          );

          setInternships(Array.isArray(resumeData.internships) ? resumeData.internships : []);

          // Projects (Section 7)
          setProjects(
            Array.isArray(resumeData.projects) && resumeData.projects.length > 0
              ? resumeData.projects
              : profileProjects
          );

          setCertifications(
            Array.isArray(resumeData.certifications) && resumeData.certifications.length > 0
              ? resumeData.certifications
              : (p?.certifications?.map((c) => ({ name: c.name, issuer: c.issuing_organization, date: c.issue_date })) || [])
          );

          setAchievements(
            Array.isArray(resumeData.achievements) && resumeData.achievements.length > 0
              ? resumeData.achievements
              : [
                'Winner of National Collegiate Hackathon 2024 (Top 1% of 400 teams)',
                "Dean's List Academic Excellence Honor Graduate",
              ]
          );

          setLanguages(
            Array.isArray(resumeData.languages) && resumeData.languages.length > 0
              ? resumeData.languages
              : ['English (Fluent)', 'Spanish (Conversational)']
          );

          setLinks({
            linkedin: resumeData.links?.linkedin || p?.linkedin_url || '',
            github: resumeData.links?.github || p?.github_url || '',
            portfolio: resumeData.links?.portfolio || p?.portfolio_url || '',
          });
        } else if (p) {
          // Initial fallback from candidate profile
          setPersonalInfo({
            fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Alex Johnson',
            email: user?.email || '',
            phone: p.phone || '+1 (555) 345-6789',
            location: p.location || 'San Francisco, CA',
            headline: p.headline || 'Full-Stack Software Engineer',
          });
          setCareerObjective(
            p.bio ||
            'Results-driven Software Engineer with proven expertise designing and delivering modern full-stack web applications.'
          );
          setSkills(profileSkills);
          setEducation(profileEducation);
          setExperience(profileExperience);
          setProjects(profileProjects);
          setCertifications(
            p.certifications?.map((c) => ({
              name: c.name,
              issuer: c.issuing_organization,
              date: c.issue_date,
            })) || []
          );
          setAchievements([
            'Winner of National Collegiate Hackathon 2024 (Top 1% of 400 teams)',
            "Dean's List Academic Excellence Honor Graduate",
          ]);
          setLanguages(['English (Fluent)', 'Spanish (Conversational)']);
          setLinks({
            linkedin: p.linkedin_url || '',
            github: p.github_url || '',
            portfolio: p.portfolio_url || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load resume details:', err);
      setAlert({ type: 'error', message: 'Failed to load resume data from backend.' });
    } finally {
      setLoading(false);
    }
  };

  // Load existing profile details or saved resume on mount
  useEffect(() => {
    if (!authLoading && (!user || !isSeeker)) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'recruiter') {
        router.replace('/recruiter/dashboard');
      } else if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/seeker/dashboard');
      }
      return;
    }

    if (user && isSeeker) {
      loadResumeData();
    }
  }, [user, isSeeker, authLoading, router]);

  // Save to PostgreSQL DB and re-fetch fresh data
  const handleSaveResume = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const payload = {
        resumeId,
        title,
        personalInfo,
        careerObjective,
        education,
        skills,
        experience,
        internships,
        projects,
        certifications,
        achievements,
        languages,
        links,
      };

      const res = await userService.saveResumeBuilder(payload);

      if (res.success) {
        if (res.resumeId) {
          setResumeId(res.resumeId);
        }

        // Requirement 7: After saving, fetch the updated data from the backend/database
        const fresh = await userService.getResumeBuilderData();
        if (fresh.success && fresh.resumeData) {
          if (fresh.resumeId) setResumeId(fresh.resumeId);
          if (fresh.title) setTitle(fresh.title);
          if (fresh.resumeData.personalInfo) {
            setPersonalInfo(fresh.resumeData.personalInfo);
          }
          if (fresh.resumeData.careerObjective) {
            setCareerObjective(fresh.resumeData.careerObjective);
          }
          if (fresh.resumeData.skills) setSkills(fresh.resumeData.skills);
          if (fresh.resumeData.education) setEducation(fresh.resumeData.education);
          if (fresh.resumeData.experience) setExperience(fresh.resumeData.experience);
          if (fresh.resumeData.internships) setInternships(fresh.resumeData.internships);
          if (fresh.resumeData.projects) setProjects(fresh.resumeData.projects);
          if (fresh.resumeData.certifications) setCertifications(fresh.resumeData.certifications);
          if (fresh.resumeData.achievements) setAchievements(fresh.resumeData.achievements);
          if (fresh.resumeData.languages) setLanguages(fresh.resumeData.languages);
          if (fresh.resumeData.links) setLinks(fresh.resumeData.links);
        }

        setAlert({
          type: 'success',
          message: 'All resume sections and personal details saved successfully to the database!',
        });
      } else {
        setAlert({
          type: 'error',
          message: res.message || 'Failed to save resume.',
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to save resume. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Section 3: Skill handlers
  const addSkill = () => {
    if (newSkillText.trim() && !skills.includes(newSkillText.trim())) {
      setSkills([...skills, newSkillText.trim()]);
      setNewSkillText('');
    }
  };

  // Section 5: Experience handlers
  const handleAddExperience = () => {
    if (!newExp.title.trim() || !newExp.company.trim()) {
      setAlert({ type: 'error', message: 'Please provide at least a Job Title and Company Name.' });
      return;
    }
    setExperience([...experience, { ...newExp }]);
    setNewExp({ title: '', company: '', location: '', dates: '', description: '' });
    setShowAddExp(false);
  };

  const handleStartEditExp = (index) => {
    setEditingExpIndex(index);
    setEditExpData({ ...experience[index] });
  };

  const handleUpdateExperience = () => {
    if (!editExpData.title.trim() || !editExpData.company.trim()) {
      setAlert({ type: 'error', message: 'Job Title and Company Name cannot be empty.' });
      return;
    }
    const updated = [...experience];
    updated[editingExpIndex] = { ...editExpData };
    setExperience(updated);
    setEditingExpIndex(null);
  };

  const handleDeleteExperience = (index) => {
    setExperience(experience.filter((_, idx) => idx !== index));
    if (editingExpIndex === index) setEditingExpIndex(null);
  };

  // Section 6: Education handlers
  const handleAddEducation = () => {
    if (!newEdu.degree.trim() || !newEdu.institution.trim()) {
      setAlert({ type: 'error', message: 'Please provide at least a Degree and Institution.' });
      return;
    }
    setEducation([...education, { ...newEdu }]);
    setNewEdu({ degree: '', institution: '', field: '', years: '', grade: '' });
    setShowAddEdu(false);
  };

  const handleStartEditEdu = (index) => {
    setEditingEduIndex(index);
    setEditEduData({ ...education[index] });
  };

  const handleUpdateEducation = () => {
    if (!editEduData.degree.trim() || !editEduData.institution.trim()) {
      setAlert({ type: 'error', message: 'Degree and Institution cannot be empty.' });
      return;
    }
    const updated = [...education];
    updated[editingEduIndex] = { ...editEduData };
    setEducation(updated);
    setEditingEduIndex(null);
  };

  const handleDeleteEducation = (index) => {
    setEducation(education.filter((_, idx) => idx !== index));
    if (editingEduIndex === index) setEditingEduIndex(null);
  };

  // Section 7: Projects handlers
  const handleAddProject = () => {
    if (!newProj.title.trim()) {
      setAlert({ type: 'error', message: 'Project Title is required.' });
      return;
    }
    setProjects([...projects, { ...newProj }]);
    setNewProj({ title: '', tech: '', url: '', description: '' });
    setShowAddProj(false);
  };

  const handleStartEditProj = (index) => {
    setEditingProjIndex(index);
    setEditProjData({ ...projects[index] });
  };

  const handleUpdateProject = () => {
    if (!editProjData.title.trim()) {
      setAlert({ type: 'error', message: 'Project Title cannot be empty.' });
      return;
    }
    const updated = [...projects];
    updated[editingProjIndex] = { ...editProjData };
    setProjects(updated);
    setEditingProjIndex(null);
  };

  const handleDeleteProject = (index) => {
    setProjects(projects.filter((_, idx) => idx !== index));
    if (editingProjIndex === index) setEditingProjIndex(null);
  };

  // Section 8: Achievements handlers
  const handleAddAchievement = () => {
    if (newAchText.trim()) {
      setAchievements([...achievements, newAchText.trim()]);
      setNewAchText('');
    }
  };

  const handleStartEditAch = (index) => {
    setEditingAchIndex(index);
    setEditAchText(achievements[index]);
  };

  const handleUpdateAchievement = () => {
    if (!editAchText.trim()) return;
    const updated = [...achievements];
    updated[editingAchIndex] = editAchText.trim();
    setAchievements(updated);
    setEditingAchIndex(null);
  };

  // Section 9: Languages handlers
  const handleAddLanguage = () => {
    if (newLangText.trim()) {
      setLanguages([...languages, newLangText.trim()]);
      setNewLangText('');
    }
  };

  const handleStartEditLang = (index) => {
    setEditingLangIndex(index);
    setEditLangText(languages[index]);
  };

  const handleUpdateLanguage = () => {
    if (!editLangText.trim()) return;
    const updated = [...languages];
    updated[editingLangIndex] = editLangText.trim();
    setLanguages(updated);
    setEditingLangIndex(null);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = '';
    if (activeTab !== 'preview') {
      setActiveTab('preview');
      setTimeout(() => {
        window.print();
        document.title = originalTitle;
      }, 150);
    } else {
      window.print();
      document.title = originalTitle;
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner text="Initializing Resume Builder..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none">
      {/* Print Stylesheet */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4;
                margin: 0;
              }

              *, *:before, *:after {
                box-sizing: border-box !important;
              }

              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              nav,
              footer,
              aside,
              header,
              .no-print,
              [data-no-print] {
                display: none !important;
              }

              body > *:not(main) {
                display: none !important;
              }

              main {
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
              }

              #resume-document {
                width: 210mm !important;
                height: 297mm !important;
                max-width: 210mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                color: #0f172a !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                page-break-inside: avoid !important;
                break-after: avoid !important;
                break-before: avoid !important;
                break-inside: avoid !important;
              }

              .break-inside-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              a {
                text-decoration: none !important;
                color: inherit !important;
              }
            }
          `,
        }}
      />

      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Interactive Resume Builder</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and preview an industry-standard ATS-friendly CV across all 12 key sections
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="p-1 bg-slate-200/80 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTab === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Sections
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTab === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                }`}
            >
              <Eye className="w-3.5 h-3.5" /> Full CV Preview
            </button>
          </div>

          <button
            onClick={handleSaveResume}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Resume'}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {alert && (
        <div className="no-print">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {/* Editor View */}
      {activeTab === 'edit' && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* 1. Resume Document Title */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <label className="block text-xs font-bold text-slate-700 mb-1">Resume Document Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 2. Personal Information */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                1. Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={personalInfo.fullName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={personalInfo.headline}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, headline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={personalInfo.location}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* 3. Career Objective */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-2">
              <h3 className="font-bold text-sm text-slate-900">2. Career Objective</h3>
              <textarea
                rows={3}
                value={careerObjective}
                onChange={(e) => setCareerObjective(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            {/* 4. Skills */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                3. Skills
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. React, TypeScript, Docker"
                  value={newSkillText}
                  onChange={(e) => setNewSkillText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs">
                    {s}
                    <button
                      onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 5. Online Profiles (LinkedIn & GitHub) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-600" />
                4. Professional Links (LinkedIn, GitHub, Portfolio)
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={links.linkedin}
                  onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={links.github}
                  onChange={(e) => setLinks({ ...links, github: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Portfolio Website</label>
                <input
                  type="url"
                  value={links.portfolio}
                  onChange={(e) => setLinks({ ...links, portfolio: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Experience, Education, Projects, Achievements, Languages */}
          <div className="space-y-6">
            {/* 5. Experience & Internships */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  5. Professional Experience & Internships ({experience.length})
                </h3>
                {!showAddExp && (
                  <button
                    type="button"
                    onClick={() => setShowAddExp(true)}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Experience
                  </button>
                )}
              </div>

              {/* Add Experience Form */}
              {showAddExp && (
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                  <h4 className="font-bold text-xs text-blue-900">Add New Work Experience</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Job Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Full-Stack Software Engineer"
                        value={newExp.title}
                        onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Google or TechCorp Inc."
                        value={newExp.company}
                        onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. San Francisco, CA or Remote"
                        value={newExp.location}
                        onChange={(e) => setNewExp({ ...newExp, location: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Dates / Period</label>
                      <input
                        type="text"
                        placeholder="e.g. 2021 to Present"
                        value={newExp.dates}
                        onChange={(e) => setNewExp({ ...newExp, dates: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Description & Key Responsibilities</label>
                    <textarea
                      rows={2}
                      placeholder="Responsibilities, achievements, impact, technologies used..."
                      value={newExp.description}
                      onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddExp(false);
                        setNewExp({ title: '', company: '', location: '', dates: '', description: '' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Add Experience
                    </button>
                  </div>
                </div>
              )}

              {/* Experience List */}
              <div className="space-y-3">
                {experience.length === 0 && !showAddExp && (
                  <p className="text-xs text-slate-400 italic py-2">No experience entries yet. Click "+ Add Experience" above to add one.</p>
                )}
                {experience.map((exp, i) =>
                  editingExpIndex === i ? (
                    <div key={i} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-300 space-y-3">
                      <h4 className="font-bold text-xs text-amber-900">Edit Work Experience</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Job Title *</label>
                          <input
                            type="text"
                            value={editExpData.title}
                            onChange={(e) => setEditExpData({ ...editExpData, title: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Company Name *</label>
                          <input
                            type="text"
                            value={editExpData.company}
                            onChange={(e) => setEditExpData({ ...editExpData, company: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Location</label>
                          <input
                            type="text"
                            value={editExpData.location}
                            onChange={(e) => setEditExpData({ ...editExpData, location: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Dates / Period</label>
                          <input
                            type="text"
                            value={editExpData.dates}
                            onChange={(e) => setEditExpData({ ...editExpData, dates: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Description & Key Responsibilities</label>
                        <textarea
                          rows={2}
                          value={editExpData.description}
                          onChange={(e) => setEditExpData({ ...editExpData, description: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingExpIndex(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateExperience}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Update Experience
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-xs text-slate-800">
                          {exp.title} — <span className="text-blue-700">{exp.company}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {exp.dates} {exp.location ? `• ${exp.location}` : ''}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{exp.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditExp(i)}
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Edit experience"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExperience(i)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete experience"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 6. Education */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  6. Education ({education.length})
                </h3>
                {!showAddEdu && (
                  <button
                    type="button"
                    onClick={() => setShowAddEdu(true)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Education
                  </button>
                )}
              </div>

              {/* Add Education Form */}
              {showAddEdu && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <h4 className="font-bold text-xs text-emerald-900">Add New Education Qualification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Degree / Certificate *</label>
                      <input
                        type="text"
                        placeholder="e.g. Bachelor of Technology (B.Tech)"
                        value={newEdu.degree}
                        onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Institution / University *</label>
                      <input
                        type="text"
                        placeholder="e.g. Stanford University"
                        value={newEdu.institution}
                        onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Field of Study / Major</label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Science & Engineering"
                        value={newEdu.field}
                        onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Years</label>
                      <input
                        type="text"
                        placeholder="e.g. 2018 - 2022"
                        value={newEdu.years}
                        onChange={(e) => setNewEdu({ ...newEdu, years: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Grade / GPA / Honours</label>
                    <input
                      type="text"
                      placeholder="e.g. 3.8 / 4.0 GPA or First Class with Distinction"
                      value={newEdu.grade}
                      onChange={(e) => setNewEdu({ ...newEdu, grade: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddEdu(false);
                        setNewEdu({ degree: '', institution: '', field: '', years: '', grade: '' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Add Education
                    </button>
                  </div>
                </div>
              )}

              {/* Education List */}
              <div className="space-y-3">
                {education.length === 0 && !showAddEdu && (
                  <p className="text-xs text-slate-400 italic py-2">No education entries yet. Click "+ Add Education" above to add one.</p>
                )}
                {education.map((edu, i) =>
                  editingEduIndex === i ? (
                    <div key={i} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-300 space-y-3">
                      <h4 className="font-bold text-xs text-amber-900">Edit Education</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Degree *</label>
                          <input
                            type="text"
                            value={editEduData.degree}
                            onChange={(e) => setEditEduData({ ...editEduData, degree: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Institution *</label>
                          <input
                            type="text"
                            value={editEduData.institution}
                            onChange={(e) => setEditEduData({ ...editEduData, institution: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Field of Study</label>
                          <input
                            type="text"
                            value={editEduData.field}
                            onChange={(e) => setEditEduData({ ...editEduData, field: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Years</label>
                          <input
                            type="text"
                            value={editEduData.years}
                            onChange={(e) => setEditEduData({ ...editEduData, years: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Grade / GPA</label>
                        <input
                          type="text"
                          value={editEduData.grade}
                          onChange={(e) => setEditEduData({ ...editEduData, grade: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingEduIndex(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateEducation}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Update Education
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-xs text-slate-800">
                          {edu.degree} {edu.field ? `in ${edu.field}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {edu.institution} {edu.years ? `(${edu.years})` : ''} {edu.grade ? `• ${edu.grade}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditEdu(i)}
                          className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="Edit education"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEducation(i)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete education"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 7. Technical Projects */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  7. Technical Projects ({projects.length})
                </h3>
                {!showAddProj && (
                  <button
                    type="button"
                    onClick={() => setShowAddProj(true)}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                )}
              </div>

              {/* Add Project Form */}
              {showAddProj && (
                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                  <h4 className="font-bold text-xs text-purple-900">Add New Project</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Project Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. AI Resume Matcher"
                        value={newProj.title}
                        onChange={(e) => setNewProj({ ...newProj, title: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tech Stack</label>
                      <input
                        type="text"
                        placeholder="e.g. React, Node.js, PostgreSQL"
                        value={newProj.tech}
                        onChange={(e) => setNewProj({ ...newProj, tech: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Project / Repository URL</label>
                    <input
                      type="url"
                      placeholder="e.g. https://github.com/username/project or demo URL"
                      value={newProj.url}
                      onChange={(e) => setNewProj({ ...newProj, url: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Description & Highlights</label>
                    <textarea
                      rows={2}
                      placeholder="Project overview, architecture, and key features..."
                      value={newProj.description}
                      onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProj(false);
                        setNewProj({ title: '', tech: '', url: '', description: '' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Add Project
                    </button>
                  </div>
                </div>
              )}

              {/* Project List */}
              <div className="space-y-3">
                {projects.length === 0 && !showAddProj && (
                  <p className="text-xs text-slate-400 italic py-2">No projects yet. Click "+ Add Project" above to showcase technical work.</p>
                )}
                {projects.map((pr, i) =>
                  editingProjIndex === i ? (
                    <div key={i} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-300 space-y-3">
                      <h4 className="font-bold text-xs text-amber-900">Edit Project</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Project Title *</label>
                          <input
                            type="text"
                            value={editProjData.title}
                            onChange={(e) => setEditProjData({ ...editProjData, title: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Tech Stack</label>
                          <input
                            type="text"
                            value={editProjData.tech}
                            onChange={(e) => setEditProjData({ ...editProjData, tech: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Project / Repository URL</label>
                        <input
                          type="url"
                          value={editProjData.url}
                          onChange={(e) => setEditProjData({ ...editProjData, url: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Description & Highlights</label>
                        <textarea
                          rows={2}
                          value={editProjData.description}
                          onChange={(e) => setEditProjData({ ...editProjData, description: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingProjIndex(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateProject}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Update Project
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-slate-800">{pr.title}</p>
                          {pr.url && (
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              Demo/Code ↗
                            </a>
                          )}
                        </div>
                        {pr.tech && <p className="text-[11px] text-blue-600 font-mono mt-0.5">{pr.tech}</p>}
                        {pr.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{pr.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditProj(i)}
                          className="text-slate-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                          title="Edit project"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(i)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 8. Achievements & Honors */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  8. Achievements & Honors ({achievements.length})
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 1st Place at National Collegiate Hackathon"
                    value={newAchText}
                    onChange={(e) => setNewAchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAchievement())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAchievement}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {achievements.map((a, i) =>
                    editingAchIndex === i ? (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editAchText}
                          onChange={(e) => setEditAchText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUpdateAchievement())}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateAchievement}
                          className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAchIndex(null)}
                          className="px-2 py-1 text-slate-500 text-xs hover:bg-slate-100 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        key={i}
                        className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 hover:border-slate-200"
                      >
                        <span className="flex-1 pr-2">• {a}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditAch(i)}
                            className="text-slate-400 hover:text-amber-600 p-1"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAchievements(achievements.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* 9. Languages */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-bold text-xs text-slate-900 mb-2">9. Languages ({languages.length})</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. English (Fluent) or French (Intermediate)"
                    value={newLangText}
                    onChange={(e) => setNewLangText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {languages.map((l, i) =>
                    editingLangIndex === i ? (
                      <div key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200">
                        <input
                          type="text"
                          value={editLangText}
                          onChange={(e) => setEditLangText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUpdateLanguage())}
                          className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs w-32"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateLanguage}
                          className="text-amber-700 text-xs font-bold px-1"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLangIndex(null)}
                          className="text-slate-400 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700 border border-slate-200/50"
                      >
                        {l}
                        <button
                          type="button"
                          onClick={() => handleStartEditLang(i)}
                          className="text-slate-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguages(languages.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Live CV Preview (Printable A4 Document) */}
      <div className={`w-full ${activeTab === 'preview' ? 'block' : 'hidden print:block'}`}>
        {/* On-screen Preview Info Bar */}
        <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold">A4 Document View</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 hidden sm:inline">Clean, ATS-friendly single/multi-page format</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] hidden md:inline">Print / Save as PDF uses standard A4 margins</span>
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        </div>

        {/* Realistic Desk Canvas on Screen */}
        <div className="flex justify-center p-0 sm:py-6 sm:px-4 bg-slate-100/70 rounded-2xl print:bg-transparent print:p-0 print:m-0 print:block">
          <div
            id="resume-document"
            ref={resumeRef}
            style={{
              width: '210mm',
              height: '297mm',
              boxSizing: 'border-box',
              ...(scaleFactor < 1 ? { transform: `scale(${scaleFactor})`, transformOrigin: 'top left' } : {}),
            }}
            className={`w-[210mm] h-[297mm] max-w-[210mm] max-h-[297mm] bg-white text-slate-900 border border-slate-300 shadow-xl flex flex-col justify-start print:m-0 print:border-0 print:shadow-none ${layoutTier === 'compact'
                ? 'p-[5mm_9mm] print:p-[5mm_9mm]'
                : layoutTier === 'moderate'
                  ? 'p-[6.5mm_10.5mm] print:p-[6.5mm_10.5mm]'
                  : 'p-[7.5mm_11mm] print:p-[7.5mm_11mm]'
              }`}
          >
            {/* Header: Left-aligned Full Name, Headline, Compact Contact & Links */}
            <div className={`text-left border-b-2 border-slate-900 ${layoutTier === 'compact' ? 'pb-1 mb-1' : 'pb-1 mb-1.5'} break-inside-avoid shrink-0`}>
              <h1 className={`${layoutTier === 'compact' ? 'text-xl' : 'text-xl sm:text-2xl'} font-black text-slate-900 tracking-tight uppercase leading-none`}>
                {personalInfo.fullName || 'Candidate Name'}
              </h1>
              {personalInfo.headline && (
                <p className={`${layoutTier === 'compact' ? 'text-[11px]' : 'text-[11.5px] sm:text-[12px]'} font-bold text-slate-700 tracking-normal mt-0.5 leading-tight`}>
                  {personalInfo.headline}
                </p>
              )}

              {/* Compact Contact Row (Left-aligned) */}
              <div className={`flex flex-wrap items-center justify-start gap-x-2 gap-y-0.5 mt-1 ${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-700 font-medium leading-tight`}>
                {personalInfo.email && (
                  <a href={`mailto:${personalInfo.email}`} className="hover:text-blue-700">
                    {personalInfo.email}
                  </a>
                )}
                {personalInfo.phone && (
                  <>
                    {personalInfo.email && <span className="text-slate-400 font-bold select-none">•</span>}
                    <a href={`tel:${personalInfo.phone}`} className="hover:text-blue-700">
                      {personalInfo.phone}
                    </a>
                  </>
                )}
                {personalInfo.location && (
                  <>
                    {(personalInfo.email || personalInfo.phone) && <span className="text-slate-400 font-bold select-none">•</span>}
                    <span>{personalInfo.location}</span>
                  </>
                )}
                {links.linkedin && (
                  <>
                    {(personalInfo.email || personalInfo.phone || personalInfo.location) && (
                      <span className="text-slate-400 font-bold select-none">•</span>
                    )}
                    <a
                      href={links.linkedin.startsWith('http') ? links.linkedin : `https://${links.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-900 hover:text-blue-700 font-semibold hover:underline"
                    >
                      LinkedIn
                    </a>
                  </>
                )}
                {links.github && (
                  <>
                    {(personalInfo.email || personalInfo.phone || personalInfo.location || links.linkedin) && (
                      <span className="text-slate-400 font-bold select-none">•</span>
                    )}
                    <a
                      href={links.github.startsWith('http') ? links.github : `https://${links.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-900 hover:text-blue-700 font-semibold hover:underline"
                    >
                      GitHub
                    </a>
                  </>
                )}
                {links.portfolio && (
                  <>
                    {(personalInfo.email || personalInfo.phone || personalInfo.location || links.linkedin || links.github) && (
                      <span className="text-slate-400 font-bold select-none">•</span>
                    )}
                    <a
                      href={links.portfolio.startsWith('http') ? links.portfolio : `https://${links.portfolio}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-900 hover:text-blue-700 font-semibold hover:underline"
                    >
                      Portfolio
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* 1. Professional Summary */}
            {careerObjective && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} break-inside-avoid shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Professional Summary
                </h2>
                <p className={`${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 leading-snug text-left`}>
                  {careerObjective}
                </p>
              </section>
            )}

            {/* 2. Skills */}
            {skills.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} break-inside-avoid shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Skills
                </h2>
                <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 font-medium leading-snug`}>
                  {skills.map((skill, i) => (
                    <span key={i} className="inline-flex items-center">
                      <span>{skill}</span>
                      {i < skills.length - 1 && <span className="text-slate-400 font-bold ml-1.5 select-none">•</span>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Professional Experience */}
            {experience.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Professional Experience
                </h2>
                <div className={layoutTier === 'compact' ? 'space-y-0.5' : 'space-y-1'}>
                  {experience.map((exp, i) => (
                    <div key={i} className="break-inside-avoid">
                      <div className={`flex justify-between items-baseline gap-x-2 ${layoutTier === 'compact' ? 'text-[10.5px]' : 'text-[11px] sm:text-[11.5px]'} leading-tight`}>
                        <div>
                          <span className="font-extrabold text-slate-900">{exp.title}</span>
                          {exp.company && <span className="font-bold text-slate-800"> — {exp.company}</span>}
                        </div>
                        {exp.dates && (
                          <span className={`${layoutTier === 'compact' ? 'text-[9px]' : 'text-[9.5px] sm:text-[10px]'} text-slate-600 font-semibold sm:text-right shrink-0 tracking-tight tabular-nums`}>
                            {exp.dates}
                          </span>
                        )}
                      </div>
                      {exp.location && (
                        <div className="text-[9px] text-slate-500 italic mt-0.5 leading-none">
                          {exp.location}
                        </div>
                      )}
                      {exp.description && (
                        <p className={`${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 mt-0.5 leading-snug whitespace-pre-line`}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Internships */}
            {internships && internships.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Internships
                </h2>
                <div className={layoutTier === 'compact' ? 'space-y-0.5' : 'space-y-1'}>
                  {internships.map((intern, i) => {
                    const title = typeof intern === 'string' ? intern : (intern.title || intern.role || intern.position || '');
                    const company = typeof intern === 'object' ? (intern.company || intern.organization || '') : '';
                    const dates = typeof intern === 'object' ? (intern.dates || intern.duration || '') : '';
                    const location = typeof intern === 'object' ? (intern.location || '') : '';
                    const description = typeof intern === 'object' ? (intern.description || intern.summary || '') : '';

                    return (
                      <div key={i} className="break-inside-avoid">
                        <div className={`flex justify-between items-baseline gap-x-2 ${layoutTier === 'compact' ? 'text-[10.5px]' : 'text-[11px] sm:text-[11.5px]'} leading-tight`}>
                          <div>
                            <span className="font-extrabold text-slate-900">{title}</span>
                            {company && <span className="font-bold text-slate-800"> — {company}</span>}
                          </div>
                          {dates && (
                            <span className={`${layoutTier === 'compact' ? 'text-[9px]' : 'text-[9.5px] sm:text-[10px]'} text-slate-600 font-semibold sm:text-right shrink-0 tracking-tight tabular-nums`}>
                              {dates}
                            </span>
                          )}
                        </div>
                        {location && (
                          <div className="text-[9px] text-slate-500 italic mt-0.5 leading-none">
                            {location}
                          </div>
                        )}
                        {description && (
                          <p className={`${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 mt-0.5 leading-snug whitespace-pre-line`}>
                            {description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 5. Projects */}
            {projects.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Projects
                </h2>
                <div className={layoutTier === 'compact' ? 'space-y-0.5' : 'space-y-1'}>
                  {projects.map((pr, i) => (
                    <div key={i} className="break-inside-avoid">
                      <div className={`flex justify-between items-baseline gap-x-2 ${layoutTier === 'compact' ? 'text-[10.5px]' : 'text-[11px] sm:text-[11.5px]'} leading-tight`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900">{pr.title}</span>
                          {pr.url && (
                            <a
                              href={pr.url.startsWith('http') ? pr.url : `https://${pr.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] sm:text-[9.5px] text-blue-600 hover:underline print:text-slate-700 font-medium"
                            >
                              [{pr.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}]
                            </a>
                          )}
                        </div>
                        {pr.tech && (
                          <span className="text-[9px] sm:text-[9.5px] font-mono font-medium text-slate-600 sm:text-right shrink-0">
                            {pr.tech}
                          </span>
                        )}
                      </div>
                      {pr.description && (
                        <p className={`${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 mt-0.5 leading-snug whitespace-pre-line`}>
                          {pr.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 6. Education */}
            {education.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Education
                </h2>
                <div className={layoutTier === 'compact' ? 'space-y-0.5' : 'space-y-1'}>
                  {education.map((edu, i) => (
                    <div key={i} className={`break-inside-avoid flex justify-between items-baseline gap-x-2 ${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} leading-tight`}>
                      <div>
                        <span className="font-extrabold text-slate-900">{edu.degree}</span>
                        {edu.field && <span className="text-slate-800 font-semibold"> in {edu.field}</span>}
                        {edu.institution && <span className="font-bold text-slate-800"> — {edu.institution}</span>}
                        {edu.grade && <span className="text-slate-600 text-[9px]"> ({edu.grade})</span>}
                      </div>
                      {edu.years && (
                        <span className={`${layoutTier === 'compact' ? 'text-[9px]' : 'text-[9.5px] sm:text-[10px]'} text-slate-600 font-semibold sm:text-right shrink-0 tracking-tight tabular-nums`}>
                          {edu.years}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Certifications */}
            {certifications.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Certifications
                </h2>
                <ul className={`list-disc pl-3.5 space-y-0.5 ${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 leading-snug`}>
                  {certifications.map((c, i) => {
                    const name = typeof c === 'string' ? c : (c.name || c.title || '');
                    const issuer = typeof c === 'object' ? (c.issuer || c.issuing_organization || '') : '';
                    const date = typeof c === 'object' ? (c.date || c.issue_date || '') : '';
                    return (
                      <li key={i} className="break-inside-avoid">
                        <strong className="text-slate-900 font-bold">{name}</strong>
                        {issuer && <span> — {issuer}</span>}
                        {date && <span className="text-slate-600"> ({date})</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* 8. Achievements */}
            {achievements.length > 0 && (
              <section className={`${layoutTier === 'compact' ? 'mb-1' : 'mb-1.5'} shrink-0`}>
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Achievements
                </h2>
                <ul className={`list-disc pl-3.5 space-y-0.5 ${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 leading-snug`}>
                  {achievements.map((a, i) => (
                    <li key={i} className="break-inside-avoid">
                      {typeof a === 'string' ? a : (a.title || a.description || JSON.stringify(a))}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 9. Languages */}
            {languages.length > 0 && (
              <section className="mb-1 break-inside-avoid shrink-0">
                <h2 className={`${layoutTier === 'compact' ? 'text-[10px]' : 'text-[10.5px] sm:text-[11px]'} font-bold tracking-wider text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1 leading-none`}>
                  Languages
                </h2>
                <p className={`${layoutTier === 'compact' ? 'text-[9.5px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-800 font-medium leading-snug`}>
                  {languages.join('  •  ')}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
