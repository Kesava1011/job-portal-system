'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Briefcase,
  Sparkles,
  TrendingUp,
  Building,
  Users,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Code,
  Layers,
  Database,
  Smartphone,
  Cpu,
} from 'lucide-react';
import jobService from '../services/jobService';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobService.getJobs({ limit: 4 })
      .then((res) => {
        if (res.success) {
          setFeaturedJobs(res.jobs || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (keyword.trim()) query.append('keyword', keyword.trim());
    if (location.trim()) query.append('location', location.trim());
    router.push(`/jobs?${query.toString()}`);
  };

  const categories = [
    { title: 'Full Stack Engineering', count: '45+ Jobs', icon: Code, color: 'bg-blue-50 text-blue-600' },
    { title: 'Cloud & DevOps', count: '28+ Jobs', icon: Layers, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Database & Backend', count: '32+ Jobs', icon: Database, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Mobile & Frontend', count: '39+ Jobs', icon: Smartphone, color: 'bg-amber-50 text-amber-600' },
    { title: 'AI & Data Science', count: '19+ Jobs', icon: Cpu, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart AI Skill-Matching Job Portal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Discover Your Next <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dream Career</span> Opportunity
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Match candidate skills with job requirements automatically, build professional resumes, and streamline recruitment from application to selection.
            </p>

            {/* Quick Demo Test Access Banner */}
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 p-2 bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm text-xs">
              <span className="font-semibold text-slate-500 pl-2">One-Click Demo Roles:</span>
              <Link href="/login" className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors">
                Candidate Demo
              </Link>
              <Link href="/login" className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition-colors">
                Recruiter Demo
              </Link>
              <Link href="/login" className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold transition-colors">
                Admin Demo
              </Link>
            </div>

            {/* Search Bar Form */}
            <form
              onSubmit={handleSearch}
              className="mt-8 p-3 bg-white rounded-3xl shadow-xl shadow-blue-500/10 border border-slate-200 flex flex-col md:flex-row items-center gap-3 max-w-4xl mx-auto"
            >
              <div className="flex items-center gap-3 w-full md:w-1/2 px-4 py-2 border-b md:border-b-0 md:border-r border-slate-100">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Job title, skills (e.g. React, Node.js), or company"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-1/3 px-4 py-2">
                <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Location or 'Remote'"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                <Search className="w-4 h-4" />
                Search Jobs
              </button>
            </form>

            {/* Popular tags */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Trending Skills:</span>
              {['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'AWS'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => router.push(`/jobs?keyword=${encodeURIComponent(tag)}`)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-5xl mx-auto">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
              <p className="text-3xl font-black text-slate-900">500+</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Verified Jobs</p>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
              <p className="text-3xl font-black text-blue-600">92%</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Match Accuracy</p>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
              <p className="text-3xl font-black text-emerald-600">120+</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Companies</p>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
              <p className="text-3xl font-black text-indigo-600">1,400+</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Hired Candidates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Popular Tech Sectors</h2>
            <p className="text-xs text-slate-500 mt-1">Explore opportunities by tech specialization</p>
          </div>
          <Link
            href="/jobs"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            All Sectors <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                onClick={() => router.push(`/jobs?keyword=${encodeURIComponent(cat.title)}`)}
                className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cat.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{cat.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Latest Opportunities</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Job Openings</h2>
            <p className="text-xs text-slate-500 mt-1">Top hand-picked roles from trusted tech companies</p>
          </div>
          <Link
            href="/jobs"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            Browse All Jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading featured jobs..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApplyClick={() => router.push(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-900 text-white py-16 rounded-3xl mx-4 sm:mx-8 max-w-7xl lg:mx-auto px-6 sm:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Streamlined Workflow</span>
          <h2 className="text-3xl font-black tracking-tight mt-2">How Job Portal Operates</h2>
          <p className="text-xs text-slate-400 mt-2">
            An end-to-end relational system designed for maximum clarity, role compliance, and candidate matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg mx-auto mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-white mb-2">Build Profile & Skills</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Input your education, experience, portfolio links, and technical skill proficiencies. Use the built-in Resume Builder to generate a modern CV.
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg mx-auto mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-white mb-2">AI Skill Match & Apply</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our algorithm analyzes required vs candidate skills to deliver an exact match percentage (e.g. 88% Match) and highlights missing skills.
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg mx-auto mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-white mb-2">Realtime Lifecycle Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track progress from Applied → Under Review → Shortlisted → Interview → Selected. Recruiters review candidate metrics in real time.
            </p>
          </div>
        </div>
      </section>

      {/* Dual CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">For Job Seekers</span>
              <h3 className="text-2xl font-black mt-2">Looking for your dream job?</h3>
              <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                Create your candidate account, compare your skills against vacancies with instant AI percentages, and apply with custom resumes.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/register?role=job_seeker"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-bold text-xs rounded-xl shadow hover:bg-blue-50 transition-colors"
              >
                Sign Up as Candidate <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-lg border border-slate-700 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">For Employers</span>
              <h3 className="text-2xl font-black mt-2">Hiring Top Engineering Talent?</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Post job openings, specify technical requirements, manage applicant pipelines, review resumes, and schedule candidate interviews.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/register?role=recruiter"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                Register as Recruiter <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
