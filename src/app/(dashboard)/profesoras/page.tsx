'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Profile, Sede, UserRole } from '@/types/database';
import {
  getProfiles,
  createOrUpdateProfileByEmail,
  toggleProfileActive,
  deleteProfile,
  getLiquidacionProfesoras,
  LiquidacionProfesoraItem,
} from '@/lib/services/profesoras';
import { getSedes } from '@/lib/services/sedes';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  RefreshCw,
  Search,
  MessageCircle,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  TrendingUp,
  CalendarDays,
  X,
  Save,
  User,
  AtSign,
  Key,
  ShieldCheck,
  Building2,
  Percent,
  Clock,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
} from 'lucide-react';

const DIAS_OPCIONES = [
  { short: 'Lun', full: 'Lunes' },
  { short: 'Mar', full: 'Martes' },
  { short: 'Mié', full: 'Miércoles' },
  { short: 'Jue', full: 'Jueves' },
  { short: 'Vie', full: 'Viernes' },
  { short: 'Sáb', full: 'Sábado' },
];

const HORARIOS_MANANA = ['07:00', '08:00', '09:00', '10:00', '11:00'];
const HORARIOS_TARDE = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

export function parseSedeSchedules(obs: string | null | undefined): Record<string, { work_days: string[]; work_hours: string[] }> | null {
  if (!obs) return null;
  const match = obs.match(/\[CONFIG_SEDES_HORARIOS\]([\s\S]*?)\[\/CONFIG_SEDES_HORARIOS\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function cleanObservations(obs: string | null | undefined): string {
  if (!obs) return '';
  return obs.replace(/\[CONFIG_SEDES_HORARIOS\][\s\S]*?\[\/CONFIG_SEDES_HORARIOS\]/g, '').trim();
}

export default function ProfesorasPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [liquidacion, setLiquidacion] = useState<LiquidacionProfesoraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLiquidacion, setShowLiquidacion] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Unified Form State (Option 2)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [passwordText, setPasswordText] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('PROFESORA');
  const [sedeId, setSedeId] = useState<string>('');
  const [selectedSedeIds, setSelectedSedeIds] = useState<string[]>([]);
  const [turno, setTurno] = useState('Mañana');
  const [commissionPercent, setCommissionPercent] = useState('45');
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);
  const [observations, setObservations] = useState('');
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [workHours, setWorkHours] = useState<string[]>([]);
  const [sedeSchedules, setSedeSchedules] = useState<Record<string, { work_days: string[]; work_hours: string[] }>>({});
  const [activeScheduleSedeId, setActiveScheduleSedeId] = useState<string>('');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const [profilesRes, liquidacionRes, sedesRes] = await Promise.all([
      getProfiles({ search, role: roleFilter !== 'ALL' ? roleFilter : undefined }),
      getLiquidacionProfesoras(),
      getSedes({ isActive: 'ALL' }),
    ]);

    if (sedesRes.data) {
      setSedes(sedesRes.data);
      if (sedesRes.data.length > 0 && selectedSedeIds.length === 0 && !editingId) {
        setSelectedSedeIds([sedesRes.data[0].id]);
        setSedeId(sedesRes.data[0].id);
      }
    }

    if (profilesRes.error) {
      setErrorMsg(profilesRes.error);
    } else {
      setProfiles(profilesRes.data);
    }

    if (!liquidacionRes.error) {
      setLiquidacion(liquidacionRes.data);
    }

    setLoading(false);
  }, [search, roleFilter, sedeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfiles();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProfiles]);

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setPasswordText('');
    setShowFormPassword(false);
    setDni('');
    setPhone('');
    setRole('PROFESORA');
    if (sedes.length > 0) {
      setSelectedSedeIds([sedes[0].id]);
      setSedeId(sedes[0].id);
    } else {
      setSelectedSedeIds([]);
      setSedeId('');
    }
    setTurno('Mañana');
    setCommissionPercent('45');
    setHireDate(new Date().toISOString().split('T')[0]);
    setIsActive(true);
    setObservations('');
    setWorkDays([]);
    setWorkHours([]);
    setSedeSchedules({});
    setActiveScheduleSedeId('');
    setErrorMsg('');
  };

  const toggleSedeSelection = (id: string) => {
    setSelectedSedeIds((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      setSedeId(next.length > 0 ? next[0] : '');
      if (next.length > 0 && !next.includes(activeScheduleSedeId)) {
        setActiveScheduleSedeId(next[0]);
      }
      return next;
    });
  };

  const handleEditClick = (profile: Profile) => {
    setEditingId(profile.id);

    let fn = profile.first_name || '';
    let ln = profile.last_name || '';
    if (!fn && !ln && profile.full_name) {
      const parts = profile.full_name.trim().split(' ');
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }

    setFirstName(fn);
    setLastName(ln);
    setEmail(profile.email || '');
    setUsername(profile.username || (profile.email ? profile.email.split('@')[0] : ''));
    setPasswordText(profile.password_text || '');
    setDni(profile.dni || '');
    setPhone(profile.phone || '');
    setRole(profile.role || 'PROFESORA');

    const profSedeIds = Array.isArray(profile.sede_ids) && profile.sede_ids.length > 0
      ? profile.sede_ids
      : (profile.sede_id ? [profile.sede_id] : (sedes.length > 0 ? [sedes[0].id] : []));
    setSelectedSedeIds(profSedeIds);
    setSedeId(profSedeIds[0] || '');
    setActiveScheduleSedeId(profSedeIds[0] || '');

    setTurno(profile.turno || 'Mañana');
    setCommissionPercent(
      profile.commission_rate !== undefined
        ? (profile.commission_rate * 100).toString()
        : '45'
    );
    setHireDate(profile.hire_date || new Date().toISOString().split('T')[0]);
    setIsActive(profile.is_active ?? true);
    setObservations(cleanObservations(profile.observations));

    // Cargar horarios diferenciados por sede
    const parsedSchedules = parseSedeSchedules(profile.observations);
    const initialSchedules: Record<string, { work_days: string[]; work_hours: string[] }> = {};
    profSedeIds.forEach((sId) => {
      if (parsedSchedules && parsedSchedules[sId]) {
        initialSchedules[sId] = parsedSchedules[sId];
      } else {
        initialSchedules[sId] = {
          work_days: profile.work_days || [],
          work_hours: profile.work_hours || [],
        };
      }
    });
    setSedeSchedules(initialSchedules);
    setWorkDays(profile.work_days || []);
    setWorkHours(profile.work_hours || []);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSedeForSchedule = activeScheduleSedeId || selectedSedeIds[0] || '';
  const activeWorkDays = currentSedeForSchedule && sedeSchedules[currentSedeForSchedule]?.work_days !== undefined
    ? sedeSchedules[currentSedeForSchedule].work_days
    : workDays;
  const activeWorkHours = currentSedeForSchedule && sedeSchedules[currentSedeForSchedule]?.work_hours !== undefined
    ? sedeSchedules[currentSedeForSchedule].work_hours
    : workHours;

  const toggleDay = (dayFull: string) => {
    if (currentSedeForSchedule) {
      setSedeSchedules((prev) => {
        const currentDays = prev[currentSedeForSchedule]?.work_days || [];
        const nextDays = currentDays.includes(dayFull)
          ? currentDays.filter((d) => d !== dayFull)
          : [...currentDays, dayFull];
        const nextHours = prev[currentSedeForSchedule]?.work_hours || [];
        const updated = {
          ...prev,
          [currentSedeForSchedule]: { work_days: nextDays, work_hours: nextHours },
        };
        const allDays = Array.from(new Set(Object.values(updated).flatMap((s) => s.work_days)));
        setWorkDays(allDays);
        return updated;
      });
    } else {
      setWorkDays((prev) =>
        prev.includes(dayFull) ? prev.filter((d) => d !== dayFull) : [...prev, dayFull]
      );
    }
  };

  const toggleHour = (hour: string) => {
    if (currentSedeForSchedule) {
      setSedeSchedules((prev) => {
        const currentHours = prev[currentSedeForSchedule]?.work_hours || [];
        const nextHours = currentHours.includes(hour)
          ? currentHours.filter((h) => h !== hour)
          : [...currentHours, hour];
        const currentDays = prev[currentSedeForSchedule]?.work_days || [];
        const updated = {
          ...prev,
          [currentSedeForSchedule]: { work_days: currentDays, work_hours: nextHours },
        };
        const allHours = Array.from(new Set(Object.values(updated).flatMap((s) => s.work_hours)));
        setWorkHours(allHours);
        return updated;
      });
    } else {
      setWorkHours((prev) =>
        prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour]
      );
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const generarContrasena = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordText(pass);
    setShowFormPassword(true);
  };

  const copyCredenciales = (prof: Profile) => {
    const profSedeIds = Array.isArray(prof.sede_ids) && prof.sede_ids.length > 0
      ? prof.sede_ids
      : (prof.sede_id ? [prof.sede_id] : []);
    const matchingSedes = sedes.filter((s) => profSedeIds.includes(s.id));
    const sedeName = matchingSedes.length > 0
      ? matchingSedes.map((s) => s.name).join(' y ')
      : (sedes.find((s) => s.id === prof.sede_id)?.name || 'Pilates Studio');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pilatesstudio.com';
    const userIdent = prof.username || prof.email;
    const pass = prof.password_text || '(definida por administración)';
    const text = `¡Hola ${prof.first_name || prof.full_name}! 👋\n\nTus datos de acceso para el sistema de Pilates Studio son:\n🔗 Enlace: ${origin}/login\n👤 Usuario / Correo: ${userIdent}\n🔑 Contraseña: ${pass}\n🏢 Sedes asignadas: ${sedeName}\n\n¡Bienvenida al equipo!`;

    navigator.clipboard.writeText(text);
    alertDialog({
      title: 'Credenciales Copiadas',
      message: `El mensaje de acceso de ${prof.full_name} se copió al portapapeles. Ya podés pegarlo en WhatsApp y enviárselo.`,
      variant: 'success',
    });
  };

  const handleSaveProfesora = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim()) {
      setErrorMsg('El Nombre es obligatorio.');
      return;
    }

    let cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanEmail && !cleanUsername) {
      setErrorMsg('Debes ingresar al menos un Correo Electrónico o Nombre de Usuario.');
      return;
    }

    if (!cleanEmail && cleanUsername) {
      cleanEmail = `${cleanUsername}@pilateslr.com`;
    }

    const derivedUsername = cleanUsername || cleanEmail.split('@')[0];

    if (!editingId && (!passwordText.trim() || passwordText.trim().length < 6)) {
      setErrorMsg('Debes ingresar una contraseña de al menos 6 caracteres para el nuevo usuario.');
      return;
    }

    if (passwordText.trim() && passwordText.trim().length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const commVal = (role as string) === 'ADMIN' ? 0 : parseFloat(commissionPercent);

    if ((role as string) !== 'ADMIN' && (isNaN(commVal) || commVal < 0 || commVal > 100)) {
      setErrorMsg('El porcentaje de comisión debe estar entre 0 y 100.');
      return;
    }

    if ((role as string) !== 'ADMIN' && selectedSedeIds.length === 0) {
      setErrorMsg('Debes asignar al menos una sede a la profesora.');
      return;
    }

    setSubmitting(true);

    const effectiveSedeIds = (role as string) === 'ADMIN' ? sedes.map((s) => s.id) : selectedSedeIds;
    const primarySedeId = effectiveSedeIds[0] || null;

    // Serializar horarios por sede en observations para persistencia garantizada
    const filteredSedeSchedules: Record<string, { work_days: string[]; work_hours: string[] }> = {};
    effectiveSedeIds.forEach((sId) => {
      if (sedeSchedules[sId]) {
        filteredSedeSchedules[sId] = sedeSchedules[sId];
      }
    });
    if (primarySedeId && !filteredSedeSchedules[primarySedeId]) {
      filteredSedeSchedules[primarySedeId] = {
        work_days: workDays,
        work_hours: workHours,
      };
    }

    let finalObservations = cleanObservations(observations.trim());
    if (Object.keys(filteredSedeSchedules).length > 0) {
      finalObservations = `${finalObservations}\n\n[CONFIG_SEDES_HORARIOS]${JSON.stringify(filteredSedeSchedules)}[/CONFIG_SEDES_HORARIOS]`.trim();
    }

    const allDays = Array.from(new Set([
      ...workDays,
      ...Object.values(filteredSedeSchedules).flatMap((s) => s.work_days || []),
    ]));
    const allHours = Array.from(new Set([
      ...workHours,
      ...Object.values(filteredSedeSchedules).flatMap((s) => s.work_hours || []),
    ]));

    const { data: savedProfile, error } = await createOrUpdateProfileByEmail({
      id: editingId || undefined,
      email: cleanEmail,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      username: derivedUsername,
      password: passwordText.trim() || undefined,
      password_text: passwordText.trim() || null,
      phone: phone.trim() || null,
      dni: dni.trim() || null,
      role,
      sede_id: primarySedeId,
      sede_ids: effectiveSedeIds,
      turno,
      hire_date: hireDate,
      observations: finalObservations || null,
      commission_rate: commVal / 100,
      is_active: isActive,
      work_days: allDays,
      work_hours: allHours,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(`Error al guardar: ${error}`);
      return;
    }

    const createdUserName = savedProfile?.full_name || firstName.trim();
    resetForm();
    await fetchProfiles();

    await alertDialog({
      title: editingId ? 'Usuario Actualizado' : '¡Usuario Creado Exitosamente!',
      message: editingId
        ? `Los datos de ${createdUserName} fueron guardados correctamente.`
        : `El usuario para ${createdUserName} fue creado con éxito y sus credenciales están listas para usar.`,
      variant: 'success',
    });
  };

  const handleToggleStatus = async (profile: Profile) => {
    const nextState = !profile.is_active;
    const actionText = nextState ? 'activar' : 'desactivar';
    const isOk = await confirm({
      title: 'Cambiar estado de usuario',
      message: `¿Está seguro de que desea ${actionText} a ${profile.full_name}?`,
      confirmText: nextState ? 'Activar' : 'Desactivar',
      variant: 'warning',
    });
    if (!isOk) return;

    const { error } = await toggleProfileActive(profile.id, nextState);
    if (error) {
      await alertDialog({
        title: 'Error de actualización',
        message: `Error al modificar estado: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchProfiles();
    }
  };

  const handleDeleteProfesora = async (profile: Profile) => {
    const isOk = await confirm({
      title: 'Eliminar usuario / profesora',
      message: `¿Está seguro de que desea eliminar a ${profile.full_name}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      variant: 'danger',
    });
    if (!isOk) return;

    const { error } = await deleteProfile(profile.id);
    if (error) {
      await alertDialog({
        title: 'Error de eliminación',
        message: `Error al eliminar: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchProfiles();
    }
  };

  const openWhatsApp = async (phoneStr: string | null) => {
    if (!phoneStr) {
      await alertDialog({
        title: 'Sin teléfono',
        message: 'No se registró número de teléfono para esta profesora.',
        variant: 'info',
      });
      return;
    }
    const cleanNum = phoneStr.replace(/\D/g, '');
    if (!cleanNum) {
      await alertDialog({
        title: 'Teléfono inválido',
        message: 'El número de teléfono registrado no es válido.',
        variant: 'warning',
      });
      return;
    }
    const formatted = cleanNum.startsWith('54') ? cleanNum : `549${cleanNum}`;
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-[var(--text-primary)]">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--color-wood)]" /> Profesores y Usuarios
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowLiquidacion(!showLiquidacion)}
            icon={<TrendingUp className="h-4 w-4 text-[var(--color-wood)]" />}
            className="w-full sm:w-auto"
          >
            {showLiquidacion ? 'Ocultar Liquidaciones' : 'Ver Liquidaciones'}
          </Button>

          <Button
            variant="outline"
            onClick={fetchProfiles}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Sección Liquidación Diaria */}
      {showLiquidacion && (
        <Card className="p-4 sm:p-5 flex flex-col gap-4 border border-[var(--border-default)] animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border-default)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--color-wood)]" /> Liquidación Diaria por Porcentaje
            </h2>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Calculado en tiempo real
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-[var(--text-muted)]">Calculando comisiones...</span>
            </div>
          ) : liquidacion.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-3 text-center">
              No se han registrado cobros asociados a profesoras en el mes.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-semibold">Profesora</th>
                    <th className="py-2.5 px-3 font-semibold">% Comisión</th>
                    <th className="py-2.5 px-3 font-semibold">Cobros Hoy</th>
                    <th className="py-2.5 px-3 font-semibold">Recaudado Hoy</th>
                    <th className="py-2.5 px-3 font-semibold text-[var(--color-wood)]">A Pagar Hoy</th>
                    <th className="py-2.5 px-3 font-semibold">Recaudado Mes</th>
                    <th className="py-2.5 px-3 font-semibold text-[var(--color-wood)] text-right">A Pagar Acumulado Mes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                  {liquidacion.map((item) => (
                    <tr key={item.profesora_id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="py-3 px-3 font-bold">{item.profesora_nombre}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-[var(--color-wood)]/20 text-[var(--color-wood)] font-bold">
                          {(item.commission_rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium">{item.pagos_hoy} cobros</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">${item.monto_hoy.toLocaleString()}</td>
                      <td className="py-3 px-3 font-extrabold text-[var(--color-wood)]">
                        ${item.comision_hoy.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">${item.monto_mes.toLocaleString()}</td>
                      <td className="py-3 px-3 font-extrabold text-[var(--color-wood)] text-right">
                        ${item.comision_mes.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tarjeta: Formulario Completo Unificado (Opción 2) */}
      <Card className="p-6 border border-[var(--border-default)] shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[var(--color-wood)]/15 text-[var(--color-wood)] flex items-center justify-center font-bold text-sm">
              {editingId ? <Edit2 className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {editingId ? 'Editar registro de usuario / profesora' : 'Registrar profesora / usuario'}
              </h2>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--color-danger)] flex items-center gap-1 cursor-pointer font-medium"
            >
              <X className="h-4 w-4" /> Cancelar edición
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSaveProfesora} className="flex flex-col gap-6">
          {/* Bloque 1: Datos Personales y Credenciales de Acceso */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> 1. Datos Personales y Credenciales de Acceso
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Input
                label="Nombre *"
                placeholder="ej. Paola"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                icon={<User className="h-4 w-4" />}
                required
              />

              <Input
                label="Apellido"
                placeholder="ej. Gómez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                icon={<User className="h-4 w-4" />}
              />

              <Input
                label="Nombre de usuario (para login)"
                placeholder="ej. paola"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<User className="h-4 w-4" />}
                hint="Permite ingresar en la app con este nombre"
              />

              <Input
                label="Correo electrónico (Opcional)"
                type="email"
                placeholder="ej. paola@pilateslr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editingId}
                hint={editingId ? 'El correo de sesión no se puede modificar' : 'Si se deja vacío se genera con el usuario'}
                icon={<AtSign className="h-4 w-4" />}
              />

              <div className="flex flex-col gap-1.5 w-full min-w-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                    Contraseña {editingId ? '(Opcional)' : '*'}
                  </label>
                  <button
                    type="button"
                    onClick={generarContrasena}
                    className="text-[11px] font-bold text-[var(--color-wood)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" /> Generar clave
                  </button>
                </div>
                <div className="relative w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    placeholder={editingId ? 'Dejar en blanco para mantener' : 'Mínimo 6 caracteres'}
                    value={passwordText}
                    onChange={(e) => setPasswordText(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-md text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Input
                label="Teléfono / WhatsApp"
                placeholder="ej. 3804123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Bloque 2: Permisos, Sede y Condiciones Laborales */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> 2. Permisos, Sede &amp; Comisiones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="flex flex-col gap-1.5 w-full min-w-0">
                <label className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] block">
                  Rol en el sistema *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-semibold"
                >
                  <option value="PROFESORA">Profesora (Acceso a Inicio, Agenda, Alumnas)</option>
                  <option value="ADMIN">Administración (Acceso Total)</option>
                </select>
              </div>

              {role === 'ADMIN' ? (
                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] block">
                    Alcance de sedes
                  </label>
                  <div className="h-10 px-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center text-xs text-[var(--text-muted)] font-medium">
                    Todas las sedes (Rol Administrador)
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 w-full min-w-0 col-span-1 sm:col-span-2">
                  <label className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] block">
                    Sedes Asignadas *
                  </label>
                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)] min-h-[40px]">
                    {sedes.map((s) => {
                      const isChecked = selectedSedeIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors border select-none ${
                            isChecked
                              ? 'bg-[var(--color-wood)]/15 border-[var(--color-wood)] text-[var(--color-wood)]'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSedeSelection(s.id)}
                            className="rounded accent-[var(--color-wood)] h-3.5 w-3.5"
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {selectedSedeIds.length === 1
                      ? 'Asignación fija en 1 sede.'
                      : selectedSedeIds.length > 1
                      ? `Profesora multi-sede (${selectedSedeIds.length} sedes autorizadas). Podrá alternar únicamente entre estas sedes.`
                      : 'Marcar al menos una sede.'}
                  </span>
                </div>
              )}

              {(role as string) !== 'ADMIN' && (
                <>
                  <Input
                    label="Porcentaje de comisión (%) *"
                    type="number"
                    min="0"
                    max="100"
                    placeholder=""
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
                    required={(role as string) !== 'ADMIN'}
                  />

                  <div className="flex flex-col gap-1.5 w-full min-w-0">
                    <label className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] block">
                      Turno habitual
                    </label>
                    <select
                      value={turno}
                      onChange={(e) => setTurno(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-semibold"
                    >
                      <option value="Mañana">Mañana</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Ambos">Ambos</option>
                      <option value="Noche">Noche</option>
                    </select>
                  </div>
                </>
              )}



              <Input
                label="Fecha de Ingreso"
                type="date"
                placeholder=""
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />

              <div className="flex flex-col gap-1.5 w-full min-w-0">
                <label className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] block">
                  Estado
                </label>
                <select
                  value={isActive ? 'Activa' : 'Inactiva'}
                  onChange={(e) => setIsActive(e.target.value === 'Activa')}
                  className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs font-semibold"
                >
                  <option value="Activa">Activa / Habilitado</option>
                  <option value="Inactiva">Inactiva / Bloqueado</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Observaciones adicionales
              </label>
              <textarea
                rows={2}
                placeholder=""
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs resize-y"
              />
            </div>
          </div>

          {/* Bloque 3: Disponibilidad Horaria (Días y Horarios) */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-default)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> 3. Disponibilidad &amp; Horarios de Trabajo
              </h3>
              {selectedSedeIds.length > 1 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ⚡ Modo Multi-Sede activo: Horarios configurables por estudio
                </span>
              )}
            </div>

            {/* Pestañas de Sedes para horarios diferenciados */}
            {selectedSedeIds.length > 1 && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] space-y-2.5">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  🏢 Seleccioná el estudio para definir sus días y turnos de trabajo:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {sedes.filter((s) => selectedSedeIds.includes(s.id)).map((s) => {
                    const isCurrent = currentSedeForSchedule === s.id;
                    const sched = sedeSchedules[s.id];
                    const daysCount = sched?.work_days?.length || 0;
                    const hoursCount = sched?.work_hours?.length || 0;

                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setActiveScheduleSedeId(s.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                          isCurrent
                            ? 'bg-[var(--color-wood)] text-white border-[var(--color-wood)] shadow-xs ring-2 ring-[var(--color-wood)]/30'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{s.name}</span>
                        <span className="text-[10px] opacity-85 font-normal">
                          ({daysCount}d · {hoursCount}hs)
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Configurando disponibilidad para: <strong className="text-[var(--text-primary)]">{sedes.find((s) => s.id === currentSedeForSchedule)?.name || 'Sede'}</strong>
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Días Asignados {selectedSedeIds.length > 1 && `(${sedes.find((s) => s.id === currentSedeForSchedule)?.name.split('—')[0].trim() || 'Sede'})`}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {DIAS_OPCIONES.map((dia) => {
                    const checked = activeWorkDays.includes(dia.full);
                    return (
                      <button
                        type="button"
                        key={dia.full}
                        onClick={() => toggleDay(dia.full)}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                          checked
                            ? 'bg-[var(--color-wood)] text-white border-[var(--color-wood)] shadow-xs'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--color-wood)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                        <span>{dia.full}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Horarios Asignados (Turno Mañana) {selectedSedeIds.length > 1 && `(${sedes.find((s) => s.id === currentSedeForSchedule)?.name.split('—')[0].trim() || 'Sede'})`}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {HORARIOS_MANANA.map((hour) => {
                    const checked = activeWorkHours.includes(hour);
                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => toggleHour(hour)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          checked
                            ? 'bg-[var(--color-wood)]/20 text-[var(--color-wood)] border-[var(--color-wood)] font-bold'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        <span>{hour} hs</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Horarios Asignados (Turno Tarde / Noche) {selectedSedeIds.length > 1 && `(${sedes.find((s) => s.id === currentSedeForSchedule)?.name.split('—')[0].trim() || 'Sede'})`}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {HORARIOS_TARDE.map((hour) => {
                    const checked = activeWorkHours.includes(hour);
                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => toggleHour(hour)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          checked
                            ? 'bg-[var(--color-wood)]/20 text-[var(--color-wood)] border-[var(--color-wood)] font-bold'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        <span>{hour} hs</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Guardado */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-md bg-[#131927] hover:bg-[#1a2337] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingId ? 'Actualizar perfil' : 'Vincular y Guardar Registro'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Tarjeta: Listado Registrado */}
      <Card className="p-6 border border-[var(--border-default)] flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Personal registrado
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-[var(--bg-tertiary)] text-[var(--color-wood)] border border-[var(--border-default)]">
                {profiles.length} registros
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Administrá accesos, comisiones, contraseñas y estados.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-full sm:w-64">
              <Input
                placeholder=""
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-md border border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'ALL'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('PROFESORA')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'PROFESORA'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Profesoras
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('ADMIN')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'ADMIN'
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Administración
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-[var(--text-muted)]">Cargando datos...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No se encontraron registros.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Nombre</th>
                  <th className="py-3 px-4 font-semibold">Email / Usuario</th>
                  <th className="py-3 px-4 font-semibold">Contraseña</th>
                  <th className="py-3 px-4 font-semibold">Rol</th>
                  <th className="py-3 px-4 font-semibold">Sedes Asignadas</th>
                  <th className="py-3 px-4 font-semibold">Turno</th>
                  <th className="py-3 px-4 font-semibold">Comisión</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {profiles.map((prof) => {
                  const displayName = prof.full_name || [prof.first_name, prof.last_name].filter(Boolean).join(' ') || 'Sin nombre';
                  const isPassVisible = !!visiblePasswords[prof.id];

                  return (
                    <tr key={prof.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-wood)]/20 text-[var(--color-wood)] font-bold flex items-center justify-center shrink-0 text-xs">
                            {displayName[0].toUpperCase()}
                          </div>
                          <span>{displayName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)]">{prof.email}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {prof.role === 'ADMIN' ? (
                          <span className="text-[var(--text-muted)] italic font-sans">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)]/60 rounded px-2.5 py-1 w-fit border border-[var(--border-default)]">
                            <span>{isPassVisible ? (prof.password_text || '••••••••') : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(prof.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-1 cursor-pointer"
                              title={isPassVisible ? 'Ocultar' : 'Mostrar'}
                            >
                              {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {prof.role === 'ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Administración
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Profesora
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {prof.role === 'ADMIN' ? (
                          <span className="text-[var(--text-muted)] italic text-[11px] font-medium">Todas (Admin)</span>
                        ) : (() => {
                          const pIds = Array.isArray(prof.sede_ids) && prof.sede_ids.length > 0
                            ? prof.sede_ids
                            : (prof.sede_id ? [prof.sede_id] : []);
                          const matchingSedes = sedes.filter((s) => pIds.includes(s.id));
                          if (matchingSedes.length === 0) {
                            return <span className="text-[var(--text-muted)] italic text-[11px]">Sin sede</span>;
                          }
                          if (matchingSedes.length === 1) {
                            return (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                                {matchingSedes[0].name}
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-fit">
                                Multi-sede ({matchingSedes.length})
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] leading-tight">
                                {matchingSedes.map(s => s.name.split('—')[0].trim()).join(' + ')}
                              </span>
                              {(() => {
                                const scheds = parseSedeSchedules(prof.observations);
                                if (!scheds) return null;
                                return (
                                  <div className="flex flex-col gap-0.5 mt-0.5">
                                    {matchingSedes.map((s) => {
                                      const sc = scheds[s.id];
                                      if (!sc || (sc.work_days.length === 0 && sc.work_hours.length === 0)) return null;
                                      return (
                                        <div key={s.id} className="text-[10px] leading-tight text-[var(--text-secondary)] bg-[var(--bg-tertiary)]/70 px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                          <strong className="text-[var(--color-wood)]">{s.name.split('—')[0].trim()}:</strong>{' '}
                                          <span>{sc.work_days.map(d => d.slice(0, 3)).join(', ')}</span>{' '}
                                          <span className="text-[var(--text-muted)] font-mono">({sc.work_hours.join(', ')})</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4">
                        {prof.role === 'ADMIN' ? (
                          <span className="text-[var(--text-muted)] italic">—</span>
                        ) : (
                          prof.turno || 'Mañana'
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[var(--color-wood)]">
                        {prof.role === 'ADMIN' ? (
                          <span className="text-[var(--text-muted)] font-normal italic">—</span>
                        ) : (
                          `${((prof.commission_rate ?? 0.40) * 100).toFixed(0)}%`
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={prof.is_active ? 'success' : 'danger'}>
                          {prof.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Botón Editar */}
                          <button
                            onClick={() => handleEditClick(prof)}
                            className="px-2.5 py-1.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" /> Editar
                          </button>

                          {/* Botón WhatsApp */}
                          <button
                            onClick={() => openWhatsApp(prof.phone)}
                            className="px-2.5 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </button>

                          {/* Botón Copiar Acceso */}
                          <button
                            onClick={() => copyCredenciales(prof)}
                            className="px-2.5 py-1.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Copiar mensaje con usuario y contraseña para enviar por WhatsApp"
                          >
                            <Copy className="h-3 w-3" /> Copiar Acceso
                          </button>

                          {/* Botón Desactivar / Activar */}
                          <button
                            onClick={() => handleToggleStatus(prof)}
                            className="px-2.5 py-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {prof.is_active ? (
                              <>
                                <UserX className="h-3 w-3" /> Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" /> Activar
                              </>
                            )}
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => handleDeleteProfesora(prof)}
                            className="px-2.5 py-1.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
