'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alumna, Pago, MetodoPago } from '@/types/database';
import { getPagos, registrarPago, deletePago } from '@/lib/services/pagos';
import { getAlumnas } from '@/lib/services/alumnas';
import { useUser } from '@/hooks/useUser';
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
  User,
  Clock,
  Send,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function PagosPage() {
  const { profile } = useUser();
  const isAdmin = profile?.role === 'ADMIN';

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Formulario Registrar Pago
  const [selectedAlumnaId, setSelectedAlumnaId] = useState('');
  const [concepto, setConcepto] = useState('Mensualidad');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('TRANSFERENCIA');
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
      getAlumnas({ limit: 200 }),
    ]);

    if (pagosRes.error) {
      setErrorMsg(pagosRes.error);
    } else {
      setPagos(pagosRes.data);
    }

    setAlumnas(alumnasRes.data);
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

    // Enviar comprobante por WhatsApp si la alumna tiene telefono
    const alum = alumnas.find((a) => a.id === selectedAlumnaId);
    if (alum && alum.phone) {
      const phoneClean = alum.phone.replace(/\D/g, '');
      const textMsg = encodeURIComponent(
        `Hola ${alum.first_name}! Confirmamos la recepción de tu pago (${concepto}) por $${amountNum.toLocaleString()} (${mesAbonado}). Próximo vencimiento: ${nextDueDate}. ¡Muchas gracias!`
      );
      window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
    }

    setSelectedAlumnaId('');
    setMonto('');
    setObservaciones('');
    fetchData();
  };

  const handleDeletePagoConfirm = async (pagoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de pago? Esta acción no se puede deshacer.')) {
      return;
    }

    const { error } = await deletePago(pagoId);
    if (error) {
      alert(`Error al eliminar: ${error}`);
    } else {
      fetchData();
    }
  };

  const sendWhatsAppComprobante = (pago: Pago) => {
    if (!pago.alumna) return;
    const phoneClean = pago.alumna.phone.replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Hola ${pago.alumna.first_name}! Confirmamos la recepción de tu pago por $${pago.amount.toLocaleString()}. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
  };

  const sendWhatsAppRecordatorio = (alumna: Alumna) => {
    if (!alumna.phone) return;
    const phoneClean = alumna.phone.replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Hola ${alumna.first_name}! Te recordamos que tu cuota mensual de Pilates por $${(alumna.plan_amount || 0).toLocaleString()} se encuentra vencida. Te pedimos regularizarla para mantener tu turno fijo. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneClean}?text=${textMsg}`, '_blank');
  };

  // Filtrar alumnas vencidas
  const hoyStr = new Date().toISOString().split('T')[0];
  const alumnasVencidas = alumnas.filter((a) => a.billing_due_date && a.billing_due_date < hoyStr);

  // Totales de recaudación por medio de pago
  const totalTransferencias = pagos
    .filter((p) => p.payment_method === 'TRANSFERENCIA' && p.status === 'PAID')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalEfectivo = pagos
    .filter((p) => p.payment_method === 'EFECTIVO' && p.status === 'PAID')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalMercadoPago = pagos
    .filter((p) => p.payment_method === 'MERCADO_PAGO' && p.status === 'PAID')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalTarjeta = pagos
    .filter((p) => p.payment_method === 'DEBITO' || p.payment_method === 'CREDITO')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalRegistrado = pagos
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + p.amount, 0);

  // Filtrar historial de pagos
  const pagosFiltrados = pagos.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const nombre = p.alumna ? `${p.alumna.first_name} ${p.alumna.last_name}`.toLowerCase() : '';
    const dni = p.alumna?.dni?.toLowerCase() || '';
    const metodo = p.payment_method.toLowerCase();
    const notas = p.notes?.toLowerCase() || '';
    return nombre.includes(term) || dni.includes(term) || metodo.includes(term) || notas.includes(term);
  });

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-[var(--text-primary)]">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-[var(--color-wood)]" /> Registro de Pagos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Gestión integrada de mensualidades, comprobantes y vencimientos de alumnas
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)] font-medium flex items-center gap-2 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-[var(--color-success-soft)] border border-[var(--color-success)]/30 text-xs text-[var(--color-success)] font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BLOQUE 1: Registrar pago (Formulario Compacto y Elegante) */}
      <Card className="p-4 sm:p-5 flex flex-col gap-4 border border-[var(--border-default)] shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--color-wood)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Registrar pago
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">Completa los datos del cobro</span>
        </div>

        <form onSubmit={handleGuardarPago} className="flex flex-col gap-3">
          {/* Fila 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Alumna *
              </label>
              <select
                value={selectedAlumnaId}
                onChange={(e) => handleAlumnaChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold cursor-pointer"
                required
              >
                <option value="">Seleccionar alumna...</option>
                {alumnas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.last_name}, {a.first_name} &bull; DNI: {a.dni || 'Sin DNI'} &bull; Tel: {a.phone || 'Sin tel'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                Concepto
              </label>
              <select
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-medium"
              >
                <option value="Mensualidad">Mensualidad</option>
                <option value="Inscripción">Inscripción</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <Input
              label="Monto ($) *"
              type="number"
              min="0"
              placeholder="Ej. 45000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              icon={<DollarSign className="h-3.5 w-3.5 text-[var(--color-wood)]" />}
              required
            />
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-medium capitalize"
              >
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="DEBITO">Débito / Tarjeta</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <Input
              label="Fecha de Pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              icon={<Calendar className="h-3.5 w-3.5 text-[var(--color-wood)]" />}
            />

            <Input
              label="Mes Abonado"
              placeholder="Ej. Agosto de 2026"
              value={mesAbonado}
              onChange={(e) => setMesAbonado(e.target.value)}
            />

            <Input
              label="Observaciones"
              placeholder="Notas del pago..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Accion Compacta */}
          <div className="flex justify-end pt-2 border-t border-[var(--border-default)] mt-1">
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              icon={<Send className="h-3.5 w-3.5" />}
              className="px-6 py-2 bg-[var(--color-wood)] hover:bg-[var(--color-wood-dark)] text-[var(--color-dark)] font-bold text-xs rounded-xl shadow-xs"
            >
              Guardar pago y enviar comprobante
            </Button>
          </div>
        </form>
      </Card>

      {/* BLOQUE 2: Resumen de Ingresos (Métricas Financieras de Alto Nivel) */}
      {isAdmin && (
        <Card className="p-6 flex flex-col gap-5 border border-[var(--border-default)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border-default)] pb-4">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-[var(--color-wood)] shrink-0" />
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Resumen de Ingresos
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Totales consolidados del período por método de cobro
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-[var(--color-wood)] px-3.5 py-1.5 rounded-xl bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/30 shrink-0">
              Agosto de 2026
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Registrado (Card Destacada) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white border border-[var(--color-wood)]/40 flex flex-col justify-between shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[var(--color-wood)] uppercase tracking-wider">Total Registrado</span>
                <Wallet className="h-4 w-4 text-[var(--color-wood)]" />
              </div>
              <p className="text-2xl font-black my-2 text-white leading-none">${totalRegistrado.toLocaleString()}</p>
              <span className="text-[11px] text-slate-400 font-semibold">{pagos.length} cobros realizados</span>
            </div>

            {/* Transferencias */}
            <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Transferencias</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)]">${totalTransferencias.toLocaleString()}</p>
              <span className="text-[10px] text-[var(--color-wood)] font-semibold flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> Cuenta bancaria
              </span>
            </div>

            {/* Efectivo */}
            <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Efectivo</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)]">${totalEfectivo.toLocaleString()}</p>
              <span className="text-[10px] text-[var(--color-success)] font-semibold flex items-center gap-0.5">
                <Check className="h-3 w-3" /> En caja física
              </span>
            </div>

            {/* Mercado Pago */}
            <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Mercado Pago</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)]">${totalMercadoPago.toLocaleString()}</p>
              <span className="text-[10px] text-[var(--text-muted)]">Cobros digitales</span>
            </div>

            {/* Tarjeta */}
            <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] flex flex-col justify-between">
              <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Tarjeta</span>
              <p className="text-xl font-black my-1 text-[var(--text-primary)]">${totalTarjeta.toLocaleString()}</p>
              <span className="text-[10px] text-[var(--text-muted)]">POS / Terminal</span>
            </div>
          </div>
        </Card>
      )}

      {/* BLOQUE 3: Alumnas con Mensualidad Vencida */}
      <Card className="p-6 flex flex-col gap-4 border border-[var(--border-default)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Alumnas con Mensualidad Vencida
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Notifica directamente por WhatsApp a quienes adeudan su cuota
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-extrabold shrink-0">
            {alumnasVencidas.length} pendientes
          </span>
        </div>

        {alumnasVencidas.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-6 text-center">
            No hay alumnas registradas con mensualidad vencida en este momento.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-default)] max-h-80 overflow-y-auto custom-scrollbar">
            {alumnasVencidas.map((alum) => (
              <div
                key={alum.id}
                className="py-3.5 px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[var(--bg-tertiary)]/50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-xs shrink-0">
                    {alum.first_name[0]}{alum.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] capitalize">
                      {alum.first_name} {alum.last_name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Venció el <span className="font-extrabold text-red-400">{alum.billing_due_date}</span> &bull; Plan: {alum.plan || 'Estándar'} &mdash; <strong className="text-[var(--color-wood)]">${(alum.plan_amount || 0).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => sendWhatsAppRecordatorio(alum)}
                  className="px-4 py-2 rounded-xl bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#25D366]/30 shrink-0"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar Recordatorio
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* BLOQUE 4: Historial de Pagos */}
      <Card className="p-6 flex flex-col gap-4 border border-[var(--border-default)] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-default)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Historial de Pagos
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Consulta y gestiona todos los registros de cobro realizados
            </p>
          </div>

          <div className="w-full sm:w-80">
            <Input
              placeholder="Buscar por alumna, concepto o método..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4 text-[var(--color-wood)]" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Spinner size="md" />
            <span className="text-xs text-[var(--text-muted)]">Cargando historial de pagos...</span>
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-8 text-center">
            {search ? 'No se encontraron pagos con ese criterio de búsqueda.' : 'No hay historial de pagos registrado aún.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Alumna</th>
                  <th className="py-3 px-3">Concepto</th>
                  <th className="py-3 px-3">Monto</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Mes Abonado</th>
                  <th className="py-3 px-3 text-center">Comprobante</th>
                  <th className="py-3 px-3 text-right">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {pagosFiltrados.map((pago) => (
                  <tr key={pago.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {pago.payment_date}
                    </td>

                    <td className="py-3.5 px-3 font-bold capitalize">
                      {pago.alumna ? `${pago.alumna.first_name} ${pago.alumna.last_name}` : 'Alumna'}
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-[var(--text-secondary)]">
                      Mensualidad
                    </td>

                    <td className="py-3.5 px-3 font-black text-[var(--color-wood)]">
                      ${pago.amount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] font-semibold text-[11px] capitalize">
                        {pago.payment_method.replace('_', ' ').toLowerCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-[var(--text-muted)] font-medium">
                      {pago.payment_date.slice(0, 7)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => sendWhatsAppComprobante(pago)}
                        className="px-3 py-1.5 rounded-xl bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-[11px] font-extrabold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-[#25D366]/30"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePagoConfirm(pago.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-extrabold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-red-500/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
