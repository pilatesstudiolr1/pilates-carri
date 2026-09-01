'use client';

import { Clase } from '@/types/database';
import { Clock, Plus, UserCheck, Users } from 'lucide-react';
import { useMemo } from 'react';

interface GoogleCalendarGridProps {
  clases: Clase[];
  viewMode: 'WEEK' | 'DAY';
  selectedDay: number;
  onSelectClase: (clase: Clase) => void;
  onSelectEmptySlot: (dayOfWeek: number, startTime: string) => void;
}

const DAYS_HEADER = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00',
];

export function GoogleCalendarGrid({
  clases,
  viewMode,
  selectedDay,
  onSelectClase,
  onSelectEmptySlot,
}: GoogleCalendarGridProps) {
  const visibleDays = useMemo(() => {
    if (viewMode === 'DAY') {
      return DAYS_HEADER.filter((d) => d.value === selectedDay);
    }
    return DAYS_HEADER;
  }, [viewMode, selectedDay]);

  // Index clases by "dayOfWeek-hour"
  const clasesMap = useMemo(() => {
    const map: Record<string, Clase[]> = {};
    clases.forEach((clase) => {
      const hourPrefix = clase.start_time.slice(0, 2) + ':00';
      const key = `${clase.day_of_week}-${hourPrefix}`;
      if (!map[key]) map[key] = [];
      map[key].push(clase);
    });
    return map;
  }, [clases]);

  return (
    <div className="w-full overflow-x-auto border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] shadow-sm">
      <div className="min-w-[700px]">
        {/* Days Header */}
        <div
          className="grid border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]"
          style={{
            gridTemplateColumns: `60px repeat(${visibleDays.length}, 1fr)`,
          }}
        >
          <div className="p-3 border-r border-[var(--border-default)] text-center text-xs font-semibold text-[var(--text-muted)]">
            Hora
          </div>
          {visibleDays.map((day) => (
            <div
              key={day.value}
              className="p-3 border-r border-[var(--border-default)] last:border-r-0 text-center font-bold text-xs text-[var(--text-primary)]"
            >
              {day.label}
            </div>
          ))}
        </div>

        {/* Hours & Slots Grid */}
        <div className="divide-y divide-[var(--border-default)]">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid min-h-[72px]"
              style={{
                gridTemplateColumns: `60px repeat(${visibleDays.length}, 1fr)`,
              }}
            >
              {/* Hour Label Column */}
              <div className="p-2 border-r border-[var(--border-default)] text-center text-[11px] font-medium text-[var(--text-muted)] select-none">
                {hour}
              </div>

              {/* Day Cell Columns */}
              {visibleDays.map((day) => {
                const key = `${day.value}-${hour}`;
                const cellClases = clasesMap[key] || [];

                return (
                  <div
                    key={day.value}
                    onClick={() => {
                      if (cellClases.length === 0) {
                        onSelectEmptySlot(day.value, hour);
                      }
                    }}
                    className="p-1.5 border-r border-[var(--border-default)] last:border-r-0 relative group hover:bg-[var(--bg-tertiary)]/40 transition-colors cursor-pointer flex flex-col gap-1.5"
                  >
                    {cellClases.length === 0 ? (
                      <div className="hidden group-hover:flex items-center justify-center h-full text-[11px] text-[var(--color-wood)] font-medium gap-1">
                        <Plus className="h-3.5 w-3.5" /> Agregar
                      </div>
                    ) : (
                      cellClases.map((clase) => {
                        const count = clase.alumnas_count || 0;
                        const isFull = count >= clase.max_capacity;

                        return (
                          <div
                            key={clase.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClase(clase);
                            }}
                            className={`p-2 rounded-md border text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between ${
                              isFull
                                ? 'bg-[var(--color-wood)]/20 border-[var(--color-wood)] text-[var(--text-primary)]'
                                : count >= 4
                                ? 'bg-[var(--color-success-soft)] border-[var(--color-success)]/40 text-[var(--text-primary)]'
                                : 'bg-[var(--color-warning-soft)] border-[var(--color-warning)]/40 text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold truncate text-[11px]">{clase.name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--bg-secondary)]/80 shrink-0">
                                {count}/{clase.max_capacity}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                              <span className="truncate flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-[var(--color-wood)]" />
                                {clase.profesora?.full_name ? clase.profesora.full_name.split(' ')[0] : 'Profe'}
                              </span>
                              <span className="font-semibold text-[10px]">{clase.start_time.slice(0, 5)} hs</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
