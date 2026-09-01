'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, Clase } from '@/types/database';
import { getAlumnas, createAlumna } from '@/lib/services/alumnas';
import {
  Search,
  UserPlus,
  AlertCircle,
  User,
  Phone,
  CheckCircle2,
  UserCheck,
  Clock,
  BedDouble,
  Calendar,
} from 'lucide-react';

interface AsignarAlumnaModalProps {
  open: boolean;
  onClose: () => void;
  onAssign: (claseId: string, alumnaId: string, camilla?: number) => Promise<boolean>;
  clase: Clase | null;
  dayName?: string;
  presetTime?: string;
  presetCamilla?: number;
  loading?: boolean;
}

export function AsignarAlumnaModal({
  open,
  onClose,
  onAssign,
  clase,
  dayName = 'Lunes',
  presetTime = '08:00',
  presetCamilla = 1,
  loading = false,
}: AsignarAlumnaModalProps) {
  const [tab, setTab] = useState<'EXISTING' | 'MANUAL'>('EXISTING');
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAlumnaId, setSelectedAlumnaId] = useState('');
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Camilla elegida
  const [camillaSeleccionada, setCamillaSeleccionada] = useState<number>(presetCamilla || 1);

  // Campos manuales
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Observaciones
  const [observaciones, setObservaciones] = useState('');

  // Calcular camillas libres
  const maxCap = clase?.max_capacity || 6;
  const inscripciones = clase?.alumnas || [];

  const ocupadasMap = new Map<number, string>();
  if (Array.isArray(inscripciones)) {
    inscripciones.forEach((item: any, idx: number) => {
      const cNum = item.camilla || idx + 1;
      if (cNum >= 1 && cNum <= maxCap) {
        const nombre = item.alumna ? `${item.alumna.first_name} ${item.alumna.last_name || ''}`.trim() : 'Ocupado';
        ocupadasMap.set(cNum, nombre);
      }
    });
  }

  const camillasLibres: number[] = [];
  for (let i = 1; i <= maxCap; i++) {
    if (!ocupadasMap.has(i)) {
      camillasLibres.push(i);
    }
  }

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setSelectedAlumnaId('');
      setSearch('');
      setTab('EXISTING');

      setManualFirstName('');
      setManualLastName('');
      setManualPhone('');
      setObservaciones('');

      if (camillasLibres.includes(presetCamilla)) {
        setCamillaSeleccionada(presetCamilla);
      } else if (camillasLibres.length > 0) {
        setCamillaSeleccionada(camillasLibres[0]);
      } else {
        setCamillaSeleccionada(presetCamilla || 1);
      }

      fetchAlumnas();
    }
  }, [open, clase, presetCamilla]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clase) {
      setErrorMsg('No se encontró el turno seleccionado');
      return;
    }

    let finalAlumnaId = selectedAlumnaId;

    if (tab === 'MANUAL') {
      if (!manualFirstName.trim()) {
        setErrorMsg('El nombre es obligatorio para la carga manual');
        return;
      }

      // Crear alumna manualmente en el momento
      const { data: newAlumna, error: createErr } = await createAlumna({
        first_name: manualFirstName.trim(),
        last_name: manualLastName.trim() || 'Sin apellido',
        phone: manualPhone.trim() || 'Sin teléfono',
        status: 'ACTIVE',
      });

      if (createErr || !newAlumna) {
        setErrorMsg(createErr || 'Error al crear la alumna manualmente');
        return;
      }

      finalAlumnaId = newAlumna.id;
    }

    if (!finalAlumnaId) {
      setErrorMsg('Debes seleccionar o ingresar una alumna');
      return;
    }

    const success = await onAssign(clase.id, finalAlumnaId, camillaSeleccionada);
    if (success) {
      onClose();
    }
  };

  // Filtrar alumnas que ya pertenecen a este turno
  const existingIds = new Set(clase?.alumnas?.map((a) => a.id) || []);
  const availableAlumnas = alumnas.filter((a) => !existingIds.has(a.id));
  const selectedAlumnaObject = alumnas.find((a) => a.id === selectedAlumnaId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar Alumna al Turno"
      description="Selecciona una alumna de la lista o regístrala manualmente para este horario"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-[var(--text-primary)]">
        {/* Banner Informativo del Turno Elegido */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-wood)]/15 via-[var(--bg-tertiary)] to-[var(--bg-tertiary)] border border-[var(--color-wood)]/30">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--color-wood)] shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-wood)]">{dayName}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-primary)]">
            <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-default)]">
              <Clock className="h-3.5 w-3.5 text-[var(--color-wood)]" /> {presetTime} hs
            </span>
            <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border-default)]">
              <BedDouble className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Reformer {camillaSeleccionada}
            </span>
          </div>
        </div>

        {/* Selector de Reformers Libres */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 uppercase tracking-wider">
              <BedDouble className="h-3.5 w-3.5 text-emerald-600" />
              Camilla / Reformer Disponible:
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {camillasLibres.length} de {maxCap} lugares libres
            </span>
          </div>

          {camillasLibres.length === 0 ? (
            <p className="text-xs text-rose-600 font-bold">
              ⚠️ No hay reformers disponibles en este horario.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {camillasLibres.map((cNum) => {
                const isSelected = camillaSeleccionada === cNum;
                return (
                  <button
                    key={cNum}
                    type="button"
                    onClick={() => setCamillaSeleccionada(cNum)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-emerald-500'
                    }`}
                  >
                    Reformer {cNum} (Libre)
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-[var(--color-danger-soft)] text-xs text-[var(--color-danger)] font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pestañas de Selección */}
        <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => setTab('EXISTING')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tab === 'EXISTING'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserCheck className="h-4 w-4" /> Elegir Alumna Registrada ({availableAlumnas.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('MANUAL')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tab === 'MANUAL'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserPlus className="h-4 w-4" /> Cargar Persona Manualmente
          </button>
        </div>

        {/* TAB 1: Seleccionar Alumna de Lista */}
        {tab === 'EXISTING' && (
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Buscar por nombre, apellido, DNI o teléfono..."
              value={search}
              onChange={handleSearchChange}
              icon={<Search className="h-4 w-4 text-[var(--color-wood)]" />}
            />

            {/* Listado Elegante de Alumnas */}
            <div className="max-h-64 overflow-y-auto border border-[var(--border-default)] rounded-2xl divide-y divide-[var(--border-default)] bg-[var(--bg-tertiary)]/30 custom-scrollbar">
              {fetching ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
                  <span className="w-5 h-5 rounded-full border-2 border-[var(--color-wood)] border-t-transparent animate-spin" />
                  Buscando alumnas en el sistema...
                </div>
              ) : availableAlumnas.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  {search ? 'No se encontraron alumnas con ese criterio.' : 'No hay alumnas registradas activas.'}
                </div>
              ) : (
                availableAlumnas.map((alumna) => {
                  const isSelected = selectedAlumnaId === alumna.id;
                  const initials = `${alumna.first_name?.[0] || ''}${alumna.last_name?.[0] || ''}`.toUpperCase() || 'AL';

                  return (
                    <button
                      key={alumna.id}
                      type="button"
                      onClick={() => setSelectedAlumnaId(alumna.id)}
                      className={`w-full p-3.5 text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-wood)]/20 border-l-4 border-[var(--color-wood)] font-bold shadow-xs'
                          : 'hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 border ${
                            isSelected
                              ? 'bg-[var(--color-wood)] text-[var(--color-dark)] border-[var(--color-wood)]'
                              : 'bg-[var(--color-wood)]/10 text-[var(--color-wood)] border-[var(--color-wood)]/30'
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate capitalize">
                            {alumna.first_name} {alumna.last_name}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-0.5">
                            {alumna.dni && <span>DNI: {alumna.dni}</span>}
                            <span>Tel: {alumna.phone || 'Sin teléfono'}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="px-3 py-1 rounded-lg bg-[var(--color-wood)] text-[var(--color-dark)] text-xs font-extrabold flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Seleccionada
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 font-medium">
                          Seleccionar &rarr;
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Cargar Manualmente */}
        {tab === 'MANUAL' && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)]">
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              Completa los datos para inscribir a una nueva alumna en este turno:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre *"
                placeholder="Ej. Sofia"
                value={manualFirstName}
                onChange={(e) => setManualFirstName(e.target.value)}
                icon={<User className="h-4 w-4" />}
                required={tab === 'MANUAL'}
              />

              <Input
                label="Apellido"
                placeholder="Ej. Rodriguez"
                value={manualLastName}
                onChange={(e) => setManualLastName(e.target.value)}
              />
            </div>

            <Input
              label="Teléfono de Contacto"
              placeholder="+54 380 4123456"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
        )}

        {/* Observaciones */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Observaciones o Notas del Turno
          </label>
          <textarea
            rows={2}
            placeholder="Ejemplo: clase de prueba, recuperación de fecha o nota médica"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs placeholder:text-[var(--text-muted)] resize-none"
          />
        </div>

        {/* Resumen de Seleccion y Botones de Accion */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-default)] mt-1">
          <div className="text-xs text-[var(--text-muted)] truncate w-full sm:w-auto">
            {tab === 'EXISTING' && selectedAlumnaObject ? (
              <span>Alumna elegida: <strong className="text-[var(--color-wood)] capitalize">{selectedAlumnaObject.first_name} {selectedAlumnaObject.last_name}</strong></span>
            ) : tab === 'MANUAL' && manualFirstName ? (
              <span>Carga manual: <strong className="text-[var(--color-wood)]">{manualFirstName} {manualLastName}</strong></span>
            ) : (
              <span>Ninguna alumna seleccionada aún</span>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={tab === 'EXISTING' && !selectedAlumnaId}
              icon={<CheckCircle2 className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Agregar a la Agenda
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
