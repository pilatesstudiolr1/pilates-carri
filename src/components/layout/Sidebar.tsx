'use client';

import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS, APP_NAME } from '@/lib/constants';
import type { UserRole } from '@/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

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
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen',
        'bg-[var(--bg-elevated)] border-r border-[var(--border-default)]',
        'flex flex-col',
        'transition-all duration-[var(--transition-slow)]',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-[var(--header-height)] px-4 border-b border-[var(--border-default)]">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-wood)] flex items-center justify-center">
            <span className="text-[var(--color-dark)] font-bold text-sm">PS</span>
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-[var(--text-primary)] whitespace-nowrap animate-fade-in">
              {APP_NAME}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="flex flex-col gap-1">
          {filteredItems.map((item) => {
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium',
                    'transition-all duration-[var(--transition-fast)]',
                    'group relative',
                    isActive
                      ? 'bg-[var(--color-wood)]/10 text-[var(--color-wood)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--color-wood)] rounded-r-full" />
                  )}
                  {Icon && (
                    <Icon
                      className={cn(
                        'shrink-0 h-[18px] w-[18px]',
                        isActive ? 'text-[var(--color-wood)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                      )}
                    />
                  )}
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                  {!collapsed && item.badge !== undefined && (
                    <span className="ml-auto text-xs bg-[var(--color-wood)]/15 text-[var(--color-wood)] px-2 py-0.5 rounded-[var(--radius-full)]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-[var(--border-default)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)]',
            'text-xs font-medium text-[var(--text-muted)]',
            'hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]',
            'transition-colors duration-[var(--transition-fast)]',
            'cursor-pointer'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
