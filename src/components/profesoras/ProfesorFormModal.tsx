'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Profile, UserRole } from '@/types/database';
import { User, Phone, Mail, Percent, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ProfesorFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    email: string;
    full_name: string;
    role: UserRole;
    phone?: string | null;
    dni?: string | null;
    commission_rate?: number;
    is_active?: boolean;
  }) => Promise<boolean>;
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
  const [dni, setDni] = useState('');
  const [role, setRole] = useState<UserRole>('PROFESORA');
  const [commissionPercent, setCommissionPercent] = useState('40');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profileToEdit) {
      setFullName(profileToEdit.full_name || '');
      setEmail(profileToEdit.email || '');
      setPhone(profileToEdit.phone || '');
      setDni(profileToEdit.dni || '');
      setRole(profileToEdit.role || 'PROFESORA');
      setCommissionPercent(
        profileToEdit.commission_rate !== undefined
          ? (profileToEdit.commission_rate * 100).toString()
          : '40'
      );
      setIsActive(profileToEdit.is_active ?? true);
    } else {
      setFullName('');
      setEmail('');
      setPhone('');
      setDni('');
      setRole('PROFESORA');
      setCommissionPercent('40');
      setIsActive(true);
    }
    setErrorMsg('');
  }, [profileToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('El correo electronico es obligatorio para asociar la cuenta de Supabase');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('El nombre completo es obligatorio');
      return;
    }

    const commissionValue = parseFloat(commissionPercent);
    if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
      setErrorMsg('El porcentaje de comision debe estar entre 0 y 100%');
      return;
    }

    const success = await onSubmit({
      id: profileToEdit?.id,
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      dni: dni.trim() || null,
      role,
      commission_rate: commissionValue / 100,
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
      title={profileToEdit ? 'Editar Perfil y Rol de Usuario' : 'Asignar Rol a Cuenta por Email'}
      description="Vincula el correo registrado en Supabase Auth y asigna su rol (Admin o Profesora)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Correo Electronico Registrado en Supabase *"
            type="email"
            placeholder="ej. profesora@gmail.com u admin@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!profileToEdit}
            icon={<Mail className="h-4 w-4 text-[var(--color-wood)]" />}
            hint={profileToEdit ? 'Correo vinculado al ID de autenticacion' : 'Debe coincidir con el email creado en Supabase Auth'}
            required
          />

          <Input
            label="Nombre Completo *"
            placeholder="Ej. Maria Belen Garcia"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User className="h-4 w-4" />}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="DNI"
            placeholder="Ej. 38123456"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />

          <Input
            label="Telefono de Contacto"
            placeholder="+54 380 4123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[var(--color-wood)]" /> Rol en el Sistema *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-sm"
            >
              <option value="PROFESORA">Profesora (Acceso a agenda y alumnas asignadas)</option>
              <option value="ADMIN">Administradora (Acceso Total y Recaudacion)</option>
            </select>
          </div>

          <Input
            label="Porcentaje de Comision (%) *"
            type="number"
            min="0"
            max="100"
            step="1"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
            hint="Comision por cobro de mensualidad (Ej: 40%)"
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
            Cuenta de usuario activa (Habilitada para iniciar sesion)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />}>
            {profileToEdit ? 'Guardar Cambios' : 'Asignar / Crear Perfil'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
