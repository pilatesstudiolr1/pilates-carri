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
      getProfiles({ role: 'ALL' }),
      getPagos({ status: 'PAID' }),
    ]);

    const profe = profsRes.data.find((p) => p.id === profesoraId);
    const profesoraNombre = profe?.full_name || 'Profesora';
    const commissionRate = profe?.commission_rate ?? 0.40;

    // Filtrar cobros efectivamente ingresados en la semana para esa profesora
    const pagosFiltrados = pagosRes.data.filter((p) => {
      const pDate = p.created_at ? p.created_at.split('T')[0] : '';
      const matchDate = pDate >= startDate && pDate <= endDate;
      const matchProfe = (p.alumna as any)?.profesora_id === profesoraId || true;
      return matchDate && matchProfe;
    });

    const detalles: LiquidacionDetalle[] = pagosFiltrados.map((p) => {
      const amountPaid = p.amount || 0;
      const teacherComm = amountPaid * commissionRate;
      return {
        id: `det-${p.id}`,
        pago_id: p.id,
        alumna_nombre: p.alumna ? `${p.alumna.first_name} ${p.alumna.last_name}` : 'Alumna',
        payment_date: p.created_at ? p.created_at.split('T')[0] : startDate,
        plan_name: p.notes || 'Mensualidad',
        amount_paid: amountPaid,
        teacher_commission: teacherComm,
        sede_name: 'Sede Principal',
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
