'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, MetodoPago, TipoPago, Pago } from '@/types/database';
import { getAlumnas } from '@/lib/services/alumnas';
import { registrarPago, verificarPagoExistente, VerificacionPagoExistenteResult } from '@/lib/services/pagos';
import { METODOS_PAGO } from '@/lib/constants';
import { formatFechaArg, buildAvisoPagoWhatsAppMessage, openWhatsAppMessage, calculateNextDueDate, getLocalDateISO } from '@/lib/utils';
import { useSede } from '@/hooks/useSede';
import { useUser } from '@/hooks/useUser';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import { AlumnaCombobox } from '@/components/pagos/AlumnaCombobox';
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle2,
  User,
  MessageCircle,
  Building2,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Percent,
} from 'lucide-react';

export interface PagoFormProps {
  initialAlumna?: Alumna | null;
  defaultProfesoraId?: string;
  defaultCommissionRate?: number;
  disableCommissionEdit?: boolean;
  onPaymentSuccess?: (pago?: Pago) => void;
  onCancel?: () => void;
  className?: string;
  id?: string;
  title?: string;
  description?: string;
}

export function PagoForm({
  initialAlumna,
  defaultProfesoraId,
  defaultCommissionRate,
  disableCommissionEdit = false,
  onPaymentSuccess,
  onCancel,
  className = '',
  id = 'formulario-cobro',
  title = 'Registrar Nuevo Cobro',
  description = 'Cobro con ingreso directo en caja y renovación automática de cuota',
}: PagoFormProps) {
  const { profile } = useUser();
  const { sedes, selectedSedeId } = useSede();
  const { confirm: confirmDialog } = useConfirm();
  const toast = useToast();

  // Anti-double-submit síncrono por useRef
  const isProcessingRef = useRef(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<VerificacionPagoExistenteResult | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [selectedSedeIdCobro, setSelectedSedeIdCobro] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<MetodoPago>('efectivo');

  // Estados para Pago Combinado (Dividir en 2 medios)
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitMethod1, setSplitMethod1] = useState<MetodoPago>('transferencia');
  const [splitAmount1, setSplitAmount1] = useState('');
  const [splitMethod2, setSplitMethod2] = useState<MetodoPago>('efectivo');
  const [splitAmount2, setSplitAmount2] = useState('');

  // Estado para comprobante exitoso en pantalla
  const [paymentConfirmed, setPaymentConfirmed] = useState<{
    pagoId?: string;
    alumna: Alumna;
    amount: number;
    dueDate: string;
    concept: string;
    period: string;
    paymentMethod: MetodoPago;
    notes?: string;
    splitDetails?: string;
  } | null>(null);

  // Concepto y duración del pago
  const [duracionTipo, setDuracionTipo] = useState<'1_MES' | '2_MESES' | '3_MESES' | 'CLASE_SUELTA' | 'INSCRIPCION' | 'OTRO'>('1_MES');
  const [concept, setConcept] = useState('Cuota mensualidad');
  const [period, setPeriod] = useState(() => getLocalDateISO().slice(0, 7));

  const [dueDate, setDueDate] = useState(() => calculateNextDueDate(null, 1));
  const [commissionRate, setCommissionRate] = useState('40');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSplitAmount1Change = (val: string) => {
    setSplitAmount1(val);
    const total = parseFloat(amount) || 0;
    const n1 = parseFloat(val) || 0;
    if (total > 0) {
      setSplitAmount2(String(Math.max(0, total - n1)));
    }
  };

  const handleSplitAmount2Change = (val: string) => {
    setSplitAmount2(val);
    const total = parseFloat(amount) || 0;
    const n2 = parseFloat(val) || 0;
    if (total > 0) {
      setSplitAmount1(String(Math.max(0, total - n2)));
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (isSplitPayment) {
      const total = parseFloat(val) || 0;
      const mitad = Math.round(total / 2);
      setSplitAmount1(String(mitad));
      setSplitAmount2(String(total - mitad));
    }
  };

  const fetchAlumnas = useCallback(async () => {
    const { data } = await getAlumnas({
      status: 'ACTIVE',
      profesoraId: defaultProfesoraId || undefined,
      limit: 300,
    });
    if (data) setAlumnas(data);
  }, [defaultProfesoraId]);

  useEffect(() => {
    fetchAlumnas();
  }, [fetchAlumnas]);

  // Carga o sincronización cuando cambia initialAlumna
  useEffect(() => {
    if (initialAlumna) {
      setSelectedAlumna(initialAlumna);
      if (initialAlumna.sede_id) {
        setSelectedSedeIdCobro(initialAlumna.sede_id);
      } else if (selectedSedeId && selectedSedeId !== 'ALL') {
        setSelectedSedeIdCobro(selectedSedeId);
      } else if (sedes.length > 0) {
        setSelectedSedeIdCobro(sedes[0].id);
      }

      if (initialAlumna.preferred_payment_method) {
        setPaymentMethod(initialAlumna.preferred_payment_method as MetodoPago);
      }

      if (!initialAlumna.enrollment_paid) {
        setDuracionTipo('INSCRIPCION');
        setConcept('Matrícula de inscripción inicial');
        setAmount(initialAlumna.enrollment_amount ? String(initialAlumna.enrollment_amount) : '9500');
        setCommissionRate('0');
        setDueDate(getLocalDateISO());
      } else if (initialAlumna.plan_amount && initialAlumna.plan_amount > 0) {
        setDuracionTipo('1_MES');
        setConcept(initialAlumna.plan ? `Cuota mensualidad (${initialAlumna.plan})` : 'Cuota mensualidad (1 Mes)');
        setAmount(String(initialAlumna.plan_amount));
        setDueDate(calculateNextDueDate(initialAlumna.billing_due_date, 1));
      } else if (
        initialAlumna.plan?.toLowerCase().includes('individual') ||
        initialAlumna.plan?.toLowerCase().includes('prueba') ||
        initialAlumna.plan?.toLowerCase().includes('suelta')
      ) {
        setDuracionTipo('CLASE_SUELTA');
        setConcept('Clase suelta individual');
        setAmount('8000');
        setDueDate(getLocalDateISO());
      } else {
        setAmount('');
        setDueDate(calculateNextDueDate(initialAlumna.billing_due_date, 1));
      }
    } else if (!selectedAlumna) {
      if (selectedSedeId && selectedSedeId !== 'ALL') {
        setSelectedSedeIdCobro(selectedSedeId);
      } else if (sedes.length > 0) {
        setSelectedSedeIdCobro(sedes[0].id);
      }
    }
  }, [initialAlumna, selectedSedeId, sedes]);

  // Inicializar sede por defecto si está vacía
  useEffect(() => {
    if (!selectedSedeIdCobro) {
      if (selectedSedeId && selectedSedeId !== 'ALL') {
        setSelectedSedeIdCobro(selectedSedeId);
      } else if (sedes.length > 0) {
        setSelectedSedeIdCobro(sedes[0].id);
      }
    }
  }, [selectedSedeId, sedes, selectedSedeIdCobro]);

  // Inicializar porcentaje de comisión
  useEffect(() => {
    if (defaultCommissionRate != null) {
      setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
    } else {
      setCommissionRate('40');
    }
  }, [defaultCommissionRate]);

  // Verificación en tiempo real de pagos previos
  useEffect(() => {
    if (!selectedAlumna?.id) {
      setDuplicateWarning(null);
      return;
    }

    let isMounted = true;
    const currentConcept = concept.trim();
    const isInscripcion =
      duracionTipo === 'INSCRIPCION' ||
      currentConcept.toLowerCase().includes('inscripci');
    const computedType: TipoPago = isInscripcion
      ? 'INSCRIPCION'
      : duracionTipo === 'CLASE_SUELTA'
      ? 'CLASE_SUELTA'
      : 'MENSUALIDAD';

    if (computedType !== 'INSCRIPCION' && computedType !== 'MENSUALIDAD') {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      const res = await verificarPagoExistente({
        alumnaId: selectedAlumna.id,
        paymentType: computedType,
        period: period,
      });

      if (isMounted) {
        setCheckingDuplicate(false);
        if (res.exists) {
          setDuplicateWarning(res);
          toast.warning(
            res.message || 'Ya existe un cobro registrado para esta alumna con estos parámetros.',
            '⚠️ Cobro previo detectado',
            6000
          );
        } else {
          setDuplicateWarning(null);
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedAlumna?.id, duracionTipo, concept, period]);

  const handleDuracionChange = (tipo: '1_MES' | '2_MESES' | '3_MESES' | 'CLASE_SUELTA' | 'INSCRIPCION' | 'OTRO') => {
    setDuracionTipo(tipo);
    const today = getLocalDateISO();

    if (tipo === '1_MES') {
      setDueDate(calculateNextDueDate(selectedAlumna?.billing_due_date, 1));
      setConcept(selectedAlumna?.plan ? `Cuota mensualidad (${selectedAlumna.plan})` : 'Cuota mensualidad (1 Mes)');
      if (selectedAlumna?.plan_amount) setAmount(String(selectedAlumna.plan_amount));
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === '2_MESES') {
      setDueDate(calculateNextDueDate(selectedAlumna?.billing_due_date, 2));
      setConcept('Cuota Bimestral (2 Meses)');
      if (selectedAlumna?.plan_amount) setAmount(String(selectedAlumna.plan_amount * 2));
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === '3_MESES') {
      setDueDate(calculateNextDueDate(selectedAlumna?.billing_due_date, 3));
      setConcept('Cuota Trimestral (3 Meses)');
      if (selectedAlumna?.plan_amount) setAmount(String(selectedAlumna.plan_amount * 3));
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === 'CLASE_SUELTA') {
      setDueDate(today);
      setConcept('Clase suelta individual');
      setAmount('8000');
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === 'INSCRIPCION') {
      setDueDate(today);
      setConcept('Matrícula de inscripción inicial');
      setAmount('9500');
      setCommissionRate('0');
    } else {
      setConcept('Pago personalizado');
    }
  };

  const handleSelectAlumna = (alumna: Alumna) => {
    setSelectedAlumna(alumna);
    if (alumna.sede_id) {
      setSelectedSedeIdCobro(alumna.sede_id);
    }
    if (alumna.preferred_payment_method) {
      setPaymentMethod(alumna.preferred_payment_method as MetodoPago);
    }
    if (!alumna.enrollment_paid) {
      setDuracionTipo('INSCRIPCION');
      setConcept('Matrícula de inscripción inicial');
      handleAmountChange(alumna.enrollment_amount ? String(alumna.enrollment_amount) : '9500');
      setCommissionRate('0');
      setDueDate(getLocalDateISO());
    } else if (alumna.plan_amount && alumna.plan_amount > 0) {
      setDuracionTipo('1_MES');
      setConcept(alumna.plan ? `Cuota mensualidad (${alumna.plan})` : 'Cuota mensualidad (1 Mes)');
      handleAmountChange(String(alumna.plan_amount));
      setDueDate(calculateNextDueDate(alumna.billing_due_date, 1));
    } else {
      handleAmountChange('');
      setDueDate(calculateNextDueDate(alumna.billing_due_date, 1));
    }
  };

  const handleClearAlumna = () => {
    setSelectedAlumna(null);
    handleAmountChange('');
    setDueDate(calculateNextDueDate(null, 1));
    setDuplicateWarning(null);
  };

  const resetForm = () => {
    setPaymentConfirmed(null);
    setSelectedAlumna(null);
    setAmount('');
    setErrorMsg('');
    setNotes('');
    setDuplicateWarning(null);
    setIsSplitPayment(false);
    setSplitAmount1('');
    setSplitAmount2('');
    setDuracionTipo('1_MES');
    setConcept('Cuota mensualidad');
    setPeriod(getLocalDateISO().slice(0, 7));
    setDueDate(calculateNextDueDate(null, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Bloqueo síncrono anti-doble clic
    if (isProcessingRef.current) return;

    if (!selectedAlumna) {
      setErrorMsg('Debes seleccionar una alumna');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('El monto del cobro debe ser un número mayor a cero');
      return;
    }

    let finalSplitPayment: any = undefined;
    let finalNotes = notes.trim();
    let splitDetailsStr = '';

    if (isSplitPayment) {
      const num1 = parseFloat(splitAmount1) || 0;
      const num2 = parseFloat(splitAmount2) || 0;
      if (num1 <= 0 || num2 <= 0) {
        setErrorMsg('En el pago combinado, ambos importes deben ser mayores a cero');
        return;
      }
      if (Math.abs((num1 + num2) - numericAmount) > 0.01) {
        setErrorMsg(`La suma de los métodos ($${(num1 + num2).toLocaleString('es-AR')}) no coincide con el total ($${numericAmount.toLocaleString('es-AR')})`);
        return;
      }

      finalSplitPayment = {
        method1: splitMethod1,
        amount1: num1,
        method2: splitMethod2,
        amount2: num2,
      };

      const m1Label = splitMethod1 === 'transferencia' ? 'Transferencia' : splitMethod1 === 'efectivo' ? 'Efectivo' : splitMethod1;
      const m2Label = splitMethod2 === 'transferencia' ? 'Transferencia' : splitMethod2 === 'efectivo' ? 'Efectivo' : splitMethod2;
      splitDetailsStr = `${m1Label}: $${num1.toLocaleString('es-AR')} | ${m2Label}: $${num2.toLocaleString('es-AR')}`;
      finalNotes = `${finalNotes} [Métodos de pago: ${splitDetailsStr}]`.trim();
    }

    const currentConcept = concept.trim() || 'Cuota mensualidad';
    const isInscripcion =
      duracionTipo === 'INSCRIPCION' ||
      currentConcept.toLowerCase().includes('inscripci');

    const finalCommissionRate = isInscripcion
      ? 0
      : (disableCommissionEdit && defaultCommissionRate != null
          ? defaultCommissionRate
          : (parseFloat(commissionRate) || 40) / 100);

    const paymentData = {
      alumna_id: selectedAlumna.id,
      amount: numericAmount,
      payment_method: (isSplitPayment ? splitMethod1 : paymentMethod) as MetodoPago,
      payment_type: (isInscripcion ? 'INSCRIPCION' : (duracionTipo === 'CLASE_SUELTA' ? 'CLASE_SUELTA' : 'MENSUALIDAD')) as TipoPago,
      due_date: isInscripcion ? undefined : dueDate,
      commission_rate: finalCommissionRate,
      concept: currentConcept,
      period: period,
      profesora_id: defaultProfesoraId || selectedAlumna.profesora_id || undefined,
      notes: finalNotes,
      sede_id: selectedSedeIdCobro || undefined,
      recorded_by_id: profile?.id,
      recorded_by_name: profile?.full_name,
      split_payment: finalSplitPayment,
    };

    // Bloquear procesamiento
    isProcessingRef.current = true;
    setInternalLoading(true);

    try {
      // Verificación automática de cobro previo con Doble Confirmación obligatoria
      let duplicateInfo = duplicateWarning;
      if (!duplicateInfo) {
        const checkSubmit = await verificarPagoExistente({
          alumnaId: selectedAlumna.id,
          paymentType: paymentData.payment_type as TipoPago,
          period: paymentData.period,
        });
        if (checkSubmit.exists) {
          duplicateInfo = checkSubmit;
          setDuplicateWarning(checkSubmit);
        }
      }

      let allowDuplicate = false;

      if (duplicateInfo?.exists) {
        isProcessingRef.current = false;
        setInternalLoading(false);

        toast.warning(
          'Se detectó un cobro previo idéntico. Se requiere confirmación de seguridad en 2 pasos.',
          'Doble Confirmación Requerida',
          6000
        );

        // Paso 1 de confirmación
        const step1 = await confirmDialog({
          title: '⚠️ Aviso 1/2: Cobro ya existente',
          message: `${duplicateInfo.message}\n\n¿Deseas continuar hacia la confirmación definitiva para registrar un cobro adicional para esta alumna?`,
          confirmText: 'Continuar a confirmación final',
          cancelText: 'Cancelar operación',
          variant: 'warning',
        });
        if (!step1) {
          toast.info('Operación cancelada. No se registró ningún cobro.', 'Cancelado');
          return;
        }

        // Paso 2 de confirmación (Doble confirmación obligatoria)
        const step2 = await confirmDialog({
          title: '🛑 Confirmación Final 2/2 de Seguridad',
          message: `Por favor reconfirma con atención:\n\nVas a registrar un cobro adicional de $${numericAmount.toLocaleString('es-AR')} (${paymentData.concept}) para ${selectedAlumna.first_name} ${selectedAlumna.last_name || ''} en el período ${period}.\n\n¿Confirmas definitivamente que deseas asentar este cobro duplicado en el sistema y en la caja?`,
          confirmText: 'Sí, registrar cobro duplicado',
          cancelText: 'No, descartar',
          variant: 'danger',
        });
        if (!step2) {
          toast.info('Operación cancelada en el paso final.', 'Cancelado');
          return;
        }

        allowDuplicate = true;
        isProcessingRef.current = true;
        setInternalLoading(true);
      }

      let res = await registrarPago({
        ...paymentData,
        split_payment: finalSplitPayment,
        allow_duplicate: allowDuplicate,
      });

      // Fallback si la BD o el servicio aún detecta conflicto no capturado
      if (res.error && (res.error.includes('Ya existe un pago registrado') || res.error.includes('ya tiene una inscripción') || res.error.includes('ya tiene una mensualidad'))) {
        isProcessingRef.current = false;
        setInternalLoading(false);

        const allow = await confirmDialog({
          title: 'Pago ya registrado en este período',
          message: `${res.error}\n\n¿Deseas registrar este cobro de todas formas?`,
          confirmText: 'Sí, registrar de todos modos',
          variant: 'warning',
        });
        if (!allow) return;

        isProcessingRef.current = true;
        setInternalLoading(true);
        res = await registrarPago({
          ...paymentData,
          split_payment: finalSplitPayment,
          allow_duplicate: true,
        });
      }

      if (res.error || !res.data) {
        setErrorMsg(res.error || 'Error al registrar el pago');
        return;
      }

      // Cobro exitoso: mostrar comprobante inline
      setPaymentConfirmed({
        pagoId: res.data.id,
        alumna: selectedAlumna,
        amount: numericAmount,
        dueDate: dueDate,
        concept: currentConcept,
        period: period,
        paymentMethod: isSplitPayment ? splitMethod1 : paymentMethod,
        notes: finalNotes,
        splitDetails: splitDetailsStr,
      });

      toast.success(
        `Cobro de $${numericAmount.toLocaleString('es-AR')} asentado en caja para ${selectedAlumna.first_name}`,
        '¡Cobro Registrado!'
      );

      onPaymentSuccess?.(res.data);
    } finally {
      isProcessingRef.current = false;
      setInternalLoading(false);
    }
  };

  const handleSendWhatsAppConfirmation = () => {
    if (!paymentConfirmed || !paymentConfirmed.alumna.phone) return;
    const alumnaNombre = `${paymentConfirmed.alumna.first_name} ${paymentConfirmed.alumna.last_name || ''}`.trim();
    const textMsg = buildAvisoPagoWhatsAppMessage({
      nombreCliente: alumnaNombre,
      monto: paymentConfirmed.amount,
      concepto: paymentConfirmed.concept,
      metodoPago: paymentConfirmed.paymentMethod,
      fechaPago: new Date().toISOString().slice(0, 10),
      vencimientoCuota: paymentConfirmed.dueDate,
      notas: paymentConfirmed.notes,
    });
    openWhatsAppMessage(paymentConfirmed.alumna.phone, textMsg);
  };

  // ---------------------------------------------------------------------------
  // VISTA DE COMPROBANTE TRAS COBRO EXITOSO (DEDICADA EN PANTALLA, NO MODAL)
  // ---------------------------------------------------------------------------
  if (paymentConfirmed) {
    const alumnaNombre = `${paymentConfirmed.alumna.first_name} ${paymentConfirmed.alumna.last_name || ''}`.trim();
    return (
      <div
        id={id}
        className={`bg-[var(--bg-secondary)] border border-emerald-500/30 rounded-2xl p-5 sm:p-7 shadow-sm text-[var(--text-primary)] animate-fade-in ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-default)] pb-4 mb-5 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Operación Exitosa
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] mt-0.5">
                ¡Cobro Registrado con Éxito!
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                El importe ingresó directamente en la caja y el vencimiento de la cuota fue actualizado.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={resetForm}
            className="self-start sm:self-auto font-bold text-xs"
          >
            Registrar Otro Cobro
          </Button>
        </div>

        {/* Resumen del Comprobante */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Alumna:
              </span>
              <strong className="text-[var(--text-primary)] font-bold text-sm capitalize">
                {alumnaNombre}
              </strong>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Monto Abonado:
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-base">
                ${paymentConfirmed.amount.toLocaleString('es-AR')} ARS
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Concepto:
              </span>
              <span className="text-[var(--text-primary)] font-semibold">
                {paymentConfirmed.concept}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[var(--text-muted)]" /> {paymentConfirmed.splitDetails ? 'Métodos de Pago:' : 'Medio de Pago:'}
              </span>
              <span className="text-[var(--text-primary)] font-semibold capitalize text-right">
                {paymentConfirmed.splitDetails ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {paymentConfirmed.splitDetails}
                  </span>
                ) : (
                  paymentConfirmed.paymentMethod.replace('_', ' ')
                )}
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4 space-y-3 text-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Mes Abonado:
                </span>
                <span className="text-[var(--text-primary)] font-bold font-mono text-sm">
                  {paymentConfirmed.period}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Próximo Vencimiento:
                </span>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  {formatFechaArg(paymentConfirmed.dueDate)}
                </span>
              </div>

              {paymentConfirmed.notes && (
                <div className="pt-1">
                  <span className="text-[var(--text-muted)] text-[11px] block">Notas / Comprobante:</span>
                  <p className="text-[var(--text-secondary)] italic text-xs mt-0.5">
                    {paymentConfirmed.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-default)]">
              <Button
                type="button"
                variant="primary"
                className="w-full justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent font-bold py-2.5"
                icon={<MessageCircle className="h-4 w-4" />}
                onClick={handleSendWhatsAppConfirmation}
                disabled={!paymentConfirmed.alumna.phone}
              >
                {paymentConfirmed.alumna.phone
                  ? `Enviar Aviso por WhatsApp a ${paymentConfirmed.alumna.first_name}`
                  : 'Sin teléfono registrado'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VISTA DEL FORMULARIO DEDICADO DE REGISTRO (INLINE, NATIVO)
  // ---------------------------------------------------------------------------
  return (
    <div
      id={id}
      className={`bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-5 sm:p-6 shadow-sm space-y-5 text-[var(--text-primary)] ${className}`}
    >
      {/* Cabecera del Formulario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-default)] pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--badge-meadow-bg)] border border-[var(--badge-meadow-border)] text-[var(--badge-meadow-text)] flex items-center justify-center font-bold">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
        </div>

        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-lg bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selector de Sede del Cobro */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Sede del cobro *
            </label>
            <select
              value={selectedSedeIdCobro}
              onChange={(e) => setSelectedSedeIdCobro(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-medium cursor-pointer"
            >
              {sedes.map((s) => (
                <option key={s.id} value={s.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador de Alumna */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Alumna *
            </label>
            <AlumnaCombobox
              alumnas={alumnas}
              selectedAlumnaId={selectedAlumna?.id || ''}
              onChange={(alumnaId) => {
                if (!alumnaId) {
                  handleClearAlumna();
                } else {
                  const found = alumnas.find((a) => a.id === alumnaId);
                  if (found) handleSelectAlumna(found);
                }
              }}
              sedes={sedes}
              selectedSedeId={selectedSedeIdCobro || 'ALL'}
            />
          </div>
        </div>

        {/* Tipo de Concepto y Duración */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
            Concepto y Duración del Cobro *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-[var(--bg-tertiary)] p-1.5 rounded-xl border border-[var(--border-default)]">
            {[
              { id: '1_MES', label: '1 Mes' },
              { id: '2_MESES', label: '2 Meses' },
              { id: '3_MESES', label: '3 Meses' },
              { id: 'CLASE_SUELTA', label: 'Clase Suelta' },
              { id: 'INSCRIPCION', label: 'Inscripción' },
              { id: 'OTRO', label: 'Otro' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleDuracionChange(item.id as any)}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  duracionTipo === item.id
                    ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aviso si la alumna está al día */}
        {selectedAlumna && selectedAlumna.billing_due_date && selectedAlumna.billing_due_date >= getLocalDateISO() && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">Alumna actualmente al día (vence el {formatFechaArg(selectedAlumna.billing_due_date)})</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Al registrar este cobro se renovará su cuota y el nuevo vencimiento pasará al <span className="font-bold underline">{formatFechaArg(dueDate)}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Alerta de cobro previo detectado en tiempo real */}
        {duplicateWarning && duplicateWarning.exists && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-xs animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[13px] flex items-center gap-1.5">
                Cobro previo detectado
              </p>
              <p className="leading-relaxed">
                {duplicateWarning.message}
              </p>
              <p className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/80 pt-0.5">
                ⚠️ Si decides continuar, el sistema te solicitará una doble confirmación de seguridad obligatoria antes de procesar el pago.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Importe ($ ARS) *"
            type="number"
            min="0"
            step="500"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            icon={<DollarSign className="h-4 w-4 text-[var(--color-wood)]" />}
            required
          />

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[var(--color-wood)]" /> Método de Pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as MetodoPago)}
              disabled={isSplitPayment}
              className={`w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] ${
                isSplitPayment ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sección de Pago Combinado */}
        <div className="p-3.5 bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSplitPayment}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsSplitPayment(checked);
                  if (checked && amount) {
                    const total = parseFloat(amount) || 0;
                    const mitad = Math.round(total / 2);
                    setSplitAmount1(String(mitad));
                    setSplitAmount2(String(total - mitad));
                  }
                }}
                className="rounded border-[var(--border-default)] text-[var(--btn-primary-bg)] focus:ring-[var(--btn-primary-bg)] cursor-pointer h-4 w-4"
              />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Pago combinado (Dividir en 2 métodos)
              </span>
            </label>
            {isSplitPayment && (
              <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Activo
              </span>
            )}
          </div>

          {isSplitPayment && (
            <div className="space-y-3 pt-2 border-t border-[var(--border-default)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)]">Método 1</label>
                  <select
                    value={splitMethod1}
                    onChange={(e) => setSplitMethod1(e.target.value as MetodoPago)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium focus:outline-none"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Monto método 1"
                    value={splitAmount1}
                    onChange={(e) => handleSplitAmount1Change(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)]">Método 2</label>
                  <select
                    value={splitMethod2}
                    onChange={(e) => setSplitMethod2(e.target.value as MetodoPago)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium focus:outline-none"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Monto método 2"
                    value={splitAmount2}
                    onChange={(e) => handleSplitAmount2Change(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {isSplitPayment && isFinite(parseFloat(amount)) && parseFloat(amount) > 0 && (
                <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                  <span>
                    💡 Cobro dividido: ${(parseFloat(splitAmount1) || 0).toLocaleString('es-AR')} en {splitMethod1} + ${(parseFloat(splitAmount2) || 0).toLocaleString('es-AR')} en {splitMethod2}
                  </span>
                  <span className={`font-mono font-bold ${(parseFloat(splitAmount1) || 0) + (parseFloat(splitAmount2) || 0) === parseFloat(amount) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Total: ${((parseFloat(splitAmount1) || 0) + (parseFloat(splitAmount2) || 0)).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Input
            label="Mes Abonado *"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            icon={<Calendar className="h-4 w-4 text-[var(--color-wood)]" />}
            required
          />

          <Input
            label="Próximo Vencimiento *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            icon={<Calendar className="h-4 w-4" />}
            required
          />

          {/* Campo de Comisión editable para Admin, oculto o bloqueado para Profesora */}
          {!disableCommissionEdit ? (
            <Input
              label="Comisión Profesora (%)"
              type="number"
              min="0"
              max="100"
              value={duracionTipo === 'INSCRIPCION' ? '0' : commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              disabled={duracionTipo === 'INSCRIPCION'}
              icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
            />
          ) : (
            <div className="hidden sm:block opacity-0 pointer-events-none" />
          )}
        </div>

        <div>
          <Input
            label="Observaciones / Comprobante"
            placeholder="Ej. Transferencia Mercado Pago nro #12345"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            icon={<FileText className="h-4 w-4" />}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-[var(--border-default)]">
          {selectedAlumna && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearAlumna}
              disabled={internalLoading}
              className="w-full sm:w-auto text-xs"
            >
              Limpiar Alumna
            </Button>
          )}

          <Button
            type="submit"
            loading={internalLoading}
            icon={<CheckCircle2 className="h-4 w-4" />}
            className="w-full sm:w-auto font-bold"
          >
            Registrar Cobro
          </Button>
        </div>
      </form>
    </div>
  );
}
