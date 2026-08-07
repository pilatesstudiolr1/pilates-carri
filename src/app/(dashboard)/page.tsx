'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { getAlumnas } from '@/lib/services/alumnas';
import { getPagos } from '@/lib/services/pagos';
import { getMovimientos } from '@/lib/services/caja';
import { getClasesConAlumnas } from '@/lib/services/agenda';
import { getSedes } from '@/lib/services/sedes';
import { Alumna, Pago, CajaMovimiento, Clase, Sede } from '@/types/database';
import {
  Users,
  CreditCard,
  MessageCircle,
  Clock,
  Building2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';

function getDayOfWeekToday(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function getNombreDiaHoy(): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date().getDay()];
}

function formatFecha(fechaStr: string | null): string {
  if (!fechaStr) return '';
  const [yyyy, mm, dd] = fechaStr.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export default function DashboardHome() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('ALL');

  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [clasesHoy, setClasesHoy] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar lista dinamica de sedes
  useEffect(() => {
    async function loadSedes() {
      const { data } = await getSedes();
      setSedes(data);
      if (data.length > 0) {
        setSelectedSedeId(data[0].id);
      }
    }
    loadSedes();
  }, []);

  // Cargar datos filtrados por sede seleccionada
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const hoyNum = getDayOfWeekToday();

    const [alumnasRes, pagosRes, movRes, clasesRes] = await Promise.all([
      getAlumnas({ limit: 500, sedeId: selectedSedeId }),
      getPagos({ status: 'ALL', sedeId: selectedSedeId }),
      getMovimientos({ sedeId: selectedSedeId }),
      getClasesConAlumnas({ dayOfWeek: hoyNum, sedeId: selectedSedeId }),
    ]);

    setAlumnas(alumnasRes.data || []);
    setPagos(pagosRes.data || []);
    setMovimientos(movRes.data || []);
    setClasesHoy(clasesRes.data || []);
    setLoading(false);
  }, [selectedSedeId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const hoyISO = new Date().toISOString().split('T')[0];
  const mesActualStr = hoyISO.slice(0, 7);

  // Totales
  const totalRegistradas = alumnas.length;
  const alumnasActivasList = alumnas.filter((a) => a.status === 'ACTIVE');
  const totalActivas = alumnasActivasList.length;
  const totalInactivas = alumnas.filter((a) => a.status === 'INACTIVE').length;

  // Ocupacion
  const totalCapacidadHoy = clasesHoy.reduce((acc, c) => acc + (c.max_capacity || 6), 0);
  const totalAlumnasHoy = clasesHoy.reduce((acc, c) => acc + (c.alumnas_count || 0), 0);
  const porcentajeOcupacion = totalCapacidadHoy > 0 ? Math.round((totalAlumnasHoy / totalCapacidadHoy) * 100) : 0;

  // Vencimientos
  const fechaMas7Dias = new Date();
  fechaMas7Dias.setDate(fechaMas7Dias.getDate() + 7);
  const fechaMas7DiasISO = fechaMas7Dias.toISOString().split('T')[0];

  const vencimientosPendientes = alumnasActivasList.filter(
    (a) => a.billing_due_date && a.billing_due_date < hoyISO
  );
  const vencenEstaSemana = alumnasActivasList.filter(
    (a) => a.billing_due_date && a.billing_due_date >= hoyISO && a.billing_due_date <= fechaMas7DiasISO
  );

  // Finanzas
  const pagosMes = pagos.filter((p) => p.status === 'PAID' && p.payment_date?.startsWith(mesActualStr));
  const ingresosMes = pagosMes.reduce((acc, p) => acc + p.amount, 0);
  const egresosMes = movimientos.filter((m) => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.monto, 0);
  const balanceMes = ingresosMes - egresosMes;

  const pagosHoy = pagos.filter((p) => p.status === 'PAID' && p.payment_date === hoyISO);
  const ingresosHoy = pagosHoy.reduce((acc, p) => acc + p.amount, 0);

  // Agenda de hoy desglosada por horario
  const agendaItemsHoy: { alumnaNombre: string; hora: string; camilla: number | null }[] = [];
  clasesHoy.forEach((clase) => {
    if (clase.alumnas && Array.isArray(clase.alumnas)) {
      clase.alumnas.forEach((ca: any) => {
        const alumnaObj = ca.alumna || ca;
        const nombre = `${alumnaObj.first_name || ''} ${alumnaObj.last_name || ''}`.trim() || 'Alumna';
        agendaItemsHoy.push({
          alumnaNombre: nombre.toLowerCase(),
          hora: clase.start_time.slice(0, 5),
          camilla: ca.camilla || null,
        });
      });
    }
  });
  agendaItemsHoy.sort((a, b) => a.hora.localeCompare(b.hora));

  // Listas limitadas hasta 10 registros
  const vencimientosPendientesLimitados = vencimientosPendientes.slice(0, 10);
  const vencenEstaSemanaLimitados = vencenEstaSemana.slice(0, 10);
  const agendaItemsHoyLimitados = agendaItemsHoy.slice(0, 10);
  const ultimosPagosLimitados = [...pagos]
    .sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
    .slice(0, 10);

  const handleWhatsApp = (phone: string, nombre: string, fechaVenc: string | null) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const numFinal = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
    const text = encodeURIComponent(
      `Hola ${nombre}! Te recordamos de Pilates Studio LR que tu cuota vencio/vence el ${formatFecha(fechaVenc)}. Quedamos a disposicion!`
    );
    window.open(`https://wa.me/${numFinal}?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-[var(--text-primary)]">
      {/* Cabecera Principal con Selector de Sede */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Panel de Control
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Resumen en tiempo real &bull; {getNombreDiaHoy()}, {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto bg-[var(--bg-tertiary)] p-2 rounded-xl border border-[var(--border-default)]">
          <Building2 className="h-4 w-4 text-[var(--color-wood)] shrink-0 ml-1" />
          <span className="text-xs font-semibold text-[var(--text-muted)]">Sede:</span>
          <select
            value={selectedSedeId}
            onChange={(e) => setSelectedSedeId(e.target.value)}
            className="bg-transparent text-xs font-bold text-[var(--text-primary)] pr-2 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando tablero del estudio...</p>
        </div>
      ) : (
        <>
          {/* Fila 1: KPIs Destacados de Alto Impacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hover className="p-5 flex flex-col justify-between gap-3 border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Alumnas Activas</span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-wood)]/15 flex items-center justify-center text-[var(--color-wood)]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-[var(--text-primary)]">{totalActivas}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{totalRegistradas} registradas en total</p>
              </div>
            </Card>

            <Card hover className="p-5 flex flex-col justify-between gap-3 border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Ingresos del Mes</span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-success-soft)] flex items-center justify-center text-[var(--color-success)]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-[var(--color-wood)]">${ingresosMes.toLocaleString()}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{pagosMes.length} cobros registrados</p>
              </div>
            </Card>

            <Card hover className="p-5 flex flex-col justify-between gap-3 border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Balance del Mes</span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-info-soft)] flex items-center justify-center text-[var(--color-info)]">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-[var(--text-primary)]">${balanceMes.toLocaleString()}</p>
                <p className="text-xs text-[var(--color-success)] font-bold mt-1">Balance positivo</p>
              </div>
            </Card>

            <Card hover className="p-5 flex flex-col justify-between gap-3 border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">Cuotas Vencidas</span>
                <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-red-400">{vencimientosPendientes.length}</p>
                <p className="text-xs text-red-400/80 mt-1">{vencenEstaSemana.length} por vencer esta semana</p>
              </div>
            </Card>
          </div>

          {/* Fila 2: Tarjetas Métricas Secundarias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex flex-col gap-1">
              <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase">Turnos de Hoy</span>
              <p className="text-xl font-extrabold text-[var(--text-primary)]">{totalAlumnasHoy} alumnas</p>
              <span className="text-[10px] text-[var(--color-wood)] font-semibold">{porcentajeOcupacion}% de ocupación</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex flex-col gap-1">
              <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase">Presentes Hoy</span>
              <p className="text-xl font-extrabold text-[var(--text-primary)]">0</p>
              <span className="text-[10px] text-[var(--text-muted)]">0 ausentes</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex flex-col gap-1">
              <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase">Egresos del Mes</span>
              <p className="text-xl font-extrabold text-[var(--text-primary)]">${egresosMes.toLocaleString()}</p>
              <span className="text-[10px] text-[var(--text-muted)]">Gastos de caja</span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex flex-col gap-1">
              <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase">Ingresos de Hoy</span>
              <p className="text-xl font-extrabold text-[var(--color-wood)]">${ingresosHoy.toLocaleString()}</p>
              <span className="text-[10px] text-[var(--text-muted)]">{pagosHoy.length} pagos</span>
            </div>
          </div>

          {/* Grilla Principal en 2 Columnas (Límite hasta 10 registros por bloque) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-6">
              {/* Agenda de hoy - Alta prioridad operativa */}
              <Card className="p-6 flex flex-col gap-4 border-[var(--border-default)]">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-[var(--color-wood)]" /> Agenda de Hoy ({getNombreDiaHoy()})
                  </h3>
                  <Badge variant="default">{agendaItemsHoy.length} turnos</Badge>
                </div>

                {agendaItemsHoyLimitados.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                    No hay alumnas agendadas para el día de hoy.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-default)] max-h-96 overflow-y-auto pr-1">
                    {agendaItemsHoyLimitados.map((item, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-[var(--bg-tertiary)]/50 px-2 rounded-lg transition-colors">
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">{item.alumnaNombre}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {item.camilla ? `Camilla Reformer ${item.camilla}` : 'Camilla sin asignar'}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-[var(--color-wood)] px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
                          {item.hora} hs
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Vencimientos pendientes */}
              <Card className="p-6 flex flex-col gap-4 border-[var(--border-default)]">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-400" /> Vencimientos Pendientes
                  </h3>
                  {vencimientosPendientes.length > 0 && (
                    <Badge variant="danger">{vencimientosPendientes.length}</Badge>
                  )}
                </div>

                {vencimientosPendientesLimitados.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                    No hay cuotas vencidas pendientes.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-default)] max-h-96 overflow-y-auto pr-1">
                    {vencimientosPendientesLimitados.map((alumna) => (
                      <div
                        key={alumna.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">
                            {alumna.first_name} {alumna.last_name}
                          </p>
                          <p className="text-[11px] text-red-400 font-medium">
                            Venció el {formatFecha(alumna.billing_due_date)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleWhatsApp(alumna.phone, `${alumna.first_name} ${alumna.last_name}`, alumna.billing_due_date)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-6">
              {/* Vencen esta semana */}
              <Card className="p-6 flex flex-col gap-4 border-[var(--border-default)]">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CalendarDays className="h-4.5 w-4.5 text-[var(--color-wood)]" /> Vencen Esta Semana
                  </h3>
                  {vencenEstaSemana.length > 0 && (
                    <Badge variant="warning">{vencenEstaSemana.length}</Badge>
                  )}
                </div>

                {vencenEstaSemanaLimitados.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                    No hay cuotas a vencer en los próximos 7 días.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-default)] max-h-96 overflow-y-auto pr-1">
                    {vencenEstaSemanaLimitados.map((alumna) => (
                      <div
                        key={alumna.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">
                            {alumna.first_name} {alumna.last_name}
                          </p>
                          <p className="text-[11px] text-[var(--color-warning)] font-medium">
                            Vence el {formatFecha(alumna.billing_due_date)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleWhatsApp(alumna.phone, `${alumna.first_name} ${alumna.last_name}`, alumna.billing_due_date)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Últimos pagos */}
              <Card className="p-6 flex flex-col gap-4 border-[var(--border-default)]">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CreditCard className="h-4.5 w-4.5 text-[var(--color-wood)]" /> Últimos Pagos Registrados
                  </h3>
                </div>

                {ultimosPagosLimitados.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                    No hay pagos registrados.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-default)] max-h-96 overflow-y-auto pr-1">
                    {ultimosPagosLimitados.map((pago) => (
                      <div key={pago.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[var(--text-primary)] capitalize">
                            {pago.alumna ? `${pago.alumna.first_name} ${pago.alumna.last_name}` : 'alumna'}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {pago.payment_date} · <span className="capitalize">{pago.payment_method.replace('_', ' ')}</span>
                          </p>
                        </div>
                        <span className="font-extrabold text-[var(--color-wood)]">
                          ${pago.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Barra Inferior de Resumen Estadístico */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-muted)] border-[var(--border-default)]">
            <div className="flex items-center gap-6 flex-wrap font-medium">
              <span>Activas: <strong className="text-[var(--text-primary)] font-bold">{totalActivas}</strong></span>
              <span>Inactivas: <strong className="text-[var(--text-primary)] font-bold">{totalInactivas}</strong></span>
              <span>Lista de espera: <strong className="text-[var(--text-primary)] font-bold">0</strong></span>
              <span>Asistencias marcadas hoy: <strong className="text-[var(--text-primary)] font-bold">0</strong></span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
