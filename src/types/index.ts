import type { UserRole } from './database';

export type { Profile, Sede, UserRole, EstadoAlumna, MetodoPago, EstadoPago } from './database';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  badge?: string | number;
  section?: string;
  disabled?: boolean;
}


export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
