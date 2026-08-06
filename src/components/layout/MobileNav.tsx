'use client';

import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import type { UserRole } from '@/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
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

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  userRole: UserRole;
}

export function MobileNav({ open, onClose, userRole }: MobileNavProps) {
  const pathname = usePathname();

  const filteredItems = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--bg-overlay)] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute left-0 top-0 h-full w-[280px] bg-[var(--bg-elevated)] border-r border-[var(--border-default)] animate-slide-in-left">
        {/* Close button */}
        <div className="flex items-center justify-between h-[var(--header-height)] px-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-wood)] flex items-center justify-center">
              <span className="text-[var(--color-dark)] font-bold text-sm">PS</span>
            </div>
            <span className="text-base font-semibold text-[var(--text-primary)]">
              Pilates Studio
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="py-4 px-3 overflow-y-auto">
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
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]',
                      'text-sm font-medium',
                      'transition-all duration-[var(--transition-fast)]',
                      isActive
                        ? 'bg-[var(--color-wood)]/10 text-[var(--color-wood)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          'shrink-0 h-[18px] w-[18px]',
                          isActive
                            ? 'text-[var(--color-wood)]'
                            : 'text-[var(--text-muted)]'
                        )}
                      />
                    )}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
