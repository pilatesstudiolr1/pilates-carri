'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alumna, Clase } from '@/types/database';
import { getAlumnas, createAlumna } from '@/lib/services/alumnas';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  PauseCircle,
  Search,
  MessageCircle,
  Trash2,
  BedDouble,
  Clock,
  User,
  Phone,
} from 'lucide-react';

interface TurnoModalProps {
  open: boolean;
  onClose: () => void;
  clase: Clase | null;
  dayName: string;
  presetTime: string;
  presetCamilla: number;
  alumnaAsignada?: any | null; // Si ya hay alumna inscripta en esta camilla
  onSave: (data: {
    claseId?: string;
    alumnaId: string;
    camilla: number;
    dayOfWeek: number;
    startTime: string;
    observaciones?: string;
    asistenciaStatus?: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED' | 'UNMARKED';
  }) => Promise<boolean>;
  onDeleteTurno?: (claseId: string, alumnaId?: string) => Promise<boolean>;
  loading?: boolean;
}

export function TurnoModal({
  open,
  onClose,
  clase,
  dayName,
  presetTime,
  presetCamilla,
  alumnaAsignada = null,
  onSave,
  onDeleteTurno,
  loading = false,
}: TurnoModalProps) {
  const isOccupied = !!alumnaAsignada;

  // Estado de Asistencia
  const [asistenciaStatus, setAsistenciaStatus] = useState<
    'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED' | 'UNMARKED'
  >('UNMARKED');

  // Búsqueda de Alumna
  const [searchQuery, setSearchQuery] = useState('');
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [fetchingAlumnas, setFetchingAlumnas] = useState(false);

  // Carga Manual
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Horario y Reformer
  const [time, setTime] = useState(presetTime);
  const [camilla, setCamilla] = useState(presetCamilla);
  const [observaciones, setObservaciones] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fechaHoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open) {
      setErrorMsg('');
      setTime(presetTime);
      setCamilla(presetCamilla);

      if (alumnaAsignada) {
        const alumnaObj = alumnaAsignada.alumna || alumnaAsignada;
        setSelectedAlumna(alumnaObj);
        setManualFirstName(alumnaObj.first_name || '');
        setManualLastName(alumnaObj.last_name || '');
        setManualPhone(alumnaObj.phone || '');
        setObservaciones(alumnaAsignada.notes || 'Turno fijo semanal');
        setAsistenciaStatus(alumnaAsignada.status || 'UNMARKED');
      } else {
        setSelectedAlumna(null);
        setManualFirstName('');
        setManualLastName('');
        setManualPhone('');
        setObservaciones('');
        setAsistenciaStatus('UNMARKED');
      }

      fetchAlumnas();
    }
  }, [open, alumnaAsignada, presetTime, presetCamilla]);

  const fetchAlumnas = async (query = '') => {
    setFetchingAlumnas(true);
    const { data } = await getAlumnas({ status: 'ACTIVE', search: query });
    setAlumnas(data || []);
    setFetchingAlumnas(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchAlumnas(val);
  };

  const handleSelectAlumnaFromList = (a: Alumna) => {
    setSelectedAlumna(a);
    setManualFirstName(a.first_name || '');
    setManualLastName(a.last_name || '');
    setManualPhone(a.phone || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    try {
      let finalAlumnaId = selectedAlumna?.id;

      // Si no seleccionó de lista pero escribió datos manuales
      if (!finalAlumnaId && manualFirstName.trim()) {
        const { data: newAlumna, error: createErr } = await createAlumna({
          first_name: manualFirstName.trim(),
          last_name: manualLastName.trim() || 'Sin apellido',
          phone: manualPhone.trim() || 'Sin teléfono',
          status: 'ACTIVE',
        });

        if (createErr || !newAlumna) {
          setErrorMsg(createErr || 'Error al crear la alumna');
          setSaving(false);
          return;
        }

        finalAlumnaId = newAlumna.id;
      }

      if (!finalAlumnaId) {
        setErrorMsg('Por favor selecciona una alumna existente o completa el nombre en la carga manual.');
        setSaving(false);
        return;
      }

      const dayOfWeekNum = getDayOfWeekNumber(dayName);

      const ok = await onSave({
        claseId: clase?.id,
        alumnaId: finalAlumnaId,
        camilla,
        dayOfWeek: dayOfWeekNum,
        startTime: time,
        observaciones,
        asistenciaStatus,
      });

      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el turno');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteTurno || !clase) return;
    if (confirm('¿Estás seguro de eliminar este turno de la agenda?')) {
      const ok = await onDeleteTurno(clase.id, selectedAlumna?.id);
      if (ok) onClose();
    }
  };

  const title = isOccupied ? 'Turno y asistencia' : 'Agregar turno';
  const subtitle = `${dayName} · ${time} · Reformer ${camilla}`;

  return (
    <Modal open={open} onClose={onClose} title={title} description={subtitle} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-[var(--text-primary)]">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* SI ES OCUPADO: SECCIÓN DE ASISTENCIA */}
        {isOccupied && (
          <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-default)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-primary)]">
                Asistencia del {fechaHoy}
              </span>
              <span className="text-[var(--text-muted)] font-medium">
                Estado actual:{' '}
                <strong className="text-[var(--color-wood)] capitalize">
                  {asistenciaStatus === 'PRESENT'
                    ? 'Presente'
                    : asistenciaStatus === 'ABSENT'
                    ? 'Ausente'
                    : asistenciaStatus === 'RECOVERY'
                    ? 'Recupera'
                    : asistenciaStatus === 'SUSPENDED'
                    ? 'Suspendida'
                    : 'Sin marcar'}
                </strong>
              </span>
            </div>

            {/* 4 Botones de Asistencia Gigantes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAsistenciaStatus('PRESENT')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  asistenciaStatus === 'PRESENT'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Presente</span>
              </button>

              <button
                type="button"
                onClick={() => setAsistenciaStatus('ABSENT')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  asistenciaStatus === 'ABSENT'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 hover:bg-rose-600 hover:text-white'
                }`}
              >
                <XCircle className="h-4 w-4" />
                <span>Ausente</span>
              </button>

              <button
                type="button"
                onClick={() => setAsistenciaStatus('RECOVERY')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  asistenciaStatus === 'RECOVERY'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 hover:bg-amber-500 hover:text-white'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Recupera</span>
              </button>

              <button
                type="button"
                onClick={() => setAsistenciaStatus('SUSPENDED')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  asistenciaStatus === 'SUSPENDED'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <PauseCircle className="h-4 w-4" />
                <span>Suspendida</span>
              </button>
            </div>
          </div>
        )}

        {/* BUSCAR ALUMNA */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            Buscar alumna
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Nombre o teléfono"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-wood)]"
              />
            </div>

            <select
              value={selectedAlumna?.id || ''}
              onChange={(e) => {
                const found = alumnas.find((a) => a.id === e.target.value);
                if (found) handleSelectAlumnaFromList(found);
              }}
              className="w-full sm:w-auto min-w-[200px] px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="">Elegir alumna existente</option>
              {alumnas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.first_name} {a.last_name} ({a.phone})
                </option>
              ))}
            </select>
          </div>

          {/* CARD PREVIEW DE LA ALUMNA SI YA ESTÁ SELECCIONADA */}
          {selectedAlumna && (
            <div className="p-3.5 rounded-2xl bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/30 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-[var(--text-primary)] capitalize">
                  {selectedAlumna.first_name} {selectedAlumna.last_name} &mdash;{' '}
                  {selectedAlumna.plan || '3 veces por semana'} - $
                  {selectedAlumna.plan_amount ? selectedAlumna.plan_amount.toLocaleString() : '55.000'} &mdash;{' '}
                  <span className="text-emerald-600 font-extrabold">
                    {selectedAlumna.status || 'Activa'}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[var(--text-secondary)] font-medium pt-1 border-t border-[var(--color-wood)]/20">
                <div>
                  <strong>Plan:</strong> {selectedAlumna.plan || 'Sin plan'}
                </div>
                <div>
                  <strong>Teléfono:</strong> {selectedAlumna.phone || 'Sin teléfono'}
                </div>
                <div>
                  <strong>Estado:</strong> {selectedAlumna.status || 'Activa'}
                </div>
                <div>
                  <strong>Vencimiento:</strong> {selectedAlumna.billing_due_date || 'Sin fecha'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TAMBIÉN PODÉS CARGAR UNA PERSONA MANUALMENTE */}
        <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-tertiary)]/40 border border-[var(--border-default)]">
          <label className="text-xs font-bold text-[var(--text-secondary)] block">
            También podés cargar una persona manualmente:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">
                Nombre
              </label>
              <input
                type="text"
                placeholder="Nombre"
                value={manualFirstName}
                onChange={(e) => setManualFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-wood)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">
                Apellido
              </label>
              <input
                type="text"
                placeholder="Apellido"
                value={manualLastName}
                onChange={(e) => setManualLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-wood)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] mb-1 block">
                Teléfono
              </label>
              <input
                type="text"
                placeholder="Teléfono"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-wood)]"
              />
            </div>
          </div>
        </div>

        {/* HORARIO Y REFORMER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
              Horario
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-primary)] mb-1 block">
              Reformer
            </label>
            <select
              value={camilla}
              onChange={(e) => setCamilla(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  Reformer {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OBSERVACIONES */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            Observaciones
          </label>
          <textarea
            rows={2}
            placeholder="Ejemplo: clase de prueba, recuperación o información importante"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs placeholder:text-[var(--text-muted)] resize-none"
          />
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[var(--border-default)]">
          {isOccupied && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {manualPhone && (
                <a
                  href={`https://wa.me/${manualPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {onDeleteTurno && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer flex-1 sm:flex-initial"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar turno</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" loading={saving} icon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">
              {isOccupied ? 'Guardar cambios del turno' : 'Agregar a la agenda'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function getDayOfWeekNumber(name: string): number {
  const map: Record<string, number> = {
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
    Domingo: 7,
  };
  return map[name] || 1;
}
