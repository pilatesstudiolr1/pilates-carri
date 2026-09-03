import { createClient } from '@/lib/supabase/client';
import { CajaMovimiento, MetodoPago } from '@/types/database';
import { deletePago } from '@/lib/services/pagos';


export async function getMovimientos(options?: {
  sedeId?: string;
}): Promise<{ data: CajaMovimiento[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('caja_movimientos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (options?.sedeId && options.sedeId !== 'ALL') {
      query = query.eq('sede_id', options.sedeId);
    }

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };
    return { data: (data as CajaMovimiento[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al consultar movimientos de caja',
    };
  }
}

export async function registrarMovimiento(mov: {
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  metodo_pago: MetodoPago;
  sede_id?: string | null;
}): Promise<{ data: CajaMovimiento | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('caja_movimientos')
      .insert(mov)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CajaMovimiento, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar movimiento',
    };
  }
}

export async function deleteMovimiento(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    // 1. Obtener datos del movimiento antes de eliminarlo
    const { data: mov } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // 2. Eliminar el movimiento de caja
    const { error } = await supabase
      .from('caja_movimientos')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    // 3. Si el movimiento proviene de un pago o tiene pago_id asociado, eliminar el registro de pago
    if (mov) {
      try {
        let targetPagoId: string | null = null;
        if (mov.description && typeof mov.description === 'string' && mov.description.startsWith('pago_id:')) {
          targetPagoId = mov.description.replace('pago_id:', '').trim();
        }

        if (targetPagoId) {
          await deletePago(targetPagoId);
        } else if (
          mov.tipo === 'INGRESO' &&
          mov.concepto &&
          (mov.concepto.toLowerCase().includes('cuota') ||
            mov.concepto.toLowerCase().includes('cobro') ||
            mov.concepto.toLowerCase().includes('inscripción'))
        ) {
          // Si no tenía pago_id explícito (pago anterior), buscar coincidencia por monto y fecha
          const { data: matchingPagos } = await supabase
            .from('pagos')
            .select('id')
            .eq('amount', mov.monto)
            .eq('payment_date', mov.fecha)
            .limit(1);

          if (matchingPagos && matchingPagos.length > 0) {
            await deletePago(matchingPagos[0].id);
          }
        }

      } catch (syncErr) {
        console.warn('Advertencia al sincronizar borrado de pago desde caja:', syncErr);
      }
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al eliminar movimiento de caja',
    };
  }
}

export async function actualizarSedeMovimiento(
  movimientoId: string,
  nuevaSedeId: string | null
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    const { data: mov } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('id', movimientoId)
      .maybeSingle();

    const { error } = await supabase
      .from('caja_movimientos')
      .update({ sede_id: nuevaSedeId })
      .eq('id', movimientoId);

    if (error) return { error: error.message };

    if (mov && mov.description && mov.description.startsWith('pago_id:')) {
      const targetPagoId = mov.description.replace('pago_id:', '').trim();
      if (targetPagoId) {
        await supabase
          .from('pagos')
          .update({ sede_id: nuevaSedeId })
          .eq('id', targetPagoId);
      }
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al actualizar la sede del movimiento',
    };
  }
}


