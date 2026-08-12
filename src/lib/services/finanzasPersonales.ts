import { createClient } from '@/lib/supabase/client';

export interface CuentaPersonal {
  id: string;
  name: string;
  account_type: 'efectivo' | 'banco' | 'mercado_pago' | 'billetera' | 'ahorro' | string;
  balance: number;
}

export interface MovimientoPersonal {
  id: string;
  type: 'INGRESO' | 'GASTO';
  category: string; // casa, comida, familia, tarjeta, transporte, ocio, retiro_estudio, etc.
  amount: number;
  account_id?: string | null;
  date: string;
  notes?: string | null;
  is_business_withdrawal?: boolean;
}

export interface PresupuestoPersonal {
  id: string;
  category: string;
  monthly_limit: number;
}

export interface MetaAhorro {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
}

export interface GastoFijoPersonal {
  id: string;
  name: string;
  category: string;
  amount: number;
  due_day: number;
  is_paid: boolean;
  notes?: string | null;
}

export interface DeudaPersonal {
  id: string;
  name: string;
  total_amount: number;
  paid_amount: number;
  total_installments: number;
  paid_installments: number;
  monthly_installment_amount: number;
  due_date?: string | null;
  notes?: string | null;
}

export const CATEGORIAS_GASTO_PERSONAL = [
  { value: 'casa', label: 'Casa / Vivienda' },
  { value: 'comida', label: 'Alimentación / Comida' },
  { value: 'familia', label: 'Hijo / Familia' },
  { value: 'tarjeta', label: 'Tarjeta de Crédito' },
  { value: 'transporte', label: 'Transporte / Auto' },
  { value: 'ocio', label: 'Ocio / Entretenimiento' },
  { value: 'salud', label: 'Salud / Farmacia' },
  { value: 'educacion', label: 'Educación / Cursos' },
  { value: 'varios', label: 'Varios / Otros' },
] as const;

export const CATEGORIAS_INGRESO_PERSONAL = [
  { value: 'sueldo', label: 'Sueldo / Salario' },
  { value: 'retiro_estudio', label: 'Retiro del Studio' },
  { value: 'inversion', label: 'Inversiones' },
  { value: 'otro_ingreso', label: 'Otro Ingreso' },
] as const;

export async function getFinanzasPersonales(): Promise<{
  cuentas: CuentaPersonal[];
  movimientos: MovimientoPersonal[];
  presupuestos: PresupuestoPersonal[];
  metas: MetaAhorro[];
  gastosFijos: GastoFijoPersonal[];
  deudas: DeudaPersonal[];
}> {
  try {
    const supabase = createClient();
    const [cuentasRes, movsRes, presupuestRes, metasRes, gastosFijosRes, deudasRes] = await Promise.all([
      supabase.from('finanzas_personales_cuentas').select('*'),
      supabase.from('finanzas_personales_movimientos').select('*').order('date', { ascending: false }),
      supabase.from('finanzas_personales_presupuestos').select('*'),
      supabase.from('finanzas_personales_metas').select('*'),
      supabase.from('finanzas_personales_gastos_fijos').select('*'),
      supabase.from('finanzas_personales_deudas').select('*'),
    ]);

    const cuentas: CuentaPersonal[] = cuentasRes.data || [];
    const movimientos: MovimientoPersonal[] = movsRes.data || [];
    const presupuestos: PresupuestoPersonal[] = presupuestRes.data || [];
    const metas: MetaAhorro[] = metasRes.data || [];
    const gastosFijos: GastoFijoPersonal[] = gastosFijosRes.data || [];
    const deudas: DeudaPersonal[] = deudasRes.data || [];

    return { cuentas, movimientos, presupuestos, metas, gastosFijos, deudas };
  } catch (err) {
    console.error('Error al obtener finanzas personales:', err);
    return { cuentas: [], movimientos: [], presupuestos: [], metas: [], gastosFijos: [], deudas: [] };
  }
}

export async function registrarMovimientoPersonal(data: {
  type: 'INGRESO' | 'GASTO';
  category: string;
  amount: number;
  account_id?: string;
  notes?: string;
  date?: string;
  is_business_withdrawal?: boolean;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('finanzas_personales_movimientos').insert({
      type: data.type,
      category: data.category,
      amount: data.amount,
      account_id: data.account_id || null,
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || null,
      is_business_withdrawal: data.is_business_withdrawal || false,
    });

    if (error) {
      console.error('Error insertando movimiento personal:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error al registrar movimiento' };
  }
}

export async function registrarRetiroEstudio(data: {
  amount: number;
  account_id?: string;
  notes?: string;
}): Promise<{ error: string | null }> {
  return registrarMovimientoPersonal({
    type: 'INGRESO',
    category: 'retiro_estudio',
    amount: data.amount,
    account_id: data.account_id,
    notes: data.notes || 'Retiro privado de ganancias del estudio',
    is_business_withdrawal: true,
  });
}

export async function crearCuentaPersonal(data: {
  name: string;
  account_type: string;
  balance: number;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('finanzas_personales_cuentas').insert(data);
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al crear cuenta' };
  }
}

export async function crearMetaAhorro(data: {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('finanzas_personales_metas').insert({
      name: data.name,
      target_amount: data.target_amount,
      current_amount: data.current_amount || 0,
      target_date: data.target_date || null,
    });
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al crear meta' };
  }
}

export async function crearGastoFijo(data: {
  name: string;
  category: string;
  amount: number;
  due_day: number;
  notes?: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('finanzas_personales_gastos_fijos').insert(data);
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al crear gasto fijo' };
  }
}

export async function toggleGastoFijoPaid(id: string, currentPaid: boolean): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('finanzas_personales_gastos_fijos')
      .update({ is_paid: !currentPaid })
      .eq('id', id);
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al actualizar estado del gasto fijo' };
  }
}

export async function crearDeuda(data: {
  name: string;
  total_amount: number;
  total_installments: number;
  monthly_installment_amount: number;
  due_date?: string;
  notes?: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('finanzas_personales_deudas').insert({
      name: data.name,
      total_amount: data.total_amount,
      paid_amount: 0,
      total_installments: data.total_installments,
      paid_installments: 0,
      monthly_installment_amount: data.monthly_installment_amount,
      due_date: data.due_date || null,
      notes: data.notes || null,
    });
    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al crear deuda' };
  }
}

export async function pagarCuotaDeuda(deuda: DeudaPersonal): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const newPaidInstallments = Math.min(deuda.total_installments, deuda.paid_installments + 1);
    const newPaidAmount = deuda.paid_amount + deuda.monthly_installment_amount;

    const { error } = await supabase
      .from('finanzas_personales_deudas')
      .update({
        paid_installments: newPaidInstallments,
        paid_amount: newPaidAmount,
      })
      .eq('id', deuda.id);

    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al registrar pago de cuota' };
  }
}

export async function guardarPresupuestoCategoria(category: string, monthly_limit: number): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('finanzas_personales_presupuestos')
      .upsert({ category, monthly_limit }, { onConflict: 'category' });

    return { error: error ? error.message : null };
  } catch (err: any) {
    return { error: err.message || 'Error al guardar presupuesto' };
  }
}
