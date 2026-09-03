'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ReformerMatrixView } from '@/components/agenda/ReformerMatrixView';
import { GoogleCalendarGrid } from '@/components/agenda/GoogleCalendarGrid';
import { TurnoModal } from '@/components/agenda/TurnoModal';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { ClaseFormModal } from '@/components/agenda/ClaseFormModal';
import { ClaseDetailModal } from '@/components/agenda/ClaseDetailModal';
import { PagoFormModal } from '@/components/pagos/PagoFormModal';
import { Modal } from '@/components/ui/Modal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Clase, Profile } from '@/types/database';
import {
  getClases,
  createClase,
  addAlumnaToClase,
  removeAlumnaFromClase,
  deleteClase,
} from '@/lib/services/agenda';
import { registrarPago } from '@/lib/services/pagos';
import { getProfiles } from '@/lib/services/profesoras';
import { buildAvisoPagoWhatsAppMessage, openWhatsAppMessage } from '@/lib/utils';
import { MessageCircle, CheckCircle2 } from 'lucide-react';


import { useSede } from '@/hooks/useSede';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { getLocalDateISO } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  Plus,
  LayoutGrid,
  CalendarDays,
  BedDouble,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

interface AgendaProfesoraViewProps {
  initialDay?: number;
}

export function AgendaProfesoraView({ initialDay = 1 }: AgendaProfesoraViewProps) {
  const { profile } = useUser();
  const { selectedSedeId, selectedSede } = useSede();
  const { confirm, alert: alertDialog } = useConfirm();

  const [selectedDay, setSelectedDay] = useState<number>(initialDay);
  const [viewMode, setViewMode] = useState<'REFORMER' | 'WEEK'>('REFORMER');
  const [clases, setClases] = useState<Clase[]>([]);
  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSoloMisClases, setFiltroSoloMisClases] = useState(true);
  const [asistencias, setAsistencias] = useState<Record<string, string>>({});

  // Modales
  const [isClaseModalOpen, setIsClaseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedAlumnaParaPago, setSelectedAlumnaParaPago] = useState<any | null>(null);
  const [pagoAvisoExitoso, setPagoAvisoExitoso] = useState<{ pago: any; alumna: any } | null>(null);
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);



  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [turnoModalDayName, setTurnoModalDayName] = useState('Lunes');
  const [selectedAlumnaAsignada, setSelectedAlumnaAsignada] = useState<any | null>(null);
  const [presetDay, setPresetDay] = useState<number>(1);
  const [presetTime, setPresetTime] = useState<string>('08:00');
  const [presetCamilla, setPresetCamilla] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const [clasesRes, profsRes] = await Promise.all([
        getClases({
          sedeId: selectedSedeId !== 'ALL' ? selectedSedeId : undefined,
          profesoraId: filtroSoloMisClases && profile?.id ? profile.id : undefined,
        }),
        getProfiles({ role: 'PROFESORA', isActive: true }),
      ]);

      setClases(clasesRes.data || []);
      setProfesoras((profsRes.data || []).filter((p) => p.role === 'PROFESORA'));
    } catch (err) {
      console.error('Error cargando agenda de profesora:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSedeId, filtroSoloMisClases, profile?.id]);

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
    fetchAgenda();
    fetchAsistencias();
  }, [fetchAgenda, fetchAsistencias]);


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
      profesora_id: data.profesora_id || profile?.id || null,
      sede_id: selectedSedeId !== 'ALL' ? selectedSedeId : (profile?.sede_id || null),
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
      message: '¿Deseas desasignar a esta alumna del turno? La camilla quedará libre.',
      confirmText: 'Sí, quitar',
      variant: 'warning',
    });
    if (!isOk) return;

    const { error } = await removeAlumnaFromClase(claseId, alumnaId);
    if (error) {
      await alertDialog({
        title: 'Error al quitar alumna',
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
      message: '¿Deseas eliminar este turno completo de la agenda? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!isOk) return;

    const { error } = await deleteClase(claseId);
    if (error) {
      await alertDialog({
        title: 'Error al eliminar',
        message: error,
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

  const handleSelectClaseBlock = (clase: Clase) => {
    setSelectedClase(clase);
    setIsDetailModalOpen(true);
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
          profesora_id: profile?.id || null,
          sede_id: selectedSedeId !== 'ALL' ? selectedSedeId : (profile?.sede_id || null),
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
      await addAlumnaToClase(targetClaseId, data.alumnaId, data.camilla);

      // Si se marcó asistencia
      if (data.asistenciaStatus) {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        const fechaHoy = getLocalDateISO();

        const { data: caData } = await supabase
          .from('clase_alumnas')
          .select('id')
          .eq('clase_id', targetClaseId)
          .eq('alumna_id', data.alumnaId)
          .maybeSingle();

        if (caData) {
          if (data.asistenciaStatus === 'UNMARKED') {
            await supabase
              .from('asistencias')
              .delete()
              .eq('clase_alumna_id', caData.id)
              .eq('date', fechaHoy);
          } else {
            const { data: existingAsis } = await supabase
              .from('asistencias')
              .select('id')
              .eq('clase_alumna_id', caData.id)
              .eq('date', fechaHoy)
              .maybeSingle();

            if (existingAsis?.id) {
              await supabase
                .from('asistencias')
                .update({ status: data.asistenciaStatus })
                .eq('id', existingAsis.id);
            } else {
              await supabase
                .from('asistencias')
                .insert({
                  clase_alumna_id: caData.id,
                  date: fechaHoy,
                  status: data.asistenciaStatus,
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
      setIsTurnoModalOpen(false);
      return true;
    } catch (err) {
      console.error('Error al guardar turno:', err);
      return false;
    }
  };


  return (
    <div className="flex flex-col gap-5 animate-fade-in text-[var(--text-primary)]">
      {/* Barra de Control de la Agenda */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-wood)]/15 text-[var(--color-wood)] border border-[var(--color-wood)]/30">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span>Agenda de Turnos y Reformers</span>
              {selectedSede && (
                <span className="text-xs font-semibold text-[var(--color-wood)] bg-[var(--color-wood)]/10 px-2 py-0.5 rounded-md border border-[var(--color-wood)]/20">
                  {selectedSede.name}
                </span>
              )}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Consulta turnos semanales, asigna alumnas en reformers libres y visualiza la ocupación en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Mis Clases vs Todo */}
          <button
            onClick={() => setFiltroSoloMisClases(!filtroSoloMisClases)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              filtroSoloMisClases
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)] border-[var(--color-wood)] shadow-2xs'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>{filtroSoloMisClases ? 'Mis Clases Únicamente' : 'Todas las Clases'}</span>
          </button>

          {/* Toggle Vista Matriz Reformer vs Semana */}
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-default)]">
            <button
              onClick={() => setViewMode('REFORMER')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'REFORMER'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5 text-[var(--color-wood)]" />
              <span>Matriz Reformer</span>
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'WEEK'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-[var(--color-wood)]" />
              <span>Semana</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsClaseModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Nuevo Turno
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAgenda}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Selector de Días para la Matriz de Reformers */}
      {viewMode === 'REFORMER' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {DIAS.map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDay(d.value)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                selectedDay === d.value
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] border-[var(--color-wood)] shadow-xs scale-102'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--color-wood)]/40'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenedor Principal de la Agenda */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando grilla interactiva de turnos...</p>
        </div>
      ) : viewMode === 'REFORMER' ? (
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)] shadow-xs">
          <ReformerMatrixView
            clases={clases}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            currentProfesoraId={profile?.id}
            isProfesoraView={true}
            asistencias={asistencias}
            onCobrar={(alumna) => {
              setSelectedAlumnaParaPago(alumna);
              setIsPagoModalOpen(true);
            }}
            onSelectEmptySlot={(day: number, time: string, camilla?: number) =>


              handleAbrirTurnoModal(day, time, camilla || 1, null)
            }
            onSelectOccupiedSlot={(day: number, time: string, camilla: number, item: any) =>
              handleAbrirTurnoModal(day, time, camilla, item)
            }
            onSelectClase={handleSelectClaseBlock}
          />
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)] shadow-xs">
          <GoogleCalendarGrid
            clases={clases}
            viewMode="WEEK"
            selectedDay={selectedDay}
            onSelectClase={handleSelectClaseBlock}
            onSelectEmptySlot={(day: number, time: string) => handleAbrirTurnoModal(day, time, 1, null)}
          />
        </div>
      )}

      {/* Modal Unificado para Carga de Turno / Asignación */}
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
        profesoraFilter={profile?.id}
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

      {/* Modal Detalle de Clase */}
      {selectedClase && (
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

      {/* Modal Asignar Alumna */}
      {selectedClase && (
        <AsignarAlumnaModal
          open={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedClase(null);
          }}
          onAssign={handleAddAlumna}
          clase={selectedClase}
          dayName={DIAS.find((d) => d.value === selectedClase.day_of_week)?.label || 'Lunes'}
          presetTime={selectedClase.start_time?.slice(0, 5) || '08:00'}
          presetCamilla={presetCamilla}
          loading={submitting}
        />
      )}

      {/* Modal Crear Nueva Clase */}
      <ClaseFormModal
        open={isClaseModalOpen}
        onClose={() => setIsClaseModalOpen(false)}
        onSubmit={handleCreateClase}
        profesoras={profesoras}
        initialDayOfWeek={presetDay}
        initialStartTime={presetTime}
        loading={submitting}
      />

      {/* Modal de Cobro Directo */}
      {isPagoModalOpen && (
        <PagoFormModal
          open={isPagoModalOpen}
          onClose={() => {
            setIsPagoModalOpen(false);
            setSelectedAlumnaParaPago(null);
            fetchAgenda();
            fetchAsistencias();
          }}
          initialAlumna={selectedAlumnaParaPago}
          defaultProfesoraId={profile?.id}
          onSubmit={async (pagoData) => {
            const res = await registrarPago({
              ...pagoData,
              profesora_id: profile?.id || pagoData.profesora_id,
              sede_id: pagoData.sede_id || selectedAlumnaParaPago?.sede_id || profile?.sede_id || undefined,
            });
            if (res.data) {
              const savedPago = res.data;
              const currentAlumna = selectedAlumnaParaPago;
              setIsPagoModalOpen(false);
              setSelectedAlumnaParaPago(null);
              setPagoAvisoExitoso({ pago: savedPago, alumna: currentAlumna });
              setIsAvisoModalOpen(true);
              await Promise.all([fetchAgenda(), fetchAsistencias()]);
              return true;
            } else {
              await alertDialog({
                title: 'Error al cobrar',
                message: res.error || 'No se pudo registrar el pago',
                variant: 'danger',
              });
              return false;
            }
          }}
        />
      )}

      {/* Modal de Aviso y Comprobante WhatsApp para Alumna */}
      {isAvisoModalOpen && pagoAvisoExitoso && (
        <Modal
          open={isAvisoModalOpen}
          onClose={() => {
            setIsAvisoModalOpen(false);
            setPagoAvisoExitoso(null);
          }}
          title="¡Cobro Registrado con Éxito!"
          description="El pago ingresó a la caja de la sede y la cuota fue renovada."
          size="sm"
        >
          <div className="flex flex-col gap-4 text-[var(--text-primary)]">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Pago impactado en caja</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Alumna: <strong className="text-[var(--text-primary)]">{pagoAvisoExitoso.alumna?.first_name} {pagoAvisoExitoso.alumna?.last_name}</strong>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Monto: <strong className="text-[var(--text-primary)]">${Number(pagoAvisoExitoso.pago?.amount || 0).toLocaleString('es-AR')} ARS</strong> ({pagoAvisoExitoso.pago?.payment_method})
              </p>
              {pagoAvisoExitoso.pago?.due_date && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Nuevo Vencimiento: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{pagoAvisoExitoso.pago.due_date}</strong>
                </p>
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Puedes enviar un comprobante pre-armado al WhatsApp de la alumna para confirmarle el pago recibido:
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                onClick={() => {
                  const alumna = pagoAvisoExitoso.alumna;
                  const pago = pagoAvisoExitoso.pago;
                  const phone = alumna?.phone;
                  const mensaje = buildAvisoPagoWhatsAppMessage({
                    nombreCliente: `${alumna?.first_name || ''} ${alumna?.last_name || ''}`.trim(),
                    monto: Number(pago?.amount || 0),
                    metodoPago: pago?.payment_method,
                    concepto: pago?.concept,
                    fechaPago: pago?.payment_date,
                    vencimientoCuota: pago?.due_date,
                  });

                  openWhatsAppMessage(phone, mensaje);
                  setIsAvisoModalOpen(false);
                  setPagoAvisoExitoso(null);
                }}
                icon={<MessageCircle className="h-4 w-4" />}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold"
              >
                Enviar Aviso por WhatsApp
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setIsAvisoModalOpen(false);
                  setPagoAvisoExitoso(null);
                }}
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


