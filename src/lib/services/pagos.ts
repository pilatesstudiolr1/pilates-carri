import { createClient } from '@/lib/supabase/client';
import { Pago, MetodoPago, EstadoPago, TipoPago } from '@/types/database';

export async function getPagos(options?: {
  status?: EstadoPago | 'ALL';
  alumnaId?: string;
  sedeId?: string;
  profesoraId?: string;
}): Promise<{ data: Pago[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('pagos')
      .select('*, alumna:alumnas(id, first_name, last_name, phone, dni)')
      .order('payment_date', { ascending: false });

    if (options?.sedeId && options.sedeId !== 'ALL') {
      query = query.eq('sede_id', options.sedeId);
    }

    if (options?.alumnaId) {
      query = query.eq('alumna_id', options.alumnaId);
    }

    if (options?.profesoraId && options.profesoraId !== 'ALL') {
      query = query.eq('profesora_id', options.profesoraId);
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    return { data: (data as Pago[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al consultar pagos',
    };
  }
}

export async function registrarPago(pagoData: {
  alumna_id: string;
  amount: number;
  payment_method: MetodoPago;
  payment_type?: TipoPago;
  due_date?: string;
  concept?: string;
  billing_month?: string;
  commission_rate?: number;
  notes?: string;
  sede_id?: string;
  profesora_id?: string;
}): Promise<{ data: Pago | null; error: string | null }> {
  try {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('pagos')
      .insert({
        alumna_id: pagoData.alumna_id,
        amount: pagoData.amount,
        payment_method: pagoData.payment_method,
        payment_type: pagoData.payment_type || 'MENSUALIDAD',
        payment_date: today,
        concept: pagoData.concept || (pagoData.payment_type === 'INSCRIPCION' ? 'Inscripción inicial' : 'Cuota mensualidad'),
        notes: pagoData.notes || null,
        sede_id: pagoData.sede_id || null,
        profesora_id: pagoData.profesora_id || null,
        commission_rate: pagoData.commission_rate != null ? pagoData.commission_rate : 0.40,
        commission_amount: (pagoData.amount || 0) * (pagoData.commission_rate != null ? pagoData.commission_rate : 0.40),
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Actualizar fecha de vencimiento de la alumna si se especificó
    if (pagoData.due_date) {
      await supabase
        .from('alumnas')
        .update({ billing_due_date: pagoData.due_date })
        .eq('id', pagoData.alumna_id);
    }

    // Registrar ingreso automático en Caja Movimientos
    try {
      await supabase.from('caja_movimientos').insert({
        tipo: 'INGRESO',
        concepto: pagoData.concept || (pagoData.payment_type === 'INSCRIPCION' ? 'Cobro inscripción inicial - Alumna' : 'Cobro cuota mensualidad - Alumna'),
        monto: pagoData.amount,
        metodo_pago: pagoData.payment_method,
        sede_id: pagoData.sede_id || null,
      });
    } catch (e) {
      console.warn('Advertencia al registrar movimiento de caja:', e);
    }

    return { data: data as Pago, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar el pago',
    };
  }
}

export async function deletePago(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('pagos')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al eliminar el pago',
    };
  }
}
