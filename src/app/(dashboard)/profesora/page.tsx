'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { getClasesConAlumnas, addAlumnaToClase, removeAlumnaFromClase } from '@/lib/services/agenda';
import { getDisponibilidadCamillas, DisponibilidadCamillaItem } from '@/lib/services/liquidaciones';
import { getPagos, registrarPago } from '@/lib/services/pagos';
import { PagoFormModal } from '@/components/pagos/PagoFormModal';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { AgendaProfesoraView } from '@/components/agenda/AgendaProfesoraView';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  DollarSign,
  UserCheck,
  UserPlus,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BedDouble,
  Search,
  Check,
} from 'lucide-react';

interface AsistenciaState {
  [claseAlumnaId: string]: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED';
}

export default function ProfesoraVistaPage() {
  const { profile } = useUser();
  const { confirm, alert: alertDialog } = useConfirm();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [clases, setClases] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaState>({});
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadCamillaItem[]>([]);
  const [activeTab, setActiveTab] = useState<'MIS_TURNOS' | 'AGENDA_SEMANAL' | 'LUGARES_DISPONIBLES'>('MIS_TURNOS');
  const [filtroDisponibilidadDia, setFiltroDisponibilidadDia] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal para cobro directo
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [selectedAlumnaForPago, setSelectedAlumnaForPago] = useState<any | null>(null);

  // Modal para agendar alumna en turno
  const [asignarModalOpen, setAsignarModalOpen] = useState(false);
  const [selectedClaseForAssign, setSelectedClaseForAssign] = useState<any | null>(null);
  const [presetCamillaForAssign, setPresetCamillaForAssign] = useState<number>(1);

  // Liquidación de la semana para la profesora
  const [semanaTotal, setSemanaTotal] = useState<number>(0);
  const [semanaComision, setSemanaComision] = useState<number>(0);

  const isProfesora = profile?.role === 'PROFESORA';
  const userName = profile?.full_name || 'Profesora';
  const commissionRate = profile?.commission_rate ?? 0.40;

  useEffect(() => {
    fetchClasesYAsistencias();
    fetchResumenSemanal();
  }, [selectedDate, profile?.id]);

  const fetchClasesYAsistencias = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const dayOfWeekNum = getDayOfWeekFromDate(selectedDate);

      // Obtener clases con alumnas inscriptas y camillas
      const { data: clasesRes } = await getClasesConAlumnas({
        dayOfWeek: dayOfWeekNum,
        profesoraId: isProfesora && profile?.id ? profile.id : undefined,
      });

      setClases(clasesRes || []);

      // Cargar asistencias ya guardadas para la fecha elegida
      const { data: asistData } = await supabase
        .from('asistencias')
        .select('*')
        .eq('date', selectedDate);

      if (asistData) {
        const asistMap: AsistenciaState = {};
        asistData.forEach((a: any) => {
          if (a.clase_alumna_id) {
            asistMap[a.clase_alumna_id] = a.status;
          }
        });
        setAsistencias(asistMap);
      }
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isProfesora, profile?.id]);

  const fetchDisponibilidad = useCallback(async () => {
    const { data } = await getDisponibilidadCamillas({
      dayOfWeek: filtroDisponibilidadDia !== 'ALL' ? filtroDisponibilidadDia : undefined,
      profesoraId: isProfesora && profile?.id ? profile.id : undefined,
    });
    setDisponibilidad(data || []);
  }, [filtroDisponibilidadDia, isProfesora, profile?.id]);

  const fetchResumenSemanal = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const now = new Date(selectedDate);
      const day = now.getDay();
      const diffStart = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
      const startDate = new Date(now.setDate(diffStart)).toISOString().split('T')[0];
      
      const endDateObj = new Date(startDate);
      endDateObj.setDate(endDateObj.getDate() + 6);
      const endDate = endDateObj.toISOString().split('T')[0];

      const pagosRes = await getPagos({ status: 'PAID' });
      const pagosSemana = pagosRes.data.filter((p) => {
        const pDate = p.created_at ? p.created_at.split('T')[0] : (p.payment_date || '');
        const isMatchDate = pDate >= startDate && pDate <= endDate;
        const isMatchProfe = p.profesora_id === profile.id || (p.alumna as any)?.profesora_id === profile.id || !isProfesora;
        return isMatchDate && isMatchProfe;
      });

      const total = pagosSemana.reduce((acc, p) => acc + (p.amount || 0), 0);
      setSemanaTotal(total);
      setSemanaComision(total * commissionRate);
    } catch (err) {
      console.error('Error calculando resumen semanal:', err);
    }
  }, [selectedDate, profile?.id, isProfesora, commissionRate]);

  useEffect(() => {
    fetchClasesYAsistencias();
    fetchResumenSemanal();
    fetchDisponibilidad();
  }, [fetchClasesYAsistencias, fetchResumenSemanal, fetchDisponibilidad]);

  const handleMarcarAsistencia = async (
    claseAlumnaId: string,
    status: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED'
  ) => {
    setSavingId(claseAlumnaId);
    try {
      const supabase = createClient();
      setAsistencias((prev) => ({ ...prev, [claseAlumnaId]: status }));

      const { data: existing } = await supabase
        .from('asistencias')
        .select('id')
        .eq('clase_alumna_id', claseAlumnaId)
        .eq('date', selectedDate)
        .single();

      if (existing) {
        await supabase
          .from('asistencias')
          .update({ status })
          .eq('id', existing.id);
      } else {
        await supabase.from('asistencias').insert({
          clase_alumna_id: claseAlumnaId,
          date: selectedDate,
          status,
        });
      }
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleAbrirPago = (alumna: any) => {
    setSelectedAlumnaForPago(alumna);
    setPagoModalOpen(true);
  };

  const handleAbrirAsignar = (clase: any, camilla?: number) => {
    setSelectedClaseForAssign(clase);
    setPresetCamillaForAssign(camilla || 1);
    setAsignarModalOpen(true);
  };

  const handleRemoveAlumnaFromTurno = async (claseId: string, alumnaId: string, alumnaNombre: string) => {
    const isOk = await confirm({
      title: 'Quitar Alumna del Turno',
      message: `¿Deseas desasignar a ${alumnaNombre} de este turno? La camilla quedará disponible inmediatamente.`,
      confirmText: 'Sí, desasignar',
      variant: 'warning',
    });
    if (!isOk) return;

    const { error } = await removeAlumnaFromClase(claseId, alumnaId);
    if (error) {
      await alertDialog({ title: 'Error', message: error, variant: 'danger' });
    } else {
      fetchClasesYAsistencias();
      fetchDisponibilidad();
    }
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const DIAS_FILTRO = [
    { value: 'ALL', label: 'Todos los días' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in text-[var(--text-primary)]">
      {/* Header Saludo y Selector de Fecha */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              ¡Hola, {userName}!
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Gestión de turnos de tus clases, asignación de alumnas, toma de asistencia y registro de pagos
          </p>
        </div>

        {/* Controles de Fecha */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--bg-tertiary)] p-1.5 rounded-xl border border-[var(--border-default)] w-full sm:w-auto overflow-x-auto custom-scrollbar">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeDate(-1)}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Ayer
          </Button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-xs font-bold border border-[var(--border-default)] focus:outline-none cursor-pointer"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeDate(1)}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            Mañana
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen de Comisiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="border-l-4 border-l-[var(--color-wood)]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Cobrado en tus Clases (Semana)
              </span>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                ${semanaTotal.toLocaleString('es-AR')} ARS
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/10 flex items-center justify-center text-[var(--color-wood)]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Tu Comisión Semanal ({Math.round(commissionRate * 100)}%)
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ${semanaComision.toLocaleString('es-AR')} ARS
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Selector de Pestañas: Mis Turnos vs Agenda Semanal vs Lugares Disponibles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[var(--bg-secondary)] p-1.5 rounded-xl border border-[var(--border-default)]">
        <button
          onClick={() => setActiveTab('MIS_TURNOS')}
          className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'MIS_TURNOS'
              ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Mis Turnos y Asistencia (Hoy)</span>
        </button>

        <button
          onClick={() => setActiveTab('AGENDA_SEMANAL')}
          className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'AGENDA_SEMANAL'
              ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Agenda de Turnos y Reformers</span>
        </button>

        <button
          onClick={() => setActiveTab('LUGARES_DISPONIBLES')}
          className={`py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'LUGARES_DISPONIBLES'
              ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BedDouble className="h-4 w-4" />
          <span>Lugares Disponibles ({disponibilidad.reduce((acc, d) => acc + d.libres_count, 0)})</span>
        </button>
      </div>

      {/* PESTAÑA 1: MIS TURNOS DEL DÍA */}
      {activeTab === 'MIS_TURNOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--color-wood)]" />
              <span>Turnos del Día ({formatFechaLarga(selectedDate)})</span>
            </h2>
            <Badge variant="muted">
              {clases.length} {clases.length === 1 ? 'Turno' : 'Turnos'}
            </Badge>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
              Cargando turnos y lista de asistencias...
            </div>
          ) : clases.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <CalendarIcon className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No hay clases programadas para esta fecha
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Selecciona otro día usando el calendario superior para revisar asistencias o registrar cuotas.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {clases.map((clase) => {
                const maxCap = clase.max_capacity || 6;
                const alumnasEnClase = clase.clase_alumnas || [];
                const ocupadasCount = alumnasEnClase.length;
                const cuposLibres = maxCap - ocupadasCount;

                // Mapear camillas asignadas
                const camillasMap = new Map<number, any>();
                alumnasEnClase.forEach((ca: any) => {
                  if (ca.camilla != null) camillasMap.set(ca.camilla, ca);
                });

                return (
                  <Card
                    key={clase.id}
                    padding="md"
                    className="space-y-4 border-2 hover:border-[var(--color-wood)]/60 transition-all"
                  >
                    {/* Header del Turno */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg bg-[var(--color-wood)] text-[var(--color-dark)] text-sm font-extrabold flex items-center gap-1.5 shadow-2xs">
                          <Clock className="h-4 w-4" />
                          <span>{clase.start_time?.slice(0, 5)} hs</span>
                        </div>

                        <div>
                          <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                            {clase.name || `Turno de ${clase.start_time?.slice(0, 5)} hs`}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {clase.sede?.name || 'Sede Norte'}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-[var(--color-wood)]">
                              <BedDouble className="h-3.5 w-3.5" />
                              {cuposLibres > 0 ? `${cuposLibres} lugares disponibles` : 'Turno completo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Badge variant={ocupadasCount >= maxCap ? 'danger' : 'success'}>
                          {ocupadasCount} / {maxCap} Alumnas
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAbrirAsignar(clase)}
                          disabled={ocupadasCount >= maxCap}
                          icon={<UserPlus className="h-3.5 w-3.5" />}
                        >
                          Agendar Alumna
                        </Button>
                      </div>
                    </div>

                    {/* Grilla visual de Camillas / Reformers del Turno */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                      {Array.from({ length: maxCap }, (_, idx) => idx + 1).map((camillaNum) => {
                        const asignacion = camillasMap.get(camillaNum);
                        const alumna = asignacion?.alumna;

                        if (asignacion && alumna) {
                          const currentStatus = asistencias[asignacion.id] || 'PRESENT';
                          return (
                            <div
                              key={camillaNum}
                              className="p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col justify-between gap-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[var(--color-wood)]/20 text-[var(--color-wood)]">
                                  Ref. {camillaNum}
                                </span>
                                <button
                                  onClick={() => handleRemoveAlumnaFromTurno(clase.id, alumna.id, `${alumna.first_name} ${alumna.last_name || ''}`)}
                                  className="text-[var(--text-muted)] hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Quitar alumna de esta camilla"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div>
                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                  {alumna.first_name} {alumna.last_name || ''}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] truncate">
                                  {alumna.dni ? `DNI: ${alumna.dni}` : alumna.phone || 'Sin tel'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 pt-1 border-t border-[var(--border-default)]">
                                <button
                                  onClick={() => handleMarcarAsistencia(asignacion.id, 'PRESENT')}
                                  disabled={savingId === asignacion.id}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    currentStatus === 'PRESENT'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                  }`}
                                  title="Presente"
                                >
                                  P
                                </button>
                                <button
                                  onClick={() => handleMarcarAsistencia(asignacion.id, 'ABSENT')}
                                  disabled={savingId === asignacion.id}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    currentStatus === 'ABSENT'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-red-500/15 text-red-600 hover:bg-red-600 hover:text-white'
                                  }`}
                                  title="Ausente"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => handleMarcarAsistencia(asignacion.id, 'RECOVERY')}
                                  disabled={savingId === asignacion.id}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    currentStatus === 'RECOVERY'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-amber-500/15 text-amber-600 hover:bg-amber-500 hover:text-white'
                                  }`}
                                  title="Recupera"
                                >
                                  R
                                </button>
                                <button
                                  onClick={() => handleAbrirPago(alumna)}
                                  className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)] hover:text-white text-[var(--text-muted)] transition-colors cursor-pointer"
                                  title="Cobrar cuota / mensualidad"
                                >
                                  <DollarSign className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Camilla Disponible
                        return (
                          <div
                            key={camillaNum}
                            onClick={() => handleAbrirAsignar(clase, camillaNum)}
                            className="p-2.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 flex flex-col justify-between gap-3 text-center transition-all cursor-pointer group"
                          >
                            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                              Ref. {camillaNum}
                            </span>
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Disponible
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">
                                Libre
                              </p>
                            </div>
                            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 group-hover:underline">
                              + Agendar
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: AGENDA SEMANAL COMPLETA Y REFORMERS */}
      {activeTab === 'AGENDA_SEMANAL' && (
        <div className="space-y-4 animate-fade-in">
          <AgendaProfesoraView />
        </div>
      )}

      {/* PESTAÑA 3: BUSCADOR DE LUGARES Y CAMILLAS DISPONIBLES */}
      {activeTab === 'LUGARES_DISPONIBLES' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-default)]">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-emerald-600" />
                <span>Lugares y Camillas Disponibles en el Estudio</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Consulta en tiempo real qué reformers están libres para asignar alumnas o reprogramar recuperaciones
              </p>
            </div>

            {/* Filtro por día */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">Día:</label>
              <select
                value={filtroDisponibilidadDia}
                onChange={(e) => setFiltroDisponibilidadDia(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs font-bold border border-[var(--border-default)] focus:outline-none cursor-pointer"
              >
                {DIAS_FILTRO.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {disponibilidad.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <BedDouble className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Aún no hay turnos ni clases programadas en la Agenda
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                No existen horarios de clases configurados en el sistema. Puedes crear turnos directamente desde la pestaña de Agenda.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('AGENDA_SEMANAL')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-wood)] text-[var(--color-dark)] text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>Abrir Agenda de Turnos</span>
                </button>
              </div>
            </Card>
          ) : disponibilidad
            .filter((d) => filtroDisponibilidadDia === 'ALL' || d.day_of_week === filtroDisponibilidadDia)
            .filter((d) => d.libres_count > 0).length === 0 ? (
            <Card padding="lg" className="text-center py-12">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No hay lugares disponibles para el día seleccionado
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Todos los reformers de este día se encuentran al 100% de ocupación.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {disponibilidad
                .filter((item) => item.libres_count > 0)
                .map((item) => (
                  <Card
                    key={item.clase_id}
                    padding="md"
                    className="space-y-3 border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 transition-all"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
                      <div>
                        <span className="text-xs font-extrabold uppercase text-[var(--color-wood)]">
                          {item.day_name}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {item.start_time} hs ({item.clase_nombre})
                        </h4>
                      </div>
                      <Badge variant="success">
                        {item.libres_count} {item.libres_count === 1 ? 'Libre' : 'Libres'}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{item.sede_nombre}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Profesora: {item.profesora_nombre}</span>
                      </p>
                    </div>

                    {/* Lista de Camillas Específicas Libres */}
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
                        Camillas / Reformers Disponibles:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.camillas_libres.map((camillaNum) => (
                          <button
                            key={camillaNum}
                            onClick={() => {
                              const claseObj = clases.find((c) => c.id === item.clase_id) || {
                                id: item.clase_id,
                                name: item.clase_nombre,
                                start_time: item.start_time,
                                day_of_week: item.day_of_week,
                              };
                              handleAbrirAsignar(claseObj, camillaNum);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title={`Agendar alumna en Reformer ${camillaNum}`}
                          >
                            <BedDouble className="h-3 w-3" />
                            <span>Reformer {camillaNum}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para Agendar Alumna en Turno */}
      {selectedClaseForAssign && (
        <AsignarAlumnaModal
          open={asignarModalOpen}
          onClose={() => {
            setAsignarModalOpen(false);
            setSelectedClaseForAssign(null);
          }}
          onAssign={async (claseId, alumnaId, camilla) => {
            const { error } = await addAlumnaToClase(claseId, alumnaId, camilla);
            if (error) {
              await alertDialog({ title: 'Error', message: error, variant: 'danger' });
              return false;
            }
            fetchClasesYAsistencias();
            fetchDisponibilidad();
            return true;
          }}
          clase={selectedClaseForAssign}
          dayName={formatFechaLarga(selectedDate)}
          presetTime={selectedClaseForAssign.start_time?.slice(0, 5) || '08:00'}
          presetCamilla={presetCamillaForAssign}
        />
      )}

      {/* Modal de Cobro Directo desde el turno */}
      <PagoFormModal
        open={pagoModalOpen}
        initialAlumna={selectedAlumnaForPago}
        defaultProfesoraId={profile?.id}
        onClose={() => {
          setPagoModalOpen(false);
          setSelectedAlumnaForPago(null);
          fetchResumenSemanal();
        }}
        onSubmit={async (data) => {
          const res = await registrarPago(data);
          if (res.data) {
            fetchResumenSemanal();
            return true;
          }
          return false;
        }}
      />
    </div>
  );
}

function getDayOfWeekFromDate(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function formatFechaLarga(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
