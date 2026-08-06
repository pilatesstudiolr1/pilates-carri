'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, MetodoPago } from '@/types/database';
import { getAlumnas } from '@/lib/services/alumnas';
import { METODOS_PAGO } from '@/lib/constants';
import { DollarSign, Calendar, CreditCard, Percent, FileText, CheckCircle2 } from 'lucide-react';

interface PagoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    alumna_id: string;
    amount: number;
    payment_method: MetodoPago;
    due_date: string;
    commission_rate: number;
    notes?: string;
  }) => Promise<boolean>;
  loading?: boolean;
}

export function PagoFormModal({
  open,
  onClose,
  onSubmit,
  loading = false,
}: PagoFormModalProps) {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [alumnaId, setAlumnaId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<MetodoPago>('efectivo');


  // Automatic next month due date
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const defaultDueDate = nextMonthDate.toISOString().slice(0, 10);

  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [commissionRate, setCommissionRate] = useState('40');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      fetchAlumnas();
    }
  }, [open]);

  const fetchAlumnas = async () => {
    const { data } = await getAlumnas({ status: 'ACTIVE' });
    setAlumnas(data);
    if (data.length > 0 && !alumnaId) {
      setAlumnaId(data[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!alumnaId) {
      setErrorMsg('Debes seleccionar una alumna');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('El monto del cobro debe ser un número mayor a cero');
      return;
    }

    const success = await onSubmit({
      alumna_id: alumnaId,
      amount: numericAmount,
      payment_method: paymentMethod,
      due_date: dueDate,
      commission_rate: (parseFloat(commissionRate) || 40) / 100,
      notes: notes.trim(),
    });

    if (success) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar Pago de Mensualidad"
      description="Cobro automático con generación de fecha de vencimiento e ingreso a caja"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
            Seleccionar Alumna *
          </label>
          <select
            value={alumnaId}
            onChange={(e) => setAlumnaId(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
          >
            {alumnas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.last_name}, {a.first_name} (DNI: {a.dni})
              </option>
            ))}
          </select>
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
              <CreditCard className="h-4 w-4 text-[var(--color-wood)]" /> Método de Pago *
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
            label="Próximo Vencimiento (Automático) *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            icon={<Calendar className="h-4 w-4" />}
            required
          />

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
        </div>

        <Input
          label="Observaciones / Comprobante"
          placeholder="Ej. Transferencia Mercado Pago nro #12345"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          icon={<FileText className="h-4 w-4" />}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />}>
            Cobrar en 1 Clic
          </Button>
        </div>
      </form>
    </Modal>
  );
}
