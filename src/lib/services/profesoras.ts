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
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  dni?: string | null;
  commission_rate?: number;
  is_active?: boolean;
}): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createClient();
    const cleanEmail = profileData.email.trim().toLowerCase();

    // Verificar si ya existe perfil registrado con ese email
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          role: profileData.role,
          phone: profileData.phone || null,
          dni: profileData.dni || null,
          commission_rate: profileData.commission_rate ?? 0.40,
          is_active: profileData.is_active ?? true,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as Profile, error: null };
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          email: cleanEmail,
          full_name: profileData.full_name,
          role: profileData.role,
          phone: profileData.phone || null,
          dni: profileData.dni || null,
          commission_rate: profileData.commission_rate ?? 0.40,
          is_active: profileData.is_active ?? true,
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as Profile, error: null };
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar/asignar perfil por email',
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

    const { data, error } = await supabase
      .from('pagos')
      .select('amount, commission_amount, payment_date, alumna:alumnas(profesora:profiles(id, full_name, commission_rate))')
      .eq('status', 'PAID')
      .gte('payment_date', `${mesActual}-01`);

    if (error) return { data: [], error: error.message };

    const map = new Map<string, LiquidacionProfesoraItem>();

    for (const pago of data as any[]) {
      const profesora = pago.alumna?.profesora;
      if (!profesora) continue;

      const pid = profesora.id;
      const esHoy = pago.payment_date === hoy;
      const rate = profesora.commission_rate ?? 0.4;
      const comision = pago.commission_amount || (pago.amount * rate);

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
      item.monto_mes += pago.amount;
      item.comision_mes += comision;

      if (esHoy) {
        item.pagos_hoy += 1;
        item.monto_hoy += pago.amount;
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
