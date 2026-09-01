'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alumna, Clase } from '@/types/database';
import { getClasesConAlumnas } from '@/lib/services/agenda';
import { DIAS_MAP } from '@/lib/constants';
import { Calendar, BedDouble, CheckCircle2, Clock, Users } from 'lucide-react';

interface AsignarTurnoFijoModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumna: Alumna | null;
  onAssign: (claseId: string, alumnaId: string, camilla?: number | null) => Promise<boolean>;
  loading?: boolean;
}

export function AsignarTurnoFijoModal({
  isOpen,
  onClose,
  alumna,
  onAssign,
  loading = false,
}: AsignarTurnoFijoModalProps) {
  const [clases, setClases] = useState<Clase[]>([]);
  const [loadingClases, setLoadingClases] = useState(true);
  const [selectedClaseId, setSelectedClaseId] = useState('');
  const [selectedCamilla, setSelectedCamilla] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [filterDia, setFilterDia] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    if (isOpen) {
      setSelectedClaseId('');
      setSelectedCamilla('');
      setErrorMsg('');
      fetchClases();
    }
  }, [isOpen]);

  const fetchClases = async () => {
    setLoadingClases(true);
    const { data } = await getClasesConAlumnas();
    setClases(data);
    setLoadingClases(false);
  };

  const claseSeleccionada = clases.find((c) => c.id === selectedClaseId);
  const maxCamillas = claseSeleccionada?.sede?.max_camillas || claseSeleccionada?.max_capacity || 6;

  // Camillas ya ocupadas en el turno seleccionado
  const camillaOcupadas = claseSeleccionada?.alumnas
    ?.map((ca: any) => ca.camilla)
    .filter(Boolean) || [];

  const clasesFiltradas = filterDia === 'ALL'
    ? clases
    : clases.filter((c) => c.day_of_week === filterDia);

  // Dias disponibles en las clases
  const diasDisponibles = [...new Set(clases.map((c) => c.day_of_week))].sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!alumna) return;
    if (!selectedClaseId) {
      setErrorMsg('Debes seleccionar un turno');
      return;
    }

    const camilla = selectedCamilla !== '' ? Number(selectedCamilla) : null;
    const success = await onAssign(selectedClaseId, alumna.id, camilla);
    if (success) {
      onClose();
    }
  };

  if (!alumna) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Turno Fijo"
      description={`Asigna ${alumna.first_name} ${alumna.last_name} a un turno recurrente con camilla`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Info de la alumna */}
        <div className="p-3 rounded-md bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/30 flex items-center gap-3 text-xs">
          <div className="w-8 h-8 rounded-full bg-[var(--color-wood)]/20 flex items-center justify-center text-[var(--color-wood)] font-bold text-sm shrink-0">
            {alumna.first_name[0]}{(alumna.last_name || '')[0] || ''}
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">{alumna.first_name} {alumna.last_name}</p>
            <p className="text-[var(--text-muted)]">DNI: {alumna.dni} &bull; {alumna.plan || 'Sin plan asignado'}</p>
          </div>
        </div>

        {/* Filtro por dia */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Filtrar por dia
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterDia('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterDia === 'ALL'
                  ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todos
            </button>
            {diasDisponibles.map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => setFilterDia(dia)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterDia === dia
                    ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {DIAS_MAP[dia]}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de turnos disponibles */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Seleccionar Turno *</p>
          {loadingClases ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-[var(--text-muted)]">Cargando turnos...</span>
            </div>
          ) : clasesFiltradas.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-[var(--border-default)] rounded-md">
              No hay turnos disponibles para el dia seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {clasesFiltradas.map((clase) => {
                const ocupacion = clase.alumnas_count || 0;
                const isFull = ocupacion >= clase.max_capacity;
                const isSelected = selectedClaseId === clase.id;

                return (
                  <button
                    key={clase.id}
                    type="button"
                    disabled={isFull}
                    onClick={() => {
                      setSelectedClaseId(clase.id);
                      setSelectedCamilla('');
                    }}
                    className={`p-3 rounded-md border text-left transition-all cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-[var(--color-wood)] bg-[var(--color-wood)]/15'
                        : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--text-primary)]">{clase.name}</span>
                      <Badge variant={isFull ? 'danger' : ocupacion >= 4 ? 'success' : 'warning'}>
                        {ocupacion}/{clase.max_capacity}
                      </Badge>
                    </div>
                    <div className="text-[var(--text-muted)] space-y-0.5">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {DIAS_MAP[clase.day_of_week]}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {clase.start_time.slice(0, 5)} - {clase.end_time.slice(0, 5)} hs
                      </p>
                      {clase.profesora && (
                        <p className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {clase.profesora.full_name}
                        </p>
                      )}
                    </div>
                    {isFull && <p className="text-[var(--color-danger)] text-[10px] font-semibold mt-1">Cupo lleno</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selector de camilla (solo si hay turno seleccionado) */}
        {claseSeleccionada && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Asignar Reformer Disponible
              <span className="text-[var(--text-muted)] font-normal">— Solo se muestran las camillas libres</span>
            </p>
            {(() => {
              const camillasDisponibles = Array.from({ length: maxCamillas }, (_, i) => i + 1)
                .filter((num) => !camillaOcupadas.includes(num));

              if (camillasDisponibles.length === 0) {
                return (
                  <p className="text-xs text-rose-500 font-bold bg-rose-500/10 p-3 rounded-lg border border-rose-500/30">
                    ⚠️ No hay reformers disponibles en este turno. Todos están ocupados.
                  </p>
                );
              }

              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedCamilla('')}
                    className={`px-3 h-10 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                      selectedCamilla === ''
                        ? 'border-[var(--color-wood)] bg-[var(--color-wood)]/20 text-[var(--color-wood)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                    }`}
                  >
                    Sin camilla fija
                  </button>
                  {camillasDisponibles.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedCamilla(num)}
                      className={`px-3.5 h-10 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                        selectedCamilla === num
                          ? 'border-[var(--color-wood)] bg-[var(--color-wood)] text-[var(--color-dark)] shadow-sm'
                          : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--color-wood)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Reformer {num}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!selectedClaseId}
            icon={<CheckCircle2 className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            Asignar Turno Fijo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
