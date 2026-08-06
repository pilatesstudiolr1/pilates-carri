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
