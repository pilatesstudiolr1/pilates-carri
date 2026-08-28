'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { getReportesMetrics, ReportesMetrics } from '@/lib/services/reportes';
import { getSedes } from '@/lib/services/sedes';
import { getPagos } from '@/lib/services/pagos';
import { getMovimientos } from '@/lib/services/caja';
import { Sede, Pago, CajaMovimiento } from '@/types/database';
import {
  RefreshCw,
  MapPin,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  PieChart,
  DollarSign,
  CreditCard,
  Users,
  UserX,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function ReportesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'finanzas' ? 'finanzas' : 'reportes';
  const [activeTab, setActiveTab] = useState<'reportes' | 'finanzas'>(initialTab);

  // General Reportes State
  const [metrics, setMetrics] = useState<ReportesMetrics>({
    ingresos_registrados: 0,
    pagos_registrados: 0,
    alumnas_activas: 0,
    alumnas_baja: 0,
    alumnas_total: 0,
    turnos_cargados: 0,
    presentes: 0,
    ausentes: 0,
    asistencias_total: 0,
  });

  // Finanzas State
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    const [sedesRes, metricsRes, pagosRes, movsRes] = await Promise.all([
      getSedes({ isActive: 'ALL' }),
      getReportesMetrics(selectedSedeId),
      getPagos({ status: 'PAID' }),
      getMovimientos(),
    ]);

    if (sedesRes.data) {
      setSedes(sedesRes.data);
    }

    if (metricsRes.error) {
      setErrorMsg(metricsRes.error);
    } else {
      setMetrics(metricsRes.data);
    }

    setPagos(pagosRes.data || []);
    setMovimientos(movsRes.data || []);
    setLoading(false);
  }, [selectedSedeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos dinámicos de Finanzas
  const pagosFiltrados = pagos.filter((p) => {
    if (selectedSedeId === 'ALL') return true;
    return p.sede_id === selectedSedeId || p.alumna?.sede_id === selectedSedeId;
  });

  const movimientosFiltrados = movimientos.filter((m) => {
    if (selectedSedeId === 'ALL') return true;
    return m.sede_id === selectedSedeId;
  });

  const totalPagos = pagosFiltrados.reduce((acc, p) => acc + (p.amount || 0), 0);
  
  // Ingresos operativos reales del estudio (Cobros de cuotas y mensualidades)
  const ingresosTotalesFinanzas = totalPagos;
  const egresosTotalesFinanzas = movimientosFiltrados
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  const rentabilidadNeta = ingresosTotalesFinanzas - egresosTotalesFinanzas;

  // Porcentajes para visualizaciones
  const pctActivas = metrics.alumnas_total > 0
    ? Math.round((metrics.alumnas_activas / metrics.alumnas_total) * 100)
    : 0;

  const pctPresentes = metrics.asistencias_total > 0
    ? Math.round((metrics.presentes / metrics.asistencias_total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-[var(--text-primary)]">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--color-wood)]" /> Reportes &amp; Finanzas
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Resumen general de la sede seleccionada y estado de resultados financiero.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Selector de Sede */}
          <div className="relative w-full sm:min-w-[200px]">
            <select
              value={selectedSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-semibold shadow-xs"
            >
              <option value="ALL">Todas las Sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <MapPin className="h-4 w-4 text-[var(--color-wood)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Pestañas de Unificación Amigables */}
      <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-md border border-[var(--border-default)] w-full sm:w-fit overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('reportes')}
          className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reportes'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-[var(--color-wood)]" /> Reportes Generales
        </button>

        <button
          onClick={() => setActiveTab('finanzas')}
          className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'finanzas'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-[var(--color-wood)]" /> Estado de Resultados y Finanzas
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando métricas unificadas...</p>
        </div>
      ) : activeTab === 'reportes' ? (
        /* Pestaña 1: Reportes Generales (UI Amigable) */
        <>
          {/* Fila 1: Tarjetas KPI / Métricas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Ingresos registrados */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Ingresos registrados
                </span>
                <DollarSign className="h-3.5 w-3.5 text-[var(--color-success)] shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                $ {metrics.ingresos_registrados.toLocaleString()}
              </span>
            </Card>

            {/* Pagos registrados */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Pagos registrados
                </span>
                <CreditCard className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                {metrics.pagos_registrados}
              </span>
            </Card>

            {/* Alumnas activas */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Alumnas activas
                </span>
                <Users className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                {metrics.alumnas_activas}
              </span>
            </Card>

            {/* Alumnas de baja */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Alumnas de baja
                </span>
                <UserX className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                {metrics.alumnas_baja}
              </span>
            </Card>

            {/* Turnos cargados */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Turnos cargados
                </span>
                <Calendar className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                {metrics.turnos_cargados}
              </span>
            </Card>

            {/* Presentes */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Presentes
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                {metrics.presentes}
              </span>
            </Card>

            {/* Ausentes */}
            <Card padding="sm" className="flex flex-col justify-between border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all min-h-[95px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">
                  Ausentes
                </span>
                <XCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              </div>
              <span className="text-lg font-black text-[var(--text-primary)] mt-2">
                {metrics.ausentes}
              </span>
            </Card>
          </div>

          {/* Bloques de Resumen Detallados Amigables */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
            {/* Resumen de alumnas */}
            <Card className="p-6 border border-[var(--border-default)] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 mb-4">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--color-wood)]" /> Resumen de alumnas
                  </h2>
                  <span className="text-xs font-bold text-[var(--color-wood)] bg-[var(--color-wood)]/15 px-2 py-0.5 rounded-md">
                    {pctActivas}% activas
                  </span>
                </div>

                {/* Progress Bar Visual */}
                <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-4">
                  <div
                    className="h-full bg-[var(--color-wood)] transition-all duration-500"
                    style={{ width: `${pctActivas}%` }}
                  />
                </div>

                <div className="divide-y divide-[var(--border-default)] text-xs text-[var(--text-primary)]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total de alumnas</span>
                    <span className="font-bold">{metrics.alumnas_total}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Activas</span>
                    <span className="font-bold text-[var(--color-success)]">{metrics.alumnas_activas}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">De baja o inactivas</span>
                    <span className="font-bold text-[var(--color-danger)]">{metrics.alumnas_baja}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resumen de asistencia */}
            <Card className="p-6 border border-[var(--border-default)] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 mb-4">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Resumen de asistencia
                  </h2>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                    {pctPresentes}% asistencia
                  </span>
                </div>

                {/* Progress Bar Visual */}
                <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-4">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pctPresentes}%` }}
                  />
                </div>

                <div className="divide-y divide-[var(--border-default)] text-xs text-[var(--text-primary)]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Presentes</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.presentes}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Ausentes</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{metrics.ausentes}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total de asistencias registradas</span>
                    <span className="font-bold">{metrics.asistencias_total}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resumen financiero */}
            <Card className="p-6 border border-[var(--border-default)] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 mb-4">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[var(--color-wood)]" /> Resumen financiero
                  </h2>
                  <span className="text-xs font-bold text-[var(--color-wood)] bg-[var(--color-wood)]/15 px-2 py-0.5 rounded-md">
                    Cobros
                  </span>
                </div>

                <div className="p-3 rounded-md bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)] mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Recaudación total:</span>
                  <span className="text-sm font-black text-[var(--color-wood)] font-mono">
                    $ {metrics.ingresos_registrados.toLocaleString()}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-default)] text-xs text-[var(--text-primary)]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total cobrado</span>
                    <span className="font-bold">$ {metrics.ingresos_registrados.toLocaleString()}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Cantidad de pagos</span>
                    <span className="font-bold">{metrics.pagos_registrados}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* Pestaña 2: Estado de Resultados y Finanzas */
        <div className="flex flex-col gap-6">
          {/* Tarjetas Principales de Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-[var(--color-success)] flex flex-col justify-between gap-2 shadow-xs">
              <div>
                <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  Ingresos Operativos
                </span>
                <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
                  ${ingresosTotalesFinanzas.toLocaleString()} ARS
                </p>
              </div>
              <span className="text-[11px] text-[var(--color-success)] font-bold flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> Cobros y entradas registradas
              </span>
            </Card>

            <Card className="p-5 border-l-4 border-l-[var(--color-danger)] flex flex-col justify-between gap-2 shadow-xs">
              <div>
                <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  Egresos y Gastos Fijos
                </span>
                <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
                  ${egresosTotalesFinanzas.toLocaleString()} ARS
                </p>
              </div>
              <span className="text-[11px] text-[var(--color-danger)] font-bold flex items-center gap-1">
                <ArrowDownLeft className="h-3.5 w-3.5" /> Gastos de caja contabilizados
              </span>
            </Card>

            <Card className="p-5 border-l-4 border-l-[var(--color-wood)] flex flex-col justify-between gap-2 shadow-xs">
              <div>
                <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  Rentabilidad Neta Real
                </span>
                <p className="text-2xl font-black text-[var(--color-wood)] mt-1">
                  ${rentabilidadNeta.toLocaleString()} ARS
                </p>
              </div>
              <span className="text-[11px] text-[var(--color-wood)] font-bold flex items-center gap-1">
                <PieChart className="h-3.5 w-3.5" /> Balance neto del período
              </span>
            </Card>
          </div>

          {/* Desglose de Recaudación por Sede */}
          <Card className="p-6 flex flex-col gap-4 border border-[var(--border-default)] shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--color-wood)]" /> Recaudación Real por Sede
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {sedes.length} sedes registradas en el sistema
              </span>
            </div>

            {sedes.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No hay sedes registradas en la base de datos.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sedes.map((s) => {
                  const pagosSede = pagos.filter(
                    (p) => p.sede_id === s.id || p.alumna?.sede_id === s.id
                  );
                  const movsSede = movimientos.filter((m) => m.sede_id === s.id);

                  const ingSede = pagosSede.reduce((acc, p) => acc + (p.amount || 0), 0);

                  const egrSede = movsSede
                    .filter((m) => m.tipo === 'EGRESO')
                    .reduce((acc, m) => acc + (m.monto || 0), 0);

                  const netoCalculado = ingSede - egrSede;

                  // Porcentaje del total de ingresos
                  const pctSedeIng = ingresosTotalesFinanzas > 0
                    ? Math.round((ingSede / ingresosTotalesFinanzas) * 100)
                    : 0;

                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-md bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-[var(--border-hover)] transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-md bg-[var(--color-wood)]/15 border border-[var(--color-wood)]/30 flex items-center justify-center text-[var(--color-wood)] font-bold text-xs shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[var(--text-primary)]">
                            {s.name} &bull; <span className="font-normal text-[var(--text-muted)]">{s.address || 'Sin dirección'}</span>
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Ingresos: ${ingSede.toLocaleString()} &bull; Egresos: ${egrSede.toLocaleString()}
                          </p>
                          <div className="w-48 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mt-2">
                            <div
                              className="h-full bg-[var(--color-wood)] rounded-full"
                              style={{ width: `${pctSedeIng}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                          Neto acumulado ({pctSedeIng}% del total)
                        </span>
                        <span className="font-extrabold text-sm text-[var(--color-wood)] font-mono">
                          ${netoCalculado.toLocaleString()} ARS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
