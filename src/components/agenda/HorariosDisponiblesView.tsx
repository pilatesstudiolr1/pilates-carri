'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Clase } from '@/types/database';
import {
  Clock,
  Copy,
  Check,
  Calendar,
  BedDouble,
  User,
  Plus,
  Sparkles,
  ArrowRight,
  SunMedium,
  Moon,
} from 'lucide-react';

interface HorariosDisponiblesViewProps {
  clases: Clase[];
  onSelectSlot?: (dayOfWeek: number, startTime: string, camillaLibre?: number) => void;
  sedeNombre?: string;
}

const DIAS_CONFIG = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

const HORARIOS_STANDARD = [
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

function getTodayDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 1 : Math.min(day, 6);
}

export function HorariosDisponiblesView({
  clases,
  onSelectSlot,
  sedeNombre = 'Pilates Studio',
}: HorariosDisponiblesViewProps) {
  const [selectedDay, setSelectedDay] = useState<number>(getTodayDayOfWeek);
  const [copiedDay, setCopiedDay] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [filtroTurno, setFiltroTurno] = useState<'TODOS' | 'MANANA' | 'TARDE'>('TODOS');

  // Procesar disponibilidad por día y por horario
  const disponibilidadPorDia = useMemo(() => {
    return DIAS_CONFIG.map((dia) => {
      const clasesDelDia = clases.filter((c) => c.day_of_week === dia.value);

      const slots = HORARIOS_STANDARD.map((hora) => {
        const claseEnHora = clasesDelDia.find(
          (c) => c.start_time.startsWith(hora) || c.start_time.slice(0, 5) === hora
        );

        const maxCap = claseEnHora?.max_capacity || 6;
        const inscripciones = claseEnHora?.alumnas || [];

        // Calcular camillas ocupadas
        const ocupadasSet = new Set<number>();
        if (Array.isArray(inscripciones)) {
          inscripciones.forEach((item: any, idx: number) => {
            const camillaNum = item.camilla || idx + 1;
            if (camillaNum >= 1 && camillaNum <= maxCap) {
              ocupadasSet.add(camillaNum);
            }
          });
        }

        const libresCamillas: number[] = [];
        for (let i = 1; i <= maxCap; i++) {
          if (!ocupadasSet.has(i)) {
            libresCamillas.push(i);
          }
        }

        const horaNum = parseInt(hora.split(':')[0], 10);
        const esManana = horaNum < 14;

        // Nombre de la profesora asignada
        const profObj = claseEnHora?.profesora as any;
        const profName = profObj?.full_name || [profObj?.first_name, profObj?.last_name].filter(Boolean).join(' ') || null;

        return {
          hora,
          clase: claseEnHora || null,
          libresCount: libresCamillas.length,
          camillasLibres: libresCamillas,
          maxCap,
          esManana,
          profName,
        };
      }).filter((slot) => slot.libresCount > 0);

      const totalLibresDia = slots.reduce((acc, s) => acc + s.libresCount, 0);

      return {
        dayValue: dia.value,
        dayLabel: dia.label,
        dayShort: dia.short,
        slots,
        totalLibresDia,
      };
    });
  }, [clases]);

  const diaActualInfo = useMemo(() => {
    return disponibilidadPorDia.find((d) => d.dayValue === selectedDay) || disponibilidadPorDia[0];
  }, [disponibilidadPorDia, selectedDay]);

  const slotsFiltrados = useMemo(() => {
    if (!diaActualInfo) return [];
    if (filtroTurno === 'MANANA') return diaActualInfo.slots.filter((s) => s.esManana);
    if (filtroTurno === 'TARDE') return diaActualInfo.slots.filter((s) => !s.esManana);
    return diaActualInfo.slots;
  }, [diaActualInfo, filtroTurno]);

  const totalLibresSemana = useMemo(() => {
    return disponibilidadPorDia.reduce((acc, d) => acc + d.totalLibresDia, 0);
  }, [disponibilidadPorDia]);

  // Copiar disponibilidad del día seleccionado para WhatsApp
  const handleCopiarWhatsAppDia = async () => {
    if (!diaActualInfo) return;
    try {
      let texto = `✨ *Turnos disponibles para ${diaActualInfo.dayLabel} - ${sedeNombre}* ✨\n\n`;
      if (diaActualInfo.slots.length === 0) {
        texto += `_No quedan turnos disponibles para este día._\n`;
      } else {
        diaActualInfo.slots.forEach((s) => {
          const lugares = s.libresCount === 1 ? '1 lugar libre' : `${s.libresCount} lugares libres`;
          const profeStr = s.profName ? ` (Profe ${s.profName})` : '';
          texto += `• *${s.hora} hs* ➔ ${lugares}${profeStr}\n`;
        });
      }
      texto += `\n💬 _Respondé este mensaje para reservar tu lugar._`;
      await navigator.clipboard.writeText(texto);
      setCopiedDay(true);
      setTimeout(() => setCopiedDay(false), 2500);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Copiar toda la semana
  const handleCopiarWhatsAppSemana = async () => {
    try {
      let texto = `✨ *Horarios disponibles para ofrecer - ${sedeNombre}* ✨\n_Lugares actualizados en tiempo real:_\n\n`;
      disponibilidadPorDia.forEach((dia) => {
        if (dia.slots.length > 0) {
          texto += `📅 *${dia.dayLabel.toUpperCase()}:*\n`;
          dia.slots.forEach((s) => {
            const lugares = s.libresCount === 1 ? '1 lugar' : `${s.libresCount} lugares`;
            texto += `  • *${s.hora} hs* ➔ ${lugares}\n`;
          });
          texto += `\n`;
        }
      });
      texto += `💬 _Escribinos para reservar tu reformer y coordinar tu clase de prueba o mensualidad._`;
      await navigator.clipboard.writeText(texto);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in text-[var(--text-primary)]">
      {/* 1. Header Principal y Resumen de Cupos */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#cdface] text-[#001f1f] text-[11px] font-black uppercase tracking-wider border border-[#001f1f] shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#001f1f] animate-pulse" />
              {sedeNombre}
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              &bull; {totalLibresSemana} lugares libres en toda la semana
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Turnos Disponibles
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleCopiarWhatsAppDia}
            variant="outline"
            size="sm"
            className="border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold text-xs"
            icon={copiedDay ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          >
            {copiedDay ? '¡Copiado!' : `Copiar ${diaActualInfo?.dayLabel}`}
          </Button>

          <Button
            onClick={handleCopiarWhatsAppSemana}
            variant="secondary"
            size="sm"
            className="font-bold text-xs"
            icon={copiedAll ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          >
            {copiedAll ? '¡Semana Copiada!' : 'Copiar Toda la Semana'}
          </Button>
        </div>
      </div>

      {/* 2. PASO 1: Selector de Día Prominente */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>Paso 1: Seleccioná el día que querés ver</span>
          </label>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Día seleccionado: <strong className="text-[var(--text-primary)]">{diaActualInfo?.dayLabel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {disponibilidadPorDia.map((d) => {
            const isSelected = selectedDay === d.dayValue;
            const tieneLugares = d.totalLibresDia > 0;

            return (
              <button
                key={d.dayValue}
                type="button"
                onClick={() => setSelectedDay(d.dayValue)}
                className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 border-2 text-center relative ${
                  isSelected
                    ? 'bg-[#001f1f] text-white border-[#001f1f] shadow-md dark:bg-emerald-700 dark:border-emerald-600 ring-2 ring-[#001f1f]/20'
                    : tieneLugares
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-[#001f1f] hover:bg-[var(--bg-tertiary)]'
                    : 'bg-[var(--bg-primary)]/50 text-[var(--text-muted)] border-[var(--border-default)]/60 opacity-60'
                }`}
              >
                <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  {d.dayLabel}
                </span>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-black ${
                    isSelected
                      ? 'bg-[#cdface] text-[#001f1f] border border-[#001f1f]/30'
                      : tieneLugares
                      ? 'bg-[#cdface]/60 dark:bg-emerald-950/50 text-[#001f1f] dark:text-emerald-300 border border-emerald-600/30'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {tieneLugares ? `${d.totalLibresDia} libres` : 'Completo'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PASO 2: Listado Vertical de Turnos Disponibles para el Día Seleccionado */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Paso 2: Turnos disponibles del {diaActualInfo?.dayLabel}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Hacé clic en <strong>"Asignar turno"</strong> para seleccionar una alumna existente o crear una nueva directamente.
            </p>
          </div>

          {/* Filtro Mañana / Tarde */}
          <div className="flex items-center bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-default)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFiltroTurno('TODOS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtroTurno === 'TODOS'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroTurno('MANANA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filtroTurno === 'MANANA'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SunMedium className="h-3 w-3 text-amber-500" /> Mañana
            </button>
            <button
              type="button"
              onClick={() => setFiltroTurno('TARDE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filtroTurno === 'TARDE'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="h-3 w-3 text-indigo-400" /> Tarde
            </button>
          </div>
        </div>

        {/* Listado Vertical */}
        {slotsFiltrados.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#cdface]/30 text-[#001f1f] dark:text-emerald-300 flex items-center justify-center">
              <Clock className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              No hay turnos disponibles para los filtros seleccionados.
            </p>

            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              Podés seleccionar otro día en el Paso 1 para ver los horarios con lugares libres.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {slotsFiltrados.map((slot) => {
              const primerCamillaLibre = slot.camillasLibres[0] || 1;
              const cuposText =
                slot.libresCount === 1
                  ? '1 reformer libre'
                  : `${slot.libresCount} de ${slot.maxCap} reformers libres`;

              return (
                <div
                  key={slot.hora}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border-default)] hover:border-[#001f1f] dark:hover:border-emerald-500 transition-all gap-4 shadow-xs group"
                >
                  {/* Bloque Izquierdo: Hora y Profesora */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#cdface]/40 border border-[#001f1f]/20 text-[#001f1f] dark:bg-emerald-950/40 dark:text-emerald-300 flex flex-col items-center justify-center shrink-0 font-bold">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-black font-mono mt-0.5">{slot.hora}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">
                          Turno {slot.hora} hs
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#cdface] text-[#001f1f] border border-[#001f1f]/25 shadow-2xs">
                          {cuposText}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)] flex-wrap">
                        {slot.profName ? (
                          <span className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                            <User className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                            Profe {slot.profName}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">Sin profesora asignada</span>
                        )}

                        <span className="text-[var(--text-muted)]">&bull;</span>

                        <span className="flex items-center gap-1 font-medium">
                          <BedDouble className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          Reformers libres: #{slot.camillasLibres.join(', #')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque Derecho: Botón Directo Asignar Turno */}
                  <div className="flex items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectSlot) {
                          onSelectSlot(selectedDay, slot.hora, primerCamillaLibre);
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#001f1f] hover:bg-[#003333] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Asignar turno</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
