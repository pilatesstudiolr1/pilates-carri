import { createClient } from '@/lib/supabase/client';
import { Pago, MetodoPago, StatusPago } from '@/types/database';

export async function getPagos(options?: {
  status?: StatusPago | 'ALL';
  alumnaId?: string;
}): Promise<{ data: Pago[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('pagos')
      .select('*, alumna:alumnas(*)')
      .order('payment_date', { ascending: false });

    if (options?.status && options.status !== 'ALL') {
      query = query.eq('status', options.status);
    }

    if (options?.alumnaId) {
      query = query.eq('alumna_id', options.alumnaId);
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
  due_date: string;
  commission_rate?: number;
  notes?: string;
}): Promise<{ data: Pago | null; error: string | null }> {
  try {
    const supabase = createClient();
    const rate = pagoData.commission_rate ?? 0.40;
    const commissionAmount = pagoData.amount * rate;

    const { data, error } = await supabase
      .from('pagos')
      .insert({
        alumna_id: pagoData.alumna_id,
        amount: pagoData.amount,
        payment_method: pagoData.payment_method,
        due_date: pagoData.due_date,
        status: 'PAID',
        commission_rate: rate,
        commission_amount: commissionAmount,
        notes: pagoData.notes || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Also register an automatic INGRESO in Caja
    await supabase.from('caja_movimientos').insert({
      tipo: 'INGRESO',
      concepto: `Cobro cuota mensualidad - Alumna`,
      monto: pagoData.amount,
      metodo_pago: pagoData.payment_method,
    });

    return { data: data as Pago, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar el pago',
    };
  }
}
