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

  // Configuración de Sidebars Independientes por Módulo
  const filteredItems = useMemo(() => {
    if (userRole === 'PROFESORA') {
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Mis Clases (Profesora)', href: '/profesora', icon: 'UserCheck', section: 'Principal' },
      ];
    }

    const roleFiltered = NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));

    if (pathname.startsWith('/estetica')) {
      // Sidebar Exclusivo Estética
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Centro de Estética', href: '/estetica', icon: 'Flower2', section: 'Estética' },
        { label: 'Liquidaciones Semanales', href: '/liquidaciones-semanales', icon: 'Receipt', section: 'Gestión' },
        { label: 'Reportes y Métricas', href: '/reportes', icon: 'BarChart3', section: 'Gestión' },
      ].filter((item) => roleFiltered.some((r) => r.href === item.href || item.href === '/portal'));
    }

    if (pathname.startsWith('/finanzas-personales')) {
      // Sidebar Exclusivo Finanzas Personales
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Resumen Financiero', href: '/finanzas-personales', icon: 'WalletCards', section: 'Finanzas Personales' },
        { label: 'Centro de control', href: '/reformer', icon: 'Layers', section: 'Pilates Studio' },

        { label: 'Reportes del Studio', href: '/reportes', icon: 'BarChart3', section: 'Pilates Studio' },
      ].filter((item) => roleFiltered.some((r) => r.href === item.href || item.href === '/portal'));
    }

    if (pathname.startsWith('/liquidaciones-semanales')) {
      // Sidebar Exclusivo Liquidaciones Semanales
      return [
        { label: 'Portal de Módulos', href: '/portal', icon: 'LayoutGrid', section: 'Navegación' },
        { label: 'Liquidación Semanal', href: '/liquidaciones-semanales', icon: 'Receipt', section: 'Liquidaciones' },
        { label: 'Profesores y Usuarios', href: '/profesoras', icon: 'GraduationCap', section: 'Gestión' },
        { label: 'Caja Chica Studio', href: '/caja', icon: 'Wallet', section: 'Gestión' },
        { label: 'Reportes Financieros', href: '/reportes', icon: 'BarChart3', section: 'Gestión' },
      ].filter((item) => roleFiltered.some((r) => r.href === item.href || item.href === '/portal'));
    }

    // Sidebar Principal Studio Reformer (Sin el acceso a /barre)
    return roleFiltered.filter((item) =>
      ['/portal', '/reformer', '/profesora', '/agenda', '/alumnas', '/pagos', '/caja', '/profesoras', '/reportes', '/whatsapp', '/lista-espera', '/inventario', '/configuracion'].includes(item.href)
    );
  }, [userRole, pathname]);

  // Group items by section
  const groupedSections = useMemo(() => {
    const groups: Record<string, typeof NAVIGATION_ITEMS> = {};
    filteredItems.forEach((item: any) => {
      const section = item.section || 'General';
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Dynamic Sidebar Title Header Accent
  const sidebarHeaderTitle = useMemo(() => {
    if (pathname.startsWith('/estetica')) return 'Estética Panel';
    if (pathname.startsWith('/finanzas-personales')) return 'Finanzas Personales';
    if (pathname.startsWith('/liquidaciones-semanales')) return 'Liquidaciones';
    return 'Pilates Studio';
  }, [pathname]);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen w-[var(--sidebar-width)]',
        'bg-[var(--bg-secondary)] border-r border-[var(--border-default)]',
        'flex flex-col justify-between shadow-xl'
      )}
    >
      {/* Top Header Logo Container (Centrado perfecto) */}
      <div className="flex flex-col border-b border-[var(--border-default)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-tertiary)]/40">
        <div className="flex items-center justify-center h-[var(--header-height)] px-4">
          <Link href="/portal" className="flex items-center justify-center gap-3 overflow-hidden group">
            <Image
              src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
              alt="Pilates Studio Logo"
              width={145}
              height={40}
              priority
              className="h-9 w-auto object-contain transition-all group-hover:scale-105"
            />
          </Link>
        </div>
        <div className="px-4 py-1.5 bg-[var(--bg-tertiary)]/60 border-t border-[var(--border-default)] flex items-center justify-between text-[10px] font-extrabold text-[var(--color-wood)] uppercase tracking-wider">
          <span>{sidebarHeaderTitle}</span>
          <span className="w-2 h-2 rounded-full bg-[var(--color-wood)]" />
        </div>
      </div>

      {/* Navigation Links List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {Object.entries(groupedSections).map(([sectionTitle, items]) => (
          <div key={sectionTitle} className="space-y-1.5">
            <div className="px-3 flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-wood)] opacity-70" />
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-wood)]">
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
                        'flex items-center gap-3 px-3 py-2 rounded-xl',
                        'text-xs font-semibold',
                        'transition-all duration-200',
                        'group relative overflow-hidden',
                        isActive
                          ? 'bg-gradient-to-r from-[var(--color-wood)]/20 to-[var(--color-wood)]/5 text-[var(--text-primary)] font-extrabold border border-[var(--color-wood)]/30 shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:translate-x-0.5'
                      )}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[var(--color-wood)] rounded-r-md shadow-xs" />
                      )}

                      {Icon && (
                        <Icon
                          className={cn(
                            'shrink-0 h-4.5 w-4.5 transition-transform group-hover:scale-110',
                            isActive
                              ? 'text-[var(--color-wood)]'
                              : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                          )}
                        />
                      )}

                      <span className="whitespace-nowrap truncate">{item.label}</span>

                      {item.badge !== undefined && (
                        <span className="ml-auto text-[10px] font-extrabold bg-[var(--color-wood)]/20 text-[var(--color-wood)] px-2 py-0.5 rounded-md border border-[var(--color-wood)]/30">
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

      {/* Bottom User Card Container */}
      <div className="p-3 border-t border-[var(--border-default)] bg-gradient-to-t from-[var(--bg-secondary)] to-[var(--bg-tertiary)]/30">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[var(--bg-tertiary)]/80 border border-[var(--border-default)]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight">
              {profile?.full_name || 'Juliana'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {userRole === 'ADMIN' ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--color-wood)] uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <UserCheck className="h-3 w-3" /> Profesor
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-all cursor-pointer shrink-0"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
