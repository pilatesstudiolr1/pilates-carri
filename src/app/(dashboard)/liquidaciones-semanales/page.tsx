'use client';

import { useState, useEffect, useCallback } from 'react';
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
  marcarLiquidacionPagada,
  getHistorialLiquidaciones,
  LiquidacionSemanal,
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
} from 'lucide-react';

export type ModalityFilter = 'ALL' | 'REFORMER' | 'BARRE' | 'ESTETICA';

export default function LiquidacionesSemanalesPage() {
  const { confirm, alert: alertDialog } = useConfirm();

  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [selectedProfesoraId, setSelectedProfesoraId] = useState<string>('');
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
  const [historial, setHistorial] = useState<LiquidacionSemanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'NUEVA' | 'HISTORIAL'>('NUEVA');

  const loadProfesoras = useCallback(async () => {
    setLoading(true);
    const [profsRes, histRes] = await Promise.all([
      getProfiles({ role: 'ALL' }),
      getHistorialLiquidaciones(),
    ]);

    if (profsRes.data && profsRes.data.length > 0) {
      setProfesoras(profsRes.data);
      if (!selectedProfesoraId) {
        setSelectedProfesoraId(profsRes.data[0].id);
      }
    }
    setHistorial(histRes.data || []);
    setLoading(false);
  }, [selectedProfesoraId]);

  useEffect(() => {
    loadProfesoras();
  }, [loadProfesoras]);

  const handleCalcular = useCallback(async () => {
    if (!selectedProfesoraId) return;
    setLoading(true);
    const { data } = await calcularLiquidacionSemanal(selectedProfesoraId, startDate, endDate);

    if (data) {
      // Filtrar detalles por modalidad si no es 'ALL'
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

    setLoading(false);
  }, [selectedProfesoraId, startDate, endDate, modalityFilter]);

  useEffect(() => {
    if (selectedProfesoraId) {
      handleCalcular();
    }
  }, [selectedProfesoraId, startDate, endDate, modalityFilter, handleCalcular]);

  const handleMarcarPagada = async () => {
    if (!liquidacionCalculada) return;

    const isOk = await confirm({
      title: 'Marcar Liquidación como Pagada',
      message: `¿Desea registrar como pagada la liquidación de ${liquidacionCalculada.profesora_nombre} por $${liquidacionCalculada.teacher_amount.toLocaleString()} ARS?`,
      confirmText: 'Sí, marcar pagada',
      variant: 'success',
    });
    if (!isOk) return;

    setSubmitting(true);
    await marcarLiquidacionPagada(liquidacionCalculada);
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

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-[var(--text-primary)] max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-blue-500" /> Acceso Directo Liquidación Semanal
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Cálculo automatizado de comisiones dividiendo y extrayendo la información por modalidad (Reformer, Barre, Estética).
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
            <Receipt className="h-4 w-4 text-blue-500" /> Liquidación Actual
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

        {/* Filtro por Modalidad (Reformer, Barre, Estética, Todas) */}
        {activeTab === 'NUEVA' && (
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

      {activeTab === 'NUEVA' ? (
        <>
          {/* Panel de Filtro Semanal & Profesora */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                  Seleccionar Profesora / Profesional *
                </label>
                <select
                  value={selectedProfesoraId}
                  onChange={(e) => setSelectedProfesoraId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                >
                  {profesoras.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || 'Profesora'}
                    </option>
                  ))}
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
              <p className="text-xs text-[var(--text-muted)]">Calculando liquidación semanal para {modalityFilter}...</p>
            </div>
          ) : !liquidacionCalculada ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-12">
              No se seleccionó una profesora o no existen cobros registrados en esa semana.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Tarjetas KPI de Resumen Financiero */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-blue-500 shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    Total Cobrado Semana
                  </span>
                  <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
                    ${liquidacionCalculada.total_collected.toLocaleString()} ARS
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

                <Card className="p-5 border-l-4 border-l-[var(--color-success)] shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    A Pagar a Profesora
                  </span>
                  <p className="text-2xl font-black text-[var(--color-success)] mt-1">
                    ${liquidacionCalculada.teacher_amount.toLocaleString()} ARS
                  </p>
                </Card>

                <Card className="p-5 border-l-4 border-l-[var(--color-wood)] shadow-xs">
                  <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    Margen para Estudio
                  </span>
                  <p className="text-2xl font-black text-[var(--color-wood)] mt-1">
                    ${liquidacionCalculada.studio_amount.toLocaleString()} ARS
                  </p>
                </Card>
              </div>

              {/* Detalle de Cobros Efectivamente Ingresados */}
              <Card className="p-6 border border-[var(--border-default)] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      Detalle de Cobros Abonados ({liquidacionCalculada.detalles.length})
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
                      onClick={handleMarcarPagada}
                      icon={<Check className="h-4 w-4" />}
                      loading={submitting}
                      className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white font-bold"
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
                          <th className="py-3 px-4 font-semibold text-[var(--color-success)]">Comisión Profesora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                        {liquidacionCalculada.detalles.map((d) => (
                          <tr key={d.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold">{d.alumna_nombre}</td>
                            <td className="py-3.5 px-4 font-mono">{d.payment_date}</td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">{d.plan_name}</td>
                            <td className="py-3.5 px-4 font-mono font-bold">${d.amount_paid.toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[var(--color-success)]">
                              ${d.teacher_commission.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      ) : (
        /* Pestaña: Historial de Liquidaciones */
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
                    <th className="py-3 px-4 font-semibold text-[var(--color-success)]">Monto Pagado Profe</th>
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
                      <td className="py-3.5 px-4 font-mono">${h.total_collected.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--color-success)]">
                        ${h.teacher_amount.toLocaleString()}
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
