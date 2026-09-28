'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  Globe,
  MapPin,
  Users,
  Calendar,
  Save,
  ImageIcon,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';

export default function RecruiterCompanyPage() {
  const { user, isRecruiter, loading: authLoading } = useRoleGuard('recruiter');
  const router = useRouter();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    website: '',
    industry: '',
    companySize: '',
    location: '',
    description: '',
    foundedYear: '',
  });

  const fetchCompany = async () => {
    try {
      const res = await userService.getMyCompany();
      if (res.success && res.company) {
        setCompany(res.company);
        setFormData({
          name: res.company.name || '',
          logoUrl: res.company.logo_url || '',
          website: res.company.website || '',
          industry: res.company.industry || '',
          companySize: res.company.company_size || '',
          location: res.company.location || '',
          description: res.company.description || '',
          foundedYear: res.company.founded_year || '',
        });
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'warning', message: 'You have not linked a company profile yet. Fill the details below to create one.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isRecruiter) {
      fetchCompany();
    }
  }, [user, isRecruiter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setAlert({ type: 'warning', message: 'Company name is required.' });
      return;
    }

    setSaving(true);
    setAlert(null);
    try {
      const res = await userService.updateMyCompany(formData);
      if (res.success) {
        setAlert({ type: 'success', message: 'Company profile updated successfully!' });
        fetchCompany();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update company.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || !isRecruiter || loading) {
    return <LoadingSpinner text="Loading company information..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="recruiter" />

        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Company Profile</h1>
            <p className="text-xs text-slate-500 mt-1">
              Customize employer branding, industry credentials, and company background visible to candidates
            </p>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Organization Credentials
              </h3>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Company Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Microsoft, Stripe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
                <input
                  type="url"
                  placeholder="https://company.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Technology & Cloud, Fintech, Healthcare"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Size</label>
                <select
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select size</option>
                  <option value="1-50 employees">1-50 employees</option>
                  <option value="50-200 employees">50-200 employees</option>
                  <option value="200-1,000 employees">200-1,000 employees</option>
                  <option value="1,000-5,000 employees">1,000-5,000 employees</option>
                  <option value="5,000-10,000 employees">5,000-10,000 employees</option>
                  <option value="10,000+ employees">10,000+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headquarters Location</label>
                <input
                  type="text"
                  placeholder="e.g. Mountain View, CA / Remote"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Founded Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2010"
                  value={formData.foundedYear}
                  onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL</label>
              <input
                type="url"
                placeholder="https://... logo image link"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">About Company (Overview)</label>
              <textarea
                rows={4}
                placeholder="Describe your company mission, culture, engineering stack, and benefits..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
