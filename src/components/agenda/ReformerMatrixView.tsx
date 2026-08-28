'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Clase } from '@/types/database';
import {
  Calendar,
  Plus,
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
  asistencias?: Record<string, string>; // clase_alumna_id -> status (PRESENT, ABSENT, RECOVERY, SUSPENDED)
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

  // Filtrar clases del dia seleccionado
  const clasesDelDia = clases.filter((c) => c.day_of_week === selectedDay);

  // Metricas del dia
  const totalLugaresOcupados = clasesDelDia.reduce((acc, c) => acc + (c.alumnas_count || 0), 0);
  const totalCapacidadDia = clasesDelDia.reduce((acc, c) => acc + (c.max_capacity || 6), 0);

  // Contar asistencias del día
  const presentesCount = Object.values(asistencias).filter(s => s === 'PRESENT').length;
  const ausentesCount = Object.values(asistencias).filter(s => s === 'ABSENT').length;
  const recuperacionesCount = Object.values(asistencias).filter(s => s === 'RECOVERY').length;

  // Mapear matriz por hora y camilla (1 a 6)
  const matrizHorarios = HORARIOS_ESTANDAR.map((hora) => {
    const claseEnHora = clasesDelDia.find((c) => c.start_time.startsWith(hora));
    
    // Obtener alumnas asignadas con su camilla
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
          const camillaNum = item.camilla || (idx + 1);
          if (camillaNum >= 1 && camillaNum <= 6) {
            camillasMap[camillaNum] = {
              alumna: item.alumna || item,
              caId: item.id || `ca-${idx}`,
            };
          }
        });
      }
    }

    return {
      hora,
      clase: claseEnHora || null,
      camillasMap,
    };
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-[var(--text-primary)]">
      {/* 1. Selector de Dia y Fecha de Asistencia */}
      <Card className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-[var(--border-default)]">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {DIAS.map((d) => (
            <button
              key={d.value}
              onClick={() => onSelectDay(d.value)}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedDay === d.value
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-sm'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-default)]">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Fecha de asistencia:</span>
          <input
            type="date"
            value={fechaAsistencia}
            onChange={(e) => setFechaAsistencia(e.target.value)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] cursor-pointer"
          />
        </div>
      </Card>

      {/* 2. Tarjetas Metricas del Dia (UBICADAS JUSTO ENCIMA DE LA MATRIZ) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-semibold">Turnos ocupados</span>
          <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] my-1">{totalLugaresOcupados}</p>
          <span className="text-[10px] text-[var(--text-muted)]">de {totalCapacidadDia || 72} lugares del día</span>
        </Card>

        <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-semibold">Presentes hoy</span>
          <p className="text-xl sm:text-2xl font-black text-[var(--color-success)] my-1">{presentesCount}</p>
          <span className="text-[10px] text-[var(--text-muted)] truncate">{fechaAsistencia}</span>
        </Card>

        <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-semibold">Ausentes</span>
          <p className="text-xl sm:text-2xl font-black text-red-400 my-1">{ausentesCount}</p>
          <span className="text-[10px] text-[var(--text-muted)] truncate">{fechaAsistencia}</span>
        </Card>

        <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-semibold">Recuperaciones</span>
          <p className="text-xl sm:text-2xl font-black text-[var(--color-wood)] my-1">{recuperacionesCount}</p>
          <span className="text-[10px] text-[var(--text-muted)] truncate">{fechaAsistencia}</span>
        </Card>
      </div>

      {/* 3. Matriz por Reformer (Reformer 1 a Reformer 6) */}
      <Card className="p-3.5 sm:p-5 flex flex-col gap-4 border-[var(--border-default)] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-default)] pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--color-wood)]" /> Matriz por Reformer &bull; {DIAS.find(d => d.value === selectedDay)?.label}
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-0.5">
              Toca un lugar vacio para asignar una alumna o marcar asistencia
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)]" /> Disponible</span>
            <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[var(--color-wood)]" /> Sin marcar</span>
            <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[var(--color-success)]" /> Presente</span>
            <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-red-500" /> Ausente</span>
          </div>
        </div>

        {/* Tabla Matriz Reformer */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-center text-xs border-collapse min-w-[840px]">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-20 text-left">Hora</th>
                <th className="py-3 px-2 min-w-[140px]">Reformer 1</th>
                <th className="py-3 px-2 min-w-[140px]">Reformer 2</th>
                <th className="py-3 px-2 min-w-[140px]">Reformer 3</th>
                <th className="py-3 px-2 min-w-[140px]">Reformer 4</th>
                <th className="py-3 px-2 min-w-[140px]">Reformer 5</th>
                <th className="py-3 px-2 min-w-[140px]">Reformer 6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {matrizHorarios.map((row) => (
                <tr key={row.hora} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-extrabold text-left text-[var(--color-wood)]">
                    {row.hora} hs
                  </td>

                  {[1, 2, 3, 4, 5, 6].map((refNum) => {
                    const item = row.camillasMap[refNum];

                    if (item && item.alumna) {
                      const alumnaNombre = `${item.alumna.first_name || ''} ${item.alumna.last_name || ''}`.trim() || 'Alumna';

                      return (
                        <td key={refNum} className="p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectOccupiedSlot) {
                                onSelectOccupiedSlot(selectedDay, row.hora, refNum, item, row.clase);
                              } else if (row.clase) {
                                onSelectClase(row.clase);
                              }
                            }}
                            className="w-full p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)]/20 border border-[var(--border-default)] hover:border-[var(--color-wood)]/50 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[54px]"
                          >

                            <span className="font-bold text-[var(--text-primary)] capitalize text-[11px] truncate block">
                              {alumnaNombre.toLowerCase()}
                            </span>
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1">
                              {(() => {
                                const caId = item.caId;
                                const status = asistencias[caId];
                                if (status === 'PRESENT') {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-semibold">
                                      ✓ Presente
                                    </span>
                                  );
                                } else if (status === 'ABSENT') {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 font-semibold">
                                      ✗ Ausente
                                    </span>
                                  );
                                } else if (status === 'RECOVERY') {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-semibold">
                                      ↻ Recupera
                                    </span>
                                  );
                                } else if (status === 'SUSPENDED') {
                                  return (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-semibold">
                                      ⏸ Suspendida
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-wood)]/20 text-[var(--color-wood)] font-semibold">
                                    Sin marcar
                                  </span>
                                );
                              })()}
                              {item.alumna.phone && (
                                <span className="font-mono text-[9px] truncate max-w-[70px]">
                                  {item.alumna.phone.slice(-6)}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    }

                    // Casillero Vacio Disponible
                    return (
                      <td key={refNum} className="p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.clase && onOpenAssignModal) {
                              onOpenAssignModal(row.clase, refNum);
                            } else if (onSelectEmptySlot) {
                              onSelectEmptySlot(selectedDay, row.hora, refNum);
                            }

                          }}
                          className="w-full p-2 rounded-xl bg-[var(--bg-tertiary)]/40 hover:bg-[var(--color-wood)]/10 border border-dashed border-[var(--border-default)] hover:border-[var(--color-wood)] text-[var(--text-muted)] hover:text-[var(--color-wood)] transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[54px]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold">Disponible</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
