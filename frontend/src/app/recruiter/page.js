'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function RecruiterIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/recruiter/dashboard');
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <LoadingSpinner text="Redirecting to Recruiter Dashboard..." />
    </div>
  );
}
