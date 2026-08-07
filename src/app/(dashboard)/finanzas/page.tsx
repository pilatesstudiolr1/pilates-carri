'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Sede, Pago, CajaMovimiento } from '@/types/database';
import { getSedes } from '@/lib/services/sedes';
import { getPagos } from '@/lib/services/pagos';
import { getMovimientos } from '@/lib/services/caja';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Building2, DollarSign, Filter, PieChart } from 'lucide-react';

export default function FinanzasPage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('ALL');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    const [sedesRes, pagosRes, movsRes] = await Promise.all([
      getSedes({ isActive: 'ALL' }),
      getPagos({ status: 'PAID' }),
      getMovimientos(),
    ]);

    if (sedesRes.error) {
      setErrorMsg(sedesRes.error);
    } else {
      setSedes(sedesRes.data);
    }

    setPagos(pagosRes.data);
    setMovimientos(movsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar pagos y movimientos según la sede seleccionada
  const pagosFiltrados = pagos.filter((p) => {
    if (selectedSedeId === 'ALL') return true;
    return p.sede_id === selectedSedeId || p.alumna?.sede_id === selectedSedeId;
  });

  const movimientosFiltrados = movimientos.filter((m) => {
    if (selectedSedeId === 'ALL') return true;
    return m.sede_id === selectedSedeId;
  });

  const totalPagos = pagosFiltrados.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalIngresosCaja = movimientosFiltrados
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  const ingresosTotales = totalPagos + totalIngresosCaja;
  const egresosTotales = movimientosFiltrados
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  const rentabilidadNeta = ingresosTotales - egresosTotales;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-[var(--text-primary)]">
      {/* Encabezado Principal y Filtro de Sede */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-[var(--color-wood)]" /> Estado de Resultados y Finanzas
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Balance dinámico, ingresos y costos calculados según las sedes registradas
          </p>
        </div>

        {/* Selector Dinámico de Sedes */}
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1.5 rounded-xl border border-[var(--border-default)]">
          <Filter className="h-4 w-4 text-[var(--color-wood)] ml-2 shrink-0" />
          <select
            value={selectedSedeId}
            onChange={(e) => setSelectedSedeId(e.target.value)}
            className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer pr-2"
          >
            <option value="ALL" className="bg-[var(--bg-secondary)]">Todas las Sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id} className="bg-[var(--bg-secondary)]">
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Calculando estado financiero dinámico...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas Principales de Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-[var(--color-success)] flex flex-col justify-between gap-2 shadow-xs">
              <div>
                <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  Ingresos Operativos
                </span>
                <p className="text-2xl font-black text-[var(--text-primary)] mt-1">
                  ${ingresosTotales.toLocaleString()} ARS
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
                  ${egresosTotales.toLocaleString()} ARS
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

          {/* Desglose de Recaudación Dinámica por Sede */}
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
                No hay sedes registradas en la base de datos. Agrégalas en Configuración.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sedes.map((s) => {
                  const pagosSede = pagos.filter(
                    (p) => p.sede_id === s.id || p.alumna?.sede_id === s.id
                  );
                  const movsSede = movimientos.filter((m) => m.sede_id === s.id);

                  const ingSede =
                    pagosSede.reduce((acc, p) => acc + (p.amount || 0), 0) +
                    movsSede
                      .filter((m) => m.tipo === 'INGRESO')
                      .reduce((acc, m) => acc + (m.monto || 0), 0);

                  const egrSede = movsSede
                    .filter((m) => m.tipo === 'EGRESO')
                    .reduce((acc, m) => acc + (m.monto || 0), 0);

                  const netoCalculado = ingSede - egrSede;

                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[var(--border-hover)] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-wood)]/15 border border-[var(--color-wood)]/30 flex items-center justify-center text-[var(--color-wood)] font-bold text-xs shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[var(--text-primary)]">
                            {s.name} &bull; <span className="font-normal text-[var(--text-muted)]">{s.address || 'Sin dirección'}</span>
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Ingresos: ${ingSede.toLocaleString()} &bull; Egresos: ${egrSede.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                          Neto acumulado
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
        </>
      )}
    </div>
  );
}
