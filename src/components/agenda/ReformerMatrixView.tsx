'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Clase } from '@/types/database';
import {
  Calendar,
  Plus,
  Clock,
  RotateCcw,
  DollarSign,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  User,
  Lock,
} from 'lucide-react';

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

import { useSede } from '@/hooks/useSede';

interface ReformerMatrixViewProps {
  clases: Clase[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onSelectClase: (clase: Clase) => void;
  onSelectEmptySlot?: (dayOfWeek: number, startTime: string, camilla?: number) => void;
  onOpenAssignModal?: (clase: Clase, camilla?: number) => void;
  onSelectOccupiedSlot?: (
    dayOfWeek: number,
    startTime: string,
    camilla: number,
    alumnaItem: any,
    clase: Clase | null
  ) => void;
  onCobrar?: (alumna: any) => void;
  asistencias?: Record<string, string>; // clase_alumna_id -> status
  maxCamillas?: number;
  currentProfesoraId?: string;
  isProfesoraView?: boolean;
}

function formatFechaCorta(fechaStr?: string | null): string {
  if (!fechaStr) return '';
  const parts = fechaStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return fechaStr;
}

export function ReformerMatrixView({
  clases,
  selectedDay,
  onSelectDay,
  onSelectClase,
  onSelectEmptySlot,
  onOpenAssignModal,
  onSelectOccupiedSlot,
  onCobrar,
  asistencias = {},
  maxCamillas,
  currentProfesoraId,
  isProfesoraView = false,
}: ReformerMatrixViewProps) {
  const { selectedSede } = useSede();
  const effectiveMaxCamillas = maxCamillas || (selectedSede?.max_camillas ? selectedSede.max_camillas : 6);
  const camillasList = Array.from({ length: effectiveMaxCamillas }, (_, i) => i + 1);

  const [fechaAsistencia, setFechaAsistencia] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filtrar clases del día seleccionado
  const clasesDelDia = clases.filter((c) => c.day_of_week === selectedDay);

  // Mapear matriz por horario y reformer dinámico
  const matrizHorarios = HORARIOS_ESTANDAR.map((hora) => {
    const claseEnHora = clasesDelDia.find(
      (c) => c.start_time.startsWith(hora) || c.start_time.slice(0, 5) === hora
    );

    const camillasMap: Record<number, { alumna: any; caId: string; status?: string; is_other_profesora?: boolean } | null> = {};
    camillasList.forEach((num) => {
      camillasMap[num] = null;
    });

    if (claseEnHora && claseEnHora.alumnas) {
      if (Array.isArray(claseEnHora.alumnas)) {
        claseEnHora.alumnas.forEach((item: any, idx: number) => {
          const camillaNum = item.camilla || idx + 1;
          if (camillaNum >= 1 && camillaNum <= effectiveMaxCamillas) {
            camillasMap[camillaNum] = {
              alumna: item.alumna || item,
              caId: item.id || `ca-${idx}`,
              status: item.status,
              is_other_profesora: item.is_other_profesora || false,
            };
          }
        });
      }
    }

    const ocupadosHora = Object.values(camillasMap).filter(Boolean).length;

    return {
      hora,
      clase: claseEnHora || null,
      camillasMap,
      ocupadosHora,
    };
  });

  // Métricas del día
  let totalLugaresOcupados = 0;
  let presentesCount = 0;
  let ausentesCount = 0;
  let recuperacionesCount = 0;

  matrizHorarios.forEach((row) => {
    Object.values(row.camillasMap).forEach((slot) => {
      if (slot && slot.alumna) {
        totalLugaresOcupados++;
        const st = asistencias[slot.caId];
        if (st === 'PRESENT') presentesCount++;
        else if (st === 'ABSENT') ausentesCount++;
        else if (st === 'RECOVERY') recuperacionesCount++;
      }
    });
  });

  const totalCapacidadDia = HORARIOS_ESTANDAR.length * effectiveMaxCamillas;
  const nombreDiaActual = DIAS.find((d) => d.value === selectedDay)?.label || 'Lunes';
  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-6 text-[var(--text-primary)] w-full">
      {/* 1. SELECTOR DE DÍAS + FECHA ASISTENCIA */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Botones de Días */}
        <div className="flex items-center gap-2 flex-wrap">
          {DIAS.map((d) => {
            const isSelected = selectedDay === d.value;
            const countDia = clases
              .filter((c) => c.day_of_week === d.value)
              .reduce((acc, c) => acc + (c.alumnas?.length || 0), 0);

            return (
              <button
                key={d.value}
                onClick={() => onSelectDay(d.value)}
                className={`px-3.5 sm:px-4 py-2 rounded-[29px] text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs font-bold'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
                }`}
              >
                <span>{d.label}</span>
                {countDia > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-[var(--color-wood)]/15 text-[var(--color-wood)]'
                    }`}
                  >
                    {countDia}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Input de Fecha para Asistencias */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-[var(--bg-primary)] border border-[var(--border-default)] px-3.5 py-1.5 rounded-[29px]">
          <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">Fecha:</span>
          <input
            type="date"
            value={fechaAsistencia}
            onChange={(e) => setFechaAsistencia(e.target.value)}
            className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* 2. REFERENCIAS DE ESTADO */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
          Referencias de Estado:
        </span>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
          {/* Violeta: Pendiente de inicio */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#f5f3ff] dark:bg-[#231c3b] text-[#6b21a8] dark:text-[#d8b4fe] border border-[#c084fc] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9333ea] dark:bg-[#c084fc] shrink-0" />
            <span>Pendiente Inicio</span>
          </div>

          {/* Verde: Disponible */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#f4fdf8] dark:bg-[#0c1f17] text-[#166534] dark:text-[#86efac] border border-[#22c55e] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] dark:bg-[#4ade80] shrink-0" />
            <span>Disponible</span>
          </div>

          {/* Amarillo: Presente */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#fefce8] dark:bg-[#261f0b] text-[#854d0e] dark:text-[#fde047] border border-[#eab308] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ca8a04] dark:bg-[#facc15] shrink-0" />
            <span>Presente</span>
          </div>

          {/* Rojo: Ausente */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#fff5f5] dark:bg-[#200f13] text-[#991b1b] dark:text-[#fca5a5] border border-[#f87171] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] dark:bg-[#f87171] shrink-0" />
            <span>Ausente</span>
          </div>

          {/* Recupera */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#eef2ff] dark:bg-[#13122b] text-[#3730a3] dark:text-[#c7d2fe] border border-[#818cf8] font-medium text-[11px]">
            <RotateCcw className="h-3 w-3 text-[#4f46e5] dark:text-[#a5b4fc]" />
            <span>Recupera</span>
          </div>
        </div>
      </div>

      {/* 3. RESUMEN RÁPIDO DEL DÍA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Lugares Ocupados
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] my-0.5">
            {totalLugaresOcupados}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">/ {totalCapacidadDia || 72}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{nombreDiaActual}</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Presentes
          </span>
          <div className="text-2xl font-bold text-[#b45309] dark:text-[#fde047] my-0.5">
            {presentesCount}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Asistieron hoy</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Ausentes
          </span>
          <div className="text-2xl font-bold text-[#b91c1c] dark:text-[#f87171] my-0.5">
            {ausentesCount}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Faltas registradas</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-3.5 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Recuperaciones
          </span>
          <div className="text-2xl font-bold text-[#4338ca] dark:text-[#a5b4fc] my-0.5">
            {recuperacionesCount}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Clases a recuperar</span>
        </div>
      </div>

      {/* 4. MATRIZ DE TURNOS CON ENCABEZADOS DE COLUMNA (Estilo Captura 2) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Turnos Reformer &bull; {nombreDiaActual}
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Hacé clic en cualquier alumna para ver opciones o en [Cobrar] para registrar pago
          </span>
        </div>

        {/* Barra de Encabezados de Columnas (Hora + Reformer 1 a N) */}
        <div className={`hidden lg:grid ${effectiveMaxCamillas === 4 ? 'grid-cols-[100px_repeat(4,1fr)]' : 'grid-cols-[100px_repeat(6,1fr)]'} gap-2.5 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] text-center`}>
          <div className="text-left pl-2">Hora</div>
          {camillasList.map((num) => (
            <div key={num}>Reformer {num}</div>
          ))}
        </div>

        {matrizHorarios.map((row) => (
          <div
            key={row.hora}
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-3.5 sm:p-4 shadow-sm space-y-3 transition-colors hover:border-[var(--border-hover)]"
          >
            {/* Header del Horario para Mobile */}
            <div className="flex lg:hidden items-center justify-between border-b border-[var(--border-default)] pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="px-3.5 py-1 rounded-[22px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-mono font-bold">
                  {row.hora} hs
                </span>
                {row.clase?.profesora ? (
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Profe {row.clase.profesora.first_name || row.clase.profesora.full_name?.split(' ')[0]}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] italic">
                    Sin profe asignada
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[var(--text-primary)]">
                  {row.ocupadosHora} / {effectiveMaxCamillas} ocupados
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    row.ocupadosHora >= effectiveMaxCamillas
                      ? 'bg-[#ef4444]'
                      : row.ocupadosHora > 0
                      ? 'bg-[#f59e0b]'
                      : 'bg-[#22c55e]'
                  }`}
                />
              </div>
            </div>

            {/* Fila Grid de Horario + Reformers */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${effectiveMaxCamillas === 4 ? 'lg:grid-cols-[100px_repeat(4,1fr)]' : 'lg:grid-cols-[100px_repeat(6,1fr)]'} gap-2.5 items-stretch`}>
              {/* Bloque Hora en desktop */}
              <div className="hidden lg:flex flex-col justify-center items-start pl-2">
                <span className="px-3 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-sm font-mono font-black shadow-2xs">
                  {row.hora}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold mt-1">
                  {row.ocupadosHora}/{effectiveMaxCamillas} ocupados
                </span>
                {row.clase?.profesora ? (
                  <span
                    className="text-[10px] font-extrabold text-[var(--color-wood)] truncate max-w-[90px] mt-0.5 flex items-center gap-0.5"
                    title={`Profesora: ${row.clase.profesora.full_name || row.clase.profesora.first_name}`}
                  >
                    <User className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                    {row.clase.profesora.first_name || row.clase.profesora.full_name?.split(' ')[0]}
                  </span>
                ) : (
                  <span className="text-[9px] text-[var(--text-muted)] italic mt-0.5">
                    Sin profe
                  </span>
                )}
              </div>

              {camillasList.map((refNum) => {
                const item = row.camillasMap[refNum];

                // CASO 1: LUGAR OCUPADO POR ALUMNA (ESTILO CAPTURA 2)
                if (item && item.alumna) {
                  const alumna = item.alumna;
                  const alumnaNombre =
                    `${alumna.first_name || ''} ${alumna.last_name || ''}`.trim() || 'Alumna';
                  const phone = alumna.phone || '';
                  const statusAsistencia = asistencias[item.caId];

                  // 0. Si es vista de profesora y la alumna pertenece a otra profesora, enmascarar slot
                  const isOtherProfesora =
                    item.is_other_profesora ||
                    (isProfesoraView &&
                      currentProfesoraId &&
                      alumna.profesora_id &&
                      alumna.profesora_id !== currentProfesoraId);

                  if (isProfesoraView && isOtherProfesora) {
                    return (
                      <div
                        key={refNum}
                        className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border-2 border-dashed border-[var(--border-default)] flex flex-col justify-between min-h-[110px] text-left opacity-75 select-none"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                            <span className="lg:hidden">REF {refNum}</span>
                            <span className="hidden lg:inline text-[9px] opacity-60">Reformer {refNum}</span>
                          </div>
                          <span className="font-bold text-[12px] text-[var(--text-muted)] leading-tight flex items-center gap-1.5 mt-0.5">
                            <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Ocupado
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-1 font-medium italic">
                            Otra profesora
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] text-[var(--text-muted)] font-mono">
                          No asignada a tu cargo
                        </div>
                      </div>
                    );
                  }

                  // Evaluar si es clase individual, clase de prueba o solo inscripción
                  const isClaseIndividualOInscripcion =
                    alumna.plan === 'Solo Inscripción / Clase de prueba' ||
                    (alumna.plan && alumna.plan.toLowerCase().includes('individual')) ||
                    (alumna.plan && alumna.plan.toLowerCase().includes('prueba')) ||
                    (alumna.plan && alumna.plan.toLowerCase().includes('inscripci')) ||
                    (alumna.enrollment_paid && (!alumna.plan_amount || alumna.plan_amount === 0));

                  // CASO MORADO: Clase individual o sólo inscripción
                  if (isClaseIndividualOInscripcion) {
                    return (
                      <div
                        key={refNum}
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-xl bg-[#faf5ff] dark:bg-[#1e102d] border-2 border-[#9333ea] hover:border-[#7e22ce] dark:border-[#a855f7] transition-all cursor-pointer flex flex-col justify-between min-h-[110px] text-left shadow-2xs group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#7e22ce] dark:text-[#d8b4fe] mb-1">
                            <span className="lg:hidden">REF {refNum}</span>
                            <span className="hidden lg:inline text-[9px] opacity-75">Reformer {refNum}</span>
                            {statusAsistencia === 'PRESENT' ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-950 text-purple-900 dark:text-purple-200 text-[9px] font-bold">
                                ✓ Presente
                              </span>
                            ) : statusAsistencia === 'ABSENT' ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-950 text-rose-900 dark:text-rose-200 text-[9px] font-bold">
                                ✗ Ausente
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-[9px] font-bold">
                                🟣 Reserva / Prueba
                              </span>
                            )}
                          </div>

                          <span className="font-extrabold text-[13px] text-[#581c87] dark:text-[#f3e8ff] leading-tight block">
                            {alumnaNombre}
                          </span>

                          <span className="text-[10px] text-[#7e22ce] dark:text-[#d8b4fe] block mt-1 font-semibold">
                            {alumna.status === 'SUSPENDED'
                              ? '⏸️ Suspendida (Tomó su clase)'
                              : alumna.enrollment_paid
                              ? 'Inscripción abonada'
                              : 'Clase de prueba / Reserva'}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1.5">
                          <span className="text-[11px] text-[#7e22ce] dark:text-[#c4b5fd] font-mono block truncate">
                            {phone || 'Sin tel'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onCobrar) {
                                onCobrar(alumna);
                              } else if (onSelectOccupiedSlot) {
                                onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                              }
                            }}
                            className="w-full py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold flex items-center justify-center gap-1 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                          >
                            <span>💵 Cobrar</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Evaluar si es pendiente de inicio (fecha futura)
                  const fechaInicio = alumna.billing_start_date || alumna.start_date || alumna.entry_date;
                  const fechaReferencia = fechaAsistencia || hoyStr;
                  const isPendienteInicio =
                    (fechaInicio && fechaInicio > fechaReferencia) ||
                    alumna.status === 'PENDING' ||
                    item.status === 'PENDING';

                  // Estilo violeta para pendiente de inicio
                  if (isPendienteInicio) {
                    return (
                      <div
                        key={refNum}
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-xl bg-[#f5f3ff] dark:bg-[#231c3b] border-2 border-[#c084fc] hover:border-[#a855f7] transition-all cursor-pointer flex flex-col justify-between min-h-[110px] text-left shadow-2xs group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#6b21a8] dark:text-[#d8b4fe] mb-1">
                            <span className="lg:hidden">REF {refNum}</span>
                            <span className="hidden lg:inline text-[9px] opacity-75">Reformer {refNum}</span>
                          </div>

                          {/* Nombre en negrita */}
                          <span className="font-extrabold text-[13px] text-[#4c1d95] dark:text-[#f3e8ff] leading-tight block">
                            {alumnaNombre}
                          </span>

                          {/* Badge Violeta Pendiente de Inicio */}
                          <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-[#ede9fe] dark:bg-[#4c1d95] text-[#5b21b6] dark:text-[#ddd6fe] text-[10px] font-bold">
                            Pendiente de inicio {fechaInicio ? `– Comienza ${formatFechaCorta(fechaInicio)}` : ''}
                          </div>
                        </div>

                        {/* Teléfono */}
                        <div className="mt-2 text-[11px] font-medium text-[#6b21a8] dark:text-[#c4b5fd] truncate">
                          {phone || 'Sin teléfono'}
                        </div>
                      </div>
                    );
                  }

                  // Estilo Presente (Amarillo)
                  if (statusAsistencia === 'PRESENT') {
                    return (
                      <div
                        key={refNum}
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-xl bg-[#fefce8] dark:bg-[#261f0b] border-2 border-[#eab308] hover:brightness-95 transition-all cursor-pointer flex flex-col justify-between min-h-[110px] text-left shadow-2xs group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#854d0e] dark:text-[#fde047] mb-1">
                            <span className="lg:hidden">REF {refNum}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#fef08a] dark:bg-[#4d3e10] text-[#854d0e] dark:text-[#fde047] text-[9px] font-bold">
                              ✓ Presente
                            </span>
                          </div>
                          <span className="font-extrabold text-[13px] text-[#1e1b18] dark:text-[#ffffff] leading-tight block">
                            {alumnaNombre}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="text-[11px] font-medium text-[#854d0e] dark:text-[#fde047] truncate">
                            {phone || 'Asistencia confirmada'}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onCobrar) {
                                onCobrar(alumna);
                              } else if (onSelectOccupiedSlot) {
                                onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                              }
                            }}
                            className="w-full py-1 px-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-[11px] font-extrabold flex items-center justify-center gap-1 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                          >
                            <span>💵 Cobrar</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Estilo Ausente (Rojo)
                  if (statusAsistencia === 'ABSENT') {
                    return (
                      <div
                        key={refNum}
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-xl bg-[#fff1f2] dark:bg-[#271015] border-2 border-[#f43f5e] hover:brightness-95 transition-all cursor-pointer flex flex-col justify-between min-h-[110px] text-left shadow-2xs group relative"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#9f1239] dark:text-[#fda4af] mb-1">
                            <span className="lg:hidden">REF {refNum}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#fecdd3] dark:bg-[#4c0519] text-[#9f1239] dark:text-[#fda4af] text-[9px] font-bold">
                              ✗ Ausente
                            </span>
                          </div>
                          <span className="font-extrabold text-[13px] text-[#1e1b18] dark:text-[#ffffff] leading-tight block">
                            {alumnaNombre}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] font-medium text-[#9f1239] dark:text-[#fda4af] truncate">
                          {phone || 'Falta registrada'}
                        </div>
                      </div>
                    );
                  }

                  // Estilo Estándar / Sin Marcar con Botón Cobrar (Idéntico a Captura 2)
                  return (
                    <div
                      key={refNum}
                      onClick={() => {
                        if (onSelectOccupiedSlot) {
                          onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                        } else if (row.clase) {
                          onSelectClase(row.clase);
                        }
                      }}
                      className="p-3 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-default)] hover:border-[var(--color-wood)] transition-all cursor-pointer flex flex-col justify-between min-h-[110px] text-left shadow-2xs group relative"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                          <span className="lg:hidden">REF {refNum}</span>
                          <span className="hidden lg:inline text-[9px] opacity-60">Reformer {refNum}</span>
                        </div>

                        {/* Nombre de la Alumna en negrita */}
                        <span className="font-bold text-[13px] text-[var(--text-primary)] leading-tight block">
                          {alumnaNombre}
                        </span>

                        {/* Subtítulo: Sin marcar */}
                        <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 font-medium">
                          Sin marcar
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {/* Teléfono */}
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono block truncate">
                          {phone || 'Sin tel'}
                        </span>

                        {/* Botón directo Cobrar (Idéntico a la Captura 2) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCobrar) {
                              onCobrar(alumna);
                            } else if (onSelectOccupiedSlot) {
                              onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                            }
                          }}
                          className="w-full py-1 px-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-[11px] font-extrabold flex items-center justify-center gap-1 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <span>💵 Cobrar</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // CASO 2: LUGAR DISPONIBLE
                return (
                  <button
                    key={refNum}
                    type="button"
                    onClick={() => {
                      if (row.clase && onOpenAssignModal) {
                        onOpenAssignModal(row.clase, refNum);
                      } else if (onSelectEmptySlot) {
                        onSelectEmptySlot(selectedDay, row.hora, refNum);
                      }
                    }}
                    className="p-3 rounded-xl bg-[#f4fdf8] dark:bg-[#0c1f17] hover:bg-[#e8fbf0] dark:hover:bg-[#122e23] border-2 border-dashed border-[#16a34a] dark:border-[#22c55e] transition-all cursor-pointer flex flex-col justify-between items-center text-center min-h-[110px] shadow-2xs group"
                  >
                    <div className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#166534] dark:text-[#86efac]">
                      <span>REF {refNum}</span>
                      <Plus className="h-3.5 w-3.5 text-[#16a34a] dark:text-[#4ade80] transition-transform group-hover:scale-125" />
                    </div>

                    <div className="my-auto py-1">
                      <span className="text-xs sm:text-[13px] font-black uppercase tracking-wide text-[#14532d] dark:text-[#86efac] block">
                        DISPONIBLE
                      </span>
                    </div>

                    <span className="text-[10px] text-[#16a34a] dark:text-[#4ade80] font-bold">
                      + Asignar
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
