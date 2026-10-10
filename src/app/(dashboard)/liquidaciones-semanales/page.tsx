'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Profile } from '@/types/database';
import { getProfiles } from '@/lib/services/profesoras';
import {
  calcularLiquidacionSemanal,
  calcularLiquidacionGlobal,
  getDisponibilidadCamillas,
  marcarLiquidacionPagada,
  getHistorialLiquidaciones,
  LiquidacionSemanal,
  LiquidacionGlobalResumen,
  DisponibilidadCamillaItem,
} from '@/lib/services/liquidaciones';
import {
  Receipt,
  History,
  RefreshCw,
  Printer,
  Check,
  Filter,
  Layers,
  Sparkles,
  Flower2,
  Building2,
  DollarSign,
  TrendingUp,
  BedDouble,
  Users,
  Clock,
  MapPin,
  UserCheck,
  Percent,
  Info,
} from 'lucide-react';

export type ModalityFilter = 'ALL' | 'REFORMER' | 'ESTETICA';

export default function LiquidacionesSemanalesPage() {
  const { confirm, alert: alertDialog } = useConfirm();

  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [selectedProfesoraId, setSelectedProfesoraId] = useState<string>('ALL');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('ALL');

  // Custom rates overrides (percentage 0-100)
  const [customRatesByProf, setCustomRatesByProf] = useState<Record<string, number>>({});
  const [ratesInput, setRatesInput] = useState<Record<string, string>>({});

  // Rango de semana actual (Lunes a Domingo)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const [liquidacionCalculada, setLiquidacionCalculada] = useState<LiquidacionSemanal | null>(null);
  const [liquidacionGlobal, setLiquidacionGlobal] = useState<LiquidacionGlobalResumen | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadCamillaItem[]>([]);
  const [historial, setHistorial] = useState<LiquidacionSemanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'NUEVA' | 'DISPONIBILIDAD' | 'HISTORIAL'>('NUEVA');
  const [filtroDispDia, setFiltroDispDia] = useState<number | 'ALL'>('ALL');

  const loadProfesoras = useCallback(async () => {
    setLoading(true);
    const [profsRes, histRes, dispRes] = await Promise.all([
      getProfiles({ role: 'PROFESORA', isActive: true }),
      getHistorialLiquidaciones(),
      getDisponibilidadCamillas(),
    ]);

    if (profsRes.data && profsRes.data.length > 0) {
      setProfesoras(profsRes.data.filter((p) => p.role === 'PROFESORA'));
    }
    setHistorial(histRes.data || []);
    setDisponibilidad(dispRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfesoras();
  }, [loadProfesoras]);

  const handleCalcular = useCallback(async () => {
    setLoading(true);

    if (selectedProfesoraId === 'ALL') {
      const ratesDecimal: Record<string, number> = {};
      Object.entries(customRatesByProf).forEach(([id, rate]) => {
        ratesDecimal[id] = rate / 100;
      });
      const { data } = await calcularLiquidacionGlobal(startDate, endDate, ratesDecimal);
      setLiquidacionGlobal(data);
      setLiquidacionCalculada(null);
    } else {
      const overrideRate = customRatesByProf[selectedProfesoraId] !== undefined
        ? customRatesByProf[selectedProfesoraId] / 100
        : undefined;

      const { data } = await calcularLiquidacionSemanal(selectedProfesoraId, startDate, endDate, overrideRate);
      if (data) {
        if (modalityFilter !== 'ALL') {
          const filteredDetalles = data.detalles.filter((d) => {
            const planLower = (d.plan_name || '').toLowerCase();
            if (modalityFilter === 'REFORMER') return planLower.includes('reformer') || !planLower.includes('estética');
            if (modalityFilter === 'ESTETICA') return planLower.includes('estética') || planLower.includes('estetica');
            return true;
          });

          const totalCuotas = filteredDetalles.filter((d) => !d.is_inscripcion).reduce((acc, d) => acc + d.amount_paid, 0);
          const totalInscripciones = filteredDetalles.filter((d) => d.is_inscripcion).reduce((acc, d) => acc + d.amount_paid, 0);
          const totalCollected = totalCuotas + totalInscripciones;
          const teacherAmount = filteredDetalles.reduce((acc, d) => acc + d.teacher_commission, 0);
          const studioAmount = totalCollected - teacherAmount;

          setLiquidacionCalculada({
            ...data,
            detalles: filteredDetalles,
            total_collected: totalCollected,
            total_cuotas: totalCuotas,
            total_inscripciones: totalInscripciones,
            teacher_amount: teacherAmount,
            studio_amount: studioAmount,
          });
        } else {
          setLiquidacionCalculada(data);
        }
      } else {
        setLiquidacionCalculada(null);
      }
      setLiquidacionGlobal(null);
    }

    setLoading(false);
  }, [selectedProfesoraId, startDate, endDate, modalityFilter, customRatesByProf]);

  useEffect(() => {
    handleCalcular();
  }, [selectedProfesoraId, startDate, endDate, modalityFilter, handleCalcular]);

  // Recálculo en vivo sin parpadeos ni pérdida de foco
  const handleRateChange = (profId: string, newRatePct: number) => {
    const validPct = Math.max(0, Math.min(100, isNaN(newRatePct) ? 0 : newRatePct));
    setCustomRatesByProf((prev) => ({ ...prev, [profId]: validPct }));
    const rateDecimal = validPct / 100;

    // Actualización inmediata para vista individual
    if (selectedProfesoraId === profId && liquidacionCalculada) {
      const updatedDetalles = liquidacionCalculada.detalles.map((d) => {
        const comm = d.is_inscripcion ? 0 : d.amount_paid * rateDecimal;
        return { ...d, teacher_commission: comm };
      });
      const teacherAmount = updatedDetalles.reduce((acc, d) => acc + d.teacher_commission, 0);
      const studioAmount = liquidacionCalculada.total_collected - teacherAmount;

      setLiquidacionCalculada({
        ...liquidacionCalculada,
        commission_rate: rateDecimal,
        detalles: updatedDetalles,
        teacher_amount: teacherAmount,
        studio_amount: studioAmount,
      });
    }

    // Actualización inmediata para vista global
    if (liquidacionGlobal) {
      let updatedTotalProfesoras = 0;
      const updatedLiquidaciones = liquidacionGlobal.liquidaciones_profesoras.map((liq) => {
        if (liq.profesora_id === profId) {
          const updatedDetalles = liq.detalles.map((d) => {
            const comm = d.is_inscripcion ? 0 : d.amount_paid * rateDecimal;
            return { ...d, teacher_commission: comm };
          });
          const teacherAmount = updatedDetalles.reduce((acc, d) => acc + d.teacher_commission, 0);
          const studioAmount = liq.total_collected - teacherAmount;
          updatedTotalProfesoras += teacherAmount;
          return {
            ...liq,
            commission_rate: rateDecimal,
            detalles: updatedDetalles,
            teacher_amount: teacherAmount,
            studio_amount: studioAmount,
          };
        } else {
          updatedTotalProfesoras += liq.teacher_amount;
          return liq;
        }
      });

      const updatedTodosDetalles = liquidacionGlobal.todos_los_detalles.map((d) => {
        const matchingLiq = updatedLiquidaciones.find((l) =>
          l.detalles.some((subD) => subD.id === d.id)
        );
        if (matchingLiq && matchingLiq.profesora_id === profId) {
          const comm = d.is_inscripcion ? 0 : d.amount_paid * rateDecimal;
          return { ...d, teacher_commission: comm };
        }
        return d;
      });

      setLiquidacionGlobal({
        ...liquidacionGlobal,
        liquidaciones_profesoras: updatedLiquidaciones,
        todos_los_detalles: updatedTodosDetalles,
        total_profesoras: updatedTotalProfesoras,
        total_estudio: liquidacionGlobal.total_recaudado - updatedTotalProfesoras,
      });
    }
  };

  const handleRateInputChange = (profId: string, valueString: string) => {
    setRatesInput((prev) => ({ ...prev, [profId]: valueString }));
    const numVal = parseFloat(valueString);
    if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
      handleRateChange(profId, numVal);
    }
  };

  const handleRateInputBlur = (profId: string, fallbackRateDecimal: number) => {
    const rawVal = ratesInput[profId];
    if (rawVal === undefined || rawVal === '' || isNaN(parseFloat(rawVal))) {
      const defaultPct = Math.round(fallbackRateDecimal * 100);
      setRatesInput((prev) => ({ ...prev, [profId]: String(defaultPct) }));
      handleRateChange(profId, defaultPct);
    }
  };

  const handleMarcarPagada = async (liq?: LiquidacionSemanal) => {
    const target = liq || liquidacionCalculada;
    if (!target) return;

    const isOk = await confirm({
      title: 'Marcar Liquidación como Pagada',
      message: `¿Desea registrar como pagada la liquidación de ${target.profesora_nombre} por $${target.teacher_amount.toLocaleString('es-AR')} ARS?`,
      confirmText: 'Sí, marcar pagada',
      variant: 'success',
    });
    if (!isOk) return;

    setSubmitting(true);
    await marcarLiquidacionPagada(target);
    setSubmitting(false);

    await alertDialog({
      title: 'Liquidación Registrada',
      message: 'La liquidación ha sido marcada como pagada e incorporada al historial permanente.',
      variant: 'success',
    });

    handleCalcular();
    const histRes = await getHistorialLiquidaciones();
    setHistorial(histRes.data || []);
  };

  const handlePrint = () => {
    window.print();
  };

  // Cálculo de resumen de cupos
  const totalCapacidadEstudio = disponibilidad.reduce((acc, d) => acc + d.max_capacity, 0);
  const totalOcupadasEstudio = disponibilidad.reduce((acc, d) => acc + d.ocupadas_count, 0);
  const totalLibresEstudio = disponibilidad.reduce((acc, d) => acc + d.libres_count, 0);
  const porcentajeOcupacion = totalCapacidadEstudio > 0 ? Math.round((totalOcupadasEstudio / totalCapacidadEstudio) * 100) : 0;

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
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-[var(--text-primary)] max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-blue-500" /> Liquidación Semanal y Ganancia Total del Estudio
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Consolidado general del estudio, desglose por profesora, control de comisiones y disponibilidad de reformers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadProfesoras}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)]">
          <button
            onClick={() => setActiveTab('NUEVA')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'NUEVA'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Receipt className="h-4 w-4 text-blue-500" /> Liquidación {selectedProfesoraId === 'ALL' ? 'General de Todo el Estudio' : 'Individual'}
          </button>

          <button
            onClick={() => setActiveTab('DISPONIBILIDAD')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DISPONIBILIDAD'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BedDouble className="h-4 w-4 text-emerald-500" /> Lugares y Reformers Disponibles ({totalLibresEstudio})
          </button>

          <button
            onClick={() => setActiveTab('HISTORIAL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HISTORIAL'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="h-4 w-4 text-blue-500" /> Historial de Liquidaciones ({historial.length})
          </button>
        </div>

        {/* Filtro por Modalidad */}
        {activeTab === 'NUEVA' && selectedProfesoraId !== 'ALL' && (
          <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)] text-xs font-semibold">
            <span className="px-2 text-[var(--text-muted)] flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Modalidad:
            </span>
            <button
              onClick={() => setModalityFilter('ALL')}
              className={`filter-pill ${modalityFilter === 'ALL' ? 'filter-pill-active' : ''}`}
            >
              Todas
            </button>
            <button
              onClick={() => setModalityFilter('REFORMER')}
              className={`filter-pill ${modalityFilter === 'REFORMER' ? 'filter-pill-active' : ''}`}
            >
              Reformer
            </button>
            <button
              onClick={() => setModalityFilter('ESTETICA')}
              className={`filter-pill ${modalityFilter === 'ESTETICA' ? 'filter-pill-active-success' : ''}`}
            >
              Estética
            </button>
          </div>
        )}
      </div>

      {activeTab === 'NUEVA' && (
        <>
          {/* Banner Aclaratorio de Regla de Negocio */}
          <div className="flex items-start sm:items-center gap-3 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-900 dark:text-blue-200">
            <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5 sm:mt-0" />
            <div className="leading-relaxed">
              <strong>Regla de Liquidación:</strong> Las <strong>Cuotas / Mensualidades</strong> se liquidan aplicando el porcentaje de comisión pactado con cada profesora. Las <strong>Inscripciones al Estudio</strong> corresponden 100% al estudio (0% de comisión) y no forman parte del pago a las profesoras. Puedes modificar el <strong>% Comisión</strong> en vivo para recalcular al instante.
            </div>
          </div>

          {/* Panel de Selección: Todo el Estudio vs Profesora Particular + Presets de Período */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
            {/* Presets Rápidos de Período (Cierre Mensual 1 al 31 vs Semana Actual) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Período de Cierre:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const y = d.getFullYear();
                      const m = d.getMonth();
                      const first = new Date(y, m, 1).toISOString().split('T')[0];
                      const last = new Date(y, m + 1, 0).toISOString().split('T')[0];
                      setStartDate(first);
                      setEndDate(last);
                    }}
                    className="px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)] hover:text-[var(--color-dark)] text-xs font-bold border border-[var(--border-default)] transition-colors cursor-pointer"
                  >
                    Mes Actual (1 al 30/31)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const day = d.getDay();
                      const diffStart = d.getDate() - day + (day === 0 ? -6 : 1);
                      const diffEnd = d.getDate() - day + (day === 0 ? 0 : 7);
                      setStartDate(new Date(d.setDate(diffStart)).toISOString().split('T')[0]);
                      setEndDate(new Date(d.setDate(diffEnd)).toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)] hover:text-[var(--color-dark)] text-xs font-bold border border-[var(--border-default)] transition-colors cursor-pointer"
                  >
                    Semana Actual
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const y = d.getFullYear();
                      const m = d.getMonth() - 1;
                      const first = new Date(y, m, 1).toISOString().split('T')[0];
                      const last = new Date(y, m + 1, 0).toISOString().split('T')[0];
                      setStartDate(first);
                      setEndDate(last);
                    }}
                    className="px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)] hover:text-[var(--color-dark)] text-xs font-bold border border-[var(--border-default)] transition-colors cursor-pointer"
                  >
                    Mes Anterior
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                Calculado sobre cobros ingresados entre {startDate} y {endDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                  Seleccionar Ámbito de Liquidación *
                </label>
                <select
                  value={selectedProfesoraId}
                  onChange={(e) => setSelectedProfesoraId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                >
                  <option value="ALL">Todo el Estudio (Global - Consolidado General)</option>
                  <optgroup label="Profesora Individual">
                    {profesoras.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || 'Profesora'}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <Input
                label="Inicio de Período *"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                label="Fin de Período *"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </Card>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-[var(--text-muted)]">Calculando liquidaciones y ganancia del estudio...</p>
            </div>
          ) : selectedProfesoraId === 'ALL' && liquidacionGlobal ? (
            /* VISTA CONSOLIDADA DE TODO EL ESTUDIO */
            <div className="flex flex-col gap-6">
              {/* 5 KPIs Clave del Estudio con Desglose Cuotas vs Inscripciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Total Recaudado Global */}
                <Card className="p-4 border-l-4 border-l-blue-500 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">
                      Total Recaudado Global
                    </span>
                    <p className="text-xl font-black text-[var(--text-primary)] mt-1 font-mono">
                      ${liquidacionGlobal.total_recaudado.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-2">
                    Cuotas + Inscripciones
                  </span>
                </Card>

                {/* 2. Total Cuotas (Comisionables) */}
                <Card className="p-4 border-l-4 border-l-indigo-500 shadow-xs flex flex-col justify-between bg-indigo-500/5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider block">
                        Total Cuotas
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600">
                        Comisionable
                      </span>
                    </div>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                      ${liquidacionGlobal.total_cuotas.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-2">
                    Base para comisiones
                  </span>
                </Card>

                {/* 3. Total Inscripciones (100% Estudio) */}
                <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between bg-amber-500/5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                        Inscripciones
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600">
                        100% Estudio
                      </span>
                    </div>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                      ${liquidacionGlobal.total_inscripciones.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-2">
                    0% a profes (no comisiona)
                  </span>
                </Card>

                {/* 4. A Pagar Profesoras */}
                <Card className="p-4 border-l-4 border-l-[var(--color-wood)] shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">
                      A Pagar Profesoras
                    </span>
                    <p className="text-xl font-black text-[var(--color-wood)] mt-1 font-mono">
                      ${liquidacionGlobal.total_profesoras.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-2">
                    Calculado en vivo por %
                  </span>
                </Card>

                {/* 5. Ganancia Neta Estudio */}
                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-xs flex flex-col justify-between bg-emerald-500/5">
                  <div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                      Ganancia Neta Estudio
                    </span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                      ${liquidacionGlobal.total_estudio.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-2">
                    Margen cuotas + 100% inscrip.
                  </span>
                </Card>
              </div>

              {/* Tabla Resumen Comparativa por Profesora */}
              <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <span>Liquidación Desglosada por Profesora</span>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Montos recaudados separados por cuotas e inscripciones. Puedes modificar el <strong>% Comisión</strong> en vivo para recalcular al instante.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    icon={<Printer className="h-4 w-4" />}
                  >
                    Imprimir Informe Consolidado
                  </Button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                        <th className="py-3 px-3.5 font-semibold">Profesora</th>
                        <th className="py-3 px-3 font-semibold text-center">Cobros</th>
                        <th className="py-3 px-3.5 font-semibold text-indigo-600 dark:text-indigo-400">Total Cuotas</th>
                        <th className="py-3 px-3.5 font-semibold text-amber-600 dark:text-amber-400">Inscripciones (Estudio)</th>
                        <th className="py-3 px-3.5 font-semibold">Total Cobrado</th>
                        <th className="py-3 px-3 font-semibold text-center w-28">% Comisión (Editable)</th>
                        <th className="py-3 px-3.5 font-semibold text-[var(--color-wood)]">A Pagar Profe</th>
                        <th className="py-3 px-3.5 font-semibold text-emerald-600">Margen Estudio</th>
                        <th className="py-3 px-3.5 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                      {liquidacionGlobal.liquidaciones_profesoras.map((liq) => (
                        <tr key={liq.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                          <td className="py-3.5 px-3.5 font-bold">{liq.profesora_nombre}</td>
                          <td className="py-3.5 px-3 font-mono text-center">{liq.detalles.length}</td>
                          <td className="py-3.5 px-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            ${liq.total_cuotas.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-3.5 font-mono">
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              ${liq.total_inscripciones.toLocaleString('es-AR')}
                            </span>
                            {liq.total_inscripciones > 0 && (
                              <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                                0% com.
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 font-mono font-bold text-[var(--text-muted)]">
                            ${liq.total_collected.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg border border-[var(--border-default)] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={ratesInput[liq.profesora_id] ?? String(Math.round(liq.commission_rate * 100))}
                                onChange={(e) => handleRateInputChange(liq.profesora_id, e.target.value)}
                                onBlur={() => handleRateInputBlur(liq.profesora_id, liq.commission_rate)}
                                className="w-12 text-center text-xs font-bold bg-transparent border-none outline-none text-[var(--text-primary)]"
                              />
                              <span className="text-[10px] font-bold text-[var(--text-muted)]">%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 font-mono font-bold text-[var(--color-wood)]">
                            ${liq.teacher_amount.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${liq.studio_amount.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-3.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarcarPagada(liq)}
                              disabled={liq.teacher_amount === 0}
                              icon={<Check className="h-3.5 w-3.5" />}
                            >
                              Marcar Pagada
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Master Detalle de Todos los Cobros Registrados */}
              <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Registro Maestro de Todos los Cobros Abonados ({liquidacionGlobal.todos_los_detalles.length})
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    Las inscripciones no generan comisión a profesoras
                  </span>
                </div>

                {liquidacionGlobal.todos_los_detalles.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                    No se registraron cobros en el rango de fechas seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Alumna / Cliente</th>
                          <th className="py-3 px-4 font-semibold">Fecha Pago</th>
                          <th className="py-3 px-4 font-semibold">Concepto / Plan</th>
                          <th className="py-3 px-4 font-semibold">Tipo de Cobro</th>
                          <th className="py-3 px-4 font-semibold">Sede</th>
                          <th className="py-3 px-4 font-semibold">Monto Abonado</th>
                          <th className="py-3 px-4 font-semibold text-[var(--color-wood)]">Comisión Profe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                        {liquidacionGlobal.todos_los_detalles.map((d) => (
                          <tr key={d.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold">{d.alumna_nombre}</td>
                            <td className="py-3.5 px-4 font-mono">{d.payment_date}</td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">{d.plan_name}</td>
                            <td className="py-3.5 px-4">
                              {d.is_inscripcion ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Inscripción (Estudio)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  Cuota / Mensualidad
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">{d.sede_name}</td>
                            <td className="py-3.5 px-4 font-mono font-bold">${d.amount_paid.toLocaleString('es-AR')}</td>
                            <td className="py-3.5 px-4 font-mono">
                              {d.is_inscripcion ? (
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                  $0 (100% Estudio)
                                </span>
                              ) : (
                                <span className="font-bold text-[var(--color-wood)]">
                                  ${d.teacher_commission.toLocaleString('es-AR')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          ) : liquidacionCalculada ? (
            /* VISTA INDIVIDUAL DE UNA PROFESORA */
            <div className="flex flex-col gap-6">
              {/* Tarjetas KPI Individuales con Desglose Cuotas / Inscripciones y Porcentaje Editable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Total Cobrado */}
                <Card className="p-4 border-l-4 border-l-blue-500 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">
                      Total Cobrado
                    </span>
                    <p className="text-xl font-black text-[var(--text-primary)] mt-1 font-mono">
                      ${liquidacionCalculada.total_collected.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-2">
                    Cuotas + Inscripciones
                  </span>
                </Card>

                {/* 2. Total Cuotas (Comisionables) */}
                <Card className="p-4 border-l-4 border-l-indigo-500 shadow-xs flex flex-col justify-between bg-indigo-500/5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider block">
                        Total Cuotas
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-600">
                        Comisionable
                      </span>
                    </div>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                      ${liquidacionCalculada.total_cuotas.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-2">
                    Base sobre la que comisiona
                  </span>
                </Card>

                {/* 3. Inscripciones (Estudio) */}
                <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between bg-amber-500/5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                        Inscripciones
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600">
                        100% Estudio
                      </span>
                    </div>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                      ${liquidacionCalculada.total_inscripciones.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-2">
                    0% a profesora
                  </span>
                </Card>

                {/* 4. % Comisión Editable en Vivo */}
                <Card className="p-4 border-l-4 border-l-purple-500 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider block">
                        % Comisión
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600">
                        Editable en vivo
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={ratesInput[selectedProfesoraId] ?? String(Math.round(liquidacionCalculada.commission_rate * 100))}
                        onChange={(e) => handleRateInputChange(selectedProfesoraId, e.target.value)}
                        onBlur={() => handleRateInputBlur(selectedProfesoraId, liquidacionCalculada.commission_rate)}
                        className="w-16 h-8 px-2 text-center text-lg font-black rounded-lg bg-[var(--bg-tertiary)] border border-purple-500/40 text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-lg font-black text-purple-600 dark:text-purple-400">%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1">
                    Recalcula montos al instante
                  </span>
                </Card>

                {/* 5. A Pagar a Profesora */}
                <Card className="p-4 border-l-4 border-l-[var(--color-wood)] shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">
                      A Pagar a Profesora
                    </span>
                    <p className="text-xl font-black text-[var(--color-wood)] mt-1 font-mono">
                      ${liquidacionCalculada.teacher_amount.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-2">
                    Margen para estudio: ${liquidacionCalculada.studio_amount.toLocaleString('es-AR')}
                  </span>
                </Card>
              </div>

              {/* Detalle de Cobros Abonados */}
              <Card className="p-6 border border-[var(--border-default)] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      Detalle de Cobros de {liquidacionCalculada.profesora_nombre} ({liquidacionCalculada.detalles.length})
                      {modalityFilter !== 'ALL' && (
                        <Badge variant="info">Filtro: {modalityFilter}</Badge>
                      )}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Cobros efectivamente ingresados en la semana seleccionada. Las inscripciones no generan comisión.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      icon={<Printer className="h-4 w-4" />}
                    >
                      Imprimir Comprobante
                    </Button>

                    <Button
                      onClick={() => handleMarcarPagada()}
                      icon={<Check className="h-4 w-4" />}
                      loading={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Marcar Liquidación como Pagada
                    </Button>
                  </div>
                </div>

                {liquidacionCalculada.detalles.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                    No hay mensualidades abonadas para esta profesora en el filtro de modalidad seleccionado ({modalityFilter}).
                  </p>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Alumna / Paciente</th>
                          <th className="py-3 px-4 font-semibold">Fecha Pago</th>
                          <th className="py-3 px-4 font-semibold">Plan / Servicio</th>
                          <th className="py-3 px-4 font-semibold">Tipo</th>
                          <th className="py-3 px-4 font-semibold">Monto Abonado</th>
                          <th className="py-3 px-4 font-semibold text-[var(--color-wood)]">Comisión Profesora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                        {liquidacionCalculada.detalles.map((d) => (
                          <tr key={d.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold">{d.alumna_nombre}</td>
                            <td className="py-3.5 px-4 font-mono">{d.payment_date}</td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">{d.plan_name}</td>
                            <td className="py-3.5 px-4">
                              {d.is_inscripcion ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Inscripción (Estudio)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  Cuota / Mensualidad
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold">${d.amount_paid.toLocaleString('es-AR')}</td>
                            <td className="py-3.5 px-4 font-mono">
                              {d.is_inscripcion ? (
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                  $0 (100% Estudio)
                                </span>
                              ) : (
                                <span className="font-bold text-[var(--color-wood)]">
                                  ${d.teacher_commission.toLocaleString('es-AR')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--text-muted)] py-12">
              No hay liquidaciones disponibles para el criterio seleccionado.
            </p>
          )}
        </>
      )}

      {/* PESTAÑA 2: LUGARES Y REFORMERS DISPONIBLES EN EL ESTUDIO */}
      {activeTab === 'DISPONIBILIDAD' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header de Disponibilidad con Filtro */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-emerald-600" />
                <span>Lugares y Camillas Disponibles en el Estudio</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Capacidad global: {totalCapacidadEstudio} reformers semanales &bull; {totalOcupadasEstudio} ocupados &bull;{' '}
                <strong className="text-emerald-600">{totalLibresEstudio} reformers disponibles</strong> ({porcentajeOcupacion}% ocupación)
              </p>
            </div>

            {/* Filtro por día */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">Día:</label>
              <select
                value={filtroDispDia}
                onChange={(e) => setFiltroDispDia(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
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

          {/* Grilla de Turnos con Reformers Disponibles */}
          {disponibilidad.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <BedDouble className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Aún no hay turnos ni clases programadas en la Agenda
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                La base de datos no tiene turnos configurados. Crea los horarios de tus clases en la Agenda para habilitar la capacidad semanal y los reformers disponibles.
              </p>
              <div className="pt-2">
                <Link
                  href="/agenda"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-wood)] text-[var(--color-dark)] text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
                >
                  <Clock className="h-4 w-4" />
                  <span>Ir a la Agenda para Crear Turnos</span>
                </Link>
              </div>
            </Card>
          ) : disponibilidad
            .filter((d) => filtroDispDia === 'ALL' || d.day_of_week === filtroDispDia)
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
                .filter((d) => filtroDispDia === 'ALL' || d.day_of_week === filtroDispDia)
                .filter((d) => d.libres_count > 0)
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
                          {item.start_time} hs &bull; {item.clase_nombre}
                        </h4>
                      </div>
                      <Badge variant="success">
                        {item.libres_count} {item.libres_count === 1 ? 'Libre' : 'Libres'}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-[var(--text-muted)]">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{item.sede_nombre}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Profesora: {item.profesora_nombre}</span>
                      </p>
                    </div>

                    {/* Reformers Disponibles Específicos */}
                    <div className="pt-2 border-t border-[var(--border-default)]">
                      <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
                        Camillas / Reformers Disponibles:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.camillas_libres.map((cNum) => (
                          <span
                            key={cNum}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <BedDouble className="h-3 w-3" />
                            <span>Reformer {cNum} Disponible</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: HISTORIAL DE LIQUIDACIONES */}
      {activeTab === 'HISTORIAL' && (
        <Card className="p-4 sm:p-6 border border-[var(--border-default)] shadow-xs">
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
            Historial de Liquidaciones Guardadas
          </h3>

          {historial.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">
              No hay liquidaciones registradas en el historial.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Profesora</th>
                    <th className="py-3 px-4 font-semibold">Período Semanal</th>
                    <th className="py-3 px-4 font-semibold">Total Cobrado</th>
                    <th className="py-3 px-4 font-semibold text-[var(--color-wood)]">Monto Pagado Profe</th>
                    <th className="py-3 px-4 font-semibold text-emerald-600">Margen Estudio</th>
                    <th className="py-3 px-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                  {historial.map((h) => (
                    <tr key={h.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold">{h.profesora_nombre}</td>
                      <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                        {h.period_start} al {h.period_end}
                      </td>
                      <td className="py-3.5 px-4 font-mono">${h.total_collected.toLocaleString('es-AR')}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--color-wood)]">
                        ${h.teacher_amount.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${(h.studio_amount || (h.total_collected - h.teacher_amount)).toLocaleString('es-AR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="success">PAGADA</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
