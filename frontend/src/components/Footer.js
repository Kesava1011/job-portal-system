import React from 'react';
import Link from 'next/link';
import { Briefcase, Heart, Globe, Share2, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </div>
              <span>Job<span className="text-blue-500">Portal</span></span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              A comprehensive full-stack Job Portal System designed for connecting top talent with industry leaders.
            </p>
            <div className="flex items-center gap-3 pt-2 text-slate-400">
              <a href="#" className="hover:text-white transition-colors"><Globe className="w-4 h-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Share2 className="w-4 h-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Mail className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Job Seekers</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/jobs" className="hover:text-white transition-colors">Search Jobs</Link></li>
              <li><Link href="/seeker/dashboard" className="hover:text-white transition-colors">Seeker Dashboard</Link></li>
              <li><Link href="/seeker/recommendations" className="hover:text-white transition-colors">AI Skill Match</Link></li>
              <li><Link href="/seeker/resume-builder" className="hover:text-white transition-colors">Resume Builder</Link></li>
              <li><Link href="/seeker/applications" className="hover:text-white transition-colors">Track Applications</Link></li>
            </ul>
          </div>

          {/* Employers */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Recruiters</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/recruiter/post-job" className="hover:text-white transition-colors">Post a New Job</Link></li>
              <li><Link href="/recruiter/dashboard" className="hover:text-white transition-colors">Recruitment Analytics</Link></li>
              <li><Link href="/recruiter/applicants" className="hover:text-white transition-colors">Candidate Search</Link></li>
              <li><Link href="/recruiter/company" className="hover:text-white transition-colors">Company Branding</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Recruiter Sign In</Link></li>
            </ul>
          </div>

          {/* College Project details */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Project Specs</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              College Web Development Project built with Next.js, Express.js, PostgreSQL, JWT Authentication, and Chart.js.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-[11px] text-blue-400 font-mono">
              <span>Status: Production Ready</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Job Portal System. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Academic Excellence
          </p>
        </div>
      </div>
    </footer>
  );
}
