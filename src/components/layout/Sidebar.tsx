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
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
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

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen',
        'bg-[var(--bg-secondary)] border-r border-[var(--border-default)]',
        'flex flex-col justify-between',
        'transition-all duration-[var(--transition-slow)]',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Top Header & Logo */}
      <div className="flex flex-col border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between h-[var(--header-height)] px-4">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <Image
              src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
              alt="Pilates Studio Logo"
              width={collapsed ? 36 : 140}
              height={40}
              priority
              className="h-9 w-auto object-contain transition-all"
            />
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer shrink-0"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-label="Colapsar sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>


      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {Object.entries(groupedSections).map(([sectionTitle, items]) => (
          <div key={sectionTitle} className="space-y-1.5">
            {!collapsed && (
              <h3 className="px-3.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                {sectionTitle}
              </h3>
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
                        'transition-all duration-[var(--transition-fast)]',
                        'group relative',
                        isActive
                          ? 'bg-[var(--color-wood)]/20 text-[var(--text-primary)] font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
                        collapsed && 'justify-center px-0'
                      )}
                    >
                      {/* Active Indicator Bar on Left Edge */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[var(--color-wood)] rounded-r-md shadow-xs" />
                      )}

                      {Icon && (
                        <Icon
                          className={cn(
                            'shrink-0 h-5 w-5',
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
                        <span className="ml-auto text-xs font-bold bg-[var(--color-wood)]/20 text-[var(--color-wood)] px-2 py-0.5 rounded-lg">
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


      {/* Bottom Profile Pill Card */}
      <div className="p-3 border-t border-[var(--border-default)]">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)]',
            collapsed ? 'justify-center p-2' : 'justify-between'
          )}
        >
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {profile?.full_name || 'Administradora'}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>


    </aside>
  );
}

