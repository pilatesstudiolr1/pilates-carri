'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlumnaCombobox } from '@/components/pagos/AlumnaCombobox';
import { Pago, MetodoPago, TipoPago, Sede, Alumna, Profile } from '@/types/database';
import { updatePago } from '@/lib/services/pagos';
import { getAlumnas } from '@/lib/services/alumnas';
import { getProfiles } from '@/lib/services/profesoras';
import { METODOS_PAGO } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import { formatFechaArg, calculateNextDueDate, getLocalDateISO } from '@/lib/utils';
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Building2,
  CheckCircle2,
  User,
  Percent,
  AlertTriangle,
} from 'lucide-react';

interface EditarPagoModalProps {
  open: boolean;
  onClose: () => void;
  pago: Pago | null;
  sedes: Sede[];
  onSuccess: (updatedPago: Pago) => void;
}

type DuracionTipo = '1_MES' | '2_MESES' | '3_MESES' | 'CLASE_SUELTA' | 'INSCRIPCION' | 'OTRO';

export function EditarPagoModal({
  open,
  onClose,
  pago,
  sedes,
  onSuccess,
}: EditarPagoModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Listados de alumnas y profesoras
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [profesoras, setProfesoras] = useState<Profile[]>([]);

  // Estados de datos de cobro (exactamente los mismos que PagoForm)
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [duracionTipo, setDuracionTipo] = useState<DuracionTipo>('1_MES');
  const [concept, setConcept] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<MetodoPago>('efectivo');

  // Pago combinado
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitMethod1, setSplitMethod1] = useState<MetodoPago>('transferencia');
  const [splitAmount1, setSplitAmount1] = useState<string>('');
  const [splitMethod2, setSplitMethod2] = useState<MetodoPago>('efectivo');
  const [splitAmount2, setSplitAmount2] = useState<string>('');

  // Período, Vencimiento, Comisión, Profesora y Notas
  const [period, setPeriod] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [commissionRate, setCommissionRate] = useState<string>('40');
  const [profesoraId, setProfesoraId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Carga de alumnas y profesoras
  useEffect(() => {
    let isMounted = true;
    async function loadAuxData() {
      try {
        const [alumnasRes, profRes] = await Promise.all([
          getAlumnas({ limit: 400 }),
          getProfiles({ role: 'PROFESORA', isActive: true }),
        ]);
        if (isMounted) {
          if (alumnasRes.data) setAlumnas(alumnasRes.data);
          if (profRes.data) setProfesoras(profRes.data);
        }
      } catch (err) {
        console.warn('Error al cargar datos auxiliares en modal:', err);
      }
    }
    if (open) {
      loadAuxData();
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Inicializar formulario con los datos exactos del registro existente
  useEffect(() => {
    if (pago && open) {
      // 1. Alumna
      setSelectedAlumna(pago.alumna || null);

      // 2. Sede
      setSelectedSedeId(pago.sede_id || (sedes.length > 0 ? sedes[0].id : ''));

      // 3. Fecha de Cobro
      const rawDate = pago.payment_date ? pago.payment_date.slice(0, 10) : getLocalDateISO();
      setPaymentDate(rawDate);

      // 4. Monto
      setAmount(pago.amount ? String(pago.amount) : '');

      // 5. Concepto y Duración
      const rawConcept = pago.concept || '';
      setConcept(rawConcept);

      const conceptLower = rawConcept.toLowerCase();
      if (pago.payment_type === 'INSCRIPCION' || conceptLower.includes('inscri') || conceptLower.includes('matr')) {
        setDuracionTipo('INSCRIPCION');
      } else if (pago.payment_type === 'CLASE_SUELTA' || conceptLower.includes('suelta') || conceptLower.includes('individual')) {
        setDuracionTipo('CLASE_SUELTA');
      } else if (conceptLower.includes('trimestral') || conceptLower.includes('3 mes')) {
        setDuracionTipo('3_MESES');
      } else if (conceptLower.includes('bimestral') || conceptLower.includes('2 mes')) {
        setDuracionTipo('2_MESES');
      } else if (pago.payment_type === 'MENSUALIDAD' || conceptLower.includes('mensual') || conceptLower.includes('1 mes')) {
        setDuracionTipo('1_MES');
      } else {
        setDuracionTipo('OTRO');
      }

      // 6. Método de pago
      const initialMethod = (pago.payment_method || 'efectivo') as MetodoPago;
      setPaymentMethod(initialMethod);

      // 7. Detección de Pago Combinado en notas previas
      const rawNotes = pago.notes || '';
      const splitMatch = rawNotes.match(/\[Métodos de pago: ([^:]+): \$([0-9.,]+) \| ([^:]+): \$([0-9.,]+)\]/i);

      if (splitMatch) {
        setIsSplitPayment(true);
        const m1Raw = splitMatch[1].trim().toLowerCase();
        const a1Raw = splitMatch[2].replace(/\./g, '').replace(',', '.');
        const m2Raw = splitMatch[3].trim().toLowerCase();
        const a2Raw = splitMatch[4].replace(/\./g, '').replace(',', '.');

        setSplitMethod1(m1Raw.includes('trans') ? 'transferencia' : m1Raw.includes('efec') ? 'efectivo' : (m1Raw as MetodoPago));
        setSplitAmount1(a1Raw);
        setSplitMethod2(m2Raw.includes('trans') ? 'transferencia' : m2Raw.includes('efec') ? 'efectivo' : (m2Raw as MetodoPago));
        setSplitAmount2(a2Raw);

        // Limpiar etiqueta interna de notas para la edición limpia
        setNotes(rawNotes.replace(/\[Métodos de pago: [^\]]+\]/g, '').trim());
      } else {
        setIsSplitPayment(false);
        const tot = pago.amount || 0;
        const mitad = Math.round(tot / 2);
        setSplitAmount1(String(mitad));
        setSplitAmount2(String(tot - mitad));
        setSplitMethod1('transferencia');
        setSplitMethod2('efectivo');
        setNotes(rawNotes);
      }

      // 8. Período y Vencimiento
      setPeriod(pago.period ? pago.period.slice(0, 7) : getLocalDateISO().slice(0, 7));
      setDueDate(pago.due_date ? pago.due_date.slice(0, 10) : '');

      // 9. Comisión Profesora
      if (pago.commission_rate != null) {
        setCommissionRate(String(Math.round(pago.commission_rate * 100)));
      } else if (pago.payment_type === 'INSCRIPCION') {
        setCommissionRate('0');
      } else {
        setCommissionRate('40');
      }

      // 10. Profesora Asignada
      setProfesoraId(pago.profesora_id || '');

      setErrorMsg('');
    }
  }, [pago, open, sedes]);

  // Manejadores interactivos para división de pago
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (isSplitPayment) {
      const total = parseFloat(val) || 0;
      const mitad = Math.round(total / 2);
      setSplitAmount1(String(mitad));
      setSplitAmount2(String(total - mitad));
    }
  };

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

  // Cambio de duración / píldoras
  const handleDuracionChange = (tipo: DuracionTipo) => {
    setDuracionTipo(tipo);
    const today = getLocalDateISO();

    if (tipo === '1_MES') {
      setDueDate(calculateNextDueDate(selectedAlumna?.billing_due_date, 1));
      setConcept(selectedAlumna?.plan ? `Cuota mensualidad (${selectedAlumna.plan})` : 'Cuota mensualidad (1 Mes)');
      if (selectedAlumna?.plan_amount) handleAmountChange(String(selectedAlumna.plan_amount));
      setCommissionRate('40');
    } else if (tipo === '2_MESES') {
      setDueDate(calculateNextDueDate(selectedAlumna?.billing_due_date, 2));
      setConcept('Cuota Bimestral (2 Meses)');
      if (selectedAlumna?.plan_amount) handleAmountChange(String(selectedAlumna.plan_amount * 2));
      setCommissionRate('40');
    } else if (tipo === '3_MESES') {
      setDueDate(calculateNextDueDate(selectedAlumna?.billing_due_date, 3));
      setConcept('Cuota Trimestral (3 Meses)');
      if (selectedAlumna?.plan_amount) handleAmountChange(String(selectedAlumna.plan_amount * 3));
      setCommissionRate('40');
    } else if (tipo === 'CLASE_SUELTA') {
      setDueDate(today);
      setConcept('Clase suelta individual');
      setCommissionRate('40');
    } else if (tipo === 'INSCRIPCION') {
      setDueDate(today);
      setConcept('Matrícula de inscripción inicial');
      setCommissionRate('0');
    } else {
      setConcept(concept || 'Pago personalizado');
    }
  };

  // Manejador al seleccionar alumna desde el Combobox
  const handleSelectAlumna = (alumnaId: string) => {
    if (!alumnaId) {
      setSelectedAlumna(null);
      return;
    }
    const found = alumnas.find((a) => a.id === alumnaId);
    if (found) {
      setSelectedAlumna(found);
      if (found.sede_id) {
        setSelectedSedeId(found.sede_id);
      }
      if (found.profesora_id) {
        setProfesoraId(found.profesora_id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pago) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('El monto del cobro debe ser mayor a cero');
      return;
    }

    let finalNotes = notes.trim();
    if (isSplitPayment) {
      const num1 = parseFloat(splitAmount1) || 0;
      const num2 = parseFloat(splitAmount2) || 0;
      if (num1 <= 0 || num2 <= 0) {
        setErrorMsg('En el pago combinado, ambos métodos deben tener montos mayores a cero');
        return;
      }
      if (Math.abs(num1 + num2 - numericAmount) > 0.01) {
        setErrorMsg(
          `La suma de los métodos ($${(num1 + num2).toLocaleString('es-AR')}) no coincide con el total ($${numericAmount.toLocaleString('es-AR')})`
        );
        return;
      }
      const m1Label = splitMethod1 === 'transferencia' ? 'Transferencia' : splitMethod1 === 'efectivo' ? 'Efectivo' : splitMethod1;
      const m2Label = splitMethod2 === 'transferencia' ? 'Transferencia' : splitMethod2 === 'efectivo' ? 'Efectivo' : splitMethod2;
      const splitDetailsStr = `${m1Label}: $${num1.toLocaleString('es-AR')} | ${m2Label}: $${num2.toLocaleString('es-AR')}`;
      finalNotes = `${finalNotes} [Métodos de pago: ${splitDetailsStr}]`.trim();
    }

    const currentConcept = concept.trim() || 'Cuota mensualidad';
    const isInscripcion = duracionTipo === 'INSCRIPCION' || currentConcept.toLowerCase().includes('inscri');
    const computedType: TipoPago = isInscripcion
      ? 'INSCRIPCION'
      : duracionTipo === 'CLASE_SUELTA'
      ? 'CLASE_SUELTA'
      : 'MENSUALIDAD';

    const finalCommRate = isInscripcion ? 0 : (parseFloat(commissionRate) || 40) / 100;

    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await updatePago(pago.id, {
        amount: numericAmount,
        payment_method: (isSplitPayment ? splitMethod1 : paymentMethod) as MetodoPago,
        payment_type: computedType,
        payment_date: paymentDate || undefined,
        due_date: isInscripcion ? undefined : dueDate || undefined,
        period: period || undefined,
        concept: currentConcept,
        commission_rate: finalCommRate,
        sede_id: selectedSedeId || undefined,
        alumna_id: selectedAlumna?.id || pago.alumna_id,
        profesora_id: profesoraId || undefined,
        notes: finalNotes || undefined,
      });

      if (error || !data) {
        setErrorMsg(error || 'Error al actualizar el cobro');
        return;
      }

      toast.success('Registro de cobro actualizado correctamente', 'Guardado con Éxito');
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al actualizar el cobro');
    } finally {
      setLoading(false);
    }
  };

  const alumnaNombre = selectedAlumna
    ? `${selectedAlumna.first_name} ${selectedAlumna.last_name || ''}`.trim()
    : pago?.alumna
    ? `${pago.alumna.first_name} ${pago.alumna.last_name || ''}`.trim()
    : 'Alumna';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Registro de Cobro"
      description={`Modificando cobro de ${alumnaNombre} · ID #${pago?.id?.slice(0, 8)}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-[var(--text-primary)]">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-lg bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Fila 1: Sede y Alumna */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selector de Sede del Cobro */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Sede del cobro *
            </label>
            <select
              value={selectedSedeId}
              onChange={(e) => setSelectedSedeId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-medium cursor-pointer"
            >
              {sedes.map((s) => (
                <option key={s.id} value={s.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador y Selector de Alumna */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Alumna *
            </label>
            <AlumnaCombobox
              alumnas={alumnas.length > 0 ? alumnas : selectedAlumna ? [selectedAlumna] : []}
              selectedAlumnaId={selectedAlumna?.id || pago?.alumna_id || ''}
              onChange={handleSelectAlumna}
              sedes={sedes}
              selectedSedeId={selectedSedeId || 'ALL'}
            />
          </div>
        </div>

        {/* Fila 2: Píldoras de Concepto y Duración */}
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
                onClick={() => handleDuracionChange(item.id as DuracionTipo)}
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

        {/* Fila 3: Concepto Detallado y Fecha del Cobro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Concepto Detallado *"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. Cuota mensualidad (2 veces por semana)"
              icon={<FileText className="h-4 w-4" />}
              required
            />
          </div>

          <div>
            <Input
              label="Fecha del Cobro *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              icon={<Calendar className="h-4 w-4 text-[var(--color-wood)]" />}
              required
            />
          </div>
        </div>

        {/* Aviso de Alumna al Día / Vencimiento */}
        {selectedAlumna && selectedAlumna.billing_due_date && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-bold">
                Alumna con cuota registrada (vencimiento actual: {formatFechaArg(selectedAlumna.billing_due_date)})
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Al guardar cambios con nueva fecha de vencimiento se actualizará su estado a{' '}
                <span className="font-bold underline">{dueDate ? formatFechaArg(dueDate) : 'fecha fijada'}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Fila 4: Importe y Método de Pago */}
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
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Método de Pago *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as MetodoPago)}
              disabled={isSplitPayment}
              className={`w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-medium cursor-pointer ${
                isSplitPayment ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 5: Sección de Pago Combinado (Dividir en 2 medios) */}
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
                    className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        {m.label}
                      </option>
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
                    className="w-full h-9 px-2.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        {m.label}
                      </option>
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

              {isFinite(parseFloat(amount)) && parseFloat(amount) > 0 && (
                <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                  <span>
                    💡 Cobro dividido: ${(parseFloat(splitAmount1) || 0).toLocaleString('es-AR')} en {splitMethod1} + $
                    {(parseFloat(splitAmount2) || 0).toLocaleString('es-AR')} en {splitMethod2}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      (parseFloat(splitAmount1) || 0) + (parseFloat(splitAmount2) || 0) === parseFloat(amount)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    Total: ${((parseFloat(splitAmount1) || 0) + (parseFloat(splitAmount2) || 0)).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fila 6: Mes Abonado + Próximo Vencimiento + Comisión Profesora (%) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            required={duracionTipo !== 'INSCRIPCION'}
          />

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
        </div>

        {/* Fila 7: Profesora Asignada */}
        {profesoras.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Profesora Asignada (Comisión)
            </label>
            <select
              value={profesoraId}
              onChange={(e) => setProfesoraId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-medium cursor-pointer"
            >
              <option value="" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">Sin profesora asignada</option>
              {profesoras.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {p.full_name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fila 8: Observaciones / Comprobante */}
        <div>
          <Input
            label="Observaciones / Comprobante"
            placeholder="Ej. Transferencia Mercado Pago nro #12345"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            icon={<FileText className="h-4 w-4" />}
          />
        </div>

        {/* Botones de Pie */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
