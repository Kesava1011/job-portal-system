'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Building,
  Mail,
  Phone,
  Briefcase,
  Search,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import adminService from '../../../services/adminService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';
import { formatDate } from '../../../lib/utils';

export default function AdminRecruitersPage() {
  const { user, isAdmin, loading: authLoading } = useRoleGuard('admin');
  const router = useRouter();

  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ role: 'recruiter', search });
      if (res.success) {
        setRecruiters(res.users || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve recruiters list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchRecruiters();
    }
  }, [user, isAdmin, search]);

  if (authLoading || !user || !isAdmin) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="admin" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Manage Recruiters</h1>
              <p className="text-xs text-slate-500 mt-1">
                Employer partners and talent acquisition leads posting job openings
              </p>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Search Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
            <input
              type="text"
              placeholder="Search recruiter name, company, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          {/* Recruiters Cards Grid */}
          {loading ? (
            <LoadingSpinner text="Loading recruiters..." />
          ) : recruiters.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <EmptyState
                title="No recruiters found"
                description="Try clearing your search query or check back later."
                icon={Users}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recruiters.map((r) => (
                <div key={r.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-base flex items-center justify-center border border-emerald-100">
                        {r.first_name?.charAt(0) || 'R'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{r.first_name} {r.last_name}</h3>
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                          {r.company_name || 'Independent Recruiter'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {r.email}
                    </p>
                    {r.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {r.phone}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 pt-1">
                      Joined {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
