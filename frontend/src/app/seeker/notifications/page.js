'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle,
  Clock,
  ArrowRight,
  Info,
  Calendar,
  Award,
} from 'lucide-react';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import userService from '../../../services/userService';
import Sidebar from '../../../components/Sidebar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Alert from '../../../components/Alert';
import { formatDate } from '../../../lib/utils';

export default function SeekerNotificationsPage() {
  const { user, isSeeker, loading: authLoading } = useRoleGuard('job_seeker');
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchNotifs = async () => {
    try {
      const res = await userService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to retrieve notifications.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isSeeker) {
      fetchNotifs();
    }
  }, [user, isSeeker]);

  const handleMarkAsRead = async (id) => {
    try {
      await userService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await userService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setAlert({ type: 'success', message: 'All notifications marked as read.' });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user || !isSeeker || loading) {
    return <LoadingSpinner text="Loading notifications..." />;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <Sidebar role="job_seeker" />

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Notifications</h1>
              <p className="text-xs text-slate-500 mt-1">
                Updates on your application status, interview schedules, and recruiter communications
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 border border-slate-200 text-blue-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors self-start"
              >
                Mark all as read
              </button>
            )}
          </div>

          {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

          {loading ? (
            <LoadingSpinner text="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <EmptyState
              title="No Notifications"
              description="You have no notifications at this time. Application updates and interview invitations will appear here."
              icon={Bell}
            />
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    !n.is_read
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        !n.is_read ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                  </div>

                  {n.link && (
                    <Link
                      href={n.link}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-blue-600 text-xs font-semibold flex items-center gap-1 shadow-sm flex-shrink-0"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
