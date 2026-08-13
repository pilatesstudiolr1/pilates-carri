'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Profile, AlumnaStatus } from '@/types/database';
import { createAlumna } from '@/lib/services/alumnas';
import { getProfiles } from '@/lib/services/profesoras';
import { getPlanes, PlanItem } from '@/lib/services/planes';
import { addAlumnaToClase, getClases, createClase } from '@/lib/services/agenda';
import { User, Phone, Mail, MapPin, Calendar, Heart, Shield, Plus, Trash2, CheckCircle2, AlertCircle, Clock, BedDouble } from 'lucide-react';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const HORARIOS_ESTANDAR = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

interface TurnoFijoItem {
  id: string;
  day_of_week: number;
  start_time: string;
  camilla: number;
}

interface NuevaAlumnaFormProps {
  onSuccess?: () => void;
}

export function NuevaAlumnaForm({ onSuccess }: NuevaAlumnaFormProps) {
  // Datos Personales
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState<string>('Se calcula automáticamente');

  // Contacto de Emergencia
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Plan y Asistencia
  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [selectedProfesoraId, setSelectedProfesoraId] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [importe, setImporte] = useState('0');
  const [billingStartDate, setBillingStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [billingDueDate, setBillingDueDate] = useState<string>(() => {
    const start = new Date();
    start.setMonth(start.getMonth() + 1);
    return start.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<AlumnaStatus>('ACTIVE');

  // Turnos fijos semanales
  const [turnosFijos, setTurnosFijos] = useState<TurnoFijoItem[]>([
    { id: 'tf-1', day_of_week: 1, start_time: '08:00', camilla: 1 },
  ]);

  // Ficha de Salud
  const [hasMedicalClearance, setHasMedicalClearance] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [injuries, setInjuries] = useState('');
  const [diseases, setDiseases] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [healthObservations, setHealthObservations] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      const [profsRes, planesRes] = await Promise.all([
        getProfiles({ role: 'ALL' }),
        getPlanes({ onlyActive: true }),
      ]);
      setProfesoras(profsRes.data);
      setPlanes(planesRes.data);

      if (planesRes.data.length > 0) {
        setSelectedPlanName(planesRes.data[0].name);
        setImporte(planesRes.data[0].price.toString());
      }
    }
    loadData();
  }, []);

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

  // Calcular edad automaticamente
  useEffect(() => {
    if (!dateOfBirth) {
      setAge('Se calcula automáticamente');
      return;
    }
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      setAge('Se calcula automáticamente');
      return;
    }
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    setAge(`${calculatedAge} años`);
  }, [dateOfBirth]);

  const handlePlanChange = (planName: string) => {
    setSelectedPlanName(planName);
    const foundPlan = planes.find((p) => p.name === planName);
    if (foundPlan) {
      setImporte(foundPlan.price.toString());
    }
  };

  const handleAddTurnoFijo = () => {
    setTurnosFijos((prev) => [
      ...prev,
      { id: `tf-${Date.now()}`, day_of_week: 1, start_time: '08:00', camilla: prev.length + 1 },
    ]);
  };

  const handleRemoveTurnoFijo = (id: string) => {
    setTurnosFijos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTurnoFijo = (id: string, field: keyof TurnoFijoItem, value: any) => {
    setTurnosFijos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!firstName.trim()) {
      setErrorMsg('El nombre es obligatorio');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('El teléfono / WhatsApp es obligatorio');
      return;
    }

    setLoading(true);

    // 1. Crear registro de Alumna en Supabase
    const { data: newAlumna, error: alumnaErr } = await createAlumna({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      dni: dni.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      date_of_birth: dateOfBirth || null,
      emergency_contact_name: emergencyContact.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      profesora_id: selectedProfesoraId || null,
      plan: selectedPlanName || null,
      plan_amount: parseFloat(importe) || 0,
      billing_start_date: billingStartDate || null,
      billing_due_date: billingDueDate || null,
      status,
      medical_clearance: hasMedicalClearance,
      diseases: diseases.trim() || null,
      surgeries: surgeries.trim() || null,
      health_observations: healthObservations.trim() || null,
      observations: generalNotes.trim() || null,
    });

    if (alumnaErr || !newAlumna) {
      setErrorMsg(alumnaErr || 'Error al guardar la ficha de la alumna');
      setLoading(false);
      return;
    }

    // 2. Asignar Turnos Fijos en la Agenda
    const { data: clasesActuales } = await getClases();

    for (const tf of turnosFijos) {
      let targetClase = clasesActuales.find(
        (c) => c.day_of_week === tf.day_of_week && c.start_time.startsWith(tf.start_time)
      );

      if (!targetClase) {
        const endHourNum = parseInt(tf.start_time.split(':')[0], 10) + 1;
        const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

        const { data: createdClase } = await createClase({
          name: `Turno ${tf.start_time}`,
          profesora_id: selectedProfesoraId || null,
          day_of_week: tf.day_of_week,
          start_time: `${tf.start_time}:00`,
          end_time: `${endTime}:00`,
          max_capacity: 6,
        });
        targetClase = createdClase || undefined;
      }

      if (targetClase) {
        await addAlumnaToClase(targetClase.id, newAlumna.id, tf.camilla);
      }
    }

    setLoading(false);
    setSuccessMsg('Alumna guardada exitosamente y turnos fijos asignados.');

    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1500);
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 sm:gap-8 border border-[var(--border-default)] animate-fade-in text-[var(--text-primary)]">
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Nueva alumna
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Completá la ficha y asignale sus turnos semanales.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-success-soft)] text-xs text-[var(--color-success)] font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* SECCION 1: Datos Personales */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--color-wood)]" /> Datos personales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Input
              label="Nombre *"
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Apellido"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <Input
              label="DNI"
              placeholder="Número de DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
            <Input
              label="Teléfono / WhatsApp *"
              placeholder="Ejemplo: 3804123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Dirección"
              placeholder="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              icon={<MapPin className="h-4 w-4" />}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              icon={<Calendar className="h-4 w-4" />}
            />
            <Input
              label="Edad"
              value={age}
              disabled
              hint="Se calcula automáticamente"
            />
          </div>
        </div>

        {/* SECCION 2: Contacto de Emergencia */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-[var(--color-wood)]" /> Contacto de emergencia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Nombre del contacto"
              placeholder="Nombre y apellido"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
            <Input
              label="Teléfono de emergencia"
              placeholder="Número de teléfono"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>

        {/* SECCION 3: Plan y Asistencia */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--color-wood)]" /> Plan y asistencia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Plan de clases *
              </label>
              <select
                value={selectedPlanName}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold"
              >
                {planes.length === 0 ? (
                  <option value="">Sin planes activos (configure en Configuración)</option>
                ) : (
                  planes.map((pl) => (
                    <option key={pl.id} value={pl.name}>
                      {pl.name} - ${pl.price.toLocaleString()}
                    </option>
                  ))
                )}
              </select>
            </div>

            <Input
              label="Importe del plan ($)"
              type="number"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
            />

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Profesora responsable
              </label>
              <select
                value={selectedProfesoraId}
                onChange={(e) => setSelectedProfesoraId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
              >
                <option value="">Seleccionar profesora</option>
                {profesoras.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Input
              label="Fecha de inicio (Comienza clases)"
              type="date"
              value={billingStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              icon={<Calendar className="h-4 w-4" />}
            />

            <Input
              label="Fecha de vencimiento (Fin de período)"
              type="date"
              value={billingDueDate}
              onChange={(e) => setBillingDueDate(e.target.value)}
              icon={<Calendar className="h-4 w-4" />}
            />

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Estado de la alumna
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
              >
                <option value="ACTIVE">Activa</option>
                <option value="SUSPENDED">Suspendida</option>
                <option value="INACTIVE">Inactiva</option>
              </select>
            </div>
          </div>

          {billingStartDate && billingDueDate && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/20 text-xs font-medium text-[var(--text-primary)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[var(--color-wood)]" />
                Vigencia del plan:
              </span>
              <span className="font-bold text-[var(--color-wood)]">
                Del {billingStartDate.split('-').reverse().join('/')} al {billingDueDate.split('-').reverse().join('/')}
              </span>
            </div>
          )}

          {/* Turnos Fijos Semanales */}
          <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  Turnos fijos semanales
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Elegí un día, una hora y un reformer para cada clase.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--color-wood)]/20 text-[var(--color-wood)] text-xs font-bold">
                {turnosFijos.length} turnos
              </span>
            </div>

            {turnosFijos.map((tf, index) => (
              <div key={tf.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center pt-2">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-1">Día</label>
                  <select
                    value={tf.day_of_week}
                    onChange={(e) => handleUpdateTurnoFijo(tf.id, 'day_of_week', parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)]"
                  >
                    {DIAS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-1">Hora</label>
                  <select
                    value={tf.start_time}
                    onChange={(e) => handleUpdateTurnoFijo(tf.id, 'start_time', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)]"
                  >
                    {HORARIOS_ESTANDAR.map((h) => (
                      <option key={h} value={h}>
                        {h} hs
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-1">Reformer</label>
                  <select
                    value={tf.camilla}
                    onChange={(e) => handleUpdateTurnoFijo(tf.id, 'camilla', parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        Reformer {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveTurnoFijo(tf.id)}
                    disabled={turnosFijos.length === 1}
                    className="px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTurnoFijo}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Agregar otro turno fijo
              </Button>
            </div>
          </div>
        </div>

        {/* SECCION 4: Ficha de Salud */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-[var(--color-wood)]" /> Ficha de salud
          </h3>

          <div className="flex items-center gap-6 py-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasMedicalClearance}
                onChange={(e) => setHasMedicalClearance(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-wood)] rounded cursor-pointer"
              />
              Tiene apto físico
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPregnant}
                onChange={(e) => setIsPregnant(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-wood)] rounded cursor-pointer"
              />
              Embarazo
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Lesiones</label>
              <textarea
                rows={3}
                placeholder="Lesiones actuales o anteriores"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Enfermedades</label>
              <textarea
                rows={3}
                placeholder="Enfermedades o diagnósticos"
                value={diseases}
                onChange={(e) => setDiseases(e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Cirugías</label>
              <textarea
                rows={3}
                placeholder="Cirugías realizadas"
                value={surgeries}
                onChange={(e) => setSurgeries(e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Observaciones de salud</label>
              <textarea
                rows={3}
                placeholder="Información importante para las profesoras"
                value={healthObservations}
                onChange={(e) => setHealthObservations(e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Observaciones generales</label>
            <textarea
              rows={2}
              placeholder="Información administrativa o general"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs resize-none"
            />
          </div>
        </div>

        {/* Botón Final Submit */}
        <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
          <Button
            type="submit"
            size="lg"
            loading={loading}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className="w-full sm:w-auto px-8"
          >
            Guardar alumna
          </Button>
        </div>
      </form>
    </Card>
  );
}
