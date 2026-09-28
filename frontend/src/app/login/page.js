'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Alert from '../../components/Alert';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'recruiter') {
        router.replace('/recruiter/dashboard');
      } else {
        router.replace('/seeker/dashboard');
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setAlert({ type: 'warning', message: 'Please enter both email and password.' });
      return;
    }

    setLoading(true);
    setAlert(null);
    try {
      const loggedUser = await login(email, password);
      // Route based on role
      if (loggedUser.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (loggedUser.role === 'recruiter') {
        router.replace('/recruiter/dashboard');
      } else {
        router.replace('/seeker/dashboard');
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Invalid credentials. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // One-click demo credentials autofill
  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setAlert(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-slate-900">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <span>Job<span className="text-blue-600">Portal</span></span>
          </Link>
          <h2 className="mt-4 text-2xl font-black text-slate-900">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your jobs, applications, or candidate talent pool
          </p>
        </div>

        {/* Quick Demo Credentials Panel */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>One-Click Demo Evaluator Access</span>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            Click any role below to automatically fill pre-seeded test accounts:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="quick-fill-candidate"
              aria-label="Quick fill candidate credentials"
              suppressHydrationWarning
              onClick={() => handleQuickFill('seeker@example.com', 'password123')}
              className="p-2 bg-white hover:bg-blue-100/60 border border-blue-200 rounded-xl text-center transition-colors group"
            >
              <User className="w-4 h-4 mx-auto text-blue-600 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-slate-800 mt-1">Candidate</p>
              <p className="text-[9px] text-slate-400">Alex Johnson</p>
            </button>

            <button
              type="button"
              id="quick-fill-recruiter"
              aria-label="Quick fill recruiter credentials"
              suppressHydrationWarning
              onClick={() => handleQuickFill('recruiter@google.com', 'password123')}
              className="p-2 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-xl text-center transition-colors group"
            >
              <Building className="w-4 h-4 mx-auto text-emerald-600 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-slate-800 mt-1">Recruiter</p>
              <p className="text-[9px] text-slate-400">Google Lead</p>
            </button>

            <button
              type="button"
              id="quick-fill-admin"
              aria-label="Quick fill admin credentials"
              suppressHydrationWarning
              onClick={() => handleQuickFill('admin@jobportal.com', 'password123')}
              className="p-2 bg-white hover:bg-purple-100/60 border border-purple-200 rounded-xl text-center transition-colors group"
            >
              <ShieldCheck className="w-4 h-4 mx-auto text-purple-600 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-slate-800 mt-1">Admin</p>
              <p className="text-[9px] text-slate-400">Full System</p>
            </button>
          </div>
        </div>

        {/* Main Login Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  suppressHydrationWarning
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">Password</label>
                <span className="text-[11px] text-slate-400">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  suppressHydrationWarning
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-bold text-blue-600 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
