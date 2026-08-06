'use client';

import { cn, getInitials } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, MapPin, Menu } from 'lucide-react';
import { useState } from 'react';
import type { Profile } from '@/types';

interface HeaderProps {
  profile: Profile | null;
  sedeName?: string;
  onMenuClick?: () => void;
}

export function Header({ profile, sedeName, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentPage = NAVIGATION_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-[var(--header-height)] bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-default)]">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {currentPage?.label || 'Pilates Studio'}
            </h1>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Sede indicator */}
          {sedeName && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <MapPin className="h-3.5 w-3.5" />
              <span>{sedeName}</span>
            </div>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--color-olive)] flex items-center justify-center">
                <span className="text-xs font-medium text-[var(--color-cream)]">
                  {profile ? getInitials(profile.full_name) : '??'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">
                  {profile?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-tight">
                  {profile?.role === 'ADMIN' ? 'Administradora' : 'Profesora'}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 py-1 z-50 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-lg)] animate-fade-in-up">
                  <div className="px-3 py-2 border-b border-[var(--border-default)]">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {profile?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
