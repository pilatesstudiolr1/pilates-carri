'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GoogleCalendarGrid } from '@/components/agenda/GoogleCalendarGrid';
import { ReformerMatrixView } from '@/components/agenda/ReformerMatrixView';
import { HorariosDisponiblesView } from '@/components/agenda/HorariosDisponiblesView';
import { ClaseFormModal } from '@/components/agenda/ClaseFormModal';
import { ClaseDetailModal } from '@/components/agenda/ClaseDetailModal';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { TurnoModal } from '@/components/agenda/TurnoModal';
import { PagoFormModal } from '@/components/pagos/PagoFormModal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Clase, Profile, Alumna, MetodoPago, TipoPago } from '@/types/database';
import { getClases, createClase, addAlumnaToClase, removeAlumnaFromClase, deleteClase } from '@/lib/services/agenda';
import { getProfiles } from '@/lib/services/profesoras';
import { registrarPago } from '@/lib/services/pagos';
import { Calendar, Plus, LayoutGrid, BedDouble, User, MessageCircle, Clock, Sparkles, Building2 } from 'lucide-react';
import { useSede } from '@/hooks/useSede';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { getLocalDateISO } from '@/lib/utils';

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
  const { selectedSedeId, setSelectedSedeId, sedes } = useSede();
  const { profile } = useUser();
  const isProfesora = profile?.role === 'PROFESORA';

  const [viewMode, setViewMode] = useState<'REFORMER' | 'WEEK' | 'DISPONIBILIDAD'>('REFORMER');

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [profesoraFilter, setProfesoraFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isProfesora && profile?.id) {
      setProfesoraFilter(profile.id);
    }
  }, [isProfesora, profile?.id]);

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

  // Modal Rápido de Pago / Cobro Directo
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedAlumnaParaPago, setSelectedAlumnaParaPago] = useState<Alumna | null>(null);

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
      getProfiles({ role: 'PROFESORA', isActive: true }),
    ]);

    setClases(clasesRes.data || []);
    // Filtrar estrictamente solo usuarios con rol PROFESORA (los ADMIN nunca aparecen)
    setProfesoras((profsRes.data || []).filter((p) => p.role === 'PROFESORA'));
    setLoading(false);
  }, [profesoraFilter, selectedSedeId]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'disponibilidad') {
        setViewMode('DISPONIBILIDAD');
      }
    }
  }, []);

  // Fetch asistencias para la fecha de hoy
  const fetchAsistencias = useCallback(async () => {
    try {
      const supabase = createClient();
      const fechaHoy = getLocalDateISO();
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
    profesoraId?: string | null;
  }): Promise<boolean> => {
    try {
      let targetClaseId = data.claseId;
      const effectiveProfesoraId = data.profesoraId || (profesoraFilter !== 'ALL' ? profesoraFilter : null);

      if (!targetClaseId) {
        const endHourNum = parseInt(data.startTime.split(':')[0], 10) + 1;
        const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

        const currentSede = sedes.find((s) => s.id === selectedSedeId);
        const { data: newClase, error: createErr } = await createClase({
          name: `Turno ${data.startTime} hs`,
          profesora_id: effectiveProfesoraId || null,
          day_of_week: data.dayOfWeek,
          start_time: `${data.startTime}:00`,
          end_time: `${endTime}:00`,
          max_capacity: currentSede?.max_camillas || 6,
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
      } else if (effectiveProfesoraId) {
        // Actualizar la profesora de la clase si fue seleccionada
        const supabase = (await import('@/lib/supabase/client')).createClient();
        await supabase
          .from('clases')
          .update({ profesora_id: effectiveProfesoraId })
          .eq('id', targetClaseId);
      }

      await addAlumnaToClase(targetClaseId, data.alumnaId, data.camilla);

      if (data.asistenciaStatus) {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const fechaHoy = getLocalDateISO();

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
            // Guardado seguro: verificar si ya existe registro para esa clase_alumna_id y fecha
            const { data: existingAsis } = await supabase
              .from('asistencias')
              .select('id')
              .eq('clase_alumna_id', caData.id)
              .eq('date', fechaHoy)
              .maybeSingle();

            if (existingAsis?.id) {
              await supabase
                .from('asistencias')
                .update({
                  status: data.asistenciaStatus,
                  notes: data.observaciones || null,
                })
                .eq('id', existingAsis.id);
            } else {
              await supabase
                .from('asistencias')
                .insert({
                  clase_alumna_id: caData.id,
                  date: fechaHoy,
                  status: data.asistenciaStatus,
                  notes: data.observaciones || null,
                });
            }

            // Si se marcó PRESENT y la alumna es de clase individual / sólo inscripción ($0), suspenderla
            if (data.asistenciaStatus === 'PRESENT') {
              const { data: alumData } = await supabase
                .from('alumnas')
                .select('id, plan, plan_amount')
                .eq('id', data.alumnaId)
                .maybeSingle();

              const isTrial =
                alumData?.plan === 'Solo Inscripción / Clase de prueba' ||
                (alumData?.plan && alumData.plan.toLowerCase().includes('individual')) ||
                (alumData?.plan && alumData.plan.toLowerCase().includes('prueba')) ||
                (alumData?.plan && alumData.plan.toLowerCase().includes('inscripci')) ||
                (alumData?.plan_amount === 0 && !alumData?.plan);

              if (isTrial) {
                await supabase
                  .from('alumnas')
                  .update({ status: 'SUSPENDED' })
                  .eq('id', data.alumnaId);
              }
            }
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

  const handleRegistrarCobro = async (pagoData: {
    alumna_id: string;
    amount: number;
    payment_method: MetodoPago;
    payment_type?: TipoPago;
    due_date: string;
    commission_rate: number;
    concept?: string;
    period?: string;
    profesora_id?: string;
    notes?: string;
    sede_id?: string;
  }): Promise<boolean> => {
    try {
      const res = await registrarPago({
        alumna_id: pagoData.alumna_id,
        amount: pagoData.amount,
        payment_method: pagoData.payment_method,
        payment_type: pagoData.payment_type,
        due_date: pagoData.due_date,
        commission_rate: pagoData.commission_rate,
        concept: pagoData.concept,
        billing_month: pagoData.period,
        profesora_id: pagoData.profesora_id,
        notes: pagoData.notes,
        sede_id: pagoData.sede_id || (selectedSedeId !== 'ALL' ? selectedSedeId : undefined),
      });

      if (res.error) {
        await alertDialog({
          title: 'Error al registrar cobro',
          message: res.error,
          variant: 'danger',
        });
        return false;
      }

      await alertDialog({
        title: '¡Cobro Registrado!',
        message: `Se registró correctamente el cobro por $${pagoData.amount.toLocaleString('es-AR')}.`,
        variant: 'success',
      });

      setIsPagoModalOpen(false);
      setSelectedAlumnaParaPago(null);
      await Promise.all([fetchAgenda(), fetchAsistencias()]);
      return true;
    } catch (err: any) {
      await alertDialog({
        title: 'Error al procesar cobro',
        message: err.message || 'Error desconocido',
        variant: 'danger',
      });
      return false;
    }
  };


  const currentSedeNombre = sedes.find((s) => s.id === selectedSedeId)?.name || 'Pilates Studio';

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

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón directo sin colapsar: Ver turnos disponibles */}
          <Button
            onClick={() => setViewMode(viewMode === 'DISPONIBILIDAD' ? 'REFORMER' : 'DISPONIBILIDAD')}
            variant={viewMode === 'DISPONIBILIDAD' ? 'primary' : 'outline'}
            className={`font-bold transition-all shadow-xs ${
              viewMode === 'DISPONIBILIDAD'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 ring-2 ring-emerald-500/30'
                : 'border-emerald-600/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
            icon={<Clock className="h-4 w-4 text-emerald-600" />}
          >
            {viewMode === 'DISPONIBILIDAD' ? 'Volver a Matriz' : 'Ver turnos disponibles'}
          </Button>

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
      </div>

      {/* Barra de Filtro por Profesora y Selector de Vista (3 Modos) */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Switcher de 3 Vistas */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] self-start md:self-auto overflow-x-auto custom-scrollbar">
          {/* 1. Matriz por Reformer */}
          <button
            onClick={() => setViewMode('REFORMER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              viewMode === 'REFORMER'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BedDouble className="h-3.5 w-3.5" /> Matriz por Reformer
          </button>

          {/* 2. Ver turnos disponibles */}
          <button
            onClick={() => setViewMode('DISPONIBILIDAD')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              viewMode === 'DISPONIBILIDAD'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Ver turnos disponibles
          </button>

          {/* 3. Grilla Semanal */}
          <button
            onClick={() => setViewMode('WEEK')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              viewMode === 'WEEK'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grilla Semanal
          </button>
        </div>

        {/* Filtros: Sede y Profesora */}
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {/* Selector de Sede */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Sede:
            </span>
            <select
              value={selectedSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-semibold focus:outline-none focus:border-[var(--color-wood)] cursor-pointer shadow-2xs"
            >
              <option value="ALL">Todas las Sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Profesora */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Profesora:
            </span>
            <select
              value={profesoraFilter}
              onChange={(e) => setProfesoraFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium focus:outline-none focus:border-[var(--border-focus)] cursor-pointer shadow-2xs"
            >
              <option value="ALL">Todas las Profesoras</option>
              {profesoras
                .filter((p) => p.role === 'PROFESORA')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contenido Principal de Agenda según Vista */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">Cargando turnos de reformer...</p>
        </div>
      ) : viewMode === 'DISPONIBILIDAD' ? (
        <HorariosDisponiblesView
          clases={clases}
          sedeNombre={currentSedeNombre}
          onSelectSlot={(day, time, camillaLibre) => handleAbrirTurnoModal(day, time, camillaLibre || 1, null)}
        />
      ) : viewMode === 'REFORMER' ? (
        <ReformerMatrixView
          clases={clases}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          currentProfesoraId={isProfesora && profile?.id ? profile.id : undefined}
          isProfesoraView={isProfesora}
          onSelectEmptySlot={(day: number, time: string, camilla?: number) =>
            handleAbrirTurnoModal(day, time, camilla || 1, null)
          }
          onSelectOccupiedSlot={(day, time, camilla, item, clase) =>
            handleAbrirTurnoModal(day, time, camilla, item)
          }
          onCobrar={(alumna) => {
            setSelectedAlumnaParaPago(alumna);
            setIsPagoModalOpen(true);
          }}
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
        initialAsistenciaStatus={selectedAlumnaAsignada?.caId ? asistencias[selectedAlumnaAsignada.caId] : undefined}
        profesoras={profesoras}
        profesoraFilter={profesoraFilter}

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

      {/* MODAL RÁPIDO DE COBRO [Cobrar Cuota] */}
      {isPagoModalOpen && (
        <PagoFormModal
          open={isPagoModalOpen}
          onClose={() => {
            setIsPagoModalOpen(false);
            setSelectedAlumnaParaPago(null);
          }}
          initialAlumna={selectedAlumnaParaPago}
          defaultProfesoraId={isProfesora && profile?.id ? profile.id : (selectedAlumnaParaPago?.profesora_id || undefined)}
          disableCommissionEdit={isProfesora}
          onSubmit={handleRegistrarCobro}
        />
      )}

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
