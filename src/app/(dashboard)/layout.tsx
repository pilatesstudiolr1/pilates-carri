'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUser } from '@/hooks/useUser';
import { PageLoader } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  const userRole = profile?.role || 'ADMIN';

  return (
    <ToastProvider>
      <div className="min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar userRole={userRole} profile={profile} />
        </div>

        {/* Mobile Nav */}
        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          userRole={userRole}
        />

        {/* Main content */}
        <div className="lg:pl-[var(--sidebar-width)] transition-all duration-[var(--transition-slow)]">
          <Header
            profile={profile}
            onMenuClick={() => setMobileNavOpen(true)}
          />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
