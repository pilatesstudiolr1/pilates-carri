import { createClient } from '@/lib/supabase/client';

export interface ReportesMetrics {
  ingresos_registrados: number;
  pagos_registrados: number;
  alumnas_activas: number;
  alumnas_baja: number;
  alumnas_total: number;
  turnos_cargados: number;
  presentes: number;
  ausentes: number;
  asistencias_total: number;
}

export async function getReportesMetrics(sedeId?: string | null): Promise<{
  data: ReportesMetrics;
  error: string | null;
}> {
  try {
    const supabase = createClient();

    // 1. Peticiones optimizadas filtradas por sede a nivel de SQL
    let alumnasQuery = supabase.from('alumnas').select('id, status');
    let pagosQuery = supabase.from('pagos').select('amount');
    let clasesQuery = supabase.from('clases').select('id, sede_id');

    if (sedeId && sedeId !== 'ALL') {
      alumnasQuery = alumnasQuery.eq('sede_id', sedeId);
      pagosQuery = pagosQuery.eq('sede_id', sedeId);
      clasesQuery = clasesQuery.eq('sede_id', sedeId);
    }

    const [alumnasRes, pagosRes, clasesRes, turnosRes, asistenciasRes] = await Promise.all([
      alumnasQuery,
      pagosQuery,
      clasesQuery,
      supabase.from('clase_alumnas').select('id, clase_id'),
      supabase.from('asistencias').select('id, status, clase_alumna_id'),
    ]);

    if (alumnasRes.error) throw alumnasRes.error;
    if (pagosRes.error) throw pagosRes.error;
    if (clasesRes.error) throw clasesRes.error;
    if (turnosRes.error) throw turnosRes.error;
    if (asistenciasRes.error) throw asistenciasRes.error;

    // Alumnas
    const alumnasData = alumnasRes.data || [];
    const alumnas_total = alumnasData.length;
    const alumnas_activas = alumnasData.filter((a) => a.status === 'ACTIVE').length;
    const alumnas_baja = alumnas_total - alumnas_activas;

    // Pagos
    const pagosData = pagosRes.data || [];
    const pagos_registrados = pagosData.length;
    const ingresos_registrados = pagosData.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Mapeo de Clases por Sede
    const claseSedeMap = new Map<string, string | null>();
    (clasesRes.data || []).forEach((c) => {
      if (c.id) claseSedeMap.set(c.id, c.sede_id || null);
    });

    // Mapeo de Clase_Alumnas (Inscripciones) por Sede
    const claseAlumnaSedeMap = new Map<string, string | null>();
    const turnosData = turnosRes.data || [];
    (turnosData || []).forEach((t) => {
      const sId = claseSedeMap.get(t.clase_id);
      if (t.id) claseAlumnaSedeMap.set(t.id, sId || null);
    });

    let turnos_cargados = 0;
    if (sedeId && sedeId !== 'ALL') {
      turnos_cargados = turnosData.filter((t) => claseSedeMap.get(t.clase_id) === sedeId).length;
    } else {
      turnos_cargados = turnosData.length;
    }

    // Asistencias
    let filteredAsistencias = asistenciasRes.data || [];
    if (sedeId && sedeId !== 'ALL') {
      filteredAsistencias = filteredAsistencias.filter(
        (a) => claseAlumnaSedeMap.get(a.clase_alumna_id) === sedeId
      );
    }

    const asistencias_total = filteredAsistencias.length;
    const presentes = filteredAsistencias.filter((a) => a.status === 'PRESENT').length;
    const ausentes = filteredAsistencias.filter((a) => a.status === 'ABSENT').length;

    return {
      data: {
        ingresos_registrados,
        pagos_registrados,
        alumnas_activas,
        alumnas_baja,
        alumnas_total,
        turnos_cargados,
        presentes,
        ausentes,
        asistencias_total,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: {
        ingresos_registrados: 0,
        pagos_registrados: 0,
        alumnas_activas: 0,
        alumnas_baja: 0,
        alumnas_total: 0,
        turnos_cargados: 0,
        presentes: 0,
        ausentes: 0,
        asistencias_total: 0,
      },
      error: err instanceof Error ? err.message : 'Error al obtener métricas de reportes',
    };
  }
}
