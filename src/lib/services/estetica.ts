import { createClient } from '@/lib/supabase/client';
import { registrarMovimiento } from '@/lib/services/caja';

export interface EsteticaPaciente {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface EsteticaTratamiento {
  id: string;
  paciente_id: string;
  paciente_name: string;
  paciente_phone?: string | null;
  combo_name: string;
  total_price: number;
  amount_paid: number;
  balance_due: number;
  total_sessions: number;
  completed_sessions: number;
  professional_id?: string | null;
  professional_name?: string;
  commission_rate: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface EsteticaSesion {
  id: string;
  tratamiento_id: string;
  paciente_name: string;
  combo_name: string;
  scheduled_date: string;
  scheduled_time: string;
  professional_name?: string;
  status: 'PROGRAMADA' | 'REALIZADA' | 'CANCELADA' | 'REPROGRAMADA';
  notes?: string | null;
}

export async function getEsteticaTratamientos(): Promise<{ data: EsteticaTratamiento[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('estetica_tratamientos')
      .select('*, paciente:estetica_pacientes(full_name, phone), professional:profiles(full_name)');

    if (error) {
      return { data: [], error: error.message };
    }

    const formatted: EsteticaTratamiento[] = (data || []).map((t: any) => ({
      ...t,
      paciente_name: t.paciente?.full_name || 'Paciente',
      paciente_phone: t.paciente?.phone || null,
      professional_name: t.professional?.full_name || 'Sin asignación',
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al obtener tratamientos' };
  }
}

export async function getEsteticaSesiones(): Promise<{ data: EsteticaSesion[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('estetica_sesiones')
      .select('*, tratamiento:estetica_tratamientos(combo_name, paciente:estetica_pacientes(full_name)), professional:profiles(full_name)')
      .order('scheduled_date', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    const formatted: EsteticaSesion[] = (data || []).map((s: any) => ({
      ...s,
      combo_name: s.tratamiento?.combo_name || 'Tratamiento',
      paciente_name: s.tratamiento?.paciente?.full_name || 'Paciente',
      professional_name: s.professional?.full_name || 'Profesional',
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Error al obtener sesiones' };
  }
}

export async function registrarPagoEstetica(data: {
  tratamiento_id: string;
  paciente_name: string;
  combo_name: string;
  amount: number;
  payment_method: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error: pagoError } = await supabase.from('estetica_pagos').insert({
      tratamiento_id: data.tratamiento_id,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_date: new Date().toISOString().split('T')[0],
    });

    if (pagoError) {
      console.error('Error insertando estetica_pagos:', pagoError);
    }

    // Conectar automáticamente con Caja Chica / Finanzas generales
    await registrarMovimiento({
      tipo: 'INGRESO',
      concepto: `Cobro Estética - ${data.paciente_name} (${data.combo_name})`,
      monto: data.amount,
      metodo_pago: data.payment_method as any,
    });

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Error registrando pago' };
  }
}
