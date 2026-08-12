import type { NavItem, UserRole } from '@/types';

export const APP_NAME = 'Pilates Studio';
export const APP_DESCRIPTION = 'Sistema de gestion integral para estudios de Pilates';

export const ROLES: Record<UserRole, string> = {
  ADMIN: 'Administradora',
  PROFESORA: 'Profesora',
};

// ============================================
// Configuracion de Clases
// ============================================
export const MIN_ALUMNAS_POR_CLASE = 4;
export const MAX_ALUMNAS_POR_CLASE = 6;
export const MAX_CAMILLAS_SEDE_NORTE = 6;
export const MAX_CAMILLAS_SEDE_CENTRO = 4;
export const COMISION_PROFESORA_DEFAULT = 0.40; // 40%
export const MONTO_INSCRIPCION_DEFAULT = 9500; // $9.500 ARS

// ============================================
// Dias Laborables
// ============================================
export const DIAS_LABORABLES = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
] as const;

// Mapeo numerico para day_of_week en la tabla clases
export const DIAS_MAP: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
};

// ============================================
// Grilla Horaria Estandar
// ============================================
export const HORARIOS_MANANA = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
] as const;

export const HORARIOS_TARDE_NOCHE = [
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
] as const;

export const HORARIOS_COMPLETOS = [
  ...HORARIOS_MANANA,
  ...HORARIOS_TARDE_NOCHE,
] as const;

// ============================================
// Metodos de Pago
// ============================================
export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
] as const;

// ============================================
// Tipos de Pago
// ============================================
export const TIPOS_PAGO = [
  { value: 'MENSUALIDAD', label: 'Mensualidad' },
  { value: 'INSCRIPCION', label: 'Inscripcion' },
  { value: 'CLASE_SUELTA', label: 'Clase suelta' },
] as const;

// ============================================
// Estados de Alumna
// ============================================
export const ESTADOS_ALUMNA = [
  { value: 'ACTIVE', label: 'Activa', color: 'success' },
  { value: 'INACTIVE', label: 'Inactiva', color: 'muted' },
  { value: 'SUSPENDED', label: 'Suspendida', color: 'warning' },
] as const;

// ============================================
// Estados de Asistencia con Colores (del sistema antiguo)
// ============================================
export const ESTADOS_ASISTENCIA = [
  {
    value: 'PRESENT',
    label: 'Presente',
    bgColor: '#bbf7d0',
    borderColor: '#22c55e',
    textColor: '#166534',
  },
  {
    value: 'ABSENT',
    label: 'Ausente',
    bgColor: '#fecaca',
    borderColor: '#ef4444',
    textColor: '#991b1b',
  },
  {
    value: 'RECOVERY',
    label: 'Recupera',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    textColor: '#92400e',
  },
  {
    value: 'SUSPENDED',
    label: 'Suspendida',
    bgColor: '#dbeafe',
    borderColor: '#3b82f6',
    textColor: '#1e40af',
  },
] as const;

// ============================================
// Categorias de Caja (del sistema antiguo)
// ============================================
export const CATEGORIAS_INGRESO = [
  { value: 'venta', label: 'Venta' },
  { value: 'clase_especial', label: 'Clase especial' },
  { value: 'alquiler_espacio', label: 'Alquiler de espacio' },
  { value: 'otro_ingreso', label: 'Otro ingreso' },
] as const;

export const CATEGORIAS_EGRESO = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'luz', label: 'Luz' },
  { value: 'agua', label: 'Agua' },
  { value: 'internet', label: 'Internet' },
  { value: 'sueldos', label: 'Sueldos' },
  { value: 'honorarios', label: 'Honorarios profesionales' },
  { value: 'materiales', label: 'Materiales' },
  { value: 'equipamiento', label: 'Equipamiento' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'otro_egreso', label: 'Otro egreso' },
] as const;

// ============================================
// Estados de Pago
// ============================================
export const ESTADOS_PAGO = [
  { value: 'PAID', label: 'Pagado', color: 'success' },
  { value: 'PENDING', label: 'Pendiente', color: 'warning' },
  { value: 'PARTIAL', label: 'Parcial', color: 'info' },
  { value: 'OVERDUE', label: 'Vencido', color: 'danger' },
  { value: 'FROZEN', label: 'Congelado', color: 'muted' },
] as const;

// ============================================
// Estados de Cuota
// ============================================
export const ESTADOS_CUOTA = [
  { value: 'PENDING', label: 'Pendiente', color: 'warning' },
  { value: 'PAID', label: 'Pagado', color: 'success' },
  { value: 'OVERDUE', label: 'Vencido', color: 'danger' },
  { value: 'PARTIAL', label: 'Parcial', color: 'info' },
  { value: 'FROZEN', label: 'Congelado', color: 'muted' },
] as const;

// ============================================
// Estados de Recuperacion
// ============================================
export const ESTADOS_RECUPERACION = [
  { value: 'PENDING', label: 'Pendiente', color: 'warning' },
  { value: 'SCHEDULED', label: 'Programada', color: 'info' },
  { value: 'COMPLETED', label: 'Completada', color: 'success' },
  { value: 'CANCELLED', label: 'Cancelada', color: 'danger' },
] as const;

// ============================================
// Navegacion
// ============================================
export const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: 'Portal de Módulos',
    href: '/portal',
    icon: 'LayoutGrid',
    roles: ['ADMIN', 'PROFESORA'],
    section: 'Principal',
  },
  {
    label: 'Mis Clases (Profesora)',
    href: '/profesora',
    icon: 'UserCheck',
    roles: ['PROFESORA'],
    section: 'Principal',
  },
  {
    label: 'Centro de control',
    href: '/reformer',
    icon: 'Layers',
    roles: ['ADMIN'],
    section: 'Principal',
  },
  {
    label: 'Agenda',
    href: '/agenda',
    icon: 'Calendar',
    roles: ['ADMIN'],
    section: 'Principal',
  },
  {
    label: 'Alumnas',
    href: '/alumnas',
    icon: 'Users',
    roles: ['ADMIN'],
    section: 'Principal',
  },
  {
    label: 'Barre',
    href: '/barre',
    icon: 'Sparkles',
    roles: ['ADMIN'],
    section: 'Módulos',
  },
  {
    label: 'Estética',
    href: '/estetica',
    icon: 'Flower2',
    roles: ['ADMIN'],
    section: 'Módulos',
  },
  {
    label: 'Liquidación Semanal',
    href: '/liquidaciones-semanales',
    icon: 'Receipt',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'Pagos',
    href: '/pagos',
    icon: 'CreditCard',
    roles: ['ADMIN'],
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
    label: 'Profesores y Usuarios',
    href: '/profesoras',
    icon: 'GraduationCap',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'Reportes & Finanzas',
    href: '/reportes',
    icon: 'BarChart3',
    roles: ['ADMIN'],
    section: 'Gestión',
  },
  {
    label: 'Finanzas Personales',
    href: '/finanzas-personales',
    icon: 'WalletCards',
    roles: ['ADMIN'],
    section: 'Personal',
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
    label: 'Configuracion',
    href: '/configuracion',
    icon: 'Settings',
    roles: ['ADMIN'],
    section: 'Herramientas',
  },
];
