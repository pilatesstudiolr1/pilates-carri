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
      .select('*, alumna:alumnas(id, first_name, last_name, phone, dni, plan, sede_id), profesora:profiles!profesora_id(id, full_name, first_name, last_name, role)')
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

    const isForProfesora = Boolean(options?.profesoraId && options.profesoraId !== 'ALL');

    const enriched: Pago[] = ((data as any[]) || [])
      .filter((p) => {
        if (!isForProfesora) return true;
        // Si se consulta para una profesora específica, excluir pagos registrados por administradores u otras personas
        if (p.notes) {
          const match = p.notes.match(/\[Cobrado por:\s*([^\]]+)\]/i);
          if (match) {
            const recordedByName = match[1].trim().toLowerCase();
            const profName = (p.profesora?.full_name || '').toLowerCase();
            // Si tiene autor explícito y no coincide con esta profesora, no le pertenece
            if (profName && !recordedByName.includes(profName) && !profName.includes(recordedByName)) {
              return false;
            }
          }
        }
        return true;
      })
      .map((p) => {
        let cleanNotes = p.notes;
        if (isForProfesora && cleanNotes) {
          cleanNotes = cleanNotes.replace(/\[Cobrado por:\s*[^\]]+\]/gi, '').trim() || null;
        }

        if (isForProfesora) {
          return {
            ...p,
            notes: cleanNotes,
            cobrado_por: null, // Las profesoras nunca ven quién cobró
          };
        }

        let cobradoPor = p.profesora?.full_name || null;
        if (!cobradoPor && p.notes) {
          const match = p.notes.match(/\[Cobrado por:\s*([^\]]+)\]/i);
          if (match) cobradoPor = match[1].trim();
        }
        return {
          ...p,
          cobrado_por: cobradoPor || 'Administración',
        };
      });

    return { data: enriched, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al consultar pagos',
    };
  }
}

import { getLocalDateISO } from '@/lib/utils';

export function normalizePeriodToYearMonth(periodOrMonth?: string | null): string {
  if (!periodOrMonth) return getLocalDateISO().slice(0, 7);
  const p = periodOrMonth.trim();
  if (/^\d{4}-\d{2}$/.test(p)) return p;

  const mesesMap: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };

  const lower = p.toLowerCase();
  for (const [nombreMes, numMes] of Object.entries(mesesMap)) {
    if (lower.includes(nombreMes)) {
      const yearMatch = p.match(/\b\d{4}\b/);
      const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
      return `${year}-${numMes}`;
    }
  }

  return p;
}

export interface SplitPaymentData {
  method1: MetodoPago;
  amount1: number;
  method2: MetodoPago;
  amount2: number;
}

// =========================================================================
// Protección anti-duplicados: Idempotency key en memoria con ventana de 60s
// =========================================================================
const _recentPaymentKeys = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 60_000; // 60 segundos

function generateIdempotencyKey(alumnaId: string, paymentType: string, period: string, amount: number): string {
  return `${alumnaId}::${paymentType}::${period}::${amount}`;
}

function isRecentDuplicate(key: string): boolean {
  const now = Date.now();
  // Limpiar entradas expiradas
  for (const [k, ts] of _recentPaymentKeys.entries()) {
    if (now - ts > IDEMPOTENCY_WINDOW_MS) {
      _recentPaymentKeys.delete(k);
    }
  }
  if (_recentPaymentKeys.has(key)) {
    return true;
  }
  _recentPaymentKeys.set(key, now);
  return false;
}

export interface VerificacionPagoExistenteResult {
  exists: boolean;
  pago?: {
    id: string;
    amount: number;
    payment_date: string;
    period?: string | null;
    payment_type?: TipoPago | null;
    concept?: string | null;
  };
  tipo: TipoPago;
  message?: string;
}

/**
 * Verifica si ya existe un cobro registrado para la alumna según los parámetros estándar:
 * - Si es INSCRIPCION: verifica si ya existe alguna inscripción previa registrada.
 * - Si es MENSUALIDAD: verifica si ya existe un pago para el período (YYYY-MM).
 */
export async function verificarPagoExistente(params: {
  alumnaId: string;
  paymentType: TipoPago;
  period?: string;
}): Promise<VerificacionPagoExistenteResult> {
  try {
    const supabase = createClient();
    const { alumnaId, paymentType, period } = params;
    const currentPeriod = normalizePeriodToYearMonth(period);

    if (paymentType === 'INSCRIPCION') {
      const { data, error } = await supabase
        .from('pagos')
        .select('id, amount, payment_date, period, payment_type, concept')
        .eq('alumna_id', alumnaId)
        .eq('payment_type', 'INSCRIPCION')
        .order('payment_date', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const p = data[0];
        return {
          exists: true,
          pago: p,
          tipo: 'INSCRIPCION',
          message: `Esta alumna ya tiene una inscripción registrada el ${p.payment_date} por $${(p.amount || 0).toLocaleString('es-AR')}.`,
        };
      }
    }

    if (paymentType === 'MENSUALIDAD') {
      const { data, error } = await supabase
        .from('pagos')
        .select('id, amount, payment_date, period, payment_type, concept')
        .eq('alumna_id', alumnaId)
        .eq('payment_type', 'MENSUALIDAD')
        .order('payment_date', { ascending: false });

      if (!error && data) {
        const matchingPago = data.find((p) => normalizePeriodToYearMonth(p.period) === currentPeriod);
        if (matchingPago) {
          return {
            exists: true,
            pago: matchingPago,
            tipo: 'MENSUALIDAD',
            message: `Ya existe un pago de cuota para el período ${currentPeriod} registrado el ${matchingPago.payment_date} por $${(matchingPago.amount || 0).toLocaleString('es-AR')}.`,
          };
        }
      }
    }

    return { exists: false, tipo: paymentType };
  } catch (err) {
    console.error('Error al verificar cobro existente:', err);
    return { exists: false, tipo: params.paymentType };
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
  period?: string;
  commission_rate?: number;
  notes?: string;
  sede_id?: string;
  profesora_id?: string;
  recorded_by_id?: string;
  recorded_by_name?: string;
  allow_duplicate?: boolean;
  split_payment?: SplitPaymentData;
}): Promise<{ data: Pago | null; error: string | null }> {
  try {
    const supabase = createClient();
    const today = getLocalDateISO();

    const isInscripcion =
      pagoData.payment_type === 'INSCRIPCION' ||
      (pagoData.concept?.toLowerCase().includes('inscripci') ?? false) ||
      (pagoData.concept?.toLowerCase().includes('matr') ?? false) ||
      (pagoData.concept?.toLowerCase().includes('ingreso') ?? false);

    const commRate = isInscripcion
      ? 0
      : (pagoData.commission_rate != null ? pagoData.commission_rate : 0.40);
    const commAmount = isInscripcion ? 0 : (pagoData.amount || 0) * commRate;

    const finalPaymentType: TipoPago = isInscripcion
      ? 'INSCRIPCION'
      : (pagoData.payment_type || 'MENSUALIDAD');

    const rawPeriod = pagoData.period || pagoData.billing_month || today.slice(0, 7);
    const currentPeriod = normalizePeriodToYearMonth(rawPeriod);

    // =====================================================================
    // CAPA 1: Idempotency key - bloqueo en memoria contra doble clic / doble submit (60s)
    // =====================================================================
    if (!pagoData.allow_duplicate) {
      const idempotencyKey = generateIdempotencyKey(
        pagoData.alumna_id,
        finalPaymentType,
        currentPeriod,
        pagoData.amount
      );
      if (isRecentDuplicate(idempotencyKey)) {
        return {
          data: null,
          error: 'Este cobro ya fue procesado hace instantes. Esperá unos segundos antes de intentar nuevamente.',
        };
      }
    }

    // =====================================================================
    // CAPA 2: Prevención de doble INSCRIPCIÓN para la misma alumna
    // =====================================================================
    if (finalPaymentType === 'INSCRIPCION' && !pagoData.allow_duplicate) {
      const { data: existingInscripciones } = await supabase
        .from('pagos')
        .select('id')
        .eq('alumna_id', pagoData.alumna_id)
        .eq('payment_type', 'INSCRIPCION')
        .limit(1);

      if (existingInscripciones && existingInscripciones.length > 0) {
        return {
          data: null,
          error: 'Esta alumna ya tiene una inscripción registrada. No se procesó el cobro duplicado.',
        };
      }
    }

    // =====================================================================
    // CAPA 3: Prevención de doble MENSUALIDAD para el mismo período
    // =====================================================================
    if (finalPaymentType === 'MENSUALIDAD' && !pagoData.allow_duplicate) {
      const { data: existingPagos } = await supabase
        .from('pagos')
        .select('id, amount, payment_date, concept, period')
        .eq('alumna_id', pagoData.alumna_id)
        .eq('payment_type', 'MENSUALIDAD');

      const isDuplicate = existingPagos?.some((ep) => {
        const epNorm = normalizePeriodToYearMonth(ep.period);
        return epNorm === currentPeriod;
      });

      if (isDuplicate) {
        return {
          data: null,
          error: `Ya existe un pago registrado para esta alumna en el período ${currentPeriod}. Si necesitás registrar un cobro adicional, confirmá la operación.`,
        };
      }
    }

    // Armar notas con métodos de pago y quién cobró
    const notesParts: string[] = [];
    if (pagoData.notes?.trim()) {
      notesParts.push(pagoData.notes.trim());
    }
    if (pagoData.split_payment && !notesParts.some((n) => n.includes('[Métodos de pago:'))) {
      notesParts.push(
        `[Métodos de pago: ${(pagoData.split_payment.method1 || '').replace('_', ' ')} $${pagoData.split_payment.amount1.toLocaleString('es-AR')} | ${(pagoData.split_payment.method2 || '').replace('_', ' ')} $${pagoData.split_payment.amount2.toLocaleString('es-AR')}]`
      );
    }
    if (pagoData.recorded_by_name?.trim() && !notesParts.some((n) => n.includes('[Cobrado por:'))) {
      notesParts.push(`[Cobrado por: ${pagoData.recorded_by_name.trim()}]`);
    }
    const finalNotes = notesParts.join(' ') || null;

    const finalMethod = pagoData.split_payment ? 'otro' : pagoData.payment_method;
    const finalProfesoraId = pagoData.recorded_by_id || pagoData.profesora_id || null;

    const { data, error } = await supabase
      .from('pagos')
      .insert({
        alumna_id: pagoData.alumna_id,
        amount: pagoData.amount,
        payment_method: finalMethod,
        payment_type: finalPaymentType,
        payment_date: today,
        concept: pagoData.concept || (finalPaymentType === 'INSCRIPCION' ? 'Inscripción inicial' : 'Cuota mensualidad'),
        period: currentPeriod,
        commission_rate: commRate,
        commission_amount: commAmount,
        notes: finalNotes,
        sede_id: pagoData.sede_id || null,
        profesora_id: finalProfesoraId,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Actualizar datos de la alumna (vencimiento y estado de pago)
    try {
      const alumnaUpdate: Record<string, any> = {};
      if (finalPaymentType === 'INSCRIPCION') {
        alumnaUpdate.enrollment_paid = true;
      } else {
        if (pagoData.due_date) {
          alumnaUpdate.billing_due_date = pagoData.due_date;
        }
        alumnaUpdate.monthly_paid = true;
      }

      await supabase
        .from('alumnas')
        .update(alumnaUpdate)
        .eq('id', pagoData.alumna_id);
    } catch (errAlum) {
      console.warn('Advertencia al actualizar alumna:', errAlum);
    }

    // Registrar ingreso(s) automático(s) en Caja Movimientos
    try {
      let titularName = '';
      try {
        const { data: alumData } = await supabase
          .from('alumnas')
          .select('first_name, last_name')
          .eq('id', pagoData.alumna_id)
          .maybeSingle();
        if (alumData) {
          titularName = `${alumData.first_name || ''} ${alumData.last_name || ''}`.trim();
        }
      } catch {}

      if (pagoData.split_payment) {
        // Asiento contable doble para cobro dividido
        const sp = pagoData.split_payment;
        const movs = [
          {
            tipo: 'INGRESO',
            concepto: `${pagoData.concept || 'Cobro cuota mensualidad'} (Pago combinado 1/2)`,
            monto: sp.amount1,
            metodo_pago: sp.method1,
            sede_id: pagoData.sede_id || null,
            fecha: today,
            description: data?.id ? `pago_id:${data.id}` : null,
            observations: titularName
              ? `Titular: ${titularName} · Pago combinado (1/2)${pagoData.recorded_by_name ? ` · Cobrado por: ${pagoData.recorded_by_name}` : ''}`
              : `Pago combinado (1/2)${pagoData.recorded_by_name ? ` · Cobrado por: ${pagoData.recorded_by_name}` : ''}`,
            recorded_by: pagoData.recorded_by_id || null,
          },
          {
            tipo: 'INGRESO',
            concepto: `${pagoData.concept || 'Cobro cuota mensualidad'} (Pago combinado 2/2)`,
            monto: sp.amount2,
            metodo_pago: sp.method2,
            sede_id: pagoData.sede_id || null,
            fecha: today,
            description: data?.id ? `pago_id:${data.id}` : null,
            observations: titularName
              ? `Titular: ${titularName} · Pago combinado (2/2)${pagoData.recorded_by_name ? ` · Cobrado por: ${pagoData.recorded_by_name}` : ''}`
              : `Pago combinado (2/2)${pagoData.recorded_by_name ? ` · Cobrado por: ${pagoData.recorded_by_name}` : ''}`,
            recorded_by: pagoData.recorded_by_id || null,
          },
        ];
        const { error: cajaSplitErr } = await supabase.from('caja_movimientos').insert(movs);
        if (cajaSplitErr) {
          console.warn('Advertencia al registrar movimientos combinados de caja:', cajaSplitErr.message);
        }
      } else {
        const { error: cajaError } = await supabase.from('caja_movimientos').insert({
          tipo: 'INGRESO',
          concepto: pagoData.concept || (finalPaymentType === 'INSCRIPCION' ? 'Cobro inscripción inicial - Alumna' : 'Cobro cuota mensualidad - Alumna'),
          monto: pagoData.amount,
          metodo_pago: pagoData.payment_method,
          sede_id: pagoData.sede_id || null,
          fecha: today,
          description: data?.id ? `pago_id:${data.id}` : null,
          observations: titularName
            ? `Titular: ${titularName}${pagoData.recorded_by_name ? ` · Cobrado por: ${pagoData.recorded_by_name}` : ''}`
            : (pagoData.recorded_by_name ? `Cobrado por: ${pagoData.recorded_by_name}` : null),
          recorded_by: pagoData.recorded_by_id || null,
        });
        if (cajaError) {
          console.warn('Advertencia al registrar movimiento de caja:', cajaError.message);
        }
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
        cobrado_por: pagoData.recorded_by_name || 'Administración',
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
            .eq('payment_type', 'MENSUALIDAD')
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

export async function updatePago(
  id: string,
  updates: {
    amount?: number;
    payment_method?: MetodoPago;
    payment_type?: TipoPago;
    payment_date?: string;
    due_date?: string;
    period?: string;
    concept?: string;
    notes?: string;
    sede_id?: string;
    alumna_id?: string;
    profesora_id?: string;
    commission_rate?: number;
  }
): Promise<{ data: Pago | null; error: string | null }> {
  try {
    const supabase = createClient();
    const updatePayload: any = {};
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.payment_method !== undefined) updatePayload.payment_method = updates.payment_method;
    if (updates.payment_type !== undefined) updatePayload.payment_type = updates.payment_type;
    if (updates.payment_date !== undefined) updatePayload.payment_date = updates.payment_date;
    if (updates.due_date !== undefined) updatePayload.due_date = updates.due_date;
    if (updates.period !== undefined) updatePayload.period = normalizePeriodToYearMonth(updates.period);
    if (updates.concept !== undefined) updatePayload.concept = updates.concept;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.sede_id !== undefined) updatePayload.sede_id = updates.sede_id;
    if (updates.alumna_id !== undefined) updatePayload.alumna_id = updates.alumna_id;
    if (updates.profesora_id !== undefined) updatePayload.profesora_id = updates.profesora_id;
    if (updates.commission_rate !== undefined) {
      updatePayload.commission_rate = updates.commission_rate;
      if (updates.amount !== undefined) {
        updatePayload.commission_amount = updates.amount * updates.commission_rate;
      }
    }

    const { data, error } = await supabase
      .from('pagos')
      .update(updatePayload)
      .eq('id', id)
      .select('*, alumna:alumnas(*)')
      .single();

    if (error) return { data: null, error: error.message };

    // Sincronizar en caja_movimientos si cambió monto, método, sede, concepto o fecha
    try {
      const cajaUpdates: any = {};
      if (updates.amount !== undefined) cajaUpdates.monto = updates.amount;
      if (updates.sede_id !== undefined) cajaUpdates.sede_id = updates.sede_id;
      if (updates.payment_method !== undefined) cajaUpdates.metodo_pago = updates.payment_method;
      if (updates.concept !== undefined) cajaUpdates.concepto = updates.concept;
      if (updates.payment_date !== undefined) cajaUpdates.fecha = updates.payment_date;

      if (Object.keys(cajaUpdates).length > 0) {
        await supabase
          .from('caja_movimientos')
          .update(cajaUpdates)
          .eq('description', `pago_id:${id}`);
      }
    } catch (cajaErr) {
      console.warn('Advertencia al sincronizar edición de caja:', cajaErr);
    }

    // Sincronizar vencimiento de la alumna si se actualizó due_date
    if (updates.due_date && data?.alumna_id) {
      try {
        await supabase
          .from('alumnas')
          .update({
            billing_due_date: updates.due_date,
            monthly_paid: updates.due_date >= getLocalDateISO(),
          })
          .eq('id', data.alumna_id);
      } catch (syncAlumnaErr) {
        console.warn('Advertencia al sincronizar fecha de vencimiento de alumna tras edición de pago:', syncAlumnaErr);
      }
    }

    return { data: data as Pago, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error al actualizar el pago' };
  }
}



