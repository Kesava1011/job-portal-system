'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Filter,
  X,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import jobService from '../../services/jobService';
import JobCard from '../../components/JobCard';
import ApplyJobModal from '../../components/ApplyJobModal';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { JOB_TYPES } from '../../types';

function JobsContent() {
  const searchParams = useSearchParams();
  const { user, isSeeker, isRecruiter } = useAuth();

  // Filter states
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [jobType, setJobType] = useState('All');
  const [experience, setExperience] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [skill, setSkill] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);

  // Data states
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Apply Modal states
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [alert, setAlert] = useState(null);
  const [modalAlert, setModalAlert] = useState(null);

  // Fetch jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await jobService.getJobs({
        keyword,
        location,
        jobType,
        experience,
        minSalary,
        skill,
        sort,
        page,
        limit: 8,
      });
      if (res.success) {
        setJobs(res.jobs || []);
        setPagination(res.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load jobs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [keyword, location, jobType, experience, minSalary, skill, sort, page]);

  // Open apply modal
  const handleOpenApplyModal = (job) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (isRecruiter) {
      setAlert({ type: 'warning', message: 'Recruiters cannot apply for jobs. Please manage postings from your Recruiter Dashboard.' });
      return;
    }
    if (!isSeeker) {
      setAlert({ type: 'warning', message: 'Only job seekers can apply for jobs.' });
      return;
    }

    setSelectedJob(job);
    setIsApplyModalOpen(true);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setLocation('');
    setJobType('All');
    setExperience('');
    setMinSalary('');
    setSkill('');
    setSort('latest');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Explore Job Opportunities</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse {pagination.total} active positions across top tech organizations
          </p>
        </div>

        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="md:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm self-start"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Toggle Filters
        </button>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside
          className={`lg:block ${
            mobileFilterOpen ? 'block' : 'hidden'
          } bg-white rounded-3xl border border-slate-200 p-6 shadow-sm self-start space-y-6`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              Filter Openings
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset All
            </button>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Search Keyword</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Title or keywords"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Location</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="City, State, or Remote"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Job Type</label>
            <select
              value={jobType}
              onChange={(e) => {
                setJobType(e.target.value);
                setPage(1);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Required */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Max Experience Required: {experience ? `${experience} yrs` : 'Any'}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={experience || 0}
              onChange={(e) => {
                setExperience(e.target.value === '0' ? '' : e.target.value);
                setPage(1);
              }}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Any</span>
              <span>2 yrs</span>
              <span>5 yrs</span>
              <span>10+ yrs</span>
            </div>
          </div>

          {/* Min Salary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Min Salary (USD / yr)</label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                placeholder="e.g. 80000"
                value={minSalary}
                onChange={(e) => {
                  setMinSalary(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Specific Skill Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Skill Filter</label>
            <input
              type="text"
              placeholder="e.g. React, PostgreSQL, Docker"
              value={skill}
              onChange={(e) => {
                setSkill(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Sort Results</label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="latest">Latest First</option>
              <option value="salary">Highest Salary</option>
              <option value="deadline">Application Deadline</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </aside>

        {/* Jobs List Grid */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-800">{jobs.length}</strong> of{' '}
              <strong className="text-slate-800">{pagination.total}</strong> results
            </span>
            {isSeeker && (
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                AI Match percentage enabled
              </span>
            )}
          </div>

          {loading ? (
            <LoadingSpinner text="Searching jobs matching your criteria..." />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No jobs matched your search"
              description="Try adjusting your filters, location, or search keywords to see more results."
              actionText="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApplyClick={handleOpenApplyModal}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={pagination.page || 1}
            totalPages={pagination.totalPages || 1}
            onPageChange={(p) => setPage(p)}
          />
        </main>
      </div>

      {/* Apply Modal */}
      {modalAlert && (
        <Alert type={modalAlert.type} message={modalAlert.message} onClose={() => setModalAlert(null)} />
      )}
      {!isRecruiter && selectedJob && isApplyModalOpen && (
        <ApplyJobModal
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setModalAlert(null);
          }}
          job={selectedJob}
          onSuccess={(res) => {
            const successMsg = res.message || 'Application submitted successfully!';
            setAlert({ type: 'success', message: successMsg });
            setJobs((prev) =>
              prev.map((j) => (j.id === selectedJob.id ? { ...j, hasApplied: true } : j))
            );
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        />
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading jobs..." />}>
      <JobsContent />
    </Suspense>
  );
}
