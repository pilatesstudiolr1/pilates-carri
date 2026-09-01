import { createClient } from '@/lib/supabase/client';
import { Profile, ProfileUpdate, UserRole } from '@/types/database';

export async function getProfiles(options?: {
  role?: UserRole | 'ALL';
  isActive?: boolean | 'ALL';
  search?: string;
}): Promise<{ data: Profile[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase.from('profiles').select('*');

    if (options?.role && options.role !== 'ALL') {
      query = query.eq('role', options.role);
    }

    if (options?.isActive !== undefined && options.isActive !== 'ALL') {
      query = query.eq('is_active', options.isActive);
    }

    if (options?.search && options.search.trim() !== '') {
      const term = `%${options.search.trim()}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }

    query = query.order('full_name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as Profile[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error inesperado al consultar usuarios',
    };
  }
}

export async function updateProfileData(
  id: string,
  updateData: ProfileUpdate
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al actualizar perfil',
    };
  }
}

export async function createOrUpdateProfileByEmail(profileData: {
  id?: string;
  email: string;
  full_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole;
  phone?: string | null;
  dni?: string | null;
  turno?: string | null;
  hire_date?: string | null;
  observations?: string | null;
  username?: string | null;
  password?: string | null;
  password_text?: string | null;
  work_days?: string[];
  work_hours?: string[];
  sede_id?: string | null;
  commission_rate?: number;
  is_active?: boolean;
}): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const isUpdate = !!profileData.id;
    const response = await fetch('/api/admin/users', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    const resData = await response.json();

    if (!response.ok || resData.error) {
      return { data: null, error: resData.error || 'Error al procesar el usuario' };
    }

    return { data: resData.data as Profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar/asignar perfil',
    };
  }
}

export async function toggleProfileActive(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al cambiar estado de usuario',
    };
  }
}

export async function deleteProfile(id: string): Promise<{ error: string | null }> {
  try {
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    const resData = await response.json();

    if (!response.ok || resData.error) {
      return { error: resData.error || 'Error al eliminar usuario' };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al eliminar profesora',
    };
  }
}

// ============================================================
// Liquidacion de Profesoras (estadistica de comisiones)
// ============================================================

export interface LiquidacionProfesoraItem {
  profesora_id: string;
  profesora_nombre: string;
  commission_rate: number;
  pagos_hoy: number;
  monto_hoy: number;
  comision_hoy: number;
  pagos_mes: number;
  monto_mes: number;
  comision_mes: number;
}

export async function getLiquidacionProfesoras(): Promise<{
  data: LiquidacionProfesoraItem[];
  error: string | null;
}> {
  try {
    const supabase = createClient();
    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.slice(0, 7);

    const [pagosRes, alumnasRes, profilesRes] = await Promise.all([
      supabase
        .from('pagos')
        .select('amount, payment_date, profesora_id, alumna_id')
        .gte('payment_date', `${mesActual}-01`),
      supabase
        .from('alumnas')
        .select('id, profesora_id'),
      supabase
        .from('profiles')
        .select('id, full_name, commission_rate'),
    ]);

    if (pagosRes.error) return { data: [], error: pagosRes.error.message };

    const alumnasMap = new Map<string, string | null>();
    if (alumnasRes.data) {
      alumnasRes.data.forEach((a: any) => {
        if (a.id) alumnasMap.set(a.id, a.profesora_id || null);
      });
    }

    const profilesMap = new Map<string, { id: string; full_name: string; commission_rate: number }>();
    if (profilesRes.data) {
      profilesRes.data.forEach((p: any) => {
        if (p.id) profilesMap.set(p.id, p);
      });
    }

    const map = new Map<string, LiquidacionProfesoraItem>();

    for (const pago of (pagosRes.data as any[])) {
      const pid = pago.profesora_id || (pago.alumna_id ? alumnasMap.get(pago.alumna_id) : null);
      if (!pid) continue;

      const profesora = profilesMap.get(pid);
      if (!profesora) continue;

      const esHoy = pago.payment_date === hoy;
      const rate = profesora.commission_rate ?? 0.4;
      const comision = (pago.amount || 0) * rate;

      if (!map.has(pid)) {
        map.set(pid, {
          profesora_id: pid,
          profesora_nombre: profesora.full_name || 'Sin nombre',
          commission_rate: rate,
          pagos_hoy: 0,
          monto_hoy: 0,
          comision_hoy: 0,
          pagos_mes: 0,
          monto_mes: 0,
          comision_mes: 0,
        });
      }

      const item = map.get(pid)!;
      item.pagos_mes += 1;
      item.monto_mes += (pago.amount || 0);
      item.comision_mes += comision;

      if (esHoy) {
        item.pagos_hoy += 1;
        item.monto_hoy += (pago.amount || 0);
        item.comision_hoy += comision;
      }
    }

    return { data: Array.from(map.values()), error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al calcular liquidacion',
    };
  }
}
