'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Alumna, Clase, Profile } from '@/types/database';
import { getAlumnas, createAlumna } from '@/lib/services/alumnas';
import {
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageCircle,
  Trash2,
  BedDouble,
  Check,
  User,
} from 'lucide-react';

interface TurnoModalProps {
  open: boolean;
  onClose: () => void;
  clase: Clase | null;
  dayName: string;
  presetTime: string;
  presetCamilla: number;
  alumnaAsignada?: any | null;
  profesoras?: Profile[];
  profesoraFilter?: string;
  onSave: (data: {
    claseId?: string;
    alumnaId: string;
    camilla: number;
    dayOfWeek: number;
    startTime: string;
    observaciones?: string;
    asistenciaStatus?: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED' | 'UNMARKED';
    profesoraId?: string | null;
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
  profesoras = [],
  profesoraFilter = 'ALL',
  onSave,
  onDeleteTurno,
}: TurnoModalProps) {
  const [mounted, setMounted] = useState(false);
  const isOccupied = !!alumnaAsignada;

  // Estado de Profesora asignada
  const [selectedProfesoraId, setSelectedProfesoraId] = useState<string>('');

  // Estado de Asistencia
  const [asistenciaStatus, setAsistenciaStatus] = useState<
    'PRESENT' | 'ABSENT' | 'RECOVERY' | 'SUSPENDED' | 'UNMARKED'
  >('UNMARKED');

  // Camilla elegida
  const [selectedCamilla, setSelectedCamilla] = useState<number>(presetCamilla || 1);

  // Listado y selección de Alumnas
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [selectedAlumnaId, setSelectedAlumnaId] = useState<string>('');
  const [nuevaAlumnaNombre, setNuevaAlumnaNombre] = useState('');
  const [nuevaAlumnaTelefono, setNuevaAlumnaTelefono] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcular camillas ocupadas y libres en este horario
  const maxCap = clase?.max_capacity || 6;
  const inscripciones = clase?.alumnas || [];

  const ocupadasMap = new Map<number, string>();
  if (Array.isArray(inscripciones)) {
    inscripciones.forEach((item: any, idx: number) => {
      const cNum = item.camilla || idx + 1;
      const isSelf = alumnaAsignada && (item.id === alumnaAsignada.id || item.alumna_id === alumnaAsignada.alumna_id);
      if (!isSelf && cNum >= 1 && cNum <= maxCap) {
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
      document.body.style.overflow = 'hidden';

      if (alumnaAsignada) {
        const alumnaObj = alumnaAsignada.alumna || alumnaAsignada;
        setSelectedAlumnaId(alumnaObj.id || '');
        setAsistenciaStatus(alumnaAsignada.status || 'UNMARKED');
        setSelectedCamilla(presetCamilla || alumnaAsignada.camilla || 1);
      } else {
        setSelectedAlumnaId('');
        setNuevaAlumnaNombre('');
        setNuevaAlumnaTelefono('');
        setAsistenciaStatus('UNMARKED');

        // Si la camilla preset está libre usarla, de lo contrario elegir la primera libre
        if (camillasLibres.includes(presetCamilla)) {
          setSelectedCamilla(presetCamilla);
        } else if (camillasLibres.length > 0) {
          setSelectedCamilla(camillasLibres[0]);
        } else {
          setSelectedCamilla(presetCamilla || 1);
        }
      }

      // Inicializar profesora a cargo (de la clase o del filtro activo)
      if (clase?.profesora_id) {
        setSelectedProfesoraId(clase.profesora_id);
      } else if (profesoraFilter && profesoraFilter !== 'ALL') {
        setSelectedProfesoraId(profesoraFilter);
      } else {
        setSelectedProfesoraId('');
      }

      // Cargar lista de alumnas activas
      getAlumnas({ status: 'ACTIVE', limit: 300 }).then((res) => {
        setAlumnas(res.data || []);
      });
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, alumnaAsignada, presetCamilla, clase, profesoraFilter]);

  if (!open || !mounted) return null;

  const currentAlumna = isOccupied
    ? alumnaAsignada.alumna || alumnaAsignada
    : alumnas.find((a) => a.id === selectedAlumnaId);

  const alumnaNombreCompleto = currentAlumna
    ? `${currentAlumna.first_name || ''} ${currentAlumna.last_name || ''}`.trim()
    : nuevaAlumnaNombre || 'Alumna';

  const alumnaTelefono = currentAlumna?.phone || nuevaAlumnaTelefono || '';

  const handleSave = async (statusOverride?: 'PRESENT' | 'ABSENT' | 'RECOVERY' | 'UNMARKED') => {
    setErrorMsg('');
    setSaving(true);

    try {
      let finalAlumnaId = isOccupied ? currentAlumna?.id : selectedAlumnaId;

      // Si es alta rápida de nueva alumna escrita a mano
      if (!finalAlumnaId && nuevaAlumnaNombre.trim()) {
        const partes = nuevaAlumnaNombre.trim().split(' ');
        const first_name = partes[0] || 'Alumna';
        const last_name = partes.slice(1).join(' ') || 'Sin apellido';

        const res = await createAlumna({
          first_name,
          last_name,
          phone: nuevaAlumnaTelefono.trim() || 'Sin teléfono',
          status: 'ACTIVE',
          sede_id: clase?.sede_id || null,
        });

        if (res.error || !res.data) {
          setErrorMsg(res.error || 'Error al crear la alumna');
          setSaving(false);
          return;
        }
        finalAlumnaId = res.data.id;
      }

      if (!finalAlumnaId) {
        setErrorMsg('Seleccioná una alumna o ingresá el nombre para asignarla.');
        setSaving(false);
        return;
      }

      const dayMap: Record<string, number> = {
        Lunes: 1,
        Martes: 2,
        Miércoles: 3,
        Jueves: 4,
        Viernes: 5,
        Sábado: 6,
        Domingo: 7,
      };
      const dayOfWeekNum = dayMap[dayName] || 1;

      const targetStatus = statusOverride !== undefined ? statusOverride : asistenciaStatus;

      const ok = await onSave({
        claseId: clase?.id,
        alumnaId: finalAlumnaId,
        camilla: selectedCamilla,
        dayOfWeek: dayOfWeekNum,
        startTime: presetTime,
        asistenciaStatus: targetStatus,
        profesoraId: selectedProfesoraId || (profesoraFilter !== 'ALL' ? profesoraFilter : null),
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
    if (confirm('¿Deseas quitar a esta alumna de este turno?')) {
      const ok = await onDeleteTurno(clase.id, currentAlumna?.id);
      if (ok) onClose();
    }
  };

  const handleWhatsApp = () => {
    if (!alumnaTelefono) return;
    const clean = alumnaTelefono.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hola ${alumnaNombreCompleto}! Nos comunicamos de Pilates Studio respecto a tu turno de Reformer ${selectedCamilla} (${dayName} a las ${presetTime} hs).`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border-2 border-[var(--border-default)] shadow-2xl overflow-hidden rounded-xl text-[var(--text-primary)] animate-scale-in">
        {/* HEADER DEL RECUADRO */}
        <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-[11px] font-mono font-bold uppercase">
                Reformer {selectedCamilla}
              </span>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                {dayName} · {presetTime} hs
              </span>
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-primary)] mt-1">
              {isOccupied ? 'Gestión de Asistencia & Turno' : 'Asignar Alumna al Turno'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CONTENIDO DEL RECUADRO */}
        <div className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Selector de Reformers Libres (Solamente los libres) */}
          {!isOccupied && (
            <div className="space-y-1.5 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Seleccionar Reformer Disponible:</span>
                </label>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {camillasLibres.length} de {maxCap} libres
                </span>
              </div>

              {camillasLibres.length === 0 ? (
                <p className="text-xs text-rose-600 font-bold py-1">
                  ⚠️ No hay reformers libres en este horario.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                  {camillasLibres.map((cNum) => {
                    const isSelected = selectedCamilla === cNum;
                    return (
                      <button
                        key={cNum}
                        type="button"
                        onClick={() => setSelectedCamilla(cNum)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center border-2 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-emerald-500'
                        }`}
                      >
                        Ref {cNum}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SELECCIÓN DINÁMICA DE PROFESORA (Cuando se está en 'Todas las profesoras') */}
          {(!profesoraFilter || profesoraFilter === 'ALL') && (
            <div className="space-y-1.5 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[var(--color-wood)]" />
                  <span>Profesora a cargo del turno:</span>
                </label>
                {selectedProfesoraId && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Asignada
                  </span>
                )}
              </div>

              <select
                value={selectedProfesoraId}
                onChange={(e) => setSelectedProfesoraId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-default)] text-xs font-bold focus:outline-none focus:border-[var(--color-wood)] cursor-pointer"
              >
                <option value="">-- Seleccionar profesora a cargo --</option>
                {(profesoras || [])
                  .filter((p) => p.role === 'PROFESORA')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* CASO 1: LUGAR OCUPADO -> MARCAR ASISTENCIA EN 1 CLIC */}
          {isOccupied ? (
            <div className="space-y-4">
              {/* Información de la Alumna */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                    Alumna Asignada
                  </span>
                  {alumnaTelefono && (
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      Tel: {alumnaTelefono}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-extrabold text-[var(--text-primary)] mt-0.5 capitalize">
                  {alumnaNombreCompleto.toLowerCase()}
                </h4>
              </div>

              {/* Botones de Asistencia */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
                  Seleccionar Estado de Asistencia:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Presente */}
                  <button
                    type="button"
                    onClick={() => setAsistenciaStatus('PRESENT')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      asistenciaStatus === 'PRESENT'
                        ? 'bg-[#fefce8] dark:bg-[#261f0b] text-[#854d0e] dark:text-[#fde047] border-[#eab308] shadow-xs'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[#eab308]'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#eab308]" />
                    <span>✓ Presente</span>
                  </button>

                  {/* Ausente */}
                  <button
                    type="button"
                    onClick={() => setAsistenciaStatus('ABSENT')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      asistenciaStatus === 'ABSENT'
                        ? 'bg-[#fff1f2] dark:bg-[#271015] text-[#9f1239] dark:text-[#fda4af] border-[#f43f5e] shadow-xs'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[#f43f5e]'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 text-[#f43f5e]" />
                    <span>✗ Ausente</span>
                  </button>

                  {/* Recupera */}
                  <button
                    type="button"
                    onClick={() => setAsistenciaStatus('RECOVERY')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      asistenciaStatus === 'RECOVERY'
                        ? 'bg-[#eef2ff] dark:bg-[#13122b] text-[#3730a3] dark:text-[#c7d2fe] border-[#6366f1] shadow-xs'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[#6366f1]'
                    }`}
                  >
                    <RotateCcw className="h-4 w-4 text-[#6366f1]" />
                    <span>↻ Recupera</span>
                  </button>

                  {/* Sin Marcar */}
                  <button
                    type="button"
                    onClick={() => setAsistenciaStatus('UNMARKED')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      asistenciaStatus === 'UNMARKED'
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--border-focus)] shadow-xs'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)]'
                    }`}
                  >
                    <span>Sin Marcar</span>
                  </button>
                </div>
              </div>

              {/* Acciones Rápidas (WhatsApp & Quitar) */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
                {alumnaTelefono && (
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDelete}
                  className="py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Quitar</span>
                </button>
              </div>
            </div>
          ) : (
            /* CASO 2: LUGAR DISPONIBLE -> SELECCIONAR ALUMNA */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                  Seleccionar Alumna Registrada:
                </label>
                <select
                  value={selectedAlumnaId}
                  onChange={(e) => {
                    setSelectedAlumnaId(e.target.value);
                    if (e.target.value) {
                      setNuevaAlumnaNombre('');
                      setNuevaAlumnaTelefono('');
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-[var(--border-default)] text-xs font-bold focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
                >
                  <option value="">-- Elegir de la lista ({alumnas.length} alumnas) --</option>
                  {alumnas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.first_name} {a.last_name || ''} {a.phone ? `(${a.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[var(--border-default)]"></div>
                <span className="shrink-0 mx-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                  O Crear Alumna Rápida
                </span>
                <div className="flex-grow border-t border-[var(--border-default)]"></div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Nombre y Apellido
                </label>
                <input
                  type="text"
                  placeholder="Ej: María González"
                  value={nuevaAlumnaNombre}
                  onChange={(e) => {
                    setNuevaAlumnaNombre(e.target.value);
                    if (e.target.value) setSelectedAlumnaId('');
                  }}
                  className="w-full h-9 px-3 rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                  Teléfono (WhatsApp)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 3814123456"
                  value={nuevaAlumnaTelefono}
                  onChange={(e) => setNuevaAlumnaTelefono(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>
          )}

          {/* FOOTER DEL RECUADRO */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} size="sm">
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSave()}
              loading={saving}
              size="sm"
            >
              {isOccupied ? 'Guardar Cambios' : 'Confirmar Asignación'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
