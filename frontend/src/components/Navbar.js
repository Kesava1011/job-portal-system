'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';
import {
  Briefcase,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Bookmark,
  FileText,
  Compass,
  LayoutDashboard,
  PlusCircle,
  Building,
  ShieldCheck,
  CheckCircle2,
  Users,
  Settings,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isSeeker, isRecruiter, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      userService.getNotifications()
        .then(res => {
          if (res.success) {
            setNotifications(res.notifications || []);
            setUnreadCount(res.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [user, pathname]);

  const handleMarkAllRead = async () => {
    try {
      await userService.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const isActive = (path) => pathname === path;
  const isPrefixActive = (path) => pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link
              href={isRecruiter ? "/recruiter/dashboard" : isSeeker ? "/seeker/dashboard" : "/"}
              className="flex items-center gap-2.5 font-bold text-xl text-slate-900 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="tracking-tight">
                Job<span className="text-blue-600 font-extrabold">Portal</span>
              </span>
            </Link>

            {/* Desktop Navigation Links - Role Aware */}
            <div className="hidden md:flex items-center gap-1">
              {/* RECRUITER Navigation: Only features relevant to recruiting. Find Jobs and Companies are completely excluded */}
              {isRecruiter && (
                <>
                  <Link
                    href="/recruiter/dashboard"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/recruiter/dashboard') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/recruiter/post-job"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/recruiter/post-job')
                        ? 'text-white bg-emerald-600 shadow-sm shadow-emerald-600/20'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Post a Job
                  </Link>
                  <Link
                    href="/recruiter/manage-jobs"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isPrefixActive('/recruiter/manage-jobs') || isPrefixActive('/recruiter/edit-job') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Manage Jobs
                  </Link>
                  <Link
                    href="/recruiter/applicants"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isPrefixActive('/recruiter/applicants') || isPrefixActive('/recruiter/candidate') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Candidate Pipeline
                  </Link>
                  <Link
                    href="/recruiter/company"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/recruiter/company') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Company Profile
                  </Link>
                </>
              )}

              {/* JOB SEEKER Navigation: Keeps Find Jobs, Companies, Dashboard, Applications, and AI Matches */}
              {isSeeker && (
                <>
                  <Link
                    href="/"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/seeker/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/seeker/dashboard') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/jobs"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/jobs') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Find Jobs
                  </Link>
                  <Link
                    href="/companies"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isPrefixActive('/companies') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Companies
                  </Link>
                  <Link
                    href="/seeker/applications"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/seeker/applications') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Applications
                  </Link>
                  <Link
                    href="/seeker/recommendations"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/seeker/recommendations') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    AI Matches
                  </Link>
                </>
              )}

              {/* ADMIN Navigation */}
              {isAdmin && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive('/admin/dashboard') ? 'text-purple-700 bg-purple-50' : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Admin Panel
                  </Link>
                  <Link
                    href="/admin/users"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/users') ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/recruiters"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/recruiters') ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Recruiters
                  </Link>
                  <Link
                    href="/admin/jobs"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/jobs') ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Manage Postings
                  </Link>
                  <Link
                    href="/admin/applications"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/applications') ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Applications
                  </Link>
                  <Link
                    href="/admin/companies"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/admin/companies') ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Companies
                  </Link>
                </>
              )}

              {/* GUEST Navigation (Unauthenticated) */}
              {!user && (
                <>
                  <Link
                    href="/"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/jobs"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/jobs') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Find Jobs
                  </Link>
                  <Link
                    href="/companies"
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isPrefixActive('/companies') ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Companies
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notification Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setUserDropdownOpen(false);
                    }}
                    className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                        <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              href={n.link || '#'}
                              onClick={() => setNotificationsOpen(false)}
                              className={`block p-3 hover:bg-slate-50 transition-colors ${
                                !n.is_read ? 'bg-blue-50/40' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(!userDropdownOpen);
                      setNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline-block text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                      {user.email}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-800 truncate">{user.email}</p>
                        <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider mt-0.5">
                          {user.role.replace('_', ' ')}
                        </p>
                      </div>

                      {/* Recruiter links: relevant to recruiting only */}
                      {isRecruiter && (
                        <div className="py-1">
                          <Link
                            href="/recruiter/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400" />
                            Dashboard
                          </Link>
                          <Link
                            href="/recruiter/post-job"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            <PlusCircle className="w-4 h-4 text-emerald-600" />
                            Post a Job
                          </Link>
                          <Link
                            href="/recruiter/manage-jobs"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            Manage Jobs
                          </Link>
                          <Link
                            href="/recruiter/applicants"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Users className="w-4 h-4 text-slate-400" />
                            Candidate Pipeline / Applicants
                          </Link>
                          <Link
                            href="/recruiter/company"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Building className="w-4 h-4 text-slate-400" />
                            Company Profile
                          </Link>
                          <Link
                            href="/recruiter/company"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            Profile / Settings
                          </Link>
                        </div>
                      )}

                      {/* Seeker links: keeps Dashboard, Find Jobs, Companies, Applications, Profile, Notifications, Settings */}
                      {isSeeker && (
                        <div className="py-1">
                          <Link
                            href="/seeker/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400" />
                            Dashboard
                          </Link>
                          <Link
                            href="/jobs"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            Find Jobs
                          </Link>
                          <Link
                            href="/companies"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Building className="w-4 h-4 text-slate-400" />
                            Companies
                          </Link>
                          <Link
                            href="/seeker/applications"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                            My Applications
                          </Link>
                          <Link
                            href="/seeker/profile"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            Profile / Resume
                          </Link>
                          <Link
                            href="/seeker/notifications"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Bell className="w-4 h-4 text-slate-400" />
                            Notifications
                          </Link>
                          <Link
                            href="/seeker/saved-jobs"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Bookmark className="w-4 h-4 text-slate-400" />
                            Saved Jobs
                          </Link>
                          <Link
                            href="/seeker/resume-builder"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <FileText className="w-4 h-4 text-slate-400" />
                            Resume Builder
                          </Link>
                          <Link
                            href="/seeker/profile"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            Settings
                          </Link>
                        </div>
                      )}

                      {/* Admin links */}
                      {isAdmin && (
                        <div className="py-1">
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            Admin Overview
                          </Link>
                          <Link
                            href="/admin/users"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            Manage Users
                          </Link>
                          <Link
                            href="/admin/recruiters"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Users className="w-4 h-4 text-slate-400" />
                            Manage Recruiters
                          </Link>
                          <Link
                            href="/admin/jobs"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            Manage Postings
                          </Link>
                          <Link
                            href="/admin/applications"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                            Applications
                          </Link>
                          <Link
                            href="/admin/companies"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Building className="w-4 h-4 text-slate-400" />
                            Companies
                          </Link>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown - Role Aware */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-1">
            {/* Guest Mobile Menu */}
            {!user && (
              <>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Home
                </Link>
                <Link
                  href="/jobs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Find Jobs
                </Link>
                <Link
                  href="/companies"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Companies
                </Link>
              </>
            )}

            {/* Recruiter Mobile Menu: Excludes Find Jobs & Companies, focuses on recruiting */}
            {isRecruiter && (
              <>
                <Link
                  href="/recruiter/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/recruiter/post-job"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 font-semibold"
                >
                  Post a Job
                </Link>
                <Link
                  href="/recruiter/manage-jobs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage Jobs
                </Link>
                <Link
                  href="/recruiter/applicants"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Candidate Pipeline / Applicants
                </Link>
                <Link
                  href="/recruiter/company"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Company Profile
                </Link>
                <Link
                  href="/recruiter/company"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Profile / Settings
                </Link>
              </>
            )}

            {/* Seeker Mobile Menu: Keeps Find Jobs, Companies, Dashboard, Applications, Profile, Notifications, Settings */}
            {isSeeker && (
              <>
                <Link
                  href="/seeker/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/jobs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Find Jobs
                </Link>
                <Link
                  href="/companies"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Companies
                </Link>
                <Link
                  href="/seeker/applications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  My Applications
                </Link>
                <Link
                  href="/seeker/recommendations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  AI Recommendations
                </Link>
                <Link
                  href="/seeker/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Profile / Resume
                </Link>
                <Link
                  href="/seeker/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Notifications
                </Link>
                <Link
                  href="/seeker/resume-builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Resume Builder
                </Link>
                <Link
                  href="/seeker/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Settings
                </Link>
              </>
            )}

            {/* Admin Mobile Menu */}
            {isAdmin && (
              <>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 font-semibold"
                >
                  Admin Panel
                </Link>
                <Link
                  href="/admin/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage Users
                </Link>
                <Link
                  href="/admin/recruiters"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage Recruiters
                </Link>
                <Link
                  href="/admin/jobs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage Postings
                </Link>
                <Link
                  href="/admin/applications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Applications
                </Link>
                <Link
                  href="/admin/companies"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Companies
                </Link>
              </>
            )}

            {/* Mobile Sign out */}
            {user && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
