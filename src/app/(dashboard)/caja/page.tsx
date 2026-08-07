'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { CajaMovimiento, MetodoPago, Sede } from '@/types/database';
import { getMovimientos, registrarMovimiento } from '@/lib/services/caja';
import { getSedes } from '@/lib/services/sedes';
import { METODOS_PAGO } from '@/lib/constants';
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, Filter, Building2 } from 'lucide-react';

export default function CajaPage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('ALL');
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [movimientoSedeId, setMovimientoSedeId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    const [sedesRes, movsRes] = await Promise.all([
      getSedes({ isActive: 'ALL' }),
      getMovimientos({ sedeId: selectedSedeId }),
    ]);

    if (sedesRes.error) {
      setErrorMsg(sedesRes.error);
    } else {
      setSedes(sedesRes.data);
      if (sedesRes.data.length > 0 && !movimientoSedeId) {
        setMovimientoSedeId(sedesRes.data[0].id);
      }
    }

    if (movsRes.error) {
      setErrorMsg(movsRes.error);
    } else {
      setMovimientos(movsRes.data);
    }

    setLoading(false);
  }, [selectedSedeId, movimientoSedeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0) {
      alert('Ingresa un concepto y un monto válido');
      return;
    }

    setSubmitting(true);
    const { error } = await registrarMovimiento({
      tipo,
      concepto: concepto.trim(),
      monto: parseFloat(monto),
      metodo_pago: metodoPago,
      sede_id: movimientoSedeId || null,
    });
    setSubmitting(false);

    if (error) {
      alert(`Error al registrar: ${error}`);
    } else {
      setIsModalOpen(false);
      setConcepto('');
      setMonto('');
      fetchData();
    }
  };

  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((acc, m) => acc + m.monto, 0);

  const totalEgresos = movimientos
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((acc, m) => acc + m.monto, 0);

  const saldoCaja = totalIngresos - totalEgresos;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-[var(--text-primary)]">
      {/* Encabezado y Filtro Dinámico de Sede */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[var(--color-wood)]" /> Caja y Movimientos Diarios
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Arqueo, desglose por métodos de pago e ingresos/egresos filtrados por sede
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Sede */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] p-1.5 rounded-xl border border-[var(--border-default)] mr-2">
            <Filter className="h-4 w-4 text-[var(--color-wood)] ml-1 shrink-0" />
            <select
              value={selectedSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-[var(--bg-secondary)]">Todas las Sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id} className="bg-[var(--bg-secondary)]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => {
              setTipo('EGRESO');
              setIsModalOpen(true);
            }}
            variant="outline"
            icon={<TrendingDown className="h-4 w-4 text-[var(--color-danger)]" />}
          >
            Registrar Gasto
          </Button>

          <Button
            onClick={() => {
              setTipo('INGRESO');
              setIsModalOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            Registrar Ingreso
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3 border-l-4 border-l-[var(--color-wood)] shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/15 flex items-center justify-center text-[var(--color-wood)] shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Saldo Actual en Caja</p>
            <p className="text-xl font-extrabold text-[var(--text-primary)]">${saldoCaja.toLocaleString()} ARS</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-l-4 border-l-[var(--color-success)] shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[var(--color-success-soft)] flex items-center justify-center text-[var(--color-success)] shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total Ingresos</p>
            <p className="text-lg font-extrabold text-[var(--text-primary)]">${totalIngresos.toLocaleString()} ARS</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-l-4 border-l-[var(--color-danger)] shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[var(--color-danger-soft)] flex items-center justify-center text-[var(--color-danger)] shrink-0">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total Egresos / Gastos</p>
            <p className="text-lg font-extrabold text-[var(--text-primary)]">${totalEgresos.toLocaleString()} ARS</p>
          </div>
        </Card>
      </div>

      {/* Tabla de Movimientos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando movimientos de caja dinámicos...</p>
        </div>
      ) : movimientos.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 border border-[var(--border-default)]">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
            <Wallet className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No hay movimientos registrados para la sede seleccionada
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Ingresa un gasto o ingreso para actualizar el saldo.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border border-[var(--border-default)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-bold uppercase tracking-wider border-b border-[var(--border-default)]">
                <tr>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Concepto</th>
                  <th className="p-3.5">Método de Pago</th>
                  <th className="p-3.5">Monto</th>
                  <th className="p-3.5 text-right">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="p-3.5">
                      <Badge variant={mov.tipo === 'INGRESO' ? 'success' : 'danger'}>
                        {mov.tipo}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-bold">{mov.concepto}</td>
                    <td className="p-3.5 capitalize font-medium">{mov.metodo_pago.replace('_', ' ')}</td>
                    <td className={`p-3.5 font-black ${mov.tipo === 'INGRESO' ? 'text-[var(--color-wood)]' : 'text-[var(--color-danger)]'}`}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'}${mov.monto.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right text-[var(--text-muted)] font-mono">
                      {new Date(mov.creado_en).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Nuevo Movimiento */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={tipo === 'INGRESO' ? 'Registrar Ingreso de Caja' : 'Registrar Gasto / Egreso'}
        description="Agrega un movimiento manual para la sede seleccionada"
        size="md"
      >
        <form onSubmit={handleCreateMovimiento} className="flex flex-col gap-4 text-[var(--text-primary)]">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
              Sede Destino
            </label>
            <select
              value={movimientoSedeId}
              onChange={(e) => setMovimientoSedeId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-bold"
            >
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Concepto *"
            placeholder={tipo === 'INGRESO' ? 'Ej. Pago clase suelta o pase' : 'Ej. Compra de insumos o limpieza'}
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monto ($ ARS) *"
              type="number"
              min="0"
              step="100"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              icon={<DollarSign className="h-4 w-4 text-[var(--color-wood)]" />}
              required
            />

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Método de Pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Guardar Movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
