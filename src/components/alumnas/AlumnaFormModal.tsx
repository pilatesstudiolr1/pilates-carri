'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, AlumnaInsert, AlumnaStatus } from '@/types/database';
import { User, Phone, Mail, MapPin, FileText, AlertCircle, Heart, CheckCircle2 } from 'lucide-react';

interface AlumnaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AlumnaInsert) => Promise<boolean>;
  alumnaToEdit?: Alumna | null;
  loading?: boolean;
}

export function AlumnaFormModal({
  isOpen,
  onClose,
  onSubmit,
  alumnaToEdit,
  loading = false,
}: AlumnaFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [injuries, setInjuries] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [medication, setMedication] = useState('');
  const [consentSigned, setConsentSigned] = useState(true);
  const [observations, setObservations] = useState('');
  const [status, setStatus] = useState<AlumnaStatus>('ACTIVE');
  const [entryDate, setEntryDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (alumnaToEdit) {
      setFirstName(alumnaToEdit.first_name || '');
      setLastName(alumnaToEdit.last_name || '');
      setDni(alumnaToEdit.dni || '');
      setPhone(alumnaToEdit.phone || '');
      setEmail(alumnaToEdit.email || '');
      setAddress(alumnaToEdit.address || '');
      setEmergencyContactName(alumnaToEdit.emergency_contact_name || '');
      setEmergencyContactPhone(alumnaToEdit.emergency_contact_phone || '');
      setInjuries(alumnaToEdit.injuries || '');
      setIsPregnant(alumnaToEdit.is_pregnant || false);
      setMedication(alumnaToEdit.medication || '');
      setConsentSigned(alumnaToEdit.consent_signed ?? true);
      setObservations(alumnaToEdit.observations || '');
      setStatus(alumnaToEdit.status || 'ACTIVE');
      setEntryDate(alumnaToEdit.entry_date || new Date().toISOString().split('T')[0]);
    } else {
      resetForm();
    }
  }, [alumnaToEdit, isOpen]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setDni('');
    setPhone('');
    setEmail('');
    setAddress('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setInjuries('');
    setIsPregnant(false);
    setMedication('');
    setConsentSigned(true);
    setObservations('');
    setStatus('ACTIVE');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !lastName.trim() || !dni.trim() || !phone.trim()) {
      setErrorMsg('Por favor completa los campos obligatorios (Nombre, Apellido, DNI y Teléfono)');
      return;
    }

    const payload: AlumnaInsert = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      dni: dni.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      photo_url: alumnaToEdit?.photo_url || null,
      emergency_contact_name: emergencyContactName.trim() || null,
      emergency_contact_phone: emergencyContactPhone.trim() || null,
      injuries: injuries.trim() || null,
      is_pregnant: isPregnant,
      medication: medication.trim() || null,
      consent_signed: consentSigned,
      observations: observations.trim() || null,
      status,
      entry_date: entryDate || new Date().toISOString().split('T')[0],
      exit_date: alumnaToEdit?.exit_date || null,
      exit_reason: alumnaToEdit?.exit_reason || null,
      sede_id: alumnaToEdit?.sede_id || null,
      created_by: null,
    };

    const success = await onSubmit(payload);
    if (success) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={alumnaToEdit ? 'Editar Ficha de Alumna' : 'Registrar Nueva Alumna'}
      description="Completa los datos de la alumna y su ficha médica"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Seccion 1: Datos Personales */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wood)] mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Datos Personales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              placeholder="Ej. María"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Apellido *"
              placeholder="Ej. González"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              label="DNI *"
              placeholder="12345678"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
            />
            <Input
              label="Teléfono *"
              placeholder="+54 380 4123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="maria@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Dirección"
              placeholder="Calle 123, La Rioja"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              icon={<MapPin className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Seccion 2: Contacto de Emergencia */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wood)] mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Contacto de Emergencia
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre de contacto"
              placeholder="Nombre del familiar / contacto"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
            <Input
              label="Teléfono de emergencia"
              placeholder="+54 380 4999999"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Seccion 3: Ficha Medica y Salud */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wood)] mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4" /> Ficha Médica y Salud
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input
              label="Lesiones / Dolencias"
              placeholder="Ej. Hernia lumbar L5-S1, esguince..."
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
            />
            <Input
              label="Medicación habitual"
              placeholder="Medicamentos que consume..."
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={(e) => setIsPregnant(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-wood)] rounded cursor-pointer"
              />
              <span>Embarazo (En gestación)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentSigned}
                onChange={(e) => setConsentSigned(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-wood)] rounded cursor-pointer"
              />
              <span>Consentimiento informado firmado</span>
            </label>
          </div>
        </div>

        {/* Seccion 4: Estado y Observaciones */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wood)] mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Observaciones y Estado
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
                Estado de la alumna
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AlumnaStatus)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs"
              >
                <option value="ACTIVE">Activa</option>
                <option value="INACTIVE">Inactiva (Baja)</option>
                <option value="SUSPENDED">Suspendida</option>
              </select>
            </div>

            <Input
              label="Fecha de ingreso"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Observaciones generales
            </label>
            <textarea
              rows={3}
              placeholder="Notas sobre horarios preferidos, nivel o requerimientos de postura..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] placeholder:text-[var(--text-muted)] text-xs"
            />
          </div>
        </div>


        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {alumnaToEdit ? 'Guardar Cambios' : 'Registrar Alumna'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
