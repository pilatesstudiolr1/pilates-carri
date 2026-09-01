'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, AlumnaInsert, AlumnaStatus, MetodoPago } from '@/types/database';
import { getPlanes, PlanItem } from '@/lib/services/planes';
import { useSede } from '@/hooks/useSede';
import { User, Phone, Mail, FileText, AlertCircle, Heart, CheckCircle2, Cake, Shield, Calendar, Clock, DollarSign, MapPin } from 'lucide-react';

interface AlumnaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AlumnaInsert) => Promise<boolean>;
  alumnaToEdit?: Alumna | null;
  loading?: boolean;
}

function calcularEdad(fechaNacimiento: string): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : null;
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
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [injuries, setInjuries] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [medication, setMedication] = useState('');
  const [consentSigned, setConsentSigned] = useState(true);
  const [observations, setObservations] = useState('');
  const [status, setStatus] = useState<AlumnaStatus>('ACTIVE');
  const [entryDate, setEntryDate] = useState('');

  // Sede
  const { sedes, selectedSedeId } = useSede();
  const [sedeId, setSedeId] = useState('');

  // Plan y Fechas de Vigencia
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [planAmount, setPlanAmount] = useState('0');
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingDueDate, setBillingDueDate] = useState('');

  // Inscripción y Cobro Inicial ($9500)
  const [enrollmentPaid, setEnrollmentPaid] = useState(false);
  const [enrollmentAmount, setEnrollmentAmount] = useState('9500');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<MetodoPago>('efectivo');

  const [errorMsg, setErrorMsg] = useState('');

  const edadCalculada = dateOfBirth ? calcularEdad(dateOfBirth) : null;

  useEffect(() => {
    async function fetchPlanes() {
      const res = await getPlanes({ onlyActive: true });
      setPlanes(res.data);
    }
    if (isOpen) {
      fetchPlanes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (alumnaToEdit) {
      setFirstName(alumnaToEdit.first_name || '');
      setLastName(alumnaToEdit.last_name || '');
      setDni(alumnaToEdit.dni || '');
      setPhone(alumnaToEdit.phone || '');
      setEmail(alumnaToEdit.email || '');
      setDateOfBirth(alumnaToEdit.date_of_birth || '');
      setEmergencyContactName(alumnaToEdit.emergency_contact_name || '');
      setEmergencyContactPhone(alumnaToEdit.emergency_contact_phone || '');
      setInjuries(alumnaToEdit.injuries || '');
      setIsPregnant(alumnaToEdit.is_pregnant || false);
      setMedication(alumnaToEdit.medication || '');
      setConsentSigned(alumnaToEdit.consent_signed ?? true);
      setObservations(alumnaToEdit.observations || '');
      setStatus(alumnaToEdit.status || 'ACTIVE');
      setEntryDate(alumnaToEdit.entry_date || new Date().toISOString().split('T')[0]);
      setSelectedPlan(alumnaToEdit.plan || '');
      setPlanAmount(alumnaToEdit.plan_amount ? alumnaToEdit.plan_amount.toString() : '0');
      setBillingStartDate(alumnaToEdit.billing_start_date || new Date().toISOString().split('T')[0]);
      setBillingDueDate(alumnaToEdit.billing_due_date || '');
      setSedeId(alumnaToEdit.sede_id || '');
      setEnrollmentPaid(alumnaToEdit.enrollment_paid || false);
      setEnrollmentAmount(alumnaToEdit.enrollment_amount ? alumnaToEdit.enrollment_amount.toString() : '9500');
      setPreferredPaymentMethod((alumnaToEdit.preferred_payment_method as MetodoPago) || 'efectivo');
    } else {
      resetForm();
    }
  }, [alumnaToEdit, isOpen]);

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dueStr = nextMonth.toISOString().split('T')[0];

    setFirstName('');
    setLastName('');
    setDni('');
    setPhone('');
    setEmail('');
    setDateOfBirth('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setInjuries('');
    setIsPregnant(false);
    setMedication('');
    setConsentSigned(true);
    setObservations('');
    setStatus('ACTIVE');
    setEntryDate(today);
    setSelectedPlan('');
    setPlanAmount('0');
    setBillingStartDate(today);
    setBillingDueDate(dueStr);
    setSedeId(selectedSedeId && selectedSedeId !== 'ALL' ? selectedSedeId : (sedes[0]?.id || ''));
    setEnrollmentPaid(true);
    setEnrollmentAmount('9500');
    setPreferredPaymentMethod('efectivo');
    setErrorMsg('');
  };

  const handleStartDateChange = (dateStr: string) => {
    setBillingStartDate(dateStr);
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + 1);
        setBillingDueDate(d.toISOString().split('T')[0]);
      }
    }
  };

  const handlePlanChange = (planName: string) => {
    setSelectedPlan(planName);
    const found = planes.find((p) => p.name === planName);
    if (found) {
      setPlanAmount(found.price.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !phone.trim()) {
      setErrorMsg('Por favor completa los campos obligatorios (Nombre y Teléfono)');
      return;
    }

    const payload: AlumnaInsert = {
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      dni: dni.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      address: alumnaToEdit?.address || null,
      photo_url: alumnaToEdit?.photo_url || null,
      date_of_birth: dateOfBirth || null,
      emergency_contact_name: emergencyContactName.trim() || null,
      emergency_contact_phone: emergencyContactPhone.trim() || null,
      injuries: injuries.trim() || null,
      is_pregnant: isPregnant,
      medication: medication.trim() || null,
      consent_signed: consentSigned,
      observations: observations.trim() || null,
      // Campos de ficha medica ampliada
      medical_clearance: alumnaToEdit?.medical_clearance || false,
      diseases: alumnaToEdit?.diseases || null,
      surgeries: alumnaToEdit?.surgeries || null,
      health_observations: alumnaToEdit?.health_observations || null,
      // Plan y facturacion
      plan: selectedPlan || null,
      plan_amount: parseFloat(planAmount) || 0,
      billing_start_date: billingStartDate || null,
      billing_due_date: billingDueDate || null,
      enrollment_paid: enrollmentPaid,
      enrollment_amount: enrollmentPaid ? (parseFloat(enrollmentAmount) || 9500) : 0,
      monthly_paid: alumnaToEdit?.monthly_paid || false,
      preferred_payment_method: enrollmentPaid ? preferredPaymentMethod : null,
      // Estado y fechas
      status,
      entry_date: entryDate || new Date().toISOString().split('T')[0],
      exit_date: alumnaToEdit?.exit_date || null,
      exit_reason: alumnaToEdit?.exit_reason || null,
      // Relaciones
      sede_id: sedeId || alumnaToEdit?.sede_id || null,
      profesora_id: alumnaToEdit?.profesora_id || null,
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
      description="Completa los datos de la alumna y su ficha medica"
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
              placeholder="Ej. Maria"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Apellido *"
              placeholder="Ej. Gonzalez"
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
              label="Telefono *"
              placeholder="+54 380 4123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
              required
            />
            <Input
              label="Correo electronico"
              type="email"
              placeholder="maria@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
            />

            {/* Fecha de nacimiento con calculo de edad automatico */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Cake className="h-4 w-4 text-[var(--color-wood)]" /> Fecha de Nacimiento
                </label>
                {edadCalculada !== null && (
                  <span className="text-xs font-bold text-[var(--color-wood)] bg-[var(--color-wood)]/10 px-2 py-0.5 rounded-full">
                    {edadCalculada} anos
                  </span>
                )}
              </div>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-sm"
              />
            </div>
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
              label="Telefono de emergencia"
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
            <Heart className="h-4 w-4" /> Ficha Medica y Salud
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input
              label="Lesiones / Dolencias"
              placeholder="Ej. Hernia lumbar L5-S1, esguince..."
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
            />
            <Input
              label="Medicacion habitual"
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
              <span>Embarazo (En gestacion)</span>
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

        {/* Seccion 4: Plan y Vigencia de Cuota */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wood)] mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Sede, Plan y Período de Vigencia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Sede *
              </label>
              <select
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold cursor-pointer"
              >
                <option value="">Seleccionar sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.max_camillas} camillas)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Plan de clases
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold cursor-pointer"
              >
                <option value="">Seleccionar plan</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} - ${p.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Importe ($)"
              type="number"
              value={planAmount}
              onChange={(e) => setPlanAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <Input
              label="Fecha de inicio (Comienza clases)"
              type="date"
              value={billingStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />

            <Input
              label="Fecha de vencimiento (Fin de período)"
              type="date"
              value={billingDueDate}
              onChange={(e) => setBillingDueDate(e.target.value)}
            />
          </div>

          {billingStartDate && billingDueDate && (
            <div className="p-3 rounded-xl bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/20 text-xs font-medium text-[var(--text-primary)] flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Clock className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Vigencia:
              </span>
              <span className="font-bold text-[var(--color-wood)]">
                Del {billingStartDate.split('-').reverse().join('/')} al {billingDueDate.split('-').reverse().join('/')}
              </span>
            </div>
          )}

          {/* Cobro Inicial / Inscripción ($9500) */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Cobro Inicial / Inscripción
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-default)]">
                <input
                  type="checkbox"
                  checked={enrollmentPaid}
                  onChange={(e) => setEnrollmentPaid(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <span className={enrollmentPaid ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}>
                  {enrollmentPaid ? 'Inscripción Cobrada' : 'Sin inscripción'}
                </span>
              </label>
            </div>

            {enrollmentPaid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-default)]/60">
                <Input
                  label="Monto Inscripción ($)"
                  type="number"
                  value={enrollmentAmount}
                  onChange={(e) => setEnrollmentAmount(e.target.value)}
                />

                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    value={preferredPaymentMethod}
                    onChange={(e) => setPreferredPaymentMethod(e.target.value as MetodoPago)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold cursor-pointer"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seccion 5: Estado y Observaciones */}
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
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} icon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">
            {alumnaToEdit ? 'Guardar Cambios' : 'Registrar Alumna'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
