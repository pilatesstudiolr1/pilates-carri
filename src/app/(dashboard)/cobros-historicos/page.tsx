'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ComprobantePagoModal } from '@/components/pagos/ComprobantePagoModal';
import { EditarPagoModal } from '@/components/pagos/EditarPagoModal';
import { Pago, Sede, MetodoPago, TipoPago } from '@/types/database';
import { getPagos, deletePago } from '@/lib/services/pagos';
import { useUser } from '@/hooks/useUser';
import { useSede } from '@/hooks/useSede';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import { formatFechaArg, buildAvisoPagoWhatsAppMessage, openWhatsAppMessage } from '@/lib/utils';
import {
  Receipt,
  Search,
  Pencil,
  Trash2,
  Download,
  MessageCircle,
  ArrowLeft,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export type SortOption =
  | 'FECHA_DESC' // Últimas primero (más recientes a más antiguas)
  | 'FECHA_ASC'  // Primeras a últimas (más antiguas a más recientes)
  | 'MONTO_DESC' // Mayor a menor importe
  | 'MONTO_ASC'  // Menor a mayor importe
  | 'CLIENTE_ASC'// Cliente (A → Z)
  | 'CLIENTE_DESC'; // Cliente (Z → A)

export default function CobrosHistoricosPage() {
  const router = useRouter();
  const { profile, loading: userLoading } = useUser();
  const { sedes, selectedSedeId } = useSede();
  const { confirm: confirmDialog } = useConfirm();
  const toast = useToast();

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtros simples
  const [search, setSearch] = useState('');
  const [filtroSede, setFiltroSede] = useState<string>('ALL');
  const [filtroTipo, setFiltroTipo] = useState<string>('ALL');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  // Ordenamiento (Por defecto: Últimas primero)
  const [orden, setOrden] = useState<SortOption>('FECHA_DESC');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(20);

  // Modales de Acción
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [comprobantePago, setComprobantePago] = useState<Pago | null>(null);
  const [isComprobanteModalOpen, setIsComprobanteModalOpen] = useState(false);

  // Redirección si no es ADMIN
  useEffect(() => {
    if (!userLoading && profile && profile.role !== 'ADMIN') {
      router.push('/profesora');
    }
  }, [userLoading, profile, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const res = await getPagos({
      sedeId: filtroSede !== 'ALL' ? filtroSede : undefined,
    });

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setPagos(res.data || []);
    }
    setLoading(false);
  }, [filtroSede]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset de página al cambiar filtros u orden
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtroSede, filtroTipo, filtroPeriodo, orden]);

  const handleDeletePago = async (pago: Pago) => {
    const alumnaNombre = pago.alumna
      ? `${pago.alumna.first_name} ${pago.alumna.last_name || ''}`.trim()
      : 'esta alumna';

    const isConfirmed = await confirmDialog({
      title: 'Eliminar Registro de Cobro',
      message: `¿Estás seguro de eliminar el cobro de $${Number(pago.amount).toLocaleString('es-AR')} correspondiente a ${alumnaNombre}?\n\nEsta acción ajustará automáticamente la caja asociada y el vencimiento de la cuota.`,
      confirmText: 'Sí, eliminar cobro',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    const { error } = await deletePago(pago.id);
    if (error) {
      toast.error(error, 'Error al eliminar');
    } else {
      toast.success('El cobro fue eliminado del sistema y de la caja', 'Cobro Eliminado');
      fetchData();
    }
  };

  const handleSendWhatsApp = (pago: Pago) => {
    const phone = pago.alumna?.phone;
    if (!phone) {
      toast.warning('La alumna no tiene teléfono registrado', 'Sin Teléfono');
      return;
    }

    const alumnaNombre = pago.alumna
      ? `${pago.alumna.first_name} ${pago.alumna.last_name || ''}`.trim()
      : 'Alumna';

    const msg = buildAvisoPagoWhatsAppMessage({
      nombreCliente: alumnaNombre,
      monto: Number(pago.amount),
      concepto: pago.concept || 'Mensualidad Pilates',
      metodoPago: pago.payment_method,
      fechaPago: pago.payment_date,
      vencimientoCuota: pago.due_date,
      notas: pago.notes,
    });

    openWhatsAppMessage(phone, msg);
  };

  // Filtrado exhaustivo en memoria
  const pagosFiltrados = pagos.filter((p) => {
    // Filtro por Sede
    if (filtroSede !== 'ALL' && p.sede_id !== filtroSede) {
      return false;
    }

    // Filtro por Tipo de Pago
    if (filtroTipo !== 'ALL') {
      const pType = (p.payment_type || 'MENSUALIDAD').toUpperCase();
      if (pType !== filtroTipo) return false;
    }

    // Filtro por Período (YYYY-MM)
    if (filtroPeriodo) {
      const periodoVal = p.period || '';
      if (!periodoVal.startsWith(filtroPeriodo)) return false;
    }

    // Búsqueda por texto
    if (search.trim()) {
      const term = search.toLowerCase();
      const alumnaNombre = p.alumna
        ? `${p.alumna.first_name} ${p.alumna.last_name || ''}`.toLowerCase()
        : '';
      const dni = p.alumna?.dni?.toLowerCase() || '';
      const phone = p.alumna?.phone?.toLowerCase() || '';
      const concepto = (p.concept || '').toLowerCase();
      const metodo = (p.payment_method || '').toLowerCase();
      const notas = (p.notes || '').toLowerCase();
      const cobradoPor = (
        p.cobrado_por ||
        p.profesora?.full_name ||
        p.recorded_by_profile?.full_name ||
        ''
      ).toLowerCase();

      return (
        alumnaNombre.includes(term) ||
        dni.includes(term) ||
        phone.includes(term) ||
        concepto.includes(term) ||
        metodo.includes(term) ||
        notas.includes(term) ||
        cobradoPor.includes(term)
      );
    }

    return true;
  });

  // Ordenamiento
  const pagosOrdenados = useMemo(() => {
    return [...pagosFiltrados].sort((a, b) => {
      if (orden === 'FECHA_DESC') {
        const timeA = new Date(a.payment_date || a.created_at).getTime();
        const timeB = new Date(b.payment_date || b.created_at).getTime();
        return timeB - timeA;
      }
      if (orden === 'FECHA_ASC') {
        const timeA = new Date(a.payment_date || a.created_at).getTime();
        const timeB = new Date(b.payment_date || b.created_at).getTime();
        return timeA - timeB;
      }
      if (orden === 'MONTO_DESC') {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (orden === 'MONTO_ASC') {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }
      if (orden === 'CLIENTE_ASC') {
        const nomA = `${a.alumna?.first_name || ''} ${a.alumna?.last_name || ''}`.trim().toLowerCase();
        const nomB = `${b.alumna?.first_name || ''} ${b.alumna?.last_name || ''}`.trim().toLowerCase();
        return nomA.localeCompare(nomB);
      }
      if (orden === 'CLIENTE_DESC') {
        const nomA = `${a.alumna?.first_name || ''} ${a.alumna?.last_name || ''}`.trim().toLowerCase();
        const nomB = `${b.alumna?.first_name || ''} ${b.alumna?.last_name || ''}`.trim().toLowerCase();
        return nomB.localeCompare(nomA);
      }
      return 0;
    });
  }, [pagosFiltrados, orden]);

  // Paginación
  const totalItems = pagosOrdenados.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(totalItems / Number(pageSize)));
  const paginatedPagos = pageSize === 'ALL'
    ? pagosOrdenados
    : pagosOrdenados.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize));

  const hasActiveFilters = search || filtroSede !== 'ALL' || filtroTipo !== 'ALL' || filtroPeriodo || orden !== 'FECHA_DESC';

  const handleResetFilters = () => {
    setSearch('');
    setFiltroSede('ALL');
    setFiltroTipo('ALL');
    setFiltroPeriodo('');
    setOrden('FECHA_DESC');
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (profile?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="w-full pb-16 animate-fade-in text-[var(--text-primary)] space-y-4">
      {/* Cabecera limpia y directa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
        <div>
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al Portal</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Cobros Históricos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            icon={<RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Actualizar
          </Button>
          <Link href="/pagos">
            <Button variant="primary" size="sm" className="text-xs">
              Registrar Cobro
            </Button>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Filtros Simple y Directa */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar por cliente, vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-wood)] transition-colors"
          />
        </div>

        {/* Filtros y Orden */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Selector de Orden */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 rounded-lg border border-[var(--border-default)] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as SortOption)}
              className="h-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer pr-1"
              title="Ordenar registros"
            >
              <option value="FECHA_DESC" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Últimas a primeras (Más recientes)</option>
              <option value="FECHA_ASC" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Primeras a últimas (Más antiguas)</option>
              <option value="MONTO_DESC" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Mayor importe primero</option>
              <option value="MONTO_ASC" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Menor importe primero</option>
              <option value="CLIENTE_ASC" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Cliente (A → Z)</option>
              <option value="CLIENTE_DESC" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Cliente (Z → A)</option>
            </select>
          </div>

          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
            title="Filtrar por período (mes)"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 cursor-pointer whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla con el Formato Original de Pagos pero Simple y Directo */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-[var(--text-muted)] gap-2">
            <Spinner size="md" />
            <span>Cargando cobros históricos...</span>
          </div>
        ) : paginatedPagos.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-secondary)] space-y-1">
            <Receipt className="h-8 w-8 text-[var(--text-muted)] mx-auto opacity-50 mb-2" />
            <p className="font-bold text-sm text-[var(--text-primary)]">
              No se encontraron cobros registrados
            </p>
            <p className="text-[var(--text-muted)]">
              {hasActiveFilters
                ? 'No hay registros que coincidan con los filtros aplicados.'
                : 'Aún no se han registrado cobros en el sistema.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] bg-[var(--bg-tertiary)]/40">
                  {/* Fecha */}
                  <th
                    onClick={() => setOrden((prev) => (prev === 'FECHA_DESC' ? 'FECHA_ASC' : 'FECHA_DESC'))}
                    className="py-3 px-3.5 font-semibold cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors"
                    title="Ordenar por fecha (clic para alternar)"
                  >
                    <span className="inline-flex items-center gap-1">
                      Fecha
                      {orden === 'FECHA_DESC' && <ArrowDown className="h-3 w-3 text-emerald-500" />}
                      {orden === 'FECHA_ASC' && <ArrowUp className="h-3 w-3 text-emerald-500" />}
                      {orden !== 'FECHA_DESC' && orden !== 'FECHA_ASC' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </span>
                  </th>

                  {/* Alumna */}
                  <th
                    onClick={() => setOrden((prev) => (prev === 'CLIENTE_ASC' ? 'CLIENTE_DESC' : 'CLIENTE_ASC'))}
                    className="py-3 px-3.5 font-semibold cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors"
                    title="Ordenar por alumna (A-Z / Z-A)"
                  >
                    <span className="inline-flex items-center gap-1">
                      Alumna
                      {orden === 'CLIENTE_ASC' && <ArrowUp className="h-3 w-3 text-emerald-500" />}
                      {orden === 'CLIENTE_DESC' && <ArrowDown className="h-3 w-3 text-emerald-500" />}
                      {orden !== 'CLIENTE_ASC' && orden !== 'CLIENTE_DESC' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </span>
                  </th>

                  {/* Concepto */}
                  <th className="py-3 px-3.5 font-semibold">Concepto</th>

                  {/* Monto */}
                  <th
                    onClick={() => setOrden((prev) => (prev === 'MONTO_DESC' ? 'MONTO_ASC' : 'MONTO_DESC'))}
                    className="py-3 px-3.5 font-bold text-[var(--text-primary)] cursor-pointer select-none hover:text-emerald-500 transition-colors"
                    title="Ordenar por monto"
                  >
                    <span className="inline-flex items-center gap-1">
                      Monto
                      {orden === 'MONTO_DESC' && <ArrowDown className="h-3 w-3 text-emerald-500" />}
                      {orden === 'MONTO_ASC' && <ArrowUp className="h-3 w-3 text-emerald-500" />}
                      {orden !== 'MONTO_DESC' && orden !== 'MONTO_ASC' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </span>
                  </th>

                  {/* Método */}
                  <th className="py-3 px-3.5 font-semibold">Método</th>

                  {/* Comprobante */}
                  <th className="py-3 px-3.5 font-semibold text-center">Comprobante</th>

                  {/* Acciones */}
                  <th className="py-3 px-3.5 font-semibold text-right pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {paginatedPagos.map((pago) => {
                  const alumna = pago.alumna;
                  const alumnaNombre = alumna
                    ? `${alumna.first_name} ${alumna.last_name || ''}`.trim()
                    : 'Alumna';

                  const cobradoPorNombre =
                    pago.cobrado_por ||
                    pago.profesora?.full_name ||
                    pago.recorded_by_profile?.full_name ||
                    'Juliana';

                  const isCombinado = Boolean(
                    (pago as any).split_details ||
                    (pago.notes && pago.notes.includes('[Métodos de pago:'))
                  );

                  return (
                    <tr
                      key={pago.id}
                      className="hover:bg-[var(--bg-tertiary)]/70 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                        {pago.payment_date}
                      </td>

                      {/* Alumna */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold capitalize text-xs text-[var(--text-primary)]">
                          {alumnaNombre}
                        </div>
                        {alumna?.dni && (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                            DNI: {alumna.dni}
                          </span>
                        )}
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1 font-medium">
                          <span className="text-[var(--text-muted)]">Cobrado por:</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {cobradoPorNombre}
                          </span>
                        </div>
                      </td>

                      {/* Concepto */}
                      <td className="py-3.5 px-3.5">
                        <div className="text-xs font-medium text-[var(--text-primary)]">
                          {pago.concept || 'Cuota mensualidad'}
                        </div>
                        {pago.period && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block mt-0.5">
                            Período: {pago.period}
                          </span>
                        )}
                        {filtroSede === 'ALL' && pago.sede_id && (
                          <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-0.5">
                            {sedes.find((s) => s.id === pago.sede_id)?.name || ''}
                          </span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="py-3.5 px-3.5 font-bold font-mono text-sm text-[var(--text-primary)] whitespace-nowrap">
                        ${(Number(pago.amount) || 0).toLocaleString('es-AR')}
                      </td>

                      {/* Método */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {isCombinado ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-[22px] bg-amber-500/15 border border-amber-500/30 font-bold text-[10px] text-amber-800 dark:text-amber-300 inline-block">
                              Pago combinado
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] block font-medium">
                              {pago.notes?.match(/\[Métodos de pago:\s*([^\]]+)\]/)?.[1] || 'Varios métodos'}
                            </span>
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-default)] font-semibold text-[11px] capitalize text-[var(--text-primary)] inline-block">
                            {(pago.payment_method || 'efectivo').replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Comprobante */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setComprobantePago(pago);
                            setIsComprobanteModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-[var(--border-default)] shadow-2xs"
                        >
                          <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Ver / PDF
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Editar */}
                          <button
                            type="button"
                            title="Editar Cobro"
                            onClick={() => {
                              setEditingPago(pago);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(pago)}
                            className="p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-colors cursor-pointer"
                            title="Enviar Comprobante por WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDeletePago(pago)}
                            className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                            title="Eliminar Pago"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación Inferior Simple */}
        {!loading && paginatedPagos.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-[var(--border-default)] bg-[var(--bg-primary)]/40 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span>Filas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setPageSize(val as any);
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer font-bold"
              >
                <option value={15} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">15</option>
                <option value={30} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">30</option>
                <option value={50} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">50</option>
                <option value="ALL" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Todas</option>
              </select>
              <span>
                (Mostrando {(currentPage - 1) * (pageSize === 'ALL' ? totalItems : Number(pageSize)) + 1} -{' '}
                {pageSize === 'ALL' ? totalItems : Math.min(currentPage * Number(pageSize), totalItems)} de {totalItems})
              </span>
            </div>

            {pageSize !== 'ALL' && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs font-bold"
                >
                  <ChevronLeft className="h-4 w-4 mr-0.5" /> Anterior
                </Button>
                <span className="px-3 font-mono font-bold text-[var(--text-primary)]">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs font-bold"
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para Editar Cobro */}
      {editingPago && (
        <EditarPagoModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPago(null);
          }}
          pago={editingPago}
          sedes={sedes}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Modal para Ver Comprobante Detallado */}
      {comprobantePago && (
        <ComprobantePagoModal
          isOpen={isComprobanteModalOpen}
          pago={comprobantePago}
          onClose={() => {
            setIsComprobanteModalOpen(false);
            setComprobantePago(null);
          }}
        />
      )}
    </div>
  );
}
