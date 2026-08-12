'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUser } from '@/hooks/useUser';
import { PageLoader } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { SedeProvider } from '@/hooks/useSede';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile?.role === 'PROFESORA') {
      const allowedForProfesora = ['/profesora', '/portal'];
      const isAllowed = allowedForProfesora.some((p) => pathname === p || pathname.startsWith(p + '/'));
      if (!isAllowed) {
        router.replace('/profesora');
      }
    }
  }, [loading, profile?.role, pathname, router]);

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
      <ConfirmProvider>
        <SedeProvider>
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
        </SedeProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

