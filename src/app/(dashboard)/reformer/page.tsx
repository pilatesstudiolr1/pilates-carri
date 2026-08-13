'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { getAlumnas } from '@/lib/services/alumnas';
import { getPagos } from '@/lib/services/pagos';
import { getMovimientos } from '@/lib/services/caja';
import { getClasesConAlumnas } from '@/lib/services/agenda';
import { getSedes } from '@/lib/services/sedes';
import { getBarreClases, getBarreAlumnas, BarreClase, BarreAlumna } from '@/lib/services/barre';
import { Alumna, Pago, CajaMovimiento, Clase, Sede } from '@/types/database';
import {
  Users,
  CreditCard,
  MessageCircle,
  Clock,
  Building2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CalendarDays,
  UserCheck,
  Layers,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  Filter,
} from 'lucide-react';

import { useSede } from '@/hooks/useSede';

export type ModalitySwitch = 'REFORMER' | 'BARRE' | 'GENERAL';

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

export default function ReformerBarreDashboardPage() {
  const [modality, setModality] = useState<ModalitySwitch>('GENERAL');
  const { sedes, selectedSedeId, setSelectedSedeId } = useSede();

  // Datos Reformer

  const [alumnasReformer, setAlumnasReformer] = useState<Alumna[]>([]);
  const [pagosReformer, setPagosReformer] = useState<Pago[]>([]);
  const [movimientosStudio, setMovimientosStudio] = useState<CajaMovimiento[]>([]);
  const [clasesReformerHoy, setClasesReformerHoy] = useState<Clase[]>([]);

  // Datos Barre
  const [clasesBarre, setClasesBarre] = useState<BarreClase[]>([]);
  const [alumnasBarre, setAlumnasBarre] = useState<BarreAlumna[]>([]);

  const [loading, setLoading] = useState(true);

  // Cargar datos completos para Reformer y Barre

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const hoyNum = getDayOfWeekToday();

    const [
      alumnasRes,
      pagosRes,
      movRes,
      clasesRes,
      barreClasesRes,
      barreAlumnasRes,
    ] = await Promise.all([
      getAlumnas({ limit: 500, sedeId: selectedSedeId }),
      getPagos({ status: 'ALL', sedeId: selectedSedeId }),
      getMovimientos({ sedeId: selectedSedeId }),
      getClasesConAlumnas({ dayOfWeek: hoyNum, sedeId: selectedSedeId }),
      getBarreClases(),
      getBarreAlumnas(),
    ]);

    setAlumnasReformer(alumnasRes.data || []);
    setPagosReformer(pagosRes.data || []);
    setMovimientosStudio(movRes.data || []);
    setClasesReformerHoy(clasesRes.data || []);
    setClasesBarre(barreClasesRes.data || []);
    setAlumnasBarre(barreAlumnasRes.data || []);
    setLoading(false);
  }, [selectedSedeId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const hoyISO = new Date().toISOString().split('T')[0];
  const mesActualStr = hoyISO.slice(0, 7);
  const fechaMas7DiasISO = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // ============================================
  // CÁLCULOS FILTRADOS SEGÚN LA MODALIDAD
  // ============================================

  // 1. Alumnas Activas & Total Registradas
  let totalActivas = 0;
  let totalRegistradas = 0;

  if (modality === 'REFORMER' || modality === 'GENERAL') {
    const activasRef = alumnasReformer.filter((a) => a.status === 'ACTIVE').length;
    totalActivas += activasRef;
    totalRegistradas += alumnasReformer.length;
  }

  if (modality === 'BARRE' || modality === 'GENERAL') {
    const activasBarre = alumnasBarre.filter((a) => a.status === 'ACTIVE').length;
    totalActivas += activasBarre;
    totalRegistradas += alumnasBarre.length;
  }

  // 2. Turnos de Hoy & Ocupación
  let totalAlumnasHoy = 0;
  let totalCapacidadHoy = 0;

  if (modality === 'REFORMER' || modality === 'GENERAL') {
    totalCapacidadHoy += clasesReformerHoy.reduce((acc, c) => acc + (c.max_capacity || 6), 0);
    totalAlumnasHoy += clasesReformerHoy.reduce((acc, c) => acc + (c.alumnas_count || 0), 0);
  }

  if (modality === 'BARRE' || modality === 'GENERAL') {
    const hoyNum = getDayOfWeekToday();
    const clasesBarreHoy = clasesBarre.filter((c) => (c.day_of_week || 1) === hoyNum);
    totalCapacidadHoy += clasesBarreHoy.reduce((acc, c) => acc + c.max_capacity, 0);
    totalAlumnasHoy += clasesBarreHoy.reduce((acc, c) => acc + (c.alumnas_count || 0), 0);
  }

  const porcentajeOcupacion = totalCapacidadHoy > 0 ? Math.round((totalAlumnasHoy / totalCapacidadHoy) * 100) : 0;

  // 3. Cuotas Pendientes & Próximos Vencimientos
  const vencimientosPendientes: { id: string; name: string; due_date: string; phone?: string; source: string }[] = [];
  const vencenEstaSemana: { id: string; name: string; due_date: string; phone?: string; source: string }[] = [];

  if (modality === 'REFORMER' || modality === 'GENERAL') {
    alumnasReformer
      .filter((a) => a.status === 'ACTIVE' && a.billing_due_date)
      .forEach((a) => {
        const due = a.billing_due_date!;
        const name = `${a.first_name} ${a.last_name || ''}`.trim();
        if (due < hoyISO) {
          vencimientosPendientes.push({ id: a.id, name, due_date: due, phone: a.phone, source: 'Reformer' });
        } else if (due >= hoyISO && due <= fechaMas7DiasISO) {
          vencenEstaSemana.push({ id: a.id, name, due_date: due, phone: a.phone, source: 'Reformer' });
        }
      });
  }

  if (modality === 'BARRE' || modality === 'GENERAL') {
    alumnasBarre
      .filter((a) => a.status === 'ACTIVE' && a.due_date)
      .forEach((a) => {
        const due = a.due_date;
        const name = a.alumna_name;
        if (due < hoyISO) {
          vencimientosPendientes.push({ id: a.id, name, due_date: due, source: 'Barre' });
        } else if (due >= hoyISO && due <= fechaMas7DiasISO) {
          vencenEstaSemana.push({ id: a.id, name, due_date: due, source: 'Barre' });
        }
      });
  }

  // 4. Finanzas del Mes (Ingresos, Egresos, Balance)
  let ingresosMes = 0;
  let ingresosHoy = 0;

  if (modality === 'REFORMER' || modality === 'GENERAL') {
    const pagosMesRef = pagosReformer.filter((p) => p.status === 'PAID' && p.payment_date?.startsWith(mesActualStr));
    ingresosMes += pagosMesRef.reduce((acc, p) => acc + p.amount, 0);

    const pagosHoyRef = pagosReformer.filter((p) => p.status === 'PAID' && p.payment_date === hoyISO);
    ingresosHoy += pagosHoyRef.reduce((acc, p) => acc + p.amount, 0);
  }

  if (modality === 'BARRE' || modality === 'GENERAL') {
    // Estimado/recaudado Barre
    const ingresosBarre = alumnasBarre.reduce((acc, a) => acc + (a.monthly_fee || 0), 0);
    if (modality === 'BARRE') {
      ingresosMes = ingresosBarre;
    } else {
      ingresosMes += ingresosBarre;
    }
  }

  const egresosMes = movimientosStudio
    .filter((m) => m.tipo === 'EGRESO' && m.fecha.startsWith(mesActualStr))
    .reduce((acc, m) => acc + m.monto, 0);

  const balanceMes = ingresosMes - egresosMes;

  // 5. Lista de Agenda de Hoy
  const agendaHoyList: { id: string; nombre: string; hora: string; detalle: string; source: string }[] = [];

  if (modality === 'REFORMER' || modality === 'GENERAL') {
    clasesReformerHoy.forEach((clase) => {
      if (clase.alumnas && clase.alumnas.length > 0) {
        clase.alumnas.forEach((item: any) => {
          const alum = item.alumna || item;
          agendaHoyList.push({
            id: `ref-${clase.id}-${item.id || item.alumna_id}`,
            nombre: `${alum.first_name || ''} ${alum.last_name || ''}`.trim(),
            hora: clase.start_time.slice(0, 5),
            detalle: item.camilla ? `Camilla Reformer ${item.camilla}` : 'Reformer',
            source: 'Reformer',
          });
        });
      }
    });
  }

  if (modality === 'BARRE' || modality === 'GENERAL') {
    const hoyNum = getDayOfWeekToday();
    const clasesBarreHoy = clasesBarre.filter((c) => (c.day_of_week || 1) === hoyNum);
    clasesBarreHoy.forEach((clase) => {
      agendaHoyList.push({
        id: `barre-${clase.id}`,
        nombre: clase.name,
        hora: clase.start_time.slice(0, 5),
        detalle: `${clase.alumnas_count || 0}/${clase.max_capacity} inscriptas (Barre)`,
        source: 'Barre',
      });
    });
  }

  agendaHoyList.sort((a, b) => a.hora.localeCompare(b.hora));

  const handleWhatsApp = (phone: string | undefined, nombre: string, dueStr: string | null) => {
    if (!phone) return;
    const phoneClean = phone.replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Hola ${nombre}! Te recordamos que tu cuota de Pilates/Barre (vencimiento ${formatFecha(dueStr)}) se encuentra pendiente. Te pedimos regularizarla para mantener tu turno. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-[var(--text-primary)] max-w-7xl mx-auto">
      {/* Header Corporativo con Switch de Modalidad */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] p-4 sm:p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Centro de control
          </h1>
        </div>

        {/* Switch de 3 Modos: Reformer | Barre | General */}
        <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto flex-wrap w-full md:w-auto">
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)] w-full sm:w-auto overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setModality('REFORMER')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                modality === 'REFORMER'
                  ? 'bg-[var(--color-wood)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="h-4 w-4" /> Reformer
            </button>

            <button
              onClick={() => setModality('BARRE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                modality === 'BARRE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Image
                src="/media/berre.webp"
                alt="Barre"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
              Barre
            </button>

            <button
              onClick={() => setModality('GENERAL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                modality === 'GENERAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Filter className="h-4 w-4" /> General
            </button>
          </div>

          {sedes.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] px-3 py-2 rounded-xl">
              <Building2 className="h-4 w-4 text-[var(--color-wood)]" />
              <select
                value={selectedSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todas las Sedes</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Cargando datos del módulo seleccionado...</p>
        </div>
      ) : (
        <>
          {/* Main Friendly KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Alumnas Activas */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Alumnas Activas ({modality})
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-wood)]/10 text-[var(--color-wood)] flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {totalActivas}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {totalRegistradas} registradas
                </p>
              </div>
            </div>

            {/* Card 2: Turnos de Hoy */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Turnos del {getNombreDiaHoy()}
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  {totalAlumnasHoy}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium flex items-center gap-1">
                  <span className="text-blue-500 font-bold">{porcentajeOcupacion}%</span> de ocupación
                </p>
              </div>
            </div>

            {/* Card 3: Vencimientos Pendientes */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Pendientes de Cobro
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                  {vencimientosPendientes.length}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  {vencenEstaSemana.length} vencen esta semana
                </p>
              </div>
            </div>

            {/* Card 4: Ingresos del Mes */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Ingresos del Mes ({modality})
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  ${ingresosMes.toLocaleString()}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                  {modality} en curso
                </p>
              </div>
            </div>
          </div>

          {/* Finanzas Fila Secundaria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Egresos Operativos</span>
                <div className="text-xl font-extrabold text-rose-500 mt-1">${egresosMes.toLocaleString()}</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Balance Operativo</span>
                <div className="text-xl font-extrabold text-emerald-500 mt-1">${balanceMes.toLocaleString()}</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Ingresos de Hoy</span>
                <div className="text-xl font-extrabold text-purple-500 mt-1">${ingresosHoy.toLocaleString()}</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Grid de Secciones de Información */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Agenda del Día */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-wood)]/10 text-[var(--color-wood)] flex items-center justify-center">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Agenda ({getNombreDiaHoy()}) - {modality}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Turnos agendados en el día</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)]">
                  {agendaHoyList.length} Turnos
                </span>
              </div>

              {agendaHoyList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] font-medium">
                  No hay turnos agendados para la modalidad seleccionada.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-default)]/60 max-h-80 overflow-y-auto pr-1">
                  {agendaHoyList.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-wood)]/15 text-[var(--color-wood)] font-bold text-xs flex items-center justify-center uppercase">
                          {item.nombre.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">{item.nombre}</p>
                          <p className="text-[11px] text-[var(--text-muted)] font-medium">
                            {item.detalle} &bull; <span className="text-[var(--color-wood)] font-bold">{item.source}</span>
                          </p>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-[var(--color-wood)] px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                        {item.hora} hs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Columna Derecha: Cuotas Vencidas */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Vencimientos Pendientes ({modality})
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Cuotas vencidas que requieren cobro</p>
                  </div>
                </div>
                {vencimientosPendientes.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-500/15 text-red-500">
                    {vencimientosPendientes.length}
                  </span>
                )}
              </div>

              {vencimientosPendientes.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] font-medium flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  No hay cuotas vencidas pendientes en esta modalidad.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-default)]/60 max-h-80 overflow-y-auto pr-1">
                  {vencimientosPendientes.slice(0, 10).map((v) => (
                    <div key={`${v.source}-${v.id}`} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-[var(--text-primary)] capitalize flex items-center gap-2">
                          {v.name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-muted)] font-mono">
                            {v.source}
                          </span>
                        </p>
                        <p className="text-[11px] text-red-500 font-semibold">
                          Venció el {formatFecha(v.due_date)}
                        </p>
                      </div>

                      {v.phone && (
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(v.phone, v.name, v.due_date)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
