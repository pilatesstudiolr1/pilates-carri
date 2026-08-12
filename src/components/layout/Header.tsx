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
  const { sedes, selectedSedeId, setSelectedSedeId } = useSede();

  const currentPage = NAVIGATION_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

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
            <Link
              href="/portal"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[var(--bg-tertiary)] text-[var(--color-wood)] border border-[var(--border-default)] hover:border-[var(--color-wood)] transition-all cursor-pointer shadow-2xs"
              title="Volver al Portal de Módulos"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cambiar de Módulo
            </Link>
          </div>
        </div>

        {/* Right section: Multi-Sede Selector Dropdown & Theme */}
        <div className="flex items-center gap-3">
          {/* Selector Interactivo de Sede Activa */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs font-semibold shadow-2xs hover:border-[var(--color-wood)]/60 transition-all">
            <MapPin className="h-4 w-4 text-[var(--color-wood)] shrink-0" />
            <span className="text-[var(--text-muted)] font-medium hidden sm:inline">Sede:</span>
            <select
              value={selectedSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="bg-transparent font-extrabold text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
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
          </div>

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


