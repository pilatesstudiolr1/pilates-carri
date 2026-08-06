import type { NavItem, UserRole } from '@/types';

export const APP_NAME = 'Pilates Studio';
export const APP_DESCRIPTION = 'Sistema de gestion integral para estudios de Pilates';

export const ROLES: Record<UserRole, string> = {
  ADMIN: 'Administradora',
  PROFESORA: 'Profesora',
};

export const MIN_ALUMNAS_POR_CLASE = 4;
export const MAX_ALUMNAS_POR_CLASE = 6;
export const COMISION_PROFESORA_DEFAULT = 0.40; // 40%

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: 'LayoutDashboard',
    roles: ['ADMIN', 'PROFESORA'],
    section: 'Principal',
  },
  {
    label: 'Agenda',
    href: '/agenda',
    icon: 'Calendar',
    roles: ['ADMIN', 'PROFESORA'],
    section: 'Principal',
  },
  {
    label: 'Alumnas',
    href: '/alumnas',
    icon: 'Users',
    roles: ['ADMIN', 'PROFESORA'],
    section: 'Principal',
  },
  {
    label: 'Pagos',
    href: '/pagos',
    icon: 'CreditCard',
    roles: ['ADMIN', 'PROFESORA'],
    section: 'Gestión',
  },
  {
    label: 'Caja',
    href: '/caja',
    icon: 'Wallet',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'Usuarios',
    href: '/profesoras',
    icon: 'GraduationCap',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'Reportes',
    href: '/reportes',
    icon: 'BarChart3',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'Finanzas',
    href: '/finanzas',
    icon: 'TrendingUp',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'WhatsApp',
    href: '/whatsapp',
    icon: 'MessageCircle',
    roles: ['ADMIN'],
    section: 'Herramientas',
  },
  {
    label: 'Lista de Espera',
    href: '/lista-espera',
    icon: 'ClipboardList',
    roles: ['ADMIN'],
    section: 'Herramientas',
  },
  {
    label: 'Inventario',
    href: '/inventario',
    icon: 'Package',
    roles: ['ADMIN'],
    section: 'Herramientas',
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: 'Settings',
    roles: ['ADMIN'],
    section: 'Herramientas',
  },
];


export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'tarjeta', label: 'Tarjeta' },
] as const;

export const ESTADOS_ALUMNA = [
  { value: 'activa', label: 'Activa', color: 'success' },
  { value: 'inactiva', label: 'Inactiva', color: 'muted' },
  { value: 'suspendida', label: 'Suspendida', color: 'warning' },
  { value: 'baja', label: 'Baja', color: 'danger' },
  { value: 'lista_espera', label: 'Lista de espera', color: 'info' },
] as const;
