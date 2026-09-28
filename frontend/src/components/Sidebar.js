'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Briefcase,
  Bookmark,
  Sparkles,
  FileText,
  Bell,
  Building,
  Users,
  CheckCircle2,
  PlusCircle,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export default function Sidebar({ role }) {
  const pathname = usePathname();

  let navItems = [];

  if (role === 'job_seeker') {
    navItems = [
      { label: 'Dashboard', href: '/seeker/dashboard', icon: LayoutDashboard },
      { label: 'Find Jobs', href: '/jobs', icon: Briefcase },
      { label: 'Companies', href: '/companies', icon: Building },
      { label: 'My Applications', href: '/seeker/applications', icon: CheckCircle2 },
      { label: 'Profile / Resume', href: '/seeker/profile', icon: User },
      { label: 'Saved Jobs', href: '/seeker/saved-jobs', icon: Bookmark },
      { label: 'AI Recommendations', href: '/seeker/recommendations', icon: Sparkles, badge: 'Smart' },
      { label: 'Resume Files', href: '/seeker/resume', icon: FileText },
      { label: 'Resume Builder', href: '/seeker/resume-builder', icon: FileText },
      { label: 'Notifications', href: '/seeker/notifications', icon: Bell },
      { label: 'Settings', href: '/seeker/profile', icon: Settings },
    ];
  } else if (role === 'recruiter') {
    navItems = [
      { label: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
      { label: 'Post a Job', href: '/recruiter/post-job', icon: PlusCircle },
      { label: 'Manage Jobs', href: '/recruiter/manage-jobs', icon: Briefcase },
      { label: 'Candidate Pipeline / Applicants', href: '/recruiter/applicants', icon: Users },
      { label: 'Company Profile', href: '/recruiter/company', icon: Building },
      { label: 'Profile / Settings', href: '/recruiter/company', icon: Settings },
    ];
  } else if (role === 'admin') {
    navItems = [
      { label: 'System Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Manage Users', href: '/admin/users', icon: Users },
      { label: 'Manage Recruiters', href: '/admin/recruiters', icon: Users },
      { label: 'Manage Jobs', href: '/admin/jobs', icon: Briefcase },
      { label: 'All Applications', href: '/admin/applications', icon: CheckCircle2 },
      { label: 'Companies', href: '/admin/companies', icon: Building },
    ];
  }

  return (
    <aside className="w-full lg:w-64 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm self-start">
      <div className="mb-4 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</p>
        <p className="text-xs font-semibold text-slate-700 capitalize mt-0.5">
          {(role || '').replace('_', ' ')} Workspace
        </p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isExact = pathname === item.href;
          const isChild = item.href !== '/' &&
            item.href !== '/seeker/dashboard' &&
            item.href !== '/recruiter/dashboard' &&
            item.href !== '/admin/dashboard' &&
            item.href !== '/seeker/profile' &&
            item.href !== '/recruiter/company' &&
            pathname.startsWith(item.href);
          const isActive = isExact || isChild;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
