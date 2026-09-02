'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { CajaMovimiento, MetodoPago, Sede } from '@/types/database';
import { getMovimientos, registrarMovimiento, deleteMovimiento } from '@/lib/services/caja';
import { getSedes } from '@/lib/services/sedes';
import { METODOS_PAGO } from '@/lib/constants';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useUser } from '@/hooks/useUser';
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';

const ITEMS_PER_PAGE = 30;

function formatMonthLabel(monthKey: string) {
  if (!monthKey || monthKey === 'ALL') return 'Todos los Meses';
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export default function CajaPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const { profile } = useUser();
  const isAdmin = profile?.role === 'ADMIN';

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [tipoFilter, setTipoFilter] = useState<'ALL' | 'INGRESO' | 'EGRESO'>('ALL');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal nuevo movimiento
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
      setMovimientos(movsRes.data || []);
    }

    setLoading(false);
  }, [selectedSedeId, movimientoSedeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lista de meses únicos disponibles en los movimientos
  const availableMonths = Array.from(
    new Set(
      movimientos
        .map((m) => (m.creado_en ? m.creado_en.slice(0, 7) : ''))
        .filter(Boolean)
    )
  ).sort().reverse();

  const handleCreateMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0) {
      await alertDialog({
        title: 'Monto o concepto inválido',
        message: 'Por favor ingresa un concepto y un monto válido mayor a 0.',
        variant: 'warning',
      });
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
      await alertDialog({
        title: 'Error de Movimiento',
        message: `Error al registrar movimiento: ${error}`,
        variant: 'danger',
      });
    } else {
      setConcepto('');
      setMonto('');
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleDeleteMovimiento = async (mov: CajaMovimiento) => {
    const isConfirmed = await confirm({
      title: 'Eliminar Movimiento de Caja',
      message: `¿Estás seguro de eliminar el movimiento "${mov.concepto}" por $${(Number(mov.monto) || 0).toLocaleString('es-AR')}? Si corresponde a un cobro registrado, también se anulará el registro para que la caja quede limpia.`,
      confirmText: 'Sí, eliminar',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    const { error } = await deleteMovimiento(mov.id);
    if (error) {
      await alertDialog({
        title: 'Error al eliminar',
        message: `No se pudo eliminar el movimiento: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchData();
    }
  };

  // Filtrado de movimientos por Mes, Tipo y Búsqueda
  const movimientosFiltrados = movimientos.filter((m) => {
    if (selectedMonth !== 'ALL') {
      const mMonth = m.creado_en ? m.creado_en.slice(0, 7) : '';
      if (mMonth !== selectedMonth) return false;
    }
    if (tipoFilter !== 'ALL' && m.tipo !== tipoFilter) {
      return false;
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      const conc = (m.concepto || '').toLowerCase();
      const metodo = (m.metodo_pago || '').toLowerCase();
      if (!conc.includes(term) && !metodo.includes(term)) return false;
    }
    return true;
  });

  // Métricas Calculadas Dinámicamente para el filtro activo
  const totalIngresos = movimientosFiltrados
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

  const totalEgresos = movimientosFiltrados
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

  const saldoCaja = totalIngresos - totalEgresos;

  // Paginación
  const totalPages = Math.ceil(movimientosFiltrados.length / ITEMS_PER_PAGE) || 1;
  const paginatedMovimientos = movimientosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-[var(--text-primary)] max-w-[var(--page-max-width)] mx-auto pb-16">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-meadow text-[11px] font-medium px-3 py-0.5 uppercase">
              Pilates Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Caja y Movimientos Diarios
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Arqueo, desglose por métodos de pago e ingresos/egresos filtrados por sede y mes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setTipo('EGRESO');
              setIsModalOpen(true);
            }}
            variant="outline"
            icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
          >
            Registrar Gasto
          </Button>

          <Button
            onClick={() => {
              setTipo('INGRESO');
              setIsModalOpen(true);
            }}
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
          >
            Registrar Ingreso
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-[12px] bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-semibold shadow-xs">
          {errorMsg}
        </div>
      )}

      {/* 1. BARRA DE FILTROS (SEDE + MES + TIPO + BUSCADOR) */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selector de Sede */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1 mr-1">
              <Building2 className="h-3.5 w-3.5 text-[var(--badge-meadow-text)]" /> Sede:
            </span>
            <button
              onClick={() => {
                setSelectedSedeId('ALL');
                setCurrentPage(1);
              }}
              className={`filter-pill ${selectedSedeId === 'ALL' ? 'filter-pill-active' : ''}`}
            >
              Todas las Sedes
            </button>
            {sedes.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSedeId(s.id);
                  setCurrentPage(1);
                }}
                className={`filter-pill ${selectedSedeId === s.id ? 'filter-pill-active' : ''}`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Buscador Rápido */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Buscar concepto o método..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 text-xs w-full"
            />
          </div>
        </div>

        {/* Fila 2: Filtro por Mes y Tipo de Movimiento */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[var(--border-default)]">
          {/* Selector de Mes: Histórico vs Mes Corriente */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1 mr-1">
              <Calendar className="h-3.5 w-3.5 text-[var(--badge-meadow-text)]" /> Período:
            </span>
            <button
              onClick={() => {
                setSelectedMonth('ALL');
                setCurrentPage(1);
              }}
              className={`filter-pill ${selectedMonth === 'ALL' ? 'filter-pill-active' : ''}`}
            >
              Histórico
            </button>
            <button
              onClick={() => {
                const currentMonthKey = new Date().toISOString().slice(0, 7);
                setSelectedMonth(currentMonthKey);
                setCurrentPage(1);
              }}
              className={`filter-pill ${selectedMonth !== 'ALL' ? 'filter-pill-active' : ''}`}
            >
              Mes Corriente
            </button>
          </div>

          {/* Selector Tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">
              Tipo:
            </span>
            <button
              onClick={() => {
                setTipoFilter('ALL');
                setCurrentPage(1);
              }}
              className={`filter-pill ${tipoFilter === 'ALL' ? 'filter-pill-active' : ''}`}
            >
              Todos
            </button>
            <button
              onClick={() => {
                setTipoFilter('INGRESO');
                setCurrentPage(1);
              }}
              className={`filter-pill ${tipoFilter === 'INGRESO' ? 'filter-pill-active-success' : ''}`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> Ingresos
            </button>
            <button
              onClick={() => {
                setTipoFilter('EGRESO');
                setCurrentPage(1);
              }}
              className={`filter-pill ${tipoFilter === 'EGRESO' ? 'filter-pill-active-danger' : ''}`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" /> Egresos
            </button>
          </div>
        </div>
      </div>

      {/* 2. TARJETAS DE ESTADÍSTICAS Y SALDO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Saldo Actual */}
        <div className="p-5 rounded-[14px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--border-default)] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-85">
              Saldo en Caja {selectedMonth !== 'ALL' ? `(${formatMonthLabel(selectedMonth)})` : ''}
            </span>
            <Wallet className="h-5 w-5 opacity-90" />
          </div>
          <p className="text-2xl sm:text-3xl font-black my-2 font-mono leading-none">
            ${saldoCaja.toLocaleString('es-AR')} ARS
          </p>
          <span className="text-xs opacity-80 font-medium">
            Balance neto de ingresos menos egresos
          </span>
        </div>

        {/* Total Ingresos */}
        <div className="p-5 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              Total Ingresos
            </span>
            <ArrowUpRight className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black my-2 font-mono text-emerald-700 dark:text-emerald-400 leading-none">
            +${totalIngresos.toLocaleString('es-AR')} ARS
          </p>
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            Cobros de cuotas e ingresos registrados
          </span>
        </div>

        {/* Total Egresos */}
        <div className="p-5 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              Total Egresos / Gastos
            </span>
            <ArrowDownLeft className="h-5 w-5 text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black my-2 font-mono text-rose-700 dark:text-rose-400 leading-none">
            -${totalEgresos.toLocaleString('es-AR')} ARS
          </p>
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            Sueldos, alquileres y gastos operativos
          </span>
        </div>
      </div>

      {/* 3. TABLA DE MOVIMIENTOS CON BADGES DE ALTO CONTRASTE */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[var(--badge-meadow-text)]" /> Movimientos Registrados ({movimientosFiltrados.length})
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Página {currentPage} de {totalPages} (30 por página)
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-[var(--text-secondary)]">Cargando movimientos de caja...</p>
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-12 text-center">
            No hay movimientos registrados para los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  <th className="py-3 px-4 font-semibold">Tipo</th>
                  <th className="py-3 px-4 font-semibold">Concepto</th>
                  <th className="py-3 px-4 font-semibold">Método de Pago</th>
                  <th className="py-3 px-4 font-bold text-[var(--text-primary)]">Monto</th>
                  <th className="py-3 px-4 font-semibold text-right">Fecha y Hora</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold text-center w-20">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {paginatedMovimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    {/* BADGES SÓLIDOS DE MÁXIMO CONTRASTE Y NITIDEZ */}
                    <td className="py-3.5 px-4">
                      {mov.tipo === 'INGRESO' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[22px] bg-emerald-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-xs">
                          <ArrowUpRight className="h-3.5 w-3.5" /> Ingreso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[22px] bg-rose-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-xs">
                          <ArrowDownLeft className="h-3.5 w-3.5" /> Egreso
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-sm">
                      {mov.concepto}
                    </td>

                    <td className="py-3.5 px-4 capitalize text-[var(--text-secondary)] font-medium">
                      {(mov.metodo_pago || '').replace('_', ' ')}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-black text-sm">
                      {mov.tipo === 'INGRESO' ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          +${(Number(mov.monto) || 0).toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-rose-700 dark:text-rose-400">
                          -${(Number(mov.monto) || 0).toLocaleString('es-AR')}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right text-[var(--text-secondary)] font-mono text-[11px]">
                      {new Date(mov.creado_en).toLocaleString('es-AR', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteMovimiento(mov)}
                          className="p-1.5 rounded-[8px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Eliminar movimiento / pago ficticio (Solo Admin)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. BARRA DE PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-secondary)]">
              Mostrando <strong className="text-[var(--text-primary)] font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a{' '}
              <strong className="text-[var(--text-primary)] font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, movimientosFiltrados.length)}</strong> de{' '}
              <strong className="text-[var(--text-primary)] font-bold">{movimientosFiltrados.length}</strong> movimientos
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Anterior
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-xs text-[var(--text-muted)]">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                icon={<ChevronRight className="h-4 w-4" />}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

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
              className="w-full h-10 px-3 rounded-[12px] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-focus)] font-bold cursor-pointer"
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
              placeholder="Ej. 15000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              icon={<DollarSign className="h-4 w-4 text-[var(--text-muted)]" />}
              required
            />

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Método de Pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full h-10 px-3 rounded-[12px] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-focus)] font-medium cursor-pointer"
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
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Guardar Movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
