'use client';

import { cn, getInitials } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { LogOut, MapPin, Menu, Sun, Moon, ShieldCheck } from 'lucide-react';
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
  const { theme, toggleTheme } = useTheme();
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
    <header className="sticky top-0 z-30 h-[var(--header-height)] bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-default)] transition-colors duration-[var(--transition-base)]">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[var(--text-primary)] tracking-wide">
              {currentPage?.label || 'Pilates Studio'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-wood)]/15 text-[var(--color-wood)] border border-[var(--color-wood)]/30">
              <ShieldCheck className="h-3 w-3" /> Panel Admin
            </span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Sede indicator */}
          {sedeName && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] font-medium">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
              <span>{sedeName}</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title={theme === 'light' ? 'Cambiar a Tema Oscuro' : 'Cambiar a Tema Blanco Crema'}
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? (
              <Moon className="h-4.5 w-4.5 text-[var(--text-secondary)]" />
            ) : (
              <Sun className="h-4.5 w-4.5 text-[var(--color-wood)]" />
            )}
          </button>
        </div>

      </div>
    </header>
  );
}

