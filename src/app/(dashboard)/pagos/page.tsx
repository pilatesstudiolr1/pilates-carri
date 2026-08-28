'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ComprobantePagoModal } from '@/components/pagos/ComprobantePagoModal';
import { Alumna, Pago, MetodoPago } from '@/types/database';
import { getPagos, registrarPago, deletePago } from '@/lib/services/pagos';
import { getAlumnas } from '@/lib/services/alumnas';
import { useUser } from '@/hooks/useUser';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  CreditCard,
  Plus,
  DollarSign,
  Calendar,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  Send,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowUpRight,
  Check,
  FileText,
} from 'lucide-react';

export default function PagosPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const { profile } = useUser();
  const isAdmin = profile?.role === 'ADMIN';

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Comprobante
  const [selectedComprobantePago, setSelectedComprobantePago] = useState<Pago | null>(null);
  const [isComprobanteModalOpen, setIsComprobanteModalOpen] = useState(false);

  // Formulario Registrar Pago
  const [selectedAlumnaId, setSelectedAlumnaId] = useState('');
  const [concepto, setConcepto] = useState('Mensualidad');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia');
  const [fechaPago, setFechaPago] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mesAbonado, setMesAbonado] = useState('Agosto de 2026');
  const [observaciones, setObservaciones] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const [pagosRes, alumnasRes] = await Promise.all([
      getPagos(),
      getAlumnas({ limit: 300 }),
    ]);

    if (pagosRes.error) {
      setErrorMsg(pagosRes.error);
    } else {
      setPagos(pagosRes.data || []);
    }

    setAlumnas(alumnasRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Al cambiar la alumna seleccionada, autocompletar el monto de su plan
  const handleAlumnaChange = (alumnaId: string) => {
    setSelectedAlumnaId(alumnaId);
    const alum = alumnas.find((a) => a.id === alumnaId);
    if (alum && alum.plan_amount) {
      setMonto(alum.plan_amount.toString());
    }
  };

  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedAlumnaId) {
      setErrorMsg('Debes seleccionar una alumna para registrar el pago');
      return;
    }

    const amountNum = parseFloat(monto);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('El monto del pago debe ser mayor a 0');
      return;
    }

    setSubmitting(true);

    const nextDueDateObj = new Date(fechaPago);
    nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 1);
    const nextDueDate = nextDueDateObj.toISOString().split('T')[0];

    const { data: newPago, error } = await registrarPago({
      alumna_id: selectedAlumnaId,
      amount: amountNum,
      payment_method: metodoPago,
      due_date: nextDueDate,
      concept: concepto,
      billing_month: mesAbonado,
      notes: observaciones.trim() || undefined,
    });

    setSubmitting(false);

    if (error || !newPago) {
      setErrorMsg(error || 'Error al registrar el pago');
      return;
    }

    setSuccessMsg('Pago registrado e ingresado a caja exitosamente');

    // Asociar datos de la alumna para el modal de comprobante
    const alum = alumnas.find((a) => a.id === selectedAlumnaId);
    const pagoConAlumna: Pago = {
      ...newPago,
      alumna: alum || undefined,
    };

    setSelectedComprobantePago(pagoConAlumna);
    setIsComprobanteModalOpen(true);

    setSelectedAlumnaId('');
    setMonto('');
    setObservaciones('');
    fetchData();
  };

  const handleDeletePagoConfirm = async (pagoId: string) => {
    const isOk = await confirm({
      title: 'Eliminar registro de pago',
      message: '¿Estás seguro de eliminar este registro de pago? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      variant: 'danger',
    });
    if (!isOk) return;

    const { error } = await deletePago(pagoId);
    if (error) {
      await alertDialog({
        title: 'Error de pago',
        message: `Error al eliminar: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchData();
    }
  };

  const sendWhatsAppRecordatorio = (alumna: Alumna) => {
    if (!alumna.phone) return;
    const phoneClean = alumna.phone.replace(/\D/g, '');
    const phoneFormatted = phoneClean.startsWith('54') ? phoneClean : `549${phoneClean}`;
    const textMsg = encodeURIComponent(
      `Hola ${alumna.first_name}! Te recordamos que tu cuota mensual de Pilates por $${(alumna.plan_amount || 0).toLocaleString()} se encuentra vencida. Te pedimos regularizarla para mantener tu turno fijo. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneFormatted}?text=${textMsg}`, '_blank');
  };

  // Filtrar alumnas vencidas
  const hoyStr = new Date().toISOString().split('T')[0];
  const alumnasVencidas = alumnas.filter((a) => a.billing_due_date && a.billing_due_date < hoyStr);

  // Totales de recaudación por medio de pago (calculados de forma robusta)
  const totalTransferencias = pagos
    .filter((p) => (p.payment_method || '').toLowerCase() === 'transferencia')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalEfectivo = pagos
    .filter((p) => (p.payment_method || '').toLowerCase() === 'efectivo')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalMercadoPago = pagos
    .filter((p) => {
      const m = (p.payment_method || '').toLowerCase();
      return m === 'mercado_pago' || m === 'mercadopago' || m === 'mp';
    })
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalTarjeta = pagos
    .filter((p) => {
      const m = (p.payment_method || '').toLowerCase();
      return m === 'tarjeta' || m === 'pos' || m === 'debito';
    })
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalRegistrado = pagos.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Filtrar historial de pagos
  const pagosFiltrados = pagos.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const nombre = p.alumna ? `${p.alumna.first_name} ${p.alumna.last_name || ''}`.toLowerCase() : '';
    const dni = p.alumna?.dni?.toLowerCase() || '';
    const metodo = (p.payment_method || '').toLowerCase();
    const conceptoStr = (p.concept || '').toLowerCase();
    const notas = (p.notes || '').toLowerCase();
    return nombre.includes(term) || dni.includes(term) || metodo.includes(term) || conceptoStr.includes(term) || notas.includes(term);
  });

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-[var(--text-primary)] max-w-[var(--page-max-width)] mx-auto pb-16">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-meadow text-[11px] font-medium px-3 py-0.5 uppercase">
              Pilates Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Registro y Control de Pagos
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Gestión de mensualidades, emisión de comprobantes PDF y cobros por WhatsApp.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-[12px] bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-[12px] bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BLOQUE 1: Registrar pago (Formulario Lattice Limpio) */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--badge-meadow-text)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Registrar Nuevo Cobro
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">Completa los datos del cobro</span>
        </div>

        <form onSubmit={handleGuardarPago} className="flex flex-col gap-4">
          {/* Fila 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Alumna *
              </label>
              <select
                value={selectedAlumnaId}
                onChange={(e) => handleAlumnaChange(e.target.value)}
                className="w-full h-10 px-3 rounded-[12px] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-focus)] font-semibold cursor-pointer"
                required
              >
                <option value="">Seleccionar alumna...</option>
                {alumnas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.last_name ? `${a.last_name}, ` : ''}{a.first_name} &bull; DNI: {a.dni || 'Sin DNI'} &bull; Tel: {a.phone || 'Sin tel'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Concepto
              </label>
              <Input
                placeholder="Ej. Mensualidad 2x semana"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Monto ($ ARS) *
              </label>
              <Input
                type="number"
                placeholder="55000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full h-10 px-3 rounded-[12px] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-focus)] font-medium capitalize cursor-pointer"
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="tarjeta">Débito / Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Fecha de Pago
              </label>
              <Input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Mes Abonado
              </label>
              <Input
                placeholder="Ej. Agosto de 2026"
                value={mesAbonado}
                onChange={(e) => setMesAbonado(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Observaciones
              </label>
              <Input
                placeholder="Notas opcionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          {/* Botón de Acción Principal y Destacado */}
          <div className="flex justify-end pt-3 border-t border-[var(--border-default)]">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              icon={<Send className="h-4 w-4" />}
            >
              Guardar pago y generar comprobante
            </Button>
          </div>
        </form>
      </div>

      {/* BLOQUE 2: Resumen de Ingresos (Métricas Financieras Consolidadas) */}
      {isAdmin && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border-default)] pb-4">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-[var(--badge-meadow-text)] shrink-0" />
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Resumen de Ingresos
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Totales consolidados del período por método de cobro
                </p>
              </div>
            </div>

            <div className="text-xs font-bold px-3 py-1 rounded-[22px] bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] shrink-0">
              Total Histórico ({pagos.length} cobros)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Registrado (Card Destacada) */}
            <div className="p-5 rounded-[14px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--border-default)] flex flex-col justify-between shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">Total Registrado</span>
                <Wallet className="h-4 w-4 opacity-90" />
              </div>
              <p className="text-2xl font-black my-2 leading-none font-mono">${totalRegistrado.toLocaleString('es-AR')}</p>
              <span className="text-[11px] opacity-80 font-semibold">{pagos.length} cobros realizados</span>
            </div>

            {/* Transferencias */}
            <div className="p-4 rounded-[14px] bg-[var(--bg-primary)] border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">Transferencias</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)] font-mono">${totalTransferencias.toLocaleString('es-AR')}</p>
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3 text-emerald-600" /> Cuenta bancaria
              </span>
            </div>

            {/* Efectivo */}
            <div className="p-4 rounded-[14px] bg-[var(--bg-primary)] border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">Efectivo</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)] font-mono">${totalEfectivo.toLocaleString('es-AR')}</p>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-0.5">
                <Check className="h-3 w-3 text-emerald-600" /> En caja física
              </span>
            </div>

            {/* Mercado Pago */}
            <div className="p-4 rounded-[14px] bg-[var(--bg-primary)] border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">Mercado Pago</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)] font-mono">${totalMercadoPago.toLocaleString('es-AR')}</p>
              <span className="text-[10px] text-[var(--text-secondary)]">Cobros digitales</span>
            </div>

            {/* Tarjeta */}
            <div className="p-4 rounded-[14px] bg-[var(--bg-primary)] border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider">Tarjeta</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)] font-mono">${totalTarjeta.toLocaleString('es-AR')}</p>
              <span className="text-[10px] text-[var(--text-secondary)]">POS / Terminal</span>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 3: Alumnas con Mensualidad Vencida */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Alumnas con Mensualidad Vencida
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Notifica directamente por WhatsApp a quienes adeudan su cuota
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-[22px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0">
            {alumnasVencidas.length} pendientes
          </span>
        </div>

        {alumnasVencidas.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-6 text-center">
            No hay alumnas registradas con mensualidad vencida en este momento.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-default)] max-h-80 overflow-y-auto custom-scrollbar">
            {alumnasVencidas.map((alum) => (
              <div
                key={alum.id}
                className="py-3.5 px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[var(--bg-tertiary)] rounded-[10px] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs shrink-0">
                    {alum.first_name[0]}{(alum.last_name || '')[0] || ''}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] capitalize">
                      {alum.first_name} {alum.last_name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Venció el <span className="font-bold text-rose-600 dark:text-rose-400">{alum.billing_due_date}</span> &bull; Plan: {alum.plan || 'Estándar'} &mdash; <strong className="text-[var(--text-primary)] font-mono">${(alum.plan_amount || 0).toLocaleString('es-AR')}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => sendWhatsAppRecordatorio(alum)}
                  className="px-3.5 py-1.5 rounded-[22px] bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-[#25D366]/30 shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar Recordatorio
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOQUE 4: Historial de Pagos */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-default)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Historial de Pagos ({pagosFiltrados.length})
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Consulta, imprime comprobantes oficiales y gestiona los registros de cobro
            </p>
          </div>

          <div className="w-full sm:w-80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Buscar por alumna, concepto o método..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-xs w-full"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Spinner size="md" />
            <span className="text-xs text-[var(--text-secondary)]">Cargando historial de pagos...</span>
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-12 text-center">
            {search ? 'No se encontraron pagos con ese criterio de búsqueda.' : 'No hay historial de pagos registrado aún.'}
          </p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  <th className="py-3 px-3 font-semibold">Fecha</th>
                  <th className="py-3 px-3 font-semibold">Alumna</th>
                  <th className="py-3 px-3 font-semibold">Concepto</th>
                  <th className="py-3 px-3 font-bold text-[var(--text-primary)]">Monto</th>
                  <th className="py-3 px-3 font-semibold">Método</th>
                  <th className="py-3 px-3 font-semibold text-center">Comprobante</th>
                  <th className="py-3 px-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {pagosFiltrados.map((pago) => (
                  <tr key={pago.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text-secondary)]">
                      {pago.payment_date}
                    </td>

                    <td className="py-3.5 px-3 font-bold capitalize">
                      {pago.alumna ? `${pago.alumna.first_name} ${pago.alumna.last_name || ''}` : 'Alumna'}
                    </td>

                    <td className="py-3.5 px-3 text-[var(--text-secondary)] font-medium">
                      {pago.concept || 'Mensualidad'}
                    </td>

                    <td className="py-3.5 px-3 font-bold font-mono text-sm text-[var(--text-primary)]">
                      ${(Number(pago.amount) || 0).toLocaleString('es-AR')}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-[22px] bg-[var(--bg-primary)] border border-[var(--border-default)] font-semibold text-[11px] capitalize text-[var(--text-primary)]">
                        {(pago.payment_method || '').replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComprobantePago(pago);
                          setIsComprobanteModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-[22px] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-[var(--border-default)] shadow-2xs"
                      >
                        <Receipt className="h-3.5 w-3.5 text-[var(--badge-meadow-text)]" /> Ver / PDF
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComprobantePago(pago);
                            setIsComprobanteModalOpen(true);
                          }}
                          className="p-1.5 rounded-[8px] bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] transition-colors cursor-pointer"
                          title="Enviar por WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePagoConfirm(pago.id)}
                          className="p-1.5 rounded-[8px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar Pago"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Comprobante PDF / WhatsApp */}
      {isComprobanteModalOpen && selectedComprobantePago && (
        <ComprobantePagoModal
          isOpen={isComprobanteModalOpen}
          pago={selectedComprobantePago}
          onClose={() => {
            setIsComprobanteModalOpen(false);
            setSelectedComprobantePago(null);
          }}
        />
      )}
    </div>
  );
}
