'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Profile } from '@/types/database';
import { Clock, User, Users, Calendar } from 'lucide-react';

interface ClaseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    profesora_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number;
  }) => Promise<boolean>;
  profesoras: Profile[];
  initialDayOfWeek?: number;
  initialStartTime?: string;
  loading?: boolean;
}

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export function ClaseFormModal({
  open,
  onClose,
  onSubmit,
  profesoras,
  initialDayOfWeek,
  initialStartTime,
  loading = false,
}: ClaseFormModalProps) {
  const [name, setName] = useState('Clase Reformer');
  const [profesoraId, setProfesoraId] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [maxCapacity, setMaxCapacity] = useState<number>(6);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      if (initialDayOfWeek) setDayOfWeek(initialDayOfWeek);
      if (initialStartTime) {
        setStartTime(initialStartTime);
        const hourNum = parseInt(initialStartTime.slice(0, 2), 10);
        const nextHour = (hourNum + 1).toString().padStart(2, '0') + ':00';
        setEndTime(nextHour);
      }
      if (profesoras.length > 0 && !profesoraId) {
        setProfesoraId(profesoras[0].id);
      }
    }
  }, [open, initialDayOfWeek, initialStartTime, profesoras, profesoraId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (maxCapacity < 4 || maxCapacity > 6) {
      setErrorMsg('La capacidad de la clase debe estar entre 4 y 6 alumnas.');
      return;
    }

    const success = await onSubmit({
      name: name.trim(),
      profesora_id: profesoraId || null,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
    });

    if (success) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear Nuevo Turno de Clase"
      description="Configura el horario, profesora asignada y cupo de la clase"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <Input
          label="Nombre del Turno / Clase *"
          placeholder="Ej. Reformer Mañana"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[var(--color-wood)]" /> Día de la Semana *
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
            >
              {DIAS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <User className="h-4 w-4 text-[var(--color-wood)]" /> Profesora a Cargo
            </label>
            <select
              value={profesoraId}
              onChange={(e) => setProfesoraId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
            >
              <option value="">Sin profesora asignada</option>
              {profesoras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Hora Inicio *"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            icon={<Clock className="h-4 w-4" />}
            required
          />

          <Input
            label="Hora Fin *"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            icon={<Clock className="h-4 w-4" />}
            required
          />

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[var(--color-wood)]" /> Cupo Max (4-6) *
            </label>
            <select
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
            >
              <option value={4}>4 Alumnas</option>
              <option value={5}>5 Alumnas</option>
              <option value={6}>6 Alumnas (Máximo)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear Turno
          </Button>
        </div>
      </form>
    </Modal>
  );
}
