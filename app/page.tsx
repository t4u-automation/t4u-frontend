'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import OnboardingScreen from '@/components/OnboardingScreen';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, needsOnboarding, completeTenantSetup } = useTenant(user);
  const router = useRouter();

  const loading = authLoading || tenantLoading;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (tenant && !needsOnboarding) {
        router.push('/projects');
      }
      // If needsOnboarding, stay on this page to show onboarding
    }
  }, [user, loading, tenant, needsOnboarding, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  // Show onboarding if tenant needs setup
  if (user && needsOnboarding) {
    return <OnboardingScreen onSubmit={completeTenantSetup} />;
  }

  // Default loading (while redirecting)
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
      <div className="text-[var(--text-tertiary)]">Loading...</div>
    </div>
  );
}
