'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Profile, ProfileUpdate, UserRole } from '@/types/database';
import { User, Phone, Mail, Percent, ShieldCheck, DollarSign } from 'lucide-react';

interface ProfesorFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: ProfileUpdate) => Promise<boolean>;
  profileToEdit: Profile | null;
  loading?: boolean;
}

export function ProfesorFormModal({
  open,
  onClose,
  onSubmit,
  profileToEdit,
  loading = false,
}: ProfesorFormModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('PROFESORA');
  const [commissionPercent, setCommissionPercent] = useState('40');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profileToEdit) {
      setFullName(profileToEdit.full_name || '');
      setEmail(profileToEdit.email || '');
      setPhone(profileToEdit.phone || '');
      setRole(profileToEdit.role || 'PROFESORA');
      setCommissionPercent(
        profileToEdit.commission_rate !== undefined
          ? (profileToEdit.commission_rate * 100).toString()
          : '40'
      );
      setHourlyRate(
        profileToEdit.hourly_rate !== undefined
          ? profileToEdit.hourly_rate.toString()
          : '0'
      );
      setIsActive(profileToEdit.is_active ?? true);
      setErrorMsg('');
    }
  }, [profileToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profileToEdit) {
      setErrorMsg('Debes seleccionar un usuario para modificar');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('El nombre completo es obligatorio');
      return;
    }

    const commissionValue = parseFloat(commissionPercent);
    if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
      setErrorMsg('El porcentaje de comisión debe estar entre 0 y 100%');
      return;
    }

    const payload: ProfileUpdate = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      role,
      commission_rate: commissionValue / 100,
      hourly_rate: parseFloat(hourlyRate) || 0,
      is_active: isActive,
    };

    const success = await onSubmit(profileToEdit.id, payload);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar Perfil de Usuario"
      description="Actualiza los datos personales, rol y comisiones del usuario"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <Input
          label="Nombre Completo *"
          placeholder="Ej. Laura Giménez"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User className="h-4 w-4" />}
          required
        />

        <Input
          label="Correo Electrónico (Solo Lectura)"
          type="email"
          value={email}
          disabled
          icon={<Mail className="h-4 w-4" />}
          hint="El correo está vinculado a la cuenta de autenticación"
        />

        <Input
          label="Teléfono de Contacto"
          placeholder="+54 380 4123456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone className="h-4 w-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[var(--color-wood)]" /> Rol del Sistema *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
            >
              <option value="PROFESORA">Profesora</option>
              <option value="ADMIN">Administradora (Acceso Total)</option>
            </select>
          </div>

          <Input
            label="Porcentaje de Comisión (%)"
            type="number"
            min="0"
            max="100"
            step="1"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
            hint="Comisión por cobro de clases (Ej: 40%)"
          />
        </div>

        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <input
            type="checkbox"
            id="is_active_user"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-wood)] cursor-pointer rounded"
          />
          <label htmlFor="is_active_user" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer select-none">
            Cuenta de usuario activa (Habilitada para ingresar)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
