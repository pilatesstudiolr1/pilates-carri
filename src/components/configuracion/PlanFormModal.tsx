'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlanItem } from '@/lib/services/planes';
import { Tag, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    weekly_classes: number;
    price: number;
    description?: string;
    is_active?: boolean;
  }) => Promise<boolean>;
  planToEdit?: PlanItem | null;
  loading?: boolean;
}

export function PlanFormModal({
  open,
  onClose,
  onSubmit,
  planToEdit,
  loading = false,
}: PlanFormModalProps) {
  const [name, setName] = useState('');
  const [weeklyClasses, setWeeklyClasses] = useState('2');
  const [price, setPrice] = useState('45000');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name || '');
      setWeeklyClasses(planToEdit.weekly_classes?.toString() || '2');
      setPrice(planToEdit.price?.toString() || '0');
      setDescription(planToEdit.description || '');
      setIsActive(planToEdit.is_active ?? true);
    } else {
      setName('');
      setWeeklyClasses('2');
      setPrice('45000');
      setDescription('');
      setIsActive(true);
    }
    setErrorMsg('');
  }, [planToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('El nombre del plan es obligatorio');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('El precio del plan debe ser un número válido');
      return;
    }

    const classesNum = parseInt(weeklyClasses, 10);
    if (isNaN(classesNum) || classesNum < 1) {
      setErrorMsg('La cantidad de veces por semana debe ser mayor a 0');
      return;
    }

    const success = await onSubmit({
      name: name.trim(),
      weekly_classes: classesNum,
      price: priceNum,
      description: description.trim() || undefined,
      is_active: isActive,
    });

    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={planToEdit ? 'Editar Plan de Clases' : 'Nuevo Plan de Clases'}
      description="Define las clases semanales, precio y estado del plan para asignar a las alumnas"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-[var(--text-primary)]">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <Input
          label="Nombre del Plan *"
          placeholder="Ej. 2 veces por semana"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<Tag className="h-4 w-4 text-[var(--color-wood)]" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Clases Semanales *"
            type="number"
            min="1"
            max="7"
            value={weeklyClasses}
            onChange={(e) => setWeeklyClasses(e.target.value)}
            icon={<Calendar className="h-4 w-4 text-[var(--color-wood)]" />}
            required
          />

          <Input
            label="Precio / Importe Mensual ($) *"
            type="number"
            min="0"
            step="500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            icon={<DollarSign className="h-4 w-4 text-[var(--color-wood)]" />}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Descripción o Notas del Plan
          </label>
          <textarea
            rows={2}
            placeholder="Ejemplo: 8 clases al mes con flexibilidad de horario"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs placeholder:text-[var(--text-muted)] resize-none"
          />
        </div>

        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <input
            type="checkbox"
            id="is_active_plan"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-wood)] cursor-pointer rounded"
          />
          <label htmlFor="is_active_plan" className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
            Plan activo (Disponible para selección en fichas de nuevas alumnas)
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">
            {planToEdit ? 'Guardar Cambios' : 'Crear Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
