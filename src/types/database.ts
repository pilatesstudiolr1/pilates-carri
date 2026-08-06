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
  commission_rate: number;
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;


export interface Sede {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export type AlumnaStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Alumna {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  injuries: string | null;
  is_pregnant: boolean;
  medication: string | null;
  consent_signed: boolean;
  observations: string | null;
  status: AlumnaStatus;
  entry_date: string;
  exit_date: string | null;
  exit_reason: string | null;
  sede_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AlumnaInsert = Omit<Alumna, 'id' | 'created_at' | 'updated_at'>;
export type AlumnaUpdate = Partial<AlumnaInsert>;

export interface Clase {
  id: string;
  name: string;
  profesora_id: string | null;
  sede_id: string | null;
  day_of_week: number; // 1=Lunes, 6=Sábado
  start_time: string;
  end_time: string;
  max_capacity: number; // 4 to 6
  is_active: boolean;
  created_at: string;

  // Joined relations
  profesora?: Profile | null;
  alumnas_count?: number;
  alumnas?: Alumna[];
}

export interface ClaseAlumna {
  id: string;
  clase_id: string;
  alumna_id: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'RECOVERY' | 'CANCELLED';
  created_at: string;
  alumna?: Alumna;
}

export interface Asistencia {
  id: string;
  clase_id: string;
  alumna_id: string;
  date: string;
  attended: boolean;
  observations: string | null;
  recorded_by: string | null;
  created_at: string;
}

export type StatusPago = 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'FROZEN';

export interface Pago {
  id: string;
  alumna_id: string;
  amount: number;
  payment_method: MetodoPago;
  payment_date: string;
  due_date: string;
  status: StatusPago;
  commission_rate: number;
  commission_amount: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  alumna?: Alumna;
}

export interface CajaSesion {
  id: string;
  opening_date: string;
  closing_date: string | null;
  initial_amount: number;
  final_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface CajaMovimiento {
  id: string;
  sesion_id: string | null;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  metodo_pago: MetodoPago;
  creado_en: string;
}




