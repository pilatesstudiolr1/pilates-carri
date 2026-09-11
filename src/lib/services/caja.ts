import { createClient } from '@/lib/supabase/client';
import { CajaMovimiento, MetodoPago } from '@/types/database';
import { deletePago } from '@/lib/services/pagos';


export async function getMovimientos(options?: {
  sedeId?: string;
  recordedBy?: string;
}): Promise<{ data: CajaMovimiento[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('caja_movimientos')
      .select('*, profile:profiles!recorded_by(id, full_name)')
      .order('creado_en', { ascending: false });

    if (options?.sedeId && options.sedeId !== 'ALL') {
      query = query.eq('sede_id', options.sedeId);
    }

    if (options?.recordedBy) {
      query = query.eq('recorded_by', options.recordedBy);
    }

    const { data: rawMovs, error } = await query;

    if (error) return { data: [], error: error.message };
    if (!rawMovs || rawMovs.length === 0) return { data: [], error: null };

    // Extraer pago_ids para resolver el titular / alumna
    const pagoIds = rawMovs
      .map((m: any) => {
        if (m.description && typeof m.description === 'string' && m.description.startsWith('pago_id:')) {
          return m.description.replace('pago_id:', '').trim();
        }
        return null;
      })
      .filter(Boolean) as string[];

    const pagoMap: Record<string, any> = {};
    if (pagoIds.length > 0) {
      const { data: pagosData } = await supabase
        .from('pagos')
        .select(`
          id,
          alumna_id,
          concept,
          period,
          notes,
          alumna:alumnas(id, first_name, last_name, dni, phone),
          profesora:profiles!profesora_id(id, full_name)
        `)
        .in('id', pagoIds);

      if (pagosData) {
        pagosData.forEach((p: any) => {
          pagoMap[p.id] = p;
        });
      }
    }

    const enriched: CajaMovimiento[] = rawMovs.map((m: any) => {
      let alumnaObj: any = null;
      let titularStr: string | null = null;
      let periodStr: string | null = null;
      let cobradoPor: string | null = m.profile?.full_name || null;

      if (m.description && m.description.startsWith('pago_id:')) {
        const pId = m.description.replace('pago_id:', '').trim();
        const p = pagoMap[pId];
        if (p) {
          if (p.period) periodStr = p.period;
          if (p.profesora?.full_name) {
            cobradoPor = p.profesora.full_name;
          } else if (p.notes) {
            const match = p.notes.match(/\[Cobrado por:\s*([^\]]+)\]/i);
            if (match) cobradoPor = match[1].trim();
          }
          if (p.alumna) {
            alumnaObj = p.alumna;
            titularStr = `${p.alumna.first_name || ''} ${p.alumna.last_name || ''}`.trim();
          }
        }
      }

      if (!titularStr && m.observations && m.observations.startsWith('Titular:')) {
        titularStr = m.observations.replace('Titular:', '').trim();
      }

      if (!titularStr) {
        titularStr = m.tipo === 'EGRESO' ? 'Gasto de Estudio / Caja' : 'Movimiento de Caja';
      }

      return {
        ...m,
        alumna: alumnaObj,
        titular: titularStr,
        period: periodStr,
        cobrado_por: cobradoPor || 'Administración',
      };
    });

    return { data: enriched, error: null };
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


