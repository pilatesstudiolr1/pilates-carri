'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { getClasesConAlumnas, addAlumnaToClase, removeAlumnaFromClase } from '@/lib/services/agenda';
import { getDisponibilidadCamillas, DisponibilidadCamillaItem } from '@/lib/services/liquidaciones';
import { getPagos, registrarPago } from '@/lib/services/pagos';
import { PagoForm } from '@/components/pagos/PagoForm';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { AgendaProfesoraView } from '@/components/agenda/AgendaProfesoraView';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { buildAvisoPagoWhatsAppMessage, openWhatsAppMessage, getLocalDateISO } from '@/lib/utils';
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
  MessageCircle,
  CalendarClock,
  AlertCircle,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface AsistenciaState {
  [claseAlumnaId: string]: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED';
}

type VistaProfesora = 'HUB' | 'COBROS' | 'ESTADO_ALUMNAS' | 'AGENDA_SEMANAL' | 'LUGARES_DISPONIBLES';


function ProfesoraVistaContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || searchParams.get('view');
  const queryAlumnaId = searchParams.get('alumnaId');

  const { profile } = useUser();
  const { confirm, alert: alertDialog } = useConfirm();

  // Estado de Navegación: Por defecto la primera vista es 'HUB' o según URL
  const [vistaActual, setVistaActual] = useState<VistaProfesora>(() => {
    if (tabParam === 'COBROS') return 'COBROS';
    if (tabParam === 'ESTADO_ALUMNAS' || tabParam === 'VENCIMIENTOS' || tabParam === 'ALUMNAS') return 'ESTADO_ALUMNAS';
    return 'HUB';
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateISO());
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

  // Alumnas a cargo y estado de cuotas / vencimientos
  const [misAlumnas, setMisAlumnas] = useState<any[]>([]);
  const [loadingAlumnas, setLoadingAlumnas] = useState(false);
  const [searchAlumnaVenc, setSearchAlumnaVenc] = useState('');
  const [filtroVencimiento, setFiltroVencimiento] = useState<'TODAS' | 'VENCIDAS' | 'POR_VENCER' | 'AL_DIA'>('TODAS');

  // Alumna seleccionada para el formulario dedicado de cobro
  const [selectedAlumnaForPago, setSelectedAlumnaForPago] = useState<any | null>(null);

  // Modal de Aviso de Pago por WhatsApp
  const [pagoAvisoExitoso, setPagoAvisoExitoso] = useState<{ pago: any; alumna: any } | null>(null);
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);

  // Modal para agendar alumna en turno
  const [asignarModalOpen, setAsignarModalOpen] = useState(false);
  const [selectedClaseForAssign, setSelectedClaseForAssign] = useState<any | null>(null);
  const [presetCamillaForAssign, setPresetCamillaForAssign] = useState<number>(1);

  const isProfesora = profile?.role === 'PROFESORA';
  const userName = profile?.full_name || 'Profesora';


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

  // Cargar alumnas asignadas y su estado de cuota
  const fetchMisAlumnas = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingAlumnas(true);
    try {
      const supabase = createClient();

      // 1. Alumnas con profesora_id asignada directamente
      let directasQuery = supabase
        .from('alumnas')
        .select('id, first_name, last_name, phone, dni, plan, plan_amount, billing_due_date, monthly_paid, enrollment_paid, status, profesora_id, sede_id');

      if (isProfesora) {
        directasQuery = directasQuery.eq('profesora_id', profile.id);
      }
      const { data: directasData, error: directasErr } = await directasQuery.in('status', ['ACTIVE', 'SUSPENDED']);
      if (directasErr) console.error('Error directas alumnas:', directasErr);

      // 2. Alumnas que asisten a clases de esta profesora
      let enClasesAlumnas: any[] = [];
      if (isProfesora) {
        const { data: clasesProf } = await supabase
          .from('clases')
          .select('id')
          .eq('profesora_id', profile.id);

        const claseIds = (clasesProf || []).map((c: any) => c.id);
        if (claseIds.length > 0) {
          const { data: caData } = await supabase
            .from('clase_alumnas')
            .select('alumna:alumnas(id, first_name, last_name, phone, dni, plan, plan_amount, billing_due_date, monthly_paid, enrollment_paid, status, profesora_id, sede_id)')
            .in('clase_id', claseIds);

          if (caData) {
            enClasesAlumnas = caData
              .map((item: any) => item.alumna)
              .filter((a: any) => a && (a.status === 'ACTIVE' || a.status === 'SUSPENDED'));
          }
        }
      }

      // Consolidar sin duplicados
      const mapa = new Map<string, any>();
      (directasData || []).forEach((a: any) => {
        if (a?.id) mapa.set(a.id, a);
      });
      enClasesAlumnas.forEach((a: any) => {
        if (a?.id && !mapa.has(a.id)) {
          mapa.set(a.id, a);
        }
      });

      setMisAlumnas(Array.from(mapa.values()));
    } catch (err) {
      console.error('Error cargando alumnas de la profesora:', err);
    } finally {
      setLoadingAlumnas(false);
    }
  }, [profile?.id, isProfesora]);

  useEffect(() => {
    fetchClasesYAsistencias();
    fetchDisponibilidad();
    fetchMisPagos();
    fetchMisAlumnas();
  }, [fetchClasesYAsistencias, fetchDisponibilidad, fetchMisPagos, fetchMisAlumnas]);


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

      // Si se marcó PRESENT y la alumna es de clase individual / sólo inscripción ($0), suspenderla
      if (status === 'PRESENT') {
        const { data: caData } = await supabase
          .from('clase_alumnas')
          .select('alumna_id, alumna:alumnas(id, plan, plan_amount)')
          .eq('id', claseAlumnaId)
          .maybeSingle();

        const alum = (caData as any)?.alumna;
        const isTrial =
          alum?.plan === 'Solo Inscripción / Clase de prueba' ||
          (alum?.plan && alum.plan.toLowerCase().includes('individual')) ||
          (alum?.plan && alum.plan.toLowerCase().includes('prueba')) ||
          (alum?.plan && alum.plan.toLowerCase().includes('inscripci')) ||
          (alum?.plan_amount === 0 && !alum?.plan);

        if (isTrial && caData?.alumna_id) {
          await supabase
            .from('alumnas')
            .update({ status: 'SUSPENDED' })
            .eq('id', caData.alumna_id);
        }
      }
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
    } finally {
      setSavingId(null);
    }
  };

  // Si viene alumnaId por query param, preseleccionar y navegar a COBROS
  useEffect(() => {
    if (queryAlumnaId) {
      setVistaActual('COBROS');
      const supabase = createClient();
      supabase
        .from('alumnas')
        .select('*')
        .eq('id', queryAlumnaId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedAlumnaForPago(data);
            setTimeout(() => {
              document.getElementById('formulario-cobro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }
        });
    }
  }, [queryAlumnaId]);

  const handleAbrirPago = (alumna: any) => {
    setSelectedAlumnaForPago(alumna);
    setVistaActual('COBROS');
    setTimeout(() => {
      document.getElementById('formulario-cobro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
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

  // Métricas operativas para el Hub y Módulos
  const hoyStr = getLocalDateISO();
  const mesStr = hoyStr.slice(0, 7);

  const cobrosHoy = useMemo(() => {
    return misPagos.filter((p) => {
      const d = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      return d === hoyStr;
    });
  }, [misPagos, hoyStr]);

  const cobrosMes = useMemo(() => {
    return misPagos.filter((p) => {
      const d = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : '');
      return d.startsWith(mesStr);
    });
  }, [misPagos, mesStr]);


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

  const estadisticasAlumnas = useMemo(() => {
    let vencidas = 0;
    let porVencer = 0;
    let alDia = 0;

    misAlumnas.forEach((a) => {
      const estado = getEstadoCuotaAlumna(a, hoyStr);
      if (estado.estado === 'VENCIDA') vencidas++;
      else if (estado.estado === 'POR_VENCER') porVencer++;
      else alDia++;
    });

    return {
      total: misAlumnas.length,
      vencidas,
      porVencer,
      alDia,
    };
  }, [misAlumnas, hoyStr]);

  const alumnasFiltradasVenc = useMemo(() => {
    return misAlumnas
      .filter((a) => {
        const estado = getEstadoCuotaAlumna(a, hoyStr);
        if (filtroVencimiento === 'VENCIDAS' && estado.estado !== 'VENCIDA') return false;
        if (filtroVencimiento === 'POR_VENCER' && estado.estado !== 'POR_VENCER') return false;
        if (filtroVencimiento === 'AL_DIA' && estado.estado !== 'AL_DIA') return false;

        if (!searchAlumnaVenc.trim()) return true;
        const q = searchAlumnaVenc.toLowerCase();
        const nombreCompleto = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
        const dni = (a.dni || '').toLowerCase();
        const phone = (a.phone || '').toLowerCase();
        return nombreCompleto.includes(q) || dni.includes(q) || phone.includes(q);
      })
      .sort((a, b) => {
        const orderMap = { VENCIDA: 0, POR_VENCER: 1, AL_DIA: 2 };
        const estadoA = getEstadoCuotaAlumna(a, hoyStr).estado;
        const estadoB = getEstadoCuotaAlumna(b, hoyStr).estado;
        if (orderMap[estadoA] !== orderMap[estadoB]) {
          return orderMap[estadoA] - orderMap[estadoB];
        }
        const dateA = a.billing_due_date || '9999-99-99';
        const dateB = b.billing_due_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }, [misAlumnas, filtroVencimiento, searchAlumnaVenc, hoyStr]);

  const handleAvisoWhatsAppAlumna = (alumna: any) => {
    const primerNombre = (alumna.first_name || 'Alumna').trim();
    const dueDateStr = alumna.billing_due_date ? formatFechaCorta(alumna.billing_due_date) : '';
    const montoPlan = alumna.plan_amount ? `$${Number(alumna.plan_amount).toLocaleString('es-AR')} ARS` : '';

    let mensaje = `¡Hola ${primerNombre}! 👋✨ Te escribo de Pilates Studio.\n\n`;
    if (alumna.billing_due_date) {
      mensaje += `Te recordamos que tu cuota mensual tiene fecha de vencimiento el *${dueDateStr}*`;
      if (montoPlan) mensaje += ` (Plan: *${montoPlan}*)`;
      mensaje += `.\n\n`;
    } else {
      mensaje += `Te recordamos que podés abonar tu cuota mensual de Pilates en tu próxima clase.\n\n`;
    }
    mensaje += `Podés abonarla en recepción o directamente con tu profe al llegar, o por transferencia. ¡Muchas gracias! 😊🧘‍♀️`;

    openWhatsAppMessage(alumna.phone, mensaje);
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
              onClick={() => setVistaActual('ESTADO_ALUMNAS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                vistaActual === 'ESTADO_ALUMNAS'
                  ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Vencimientos</span>
              {estadisticasAlumnas.vencidas > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                  {estadisticasAlumnas.vencidas}
                </span>
              )}
            </button>

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
                setVistaActual('COBROS');
                setTimeout(() => {
                  document.getElementById('formulario-cobro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
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

            {/* 3. Vencimientos y Cuotas de Alumnas */}
            <button
              type="button"
              onClick={() => setVistaActual('ESTADO_ALUMNAS')}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface]/50 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <CalendarClock className="h-6 w-6" />
                </div>
                {estadisticasAlumnas.vencidas > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    {estadisticasAlumnas.vencidas} a cobrar
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    Al día
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Vencimientos de Cuotas
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Semáforo de vencimientos: sabé quién debe cuota al llegar a clase y quién está próxima a vencer.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Ver estado de alumnas</span>
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

            {/* 4. Agenda Semanal */}
            <button
              type="button"
              onClick={() => setVistaActual('AGENDA_SEMANAL')}
              className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#cdface]/50 text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <CalendarIcon className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Agenda Semanal
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Acceso directo a la agenda completa para ver turnos y organizar a tus alumnas.
                </p>
              </div>
              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>Ir a la Agenda</span>
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
                  Cobros Profesoras
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
                document.getElementById('formulario-cobro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              icon={<Plus className="h-4 w-4" />}
              className="bg-[#001f1f] text-white hover:bg-[#003333] font-bold shadow-sm self-start sm:self-auto"
            >
              Registrar Nuevo Cobro
            </Button>
          </div>

          {/* Tarjetas de Resumen Operativo de Cobros (Sin comisiones ni recaudación total visible para la profesora) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md" className="border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Cobros Registrados Hoy
                  </p>
                  <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1">
                    {cobrosHoy.length}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {cobrosHoy.length === 1 ? 'cobro cargado hoy' : 'cobros cargados hoy'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#cdface] text-[#001f1f] border border-[#001f1f]/20 flex items-center justify-center font-bold">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card padding="md" className="border-l-4 border-l-[#001f1f] dark:border-l-emerald-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Cobros en el Mes
                  </p>
                  <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1">
                    {cobrosMes.length}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {cobrosMes.length === 1 ? 'cobro en el mes' : 'cobros en el mes'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] flex items-center justify-center font-bold">
                  <CalendarCheck className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card padding="md" className="border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Historial Completo
                  </p>
                  <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1">
                    {misPagos.length}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Cobros registrados por vos
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Formulario Dedicado Único de Cobros (Sin Modales) */}
          <PagoForm
            id="formulario-cobro"
            initialAlumna={selectedAlumnaForPago}
            defaultProfesoraId={profile?.id}
            disableCommissionEdit={true}
            title="Registrar Cobro a Alumna"
            description="Carga de cuota mensual, inscripción o clase suelta con impacto directo en caja."
            onPaymentSuccess={() => {
              setSelectedAlumnaForPago(null);
              fetchMisPagos();
              fetchClasesYAsistencias();
              fetchMisAlumnas();
            }}
          />

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
                      document.getElementById('formulario-cobro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                      <th className="py-2.5 px-3 text-right">Aviso WhatsApp</th>
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
                            {pago.notes && pago.notes.includes('[Métodos de pago:') ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 w-fit">
                                  Pago combinado
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                  {pago.notes.match(/\[Métodos de pago:\s*([^\]]+)\]/)?.[1] || pago.payment_method}
                                </span>
                              </div>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)]">
                                {pago.payment_method || 'Efectivo'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-[var(--text-primary)]">
                            ${(pago.amount || 0).toLocaleString('es-AR')} ARS
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const phone = pago.alumna?.phone;
                                const mensaje = buildAvisoPagoWhatsAppMessage({
                                  nombreCliente: `${pago.alumna?.first_name || ''} ${pago.alumna?.last_name || ''}`.trim(),
                                  monto: Number(pago.amount || 0),
                                  metodoPago: pago.payment_method,
                                  concepto: pago.concept,
                                  fechaPago: pago.payment_date,
                                  vencimientoCuota: pago.due_date,
                                  notas: pago.notes,
                                });
                                openWhatsAppMessage(phone, mensaje);
                              }}
                              icon={<MessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                              className="text-[11px] font-bold"
                            >
                              Enviar Aviso
                            </Button>
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
          VISTA 3: ESTADO DE CUOTAS Y VENCIMIENTOS DE ALUMNAS
          ========================================================================= */}
      {vistaActual === 'ESTADO_ALUMNAS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header del Módulo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-[#cdface] text-[#001f1f] text-[11px] font-black uppercase tracking-wider border border-[#001f1f] shadow-2xs">
                  Semáforo de Pagos
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Control de cuotas y vencimientos
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-emerald-600" />
                <span>Vencimientos de Cuotas de Alumnas</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Revisa qué alumnas deben abonar la cuota al llegar a clase, quiénes están por vencer y registra sus pagos directamente.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                setSelectedAlumnaForPago(null);
                setVistaActual('COBROS');
                setTimeout(() => {
                  document.getElementById('formulario-cobro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
              }}
              icon={<Plus className="h-4 w-4" />}
              className="bg-[#001f1f] text-white hover:bg-[#003333] font-bold shadow-sm self-start sm:self-auto"
            >
              Registrar Cobro
            </Button>
          </div>

          {/* Tarjetas de Semáforo Operativo (KPIs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Vencidas / Deben Cuota */}
            <div
              onClick={() => setFiltroVencimiento(filtroVencimiento === 'VENCIDAS' ? 'TODAS' : 'VENCIDAS')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                filtroVencimiento === 'VENCIDAS'
                  ? 'border-rose-500 bg-rose-500/10 shadow-sm'
                  : 'border-rose-500/30 bg-[var(--bg-secondary)] hover:border-rose-500 hover:bg-rose-500/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Cuotas Vencidas
                </p>
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                {estadisticasAlumnas.vencidas}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {estadisticasAlumnas.vencidas === 1 ? 'Alumna debe abonar' : 'Alumnas deben abonar'}
              </p>
            </div>

            {/* 2. Por Vencer en 7 días */}
            <div
              onClick={() => setFiltroVencimiento(filtroVencimiento === 'POR_VENCER' ? 'TODAS' : 'POR_VENCER')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                filtroVencimiento === 'POR_VENCER'
                  ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                  : 'border-amber-500/30 bg-[var(--bg-secondary)] hover:border-amber-500 hover:bg-amber-500/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Vencen en 7 días
                </p>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {estadisticasAlumnas.porVencer}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Próximas a vencer
              </p>
            </div>

            {/* 3. Al Día */}
            <div
              onClick={() => setFiltroVencimiento(filtroVencimiento === 'AL_DIA' ? 'TODAS' : 'AL_DIA')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                filtroVencimiento === 'AL_DIA'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                  : 'border-emerald-500/30 bg-[var(--bg-secondary)] hover:border-emerald-500 hover:bg-emerald-500/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Cuota al Día
                </p>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
                {estadisticasAlumnas.alDia}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Cuotas vigentes
              </p>
            </div>

            {/* 4. Total Alumnas */}
            <div
              onClick={() => setFiltroVencimiento('TODAS')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                filtroVencimiento === 'TODAS'
                  ? 'border-[#001f1f] dark:border-emerald-500 bg-[var(--bg-primary)] shadow-sm'
                  : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[#001f1f]'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Total Alumnas
                </p>
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center justify-center font-bold">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-2">
                {estadisticasAlumnas.total}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Alumnas asignadas
              </p>
            </div>
          </div>

          {/* Listado / Tabla con Buscador y Filtros */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
              {/* Filtros tipo píldoras */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setFiltroVencimiento('TODAS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filtroVencimiento === 'TODAS'
                      ? 'bg-[#001f1f] text-white shadow-2xs dark:bg-emerald-700'
                      : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Todas ({estadisticasAlumnas.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroVencimiento('VENCIDAS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroVencimiento === 'VENCIDAS'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                  Vencidas ({estadisticasAlumnas.vencidas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroVencimiento('POR_VENCER')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroVencimiento === 'POR_VENCER'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Por Vencer ({estadisticasAlumnas.porVencer})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroVencimiento('AL_DIA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filtroVencimiento === 'AL_DIA'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Al Día ({estadisticasAlumnas.alDia})
                </button>
              </div>

              {/* Buscador */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar por alumna, DNI o tel..."
                  value={searchAlumnaVenc}
                  onChange={(e) => setSearchAlumnaVenc(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Tabla de Alumnas */}
            {loadingAlumnas ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)]">
                Cargando estado de alumnas...
              </div>
            ) : alumnasFiltradasVenc.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CalendarClock className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-40" />
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  No se encontraron alumnas con este criterio
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {searchAlumnaVenc ? 'Probá con otro término de búsqueda.' : 'No hay alumnas en esta categoría.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Alumna</th>
                      <th className="py-2.5 px-3">DNI</th>
                      <th className="py-2.5 px-3">Plan / Monto</th>
                      <th className="py-2.5 px-3">Fecha Vencimiento</th>
                      <th className="py-2.5 px-3">Estado de Cuota</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {alumnasFiltradasVenc.map((alumna) => {
                      const nombreCompleto = `${alumna.last_name || ''}, ${alumna.first_name || ''}`.trim();
                      const estado = getEstadoCuotaAlumna(alumna, hoyStr);
                      const planTexto = alumna.plan || 'Sin plan asignado';
                      const montoTexto = alumna.plan_amount ? `$${Number(alumna.plan_amount).toLocaleString('es-AR')}` : '-';

                      return (
                        <tr key={alumna.id} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                          {/* Alumna */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-[var(--text-primary)]">{nombreCompleto}</p>
                            {alumna.phone && (
                              <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{alumna.phone}</span>
                              </p>
                            )}
                          </td>

                          {/* DNI */}
                          <td className="py-3 px-3 text-[var(--text-secondary)] font-mono text-[11px]">
                            {alumna.dni || 'Sin DNI'}
                          </td>

                          {/* Plan */}
                          <td className="py-3 px-3">
                            <p className="font-semibold text-[var(--text-primary)]">{planTexto}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">{montoTexto}</p>
                          </td>

                          {/* Fecha Vencimiento */}
                          <td className="py-3 px-3 font-mono text-[11px]">
                            {alumna.billing_due_date ? formatFechaCorta(alumna.billing_due_date) : <span className="text-[var(--text-muted)]">Sin fecha</span>}
                          </td>

                          {/* Estado / Semáforo */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${estado.badgeClass}`}>
                              <span className={`w-2 h-2 rounded-full ${estado.dotColor} ${estado.estado === 'VENCIDA' ? 'animate-pulse' : ''}`} />
                              <span>{estado.texto}</span>
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Cobrar */}
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAbrirPago(alumna)}
                                icon={<DollarSign className="h-3.5 w-3.5" />}
                                className="bg-[#001f1f] text-white hover:bg-[#003333] font-bold text-[11px] py-1 px-2.5"
                              >
                                Cobrar
                              </Button>

                              {/* Botón WhatsApp */}
                              {alumna.phone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAvisoWhatsAppAlumna(alumna)}
                                  icon={<MessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                                  className="text-[11px] font-bold py-1 px-2 text-[var(--text-primary)] hover:border-emerald-500"
                                  title="Enviar recordatorio de cuota por WhatsApp"
                                >
                                  Avisar
                                </Button>
                              )}
                            </div>
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
                    className="space-y-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:border-[var(--color-wood)] transition-all rounded-2xl"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
                      <div>
                        <span className="text-xs font-black uppercase text-[var(--color-wood)]">
                          {item.day_name}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {item.start_time} hs ({item.clase_nombre})
                        </h4>
                      </div>
                      <Badge variant="meadow">
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

                    <div className="pt-2 flex flex-col gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
                          Camillas / Reformers Disponibles:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.camillas_libres.map((camillaNum) => (
                            <button
                              key={camillaNum}
                              onClick={() => {
                                const claseObj = item.raw_clase || clases.find((c) => c.id === item.clase_id) || {
                                  id: item.clase_id,
                                  name: item.clase_nombre,
                                  start_time: item.start_time,
                                  day_of_week: item.day_of_week,
                                };
                                handleAbrirAsignar(claseObj, camillaNum);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--color-wood)] hover:bg-[#8a5a1e] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title={`Agendar alumna en Reformer ${camillaNum}`}
                            >
                              <BedDouble className="h-3 w-3" />
                              <span>Reformer {camillaNum}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const claseObj = item.raw_clase || clases.find((c) => c.id === item.clase_id) || {
                            id: item.clase_id,
                            name: item.clase_nombre,
                            start_time: item.start_time,
                            day_of_week: item.day_of_week,
                          };
                          handleAbrirAsignar(claseObj);
                        }}
                        icon={<UserPlus className="h-4 w-4" />}
                        className="w-full sm:w-auto self-start mt-1"
                      >
                        Asignar turno
                      </Button>
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

      {/* Modal de Aviso y Confirmación WhatsApp para Alumna */}
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
                <span>Pago ingresado correctamente</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Alumna: <strong className="text-[var(--text-primary)]">{pagoAvisoExitoso.alumna?.first_name} {pagoAvisoExitoso.alumna?.last_name}</strong>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Monto: <strong className="text-[var(--text-primary)]">${Number(pagoAvisoExitoso.pago?.amount || 0).toLocaleString('es-AR')} ARS</strong>{' '}
                {pagoAvisoExitoso.pago?.notes && pagoAvisoExitoso.pago.notes.includes('[Métodos de pago:') ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    ({pagoAvisoExitoso.pago.notes.match(/\[Métodos de pago:\s*([^\]]+)\]/)?.[1] || 'Pago combinado'})
                  </span>
                ) : (
                  <span>({pagoAvisoExitoso.pago?.payment_method})</span>
                )}
              </p>
              {pagoAvisoExitoso.pago?.due_date && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Nuevo Vencimiento: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{pagoAvisoExitoso.pago.due_date}</strong>
                </p>
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Puedes enviar un comprobante pre-armado a su WhatsApp para confirmarle la recepción de su pago:
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
                    notas: pago?.notes,
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

export default function ProfesoraVistaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)]">Cargando panel de profesora...</div>}>
      <ProfesoraVistaContent />
    </Suspense>
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

function formatFechaCorta(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.slice(0, 10);
    const [y, m, d] = cleanDate.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

type EstadoCuota = 'VENCIDA' | 'POR_VENCER' | 'AL_DIA';

interface InfoEstadoCuota {
  estado: EstadoCuota;
  diffDias: number | null;
  texto: string;
  badgeClass: string;
  dotColor: string;
}

function getEstadoCuotaAlumna(alumna: any, hoyStr: string): InfoEstadoCuota {
  const dueDate = alumna?.billing_due_date;
  const isPaid = !!alumna?.monthly_paid;

  if (!dueDate) {
    if (!isPaid) {
      return {
        estado: 'VENCIDA',
        diffDias: null,
        texto: 'Sin fecha (Impaga)',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30',
        dotColor: 'bg-rose-500',
      };
    }
    return {
      estado: 'AL_DIA',
      diffDias: null,
      texto: 'Cuota al día',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
      dotColor: 'bg-emerald-500',
    };
  }

  const cleanDue = dueDate.slice(0, 10);
  const [y, m, d] = cleanDue.split('-').map(Number);
  const [hy, hm, hd] = hoyStr.split('-').map(Number);
  const vencObj = new Date(y, m - 1, d);
  const hoyObj = new Date(hy, hm - 1, hd);
  const diffDias = Math.ceil((vencObj.getTime() - hoyObj.getTime()) / (1000 * 60 * 60 * 24));

  if (!isPaid || diffDias < 0) {
    return {
      estado: 'VENCIDA',
      diffDias,
      texto: diffDias < 0 ? `Venció hace ${Math.abs(diffDias)}d (${formatFechaCorta(dueDate)})` : `Vence hoy (${formatFechaCorta(dueDate)}) - Impaga`,
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold',
      dotColor: 'bg-rose-500',
    };
  }

  if (diffDias <= 7) {
    return {
      estado: 'POR_VENCER',
      diffDias,
      texto: diffDias === 0 ? `Vence hoy (${formatFechaCorta(dueDate)})` : `Vence en ${diffDias}d (${formatFechaCorta(dueDate)})`,
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold',
      dotColor: 'bg-amber-500',
    };
  }

  return {
    estado: 'AL_DIA',
    diffDias,
    texto: `Al día (${formatFechaCorta(dueDate)})`,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold',
    dotColor: 'bg-emerald-500',
  };
}
