'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

/**
 * Hook to enforce authentication and role-based frontend route protection.
 * - Redirects unauthenticated users to /login
 * - Redirects authenticated users accessing another role's routes to their appropriate dashboard
 * - Prevents infinite redirect loops using replace() and stable role dependencies
 * - Shields the wrapped component by reporting loading=true when unauthorized
 */
export function useRoleGuard(allowedRoles) {
  const { user, loading: authLoading, isSeeker, isRecruiter, isAdmin } = useAuth();
  const router = useRouter();
  const redirectingRef = useRef(false);

  // Normalize allowed roles with a stable serialization key to avoid re-triggering on array literals
  const allowedKey = Array.isArray(allowedRoles) ? allowedRoles.join(',') : String(allowedRoles);
  const normalizedAllowedRoles = useMemo(() => {
    const list = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return list.map((r) => (r === 'candidate' ? 'job_seeker' : r));
  }, [allowedKey]);

  const userRole = user?.role === 'candidate' ? 'job_seeker' : user?.role;

  const isAllowed = useMemo(() => {
    if (!user || !userRole) return false;
    // Admins have overarching access or explicitly check normalized roles
    return normalizedAllowedRoles.includes(userRole) || (userRole === 'admin' && normalizedAllowedRoles.includes('admin'));
  }, [user, userRole, normalizedAllowedRoles]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        router.replace('/login');
      }
      return;
    }

    if (!isAllowed) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        if (userRole === 'admin') {
          router.replace('/admin/dashboard');
        } else if (userRole === 'recruiter') {
          router.replace('/recruiter/dashboard');
        } else {
          router.replace('/seeker/dashboard');
        }
      }
    } else {
      redirectingRef.current = false;
    }
  }, [user, userRole, authLoading, isAllowed, router]);

  // If user is unauthorized, keep loading=true to shield component until router.replace finishes
  const effectiveLoading = authLoading || !user || !isAllowed;

  return {
    user,
    loading: effectiveLoading,
    isAllowed,
    isSeeker,
    isRecruiter,
    isAdmin,
  };
}
