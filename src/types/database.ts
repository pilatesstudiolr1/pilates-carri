export type UserRole = 'ADMIN' | 'PROFESORA';

export type EstadoAlumna = 'activa' | 'inactiva' | 'suspendida' | 'baja' | 'lista_espera';

export type MetodoPago = 'efectivo' | 'transferencia' | 'mercado_pago' | 'tarjeta';

export type EstadoPago = 'pendiente' | 'pagado' | 'parcial' | 'vencido' | 'congelado';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  sede_id: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sede {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}
