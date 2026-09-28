'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  Search,
  MapPin,
  Briefcase,
  Globe,
  Users,
  Calendar,
  ArrowRight,
  Filter,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import companyService from '../../services/companyService';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Alert from '../../components/Alert';

function CompaniesContent() {
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [industry, setIndustry] = useState(searchParams.get('industry') || 'All');
  const [location, setLocation] = useState(searchParams.get('location') || '');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companyService.getCompanies({
        search,
        industry: industry !== 'All' ? industry : undefined,
        location,
      });

      if (res.success) {
        setCompanies(res.companies || []);
        if (res.industries && res.industries.length > 0) {
          setIndustries(res.industries);
        }
      } else {
        setAlert({ type: 'error', message: res.message || 'Failed to fetch companies.' });
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Unable to connect to company directory service.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [industry]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCompanies();
  };

  const handleResetFilters = () => {
    setSearch('');
    setIndustry('All');
    setLocation('');
    companyService.getCompanies({ search: '', industry: undefined, location: '' })
      .then((res) => {
        if (res.success) setCompanies(res.companies || []);
      })
      .catch(console.error);
  };

  // Calculate stats
  const totalOpenJobs = companies.reduce((acc, c) => acc + (parseInt(c.active_jobs_count) || 0), 0);
  const totalHiringCompanies = companies.filter((c) => parseInt(c.active_jobs_count) > 0).length;

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white p-8 sm:p-12 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_50%)]" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Verified Employer Directory
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Explore Leading <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Companies & Culture</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Research world-class companies, discover workplace benefits, and apply directly to verified open positions.
            </p>

            {/* Quick Metrics */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span><strong className="text-white text-sm font-black">{companies.length}</strong> Companies Listed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span><strong className="text-white text-sm font-black">{totalOpenJobs}</strong> Active Open Vacancies</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span><strong className="text-white text-sm font-black">{totalHiringCompanies}</strong> Actively Hiring</span>
              </div>
            </div>
          </div>
        </div>

        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search companies by name or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Industry Filter Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="All">All Industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Input */}
            <div className="sm:col-span-2 relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Submit & Reset Buttons */}
            <div className="sm:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors text-center"
              >
                Search
              </button>
              {(search || industry !== 'All' || location) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
                  title="Clear filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading verified companies directory..." />
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            title="No Companies Found"
            description="We couldn't find any companies matching your search criteria. Try modifying your search keywords or resetting filters."
            actionText="Reset Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((comp) => {
              const activeJobs = parseInt(comp.active_jobs_count) || 0;

              return (
                <div
                  key={comp.id}
                  className="group bg-white rounded-3xl border border-slate-200 hover:border-blue-400 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Logo, Name, Industry */}
                    <div className="flex items-start gap-4">
                      {comp.logo_url ? (
                        <img
                          src={comp.logo_url}
                          alt={comp.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md flex-shrink-0">
                          {comp.name ? comp.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <Link href={`/companies/${comp.id}`}>
                          <h2 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {comp.name}
                          </h2>
                        </Link>
                        {comp.industry && (
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {comp.industry}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500">
                      {comp.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {comp.location}
                        </span>
                      )}
                      {comp.company_size && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {comp.company_size}
                        </span>
                      )}
                      {comp.founded_year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Founded {comp.founded_year}
                        </span>
                      )}
                    </div>

                    {/* Description snippet */}
                    {comp.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {comp.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Action Card */}
                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-emerald-600" />
                      {activeJobs > 0 ? (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          {activeJobs} {activeJobs === 1 ? 'Job' : 'Jobs'} Open
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                          No Active Jobs
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/companies/${comp.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 hover:underline"
                    >
                      View Profile <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading companies directory..." />}>
      <CompaniesContent />
    </Suspense>
  );
}
