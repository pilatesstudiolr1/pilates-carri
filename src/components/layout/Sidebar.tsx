'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { UserRole, Profile } from '@/types/database';
import { useTheme } from '@/hooks/useTheme';
import { createClient } from '@/lib/supabase/client';
import {
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
  Settings,
  ShieldCheck,
  UserCheck,
  LogOut,
  LayoutGrid,
  Sparkles,
  Flower2,
  Receipt,
  WalletCards,
  Layers,
  Package,
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
  Settings,
  ShieldCheck,
  LayoutGrid,
  Sparkles,
  Flower2,
  Receipt,
  WalletCards,
  Layers,
  Package,
  PiggyBank,
  Clock,
};

interface SidebarProps {
  userRole: UserRole;
  profile?: Profile | null;
}

export function Sidebar({ userRole, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

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

  const sidebarHeaderTitle = useMemo(() => {
    if (pathname.startsWith('/estetica')) return 'Estética';
    if (pathname.startsWith('/finanzas-personales')) return 'Finanzas';
    if (pathname.startsWith('/liquidaciones-semanales')) return 'Liquidaciones';
    return 'Pilates Studio';
  }, [pathname]);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen w-[var(--sidebar-width)]',
        'bg-[var(--color-paper-white)] border-r border-[var(--border-default)]',
        'flex flex-col justify-between shadow-[0_4px_24px_rgba(0,31,31,0.03)]'
      )}
    >
      {/* Top Header Logo */}
      <div className="flex flex-col border-b border-[var(--border-default)] bg-[var(--color-parchment)]/50">
        <div className="flex items-center justify-between h-[var(--header-height)] px-4">
          <Link href="/portal" className="flex items-center gap-2.5 overflow-hidden group">
            <Image
              src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
              alt="Pilates Studio Logo"
              width={140}
              height={38}
              priority
              className="h-8 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </Link>
          <span className="text-[10px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-[22px] bg-[var(--color-meadow)] text-[var(--color-forest-ink)] border border-[var(--color-forest-ink)]">
            {sidebarHeaderTitle}
          </span>
        </div>
      </div>

      {/* Navigation Links List */}
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
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-[29px]',
                        'text-xs font-medium',
                        'transition-all duration-150',
                        isActive
                          ? 'bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)] shadow-2xs font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            'shrink-0 h-4 w-4 transition-transform',
                            isActive ? 'text-[var(--badge-meadow-text)]' : 'text-[var(--text-muted)]'
                          )}
                        />
                      )}

                      <span className="whitespace-nowrap truncate tracking-tight">{item.label}</span>

                      {item.badge !== undefined && (
                        <span className="ml-auto text-[10px] font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] px-2 py-0.2 rounded-[22px]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom User Profile Card */}
      <div className="p-3 border-t border-[var(--border-default)] bg-[var(--color-parchment)]/60">
        <div className="flex items-center justify-between gap-2.5 p-2 rounded-[14px] bg-[var(--color-paper-white)] border border-[var(--border-default)]">
          <div className="min-w-0 flex-1 pl-1">
            <p className="text-xs font-medium text-[var(--color-forest-ink)] truncate">
              {profile?.full_name || 'Usuario'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {userRole === 'ADMIN' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-deep-forest)] uppercase tracking-[0.06em]">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-lichen-gray)] uppercase tracking-[0.06em]">
                  <UserCheck className="h-3 w-3" /> Profesor
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-[29px] flex items-center justify-center text-[var(--color-stone)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
