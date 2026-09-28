'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SeekerIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/seeker/dashboard');
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <LoadingSpinner text="Redirecting to Candidate Dashboard..." />
    </div>
  );
}
