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
      .select('*, alumna:alumnas(id, first_name, last_name, phone, dni, plan, sede_id)')
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

import { getLocalDateISO } from '@/lib/utils';

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
  allow_duplicate?: boolean;
}): Promise<{ data: Pago | null; error: string | null }> {
  try {
    const supabase = createClient();
    const today = getLocalDateISO();

    const isInscripcion =
      pagoData.payment_type === 'INSCRIPCION' ||
      (pagoData.concept?.toLowerCase().includes('inscripci') ?? false);

    const commRate = isInscripcion
      ? 0
      : (pagoData.commission_rate != null ? pagoData.commission_rate : 0.40);
    const commAmount = isInscripcion ? 0 : (pagoData.amount || 0) * commRate;

    const finalPaymentType: TipoPago = isInscripcion
      ? 'INSCRIPCION'
      : (pagoData.payment_type || 'MENSUALIDAD');

    const currentPeriod = pagoData.billing_month || today.slice(0, 7);

    // Prevención de doble registro de mensualidad para el mismo período
    if (finalPaymentType === 'MENSUALIDAD' && !pagoData.allow_duplicate) {
      const { data: existingPago } = await supabase
        .from('pagos')
        .select('id, amount, payment_date, concept')
        .eq('alumna_id', pagoData.alumna_id)
        .eq('payment_type', 'MENSUALIDAD')
        .eq('period', currentPeriod)
        .limit(1);

      if (existingPago && existingPago.length > 0) {
        return {
          data: null,
          error: `Esta alumna ya tiene una mensualidad registrada para el período actual (${currentPeriod}). No se procesó el cobro duplicado.`,
        };
      }
    }

    const { data, error } = await supabase
      .from('pagos')
      .insert({
        alumna_id: pagoData.alumna_id,
        amount: pagoData.amount,
        payment_method: pagoData.payment_method,
        payment_type: finalPaymentType,
        payment_date: today,
        concept: pagoData.concept || (finalPaymentType === 'INSCRIPCION' ? 'Inscripción inicial' : 'Cuota mensualidad'),
        period: currentPeriod,
        commission_rate: commRate,
        commission_amount: commAmount,
        notes: pagoData.notes || null,
        sede_id: pagoData.sede_id || null,
        profesora_id: pagoData.profesora_id || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Actualizar datos de la alumna (vencimiento y estado de pago)
    try {
      const alumnaUpdate: Record<string, any> = {};
      if (pagoData.due_date) {
        alumnaUpdate.billing_due_date = pagoData.due_date;
      }
      if (finalPaymentType === 'INSCRIPCION') {
        alumnaUpdate.enrollment_paid = true;
      } else {
        alumnaUpdate.monthly_paid = true;
      }

      await supabase
        .from('alumnas')
        .update(alumnaUpdate)
        .eq('id', pagoData.alumna_id);
    } catch (errAlum) {
      console.warn('Advertencia al actualizar alumna:', errAlum);
    }

    // Registrar ingreso automático en Caja Movimientos
    try {
      const { error: cajaError } = await supabase.from('caja_movimientos').insert({
        tipo: 'INGRESO',
        concepto: pagoData.concept || (finalPaymentType === 'INSCRIPCION' ? 'Cobro inscripción inicial - Alumna' : 'Cobro cuota mensualidad - Alumna'),
        monto: pagoData.amount,
        metodo_pago: pagoData.payment_method,
        sede_id: pagoData.sede_id || null,
        fecha: today,
        description: data?.id ? `pago_id:${data.id}` : null,
      });
      if (cajaError) {
        console.warn('Advertencia al registrar movimiento de caja:', cajaError.message);
      }
    } catch (e) {
      console.warn('Advertencia al registrar movimiento de caja:', e);
    }

    return {
      data: {
        ...data,
        due_date: pagoData.due_date,
        commission_rate: (data as any)?.commission_rate ?? commRate,
        commission_amount: (data as any)?.commission_amount ?? commAmount,
      } as Pago,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar el pago',
    };
  }
}

export async function actualizarSedePago(
  pagoId: string,
  nuevaSedeId: string | null
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error: pagoError } = await supabase
      .from('pagos')
      .update({ sede_id: nuevaSedeId })
      .eq('id', pagoId);

    if (pagoError) return { error: pagoError.message };

    // Sincronizar en caja_movimientos si existe el movimiento asociado
    await supabase
      .from('caja_movimientos')
      .update({ sede_id: nuevaSedeId })
      .eq('description', `pago_id:${pagoId}`);

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al actualizar sede del pago',
    };
  }
}


export async function deletePago(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    // 1. Obtener detalles del pago antes de borrarlo
    const { data: pago } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // 2. Eliminar el pago
    const { error } = await supabase
      .from('pagos')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    // 3. Eliminar el movimiento correspondiente en caja_movimientos si existe
    if (pago) {
      try {
        const { error: delDescError } = await supabase
          .from('caja_movimientos')
          .delete()
          .eq('description', `pago_id:${id}`);

        if (delDescError) {
          // Si no tenía description con pago_id, buscar por monto, fecha y tipo
          await supabase
            .from('caja_movimientos')
            .delete()
            .eq('monto', pago.amount)
            .eq('fecha', pago.payment_date)
            .eq('tipo', 'INGRESO');
        }
      } catch (syncErr) {
        console.warn('Advertencia al sincronizar borrado de caja:', syncErr);
      }

      // 4. Sincronizar estado de la alumna si se eliminó su último pago
      if (pago.alumna_id) {
        try {
          const { data: otrosPagos } = await supabase
            .from('pagos')
            .select('due_date')
            .eq('alumna_id', pago.alumna_id)
            .order('payment_date', { ascending: false })
            .limit(1);

          const hoy = getLocalDateISO();
          if (otrosPagos && otrosPagos.length > 0 && otrosPagos[0].due_date) {
            await supabase
              .from('alumnas')
              .update({
                billing_due_date: otrosPagos[0].due_date,
                monthly_paid: otrosPagos[0].due_date >= hoy,
              })
              .eq('id', pago.alumna_id);
          } else {
            await supabase
              .from('alumnas')
              .update({
                monthly_paid: false,
              })
              .eq('id', pago.alumna_id);
          }
        } catch (syncAlumnaErr) {
          console.warn('Advertencia al sincronizar estado de alumna tras eliminar pago:', syncAlumnaErr);
        }
      }
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al eliminar el pago',
    };
  }
}


