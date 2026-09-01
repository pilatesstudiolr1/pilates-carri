import { createClient } from '@/lib/supabase/client';
import { getProfiles } from '@/lib/services/profesoras';
import { getPagos } from '@/lib/services/pagos';

export interface LiquidacionSemanal {
  id: string;
  profesora_id: string;
  profesora_nombre: string;
  period_start: string;
  period_end: string;
  total_collected: number;
  commission_rate: number;
  teacher_amount: number;
  studio_amount: number;
  status: 'PENDING' | 'PAID';
  paid_at?: string | null;
  notes?: string | null;
  detalles: LiquidacionDetalle[];
}

export interface LiquidacionDetalle {
  id: string;
  liquidacion_id?: string;
  pago_id?: string | null;
  alumna_nombre: string;
  payment_date: string;
  plan_name: string;
  amount_paid: number;
  teacher_commission: number;
  sede_name: string;
}

const LOCAL_LIQUIDACIONES_KEY = 'studio_liquidaciones_semanales_store';

function getStoredLiquidaciones(): LiquidacionSemanal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LIQUIDACIONES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLiquidacion(liq: LiquidacionSemanal) {
  if (typeof window === 'undefined') return;
  try {
    const store = getStoredLiquidaciones();
    const idx = store.findIndex((item) => item.id === liq.id);
    if (idx >= 0) {
      store[idx] = liq;
    } else {
      store.push(liq);
    }
    localStorage.setItem(LOCAL_LIQUIDACIONES_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export async function calcularLiquidacionSemanal(
  profesoraId: string,
  startDate: string,
  endDate: string
): Promise<{ data: LiquidacionSemanal | null; error: string | null }> {
  try {
    const [profsRes, pagosRes] = await Promise.all([
      getProfiles({ role: 'PROFESORA', isActive: true }),
      getPagos({ status: 'PAID' }),
    ]);

    const profe = profsRes.data.find((p) => p.id === profesoraId);
    const profesoraNombre = profe?.full_name || 'Profesora';
    const commissionRate = profe?.commission_rate ?? 0.40;

    // Filtrar cobros efectivamente ingresados en el período para esa profesora estrictamente
    const pagosFiltrados = pagosRes.data.filter((p) => {
      const pDate = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      const matchDate = pDate >= startDate && pDate <= endDate;
      const profeIdAsignada = p.profesora_id || (p.alumna as any)?.profesora_id;
      const matchProfe = profeIdAsignada === profesoraId;
      return matchDate && matchProfe;
    });

    const detalles: LiquidacionDetalle[] = pagosFiltrados.map((p) => {
      const amountPaid = p.amount || 0;
      const teacherComm = amountPaid * commissionRate;
      return {
        id: `det-${p.id}`,
        pago_id: p.id,
        alumna_nombre: p.alumna ? `${p.alumna.first_name} ${p.alumna.last_name || ''}`.trim() : 'Alumna',
        payment_date: p.payment_date || (p.created_at ? p.created_at.split('T')[0] : startDate),
        plan_name: p.concept || p.plan || p.notes || 'Mensualidad',
        amount_paid: amountPaid,
        teacher_commission: teacherComm,
        sede_name: (p.alumna as any)?.sede?.name || 'Sede Principal',
      };
    });

    const totalCollected = detalles.reduce((acc, d) => acc + d.amount_paid, 0);
    const teacherAmount = totalCollected * commissionRate;
    const studioAmount = totalCollected - teacherAmount;

    const liquidacion: LiquidacionSemanal = {
      id: `liq-${profesoraId}-${startDate}-${endDate}`,
      profesora_id: profesoraId,
      profesora_nombre: profesoraNombre,
      period_start: startDate,
      period_end: endDate,
      total_collected: totalCollected,
      commission_rate: commissionRate,
      teacher_amount: teacherAmount,
      studio_amount: studioAmount,
      status: 'PENDING',
      detalles,
    };

    return { data: liquidacion, error: null };
  } catch {
    return { data: null, error: 'Error al calcular la liquidación' };
  }
}

export interface LiquidacionGlobalResumen {
  period_start: string;
  period_end: string;
  total_recaudado: number;
  total_estudio: number;
  total_profesoras: number;
  total_pagos: number;
  liquidaciones_profesoras: LiquidacionSemanal[];
  todos_los_detalles: LiquidacionDetalle[];
}

export interface DisponibilidadCamillaItem {
  clase_id: string;
  clase_nombre: string;
  sede_id: string | null;
  sede_nombre: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  profesora_nombre: string;
  max_capacity: number;
  ocupadas_count: number;
  libres_count: number;
  camillas_libres: number[];
  camillas_ocupadas: { camilla: number; alumna_nombre: string; alumna_id?: string; phone?: string; status?: string }[];
}

const DIAS_MAPA: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export async function calcularLiquidacionGlobal(
  startDate: string,
  endDate: string
): Promise<{ data: LiquidacionGlobalResumen | null; error: string | null }> {
  try {
    const [profsRes, pagosRes] = await Promise.all([
      getProfiles({ role: 'PROFESORA', isActive: true }),
      getPagos({ status: 'PAID' }),
    ]);

    const todasProfesoras = profsRes.data.filter((p) => p.role === 'PROFESORA');
    const todosLosPagos = pagosRes.data.filter((p) => {
      const pDate = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      return pDate >= startDate && pDate <= endDate;
    });

    const liquidaciones_profesoras: LiquidacionSemanal[] = [];
    const todos_los_detalles: LiquidacionDetalle[] = [];

    let totalRecaudadoGlobal = 0;
    let totalProfesorasGlobal = 0;
    let totalEstudioGlobal = 0;

    for (const profe of todasProfesoras) {
      const commissionRate = profe.commission_rate ?? 0.40;
      
      // Cada pago se atribuye estrictamente a la profesora asignada (pago.profesora_id o alumna.profesora_id)
      const pagosDeEstaProfe = todosLosPagos.filter((p) => {
        const asignadaId = p.profesora_id || (p.alumna as any)?.profesora_id;
        return asignadaId === profe.id;
      });

      const detalles: LiquidacionDetalle[] = pagosDeEstaProfe.map((p) => {
        const amountPaid = p.amount || 0;
        const teacherComm = amountPaid * commissionRate;
        const item: LiquidacionDetalle = {
          id: `det-${p.id}`,
          pago_id: p.id,
          alumna_nombre: p.alumna ? `${p.alumna.first_name} ${p.alumna.last_name || ''}`.trim() : 'Alumna',
          payment_date: p.payment_date || (p.created_at ? p.created_at.split('T')[0] : startDate),
          plan_name: p.concept || p.plan || p.notes || 'Mensualidad',
          amount_paid: amountPaid,
          teacher_commission: teacherComm,
          sede_name: (p.alumna as any)?.sede?.name || 'Sede Principal',
        };
        todos_los_detalles.push(item);
        return item;
      });

      const totalCollected = detalles.reduce((acc, d) => acc + d.amount_paid, 0);
      const teacherAmount = totalCollected * commissionRate;
      const studioAmount = totalCollected - teacherAmount;

      totalRecaudadoGlobal += totalCollected;
      totalProfesorasGlobal += teacherAmount;
      totalEstudioGlobal += studioAmount;

      liquidaciones_profesoras.push({
        id: `liq-${profe.id}-${startDate}-${endDate}`,
        profesora_id: profe.id,
        profesora_nombre: profe.full_name,
        period_start: startDate,
        period_end: endDate,
        total_collected: totalCollected,
        commission_rate: commissionRate,
        teacher_amount: teacherAmount,
        studio_amount: studioAmount,
        status: 'PENDING',
        detalles,
      });
    }

    // Pagos sin profesora asignada (100% ingreso directo del estudio)
    const pagosSinProfe = todosLosPagos.filter((p) => {
      const asignadaId = p.profesora_id || (p.alumna as any)?.profesora_id;
      return !todasProfesoras.some((pr) => pr.id === asignadaId);
    });

    for (const p of pagosSinProfe) {
      const amountPaid = p.amount || 0;
      totalRecaudadoGlobal += amountPaid;
      totalEstudioGlobal += amountPaid;

      todos_los_detalles.push({
        id: `det-${p.id}`,
        pago_id: p.id,
        alumna_nombre: p.alumna ? `${p.alumna.first_name} ${p.alumna.last_name || ''}`.trim() : 'Cobro Directo Estudio',
        payment_date: p.payment_date || (p.created_at ? p.created_at.split('T')[0] : startDate),
        plan_name: p.concept || p.plan || 'Cobro directo',
        amount_paid: amountPaid,
        teacher_commission: 0,
        sede_name: 'Estudio General',
      });
    }

    const resultado: LiquidacionGlobalResumen = {
      period_start: startDate,
      period_end: endDate,
      total_recaudado: totalRecaudadoGlobal,
      total_estudio: totalEstudioGlobal,
      total_profesoras: totalProfesorasGlobal,
      total_pagos: todosLosPagos.length,
      liquidaciones_profesoras,
      todos_los_detalles,
    };

    return { data: resultado, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Error al calcular liquidación global' };
  }
}

export async function getDisponibilidadCamillas(options?: {
  dayOfWeek?: number;
  sedeId?: string;
  profesoraId?: string;
}): Promise<{ data: DisponibilidadCamillaItem[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('clases')
      .select('*, profesora:profiles(*), sede:sedes(*), clase_alumnas(id, alumna_id, camilla, status, alumna:alumnas(id, first_name, last_name, phone, status, start_date))')
      .eq('is_active', true);

    if (options?.sedeId && options.sedeId !== 'ALL') {
      query = query.eq('sede_id', options.sedeId);
    }
    if (options?.dayOfWeek) {
      query = query.eq('day_of_week', options.dayOfWeek);
    }
    if (options?.profesoraId && options.profesoraId !== 'ALL') {
      query = query.eq('profesora_id', options.profesoraId);
    }

    query = query.order('day_of_week').order('start_time');

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const items: DisponibilidadCamillaItem[] = (data || []).map((c: any) => {
      const maxCap = c.max_capacity || (c.sede?.max_camillas || 6);
      const inscripciones = c.clase_alumnas || [];
      const ocupadasCamillasMap = new Map<number, { nombre: string; id?: string; phone?: string; status?: string }>();

      inscripciones.forEach((ca: any) => {
        if (ca.camilla != null) {
          const nombre = ca.alumna ? `${ca.alumna.first_name} ${ca.alumna.last_name || ''}`.trim() : 'Inscripta';
          ocupadasCamillasMap.set(ca.camilla, {
            nombre,
            id: ca.alumna_id,
            phone: ca.alumna?.phone,
            status: ca.status || ca.alumna?.status,
          });
        }
      });

      const camillasLibres: number[] = [];
      const camillasOcupadas: { camilla: number; alumna_nombre: string; alumna_id?: string; phone?: string; status?: string }[] = [];

      for (let i = 1; i <= maxCap; i++) {
        if (ocupadasCamillasMap.has(i)) {
          const slot = ocupadasCamillasMap.get(i)!;
          camillasOcupadas.push({
            camilla: i,
            alumna_nombre: slot.nombre,
            alumna_id: slot.id,
            phone: slot.phone,
            status: slot.status,
          });
        } else {
          camillasLibres.push(i);
        }
      }

      return {
        clase_id: c.id,
        clase_nombre: c.name,
        sede_id: c.sede_id,
        sede_nombre: c.sede?.name || 'Sede Principal',
        day_of_week: c.day_of_week,
        day_name: DIAS_MAPA[c.day_of_week] || `Día ${c.day_of_week}`,
        start_time: c.start_time?.slice(0, 5) || '08:00',
        end_time: c.end_time?.slice(0, 5) || '09:00',
        profesora_nombre: c.profesora?.full_name || 'Sin profesora',
        max_capacity: maxCap,
        ocupadas_count: inscripciones.length,
        libres_count: camillasLibres.length,
        camillas_libres: camillasLibres,
        camillas_ocupadas: camillasOcupadas,
      };
    });

    return { data: items, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Error al consultar disponibilidad' };
  }
}

export async function marcarLiquidacionPagada(
  liquidacion: LiquidacionSemanal
): Promise<{ error: string | null }> {
  try {
    const updated: LiquidacionSemanal = {
      ...liquidacion,
      status: 'PAID',
      paid_at: new Date().toISOString(),
    };

    saveStoredLiquidacion(updated);

    const supabase = createClient();
    await supabase.from('liquidaciones_semanales').insert({
      profesora_id: liquidacion.profesora_id,
      period_start: liquidacion.period_start,
      period_end: liquidacion.period_end,
      total_collected: liquidacion.total_collected,
      commission_rate: liquidacion.commission_rate,
      teacher_amount: liquidacion.teacher_amount,
      studio_amount: liquidacion.studio_amount,
      status: 'PAID',
      paid_at: updated.paid_at,
    });

    return { error: null };
  } catch {
    saveStoredLiquidacion({ ...liquidacion, status: 'PAID', paid_at: new Date().toISOString() });
    return { error: null };
  }
}

export async function getHistorialLiquidaciones(): Promise<{ data: LiquidacionSemanal[]; error: string | null }> {
  const localList = getStoredLiquidaciones();
  return { data: localList, error: null };
}
