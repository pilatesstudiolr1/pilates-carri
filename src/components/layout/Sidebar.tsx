'use client';

import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import type { UserRole, Profile } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { createClient } from '@/lib/supabase/client';
import { useState, useMemo } from 'react';
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
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserCheck,
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
};

interface SidebarProps {
  userRole: UserRole;
  profile?: Profile | null;
}

export function Sidebar({ userRole, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));
  }, [userRole]);

  // Group items by section
  const groupedSections = useMemo(() => {
    const groups: Record<string, typeof NAVIGATION_ITEMS> = {};
    filteredItems.forEach((item) => {
      const section = item.section || 'General';
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    });
    return groups;
  }, [filteredItems]);

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AD';

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen',
        'bg-[var(--bg-secondary)] border-r border-[var(--border-default)]',
        'flex flex-col justify-between shadow-xl',
        'transition-all duration-[var(--transition-slow)]',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Top Header Logo Container */}
      <div className="flex flex-col border-b border-[var(--border-default)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-tertiary)]/40">
        <div className="flex items-center justify-between h-[var(--header-height)] px-4">
          <Link href="/" className="flex items-center gap-3 overflow-hidden group">
            <Image
              src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
              alt="Pilates Studio Logo"
              width={collapsed ? 36 : 145}
              height={40}
              priority
              className="h-9 w-auto object-contain transition-all group-hover:scale-105"
            />
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer shrink-0 shadow-xs"
            title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
            aria-label="Colapsar sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4 text-[var(--color-wood)]" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Links List */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 custom-scrollbar">
        {Object.entries(groupedSections).map(([sectionTitle, items]) => (
          <div key={sectionTitle} className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-wood)] opacity-70" />
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-wood)]">
                  {sectionTitle}
                </h3>
              </div>
            )}

            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl',
                        'text-xs sm:text-sm font-semibold',
                        'transition-all duration-200',
                        'group relative overflow-hidden',
                        isActive
                          ? 'bg-gradient-to-r from-[var(--color-wood)]/20 to-[var(--color-wood)]/5 text-[var(--text-primary)] font-extrabold border border-[var(--color-wood)]/30 shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:translate-x-0.5',
                        collapsed && 'justify-center px-0 hover:translate-x-0'
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

                      {!collapsed && (
                        <span className="whitespace-nowrap truncate">{item.label}</span>
                      )}

                      {!collapsed && item.badge !== undefined && (
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
        <div
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-tertiary)]/80 border border-[var(--border-default)]',
            collapsed ? 'justify-center p-2' : 'justify-between'
          )}
        >
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight">
                {profile?.full_name || 'Administrador'}
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
          )}

          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-all cursor-pointer shrink-0"
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
