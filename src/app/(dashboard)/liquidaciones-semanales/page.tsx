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
} from 'lucide-react';

export type ModalityFilter = 'ALL' | 'REFORMER' | 'BARRE' | 'ESTETICA';

export default function LiquidacionesSemanalesPage() {
  const { confirm, alert: alertDialog } = useConfirm();

  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [selectedProfesoraId, setSelectedProfesoraId] = useState<string>('ALL');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('ALL');

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
      getProfiles({ role: 'ALL' }),
      getHistorialLiquidaciones(),
      getDisponibilidadCamillas(),
    ]);

    if (profsRes.data && profsRes.data.length > 0) {
      setProfesoras(profsRes.data);
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
      const { data } = await calcularLiquidacionGlobal(startDate, endDate);
      setLiquidacionGlobal(data);
      setLiquidacionCalculada(null);
    } else {
      const { data } = await calcularLiquidacionSemanal(selectedProfesoraId, startDate, endDate);
      if (data) {
        if (modalityFilter !== 'ALL') {
          const filteredDetalles = data.detalles.filter((d) => {
            const planLower = (d.plan_name || '').toLowerCase();
            if (modalityFilter === 'REFORMER') return planLower.includes('reformer') || !planLower.includes('barre');
            if (modalityFilter === 'BARRE') return planLower.includes('barre');
            if (modalityFilter === 'ESTETICA') return planLower.includes('estética') || planLower.includes('estetica');
            return true;
          });

          const totalCollected = filteredDetalles.reduce((acc, d) => acc + d.amount_paid, 0);
          const teacherAmount = filteredDetalles.reduce((acc, d) => acc + d.teacher_commission, 0);
          const studioAmount = totalCollected - teacherAmount;

          setLiquidacionCalculada({
            ...data,
            detalles: filteredDetalles,
            total_collected: totalCollected,
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
  }, [selectedProfesoraId, startDate, endDate, modalityFilter]);

  useEffect(() => {
    handleCalcular();
  }, [selectedProfesoraId, startDate, endDate, modalityFilter, handleCalcular]);

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
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                modalityFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setModalityFilter('REFORMER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                modalityFilter === 'REFORMER' ? 'bg-[var(--color-wood)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Reformer
            </button>
            <button
              onClick={() => setModalityFilter('BARRE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                modalityFilter === 'BARRE' ? 'bg-amber-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Barre
            </button>
            <button
              onClick={() => setModalityFilter('ESTETICA')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                modalityFilter === 'ESTETICA' ? 'bg-emerald-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Estética
            </button>
          </div>
        )}
      </div>

      {activeTab === 'NUEVA' && (
        <>
          {/* Panel de Selección: Todo el Estudio vs Profesora Particular */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                  Seleccionar Ámbito de Liquidación *
                </label>
                <select
                  value={selectedProfesoraId}
                  onChange={(e) => setSelectedProfesoraId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
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
                label="Inicio de Semana *"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                label="Fin de Semana *"
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
              {/* 4 KPIs Clave del Estudio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-blue-500 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        Total Recaudado Estudio
                      </span>
                      <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
                        ${liquidacionGlobal.total_recaudado.toLocaleString('es-AR')} ARS
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-emerald-500 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        Ganancia Neta del Estudio
                      </span>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        ${liquidacionGlobal.total_estudio.toLocaleString('es-AR')} ARS
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-[var(--color-wood)] shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        Comisiones a Profesoras
                      </span>
                      <p className="text-2xl font-black text-[var(--color-wood)] mt-1">
                        ${liquidacionGlobal.total_profesoras.toLocaleString('es-AR')} ARS
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/10 flex items-center justify-center text-[var(--color-wood)]">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-purple-500 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        Lugares Disponibles
                      </span>
                      <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {totalLibresEstudio} Reformers
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {porcentajeOcupacion}% ocupación actual
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <BedDouble className="h-5 w-5" />
                    </div>
                  </div>
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
                      Montos recaudados, porcentaje de comisión asignado y beneficio para el estudio en esta semana
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
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Profesora</th>
                        <th className="py-3 px-4 font-semibold">Cobros</th>
                        <th className="py-3 px-4 font-semibold">Total Cobrado</th>
                        <th className="py-3 px-4 font-semibold">% Comisión</th>
                        <th className="py-3 px-4 font-semibold text-[var(--color-wood)]">A Pagar Profe</th>
                        <th className="py-3 px-4 font-semibold text-emerald-600">Margen Estudio</th>
                        <th className="py-3 px-4 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                      {liquidacionGlobal.liquidaciones_profesoras.map((liq) => (
                        <tr key={liq.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold">{liq.profesora_nombre}</td>
                          <td className="py-3.5 px-4 font-mono">{liq.detalles.length}</td>
                          <td className="py-3.5 px-4 font-mono font-bold">${liq.total_collected.toLocaleString('es-AR')}</td>
                          <td className="py-3.5 px-4 font-mono">{Math.round(liq.commission_rate * 100)}%</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[var(--color-wood)]">
                            ${liq.teacher_amount.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${liq.studio_amount.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
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
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Registro Maestro de Todos los Cobros Abonados ({liquidacionGlobal.todos_los_detalles.length})
                </h3>

                {liquidacionGlobal.todos_los_detalles.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                    No se registraron cobros en el rango de fechas seleccionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Alumna / Cliente</th>
                          <th className="py-3 px-4 font-semibold">Fecha Pago</th>
                          <th className="py-3 px-4 font-semibold">Concepto / Plan</th>
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
                            <td className="py-3.5 px-4">{d.sede_name}</td>
                            <td className="py-3.5 px-4 font-mono font-bold">${d.amount_paid.toLocaleString('es-AR')}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[var(--color-wood)]">
                              ${d.teacher_commission.toLocaleString('es-AR')}
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
              {/* Tarjetas KPI Individuales */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-blue-500 shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    Total Cobrado Semana
                  </span>
                  <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
                    ${liquidacionCalculada.total_collected.toLocaleString('es-AR')} ARS
                  </p>
                </Card>

                <Card className="p-5 border-l-4 border-l-amber-500 shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    % Comisión Profesora
                  </span>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {(liquidacionCalculada.commission_rate * 100).toFixed(0)}%
                  </p>
                </Card>

                <Card className="p-5 border-l-4 border-l-[var(--color-wood)] shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    A Pagar a Profesora
                  </span>
                  <p className="text-2xl font-black text-[var(--color-wood)] mt-1">
                    ${liquidacionCalculada.teacher_amount.toLocaleString('es-AR')} ARS
                  </p>
                </Card>

                <Card className="p-5 border-l-4 border-l-emerald-500 shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    Margen para Estudio
                  </span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ${liquidacionCalculada.studio_amount.toLocaleString('es-AR')} ARS
                  </p>
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
                      Cobros efectivamente ingresados en la semana seleccionada.
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
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Alumna / Paciente</th>
                          <th className="py-3 px-4 font-semibold">Fecha Pago</th>
                          <th className="py-3 px-4 font-semibold">Plan / Servicio</th>
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
                            <td className="py-3.5 px-4 font-mono font-bold">${d.amount_paid.toLocaleString('es-AR')}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[var(--color-wood)]">
                              ${d.teacher_commission.toLocaleString('es-AR')}
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
