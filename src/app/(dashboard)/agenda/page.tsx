'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GoogleCalendarGrid } from '@/components/agenda/GoogleCalendarGrid';
import { ReformerMatrixView } from '@/components/agenda/ReformerMatrixView';
import { ClaseFormModal } from '@/components/agenda/ClaseFormModal';
import { ClaseDetailModal } from '@/components/agenda/ClaseDetailModal';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { TurnoModal } from '@/components/agenda/TurnoModal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Clase, Profile } from '@/types/database';
import { getClases, createClase, addAlumnaToClase, removeAlumnaFromClase, deleteClase } from '@/lib/services/agenda';
import { getBarreClases, BarreClase } from '@/lib/services/barre';
import { getProfiles } from '@/lib/services/profesoras';
import { Calendar, Plus, LayoutGrid, CalendarDays, BedDouble, Filter, Layers } from 'lucide-react';

import { useSede } from '@/hooks/useSede';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export type ModalityAgenda = 'REFORMER' | 'BARRE' | 'ALL';

export default function AgendaPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const { selectedSedeId } = useSede();
  const [modality, setModality] = useState<ModalityAgenda>('REFORMER');
  const [viewMode, setViewMode] = useState<'WEEK' | 'REFORMER'>('REFORMER');

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [profesoraFilter, setProfesoraFilter] = useState<string>('ALL');

  const [clases, setClases] = useState<Clase[]>([]);
  const [barreClases, setBarreClases] = useState<BarreClase[]>([]);
  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isClaseModalOpen, setIsClaseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Modal Unificado de Turno y Asistencia (CASE A & CASE B)
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [turnoModalDayName, setTurnoModalDayName] = useState('Lunes');
  const [selectedAlumnaAsignada, setSelectedAlumnaAsignada] = useState<any | null>(null);

  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [presetDay, setPresetDay] = useState<number>(1);
  const [presetTime, setPresetTime] = useState<string>('08:00');
  const [presetCamilla, setPresetCamilla] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [asistencias, setAsistencias] = useState<Record<string, string>>({});

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    const [clasesRes, barreRes, profsRes] = await Promise.all([
      getClases({
        profesoraId: profesoraFilter !== 'ALL' ? profesoraFilter : undefined,
        sedeId: selectedSedeId !== 'ALL' ? selectedSedeId : undefined,
      }),
      getBarreClases(),

      getProfiles({ role: 'ALL' }),
    ]);

    setClases(clasesRes.data || []);
    setBarreClases(barreRes.data || []);
    setProfesoras(profsRes.data || []);
    setLoading(false);
  }, [profesoraFilter, selectedSedeId]);


  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  // Fetch asistencias para la fecha de hoy
  const fetchAsistencias = useCallback(async () => {
    try {
      const supabase = createClient();
      const fechaHoy = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('asistencias')
        .select('clase_alumna_id, status')
        .eq('date', fechaHoy);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((a: any) => {
          if (a.clase_alumna_id) map[a.clase_alumna_id] = a.status;
        });
        setAsistencias(map);
      }
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    }
  }, []);

  useEffect(() => {
    fetchAsistencias();
  }, [fetchAsistencias]);

  const handleCreateClase = async (data: {
    name: string;
    profesora_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number;
  }): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await createClase({
      ...data,
      sede_id: selectedSedeId !== 'ALL' ? selectedSedeId : null,
    });
    setSubmitting(false);

    if (error) {
      await alertDialog({ title: 'Error', message: error, variant: 'danger' });
      return false;
    }

    setIsClaseModalOpen(false);
    fetchAgenda();
    return true;
  };

  const handleAddAlumna = async (claseId: string, alumnaId: string, camilla?: number): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await addAlumnaToClase(claseId, alumnaId, camilla || null);
    setSubmitting(false);

    if (error) {
      await alertDialog({
        title: 'Error al agregar alumna',
        message: error,
        variant: 'danger',
      });
      return false;
    }

    fetchAgenda();
    setIsAssignModalOpen(false);
    return true;
  };

  const handleRemoveAlumna = async (claseId: string, alumnaId: string) => {
    const isOk = await confirm({
      title: 'Quitar Alumna del Turno',
      message: '¿Desea desafectar a esta alumna del turno asignado?',
      confirmText: 'Sí, quitar',
      variant: 'warning',
    });
    if (!isOk) return;

    const { error } = await removeAlumnaFromClase(claseId, alumnaId);
    if (error) {
      await alertDialog({
        title: 'Error de desasignación',
        message: error,
        variant: 'danger',
      });
    } else {
      fetchAgenda();
      if (selectedClase) {
        setIsDetailModalOpen(false);
      }
    }
  };

  const handleDeleteClase = async (claseId: string) => {
    const isOk = await confirm({
      title: 'Eliminar Turno',
      message: '¿Está seguro de que desea eliminar este turno? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!isOk) return;

    const { error } = await deleteClase(claseId);
    if (error) {
      await alertDialog({
        title: 'Error de eliminación',
        message: `Error al eliminar el turno: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchAgenda();
      setIsDetailModalOpen(false);
    }
  };

  const handleAbrirTurnoModal = (
    dayOfWeek: number,
    startTime: string,
    camilla = 1,
    alumnaItem: any = null
  ) => {
    const cleanTime = startTime.slice(0, 5);
    const dayObj = DIAS.find((d) => d.value === dayOfWeek);
    setTurnoModalDayName(dayObj?.label || 'Lunes');

    const targetClase = clases.find(
      (c) =>
        c.day_of_week === dayOfWeek &&
        (c.start_time.startsWith(cleanTime) || c.start_time.slice(0, 5) === cleanTime)
    );

    setSelectedClase(targetClase || null);
    setPresetDay(dayOfWeek);
    setPresetTime(cleanTime);
    setPresetCamilla(camilla);
    setSelectedAlumnaAsignada(alumnaItem);
    setIsTurnoModalOpen(true);
  };

  const handleSaveTurnoFromModal = async (data: {
    claseId?: string;
    alumnaId: string;
    camilla: number;
    dayOfWeek: number;
    startTime: string;
    observaciones?: string;
    asistenciaStatus?: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED' | 'UNMARKED';
  }): Promise<boolean> => {
    try {
      let targetClaseId = data.claseId;

      if (!targetClaseId) {
        const endHourNum = parseInt(data.startTime.split(':')[0], 10) + 1;
        const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

        const { data: newClase, error: createErr } = await createClase({
          name: `Turno ${data.startTime} hs`,
          profesora_id: null,
          day_of_week: data.dayOfWeek,
          start_time: `${data.startTime}:00`,
          end_time: `${endTime}:00`,
          max_capacity: 6,
        });

        if (createErr || !newClase) {
          await alertDialog({
            title: 'Error al crear el turno',
            message: createErr || 'No se pudo crear la clase',
            variant: 'danger',
          });
          return false;
        }

        targetClaseId = newClase.id;
      }

      // Asignar alumna al turno en la camilla correspondiente
      const assignRes = await addAlumnaToClase(targetClaseId, data.alumnaId, data.camilla);
      if (assignRes.error) {
        // Si ya pertenece a la clase, omitir error estricto
      }

      // Si se marcó asistencia específica
      if (data.asistenciaStatus && data.asistenciaStatus !== 'UNMARKED') {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const fechaHoy = new Date().toISOString().split('T')[0];

        // Obtener el ID de clase_alumnas
        const { data: caData } = await supabase
          .from('clase_alumnas')
          .select('id')
          .eq('clase_id', targetClaseId)
          .eq('alumna_id', data.alumnaId)
          .maybeSingle();

        if (caData?.id) {
          await supabase.from('asistencias').upsert(
            {
              clase_alumna_id: caData.id,
              date: fechaHoy,
              status: data.asistenciaStatus,
              notes: data.observaciones || null,
            },
            { onConflict: 'clase_alumna_id,date' }
          );
        }
      }

      await fetchAgenda();
      return true;
    } catch (err: any) {
      await alertDialog({
        title: 'Error de guardado',
        message: err.message || 'Error al guardar el turno',
        variant: 'danger',
      });
      return false;
    }
  };

  const handleSelectClaseBlock = (clase: Clase) => {
    setSelectedClase(clase);
    setIsDetailModalOpen(true);
  };


  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--color-wood)]" /> Agenda y Asistencia de Clases
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Organización semanal por horario, Reformer y Barre con separación por modalidad.
          </p>
        </div>

        <Button
          onClick={() => {
            setPresetDay(1);
            setPresetTime('08:00');
            setIsClaseModalOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          Nuevo Turno
        </Button>
      </div>

      {/* Selector de Modalidad (Reformer vs Barre vs Todas) */}
      <Card className="p-3 sm:p-4 border border-[var(--border-default)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)] text-xs font-semibold w-full md:w-auto overflow-x-auto custom-scrollbar">
          <span className="px-2 text-[var(--text-muted)] flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Modalidad:
          </span>
          <button
            onClick={() => setModality('REFORMER')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${modality === 'REFORMER'
                ? 'bg-[var(--color-wood)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Layers className="h-3.5 w-3.5" /> Reformer ({clases.length})
          </button>

          <button
            onClick={() => setModality('BARRE')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${modality === 'BARRE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Image src="/media/berre.webp" alt="Barre" width={14} height={14} className="h-3.5 w-3.5 object-contain" />
            Barre ({barreClases.length})
          </button>

          <button
            onClick={() => setModality('ALL')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${modality === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            Todas ({clases.length + barreClases.length})
          </button>
        </div>

        {/* Filtro por Profesora */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
            Profesora:
          </span>
          <select
            value={profesoraFilter}
            onChange={(e) => setProfesoraFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todas las Profesoras</option>
            {profesoras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || 'Profesora'}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Vistas según Modalidad */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Cargando grilla horaria de clases...</p>
        </div>
      ) : modality === 'BARRE' ? (
        /* Vista Exclusiva de Clases de Barre */
        <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Image src="/media/berre.webp" alt="Barre" width={22} height={22} className="h-5 w-5 object-contain" />
              Agenda de Clases de Barre en Baranda ({barreClases.length} turnos)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {barreClases.map((bc) => (
              <div key={bc.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded">
                    Día {bc.day_of_week} &bull; {bc.start_time.slice(0, 5)} hs
                  </span>
                  <span className="font-bold text-[var(--text-muted)]">
                    {bc.alumnas_count || 0} / {bc.max_capacity} inscriptas
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">{bc.name}</h4>
                <p className="text-xs text-[var(--text-secondary)]">Profesora: {bc.profesora_name}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Sede: {bc.sede_name}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        /* Vista de Reformer / General */
        <div className="flex flex-col gap-4">
          {/* Sub-barras de vista (Reformer / Semanal) */}
          <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)] w-fit">
            <button
              onClick={() => setViewMode('REFORMER')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'REFORMER'
                  ? 'bg-[var(--color-wood)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <BedDouble className="h-3.5 w-3.5" /> Vista por Reformer (Camillas)
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'WEEK'
                  ? 'bg-[var(--color-wood)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Vista Semanal
            </button>
          </div>

          {viewMode === 'REFORMER' ? (
            <ReformerMatrixView
              clases={clases}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onSelectEmptySlot={(day: number, time: string, camilla?: number) => handleAbrirTurnoModal(day, time, camilla || 1, null)}

              onSelectOccupiedSlot={(day, time, camilla, item) => handleAbrirTurnoModal(day, time, camilla, item)}
              onSelectClase={handleSelectClaseBlock}
              asistencias={asistencias}
            />
          ) : (
            <GoogleCalendarGrid
              clases={clases}
              viewMode="WEEK"
              selectedDay={selectedDay}
              onSelectClase={handleSelectClaseBlock}
              onSelectEmptySlot={(day, time) => handleAbrirTurnoModal(day, time, 1, null)}
            />
          )}

          {/* Si está en modo 'ALL', adjuntar también las clases de Barre abajo */}
          {modality === 'ALL' && (
            <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4 mt-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-default)] pb-3">
                <Image src="/media/berre.webp" alt="Barre" width={22} height={22} className="h-5 w-5 object-contain" />
                Clases de Barre Integradas ({barreClases.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {barreClases.map((bc) => (
                  <div key={bc.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded">
                        Día {bc.day_of_week} &bull; {bc.start_time.slice(0, 5)} hs
                      </span>
                      <span className="font-bold text-[var(--text-muted)]">
                        {bc.alumnas_count || 0} / {bc.max_capacity} inscriptas
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">{bc.name}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">Profesora: {bc.profesora_name}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* MODAL UNIFICADO: Agregar Turno / Turno y Asistencia */}
      <TurnoModal
        open={isTurnoModalOpen}
        onClose={() => {
          setIsTurnoModalOpen(false);
          setSelectedAlumnaAsignada(null);
        }}
        clase={selectedClase}
        dayName={turnoModalDayName}
        presetTime={presetTime}
        presetCamilla={presetCamilla}
        alumnaAsignada={selectedAlumnaAsignada}
        onSave={handleSaveTurnoFromModal}
        onDeleteTurno={async (claseId, alumnaId) => {
          if (alumnaId) {
            await handleRemoveAlumna(claseId, alumnaId);
          } else {
            await handleDeleteClase(claseId);
          }
          return true;
        }}
      />

      {/* Modales Clásicos */}
      {isClaseModalOpen && (
        <ClaseFormModal
          open={isClaseModalOpen}
          onClose={() => setIsClaseModalOpen(false)}
          onSubmit={handleCreateClase}
          profesoras={profesoras}
          initialDayOfWeek={presetDay}
          initialStartTime={presetTime}
          loading={submitting}
        />
      )}

      {isDetailModalOpen && selectedClase && (
        <ClaseDetailModal
          open={isDetailModalOpen}
          clase={selectedClase}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedClase(null);
          }}
          onOpenAssignModal={(c) => {
            setSelectedClase(c);
            setIsDetailModalOpen(false);
            setIsAssignModalOpen(true);
          }}
          onRemoveAlumna={(claseId, alumnaId) => handleRemoveAlumna(claseId, alumnaId)}
          onDeleteClase={(claseId) => handleDeleteClase(claseId)}
        />
      )}

      {isAssignModalOpen && selectedClase && (
        <AsignarAlumnaModal
          open={isAssignModalOpen}
          clase={selectedClase}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedClase(null);
          }}
          onAssign={handleAddAlumna}
          presetTime={presetTime}
          presetCamilla={presetCamilla}
          loading={submitting}
        />
      )}
    </div>
  );
}

