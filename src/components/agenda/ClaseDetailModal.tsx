'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Clase } from '@/types/database';
import { Clock, UserCheck, MapPin, Plus, UserX, CheckCircle, XCircle, Users } from 'lucide-react';

interface ClaseDetailModalProps {
  open: boolean;
  onClose: () => void;
  clase: Clase | null;
  onOpenAssignModal: (clase: Clase) => void;
  onRemoveAlumna: (claseId: string, alumnaId: string, nombreAlumna: string) => Promise<void>;
}

export function ClaseDetailModal({
  open,
  onClose,
  clase,
  onOpenAssignModal,
  onRemoveAlumna,
}: ClaseDetailModalProps) {
  const [asistencias, setAsistencias] = useState<Record<string, boolean>>({});

  if (!clase) return null;

  const count = clase.alumnas_count || 0;
  const isFull = count >= clase.max_capacity;

  const toggleAsistencia = (alumnaId: string) => {
    setAsistencias((prev) => ({
      ...prev,
      [alumnaId]: !prev[alumnaId],
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={clase.name}
      description={`Horario: ${clase.start_time.slice(0, 5)} - ${clase.end_time.slice(0, 5)} hs`}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {/* Cabecera Info */}
        <div className="p-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-between text-xs">
          <div className="space-y-1">
            <p className="text-[var(--text-primary)] font-semibold flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Profesora: {clase.profesora?.full_name || 'Sin asignación'}
            </p>
            <p className="text-[var(--text-muted)] flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Sede Principal - La Rioja
            </p>
          </div>

          <Badge variant={isFull ? 'danger' : count >= 4 ? 'success' : 'warning'}>
            {count} / {clase.max_capacity} Alumnas
          </Badge>
        </div>

        {/* Lista de Alumnas Inscriptas y Asistencia */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Alumnas Inscriptas ({count}/{clase.max_capacity})
            </h3>

            <Button
              size="sm"
              variant="outline"
              disabled={isFull}
              onClick={() => {
                onClose();
                onOpenAssignModal(clase);
              }}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              {isFull ? 'Cupo Lleno' : 'Agregar Alumna'}
            </Button>
          </div>

          {!clase.alumnas || clase.alumnas.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] rounded-md border border-[var(--border-default)]">
              No hay alumnas registradas en este turno aún.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-md overflow-hidden">
              {clase.alumnas.map((alumna) => {
                const isPresent = asistencias[alumna.id] ?? true;

                return (
                  <div
                    key={alumna.id}
                    className="p-3 flex items-center justify-between gap-3 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {alumna.last_name}, {alumna.first_name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">DNI: {alumna.dni} • Tel: {alumna.phone}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botón de Asistencia Rápida */}
                      <button
                        type="button"
                        onClick={() => toggleAsistencia(alumna.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isPresent
                            ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                            : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                        }`}
                      >
                        {isPresent ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {isPresent ? 'Presente' : 'Ausente'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveAlumna(clase.id, alumna.id, `${alumna.first_name} ${alumna.last_name}`)}
                        title="Remover alumna del turno"
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[var(--border-default)]">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
