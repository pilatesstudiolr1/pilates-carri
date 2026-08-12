import { createClient } from '@/lib/supabase/client';
import { registrarMovimiento } from '@/lib/services/caja';

export interface BarreClase {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  profesora_id?: string | null;
  profesora_name?: string;
  sede_id?: string | null;
  sede_name?: string;
  alumnas_count?: number;
  is_active: boolean;
}

export interface BarreAlumna {
  id: string;
  alumna_id: string;
  alumna_name: string;
  alumna_phone?: string | null;
  plan_name: string;
  monthly_fee: number;
  start_date: string;
  due_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface BarrePago {
  id: string;
  barre_alumna_id: string;
  alumna_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  period_covered?: string;
  status: string;
}

export async function getBarreClases(): Promise<{ data: BarreClase[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('barre_clases')
      .select('*, profesora:profiles(full_name), sede:sedes(name)')
      .order('start_time', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    const formatted: BarreClase[] = (data || []).map((item: any) => ({
      ...item,
      profesora_name: item.profesora?.full_name || 'Sin asignación',
      sede_name: item.sede?.name || 'Sede Principal',
      alumnas_count: item.alumnas_count || 0,
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al obtener clases de Barre' };
  }
}

export async function getBarreAlumnas(): Promise<{ data: BarreAlumna[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('barre_alumnas')
      .select('*, alumna:alumnas(first_name, last_name, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const formatted: BarreAlumna[] = (data || []).map((item: any) => ({
      ...item,
      alumna_name: item.alumna ? `${item.alumna.first_name} ${item.alumna.last_name}` : 'Alumna Barre',
      alumna_phone: item.alumna?.phone || null,
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al obtener alumnas de Barre' };
  }
}

export async function registrarPagoBarre(pagoData: {
  barre_alumna_id: string;
  alumna_name: string;
  amount: number;
  payment_method: string;
  period_covered: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error: pagoError } = await supabase.from('barre_pagos').insert({
      barre_alumna_id: pagoData.barre_alumna_id,
      amount: pagoData.amount,
      payment_method: pagoData.payment_method,
      period_covered: pagoData.period_covered,
      payment_date: new Date().toISOString().split('T')[0],
      status: 'PAID',
    });

    if (pagoError) {
      console.error('Error al insertar barre_pagos:', pagoError);
    }

    // Conectar automáticamente con Caja Chica / Finanzas
    await registrarMovimiento({
      tipo: 'INGRESO',
      concepto: `Cobro Barre - ${pagoData.alumna_name} (${pagoData.period_covered})`,
      monto: pagoData.amount,
      metodo_pago: pagoData.payment_method as any,
    });

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error registrando pago de Barre' };
  }
}
