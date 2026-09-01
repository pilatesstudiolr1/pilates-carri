'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import type { UserRole } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import {
  X,
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Wallet,
  GraduationCap,
  BarChart3,
  TrendingUp,
  MessageCircle,
  ClipboardList,
  Package,
  Settings,
  ShieldCheck,
  UserCheck,
  LayoutGrid,
  Sparkles,
  Flower2,
  Receipt,
  WalletCards,
  Layers,
  PiggyBank,
  Clock,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Wallet,
  GraduationCap,
  BarChart3,
  TrendingUp,
  MessageCircle,
  ClipboardList,
  Package,
  Settings,
  ShieldCheck,
  UserCheck,
  LayoutGrid,
  Sparkles,
  Flower2,
  Receipt,
  WalletCards,
  Layers,
  PiggyBank,
  Clock,
};

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  userRole: UserRole;
}

export function MobileNav({ open, onClose, userRole }: MobileNavProps) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const filteredItems = useMemo(() => {
    if (userRole === 'PROFESORA') {
      return [
        { label: 'Panel Docente', href: '/profesora', icon: 'LayoutGrid', section: 'Principal' },
      ];
    }

    const roleFiltered = NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));

    if (pathname.startsWith('/estetica')) {
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Centro de Estética', href: '/estetica', icon: 'Flower2', section: 'Estética' },
        { label: 'Liquidaciones Semanales', href: '/liquidaciones-semanales', icon: 'Receipt', section: 'Gestión' },
        { label: 'Reportes y Métricas', href: '/reportes', icon: 'BarChart3', section: 'Gestión' },
      ].filter((item) => roleFiltered.some((r) => r.href === item.href || item.href === '/portal'));
    }

    if (pathname.startsWith('/finanzas-personales')) {
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Resumen Financiero', href: '/finanzas-personales', icon: 'WalletCards', section: 'Finanzas Personales' },
        { label: 'Centro de Control', href: '/reformer', icon: 'Layers', section: 'Pilates Studio' },
        { label: 'Reportes del Studio', href: '/reportes', icon: 'BarChart3', section: 'Pilates Studio' },
      ].filter((item) => roleFiltered.some((r) => r.href === item.href || item.href === '/portal'));
    }

    if (pathname.startsWith('/liquidaciones-semanales')) {
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Liquidación Semanal', href: '/liquidaciones-semanales', icon: 'Receipt', section: 'Liquidaciones' },
        { label: 'Profesores y Usuarios', href: '/profesoras', icon: 'GraduationCap', section: 'Gestión' },
        { label: 'Caja Chica Studio', href: '/caja', icon: 'Wallet', section: 'Gestión' },
        { label: 'Reportes Financieros', href: '/reportes', icon: 'BarChart3', section: 'Gestión' },
      ].filter((item) => roleFiltered.some((r) => r.href === item.href || item.href === '/portal'));
    }

    return roleFiltered.filter((item) =>
      ['/portal', '/reformer', '/agenda', '/agenda?view=disponibilidad', '/alumnas', '/pagos', '/caja', '/profesoras', '/reportes', '/whatsapp', '/lista-espera', '/inventario', '/configuracion'].includes(item.href)
    );
  }, [userRole, pathname]);

  const groupedSections = useMemo(() => {
    const groups: Record<string, typeof NAVIGATION_ITEMS> = {};
    filteredItems.forEach((item: any) => {
      const section = item.section || 'General';
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--color-forest-ink)]/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Panel Nav */}
      <div className="absolute left-0 top-0 h-full w-[290px] bg-[var(--color-paper-white)] border-r border-[var(--border-default)] flex flex-col justify-between shadow-2xl animate-slide-in-left">
        {/* Top Header Logo */}
        <div className="flex flex-col border-b border-[var(--border-default)] bg-[var(--color-parchment)]/60">
          <div className="flex items-center justify-between h-[var(--header-height)] px-4">
            <Link href="/portal" onClick={onClose} className="flex items-center gap-2 overflow-hidden">
              <Image
                src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
                alt="Pilates Studio Logo"
                width={140}
                height={38}
                priority
                className="h-8 w-auto object-contain"
              />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[12px] text-[var(--color-lichen-gray)] hover:text-[var(--color-forest-ink)] hover:bg-[var(--color-parchment)] transition-colors cursor-pointer"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nav links grouped */}
        <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-6 custom-scrollbar">
          {Object.entries(groupedSections).map(([sectionTitle, items]) => (
            <div key={sectionTitle} className="space-y-1">
              <div className="px-3 mb-2">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-lichen-gray)]">
                  {sectionTitle}
                </h3>
              </div>

              <ul className="space-y-1">
                {items.map((item: any) => {
                  const Icon = iconMap[item.icon] || LayoutGrid;
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2.5 rounded-[29px]',
                          'text-xs font-medium',
                          'transition-all duration-150',
                          isActive
                            ? 'bg-[var(--color-meadow)] text-[var(--color-forest-ink)] border border-[var(--color-forest-ink)] shadow-2xs font-semibold'
                            : 'text-[var(--color-lichen-gray)] hover:text-[var(--color-forest-ink)] hover:bg-[var(--color-parchment)]'
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              'shrink-0 h-4 w-4',
                              isActive ? 'text-[var(--color-forest-ink)]' : 'text-[var(--color-stone)]'
                            )}
                          />
                        )}
                        <span className="whitespace-nowrap truncate tracking-tight">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
