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

    if (options?.profesoraId && options.profesoraId !== 'ALL') {
      query = query.eq('profesora_id', options.profesoraId);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) return { data: [], error: error.message };

    const formattedClases: Clase[] = (data || []).map((item: any) => {
      let filteredAlumnas = item.clase_alumnas || [];

      // Si se filtra por profesora, enmascarar alumnas asignadas a otras profesoras
      // para no filtrar la camilla (evita doble asignación) pero proteger privacidad
      if (options?.profesoraId && options.profesoraId !== 'ALL') {
        filteredAlumnas = filteredAlumnas.map((ca: any) => {
          if (ca.alumna && ca.alumna.profesora_id && ca.alumna.profesora_id !== options.profesoraId) {
            return {
              ...ca,
              is_other_profesora: true,
              alumna: {
                id: ca.alumna.id,
                first_name: 'Ocupado',
                last_name: '(Otra profesora)',
                phone: '',
                dni: '',
                profesora_id: ca.alumna.profesora_id,
              },
            };
          }
          return ca;
        });
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

    if (options?.profesoraId && options.profesoraId !== 'ALL') {
      query = query.eq('profesora_id', options.profesoraId);
    }

    query = query.order('day_of_week').order('start_time');

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };

    const formattedClases: Clase[] = (data || []).map((item: any) => {
      let filteredAlumnas = item.clase_alumnas || [];

      if (options?.profesoraId && options.profesoraId !== 'ALL') {
        filteredAlumnas = filteredAlumnas.map((ca: any) => {
          if (ca.alumna && ca.alumna.profesora_id && ca.alumna.profesora_id !== options.profesoraId) {
            return {
              ...ca,
              is_other_profesora: true,
              alumna: {
                id: ca.alumna.id,
                first_name: 'Ocupado',
                last_name: '(Otra profesora)',
                phone: '',
                dni: '',
                profesora_id: ca.alumna.profesora_id,
              },
            };
          }
          return ca;
        });
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
    if (!claseId || !alumnaId) {
      return { error: 'Faltan parámetros obligatorios (claseId o alumnaId)' };
    }

    const supabase = createClient();

    // 1. Verificar si la alumna ya está inscrita en este turno
    const { data: yaAsignada } = await supabase
      .from('clase_alumnas')
      .select('id, camilla')
      .eq('clase_id', claseId)
      .eq('alumna_id', alumnaId)
      .maybeSingle();

    if (yaAsignada) {
      // Ya está en este turno, no duplicar ni generar error
      return { error: null };
    }

    // 2. Obtener capacidad y camillas actualmente ocupadas en la clase
    const { data: clase, error: claseError } = await supabase
      .from('clases')
      .select('max_capacity, clase_alumnas(id, camilla, alumna_id)')
      .eq('id', claseId)
      .single();

    if (claseError || !clase) {
      return { error: claseError?.message || 'No se encontró la clase especificada' };
    }

    const maxCap = clase.max_capacity || 6;
    const existing = (clase.clase_alumnas || []) as any[];

    if (existing.length >= maxCap) {
      return { error: `La clase ha alcanzado la capacidad máxima de ${maxCap} alumnas.` };
    }

    const occupiedCamillas: number[] = existing
      .map((ca: any) => ca.camilla)
      .filter((c): c is number => typeof c === 'number' && c > 0);

    // 3. Determinar qué camilla asignar (respetar si está libre, o auto-asignar la siguiente libre)
    let finalCamilla: number | null = null;

    if (camilla != null && camilla >= 1 && camilla <= maxCap && !occupiedCamillas.includes(camilla)) {
      finalCamilla = camilla;
    } else {
      // Buscar la primera camilla libre del 1 al maxCap
      for (let num = 1; num <= maxCap; num++) {
        if (!occupiedCamillas.includes(num)) {
          finalCamilla = num;
          break;
        }
      }
    }

    if (finalCamilla == null) {
      return { error: `No hay reformers libres en este turno (cupo completo: ${maxCap}).` };
    }

    // 4. Insertar la inscripción
    const { error: insertError } = await supabase.from('clase_alumnas').insert({
      clase_id: claseId,
      alumna_id: alumnaId,
      camilla: finalCamilla,
      status: 'ACTIVE',
    });

    if (insertError) {
      // Si por concurrencia chocó con la camilla, reintentar una vez con cualquier otra libre
      if (insertError.code === '23505' /* unique_violation */) {
        const { data: freshClase } = await supabase
          .from('clases')
          .select('max_capacity, clase_alumnas(camilla)')
          .eq('id', claseId)
          .single();

        const freshOccupied: number[] = (freshClase?.clase_alumnas || [])
          .map((ca: any) => ca.camilla)
          .filter((c: any): c is number => typeof c === 'number' && c > 0);

        let retryCamilla: number | null = null;
        for (let num = 1; num <= maxCap; num++) {
          if (!freshOccupied.includes(num)) {
            retryCamilla = num;
            break;
          }
        }

        if (retryCamilla != null) {
          const { error: retryError } = await supabase.from('clase_alumnas').insert({
            clase_id: claseId,
            alumna_id: alumnaId,
            camilla: retryCamilla,
            status: 'ACTIVE',
          });
          if (retryError) return { error: retryError.message };
          return { error: null };
        }
      }
      return { error: insertError.message };
    }

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
