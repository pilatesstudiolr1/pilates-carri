import { createClient } from '@/lib/supabase/client';
import { Sede } from '@/types/database';

export async function getSedes(options?: {
  isActive?: boolean | 'ALL';
}): Promise<{ data: Sede[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase.from('sedes').select('*');

    if (options?.isActive !== undefined && options.isActive !== 'ALL') {
      query = query.eq('is_active', options.isActive);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: (data as Sede[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al obtener sedes',
    };
  }
}

export async function createSede(sedeData: {
  name: string;
  address?: string | null;
  phone?: string | null;
  max_camillas?: number;
}): Promise<{ data: Sede | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sedes')
      .insert({
        name: sedeData.name,
        address: sedeData.address || null,
        phone: sedeData.phone || null,
        max_camillas: sedeData.max_camillas || 6,
        is_active: true,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Sede, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al crear la sede',
    };
  }
}

export async function updateSede(
  id: string,
  sedeData: Partial<{
    name: string;
    address: string | null;
    phone: string | null;
    max_camillas: number;
    is_active: boolean;
  }>
): Promise<{ data: Sede | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sedes')
      .update(sedeData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Sede, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al actualizar la sede',
    };
  }
}
