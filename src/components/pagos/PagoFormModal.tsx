'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, MetodoPago, TipoPago } from '@/types/database';
import { getAlumnas } from '@/lib/services/alumnas';
import { METODOS_PAGO } from '@/lib/constants';
import { formatFechaArg, buildAvisoPagoWhatsAppMessage, openWhatsAppMessage } from '@/lib/utils';
import { DollarSign, Calendar, CreditCard, Percent, FileText, CheckCircle2, Search, X, User, MessageCircle } from 'lucide-react';

interface PagoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    alumna_id: string;
    amount: number;
    payment_method: MetodoPago;
    payment_type?: TipoPago;
    due_date: string;
    commission_rate: number;
    concept?: string;
    period?: string;
    profesora_id?: string;
    notes?: string;
  }) => Promise<boolean>;
  initialAlumna?: Alumna | null;
  defaultProfesoraId?: string;
  defaultCommissionRate?: number;
  disableCommissionEdit?: boolean;
  loading?: boolean;
}

export function PagoFormModal({
  open,
  onClose,
  onSubmit,
  initialAlumna,
  defaultProfesoraId,
  defaultCommissionRate,
  disableCommissionEdit = false,
  loading = false,
}: PagoFormModalProps) {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [alumnaSearch, setAlumnaSearch] = useState('');
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<MetodoPago>('efectivo');

  // Estado para confirmación exitosa con aviso de WhatsApp
  const [paymentConfirmed, setPaymentConfirmed] = useState<{
    alumna: Alumna;
    amount: number;
    dueDate: string;
    concept: string;
    paymentMethod: MetodoPago;
  } | null>(null);

  // Concepto y duracion del pago
  const [duracionTipo, setDuracionTipo] = useState<'1_MES' | '2_MESES' | '3_MESES' | 'CLASE_SUELTA' | 'INSCRIPCION' | 'OTRO'>('1_MES');
  const [concept, setConcept] = useState('Cuota mensualidad');

  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const defaultDueDate = nextMonthDate.toISOString().slice(0, 10);

  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [commissionRate, setCommissionRate] = useState('40');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPaymentConfirmed(null);
      setErrorMsg('');
      setAlumnaSearch('');
      setNotes('');
      setDuracionTipo('1_MES');
      setConcept('Cuota mensualidad');
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }

      if (initialAlumna) {
        setSelectedAlumna(initialAlumna);
        setAlumnaSearch(`${initialAlumna.last_name || ''}, ${initialAlumna.first_name}`);

        if (initialAlumna.preferred_payment_method) {
          setPaymentMethod(initialAlumna.preferred_payment_method as MetodoPago);
        }

        if (initialAlumna.billing_due_date) {
          setDueDate(initialAlumna.billing_due_date);
        } else {
          const next = new Date();
          next.setMonth(next.getMonth() + 1);
          setDueDate(next.toISOString().slice(0, 10));
        }

        // Si la alumna debe la matrícula de inscripción inicial
        if (!initialAlumna.enrollment_paid) {
          setDuracionTipo('INSCRIPCION');
          setConcept('Matrícula de inscripción inicial');
          setAmount(initialAlumna.enrollment_amount ? String(initialAlumna.enrollment_amount) : '9500');
          setCommissionRate('0');
        } else if (initialAlumna.plan_amount && initialAlumna.plan_amount > 0) {
          setDuracionTipo('1_MES');
          setConcept(initialAlumna.plan ? `Cuota mensualidad (${initialAlumna.plan})` : 'Cuota mensualidad (1 Mes)');
          setAmount(String(initialAlumna.plan_amount));
        } else if (
          initialAlumna.plan?.toLowerCase().includes('individual') ||
          initialAlumna.plan?.toLowerCase().includes('prueba') ||
          initialAlumna.plan?.toLowerCase().includes('suelta')
        ) {
          setDuracionTipo('CLASE_SUELTA');
          setConcept('Clase suelta individual');
          setAmount('8000');
        } else {
          setAmount('');
        }
      } else {
        setSelectedAlumna(null);
        setAmount('');
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        setDueDate(next.toISOString().slice(0, 10));
      }

      fetchAlumnas();
    }
  }, [open, initialAlumna, defaultProfesoraId, defaultCommissionRate]);

  const handleDuracionChange = (tipo: '1_MES' | '2_MESES' | '3_MESES' | 'CLASE_SUELTA' | 'INSCRIPCION' | 'OTRO') => {
    setDuracionTipo(tipo);
    const today = new Date();

    if (tipo === '1_MES') {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 1);
      setDueDate(d.toISOString().slice(0, 10));
      setConcept(selectedAlumna?.plan ? `Cuota mensualidad (${selectedAlumna.plan})` : 'Cuota mensualidad (1 Mes)');
      if (selectedAlumna?.plan_amount) setAmount(String(selectedAlumna.plan_amount));
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === '2_MESES') {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 2);
      setDueDate(d.toISOString().slice(0, 10));
      setConcept('Cuota Bimestral (2 Meses)');
      if (selectedAlumna?.plan_amount) setAmount(String(selectedAlumna.plan_amount * 2));
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === '3_MESES') {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 3);
      setDueDate(d.toISOString().slice(0, 10));
      setConcept('Cuota Trimestral (3 Meses)');
      if (selectedAlumna?.plan_amount) setAmount(String(selectedAlumna.plan_amount * 3));
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === 'CLASE_SUELTA') {
      setDueDate(today.toISOString().slice(0, 10));
      setConcept('Clase suelta individual');
      setAmount('8000');
      if (defaultCommissionRate != null) {
        setCommissionRate(String(Math.round(defaultCommissionRate * 100)));
      } else {
        setCommissionRate('40');
      }
    } else if (tipo === 'INSCRIPCION') {
      setDueDate(today.toISOString().slice(0, 10));
      setConcept('Matrícula de inscripción inicial');
      setAmount('9500');
      setCommissionRate('0');
    } else {
      setConcept('Pago personalizado');
    }
  };

  const fetchAlumnas = async () => {
    const { data } = await getAlumnas({
      status: 'ACTIVE',
      profesoraId: defaultProfesoraId || undefined,
      limit: 200,
    });
    setAlumnas(data);
  };

  // Filtro local en tiempo real
  const alumnasFiltradas = alumnaSearch.trim().length >= 1
    ? alumnas.filter((a) => {
        const q = alumnaSearch.toLowerCase();
        const firstName = (a.first_name || '').toLowerCase();
        const lastName = (a.last_name || '').toLowerCase();
        const dni = (a.dni || '').toLowerCase();
        return (
          firstName.includes(q) ||
          lastName.includes(q) ||
          dni.includes(q) ||
          `${lastName} ${firstName}`.includes(q)
        );
      }).slice(0, 8)
    : [];

  const handleSelectAlumna = (alumna: Alumna) => {
    setSelectedAlumna(alumna);
    setAlumnaSearch(`${alumna.last_name || ''}, ${alumna.first_name}`);
    setShowDropdown(false);
    if (alumna.plan_amount && alumna.plan_amount > 0) {
      setAmount(String(alumna.plan_amount));
    }
  };

  const handleClearAlumna = () => {
    setSelectedAlumna(null);
    setAlumnaSearch('');
    setAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedAlumna) {
      setErrorMsg('Debes seleccionar una alumna');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('El monto del cobro debe ser un numero mayor a cero');
      return;
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

    const success = await onSubmit({
      alumna_id: selectedAlumna.id,
      amount: numericAmount,
      payment_method: paymentMethod,
      payment_type: isInscripcion ? 'INSCRIPCION' : (duracionTipo === 'CLASE_SUELTA' ? 'CLASE_SUELTA' : 'MENSUALIDAD'),
      due_date: dueDate,
      commission_rate: finalCommissionRate,
      concept: currentConcept,
      period: new Date().toISOString().slice(0, 7),
      profesora_id: defaultProfesoraId || selectedAlumna.profesora_id || undefined,
      notes: notes.trim(),
    });

    if (success) {
      setPaymentConfirmed({
        alumna: selectedAlumna,
        amount: numericAmount,
        dueDate: dueDate,
        concept: currentConcept,
        paymentMethod: paymentMethod,
      });
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
    });
    openWhatsAppMessage(paymentConfirmed.alumna.phone, textMsg);
  };

  if (paymentConfirmed) {
    const alumnaNombre = `${paymentConfirmed.alumna.first_name} ${paymentConfirmed.alumna.last_name || ''}`.trim();
    return (
      <Modal
        open={open}
        onClose={() => {
          setPaymentConfirmed(null);
          onClose();
        }}
        title="¡Cobro Registrado con Éxito!"
        description="Comprobante e impacto correcto de cuota"
        size="md"
      >
        <div className="flex flex-col gap-5 text-[var(--text-primary)]">
          <div className="flex flex-col items-center justify-center text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Pago impactado correctamente
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                El cobro ingresó en caja y el vencimiento de la cuota fue actualizado.
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4 space-y-2.5 text-xs">
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
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
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

            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Medio de Pago:
              </span>
              <span className="text-[var(--text-primary)] font-semibold capitalize">
                {paymentConfirmed.paymentMethod.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Próximo Vencimiento:
              </span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {formatFechaArg(paymentConfirmed.dueDate)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              type="button"
              variant="primary"
              className="w-full justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
              icon={<MessageCircle className="h-4 w-4" />}
              onClick={handleSendWhatsAppConfirmation}
              disabled={!paymentConfirmed.alumna.phone}
            >
              {paymentConfirmed.alumna.phone
                ? `Enviar Aviso por WhatsApp a ${paymentConfirmed.alumna.first_name}`
                : 'Sin teléfono registrado'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center"
              onClick={() => {
                setPaymentConfirmed(null);
                onClose();
              }}
            >
              Listo / Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }


  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar Pago y Duración"
      description="Cobro con cálculo automático de comisión e impacto en caja y liquidación"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-[var(--text-primary)]">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

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
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
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

        {/* Buscador de Alumna */}
        <div ref={dropdownRef} className="relative">
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
            <User className="h-4 w-4 text-[var(--color-wood)]" /> Alumna *
          </label>

          {selectedAlumna ? (
            <div className="flex items-center justify-between p-3 rounded-md bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/40 text-xs">
              <div>
                <p className="font-bold text-[var(--text-primary)]">
                  {selectedAlumna.last_name}, {selectedAlumna.first_name}
                </p>
                <p className="text-[var(--text-muted)]">
                  DNI: {selectedAlumna.dni}
                  {selectedAlumna.plan && <span className="ml-2">• Plan: {selectedAlumna.plan}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearAlumna}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o DNI..."
                value={alumnaSearch}
                onChange={(e) => {
                  setAlumnaSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full h-10 pl-9 pr-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-sm placeholder:text-[var(--text-muted)]"
              />

              {/* Dropdown de resultados */}
              {showDropdown && alumnasFiltradas.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {alumnasFiltradas.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelectAlumna(a)}
                      className="w-full px-3 py-2.5 text-left text-xs hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-b border-[var(--border-default)] last:border-b-0"
                    >
                      <p className="font-semibold text-[var(--text-primary)]">
                        {a.last_name}, {a.first_name}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        DNI: {a.dni} • Tel: {a.phone}
                        {a.plan && <span className="ml-1">• {a.plan}</span>}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && alumnaSearch.trim().length >= 1 && alumnasFiltradas.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md shadow-lg p-3 text-xs text-[var(--text-muted)] text-center">
                  No se encontraron alumnas con ese criterio
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Importe ($ ARS) *"
            type="number"
            min="0"
            step="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            icon={<DollarSign className="h-4 w-4 text-[var(--color-wood)]" />}
            required
          />

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[var(--color-wood)]" /> Metodo de Pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as MetodoPago)}
              className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Proximo Vencimiento *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            icon={<Calendar className="h-4 w-4" />}
            required
          />

          {disableCommissionEdit ? (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-600" /> Comisión Profesora (%)
              </label>
              <div className="h-10 px-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-between text-sm font-bold text-[var(--text-primary)]">
                <span>{commissionRate}%</span>
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  Fijada por Administración
                </span>
              </div>
            </div>
          ) : (
            <Input
              label="Comisión Profesora (%)"
              type="number"
              min="0"
              max="100"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
              hint="Ej. 40% comisión por turno"
            />
          )}
        </div>

        <Input
          label="Observaciones / Comprobante"
          placeholder="Ej. Transferencia Mercado Pago nro #12345"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          icon={<FileText className="h-4 w-4" />}
        />

        {/* Preview de comision */}
        {selectedAlumna && amount && parseFloat(amount) > 0 && (
          <div className="p-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs flex items-center justify-between">
            {duracionTipo === 'INSCRIPCION' || concept.toLowerCase().includes('inscripci') ? (
              <>
                <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                  🟣 Caja General (Inscripción - Sin comisión a profesoras)
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  $0 ARS
                </span>
              </>
            ) : (
              <>
                <span className="text-[var(--text-muted)]">Comisión calculada ({commissionRate}%)</span>
                <span className="font-bold text-[var(--color-wood)]">
                  ${(parseFloat(amount) * (parseFloat(commissionRate) || 40) / 100).toLocaleString()} ARS
                </span>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">
            Cobrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
