'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sede } from '@/types/database';
import { Building2, MapPin, Phone, BedDouble, CheckCircle2 } from 'lucide-react';

interface SedeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    address: string | null;
    phone: string | null;
    max_camillas: number;
    is_active?: boolean;
  }) => Promise<boolean>;
  sedeToEdit?: Sede | null;
  loading?: boolean;
}

export function SedeFormModal({
  open,
  onClose,
  onSubmit,
  sedeToEdit,
  loading = false,
}: SedeFormModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [maxCamillas, setMaxCamillas] = useState('6');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (sedeToEdit) {
      setName(sedeToEdit.name || '');
      setAddress(sedeToEdit.address || '');
      setPhone(sedeToEdit.phone || '');
      setMaxCamillas(String(sedeToEdit.max_camillas || 6));
      setIsActive(sedeToEdit.is_active ?? true);
    } else {
      setName('');
      setAddress('');
      setPhone('');
      setMaxCamillas('6');
      setIsActive(true);
    }
    setErrorMsg('');
  }, [sedeToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('El nombre de la sede es obligatorio');
      return;
    }

    const camillasNum = parseInt(maxCamillas, 10);
    if (isNaN(camillasNum) || camillasNum < 1) {
      setErrorMsg('La capacidad de camillas debe ser mayor a 0');
      return;
    }

    const success = await onSubmit({
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      max_camillas: camillasNum,
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
      title={sedeToEdit ? 'Editar Sede' : 'Crear Nueva Sede'}
      description="Gestiona la informacion de contacto y capacidad de camillas"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <Input
          label="Nombre de la Sede *"
          placeholder="Ej. Sede Zona Norte"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<Building2 className="h-4 w-4 text-[var(--color-wood)]" />}
          required
        />

        <Input
          label="Direccion"
          placeholder="Ej. Av. Nicaragua 148, La Rioja"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          icon={<MapPin className="h-4 w-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Telefono de contacto"
            placeholder="Ej. +54 380 4123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone className="h-4 w-4" />}
          />

          <Input
            label="Capacidad Maxima de Camillas *"
            type="number"
            min="1"
            max="12"
            value={maxCamillas}
            onChange={(e) => setMaxCamillas(e.target.value)}
            icon={<BedDouble className="h-4 w-4 text-[var(--color-wood)]" />}
            required
          />
        </div>

        {sedeToEdit && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
            <input
              type="checkbox"
              id="is_active_check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-wood)] rounded cursor-pointer"
            />
            <label htmlFor="is_active_check" className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
              Sede Activa (disponible en selectores del sistema)
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />}>
            {sedeToEdit ? 'Guardar Cambios' : 'Crear Sede'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
