import { createClient } from '@/lib/supabase/client';
import { Clase, ClaseAlumna, Asistencia } from '@/types/database';

export async function getClases(options?: {
  dayOfWeek?: number;
  profesoraId?: string;
}): Promise<{ data: Clase[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('clases')
      .select('*, profesora:profiles(*), clase_alumnas(id, alumna:alumnas(*))')
      .eq('is_active', true);

    if (options?.dayOfWeek) {
      query = query.eq('day_of_week', options.dayOfWeek);
    }

    if (options?.profesoraId) {
      query = query.eq('profesora_id', options.profesoraId);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };

    const formattedClases: Clase[] = (data || []).map((item: any) => ({
      ...item,
      alumnas_count: item.clase_alumnas?.length || 0,
      alumnas: item.clase_alumnas?.map((ca: any) => ca.alumna).filter(Boolean) || [],
    }));

    return { data: formattedClases, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al consultar clases',
    };
  }
}

export async function createClase(claseData: {
  name: string;
  profesora_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
}): Promise<{ data: Clase | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clases')
      .insert(claseData)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Clase, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al crear la clase',
    };
  }
}

export async function addAlumnaToClase(
  claseId: string,
  alumnaId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    // Check capacity first
    const { data: clase } = await supabase
      .from('clases')
      .select('max_capacity, clase_alumnas(id)')
      .eq('id', claseId)
      .single();

    if (clase) {
      const currentCount = clase.clase_alumnas?.length || 0;
      if (currentCount >= clase.max_capacity) {
        return { error: `La clase ha alcanzado la capacidad máxima de ${clase.max_capacity} alumnas.` };
      }
    }

    const { error } = await supabase.from('clase_alumnas').insert({
      clase_id: claseId,
      alumna_id: alumnaId,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al asignar alumna a la clase',
    };
  }
}

export async function removeAlumnaFromClase(
  claseId: string,
  alumnaId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('clase_alumnas')
      .delete()
      .eq('clase_id', claseId)
      .eq('alumna_id', alumnaId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al remover alumna del turno',
    };
  }
}
