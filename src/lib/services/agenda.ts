import { createClient } from '@/lib/supabase/client';
import { Clase, ClaseAlumna } from '@/types/database';

export async function getClases(options?: {
  dayOfWeek?: number;
  profesoraId?: string;
  sedeId?: string;
}): Promise<{ data: Clase[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('clases')
      .select('*, profesora:profiles(*), clase_alumnas(id, alumna_id, camilla, status, alumna:alumnas(*))')
      .eq('is_active', true);

    if (options?.sedeId && options.sedeId !== 'ALL') {
      query = query.eq('sede_id', options.sedeId);
    }

    if (options?.dayOfWeek) {
      query = query.eq('day_of_week', options.dayOfWeek);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };

    const formattedClases: Clase[] = (data || []).map((item: any) => {
      let filteredAlumnas = item.clase_alumnas || [];

      // Si se filtra por profesora, mostrar las alumnas vinculadas a esa profesora (o si la clase está asignada a ella)
      if (options?.profesoraId && options.profesoraId !== 'ALL') {
        filteredAlumnas = filteredAlumnas.filter(
          (ca: any) =>
            ca.alumna?.profesora_id === options.profesoraId ||
            item.profesora_id === options.profesoraId
        );
      }

      return {
        ...item,
        alumnas_count: filteredAlumnas.length,
        alumnas: filteredAlumnas,
      };
    });

    return { data: formattedClases, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al consultar clases',
    };
  }
}

export async function getClasesConAlumnas(options?: {
  dayOfWeek?: number;
  profesoraId?: string;
  sedeId?: string;
}): Promise<{ data: Clase[]; error: string | null }> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('clases')
      .select('*, profesora:profiles(*), sede:sedes(*), clase_alumnas(id, alumna_id, camilla, status, alumna:alumnas(id, first_name, last_name, dni, phone, profesora_id))')
      .eq('is_active', true);

    if (options?.sedeId && options.sedeId !== 'ALL') {
      query = query.eq('sede_id', options.sedeId);
    }

    if (options?.dayOfWeek) {
      query = query.eq('day_of_week', options.dayOfWeek);
    }
    query = query.order('day_of_week').order('start_time');

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const formattedClases: Clase[] = (data || []).map((item: any) => {
      let filteredAlumnas = item.clase_alumnas || [];

      if (options?.profesoraId && options.profesoraId !== 'ALL') {
        filteredAlumnas = filteredAlumnas.filter(
          (ca: any) =>
            ca.alumna?.profesora_id === options.profesoraId ||
            item.profesora_id === options.profesoraId
        );
      }

      return {
        ...item,
        alumnas_count: filteredAlumnas.length,
        alumnas: filteredAlumnas,
      };
    });

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
  sede_id?: string | null;
}): Promise<{ data: Clase | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clases')
      .insert({
        name: claseData.name,
        profesora_id: claseData.profesora_id,
        day_of_week: claseData.day_of_week,
        start_time: claseData.start_time,
        end_time: claseData.end_time,
        max_capacity: claseData.max_capacity,
        sede_id: claseData.sede_id || null,
        is_active: true,
      })
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

export async function updateClase(
  claseId: string,
  claseData: Partial<{
    name: string;
    profesora_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number;
    sede_id: string | null;
  }>
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('clases')
      .update(claseData)
      .eq('id', claseId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al actualizar la clase',
    };
  }
}

export async function deleteClase(claseId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    // Soft delete: marcar como inactiva en lugar de borrar fisicamente
    const { error } = await supabase
      .from('clases')
      .update({ is_active: false })
      .eq('id', claseId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al eliminar el turno',
    };
  }
}

export async function addAlumnaToClase(
  claseId: string,
  alumnaId: string,
  camilla?: number | null
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();

    // Verificar capacidad
    const { data: clase } = await supabase
      .from('clases')
      .select('max_capacity, clase_alumnas(id)')
      .eq('id', claseId)
      .single();

    if (clase) {
      const currentCount = clase.clase_alumnas?.length || 0;
      if (currentCount >= clase.max_capacity) {
        return { error: `La clase ha alcanzado la capacidad maxima de ${clase.max_capacity} alumnas.` };
      }
    }

    // Verificar que la camilla no este ya ocupada en este turno
    if (camilla != null) {
      const { data: camillaOcupada } = await supabase
        .from('clase_alumnas')
        .select('id')
        .eq('clase_id', claseId)
        .eq('camilla', camilla)
        .maybeSingle();

      if (camillaOcupada) {
        return { error: `La camilla ${camilla} ya esta asignada a otra alumna en este turno.` };
      }
    }

    // Verificar que la alumna no este ya en este turno
    const { data: yaAsignada } = await supabase
      .from('clase_alumnas')
      .select('id')
      .eq('clase_id', claseId)
      .eq('alumna_id', alumnaId)
      .maybeSingle();

    if (yaAsignada) {
      return { error: 'La alumna ya esta asignada a este turno.' };
    }

    const { error } = await supabase.from('clase_alumnas').insert({
      clase_id: claseId,
      alumna_id: alumnaId,
      camilla: camilla ?? null,
      status: 'ACTIVE',
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

export async function getClasesByAlumna(
  alumnaId: string
): Promise<{ data: ClaseAlumna[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clase_alumnas')
      .select('*, clase:clases(*, profesora:profiles(full_name))')
      .eq('alumna_id', alumnaId)
      .eq('status', 'ACTIVE');

    if (error) return { data: [], error: error.message };
    return { data: (data as ClaseAlumna[]) || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Error al consultar turnos de la alumna',
    };
  }
}
