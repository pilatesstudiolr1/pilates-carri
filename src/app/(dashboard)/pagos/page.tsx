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
import { buildAvisoPagoWhatsAppMessage, getLocalDateISO } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useSede } from '@/hooks/useSede';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AlumnaCombobox } from '@/components/pagos/AlumnaCombobox';

const getMesAbonadoStr = (dateStr?: string) => {
  if (dateStr) return dateStr.slice(0, 7);
  return getLocalDateISO().slice(0, 7);
};

const calculateNextDueDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextDate = new Date(y, m, d);
  const nextY = nextDate.getFullYear();
  const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
  const nextD = String(nextDate.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
};

const cleanAndFormatWhatsAppPhone = (phone?: string | null) => {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (!clean) return null;
  if (clean.startsWith('0')) clean = clean.slice(1);
  if (clean.startsWith('15')) clean = clean.slice(2);
  if (clean.startsWith('54')) {
    if (!clean.startsWith('549')) {
      clean = `549${clean.slice(2)}`;
    }
  } else {
    clean = `549${clean}`;
  }
  return clean;
};

export default function PagosPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const { profile } = useUser();
  const { selectedSedeId, sedes } = useSede();
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
  const [tipoCobro, setTipoCobro] = useState<'MENSUALIDAD' | 'INSCRIPCION' | 'CLASE_SUELTA'>('MENSUALIDAD');
  const [concepto, setConcepto] = useState('Cuota mensualidad');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia');
  const [fechaPago, setFechaPago] = useState<string>(
    () => getLocalDateISO()
  );
  const [mesAbonado, setMesAbonado] = useState(() => getLocalDateISO().slice(0, 7));
  const [observaciones, setObservaciones] = useState('');
  const [searchVencidas, setSearchVencidas] = useState('');

  // Pago Combinado
  const [esPagoCombinado, setEsPagoCombinado] = useState(false);
  const [metodoPago1, setMetodoPago1] = useState<MetodoPago>('transferencia');
  const [monto1, setMonto1] = useState('');
  const [metodoPago2, setMetodoPago2] = useState<MetodoPago>('efectivo');
  const [monto2, setMonto2] = useState('');

  // Paginación de Historial de Pagos
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(15);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const [pagosRes, alumnasRes] = await Promise.all([
      getPagos({ sedeId: selectedSedeId }),
      getAlumnas({ sedeId: selectedSedeId, limit: 500 }),
    ]);

    if (pagosRes.error) {
      setErrorMsg(pagosRes.error);
    } else {
      setPagos(pagosRes.data || []);
    }

    setAlumnas(alumnasRes.data || []);
    setLoading(false);
  }, [selectedSedeId]);

  useEffect(() => {
    if (profile?.role === 'PROFESORA') {
      window.location.href = '/profesora';
    }
  }, [profile?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedSedeId]);

  const updateSplitAmounts = (totalStr: string) => {
    const totalNum = parseFloat(totalStr) || 0;
    if (totalNum > 0) {
      const half = Math.round(totalNum / 2);
      setMonto1(String(half));
      setMonto2(String(totalNum - half));
    } else {
      setMonto1('');
      setMonto2('');
    }
  };

  const handleMontoChange = (val: string) => {
    setMonto(val);
    if (esPagoCombinado) {
      updateSplitAmounts(val);
    }
  };

  const handleTipoCobroChange = (tipo: 'MENSUALIDAD' | 'INSCRIPCION' | 'CLASE_SUELTA') => {
    setTipoCobro(tipo);
    const alum = alumnas.find((a) => a.id === selectedAlumnaId);
    let newM = '';
    if (tipo === 'INSCRIPCION') {
      setConcepto('Matrícula de inscripción inicial');
      newM = alum?.enrollment_amount ? String(alum.enrollment_amount) : '9500';
    } else if (tipo === 'MENSUALIDAD') {
      setConcepto(alum?.plan ? `Cuota mensualidad (${alum.plan})` : 'Cuota mensualidad');
      if (alum?.plan_amount) {
        newM = String(alum.plan_amount);
      }
    } else if (tipo === 'CLASE_SUELTA') {
      setConcepto('Clase suelta individual');
      newM = '8000';
    }
    if (newM) {
      setMonto(newM);
      if (esPagoCombinado) updateSplitAmounts(newM);
    }
  };

  // Al cambiar la alumna seleccionada, autocompletar el monto de su plan o inscripción
  const handleAlumnaChange = (alumnaId: string, overrideTipo?: 'MENSUALIDAD' | 'INSCRIPCION' | 'CLASE_SUELTA') => {
    setSelectedAlumnaId(alumnaId);
    setErrorMsg('');
    const activeTipo = overrideTipo || tipoCobro;
    if (overrideTipo) {
      setTipoCobro(overrideTipo);
    }

    const alum = alumnas.find((a) => a.id === alumnaId);
    if (alum) {
      let newM = '';
      if (activeTipo === 'INSCRIPCION') {
        newM = alum.enrollment_amount ? String(alum.enrollment_amount) : '9500';
        setConcepto('Matrícula de inscripción inicial');
      } else if (activeTipo === 'MENSUALIDAD') {
        if (alum.plan_amount) {
          newM = alum.plan_amount.toString();
        }
        if (alum.plan) {
          setConcepto(`Cuota mensualidad (${alum.plan})`);
        } else {
          setConcepto('Cuota mensualidad');
        }
      } else if (activeTipo === 'CLASE_SUELTA') {
        newM = '8000';
        setConcepto('Clase suelta individual');
      }
      if (newM) {
        setMonto(newM);
        if (esPagoCombinado) updateSplitAmounts(newM);
      }
    }
  };

  const handleFechaPagoChange = (newDate: string) => {
    setFechaPago(newDate);
    if (newDate) {
      setMesAbonado(newDate.slice(0, 7));
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

    let splitPaymentData: { method1: MetodoPago; amount1: number; method2: MetodoPago; amount2: number } | undefined = undefined;

    if (esPagoCombinado) {
      const m1 = parseFloat(monto1);
      const m2 = parseFloat(monto2);
      if (isNaN(m1) || m1 <= 0 || isNaN(m2) || m2 <= 0) {
        setErrorMsg('En el pago combinado, ambos métodos deben tener un importe mayor a 0');
        return;
      }
      if (Math.abs((m1 + m2) - amountNum) > 0.01) {
        setErrorMsg(`La suma de los dos importes ($${(m1 + m2).toLocaleString('es-AR')}) no coincide con el total ingresado ($${amountNum.toLocaleString('es-AR')})`);
        return;
      }
      splitPaymentData = {
        method1: metodoPago1,
        amount1: m1,
        method2: metodoPago2,
        amount2: m2,
      };
    }

    setSubmitting(true);

    const nextDueDate = tipoCobro === 'INSCRIPCION' ? undefined : calculateNextDueDate(fechaPago);
    const alum = alumnas.find((a) => a.id === selectedAlumnaId);
    const activeSede = (selectedSedeId && selectedSedeId !== 'ALL') ? selectedSedeId : (alum?.sede_id || undefined);
    const recordedByName = profile?.full_name || (profile?.role === 'ADMIN' ? 'Administrador' : 'Profesora');

    let res = await registrarPago({
      alumna_id: selectedAlumnaId,
      amount: amountNum,
      payment_method: esPagoCombinado ? 'otro' : metodoPago,
      payment_type: tipoCobro,
      due_date: nextDueDate,
      concept: concepto.trim() || (tipoCobro === 'INSCRIPCION' ? 'Matrícula de inscripción inicial' : 'Cuota mensualidad'),
      billing_month: mesAbonado.trim(),
      notes: observaciones.trim() || undefined,
      sede_id: activeSede,
      profesora_id: alum?.profesora_id || undefined,
      recorded_by_id: profile?.id,
      recorded_by_name: recordedByName,
      split_payment: splitPaymentData,
    });

    if (res.error && res.error.includes('Ya existe un pago registrado')) {
      setSubmitting(false);
      const allow = await confirm({
        title: 'Pago ya registrado en este período',
        message: `${res.error}\n\n¿Deseas registrar este cobro de todas formas (por ejemplo, como clase extra, cobro adicional o corrección de carga)?`,
        confirmText: 'Sí, registrar de todos modos',
        variant: 'warning',
      });
      if (!allow) return;

      setSubmitting(true);
      res = await registrarPago({
        alumna_id: selectedAlumnaId,
        amount: amountNum,
        payment_method: esPagoCombinado ? 'otro' : metodoPago,
        payment_type: tipoCobro,
        due_date: nextDueDate,
        concept: concepto.trim() || (tipoCobro === 'INSCRIPCION' ? 'Matrícula de inscripción inicial' : 'Cuota mensualidad'),
        billing_month: mesAbonado.trim(),
        notes: observaciones.trim() || undefined,
        sede_id: activeSede,
        profesora_id: alum?.profesora_id || undefined,
        recorded_by_id: profile?.id,
        recorded_by_name: recordedByName,
        split_payment: splitPaymentData,
        allow_duplicate: true,
      });
    }

    setSubmitting(false);

    if (res.error || !res.data) {
      setErrorMsg(res.error || 'Error al registrar el pago');
      return;
    }

    const newPago = res.data;
    setSuccessMsg('Pago registrado e ingresado a caja exitosamente');
    setTimeout(() => setSuccessMsg(''), 6000);

    // Asociar datos de la alumna para el modal de comprobante
    const pagoConAlumna: Pago = {
      ...newPago,
      due_date: newPago.due_date || nextDueDate,
      alumna: alum ? {
        ...alum,
        billing_due_date: tipoCobro === 'INSCRIPCION' ? (alum.billing_due_date || null) : (nextDueDate || null),
      } : undefined,
    };

    setSelectedComprobantePago(pagoConAlumna);
    setIsComprobanteModalOpen(true);

    setSelectedAlumnaId('');
    setMonto('');
    setObservaciones('');
    setEsPagoCombinado(false);
    setMonto1('');
    setMonto2('');
    fetchData();
  };

  const handleDeletePagoConfirm = async (pagoId: string) => {
    const isOk = await confirm({
      title: 'Eliminar registro de pago',
      message: '¿Estás seguro de eliminar este registro de pago? Esta acción no se puede deshacer y también ajustará la caja.',
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

  const sendWhatsAppRecordatorio = async (alumna: Alumna) => {
    const phoneFormatted = cleanAndFormatWhatsAppPhone(alumna.phone);
    if (!phoneFormatted) {
      await alertDialog({
        title: 'Sin teléfono registrado',
        message: `La alumna ${alumna.first_name} ${alumna.last_name || ''} no tiene un número de teléfono válido registrado.`,
        variant: 'warning',
      });
      return;
    }
    const textMsg = encodeURIComponent(
      `Hola ${alumna.first_name}! Te recordamos de Pilates Studio que tu cuota mensual por $${(alumna.plan_amount || 0).toLocaleString('es-AR')} se encuentra vencida. Te pedimos regularizarla para mantener tu turno fijo. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phoneFormatted}?text=${textMsg}`, '_blank');
  };

  const sendWhatsAppComprobanteDirecto = async (pago: Pago) => {
    const alumna = pago.alumna;
    const phoneFormatted = cleanAndFormatWhatsAppPhone(alumna?.phone);
    if (!phoneFormatted) {
      setSelectedComprobantePago(pago);
      setIsComprobanteModalOpen(true);
      return;
    }

    const alumnaNombre = alumna ? `${alumna.first_name} ${alumna.last_name || ''}`.trim() : 'Alumna';
    const textMsg = buildAvisoPagoWhatsAppMessage({
      nombreCliente: alumnaNombre,
      monto: pago.amount,
      concepto: pago.concept || 'Mensualidad Pilates',
      metodoPago: pago.payment_method,
      fechaPago: pago.payment_date,
      vencimientoCuota: pago.due_date || alumna?.billing_due_date,
      notas: pago.notes,
    });
    window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(textMsg)}`, '_blank');
  };

  // Filtrar alumnas vencidas con búsqueda en tiempo real
  const hoyStr = new Date().toISOString().split('T')[0];
  const alumnasVencidas = alumnas.filter((a) => {
    if (a.status !== 'ACTIVE') return false;
    const isVencida = Boolean(a.billing_due_date && a.billing_due_date < hoyStr);
    if (!isVencida) return false;
    if (!searchVencidas.trim()) return true;
    const term = searchVencidas.toLowerCase();
    const nombre = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
    const dni = a.dni?.toLowerCase() || '';
    const phone = a.phone?.toLowerCase() || '';
    const plan = a.plan?.toLowerCase() || '';
    return nombre.includes(term) || dni.includes(term) || phone.includes(term) || plan.includes(term);
  });

  // Totales de recaudación por concepto (Mensualidades vs Inscripciones)
  const totalMensualidades = pagos
    .filter((p) => p.payment_type === 'MENSUALIDAD' || (!p.payment_type && !p.concept?.toLowerCase().includes('inscri') && !p.concept?.toLowerCase().includes('matr')))
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalInscripciones = pagos
    .filter((p) => p.payment_type === 'INSCRIPCION' || p.concept?.toLowerCase().includes('inscri') || p.concept?.toLowerCase().includes('matr'))
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

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
    const cobrado = (p.cobrado_por || '').toLowerCase();
    return (
      nombre.includes(term) ||
      dni.includes(term) ||
      metodo.includes(term) ||
      conceptoStr.includes(term) ||
      notas.includes(term) ||
      cobrado.includes(term)
    );
  });

  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(pagosFiltrados.length / Number(pageSize)));
  const paginatedPagos = pageSize === 'ALL'
    ? pagosFiltrados
    : pagosFiltrados.slice((currentPage - 1) * Number(pageSize), currentPage * Number(pageSize));

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
          {/* Selector de Tipo de Cobro */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--border-default)]">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] px-2">Tipo de cobro:</span>
            <button
              type="button"
              onClick={() => handleTipoCobroChange('MENSUALIDAD')}
              className={`px-3 py-1 rounded-[18px] text-xs font-bold transition-all cursor-pointer ${
                tipoCobro === 'MENSUALIDAD'
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Cuota Mensual
            </button>
            <button
              type="button"
              onClick={() => handleTipoCobroChange('INSCRIPCION')}
              className={`px-3 py-1 rounded-[18px] text-xs font-bold transition-all cursor-pointer ${
                tipoCobro === 'INSCRIPCION'
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Inscripción (Matrícula inicial)
            </button>
            <button
              type="button"
              onClick={() => handleTipoCobroChange('CLASE_SUELTA')}
              className={`px-3 py-1 rounded-[18px] text-xs font-bold transition-all cursor-pointer ${
                tipoCobro === 'CLASE_SUELTA'
                  ? 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Clase Suelta / Prueba
            </button>
          </div>

          {/* Fila 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Alumna *
              </label>
              <AlumnaCombobox
                alumnas={alumnas}
                selectedAlumnaId={selectedAlumnaId}
                onChange={(id) => handleAlumnaChange(id)}
                sedes={sedes}
                selectedSedeId={selectedSedeId}
                required
              />
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
                onChange={(e) => handleMontoChange(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={esPagoCombinado ? 'sm:col-span-2' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                  Método de Pago
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !esPagoCombinado;
                    setEsPagoCombinado(next);
                    if (next) {
                      updateSplitAmounts(monto);
                    }
                  }}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-[16px] transition-all cursor-pointer ${
                    esPagoCombinado
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  {esPagoCombinado ? '✓ Pago combinado activado' : '+ Pago combinado'}
                </button>
              </div>

              {!esPagoCombinado ? (
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
              ) : (
                <div className="p-3 rounded-[12px] bg-[var(--bg-primary)] border border-amber-500/30 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                        Método 1
                      </span>
                      <div className="flex gap-2">
                        <select
                          value={metodoPago1}
                          onChange={(e) => setMetodoPago1(e.target.value as MetodoPago)}
                          className="w-1/2 h-9 px-2 rounded-[8px] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] font-medium capitalize"
                        >
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                        <Input
                          type="number"
                          placeholder="Monto 1"
                          value={monto1}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMonto1(val);
                            const totalNum = parseFloat(monto) || 0;
                            const m1 = parseFloat(val) || 0;
                            if (totalNum > 0) {
                              setMonto2(String(Math.max(0, totalNum - m1)));
                            }
                          }}
                          className="w-1/2 h-9 text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                        Método 2
                      </span>
                      <div className="flex gap-2">
                        <select
                          value={metodoPago2}
                          onChange={(e) => setMetodoPago2(e.target.value as MetodoPago)}
                          className="w-1/2 h-9 px-2 rounded-[8px] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] font-medium capitalize"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                        <Input
                          type="number"
                          placeholder="Monto 2"
                          value={monto2}
                          onChange={(e) => setMonto2(e.target.value)}
                          className="w-1/2 h-9 text-xs font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modo comentario sutil */}
                  <div className="text-[11px] text-[var(--text-muted)] italic pt-1.5 border-t border-[var(--border-default)] flex items-center justify-between">
                    <span>
                      Cobro dividido: ${(parseFloat(monto1) || 0).toLocaleString('es-AR')} ({metodoPago1}) + ${(parseFloat(monto2) || 0).toLocaleString('es-AR')} ({metodoPago2})
                    </span>
                    <span className="font-mono font-bold text-[var(--text-primary)] not-italic text-xs">
                      Total: ${((parseFloat(monto1) || 0) + (parseFloat(monto2) || 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Fecha de Pago
              </label>
              <Input
                type="date"
                value={fechaPago}
                onChange={(e) => handleFechaPagoChange(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Mes Abonado
              </label>
              <Input
                type="month"
                value={mesAbonado}
                onChange={(e) => setMesAbonado(e.target.value)}
                required
              />
            </div>

            <div className={esPagoCombinado ? 'sm:col-span-2' : ''}>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-default)] pb-4">
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-bold px-3 py-1 rounded-[22px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                Cuotas: <span className="font-mono">${totalMensualidades.toLocaleString('es-AR')}</span>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-[22px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
                Inscripciones: <span className="font-mono">${totalInscripciones.toLocaleString('es-AR')}</span>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-[22px] bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] shrink-0">
                Histórico ({pagos.length} cobros)
              </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-default)] pb-4">
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <Input
                placeholder="Buscar alumna vencida..."
                value={searchVencidas}
                onChange={(e) => setSearchVencidas(e.target.value)}
                className="pl-8 text-xs h-9 w-full"
              />
            </div>
            <span className="px-3 py-1.5 rounded-[22px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0">
              {alumnasVencidas.length} pendientes
            </span>
          </div>
        </div>

        {alumnasVencidas.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-6 text-center">
            {searchVencidas.trim()
              ? 'No se encontraron alumnas vencidas que coincidan con la búsqueda.'
              : 'No hay alumnas registradas con mensualidad vencida en este momento.'}
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
                      Venció el <span className="font-bold text-rose-600 dark:text-rose-400">{alum.billing_due_date}</span> • Plan: {alum.plan || 'Estándar'} — <strong className="text-[var(--text-primary)] font-mono">${(alum.plan_amount || 0).toLocaleString('es-AR')}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      handleAlumnaChange(alum.id, 'MENSUALIDAD');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-[22px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Cobrar Cuota
                  </button>
                  <button
                    type="button"
                    onClick={() => sendWhatsAppRecordatorio(alum)}
                    className="px-3.5 py-1.5 rounded-[22px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/30 shrink-0"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" /> WhatsApp
                  </button>
                </div>
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
                {paginatedPagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text-secondary)]">
                      {pago.payment_date}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-bold capitalize text-xs text-[var(--text-primary)]">
                        {pago.alumna ? `${pago.alumna.first_name} ${pago.alumna.last_name || ''}` : 'Alumna'}
                      </div>
                      {pago.alumna?.dni && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                          DNI: {pago.alumna.dni}
                        </span>
                      )}
                      {isAdmin && (
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1 font-medium">
                          <span className="text-[var(--text-muted)]">Cobrado por:</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {pago.cobrado_por || pago.profesora?.full_name || 'Administración'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-[var(--text-secondary)] font-medium">
                      <div>{pago.concept || 'Mensualidad'}</div>
                      {pago.period && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-bold block mt-0.5">
                          Período: {pago.period}
                        </span>
                      )}
                      {selectedSedeId === 'ALL' && pago.sede_id && (
                        <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-0.5">
                          {sedes.find((s) => s.id === pago.sede_id)?.name || ''}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-bold font-mono text-sm text-[var(--text-primary)]">
                      ${(Number(pago.amount) || 0).toLocaleString('es-AR')}
                    </td>

                    <td className="py-3.5 px-3">
                      {pago.notes && pago.notes.includes('[Métodos de pago:') ? (
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-0.5 rounded-[22px] bg-amber-500/15 border border-amber-500/30 font-bold text-[10px] text-amber-800 dark:text-amber-300 inline-block">
                            Pago combinado
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] block font-medium">
                            {pago.notes.match(/\[Métodos de pago:\s*([^\]]+)\]/)?.[1] || 'Varios métodos'}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-[22px] bg-[var(--bg-primary)] border border-[var(--border-default)] font-semibold text-[11px] capitalize text-[var(--text-primary)]">
                          {(pago.payment_method || '').replace('_', ' ')}
                        </span>
                      )}
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
                          onClick={() => sendWhatsAppComprobanteDirecto(pago)}
                          className="p-1.5 rounded-[8px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                          title="Enviar Comprobante por WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePagoConfirm(pago.id)}
                            className="p-1.5 rounded-[8px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Eliminar Pago (Solo Admin)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginación */}
        {pagosFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-secondary)]">
              Mostrando <strong className="text-[var(--text-primary)] font-bold">
                {pageSize === 'ALL' ? 1 : (currentPage - 1) * Number(pageSize) + 1}
              </strong> a{' '}
              <strong className="text-[var(--text-primary)] font-bold">
                {pageSize === 'ALL' ? pagosFiltrados.length : Math.min(currentPage * Number(pageSize), pagosFiltrados.length)}
              </strong> de{' '}
              <strong className="text-[var(--text-primary)] font-bold">{pagosFiltrados.length}</strong> cobros registrados
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span>Filas por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-xs font-semibold cursor-pointer text-[var(--text-primary)] focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="ALL">Ver todos ({pagosFiltrados.length})</option>
                </select>
              </div>

              {pageSize !== 'ALL' && totalPages > 1 && (
                <div className="flex items-center gap-1">
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
                              type="button"
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
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
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
