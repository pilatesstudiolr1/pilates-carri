'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { getProfiles } from '@/lib/services/profesoras';
import { Calendar, Plus, LayoutGrid, BedDouble, User } from 'lucide-react';
import { useSede } from '@/hooks/useSede';
import { createClient } from '@/lib/supabase/client';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function AgendaPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const { selectedSedeId } = useSede();
  const [viewMode, setViewMode] = useState<'REFORMER' | 'WEEK'>('REFORMER');

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [profesoraFilter, setProfesoraFilter] = useState<string>('ALL');

  const [clases, setClases] = useState<Clase[]>([]);
  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isClaseModalOpen, setIsClaseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Modal Unificado de Turno y Asistencia
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
    const [clasesRes, profsRes] = await Promise.all([
      getClases({
        profesoraId: profesoraFilter !== 'ALL' ? profesoraFilter : undefined,
        sedeId: selectedSedeId !== 'ALL' ? selectedSedeId : undefined,
      }),
      getProfiles({ role: 'ALL' }),
    ]);

    setClases(clasesRes.data || []);
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
          profesora_id: profesoraFilter !== 'ALL' ? profesoraFilter : null,
          day_of_week: data.dayOfWeek,
          start_time: `${data.startTime}:00`,
          end_time: `${endTime}:00`,
          max_capacity: 6,
          sede_id: selectedSedeId !== 'ALL' ? selectedSedeId : null,
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

      await addAlumnaToClase(targetClaseId, data.alumnaId, data.camilla);

      if (data.asistenciaStatus) {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const fechaHoy = new Date().toISOString().split('T')[0];

        const { data: caData } = await supabase
          .from('clase_alumnas')
          .select('id')
          .eq('clase_id', targetClaseId)
          .eq('alumna_id', data.alumnaId)
          .maybeSingle();

        if (caData?.id) {
          if (data.asistenciaStatus === 'UNMARKED') {
            await supabase
              .from('asistencias')
              .delete()
              .eq('clase_alumna_id', caData.id)
              .eq('date', fechaHoy);
          } else {
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
      }

      await Promise.all([fetchAgenda(), fetchAsistencias()]);
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
    <div className="flex flex-col gap-6 animate-fade-in pb-16 max-w-[var(--page-max-width)] mx-auto text-[var(--text-primary)]">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-meadow text-[11px] font-medium px-3 py-0.5 uppercase">
              Pilates Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Agenda de Clases
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Organización semanal por horario, disponibilidad y asistencia por reformer.
          </p>
        </div>

        <Button
          onClick={() => {
            setPresetDay(1);
            setPresetTime('08:00');
            setIsClaseModalOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
          variant="primary"
        >
          Nuevo Turno
        </Button>
      </div>

      {/* Barra de Filtro por Profesora y Selector de Vista */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Switcher de Vista */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-primary)] rounded-[29px] border border-[var(--border-default)] self-start md:self-auto">
          <button
            onClick={() => setViewMode('REFORMER')}
            className={`px-4 py-1.5 rounded-[29px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'REFORMER'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BedDouble className="h-3.5 w-3.5" /> Matriz por Reformer
          </button>
          <button
            onClick={() => setViewMode('WEEK')}
            className={`px-4 py-1.5 rounded-[29px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'WEEK'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grilla Semanal
          </button>
        </div>

        {/* Filtro Profesora */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> Profesora:
          </span>
          <select
            value={profesoraFilter}
            onChange={(e) => setProfesoraFilter(e.target.value)}
            className="h-9 px-3 rounded-[12px] bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
          >
            <option value="ALL">Todas las Profesoras</option>
            {profesoras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || 'Profesora'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenido Principal de Agenda */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[var(--bg-secondary)] rounded-[14px] border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">Cargando turnos de reformer...</p>
        </div>
      ) : viewMode === 'REFORMER' ? (
        <ReformerMatrixView
          clases={clases}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onSelectEmptySlot={(day: number, time: string, camilla?: number) =>
            handleAbrirTurnoModal(day, time, camilla || 1, null)
          }
          onSelectOccupiedSlot={(day, time, camilla, item, clase) =>
            handleAbrirTurnoModal(day, time, camilla, item)
          }
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

      {/* MODAL UNIFICADO: Agregar Turno / Asistencia */}
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

      {/* Modales de Gestión */}
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
