'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  Sparkles,
  ArrowRight,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { formatSalary, formatTimeAgo, getMatchScoreColor } from '../lib/utils';
import applicationService from '../services/applicationService';
import { useAuth } from '../hooks/useAuth';

export default function JobCard({ job, onApplyClick, onSaveToggle }) {
  const { user, isSeeker, isRecruiter } = useAuth();
  const [isSaved, setIsSaved] = useState(job.isSaved || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !isSeeker) {
      window.location.href = '/login';
      return;
    }

    try {
      setSaving(true);
      const res = await applicationService.toggleSaveJob(job.id);
      if (res.success) {
        setIsSaved(res.isSaved);
        if (onSaveToggle) onSaveToggle(job.id, res.isSaved);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative flex flex-col justify-between">
      <div>
        {/* Top Header: Logo, Company, Title, Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            {job.company_logo ? (
              <img
                src={job.company_logo}
                alt={job.company_name || 'Company'}
                className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div>
              {job.company_id ? (
                <Link
                  href={`/companies/${job.company_id}`}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors inline-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {job.company_name || 'Hiring Company'}
                </Link>
              ) : (
                <p className="text-xs font-semibold text-slate-500">{job.company_name || 'Hiring Company'}</p>
              )}
              <Link href={`/jobs/${job.id}`}>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {job.title}
                </h3>
              </Link>
            </div>
          </div>

          {/* Bookmark Button */}
          {!isRecruiter && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`p-2 rounded-xl border transition-all ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300'
              }`}
              title={isSaved ? 'Saved to bookmarks' : 'Save job'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Match Percentage Badge (if available from AI / Seeker Profile) */}
        {job.match && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getMatchScoreColor(
                job.match.matchPercentage
              )}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {job.match.matchLabel || `${job.match.matchPercentage}% Match`}
            </span>
            {job.match.matchedSkills?.length > 0 && (
              <span className="text-[11px] text-slate-400 truncate">
                Matches: {job.match.matchedSkills.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Job Metadata Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {job.location}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-700 font-medium">
            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            {job.job_type}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-700 font-semibold">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            {formatSalary(job.min_salary, job.max_salary)}
          </span>
        </div>

        {/* Description Snippet */}
        <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Skills Tags */}
        {job.skills && job.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 4).map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
              >
                {typeof s === 'string' ? s : s.name}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] text-slate-400 font-medium">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Details & Action Button */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatTimeAgo(job.created_at)}
        </span>

        <div className="flex items-center gap-2">
          {isRecruiter ? (
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              View Details
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href={`/jobs/${job.id}`}
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Details
              </Link>
              {job.hasApplied ? (
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                  Applied
                </span>
              ) : (
                <button
                  onClick={() => onApplyClick ? onApplyClick(job) : null}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all hover:gap-1.5"
                >
                  Apply
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
