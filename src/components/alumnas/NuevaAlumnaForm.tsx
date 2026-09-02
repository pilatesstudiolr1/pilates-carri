'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alumna, Profile, AlumnaStatus, MetodoPago } from '@/types/database';
import { createAlumna, updateAlumna } from '@/lib/services/alumnas';
import { getProfiles } from '@/lib/services/profesoras';
import { getPlanes, PlanItem } from '@/lib/services/planes';
import { addAlumnaToClase, getClases, createClase, getClasesByAlumna } from '@/lib/services/agenda';
import { registrarPago } from '@/lib/services/pagos';
import { createClient } from '@/lib/supabase/client';
import { User, Phone, Mail, MapPin, Calendar, Heart, Shield, Plus, Trash2, CheckCircle2, AlertCircle, Clock, BedDouble, DollarSign, Building2 } from 'lucide-react';

import { useSede } from '@/hooks/useSede';

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
  '22:00',
];

interface TurnoFijoItem {
  id: string;
  day_of_week: number;
  start_time: string;
  camilla: number;
}

interface NuevaAlumnaFormProps {
  alumnaToEdit?: Alumna | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NuevaAlumnaForm({ alumnaToEdit, onSuccess, onCancel }: NuevaAlumnaFormProps) {
  const { selectedSedeId, sedes } = useSede();
  const [alumnaSedeId, setAlumnaSedeId] = useState<string>(() => {
    if (alumnaToEdit?.sede_id) return alumnaToEdit.sede_id;
    if (selectedSedeId && selectedSedeId !== 'ALL') return selectedSedeId;
    return '';
  });

  useEffect(() => {
    if (!alumnaSedeId && sedes.length > 0) {
      if (selectedSedeId && selectedSedeId !== 'ALL') {
        setAlumnaSedeId(selectedSedeId);
      } else {
        setAlumnaSedeId(sedes[0].id);
      }
    }
  }, [sedes, selectedSedeId, alumnaSedeId]);

  const currentSedeObj = sedes.find((s) => s.id === alumnaSedeId);

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

  // Cobro Inicial de Inscripción ($9500)
  const [cobrarInscripcion, setCobrarInscripcion] = useState(true);
  const [montoInscripcion, setMontoInscripcion] = useState('9500');
  const [metodoPagoInscripcion, setMetodoPagoInscripcion] = useState<MetodoPago>('efectivo');

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
  const [allClases, setAllClases] = useState<any[]>([]);
  const [occupiedMap, setOccupiedMap] = useState<Record<string, number[]>>({});

  // Cargar datos de alumnaToEdit si estamos en modo edición
  useEffect(() => {
    if (alumnaToEdit) {
      setFirstName(alumnaToEdit.first_name || '');
      setLastName(alumnaToEdit.last_name || '');
      setDni(alumnaToEdit.dni || '');
      setPhone(alumnaToEdit.phone || '');
      setEmail(alumnaToEdit.email || '');
      setAddress(alumnaToEdit.address || '');
      setDateOfBirth(alumnaToEdit.date_of_birth || '');
      setEmergencyContact(alumnaToEdit.emergency_contact_name || '');
      setEmergencyPhone(alumnaToEdit.emergency_contact_phone || '');
      if (alumnaToEdit.sede_id) {
        setAlumnaSedeId(alumnaToEdit.sede_id);
      }
      setSelectedPlanName(alumnaToEdit.plan || '');
      setImporte(alumnaToEdit.plan_amount ? alumnaToEdit.plan_amount.toString() : '0');
      setSelectedProfesoraId(alumnaToEdit.profesora_id || '');
      setBillingStartDate(alumnaToEdit.billing_start_date || alumnaToEdit.entry_date || new Date().toISOString().split('T')[0]);
      setBillingDueDate(alumnaToEdit.billing_due_date || '');
      setStatus(alumnaToEdit.status || 'ACTIVE');
      setCobrarInscripcion(alumnaToEdit.enrollment_paid || false);
      setMontoInscripcion(alumnaToEdit.enrollment_amount ? alumnaToEdit.enrollment_amount.toString() : '9500');
      setMetodoPagoInscripcion((alumnaToEdit.preferred_payment_method as MetodoPago) || 'efectivo');
      setHasMedicalClearance(alumnaToEdit.medical_clearance || false);
      setIsPregnant(alumnaToEdit.is_pregnant || false);
      setInjuries(alumnaToEdit.injuries || '');
      setDiseases(alumnaToEdit.diseases || '');
      setSurgeries(alumnaToEdit.surgeries || '');
      setHealthObservations(alumnaToEdit.health_observations || '');
      setGeneralNotes(alumnaToEdit.observations || '');

      // Cargar turnos asignados a esta alumna desde clase_alumnas
      getClasesByAlumna(alumnaToEdit.id).then((res) => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map((ca: any, idx: number) => ({
            id: ca.id || `tf-edit-${idx}`,
            day_of_week: ca.clase?.day_of_week || 1,
            start_time: (ca.clase?.start_time || '08:00:00').substring(0, 5),
            camilla: ca.camilla || 1,
          }));
          setTurnosFijos(mapped);
        } else {
          setTurnosFijos([
            { id: `tf-${Date.now()}`, day_of_week: 1, start_time: '08:00', camilla: 1 },
          ]);
        }
      });
    }
  }, [alumnaToEdit]);

  useEffect(() => {
    async function loadData() {
      const [profsRes, planesRes] = await Promise.all([
        getProfiles({ role: 'PROFESORA', isActive: true }),
        getPlanes({ onlyActive: true }),
      ]);
      setProfesoras((profsRes.data || []).filter((p) => p.role === 'PROFESORA'));
      setPlanes(planesRes.data);

      const effectiveSede = alumnaSedeId || (selectedSedeId !== 'ALL' ? selectedSedeId : undefined);
      const clasesRes = await getClases({ sedeId: effectiveSede });
      setAllClases(clasesRes.data || []);
      await fetchAllOccupied(clasesRes.data || []);

      if (planesRes.data.length > 0 && !selectedPlanName && !alumnaToEdit) {
        setSelectedPlanName(planesRes.data[0].name);
        setImporte(planesRes.data[0].price.toString());
      }
    }
    loadData();
  }, [alumnaSedeId, selectedSedeId, alumnaToEdit]);

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
    if (planName === 'Solo Inscripción / Clase de prueba') {
      setImporte('0');
      return;
    }
    const foundPlan = planes.find((p) => p.name === planName);
    if (foundPlan) {
      setImporte(foundPlan.price.toString());
      if (status === 'SUSPENDED') {
        setStatus('ACTIVE');
      }
    }
  };

  // Fetch occupied camillas for all clases (excluyendo a la propia alumna si se edita)
  const fetchAllOccupied = async (clasesList: any[]) => {
    try {
      const supabase = createClient();
      let q = supabase
        .from('clase_alumnas')
        .select('clase_id, camilla, alumna_id')
        .not('camilla', 'is', null);

      if (alumnaToEdit?.id) {
        q = q.neq('alumna_id', alumnaToEdit.id);
      }

      const { data } = await q;

      if (data) {
        const map: Record<string, number[]> = {};
        data.forEach((d: any) => {
          if (!map[d.clase_id]) map[d.clase_id] = [];
          map[d.clase_id].push(d.camilla);
        });
        setOccupiedMap(map);
      }
    } catch (err) {
      console.error('Error fetching occupied:', err);
    }
  };

  const getOccupiedCamillasForTurno = (dayOfWeek: number, startTime: string): number[] => {
    const matchingClase = allClases.find(
      (c) =>
        c.day_of_week === dayOfWeek &&
        c.start_time.startsWith(startTime) &&
        (!alumnaSedeId || c.sede_id === alumnaSedeId)
    );
    if (!matchingClase) return [];
    return occupiedMap[matchingClase.id] || [];
  };

  const getAvailableCamillasForTurno = (dayOfWeek: number, startTime: string, currentCamilla?: number): number[] => {
    const occ = getOccupiedCamillasForTurno(dayOfWeek, startTime);
    const maxC = currentSedeObj?.max_camillas || 6;
    const free = Array.from({ length: maxC }, (_, i) => i + 1).filter((num) => !occ.includes(num));

    // Solo si estamos editando y este reformer ya era suyo en esta clase:
    if (alumnaToEdit && currentCamilla && !free.includes(currentCamilla) && currentCamilla <= maxC) {
      const matchingClase = allClases.find(
        (c) =>
          c.day_of_week === dayOfWeek &&
          c.start_time.startsWith(startTime) &&
          (!alumnaSedeId || c.sede_id === alumnaSedeId)
      );
      const isHerOwnCamilla = matchingClase?.clase_alumnas?.some(
        (ca: any) => ca.alumna_id === alumnaToEdit.id && ca.camilla === currentCamilla
      );
      if (isHerOwnCamilla) {
        free.push(currentCamilla);
        free.sort((a, b) => a - b);
      }
    }
    return free;
  };

  const handleAddTurnoFijo = () => {
    const defaultDay = 1;
    const defaultTime = '08:00';
    const avail = getAvailableCamillasForTurno(defaultDay, defaultTime);
    const firstFree = avail[0] || 1;
    setTurnosFijos((prev) => [
      ...prev,
      { id: `tf-${Date.now()}`, day_of_week: defaultDay, start_time: defaultTime, camilla: firstFree },
    ]);
  };

  const handleRemoveTurnoFijo = (id: string) => {
    setTurnosFijos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTurnoFijo = (id: string, field: keyof TurnoFijoItem, value: any) => {
    setTurnosFijos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        if (field === 'day_of_week' || field === 'start_time') {
          const avail = getAvailableCamillasForTurno(updated.day_of_week, updated.start_time);
          if (avail.length > 0 && !avail.includes(updated.camilla)) {
            updated.camilla = avail[0];
          }
        }
        return updated;
      })
    );
  };

  // Sincronizar camillas disponibles al cargar clases o cambiar sede
  useEffect(() => {
    if (allClases.length > 0 && currentSedeObj) {
      setTurnosFijos((prev) =>
        prev.map((t) => {
          const avail = getAvailableCamillasForTurno(t.day_of_week, t.start_time, t.camilla);
          if (!avail.includes(t.camilla) && avail.length > 0) {
            return { ...t, camilla: avail[0] };
          }
          return t;
        })
      );
    }
  }, [allClases, occupiedMap, currentSedeObj]);

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

    const inscripcionMontoNum = parseFloat(montoInscripcion) || 9500;

    const finalPlanAmount = parseFloat(importe) || 0;
    let finalStatus = status;
    if (
      selectedPlanName &&
      selectedPlanName !== 'Solo Inscripción / Clase de prueba' &&
      finalPlanAmount > 0 &&
      status === 'SUSPENDED'
    ) {
      finalStatus = 'ACTIVE';
    }

    const payload = {
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
      sede_id: alumnaSedeId || null,
      plan: selectedPlanName || null,
      plan_amount: finalPlanAmount,
      billing_start_date: billingStartDate || null,
      billing_due_date: billingDueDate || null,
      enrollment_paid: cobrarInscripcion,
      enrollment_amount: cobrarInscripcion ? inscripcionMontoNum : 0,
      preferred_payment_method: cobrarInscripcion ? metodoPagoInscripcion : null,
      status: finalStatus,
      medical_clearance: hasMedicalClearance,
      diseases: diseases.trim() || null,
      surgeries: surgeries.trim() || null,
      health_observations: healthObservations.trim() || null,
      observations: generalNotes.trim() || null,
    };

    let targetAlumnaId = alumnaToEdit?.id;

    if (alumnaToEdit) {
      const { error: alumnaErr } = await updateAlumna(alumnaToEdit.id, payload);
      if (alumnaErr) {
        setErrorMsg(alumnaErr || 'Error al actualizar la ficha de la alumna');
        setLoading(false);
        return;
      }
    } else {
      const { data: newAlumna, error: alumnaErr } = await createAlumna(payload);
      if (alumnaErr || !newAlumna) {
        setErrorMsg(alumnaErr || 'Error al guardar la ficha de la alumna');
        setLoading(false);
        return;
      }
      targetAlumnaId = newAlumna.id;
    }

    if (!targetAlumnaId) {
      setErrorMsg('Error al identificar a la alumna');
      setLoading(false);
      return;
    }

    // 1.1 Registrar cobro de inscripción contable si está tildado y no estaba ya pagada
    if (cobrarInscripcion && inscripcionMontoNum > 0 && (!alumnaToEdit || !alumnaToEdit.enrollment_paid)) {
      try {
        await registrarPago({
          alumna_id: targetAlumnaId,
          amount: inscripcionMontoNum,
          payment_method: metodoPagoInscripcion,
          payment_type: 'INSCRIPCION',
          concept: 'Inscripción inicial',
          sede_id: alumnaSedeId || undefined,
          profesora_id: selectedProfesoraId || undefined,
        });
      } catch (pagoErr) {
        console.error('Error al registrar cobro de inscripción:', pagoErr);
      }
    }

    // 2. Asignar / Actualizar Turnos Fijos en la Agenda
    const supabase = createClient();
    if (alumnaToEdit) {
      // Limpiar turnos anteriores asignados a esta alumna
      await supabase.from('clase_alumnas').delete().eq('alumna_id', targetAlumnaId);
    }

    const currentSedeObj = sedes.find((s) => s.id === alumnaSedeId);
    const { data: clasesActuales } = await getClases({ sedeId: alumnaSedeId || undefined });
    const listaClases = [...(clasesActuales || [])];
    const turnoErrors: string[] = [];

    for (const tf of turnosFijos) {
      let targetClase = listaClases.find(
        (c) =>
          c.day_of_week === tf.day_of_week &&
          c.start_time.startsWith(tf.start_time) &&
          (!alumnaSedeId || c.sede_id === alumnaSedeId)
      );

      if (!targetClase) {
        const endHourNum = parseInt(tf.start_time.split(':')[0], 10) + 1;
        const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

        const { data: createdClase, error: createClaseErr } = await createClase({
          name: `Turno ${tf.start_time} hs`,
          profesora_id: selectedProfesoraId || null,
          day_of_week: tf.day_of_week,
          start_time: `${tf.start_time}:00`,
          end_time: `${endTime}:00`,
          max_capacity: currentSedeObj?.max_camillas || 6,
          sede_id: alumnaSedeId || null,
        });

        if (createClaseErr || !createdClase) {
          turnoErrors.push(`No se pudo crear el turno ${tf.start_time} hs: ${createClaseErr || 'Error desconocido'}`);
          continue;
        }

        targetClase = createdClase;
        listaClases.push(createdClase);
      }

      if (targetClase) {
        // Si el turno en la sede no tenía profesora asignada y el formulario especificó una, asociarla
        if (!targetClase.profesora_id && selectedProfesoraId) {
          await supabase
            .from('clases')
            .update({ profesora_id: selectedProfesoraId })
            .eq('id', targetClase.id);
        }

        const { error: assignErr } = await addAlumnaToClase(targetClase.id, targetAlumnaId, tf.camilla);
        if (assignErr) {
          const diaLabel = DIAS.find((d) => d.value === tf.day_of_week)?.label || `Día ${tf.day_of_week}`;
          turnoErrors.push(`${diaLabel} a las ${tf.start_time} hs: ${assignErr}`);
        }
      }
    }

    setLoading(false);

    if (turnoErrors.length > 0) {
      setErrorMsg(`Alumna guardada, pero con advertencias en turnos:\n${turnoErrors.join('\n')}`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 3500);
    } else {
      setSuccessMsg(
        alumnaToEdit
          ? 'Alumna y turnos fijos actualizados exitosamente.'
          : 'Alumna guardada exitosamente y turnos fijos asignados en la agenda.'
      );
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1200);
    }
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 sm:gap-8 border border-[var(--border-default)] animate-fade-in text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {alumnaToEdit ? `Editar Alumna: ${alumnaToEdit.first_name} ${alumnaToEdit.last_name || ''}` : 'Nueva alumna'}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {alumnaToEdit
              ? 'Modificá los datos personales, sede, plan, ficha médica y turnos fijos en la agenda.'
              : 'Completá la ficha y asignale sus turnos semanales.'}
          </p>
        </div>
        {alumnaToEdit && (
          <span className="self-start sm:self-center px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold">
            Modo Edición
          </span>
        )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-[var(--color-wood)]" />
                Sede *
              </label>
              <select
                value={alumnaSedeId}
                onChange={(e) => setAlumnaSedeId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold"
              >
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.max_camillas} camillas)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Plan de clases *
              </label>
              <select
                value={selectedPlanName}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold"
              >
                <option value="Solo Inscripción / Clase de prueba">
                  🟣 Solo Inscripción / Clase de prueba ($0 - Reserva)
                </option>
                {planes.map((pl) => (
                  <option key={pl.id} value={pl.name}>
                    {pl.name} - ${pl.price.toLocaleString()}
                  </option>
                ))}
              </select>
              {selectedPlanName === 'Solo Inscripción / Clase de prueba' && (
                <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium mt-1">
                  🟣 Sin cobro de plan ($0). Sirve para reservar lugar o clase de prueba individual. Al marcar asistencia en la agenda quedará suspendida automáticamente hasta asignarle un plan mensual.
                </p>
              )}
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
                {profesoras
                  .filter((p) => p.role === 'PROFESORA')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
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

          {/* Inscripción y Cobro Inicial ($9500) */}
          <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Cobro Inicial / Inscripción
                </h4>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-default)]">
                <input
                  type="checkbox"
                  checked={cobrarInscripcion}
                  onChange={(e) => setCobrarInscripcion(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <span className={cobrarInscripcion ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-[var(--text-muted)]'}>
                  {cobrarInscripcion ? 'Cobrar Inscripción' : 'Sin inscripción'}
                </span>
              </label>
            </div>

            {cobrarInscripcion && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-default)]/60 animate-fade-in">
                <Input
                  label="Monto de Inscripción ($)"
                  type="number"
                  value={montoInscripcion}
                  onChange={(e) => setMontoInscripcion(e.target.value)}
                />

                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                    Método de pago de inscripción *
                  </label>
                  <select
                    value={metodoPagoInscripcion}
                    onChange={(e) => setMetodoPagoInscripcion(e.target.value as MetodoPago)}
                    className="w-full h-11 px-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-semibold cursor-pointer"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="tarjeta">Tarjeta de débito/crédito</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
            )}
          </div>

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
                  {(() => {
                    const availableCamillas = getAvailableCamillasForTurno(tf.day_of_week, tf.start_time);
                    if (availableCamillas.length === 0) {
                      return (
                        <div className="w-full h-10 px-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs border border-rose-500/30 flex items-center font-semibold">
                          Sin reformers libres
                        </div>
                      );
                    }
                    return (
                      <select
                        value={tf.camilla}
                        onChange={(e) => handleUpdateTurnoFijo(tf.id, 'camilla', parseInt(e.target.value, 10))}
                        className="w-full h-10 px-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] font-semibold cursor-pointer"
                      >
                        {availableCamillas.map((num) => (
                          <option key={num} value={num}>
                            Reformer {num}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
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

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            loading={loading}
            icon={<CheckCircle2 className="h-5 w-5" />}
            className="w-full sm:w-auto px-8"
          >
            {alumnaToEdit ? 'Guardar Cambios' : 'Guardar alumna'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
