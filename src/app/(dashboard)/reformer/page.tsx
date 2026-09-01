'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

import { getAlumnas, createAlumna } from '@/lib/services/alumnas';
import { getPagos, registrarPago } from '@/lib/services/pagos';
import { getMovimientos, registrarMovimiento } from '@/lib/services/caja';
import { getClasesConAlumnas, addAlumnaToClase, createClase } from '@/lib/services/agenda';
import { getProfiles } from '@/lib/services/profesoras';
import { Alumna, Pago, CajaMovimiento, Clase, MetodoPago, AlumnaInsert, Profile } from '@/types/database';

import { AlumnaFormModal } from '@/components/alumnas/AlumnaFormModal';
import { TurnoModal } from '@/components/agenda/TurnoModal';
import { PagoFormModal } from '@/components/pagos/PagoFormModal';
import { useSede } from '@/hooks/useSede';

import {
  Users,
  CreditCard,
  MessageCircle,
  Clock,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

function getDayOfWeekToday(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function getNombreDiaHoy(): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date().getDay()];
}

function formatFecha(fechaStr: string | null): string {
  if (!fechaStr) return '';
  const [yyyy, mm, dd] = fechaStr.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export default function SimplifiedLatticeDashboard() {
  const { selectedSedeId } = useSede();

  // Estados de Datos
  const [alumnasReformer, setAlumnasReformer] = useState<Alumna[]>([]);
  const [pagosReformer, setPagosReformer] = useState<Pago[]>([]);
  const [movimientosStudio, setMovimientosStudio] = useState<CajaMovimiento[]>([]);
  const [clasesReformerHoy, setClasesReformerHoy] = useState<Clase[]>([]);
  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales de Acción Rápida (Action Hub)
  const [isAlumnaModalOpen, setIsAlumnaModalOpen] = useState(false);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedAlumnaParaCobro, setSelectedAlumnaParaCobro] = useState<Alumna | null>(null);
  const [isCajaModalOpen, setIsCajaModalOpen] = useState(false);

  // Estado del Modal de Caja Rápido
  const [cajaTipo, setCajaTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [cajaConcepto, setCajaConcepto] = useState('');
  const [cajaMonto, setCajaMonto] = useState('');
  const [cajaMetodo, setCajaMetodo] = useState<MetodoPago>('efectivo');
  const [cajaSaving, setCajaSaving] = useState(false);

  // Tab activo de trabajo
  const [activeTab, setActiveTab] = useState<'turnos' | 'vencimientos' | 'caja'>('turnos');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const hoyNum = getDayOfWeekToday();

    const [alumnasRes, pagosRes, movRes, clasesRes, profsRes] = await Promise.all([
      getAlumnas({ limit: 500, sedeId: selectedSedeId }),
      getPagos({ status: 'ALL', sedeId: selectedSedeId }),
      getMovimientos({ sedeId: selectedSedeId }),
      getClasesConAlumnas({ dayOfWeek: hoyNum, sedeId: selectedSedeId }),
      getProfiles({ role: 'PROFESORA', isActive: true }),
    ]);

    setAlumnasReformer(alumnasRes.data || []);
    setPagosReformer(pagosRes.data || []);
    setMovimientosStudio(movRes.data || []);
    setClasesReformerHoy(clasesRes.data || []);
    setProfesoras((profsRes.data || []).filter((p) => p.role === 'PROFESORA'));
    setLoading(false);
  }, [selectedSedeId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const hoyISO = new Date().toISOString().split('T')[0];
  const mesActualStr = hoyISO.slice(0, 7);
  const fechaMas7DiasISO = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // Cálculos consolidados
  const totalActivas = alumnasReformer.filter((a) => a.status === 'ACTIVE').length;

  const totalCapacidadHoy = clasesReformerHoy.reduce((acc, c) => acc + (c.max_capacity || 6), 0);
  const totalAlumnasHoy = clasesReformerHoy.reduce((acc, c) => acc + (c.alumnas_count || 0), 0);
  const porcentajeOcupacion = totalCapacidadHoy > 0 ? Math.round((totalAlumnasHoy / totalCapacidadHoy) * 100) : 0;

  // Vencimientos
  const vencimientosPendientes: { id: string; name: string; due_date: string; phone?: string; alumnaObj?: Alumna }[] = [];
  const vencenEstaSemana: { id: string; name: string; due_date: string; phone?: string }[] = [];

  alumnasReformer
    .filter((a) => a.status === 'ACTIVE' && a.billing_due_date)
    .forEach((a) => {
      const due = a.billing_due_date!;
      const name = `${a.first_name} ${a.last_name || ''}`.trim();
      if (due < hoyISO) {
        vencimientosPendientes.push({ id: a.id, name, due_date: due, phone: a.phone, alumnaObj: a });
      } else if (due >= hoyISO && due <= fechaMas7DiasISO) {
        vencenEstaSemana.push({ id: a.id, name, due_date: due, phone: a.phone });
      }
    });

  // Finanzas
  const pagosMes = pagosReformer.filter((p) => p.payment_date?.startsWith(mesActualStr));
  const ingresosMes = pagosMes.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pagosHoy = pagosReformer.filter((p) => p.payment_date === hoyISO);
  const ingresosHoy = pagosHoy.reduce((acc, p) => acc + (p.amount || 0), 0);
  const egresosMes = movimientosStudio
    .filter((m) => m.tipo === 'EGRESO' && m.fecha.startsWith(mesActualStr))
    .reduce((acc, m) => acc + m.monto, 0);
  const balanceMes = ingresosMes - egresosMes;

  // Turnos de hoy
  const agendaHoyList: { id: string; nombre: string; hora: string; detalle: string; phone?: string }[] = [];
  clasesReformerHoy.forEach((clase) => {
    if (clase.alumnas && clase.alumnas.length > 0) {
      clase.alumnas.forEach((item: any) => {
        const alum = item.alumna || item;
        agendaHoyList.push({
          id: `ref-${clase.id}-${item.id || item.alumna_id}`,
          nombre: `${alum.first_name || ''} ${alum.last_name || ''}`.trim(),
          hora: clase.start_time.slice(0, 5),
          detalle: item.camilla ? `Reformer ${item.camilla}` : 'Reformer',
          phone: alum.phone,
        });
      });
    }
  });
  agendaHoyList.sort((a, b) => a.hora.localeCompare(b.hora));

  const handleWhatsApp = (phone: string | undefined, nombre: string, dueStr: string | null) => {
    if (!phone) return;
    const phoneClean = phone.replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Hola ${nombre}! Te recordamos de Pilates Studio que tu cuota (vencimiento ${formatFecha(dueStr)}) se encuentra pendiente. Te pedimos regularizarla para conservar tu reformer asignado. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
  };

  const handleCreateAlumnaSubmit = async (data: AlumnaInsert) => {
    const res = await createAlumna(data);
    if (!res.error) {
      setIsAlumnaModalOpen(false);
      loadDashboardData();
      return true;
    }
    return false;
  };

  const handleSaveTurno = async (data: {
    claseId?: string;
    alumnaId: string;
    camilla: number;
    dayOfWeek: number;
    startTime: string;
    observaciones?: string;
    asistenciaStatus?: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED' | 'UNMARKED';
    profesoraId?: string | null;
  }) => {
    let targetClaseId = data.claseId;
    if (!targetClaseId) {
      const existing = clasesReformerHoy.find((c) => c.start_time.startsWith(data.startTime.slice(0, 5)));
      if (existing) {
        targetClaseId = existing.id;
      } else {
        const newClaseRes = await createClase({
          name: `Clase ${data.startTime.slice(0, 5)} hs`,
          day_of_week: data.dayOfWeek,
          start_time: `${data.startTime}:00`.slice(0, 8),
          end_time: `${(parseInt(data.startTime.slice(0, 2)) + 1).toString().padStart(2, '0')}:00:00`,
          max_capacity: 6,
          profesora_id: data.profesoraId || null,
          sede_id: selectedSedeId !== 'ALL' ? selectedSedeId : null,
        });
        if (newClaseRes.data) {
          targetClaseId = newClaseRes.data.id;
        }
      }
    }

    if (targetClaseId && data.profesoraId) {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      await supabase.from('clases').update({ profesora_id: data.profesoraId }).eq('id', targetClaseId);
    }

    if (targetClaseId && data.alumnaId) {
      const res = await addAlumnaToClase(targetClaseId, data.alumnaId, data.camilla);
      if (!res.error) {
        setIsTurnoModalOpen(false);
        loadDashboardData();
        return true;
      }
    }
    return false;
  };

  const handleSavePago = async (pagoData: any) => {
    const res = await registrarPago(pagoData);
    if (!res.error) {
      setIsPagoModalOpen(false);
      setSelectedAlumnaParaCobro(null);
      loadDashboardData();
      return true;
    }
    return false;
  };

  const handleSaveMovimientoCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaConcepto || !cajaMonto) return;
    setCajaSaving(true);
    const res = await registrarMovimiento({
      tipo: cajaTipo,
      concepto: cajaConcepto,
      monto: parseFloat(cajaMonto),
      metodo_pago: cajaMetodo,
      sede_id: selectedSedeId !== 'ALL' ? selectedSedeId : null,
    });
    setCajaSaving(false);
    if (!res.error) {
      setIsCajaModalOpen(false);
      setCajaConcepto('');
      setCajaMonto('');
      loadDashboardData();
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16 text-[var(--text-primary)] max-w-[var(--page-max-width)] mx-auto animate-fade-in">
      {/* 1. SECCIÓN HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-meadow text-[11px] font-medium px-3 py-0.5 uppercase">
              Pilates Studio
            </span>
            <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              {getNombreDiaHoy()}, {formatFecha(hoyISO)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Centro de Control
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Resumen diario de ocupación, estado de cobros y agenda de reformers.
          </p>
        </div>
      </div>

      {/* 2. ACTION HUB: Botones de Acción Rápida en 1 Clic */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)] flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-primary)]">
              Acciones Rápidas
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Operar turnos, altas y movimientos de caja en un clic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setIsAlumnaModalOpen(true)}
          >
            Nueva Alumna
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<Calendar className="h-3.5 w-3.5" />}
            onClick={() => setIsTurnoModalOpen(true)}
          >
            Agendar Turno
          </Button>

          <Link href="/agenda?view=disponibilidad">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-600/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold"
              icon={<Clock className="h-3.5 w-3.5 text-emerald-600" />}
            >
              Ver Turnos Disponibles
            </Button>
          </Link>

          <Button
            size="sm"
            variant="secondary"
            icon={<CreditCard className="h-3.5 w-3.5" />}
            onClick={() => {
              setSelectedAlumnaParaCobro(null);
              setIsPagoModalOpen(true);
            }}
          >
            Registrar Cobro
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<Wallet className="h-3.5 w-3.5" />}
            onClick={() => setIsCajaModalOpen(true)}
          >
            Movimiento Caja
          </Button>

          <Link href="/whatsapp">
            <Button size="sm" variant="ghost" icon={<MessageCircle className="h-3.5 w-3.5 text-emerald-500" />}>
              WhatsApp
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[var(--bg-secondary)] rounded-[14px] border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-secondary)]">Cargando datos del estudio...</p>
        </div>
      ) : (
        <>
          {/* 3. TRES BLOQUES PRINCIPALES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* BLOQUE 1: MINT SURFACE — Turnos & Ocupación de Hoy */}
            <Card surface="mint" padding="md" className="flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-deep-teal)]">
                    Agenda &amp; Ocupación
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-deep-teal)]/15 text-[var(--color-deep-teal)] flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <div className="text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
                    {totalAlumnasHoy}{' '}
                    <span className="text-sm font-normal text-[var(--text-secondary)]">
                      / {totalCapacidadHoy} lugares
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {porcentajeOcupacion}% de ocupación hoy en {getNombreDiaHoy()}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[var(--bg-secondary)]/80 h-2 rounded-full overflow-hidden border border-[var(--border-default)]">
                  <div
                    className="bg-[var(--color-deep-teal)] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(porcentajeOcupacion, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-[var(--surface-mint-border)]">
                <Link
                  href="/agenda"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:underline"
                >
                  Ver grilla completa de agenda <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            {/* BLOQUE 2: LIME SURFACE — Alumnas & Estado de Cuotas */}
            <Card surface="lime" padding="md" className="flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-olive)]">
                    Alumnas &amp; Cobros
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-olive)]/15 text-[var(--color-olive)] flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <div className="text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
                    {totalActivas}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Alumnas activas registradas en el estudio
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {vencimientosPendientes.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[22px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-medium">
                      <AlertTriangle className="h-3 w-3" /> {vencimientosPendientes.length} cuotas vencidas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[22px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Al día
                    </span>
                  )}
                  {vencenEstaSemana.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[22px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-medium">
                      {vencenEstaSemana.length} vencen esta semana
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-[var(--surface-lime-border)]">
                <Link
                  href="/alumnas"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:underline"
                >
                  Administrar listado de alumnas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            {/* BLOQUE 3: LAVENDER SURFACE — Finanzas & Balance */}
            <Card surface="lavender" padding="md" className="flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-iris)]">
                    Finanzas &amp; Caja
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-iris)]/15 text-[var(--color-iris)] flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <div className="text-3xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
                    ${ingresosMes.toLocaleString()}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Ingresos recaudados en el mes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-[var(--bg-secondary)]/80 p-2 rounded-[12px] border border-[var(--border-default)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Hoy</span>
                    <span className="font-medium text-[var(--text-primary)]">${ingresosHoy.toLocaleString()}</span>
                  </div>
                  <div className="bg-[var(--bg-secondary)]/80 p-2 rounded-[12px] border border-[var(--border-default)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Balance Mes</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">${balanceMes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-[var(--surface-lavender-border)]">
                <Link
                  href="/caja"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:underline"
                >
                  Ver caja chica y movimientos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          </div>

          {/* 4. WORKSPACE TABS: Agenda del Día | Cuotas Pendientes | Movimientos de Caja */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('turnos')}
                  className={`px-4 py-2 rounded-[29px] text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'turnos'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  Agenda de Hoy ({agendaHoyList.length})
                </button>
                <button
                  onClick={() => setActiveTab('vencimientos')}
                  className={`px-4 py-2 rounded-[29px] text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'vencimientos'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  Cuotas Vencidas ({vencimientosPendientes.length})
                </button>
                <button
                  onClick={() => setActiveTab('caja')}
                  className={`px-4 py-2 rounded-[29px] text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'caja'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  Caja Diaria ({movimientosStudio.length})
                </button>
              </div>

              {activeTab === 'turnos' && (
                <Link href="/agenda" className="text-xs font-medium text-[var(--text-primary)] hover:underline flex items-center gap-1">
                  Abrir grilla interactiva <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeTab === 'vencimientos' && (
                <Link href="/pagos" className="text-xs font-medium text-[var(--text-primary)] hover:underline flex items-center gap-1">
                  Ver historial de pagos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* TAB CONTENT 1: Agenda de Hoy (Solo Listado Agrupado por Hora) */}
            {activeTab === 'turnos' && (() => {
              // Ordenar clases cronológicamente por hora
              const sortedClases = [...clasesReformerHoy].sort((a, b) =>
                a.start_time.localeCompare(b.start_time)
              );

              return (
                <div>
                  {sortedClases.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                      No hay turnos agendados para el día de hoy.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[14px] overflow-hidden">
                      {sortedClases.map((clase) => {
                        const horaInicio = clase.start_time.slice(0, 5);
                        const alumnasEnClase = (clase.alumnas || [])
                          .map((item: any) => {
                            const alumObj = item.alumna || item;
                            return {
                              id: item.id || item.alumna_id,
                              camilla: item.camilla,
                              nombre: `${alumObj.first_name || alumObj.name || ''} ${alumObj.last_name || ''}`.trim(),
                              phone: alumObj.phone,
                            };
                          })
                          .filter((a: any) => a.nombre.length > 0);

                        return (
                          <div
                            key={clase.id}
                            className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-[var(--bg-tertiary)]/30 transition-colors"
                          >
                            {/* Cabecera de la Hora */}
                            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="px-3 py-1 rounded-[22px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-mono font-bold text-xs shadow-2xs">
                                  {horaInicio} hs
                                </span>
                                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                                  {clase.name || `Turno ${horaInicio} hs`}
                                </h3>
                              </div>

                              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                {alumnasEnClase.length} {alumnasEnClase.length === 1 ? 'alumna agendada' : 'alumnas agendadas'}
                              </span>
                            </div>

                            {/* Listado Vertical de Nombres */}
                            {alumnasEnClase.length === 0 ? (
                              <p className="text-xs italic text-[var(--text-muted)] py-1">
                                Sin alumnas asignadas a este turno.
                              </p>
                            ) : (
                              <div className="flex flex-col divide-y divide-[var(--border-default)]">
                                {alumnasEnClase.map((alum: any, index: number) => (
                                  <div
                                    key={alum.id}
                                    className="py-2.5 px-2 flex items-center justify-between hover:bg-[var(--bg-secondary)] rounded-[8px] transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-5 text-right">
                                        {index + 1}.
                                      </span>
                                      <span className="text-xs font-bold text-[var(--text-primary)] capitalize">
                                        {alum.nombre}
                                      </span>
                                      {alum.camilla && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-[22px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold border border-[var(--border-default)]">
                                          Camilla #{alum.camilla}
                                        </span>
                                      )}
                                    </div>

                                    {alum.phone && (
                                      <button
                                        onClick={() => {
                                          const clean = alum.phone.replace(/\D/g, '');
                                          window.open(`https://wa.me/${clean}`, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[22px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 text-[11px] font-semibold transition-colors cursor-pointer"
                                        title="Enviar WhatsApp"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>WhatsApp</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB CONTENT 2: Cuotas Vencidas */}
            {activeTab === 'vencimientos' && (
              <div>
                {vencimientosPendientes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    <span>¡Excelente! No hay alumnas con cuotas vencidas pendientes.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-default)]">
                    {vencimientosPendientes.map((v) => (
                      <div
                        key={v.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                              {v.name}
                            </h4>
                            <span className="px-2 py-0.2 rounded-[22px] bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-medium border border-rose-500/30">
                              Venció {formatFecha(v.due_date)}
                            </span>
                          </div>
                          {v.phone && (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                              Tel: {v.phone}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<CreditCard className="h-3.5 w-3.5" />}
                            onClick={() => {
                              if (v.alumnaObj) setSelectedAlumnaParaCobro(v.alumnaObj);
                              setIsPagoModalOpen(true);
                            }}
                          >
                            Cobrar
                          </Button>

                          {v.phone && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<MessageCircle className="h-3.5 w-3.5 text-emerald-500" />}
                              onClick={() => handleWhatsApp(v.phone, v.name, v.due_date)}
                            >
                              WhatsApp
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: Caja Diaria */}
            {activeTab === 'caja' && (
              <div>
                {movimientosStudio.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                    No hay movimientos de caja registrados hoy.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Concepto</th>
                          <th className="py-2.5 px-3">Método</th>
                          <th className="py-2.5 px-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)]">
                        {movimientosStudio.slice(0, 10).map((m) => (
                          <tr key={m.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px]">{formatFecha(m.fecha)}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-[22px] text-[10px] font-extrabold uppercase text-white shadow-xs ${
                                  m.tipo === 'INGRESO'
                                    ? 'bg-emerald-600'
                                    : 'bg-rose-600'
                                }`}
                              >
                                {m.tipo}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{m.concepto}</td>
                            <td className="py-2.5 px-3 capitalize text-[var(--text-secondary)]">{m.metodo_pago}</td>
                            <td
                              className={`py-2.5 px-3 text-right font-medium ${
                                m.tipo === 'INGRESO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {m.tipo === 'INGRESO' ? '+' : '-'}${m.monto.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: NUEVA ALUMNA */}
      <AlumnaFormModal
        isOpen={isAlumnaModalOpen}
        onClose={() => setIsAlumnaModalOpen(false)}
        onSubmit={handleCreateAlumnaSubmit}
      />

      {/* MODAL 2: AGENDAR TURNO */}
      <TurnoModal
        open={isTurnoModalOpen}
        onClose={() => setIsTurnoModalOpen(false)}
        clase={clasesReformerHoy[0] || null}
        dayName={getNombreDiaHoy()}
        presetTime="08:00"
        presetCamilla={1}
        profesoras={profesoras}
        profesoraFilter="ALL"
        onSave={handleSaveTurno}
      />

      {/* MODAL 3: REGISTRAR COBRO */}
      <PagoFormModal
        open={isPagoModalOpen}
        onClose={() => {
          setIsPagoModalOpen(false);
          setSelectedAlumnaParaCobro(null);
        }}
        onSubmit={handleSavePago}
        initialAlumna={selectedAlumnaParaCobro}
      />

      {/* MODAL 4: REGISTRAR MOVIMIENTO DE CAJA */}
      <Modal
        open={isCajaModalOpen}
        onClose={() => setIsCajaModalOpen(false)}
        title="Registrar Movimiento de Caja"
        description="Ingresá un cobro o gasto operativo para el arqueo de caja diario."
      >
        <form onSubmit={handleSaveMovimientoCaja} className="space-y-4 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCajaTipo('INGRESO')}
              className={`flex-1 py-2 rounded-[29px] text-xs font-medium transition-all cursor-pointer ${
                cajaTipo === 'INGRESO'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]'
              }`}
            >
              + Ingreso
            </button>
            <button
              type="button"
              onClick={() => setCajaTipo('EGRESO')}
              className={`flex-1 py-2 rounded-[29px] text-xs font-medium transition-all cursor-pointer ${
                cajaTipo === 'EGRESO'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]'
              }`}
            >
              - Egreso
            </button>
          </div>

          <Input
            label="Concepto"
            placeholder="Ej: Pago de cuota, Insumos de limpieza, Pago profe..."
            value={cajaConcepto}
            onChange={(e) => setCajaConcepto(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monto ($)"
              type="number"
              placeholder="Ej: 45000"
              value={cajaMonto}
              onChange={(e) => setCajaMonto(e.target.value)}
              required
            />

            <div>
              <label className="text-xs font-medium text-[var(--text-primary)] block mb-1.5">
                Método de Pago
              </label>
              <select
                value={cajaMetodo}
                onChange={(e) => setCajaMetodo(e.target.value as MetodoPago)}
                className="w-full h-10 px-3 rounded-[12px] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs sm:text-sm border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-focus)]"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-default)]">
            <Button type="button" variant="ghost" onClick={() => setIsCajaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={cajaSaving}>
              Guardar Movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
