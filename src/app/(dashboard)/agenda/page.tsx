'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GoogleCalendarGrid } from '@/components/agenda/GoogleCalendarGrid';
import { ReformerMatrixView } from '@/components/agenda/ReformerMatrixView';
import { ClaseFormModal } from '@/components/agenda/ClaseFormModal';
import { ClaseDetailModal } from '@/components/agenda/ClaseDetailModal';
import { AsignarAlumnaModal } from '@/components/agenda/AsignarAlumnaModal';
import { Clase, Profile } from '@/types/database';
import { getClases, createClase, addAlumnaToClase, removeAlumnaFromClase, deleteClase } from '@/lib/services/agenda';
import { getProfiles } from '@/lib/services/profesoras';
import { Calendar, Plus, UserCheck, LayoutGrid, CalendarDays, BedDouble } from 'lucide-react';

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<'WEEK' | 'DAY' | 'REFORMER'>('REFORMER');
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
  const [presetDay, setPresetDay] = useState<number>(1);
  const [presetTime, setPresetTime] = useState<string>('08:00');
  const [presetCamilla, setPresetCamilla] = useState<number>(1);
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

  const handleAssignAlumna = async (claseId: string, alumnaId: string, camilla?: number): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await addAlumnaToClase(claseId, alumnaId, camilla || presetCamilla);
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

  const handleDeleteClase = async (claseId: string) => {
    const { error } = await deleteClase(claseId);
    if (error) {
      alert(`Error al eliminar el turno: ${error}`);
    } else {
      fetchAgenda();
      setIsDetailModalOpen(false);
    }
  };

  const handleSelectEmptySlot = async (dayOfWeek: number, startTime: string, camilla = 1) => {
    let targetClase = clases.find((c) => c.day_of_week === dayOfWeek && c.start_time.startsWith(startTime));

    if (!targetClase) {
      const endHourNum = parseInt(startTime.split(':')[0], 10) + 1;
      const endTime = `${endHourNum < 10 ? '0' : ''}${endHourNum}:00`;

      const { data: newClase } = await createClase({
        name: `Turno ${startTime}`,
        profesora_id: null,
        day_of_week: dayOfWeek,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        max_capacity: 6,
      });

      if (newClase) {
        targetClase = newClase;
        fetchAgenda();
      }
    }

    if (targetClase) {
      setSelectedClase(targetClase);
      setPresetDay(dayOfWeek);
      setPresetTime(startTime);
      setPresetCamilla(camilla);
      setIsAssignModalOpen(true);
    }
  };

  const handleSelectClaseBlock = (clase: Clase) => {
    setSelectedClase(clase);
    setIsDetailModalOpen(true);
  };

  const currentDayLabel = DIAS.find((d) => d.value === presetDay)?.label || 'Lunes';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[var(--color-wood)]" /> Agenda y Asistencia por Turnos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Organización semanal por horario y Reformer. Alterna entre la vista por Reformer, vista semanal y vista diaria.
          </p>
        </div>

        <Button
          onClick={() => {
            setPresetDay(1);
            setPresetTime('08:00');
            setIsClaseModalOpen(true);
          }}
          icon={<Plus className="h-4 w-4" />}
        >
          Nuevo Turno
        </Button>
      </div>

      {/* Barra de Controles y Vistas */}
      <Card className="p-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Vistas: Reformer vs Semanal vs Diaria */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)]">
            <button
              onClick={() => setViewMode('REFORMER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'REFORMER'
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" /> Vista por Reformer
            </button>

            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'WEEK'
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Vista Semanal
            </button>

            <button
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Vista Diaria
            </button>
          </div>

          {/* Selector de Dia en modo Vista Diaria */}
          {viewMode === 'DAY' && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {DIAS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDay(d.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 shrink-0 font-medium">
            <UserCheck className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Profesora:
          </span>
          <select
            value={profesoraFilter}
            onChange={(e) => setProfesoraFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] font-medium cursor-pointer"
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

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Contenido de la vista elegida */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando agenda de clases...</p>
        </div>
      ) : viewMode === 'REFORMER' ? (
        <ReformerMatrixView
          clases={clases}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onSelectClase={handleSelectClaseBlock}
          onSelectEmptySlot={handleSelectEmptySlot}
          onOpenAssignModal={(c, camilla = 1) => {
            setSelectedClase(c);
            setPresetDay(c.day_of_week);
            setPresetTime(c.start_time.slice(0, 5));
            setPresetCamilla(camilla);
            setIsAssignModalOpen(true);
          }}
        />
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
        onDeleteClase={handleDeleteClase}
      />

      <AsignarAlumnaModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignAlumna}
        clase={selectedClase}
        dayName={currentDayLabel}
        presetTime={presetTime}
        presetCamilla={presetCamilla}
        loading={submitting}
      />
    </div>
  );
}
