'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { useSede } from '@/hooks/useSede';
import { LogOut, MapPin, Menu, Sun, Moon, LayoutGrid, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types';

interface HeaderProps {
  profile: Profile | null;
  sedeName?: string;
  onMenuClick?: () => void;
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { sedes, selectedSedeId, setSelectedSedeId, selectedSede, isTeacherLocked } = useSede();

  const currentPage = NAVIGATION_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  return (
    <header className="sticky top-0 z-30 h-[var(--header-height)] bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-default)] transition-colors duration-[var(--transition-base)]">
      <div className="flex items-center justify-between h-full px-3 sm:px-6">
        {/* Left section */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] tracking-wide truncate max-w-[130px] sm:max-w-none">
              {currentPage?.label || 'Pilates Studio'}
            </h1>
            <Link
              href="/portal"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--bg-tertiary)] text-[var(--color-wood)] border border-[var(--border-default)] hover:border-[var(--color-wood)] transition-all cursor-pointer shadow-2xs shrink-0"
              title="Volver al Portal de Módulos"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cambiar de Módulo
            </Link>
          </div>
        </div>

        {/* Right section: Multi-Sede Selector Dropdown & Theme */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Selector Interactivo de Sede Activa */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs font-semibold shadow-2xs hover:border-[var(--color-wood)]/60 transition-all">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--color-wood)] shrink-0" />
            <span className="text-[var(--text-muted)] font-medium hidden md:inline">Sede:</span>
            {isTeacherLocked ? (
              <span className="font-extrabold text-[var(--text-primary)] text-[11px] sm:text-xs">
                {selectedSede?.name || 'Sede Asignada'}
              </span>
            ) : (
              <select
                value={selectedSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                className="bg-transparent font-extrabold text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1 max-w-[90px] sm:max-w-none truncate text-[11px] sm:text-xs"
                title="Seleccionar Sede Operativa"
              >
                <option value="ALL" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  Todas las Sedes
                </option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer shrink-0"
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


