'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ArrowLeft,
  ArrowRight,
  Receipt,
  CalendarCheck,
  Plus,
  Phone,
} from 'lucide-react';

interface AsistenciaState {
  [claseAlumnaId: string]: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED';
}

type VistaProfesora = 'HUB' | 'MIS_TURNOS' | 'COBROS' | 'AGENDA_SEMANAL' | 'LUGARES_DISPONIBLES' | 'MI_COMISION';

export default function ProfesoraVistaPage() {
  const { profile } = useUser();
  const { confirm, alert: alertDialog } = useConfirm();

  // Estado de Navegación: Por defecto la primera vista es 'HUB' (Accesos Rápidos)
  const [vistaActual, setVistaActual] = useState<VistaProfesora>('HUB');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [clases, setClases] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaState>({});
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadCamillaItem[]>([]);
  const [filtroDisponibilidadDia, setFiltroDisponibilidadDia] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Historial de cobros registrados exclusivamente por esta profesora
  const [misPagos, setMisPagos] = useState<any[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [searchCobro, setSearchCobro] = useState('');

  // Modal para cobro directo a alumna
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

  // Cargar clases y asistencias del día seleccionado
  const fetchClasesYAsistencias = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const dayOfWeekNum = getDayOfWeekFromDate(selectedDate);

      const { data: clasesRes } = await getClasesConAlumnas({
        dayOfWeek: dayOfWeekNum,
        profesoraId: isProfesora && profile?.id ? profile.id : undefined,
      });

      setClases(clasesRes || []);

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

  // Cargar disponibilidad de camillas
  const fetchDisponibilidad = useCallback(async () => {
    const { data } = await getDisponibilidadCamillas({
      dayOfWeek: filtroDisponibilidadDia !== 'ALL' ? filtroDisponibilidadDia : undefined,
      profesoraId: isProfesora && profile?.id ? profile.id : undefined,
    });
    setDisponibilidad(data || []);
  }, [filtroDisponibilidadDia, isProfesora, profile?.id]);

  // Cargar cobros registrados exclusivamente por esta profesora
  const fetchMisPagos = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingPagos(true);
    try {
      const { data } = await getPagos({
        profesoraId: profile.id,
      });
      setMisPagos(data || []);
    } catch (err) {
      console.error('Error al cargar historial de pagos:', err);
    } finally {
      setLoadingPagos(false);
    }
  }, [profile?.id]);

  // Cargar resumen de liquidación semanal
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

      const pagosRes = await getPagos({
        status: 'PAID',
        profesoraId: isProfesora && profile?.id ? profile.id : undefined,
      });
      const pagosSemana = pagosRes.data.filter((p) => {
        const pDate = p.created_at ? p.created_at.split('T')[0] : (p.payment_date || '');
        return pDate >= startDate && pDate <= endDate;
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
    fetchMisPagos();
  }, [fetchClasesYAsistencias, fetchResumenSemanal, fetchDisponibilidad, fetchMisPagos]);

  // Manejador de asistencia
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

  // Métricas rápidas calculadas para el Hub y Módulos
  const hoyStr = new Date().toISOString().split('T')[0];
  const mesStr = new Date().toISOString().slice(0, 7);

  const cobrosHoy = useMemo(() => {
    return misPagos.filter((p) => {
      const d = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      return d === hoyStr;
    });
  }, [misPagos, hoyStr]);

  const totalCobradoHoy = useMemo(() => {
    return cobrosHoy.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [cobrosHoy]);

  const cobrosMes = useMemo(() => {
    return misPagos.filter((p) => {
      const d = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      return d.startsWith(mesStr);
    });
  }, [misPagos, mesStr]);

  const totalCobradoMes = useMemo(() => {
    return cobrosMes.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [cobrosMes]);

  const totalLibresSemana = useMemo(() => {
    return disponibilidad.reduce((acc, d) => acc + (d.libres_count || 0), 0);
  }, [disponibilidad]);

  const pagosFiltrados = useMemo(() => {
    if (!searchCobro.trim()) return misPagos;
    const q = searchCobro.toLowerCase();
    return misPagos.filter((p) => {
      const alumnaNombre = p.alumna
        ? `${p.alumna.first_name} ${p.alumna.last_name || ''}`.toLowerCase()
        : '';
      const alumnaDni = p.alumna?.dni?.toLowerCase() || '';
      const concept = (p.concept || '').toLowerCase();
      const method = (p.payment_method || '').toLowerCase();
      return alumnaNombre.includes(q) || alumnaDni.includes(q) || concept.includes(q) || method.includes(q);
    });
  }, [misPagos, searchCobro]);

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
      {/* Barra de Navegación de Retorno (Visible cuando NO está en el HUB) */}
      {vistaActual !== 'HUB' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-3.5 shadow-sm">
          <button
            type="button"
            onClick={() => setVistaActual('HUB')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] hover:border-[#001f1f] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>Volver al Menú Principal</span>
          </button>

          {/* Acceso directo a otros módulos */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setVistaActual('COBROS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                vistaActual === 'COBROS'
                  ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Mis Cobros</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActual('MIS_TURNOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                vistaActual === 'MIS_TURNOS'
                  ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Mis Turnos</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActual('LUGARES_DISPONIBLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                vistaActual === 'LUGARES_DISPONIBLES'
                  ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              <span>Disponibilidad</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActual('AGENDA_SEMANAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                vistaActual === 'AGENDA_SEMANAL'
                  ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActual('MI_COMISION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                vistaActual === 'MI_COMISION'
                  ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Mi Comisión</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 1: HUB PRINCIPAL (PRIMERA VISTA AL INICIAR SESIÓN CON BOTONES DE ACCESO RÁPIDO)
          ========================================================================= */}
      {vistaActual === 'HUB' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header de Bienvenida Limpio */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-[#cdface] text-[#001f1f] text-[11px] font-black uppercase tracking-wider border border-[#001f1f] shadow-2xs">
                  Pilates Studio
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Panel de Gestión Docente
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                ¡Hola, {userName}!
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl">
                Accede rápidamente a tus herramientas de trabajo: cobros a alumnas, toma de asistencia por reformer y turnos disponibles.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl p-3.5 self-start md:self-auto shadow-2xs">
              <CalendarCheck className="h-8 w-8 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Fecha de hoy
                </p>
                <p className="text-xs sm:text-sm font-black text-[var(--text-primary)] capitalize">
                  {formatFechaLarga(hoyStr)}
                </p>
              </div>
            </div>
          </div>

          {/* Grilla de Botones de Acceso Rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. Registrar Cobro (Acción Directa Principal) */}
            <button
              type="button"
              onClick={() => {
                setSelectedAlumnaForPago(null);
                setPagoModalOpen(true);
              }}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-emerald-600/30 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface] text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                  <DollarSign className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                  Cobro Directo
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Registrar Cobro
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Cargar cuota mensual, inscripción o clase suelta a una alumna del estudio.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>Abrir formulario de cobro</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 2. Historial de Mis Cobros */}
            <button
              type="button"
              onClick={() => setVistaActual('COBROS')}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface]/50 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Receipt className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {misPagos.length} registrados
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Mis Cobros Registrados
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Historial de cobros cargados por vos, montos cobrados hoy y en el mes.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Ver historial de cobros</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 3. Mis Turnos y Asistencia (Hoy) */}
            <button
              type="button"
              onClick={() => setVistaActual('MIS_TURNOS')}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface]/50 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {clases.length} {clases.length === 1 ? 'turno hoy' : 'turnos hoy'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Mis Turnos y Asistencias
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Pasar lista por reformer (presente, ausente, recupera) y gestionar alumnas.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Ingresar a mis turnos</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 4. Turnos Disponibles */}
            <button
              type="button"
              onClick={() => setVistaActual('LUGARES_DISPONIBLES')}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface]/50 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Clock className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {totalLibresSemana} libres
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Turnos Disponibles
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Consultar disponibilidad de reformers libres por día y agendar alumnas.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Consultar disponibilidad</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* 5. Mi Comisión Semanal */}
            <button
              type="button"
              onClick={() => setVistaActual('MI_COMISION')}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface]/50 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {Math.round(commissionRate * 100)}%
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Mi Comisión Semanal
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Seguimiento de recaudación semanal y porcentaje estimado acumulado.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Ver liquidación</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 2: HISTORIAL Y REGISTRO DE COBROS DE LA PROFESORA
          ========================================================================= */}
      {vistaActual === 'COBROS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header del Módulo de Cobros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-[#cdface] text-[#001f1f] text-[11px] font-black uppercase tracking-wider border border-[#001f1f] shadow-2xs">
                  Cobros Docentes
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Registro personal de cobranzas
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                <Receipt className="h-6 w-6 text-emerald-600" />
                <span>Mis Cobros Registrados</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Historial de pagos que cargaste en el sistema.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                setSelectedAlumnaForPago(null);
                setPagoModalOpen(true);
              }}
              icon={<Plus className="h-4 w-4" />}
              className="bg-[#001f1f] text-white hover:bg-[#003333] font-bold shadow-sm self-start sm:self-auto"
            >
              Registrar Nuevo Cobro
            </Button>
          </div>

          {/* Tarjetas de Resumen de Cobros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md" className="border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Cobrado Hoy
                  </p>
                  <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
                    ${totalCobradoHoy.toLocaleString('es-AR')} ARS
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {cobrosHoy.length} {cobrosHoy.length === 1 ? 'cobro hoy' : 'cobros hoy'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#cdface] text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#001f1f] dark:border-l-emerald-400">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Total Cobrado en el Mes
                </p>
                <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
                  ${totalCobradoMes.toLocaleString('es-AR')} ARS
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {cobrosMes.length} {cobrosMes.length === 1 ? 'cobro en el mes' : 'cobros en el mes'}
                </p>
              </div>
            </Card>

            <Card padding="md" className="border-l-4 border-l-amber-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Comisión Estimada ({Math.round(commissionRate * 100)}%)
                </p>
                <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                  ${(totalCobradoMes * commissionRate).toLocaleString('es-AR')} ARS
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Calculado sobre tu recaudación mensual
                </p>
              </div>
            </Card>
          </div>

          {/* Tabla / Listado de Historial */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Historial de Cobros Cargados</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-primary)] border border-[var(--border-default)]">
                  {pagosFiltrados.length}
                </span>
              </h3>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar por alumna o concepto..."
                  value={searchCobro}
                  onChange={(e) => setSearchCobro(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#001f1f]"
                />
              </div>
            </div>

            {loadingPagos ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                Cargando tu historial de cobros...
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#cdface]/30 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    No tienes cobros registrados aún
                  </p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm">
                    {searchCobro
                      ? 'No hay resultados que coincidan con la búsqueda.'
                      : 'Cuando registres cuotas o clases sueltas aparecerán detalladas aquí.'}
                  </p>
                </div>
                {!searchCobro && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedAlumnaForPago(null);
                      setPagoModalOpen(true);
                    }}
                    icon={<Plus className="h-3.5 w-3.5" />}
                    className="bg-[#001f1f] text-white mt-1"
                  >
                    Registrar Primer Cobro
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Alumna</th>
                      <th className="py-2.5 px-3">Concepto</th>
                      <th className="py-2.5 px-3">Método</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                      <th className="py-2.5 px-3 text-right">Tu Comisión ({Math.round(commissionRate * 100)}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {pagosFiltrados.map((pago) => {
                      const fechaDisplay = pago.payment_date
                        ? formatFechaLarga(pago.payment_date)
                        : pago.created_at
                        ? formatFechaLarga(pago.created_at.split('T')[0])
                        : 'Sin fecha';
                      const alumnaNombre = pago.alumna
                        ? `${pago.alumna.last_name || ''}, ${pago.alumna.first_name}`.trim()
                        : 'Alumna';
                      const comisionMonto = (pago.amount || 0) * commissionRate;

                      return (
                        <tr key={pago.id} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                          <td className="py-3 px-3 text-[var(--text-muted)] font-medium capitalize">
                            {fechaDisplay}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-[var(--text-primary)]">{alumnaNombre}</p>
                            {pago.alumna?.phone && (
                              <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                {pago.alumna.phone}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {pago.concept || 'Cuota mensualidad'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)]">
                              {pago.payment_method || 'Efectivo'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[var(--text-primary)]">
                            ${(pago.amount || 0).toLocaleString('es-AR')} ARS
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300">
                            ${comisionMonto.toLocaleString('es-AR')} ARS
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 3: MIS TURNOS Y ASISTENCIAS DE HOY
          ========================================================================= */}
      {vistaActual === 'MIS_TURNOS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header con Selector de Fecha */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-[#cdface] text-[#001f1f] text-[11px] font-black uppercase tracking-wider border border-[#001f1f] shadow-2xs">
                  Asistencia
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {clases.length} {clases.length === 1 ? 'Turno' : 'Turnos'} asignados
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="h-6 w-6 text-emerald-600" />
                <span>Turnos del Día ({formatFechaLarga(selectedDate)})</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Gestioná la asistencia de tus alumnas por reformer y asignaciones.
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

          {/* Listado de Turnos */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
              Cargando turnos y lista de asistencias...
            </div>
          ) : clases.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <CalendarIcon className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                No hay clases programadas para esta fecha
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Seleccioná otro día usando el calendario superior para revisar asistencias o registrar cuotas.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {clases.map((clase) => {
                const maxCap = clase.max_capacity || 6;
                const alumnasEnClase = clase.clase_alumnas || [];
                const ocupadasCount = alumnasEnClase.length;
                const cuposLibres = maxCap - ocupadasCount;

                const camillasMap = new Map<number, any>();
                alumnasEnClase.forEach((ca: any) => {
                  if (ca.camilla != null) camillasMap.set(ca.camilla, ca);
                });

                return (
                  <Card
                    key={clase.id}
                    padding="md"
                    className="space-y-4 border-2 hover:border-[#001f1f]/60 dark:hover:border-emerald-500/60 transition-all rounded-2xl"
                  >
                    {/* Header del Turno */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#cdface] text-[#001f1f] border border-[#001f1f]/20 text-sm font-black flex flex-col items-center justify-center shadow-2xs">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-mono font-bold mt-0.5">{clase.start_time?.slice(0, 5)}</span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-[var(--text-primary)]">
                            {clase.name || `Turno de ${clase.start_time?.slice(0, 5)} hs`}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {clase.sede?.name || 'Sede'}
                            </span>
                            <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
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

                    {/* Grilla visual de Reformers del Turno */}
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
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#cdface] text-[#001f1f] border border-[#001f1f]/20">
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
                                  className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[#001f1f] hover:text-white text-[var(--text-muted)] transition-colors cursor-pointer"
                                  title="Registrar cobro a esta alumna"
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

      {/* =========================================================================
          VISTA 4: AGENDA SEMANAL COMPLETA
          ========================================================================= */}
      {vistaActual === 'AGENDA_SEMANAL' && (
        <div className="space-y-4 animate-fade-in">
          <AgendaProfesoraView />
        </div>
      )}

      {/* =========================================================================
          VISTA 5: LUGARES Y CAMILLAS DISPONIBLES
          ========================================================================= */}
      {vistaActual === 'LUGARES_DISPONIBLES' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-emerald-600" />
                <span>Lugares y Camillas Disponibles en el Estudio</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Consulta en tiempo real qué reformers están libres para asignar alumnas o reprogramar recuperaciones.
              </p>
            </div>

            {/* Filtro por día */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">Día:</label>
              <select
                value={filtroDisponibilidadDia}
                onChange={(e) => setFiltroDisponibilidadDia(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] text-xs font-bold border border-[var(--border-default)] focus:outline-none cursor-pointer"
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
                No existen horarios de clases configurados en el sistema.
              </p>
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
                    className="space-y-3 border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 transition-all rounded-2xl"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
                      <div>
                        <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">
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

      {/* =========================================================================
          VISTA 6: MI COMISIÓN SEMANAL
          ========================================================================= */}
      {vistaActual === 'MI_COMISION' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-[#cdface] text-[#001f1f] text-[11px] font-black uppercase tracking-wider border border-[#001f1f] shadow-2xs">
                Liquidación
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                Semana en curso
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              <span>Mi Resumen y Comisión Semanal</span>
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Detalle de cobros realizados en tus clases y tu comisión calculada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="md" className="border-l-4 border-l-[#001f1f] dark:border-l-emerald-400">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Cobrado en tus Clases (Semana)
                  </span>
                  <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                    ${semanaTotal.toLocaleString('es-AR')} ARS
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#cdface] text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center">
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
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>
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

      {/* Modal de Cobro Directo a Alumna */}
      <PagoFormModal
        open={pagoModalOpen}
        initialAlumna={selectedAlumnaForPago}
        defaultProfesoraId={profile?.id}
        defaultCommissionRate={commissionRate}
        disableCommissionEdit={true}
        onClose={() => {
          setPagoModalOpen(false);
          setSelectedAlumnaForPago(null);
          fetchResumenSemanal();
          fetchMisPagos();
        }}
        onSubmit={async (data) => {
          const res = await registrarPago({
            ...data,
            profesora_id: profile?.id || data.profesora_id,
            commission_rate: commissionRate,
          });
          if (res.data) {
            fetchResumenSemanal();
            fetchMisPagos();
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
