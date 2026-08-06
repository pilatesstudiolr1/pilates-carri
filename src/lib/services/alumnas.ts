import { createClient } from '@/lib/supabase/client';
import { Alumna, AlumnaInsert, AlumnaUpdate, AlumnaStatus } from '@/types/database';

export async function getAlumnas(options?: {
  search?: string;
  status?: AlumnaStatus | 'ALL';
  limit?: number;
  offset?: number;
}): Promise<{ data: Alumna[]; count: number; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('alumnas')
      .select('*', { count: 'exact' });

    if (options?.status && options.status !== 'ALL') {
      query = query.eq('status', options.status);
    }

    if (options?.search && options.search.trim() !== '') {
      const term = `%${options.search.trim()}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},dni.ilike.${term},phone.ilike.${term}`
      );
    }

    query = query
      .order('created_at', { ascending: false })
      .range(
        options?.offset || 0,
        (options?.offset || 0) + (options?.limit || 50) - 1
      );

    const { data, count, error } = await query;

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    return { data: (data as Alumna[]) || [], count: count || 0, error: null };
  } catch (err) {
    return {
      data: [],
      count: 0,
      error: err instanceof Error ? err.message : 'Error inesperado',
    };
  }
}

export async function getAlumnaById(id: string): Promise<{ data: Alumna | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alumnas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Alumna, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al obtener datos de alumna',
    };
  }
}

export async function createAlumna(
  alumnaData: AlumnaInsert
): Promise<{ data: Alumna | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alumnas')
      .insert([alumnaData])
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Alumna, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al registrar alumna',
    };
  }
}

export async function updateAlumna(
  id: string,
  alumnaData: AlumnaUpdate
): Promise<{ data: Alumna | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('alumnas')
      .update(alumnaData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Alumna, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al actualizar alumna',
    };
  }
}

export async function updateAlumnaStatus(
  id: string,
  status: AlumnaStatus,
  exitReason?: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const updateData: AlumnaUpdate = {
      status,
      ...(status === 'INACTIVE' ? { exit_date: new Date().toISOString().split('T')[0], exit_reason: exitReason } : {}),
    };

    const { error } = await supabase
      .from('alumnas')
      .update(updateData)
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al cambiar estado de alumna',
    };
  }
}
