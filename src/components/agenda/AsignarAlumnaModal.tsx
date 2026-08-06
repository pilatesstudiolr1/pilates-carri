'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, Clase } from '@/types/database';
import { getAlumnas } from '@/lib/services/alumnas';
import { Search, UserPlus, AlertCircle } from 'lucide-react';

interface AsignarAlumnaModalProps {
  open: boolean;
  onClose: () => void;
  onAssign: (claseId: string, alumnaId: string) => Promise<boolean>;
  clase: Clase | null;
  loading?: boolean;
}

export function AsignarAlumnaModal({
  open,
  onClose,
  onAssign,
  clase,
  loading = false,
}: AsignarAlumnaModalProps) {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAlumnaId, setSelectedAlumnaId] = useState('');
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setSelectedAlumnaId('');
      setSearch('');
      fetchAlumnas();
    }
  }, [open]);

  const fetchAlumnas = async (query = '') => {
    setFetching(true);
    const { data } = await getAlumnas({ status: 'ACTIVE', search: query });
    setAlumnas(data);
    setFetching(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchAlumnas(val);
  };

  const handleAssign = async () => {
    if (!clase || !selectedAlumnaId) return;
    setErrorMsg('');
    const success = await onAssign(clase.id, selectedAlumnaId);
    if (success) onClose();
  };

  // Filter out alumnas already in this class
  const existingIds = new Set(clase?.alumnas?.map((a) => a.id) || []);
  const availableAlumnas = alumnas.filter((a) => !existingIds.has(a.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Asignar Alumna a ${clase?.name || 'Turno'}`}
      description={`Capacidad actual: ${clase?.alumnas_count || 0} / ${clase?.max_capacity || 6} alumnas`}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {errorMsg && (
          <div className="px-3.5 py-2.5 rounded-md bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Input
          placeholder="Buscar alumna por nombre o DNI..."
          value={search}
          onChange={handleSearchChange}
          icon={<Search className="h-4 w-4" />}
        />

        <div className="max-h-60 overflow-y-auto border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)]">
          {fetching ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">Cargando alumnas...</div>
          ) : availableAlumnas.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              No hay alumnas disponibles para asignar.
            </div>
          ) : (
            availableAlumnas.map((alumna) => (
              <button
                key={alumna.id}
                type="button"
                onClick={() => setSelectedAlumnaId(alumna.id)}
                className={`w-full p-3 text-left flex items-center justify-between transition-colors cursor-pointer ${
                  selectedAlumnaId === alumna.id
                    ? 'bg-[var(--color-wood)]/20 text-[var(--text-primary)] font-semibold'
                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold">{alumna.last_name}, {alumna.first_name}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">DNI: {alumna.dni} • Tel: {alumna.phone}</p>
                </div>
                {selectedAlumnaId === alumna.id && (
                  <span className="text-xs text-[var(--color-wood)] font-bold">Seleccionada</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedAlumnaId || loading}
            loading={loading}
            icon={<UserPlus className="h-4 w-4" />}
          >
            Asignar Turno
          </Button>
        </div>
      </div>
    </Modal>
  );
}
