'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { getClases } from '@/lib/services/agenda';
import { getSedes } from '@/lib/services/sedes';
import { getPagos } from '@/lib/services/pagos';
import { PagoFormModal } from '@/components/pagos/PagoFormModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  DollarSign,
  UserCheck,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface AsistenciaState {
  [claseAlumnaId: string]: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED';
}

export default function ProfesoraVistaPage() {
  const { profile } = useUser();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [clases, setClases] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaState>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal para cobro directo
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [selectedAlumnaForPago, setSelectedAlumnaForPago] = useState<any | null>(null);

  // Liquidación de la semana para la profesora
  const [semanaTotal, setSemanaTotal] = useState<number>(0);
  const [semanaComision, setSemanaComision] = useState<number>(0);

  const isProfesora = profile?.role === 'PROFESORA';
  const userName = profile?.full_name || 'Profesora';
  const commissionRate = profile?.commission_rate ?? 0.40;

  useEffect(() => {
    fetchClasesYAsistencias();
    fetchResumenSemanal();
  }, [selectedDate, profile?.id]);

  const fetchClasesYAsistencias = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const dayOfWeekNum = getDayOfWeekFromDate(selectedDate);

      // Obtener clases filtradas por el día de la semana
      const { data: clasesRes } = await getClases({ dayOfWeek: dayOfWeekNum });


      // Si es profesora, podemos filtrar sus clases asignadas
      let misClases = clasesRes || [];
      if (isProfesora && profile?.id) {
        misClases = misClases.filter((c) => c.profesora_id === profile.id);
      }

      setClases(misClases);

      // Cargar asistencias ya guardadas para la fecha elegida
      const { data: asistData } = await supabase
        .from('asistencias')
        .select('*')
        .eq('date', selectedDate);

      if (asistData) {
        const asistMap: AsistenciaState = {};
        asistData.forEach((a: any) => {
          if (a.clase_alumna_id) {
            asistMap[a.clase_alumna_id] = a.status;
          }
        });
        setAsistencias(asistMap);
      }
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResumenSemanal = async () => {
    if (!profile?.id) return;
    try {
      const now = new Date(selectedDate);
      const day = now.getDay();
      const diffStart = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
      const startDate = new Date(now.setDate(diffStart)).toISOString().split('T')[0];
      
      const endDateObj = new Date(startDate);
      endDateObj.setDate(endDateObj.getDate() + 6);
      const endDate = endDateObj.toISOString().split('T')[0];

      const pagosRes = await getPagos({ status: 'PAID' });
      const pagosSemana = pagosRes.data.filter((p) => {
        const pDate = p.created_at ? p.created_at.split('T')[0] : '';
        const isMatchDate = pDate >= startDate && pDate <= endDate;
        const isMatchProfe = (p.alumna as any)?.profesora_id === profile.id || !isProfesora;
        return isMatchDate && isMatchProfe;
      });

      const total = pagosSemana.reduce((acc, p) => acc + (p.amount || 0), 0);
      setSemanaTotal(total);
      setSemanaComision(total * commissionRate);
    } catch (err) {
      console.error('Error calculando resumen semanal:', err);
    }
  };

  const handleMarcarAsistencia = async (
    claseAlumnaId: string,
    status: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED'
  ) => {
    setSavingId(claseAlumnaId);
    try {
      const supabase = createClient();
      
      // Actualizar estado local inmediatamente
      setAsistencias((prev) => ({ ...prev, [claseAlumnaId]: status }));

      // Upsert en la tabla asistencias
      const { data: existing } = await supabase
        .from('asistencias')
        .select('id')
        .eq('clase_alumna_id', claseAlumnaId)
        .eq('date', selectedDate)
        .single();

      if (existing) {
        await supabase
          .from('asistencias')
          .update({ status })
          .eq('id', existing.id);
      } else {
        await supabase.from('asistencias').insert({
          clase_alumna_id: claseAlumnaId,
          date: selectedDate,
          status,
        });
      }
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleAbrirPago = (alumna: any) => {
    setSelectedAlumnaForPago(alumna);
    setPagoModalOpen(true);
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in text-[var(--text-primary)]">
      {/* Header Saludo y Selector de Fecha */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              ¡Hola, {userName}!
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Toma de asistencia rápida en 1 clic y registro directo de turnos
          </p>
        </div>

        {/* Controles de Fecha */}
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1.5 rounded-xl border border-[var(--border-default)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeDate(-1)}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Ayer
          </Button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-xs font-bold border border-[var(--border-default)] focus:outline-none cursor-pointer"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeDate(1)}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            Mañana
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Tarjeta de Resumen de Comisiones Semanales de la Profesora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="border-l-4 border-l-[var(--color-wood)]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Cobrado en tus Clases (Semana)
              </span>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                ${semanaTotal.toLocaleString('es-AR')} ARS
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/10 flex items-center justify-center text-[var(--color-wood)]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Tu Comisión Semanal ({Math.round(commissionRate * 100)}%)
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ${semanaComision.toLocaleString('es-AR')} ARS
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sección de Turnos y Clases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--color-wood)]" />
            <span>Turnos del Día ({formatFechaLarga(selectedDate)})</span>
          </h2>
          <Badge variant="muted">
            {clases.length} {clases.length === 1 ? 'Clase' : 'Clases'}
          </Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
            Cargando turnos y lista de asistencias...
          </div>
        ) : clases.length === 0 ? (
          <Card padding="lg" className="text-center py-12 space-y-3">
            <CalendarIcon className="h-10 w-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              No hay clases programadas para esta fecha
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Selecciona otro día usando el calendario superior para revisar asistencias o registrar cuotas.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {clases.map((clase) => {
              const alumnasEnClase = clase.clase_alumnas || [];
              const count = alumnasEnClase.length;

              return (
                <Card
                  key={clase.id}
                  padding="md"
                  className="space-y-4 border-2 hover:border-[var(--color-wood)]/60 transition-all"
                >
                  {/* Banner Header de la Clase */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-lg bg-[var(--color-wood)] text-white text-sm font-extrabold flex items-center gap-1.5 shadow-2xs">
                        <Clock className="h-4 w-4" />
                        <span>{clase.time_slot} hs</span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                          {clase.name || `Clase de ${clase.time_slot} hs`}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {clase.sede?.name || 'Sede Norte'}
                          </span>
                          <span className="flex items-center gap-1 font-semibold">
                            {clase.modality === 'BARRE' ? (
                              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Layers className="h-3.5 w-3.5 text-[var(--color-wood)]" />
                            )}
                            {clase.modality || 'REFORMER'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant={count >= clase.max_capacity ? 'danger' : 'success'}>
                        {count} / {clase.max_capacity} Alumnas
                      </Badge>
                    </div>
                  </div>

                  {/* Lista de Alumnas con Botones Gigantes de Asistencia de 1 Clic */}
                  {count === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic py-2">
                      Sin alumnas inscriptas en este turno.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)]/60">
                      {alumnasEnClase.map((item: any) => {
                        const alumna = item.alumna;
                        if (!alumna) return null;

                        const currentStatus = asistencias[item.id] || 'PRESENT';

                        return (
                          <div
                            key={item.id}
                            className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--bg-tertiary)]/40 px-2 rounded-lg transition-colors"
                          >
                            {/* Info Alumna */}
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)]">
                                {alumna.first_name?.[0]}
                                {alumna.last_name?.[0]}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                  {alumna.first_name} {alumna.last_name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                  <span>DNI: {alumna.dni || 'Sin DNI'}</span>
                                  {alumna.phone && (
                                    <a
                                      href={`https://wa.me/${alumna.phone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-600 hover:underline font-semibold"
                                    >
                                      WhatsApp
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Botones de Asistencia Gigantes 1-Click */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* PRESENTE */}
                              <button
                                onClick={() => handleMarcarAsistencia(item.id, 'PRESENT')}
                                disabled={savingId === item.id}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  currentStatus === 'PRESENT'
                                    ? 'bg-emerald-600 text-white border-2 border-emerald-700 shadow-md scale-105'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
                                }`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>PRESENTE</span>
                              </button>

                              {/* AUSENTE */}
                              <button
                                onClick={() => handleMarcarAsistencia(item.id, 'ABSENT')}
                                disabled={savingId === item.id}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  currentStatus === 'ABSENT'
                                    ? 'bg-rose-600 text-white border-2 border-rose-700 shadow-md scale-105'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 hover:bg-rose-600 hover:text-white'
                                }`}
                              >
                                <XCircle className="h-4 w-4" />
                                <span>AUSENTE</span>
                              </button>

                              {/* RECUPERA */}
                              <button
                                onClick={() => handleMarcarAsistencia(item.id, 'RECOVERY')}
                                disabled={savingId === item.id}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  currentStatus === 'RECOVERY'
                                    ? 'bg-amber-500 text-white border-2 border-amber-600 shadow-md scale-105'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 hover:bg-amber-500 hover:text-white'
                                }`}
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span>RECUPERA</span>
                              </button>

                              {/* Botón Cobrar Cuota Rápido */}
                              <button
                                onClick={() => handleAbrirPago(alumna)}
                                className="p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)] text-[var(--text-muted)] hover:text-white border border-[var(--border-default)] transition-colors cursor-pointer ml-1"
                                title="Registrar cobro directo de esta alumna"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cobro Directo desde el turno */}
      <PagoFormModal
        open={pagoModalOpen}
        onClose={() => {
          setPagoModalOpen(false);
          setSelectedAlumnaForPago(null);
          fetchResumenSemanal();
        }}
        onSubmit={async (data) => {
          const { registrarPago } = await import('@/lib/services/pagos');
          const res = await registrarPago(data);
          if (res.data) {
            fetchResumenSemanal();
            return true;
          }
          return false;
        }}

      />
    </div>
  );
}

function getDayOfWeekFromDate(dateStr: string): number {

  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mie, 4: Jue, 5: Vie, 6: Sab
  return day === 0 ? 7 : day;
}

function formatFechaLarga(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
