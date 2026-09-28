'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import adminService from '../../../services/adminService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Alert from '../../../components/Alert';
import EmptyState from '../../../components/EmptyState';
import { formatDate } from '../../../lib/utils';

export default function AdminUsersPage() {
  const { user, isAdmin, loading: authLoading } = useRoleGuard('admin');
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        role: roleFilter,
        status: statusFilter,
        search,
      });
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve user accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin, roleFilter, statusFilter, search]);

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await adminService.updateUserStatus(targetUser.id, nextStatus);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
        );
        setAlert({ type: 'success', message: `User status changed to ${nextStatus}.` });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update user status.' });
    }
  };

  if (authLoading || !user || !isAdmin) {
    return <LoadingSpinner text="Checking authorization..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="admin" />

        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">User Account Governance</h1>
            <p className="text-xs text-slate-500 mt-1">
              Audit all registered candidates, recruiters, and administrative accounts
            </p>
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {/* Filters Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by email, candidate name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="w-full md:w-44">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="All">All Roles</option>
                <option value="job_seeker">Job Seekers</option>
                <option value="recruiter">Recruiters</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            <div className="w-full md:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            {loading ? (
              <LoadingSpinner text="Loading users..." />
            ) : users.length === 0 ? (
              <EmptyState
                title="No user accounts found"
                description="Try clearing your search query or adjusting role and status filters."
                icon={Users}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">User ID</th>
                      <th className="p-3">User & Contact</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Company / Organization</th>
                      <th className="p-3">Registered</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-xl text-right">Access Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400">#{u.id}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : 'User'}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'recruiter'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 font-medium">{u.company_name || '—'}</td>
                        <td className="p-3 text-slate-400">{formatDate(u.created_at)}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                                u.status === 'active'
                                  ? 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
