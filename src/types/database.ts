export type UserRole = 'ADMIN' | 'PROFESORA';

export type AlumnaStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type MetodoPago = 'efectivo' | 'transferencia' | 'mercado_pago' | 'tarjeta' | 'otro';

export type EstadoPago = 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'FROZEN';

export type EstadoAsistencia = 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED';

export type TipoPago = 'MENSUALIDAD' | 'INSCRIPCION' | 'CLASE_SUELTA';

export type EstadoCuota = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'FROZEN';

export type EstadoRecuperacion = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type EstadoClaseAlumna = 'ACTIVE' | 'SUSPENDED' | 'RECOVERY' | 'CANCELLED';

export type CondicionInventario = 'EXCELLENT' | 'GOOD' | 'NEEDS_MAINTENANCE' | 'REPLACED';

export type EstadoListaEspera = 'PENDING' | 'NOTIFIED' | 'ASSIGNED' | 'CANCELLED';

// ============================================
// Entidades de Base de Datos
// ============================================

export interface Sede {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  max_camillas: number;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  sede_id: string | null;
  phone: string | null;
  dni: string | null;
  commission_rate: number;
  hourly_rate: number;
  work_days: string[];
  work_hours: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export interface Alumna {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  email: string | null;
  address: string | null;
  photo_url: string | null;

  // Contacto de emergencia
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;

  // Ficha medica
  injuries: string | null;
  is_pregnant: boolean;
  medication: string | null;
  consent_signed: boolean;
  medical_clearance: boolean;
  diseases: string | null;
  surgeries: string | null;
  health_observations: string | null;
  observations: string | null;

  // Plan y facturacion
  plan: string | null;
  plan_amount: number;
  billing_start_date: string | null;
  billing_due_date: string | null;
  enrollment_paid: boolean;
  enrollment_amount: number;
  monthly_paid: boolean;
  preferred_payment_method: string | null;

  // Fecha de nacimiento
  date_of_birth: string | null;

  // Estado y fechas
  status: AlumnaStatus;
  entry_date: string;
  exit_date: string | null;
  exit_reason: string | null;

  // Relaciones
  sede_id: string | null;
  profesora_id: string | null;
  created_by: string | null;

  // Auditoria
  created_at: string;
  updated_at: string;

  // Relaciones joined
  profesora?: Profile | null;
}

export type AlumnaInsert = Omit<Alumna, 'id' | 'created_at' | 'updated_at' | 'profesora'>;
export type AlumnaUpdate = Partial<AlumnaInsert>;

export interface Clase {
  id: string;
  name: string;
  profesora_id: string | null;
  sede_id: string | null;
  day_of_week: number; // 1=Lunes, 6=Sabado
  start_time: string;
  end_time: string;
  max_capacity: number; // 4 a 6
  is_active: boolean;
  created_at: string;

  // Relaciones joined
  profesora?: Profile | null;
  alumnas_count?: number;
  alumnas?: ClaseAlumna[];
  sede?: Sede | null;
}

export interface ClaseAlumna {
  id: string;
  clase_id: string;
  alumna_id: string;
  camilla: number | null; // 1 a 6 (camilla asignada)
  status: EstadoClaseAlumna;
  created_at: string;

  // Relaciones joined
  alumna?: Alumna;
}

export interface Asistencia {
  id: string;
  clase_id: string;
  alumna_id: string;
  date: string;
  status: EstadoAsistencia;
  observations: string | null;
  recorded_by: string | null;
  created_at: string;

  // Relaciones joined
  alumna?: Alumna;
  clase?: Clase;
}

export interface Pago {
  id: string;
  alumna_id: string;
  amount: number;
  payment_method: MetodoPago;
  payment_date: string;
  due_date: string;
  status: EstadoPago;
  payment_type: TipoPago;
  plan: string | null;
  period: string | null; // Formato YYYY-MM
  commission_rate: number;
  commission_amount: number;
  notes: string | null;
  recorded_by: string | null;
  sede_id: string | null;
  created_at: string;

  // Relaciones joined
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
  sede_id: string | null;
  created_at: string;
}

export interface CajaMovimiento {
  id: string;
  sesion_id: string | null;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  category: string | null;
  description: string | null;
  observations: string | null;
  monto: number;
  metodo_pago: MetodoPago;
  fecha: string;
  sede_id: string | null;
  recorded_by: string | null;
  creado_en: string;
}

export interface Recuperacion {
  id: string;
  alumna_id: string;
  clase_alumna_id: string | null;
  clase_id: string | null;
  sede_id: string | null;
  original_date: string;
  recovery_date: string | null;
  recovery_time: string | null;
  camilla: number | null;
  status: EstadoRecuperacion;
  observations: string | null;
  created_at: string;

  // Relaciones joined
  alumna?: Alumna;
  clase?: Clase;
}

export interface Cuota {
  id: string;
  alumna_id: string;
  month: number; // 1-12
  year: number;
  amount: number;
  due_date: string;
  status: EstadoCuota;
  pago_id: string | null;
  created_at: string;

  // Relaciones joined
  alumna?: Alumna;
  pago?: Pago;
}

export interface ListaEspera {
  id: string;
  alumna_id: string;
  desired_day: number;
  desired_time: string;
  priority: number;
  notes: string | null;
  status: EstadoListaEspera;
  created_at: string;

  // Relaciones joined
  alumna?: Alumna;
}

export interface Inventario {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: CondicionInventario;
  sede_id: string | null;
  notes: string | null;
  created_at: string;

  // Relaciones joined
  sede?: Sede;
}
