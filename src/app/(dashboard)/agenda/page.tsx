'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GoogleCalendarGrid } from '@/components/agenda/GoogleCalendarGrid';
import { ClaseFormModal } from '@/components/agenda/ClaseFormModal';
import { ClaseDetailModal } from '@/components/agenda/ClaseDetailModal';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { Clase, Profile } from '@/types/database';
import { getClases, createClase, addAlumnaToClase, removeAlumnaFromClase } from '@/lib/services/agenda';
import { getProfiles } from '@/lib/services/profesoras';
import { Calendar, Plus, Filter, UserCheck, LayoutGrid, CalendarDays } from 'lucide-react';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<'WEEK' | 'DAY'>('WEEK');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [profesoraFilter, setProfesoraFilter] = useState<string>('ALL');

  const [clases, setClases] = useState<Clase[]>([]);
  const [profesoras, setProfesoras] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modales
  const [isClaseModalOpen, setIsClaseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [presetDay, setPresetDay] = useState<number | undefined>(undefined);
  const [presetTime, setPresetTime] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data: clasesData, error: clasesErr } = await getClases({
      profesoraId: profesoraFilter !== 'ALL' ? profesoraFilter : undefined,
    });
    const { data: profsData } = await getProfiles({ role: 'ALL' });

    if (clasesErr) {
      setErrorMsg(clasesErr);
    } else {
      setClases(clasesData);
    }
    setProfesoras(profsData);
    setLoading(false);
  }, [profesoraFilter]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const handleCreateClase = async (data: {
    name: string;
    profesora_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number;
  }): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await createClase(data);
    setSubmitting(false);

    if (error) {
      alert(`Error al crear la clase: ${error}`);
      return false;
    }

    fetchAgenda();
    return true;
  };

  const handleAssignAlumna = async (claseId: string, alumnaId: string): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await addAlumnaToClase(claseId, alumnaId);
    setSubmitting(false);

    if (error) {
      alert(error);
      return false;
    }

    fetchAgenda();
    return true;
  };

  const handleRemoveAlumna = async (claseId: string, alumnaId: string, nombreAlumna: string) => {
    if (!confirm(`¿Remover a ${nombreAlumna} de este turno?`)) return;
    const { error } = await removeAlumnaFromClase(claseId, alumnaId);
    if (error) {
      alert(error);
    } else {
      fetchAgenda();
      if (selectedClase) {
        setIsDetailModalOpen(false);
      }
    }
  };

  const handleSelectEmptySlot = (dayOfWeek: number, startTime: string) => {
    setPresetDay(dayOfWeek);
    setPresetTime(startTime);
    setIsClaseModalOpen(true);
  };

  const handleSelectClaseBlock = (clase: Clase) => {
    setSelectedClase(clase);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[var(--color-wood)]" /> Agenda de Clases y Turnos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Calendario interactivo con grilla horaria. Haz clic en un casillero vacío para crear un turno o sobre una clase para gestionarla.
          </p>
        </div>

        <Button
          onClick={() => {
            setPresetDay(undefined);
            setPresetTime(undefined);
            setIsClaseModalOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
        >
          Nuevo Turno
        </Button>
      </div>

      {/* Barra de Controles y Vistas */}
      <Card className="p-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Vistas Semanal vs Diaria */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-md border border-[var(--border-default)]">
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'WEEK'
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Vista Semanal
            </button>
            <button
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Vista Diaria
            </button>
          </div>

          {/* Días selector if Day mode */}
          {viewMode === 'DAY' && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {DIAS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDay(d.value)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedDay === d.value
                      ? 'bg-[var(--color-wood)]/20 text-[var(--color-wood)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtro por Profesora */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 shrink-0">
            <UserCheck className="h-3.5 w-3.5" /> Profesora:
          </span>
          <select
            value={profesoraFilter}
            onChange={(e) => setProfesoraFilter(e.target.value)}
            className="h-8 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
          >
            <option value="ALL">Todas las profesoras</option>
            {profesoras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Leyenda de Capacidad */}
      <div className="flex items-center gap-4 px-1 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--color-warning-soft)] border border-[var(--color-warning)]" /> Disponibilidad alta (&lt; 4 alumnas)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--color-success-soft)] border border-[var(--color-success)]" /> Cupo óptimo (4-5 alumnas)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[var(--color-wood)]/20 border border-[var(--color-wood)]" /> Turno Lleno (6 alumnas)
        </span>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-md bg-[var(--color-danger-soft)] text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Grilla Google Calendar */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando grilla interactiva...</p>
        </div>
      ) : (
        <GoogleCalendarGrid
          clases={clases}
          viewMode={viewMode}
          selectedDay={selectedDay}
          onSelectClase={handleSelectClaseBlock}
          onSelectEmptySlot={handleSelectEmptySlot}
        />
      )}

      {/* Modales */}
      <ClaseFormModal
        open={isClaseModalOpen}
        onClose={() => setIsClaseModalOpen(false)}
        onSubmit={handleCreateClase}
        profesoras={profesoras}
        initialDayOfWeek={presetDay}
        initialStartTime={presetTime}
        loading={submitting}
      />

      <ClaseDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        clase={selectedClase}
        onOpenAssignModal={(c) => {
          setSelectedClase(c);
          setIsAssignModalOpen(true);
        }}
        onRemoveAlumna={handleRemoveAlumna}
      />

      <AsignarAlumnaModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignAlumna}
        clase={selectedClase}
        loading={submitting}
      />
    </div>
  );
}
