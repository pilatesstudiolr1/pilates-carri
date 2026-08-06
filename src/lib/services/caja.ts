import { createClient } from '@/lib/supabase/client';
import { CajaSesion, CajaMovimiento, MetodoPago } from '@/types/database';

export async function getMovimientos(): Promise<{ data: CajaMovimiento[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('caja_movimientos')
      .select('*')
      .order('creado_en', { ascending: false });

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
