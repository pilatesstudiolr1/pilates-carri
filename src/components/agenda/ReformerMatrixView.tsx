'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Clase } from '@/types/database';
import {
  Calendar,
  Plus,
  Clock,
  RotateCcw,
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
];

interface ReformerMatrixViewProps {
  clases: Clase[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onSelectClase: (clase: Clase) => void;
  onSelectEmptySlot?: (dayOfWeek: number, startTime: string, camilla?: number) => void;
  onOpenAssignModal?: (clase: Clase, camilla?: number) => void;
  onSelectOccupiedSlot?: (dayOfWeek: number, startTime: string, camilla: number, alumnaItem: any, clase: Clase | null) => void;
  asistencias?: Record<string, string>; // clase_alumna_id -> status
}

export function ReformerMatrixView({
  clases,
  selectedDay,
  onSelectDay,
  onSelectClase,
  onSelectEmptySlot,
  onOpenAssignModal,
  onSelectOccupiedSlot,
  asistencias = {},
}: ReformerMatrixViewProps) {
  const [fechaAsistencia, setFechaAsistencia] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filtrar clases del día seleccionado
  const clasesDelDia = clases.filter((c) => c.day_of_week === selectedDay);

  // Mapear matriz por horario y reformer (1 a 6)
  const matrizHorarios = HORARIOS_ESTANDAR.map((hora) => {
    const claseEnHora = clasesDelDia.find((c) => c.start_time.startsWith(hora));

    const camillasMap: Record<number, { alumna: any; caId: string } | null> = {
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    };

    if (claseEnHora && claseEnHora.alumnas) {
      if (Array.isArray(claseEnHora.alumnas)) {
        claseEnHora.alumnas.forEach((item: any, idx: number) => {
          const camillaNum = item.camilla || idx + 1;
          if (camillaNum >= 1 && camillaNum <= 6) {
            camillasMap[camillaNum] = {
              alumna: item.alumna || item,
              caId: item.id || `ca-${idx}`,
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

  // Métricas EXACTAS del día y del filtro actual de profesora
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

  const totalCapacidadDia = HORARIOS_ESTANDAR.length * 6; // 12 horarios x 6 reformers = 72
  const nombreDiaActual = DIAS.find((d) => d.value === selectedDay)?.label || 'Lunes';

  return (
    <div className="flex flex-col gap-6 text-[var(--text-primary)] w-full">
      {/* 1. SELECTOR DE DÍAS LATTICE + FECHA ASISTENCIA */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Botones de Días */}
        <div className="flex items-center gap-2 flex-wrap">
          {DIAS.map((d) => {
            const isSelected = selectedDay === d.value;
            return (
              <button
                key={d.value}
                onClick={() => onSelectDay(d.value)}
                className={`px-4 sm:px-5 py-2 rounded-[29px] text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs font-bold'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-default)]'
                }`}
              >
                {d.label}
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

      {/* 2. REFERENCIAS DE ESTADO (Color Legend Nítido y de Alto Contraste) */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
          Referencias de Estado:
        </span>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
          {/* Verde: Disponible */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#f4fdf8] dark:bg-[#0c1f17] text-[#166534] dark:text-[#86efac] border border-[#22c55e] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] dark:bg-[#4ade80] shrink-0" />
            <span>DISPONIBLE (Libre)</span>
          </div>

          {/* Rojo: Ocupado */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#fff5f5] dark:bg-[#200f13] text-[#991b1b] dark:text-[#fca5a5] border border-[#f87171] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] dark:bg-[#f87171] shrink-0" />
            <span>OCUPADO (Inscripta)</span>
          </div>

          {/* Amarillo: Presente */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#fefce8] dark:bg-[#261f0b] text-[#854d0e] dark:text-[#fde047] border border-[#eab308] font-bold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ca8a04] dark:bg-[#facc15] shrink-0" />
            <span>PRESENTE (Asistió)</span>
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

      {/* 4. MATRIZ DE TURNOS ORDENADA (100% Ancho sin scroll horizontal) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Turnos Reformer &bull; {nombreDiaActual}
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">
            Hacé clic en cualquier camilla para agendar o gestionar asistencia
          </span>
        </div>

        {matrizHorarios.map((row) => (
          <div
            key={row.hora}
            className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 shadow-sm space-y-3 transition-colors hover:border-[var(--border-hover)]"
          >
            {/* Header del Horario */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="px-3.5 py-1 rounded-[22px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-mono font-bold">
                  {row.hora} hs
                </span>
                {row.clase?.name && (
                  <span className="text-xs font-semibold text-[var(--text-secondary)] hidden sm:inline">
                    {row.clase.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[var(--text-primary)]">
                  {row.ocupadosHora} / 6 ocupados
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    row.ocupadosHora === 6
                      ? 'bg-[#ef4444]'
                      : row.ocupadosHora > 0
                      ? 'bg-[#f59e0b]'
                      : 'bg-[#22c55e]'
                  }`}
                />
              </div>
            </div>

            {/* Grid de 6 Reformers (Auto-ajustable al 100% de ancho sin scroll horizontal) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((refNum) => {
                const item = row.camillasMap[refNum];

                // CASO 1: LUGAR OCUPADO POR ALUMNA
                if (item && item.alumna) {
                  const alumnaNombre =
                    `${item.alumna.first_name || ''} ${item.alumna.last_name || ''}`.trim() || 'Alumna';
                  const status = asistencias[item.caId];

                  // Sub-caso 1A: PRESENTE -> Amarillo Cálido, Nítido y Legible
                  if (status === 'PRESENT') {
                    return (
                      <button
                        key={refNum}
                        type="button"
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-[12px] bg-[#fefce8] dark:bg-[#261f0b] border-2 border-[#eab308] hover:brightness-95 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] text-left shadow-2xs group"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#854d0e] dark:text-[#fde047]">
                            <span>REF {refNum}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#fef08a] dark:bg-[#4d3e10] text-[#854d0e] dark:text-[#fde047] text-[9px] font-bold">
                              ✓ Presente
                            </span>
                          </div>
                          <span className="font-extrabold text-[13px] capitalize truncate block mt-1.5 text-[#1e1b18] dark:text-[#ffffff] leading-tight">
                            {alumnaNombre.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#854d0e] dark:text-[#fde047] font-semibold mt-1 truncate">
                          {item.alumna.phone ? `Tel: ${item.alumna.phone.slice(-6)}` : 'Asistencia OK'}
                        </div>
                      </button>
                    );
                  }

                  // Sub-caso 1B: AUSENTE -> Rojo Grisáceo Sobrio
                  if (status === 'ABSENT') {
                    return (
                      <button
                        key={refNum}
                        type="button"
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-[12px] bg-[#fff1f2] dark:bg-[#271015] border-2 border-[#f43f5e] hover:brightness-95 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] text-left shadow-2xs group"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#9f1239] dark:text-[#fda4af]">
                            <span>REF {refNum}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#fecdd3] dark:bg-[#4c0519] text-[#9f1239] dark:text-[#fda4af] text-[9px] font-bold">
                              ✗ Ausente
                            </span>
                          </div>
                          <span className="font-extrabold text-[13px] capitalize truncate block mt-1.5 text-[#1e1b18] dark:text-[#ffffff] leading-tight">
                            {alumnaNombre.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#9f1239] dark:text-[#fda4af] font-semibold mt-1 truncate">
                          Falta
                        </div>
                      </button>
                    );
                  }

                  // Sub-caso 1C: RECUPERA -> Azul Índigo Limpio
                  if (status === 'RECOVERY') {
                    return (
                      <button
                        key={refNum}
                        type="button"
                        onClick={() => {
                          if (onSelectOccupiedSlot) {
                            onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                          } else if (row.clase) {
                            onSelectClase(row.clase);
                          }
                        }}
                        className="p-3 rounded-[12px] bg-[#eef2ff] dark:bg-[#13122b] border-2 border-[#6366f1] hover:brightness-95 transition-all cursor-pointer flex flex-col justify-between min-h-[82px] text-left shadow-2xs group"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#3730a3] dark:text-[#c7d2fe]">
                            <span>REF {refNum}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#e0e7ff] dark:bg-[#312e81] text-[#3730a3] dark:text-[#c7d2fe] text-[9px] font-bold">
                              ↻ Recupera
                            </span>
                          </div>
                          <span className="font-extrabold text-[13px] capitalize truncate block mt-1.5 text-[#1e1b18] dark:text-[#ffffff] leading-tight">
                            {alumnaNombre.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#3730a3] dark:text-[#c7d2fe] font-semibold mt-1 truncate">
                          Recuperatorio
                        </div>
                      </button>
                    );
                  }

                  // Sub-caso 1D: OCUPADO ESTÁNDAR -> Rojo Claro Nítido con Texto Oscuro Ultra Legible
                  return (
                    <button
                      key={refNum}
                      type="button"
                      onClick={() => {
                        if (onSelectOccupiedSlot) {
                          onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                        } else if (row.clase) {
                          onSelectClase(row.clase);
                        }
                      }}
                      className="p-3 rounded-[12px] bg-[#fff5f5] dark:bg-[#200f13] border-2 border-[#f87171] hover:border-[#ef4444] transition-all cursor-pointer flex flex-col justify-between min-h-[82px] text-left shadow-2xs group"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#991b1b] dark:text-[#fca5a5]">
                          <span>REF {refNum}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#fee2e2] dark:bg-[#4c1d24] text-[#991b1b] dark:text-[#fca5a5] text-[9px] font-bold">
                            OCUPADO
                          </span>
                        </div>
                        <span className="font-extrabold text-[13px] capitalize truncate block mt-1.5 text-[#1e1b18] dark:text-[#ffffff] leading-tight">
                          {alumnaNombre.toLowerCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#991b1b] dark:text-[#fca5a5] font-semibold mt-1 truncate">
                        {item.alumna.phone ? `Tel: ${item.alumna.phone.slice(-6)}` : 'Sin marcar'}
                      </div>
                    </button>
                  );
                }

                // CASO 2: LUGAR DISPONIBLE (VERDE BLANCO, ULTRA NÍTIDO, EN GRANDE "DISPONIBLE")
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
                    className="p-3 rounded-[12px] bg-[#f4fdf8] dark:bg-[#0c1f17] hover:bg-[#e8fbf0] dark:hover:bg-[#122e23] border-2 border-dashed border-[#16a34a] dark:border-[#22c55e] transition-all cursor-pointer flex flex-col justify-between items-center text-center min-h-[82px] shadow-2xs group"
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
