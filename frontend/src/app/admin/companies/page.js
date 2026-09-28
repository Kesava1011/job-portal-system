'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  Globe,
  MapPin,
  Users,
  Search,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';

export default function AdminCompaniesPage() {
  const { user, isAdmin, loading: authLoading } = useRoleGuard('admin');
  const router = useRouter();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await userService.getCompanies(search);
      if (res.success) {
        setCompanies(res.companies || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve companies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchCompanies();
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
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Partner Companies</h1>
              <p className="text-xs text-slate-500 mt-1">
                Organizations with active profiles and job postings on the portal
              </p>
            </div>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Search Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-7 top-7" />
            <input
              type="text"
              placeholder="Search by company name, industry, or headquarters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          {/* Companies Cards Grid */}
          {loading ? (
            <LoadingSpinner text="Loading companies..." />
          ) : companies.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <EmptyState
                title="No partner companies found"
                description="Try clearing your search keyword or check back later."
                icon={Building}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((c) => (
                <div key={c.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={c.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 font-bold text-base flex items-center justify-center border border-purple-100">
                          {c.name?.charAt(0) || 'C'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{c.name}</h3>
                        <p className="text-xs text-slate-500">{c.industry || 'Technology'} • {c.company_size || 'Global'}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {c.active_jobs_count || 0} Jobs
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {c.description || 'No description provided.'}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.location || 'Headquarters'}
                    </span>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
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
