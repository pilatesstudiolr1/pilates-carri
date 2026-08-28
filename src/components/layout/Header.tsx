'use client';

import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useSede } from '@/hooks/useSede';
import { MapPin, Menu, Sun, Moon, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types';

interface HeaderProps {
  profile: Profile | null;
  sedeName?: string;
  onMenuClick?: () => void;
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { sedes, selectedSedeId, setSelectedSedeId, selectedSede, isTeacherLocked } = useSede();

  const currentPage = NAVIGATION_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  return (
    <header className="sticky top-0 z-30 h-[var(--header-height)] bg-[var(--color-paper-white)]/90 backdrop-blur-md border-b border-[var(--border-default)] transition-colors duration-150">
      <div className="flex items-center justify-between h-full px-4 sm:px-8 max-w-[var(--page-max-width)] mx-auto">
        {/* Left section: Title + Portal Switch */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-[12px] text-[var(--color-lichen-gray)] hover:text-[var(--color-forest-ink)] hover:bg-[var(--color-parchment)] transition-colors cursor-pointer shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-medium text-[var(--color-forest-ink)] tracking-tight truncate max-w-[150px] sm:max-w-none">
              {currentPage?.label || 'Pilates Studio'}
            </h1>
            <Link
              href="/portal"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-[29px] text-xs font-medium bg-[var(--color-parchment)] text-[var(--color-forest-ink)] border border-[var(--border-default)] hover:border-[var(--color-forest-ink)] transition-all cursor-pointer shrink-0"
              title="Volver al Portal de Módulos"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-[var(--color-lichen-gray)]" />
              <span>Módulos</span>
            </Link>
          </div>
        </div>

        {/* Right section: Sede Selector + Theme */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Selector de Sede Activa (Pill Meadow) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[29px] bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)] text-xs font-medium shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-[var(--badge-meadow-text)] shrink-0" />
            {isTeacherLocked ? (
              <span className="font-medium text-[11px] sm:text-xs">
                {selectedSede?.name || 'Sede Asignada'}
              </span>
            ) : (
              <select
                value={selectedSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                className="bg-transparent font-medium text-[var(--badge-meadow-text)] focus:outline-none cursor-pointer pr-1 max-w-[110px] sm:max-w-none truncate text-[11px] sm:text-xs"
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
            className="p-2 rounded-[29px] text-[var(--color-lichen-gray)] hover:text-[var(--color-forest-ink)] hover:bg-[var(--color-parchment)] transition-colors cursor-pointer shrink-0 border border-transparent"
            title={theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
