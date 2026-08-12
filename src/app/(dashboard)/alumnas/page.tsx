'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { AlumnaFormModal } from '@/components/alumnas/AlumnaFormModal';
import { AlumnaDetailModal } from '@/components/alumnas/AlumnaDetailModal';
import { AsignarTurnoFijoModal } from '@/components/alumnas/AsignarTurnoFijoModal';
import { NuevaAlumnaForm } from '@/components/alumnas/NuevaAlumnaForm';
import { Alumna, AlumnaInsert, AlumnaStatus } from '@/types/database';
import { getAlumnas, updateAlumna, updateAlumnaStatus } from '@/lib/services/alumnas';
import { getBarreAlumnas, BarreAlumna } from '@/lib/services/barre';
import { addAlumnaToClase } from '@/lib/services/agenda';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  AlertTriangle,
  List,
  Layers,
} from 'lucide-react';

export type ModalityFilterAlumnas = 'ALL' | 'REFORMER' | 'BARRE';

function getVencimientoCell(fechaVencimiento: string | null) {
  if (!fechaVencimiento) {
    return <span className="text-[var(--text-muted)] text-[11px]">Sin fecha</span>;
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertTriangle className="h-2.5 w-2.5" />
        Vencida
      </span>
    );
  }
  if (diffDias <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="h-2.5 w-2.5" />
        {diffDias}d
      </span>
    );
  }
  return (
    <span className="text-[11px] text-[var(--text-secondary)] font-mono">
      {fechaVencimiento}
    </span>
  );
}

export default function AlumnasPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>('LIST');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilterAlumnas>('ALL');

  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [alumnasBarre, setAlumnasBarre] = useState<BarreAlumna[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlumnaStatus | 'ALL'>('ALL');

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAlumnas = useCallback(async () => {
    setLoading(true);

    const [refRes, barreRes] = await Promise.all([
      getAlumnas({
        search: search || undefined,
        status: statusFilter,
      }),
      getBarreAlumnas(),
    ]);

    setAlumnas(refRes.data || []);
    setTotalCount(refRes.count || 0);

    setAlumnasBarre(barreRes.data || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchAlumnas();
  }, [fetchAlumnas]);

  const handleAssignTurnoFijo = async (claseId: string, alumnaId: string, camilla?: number | null): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await addAlumnaToClase(claseId, alumnaId, camilla);
    setSubmitting(false);

    if (error) {
      await alertDialog({
        title: 'Error de asignación',
        message: `No se pudo inscribir a la alumna: ${error}`,
        variant: 'danger',
      });
      return false;
    }

    await alertDialog({
      title: 'Inscripción Exitosa',
      message: `La alumna ha sido inscripta correctamente en el turno fijo.`,
      variant: 'success',
    });
    setIsTurnoModalOpen(false);
    setSelectedAlumna(null);
    return true;
  };

  const handleUpdateAlumna = async (id: string, data: Partial<AlumnaInsert>) => {
    setSubmitting(true);
    const { error } = await updateAlumna(id, data);
    setSubmitting(false);

    if (error) {
      await alertDialog({ title: 'Error al guardar', message: error, variant: 'danger' });
      return;
    }

    setIsFormOpen(false);
    setSelectedAlumna(null);
    fetchAlumnas();
  };

  // Filtrado final de lista según modalidad seleccionada (Reformer | Barre | All)
  const displayReformerList = modalityFilter === 'ALL' || modalityFilter === 'REFORMER';
  const displayBarreList = modalityFilter === 'ALL' || modalityFilter === 'BARRE';

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--color-wood)]" /> Gestión de Alumnas
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Registro de fichas de alumnas, estado de cuotas y asignación de turnos divididos por modalidad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)]">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="h-4 w-4" /> Alumnas Registradas
            </button>
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'NEW'
                  ? 'bg-[var(--color-wood)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Nueva Alumna
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'NEW' ? (
        /* Pestaña: Registro de Nueva Alumna (Espacioso max-w-6xl para evitar superposición) */
        <div className="w-full max-w-6xl mx-auto">
          <NuevaAlumnaForm
            onSuccess={() => {
              setActiveTab('LIST');
              fetchAlumnas();
            }}
          />
        </div>
      ) : (
        /* Pestaña: Listado de Alumnas con Filtros por Modalidad y Estado */
        <div className="flex flex-col gap-4">
          {/* Barra de Filtros (Modalidad + Buscador + Estado) */}
          <Card className="p-4 border border-[var(--border-default)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Filter Pill 1: Modalidad (Reformer vs Barre vs Todas) */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-default)] text-xs font-semibold w-full md:w-auto">
              <span className="px-2 text-[var(--text-muted)] flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Modalidad:
              </span>
              <button
                onClick={() => setModalityFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  modalityFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Todas ({totalCount + alumnasBarre.length})
              </button>

              <button
                onClick={() => setModalityFilter('REFORMER')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalityFilter === 'REFORMER'
                    ? 'bg-[var(--color-wood)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Reformer ({totalCount})
              </button>

              <button
                onClick={() => setModalityFilter('BARRE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalityFilter === 'BARRE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Image src="/media/berre.webp" alt="Barre" width={14} height={14} className="h-3.5 w-3.5 object-contain" />
                Barre ({alumnasBarre.length})
              </button>
            </div>

            {/* Buscador & Estado */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <Input
                  placeholder="Buscar por nombre, DNI o tel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Activas</option>
                <option value="INACTIVE">Inactivas</option>
                <option value="SUSPENDED">Suspendidas</option>
              </select>
            </div>
          </Card>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-[var(--text-muted)]">Cargando alumnas por modalidad...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sección 1: Alumnas Reformer */}
              {displayReformerList && (
                <Card className="p-6 border border-[var(--border-default)] shadow-xs">
                  <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 mb-4">
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Layers className="h-5 w-5 text-[var(--color-wood)]" /> Alumnas de Pilates Reformer ({alumnas.length})
                    </h3>
                  </div>

                  {alumnas.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                      No se encontraron alumnas de Reformer con el filtro seleccionado.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                            <th className="py-3 px-4 font-semibold">Alumna</th>
                            <th className="py-3 px-4 font-semibold">DNI / Teléfono</th>
                            <th className="py-3 px-4 font-semibold">Plan Actual</th>
                            <th className="py-3 px-4 font-semibold">Vencimiento</th>
                            <th className="py-3 px-4 font-semibold">Estado</th>
                            <th className="py-3 px-4 font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                          {alumnas.map((a) => (
                            <tr key={a.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold capitalize">
                                {a.first_name} {a.last_name || ''}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                                {a.phone} {a.dni ? `· DNI ${a.dni}` : ''}
                              </td>
                              <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                                {a.plan || 'Sin plan asignado'}
                              </td>
                              <td className="py-3.5 px-4">{getVencimientoCell(a.billing_due_date)}</td>
                              <td className="py-3.5 px-4">
                                {a.status === 'ACTIVE' ? (
                                  <Badge variant="success">Activa</Badge>
                                ) : a.status === 'INACTIVE' ? (
                                  <Badge variant="muted">Inactiva</Badge>
                                ) : (
                                  <Badge variant="warning">Suspendida</Badge>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedAlumna(a);
                                      setIsDetailOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)]/20 text-[var(--text-secondary)] hover:text-[var(--color-wood)] transition-colors cursor-pointer"
                                    title="Ver Ficha Completa"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAlumna(a);
                                      setIsFormOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-blue-500/20 text-[var(--text-secondary)] hover:text-blue-500 transition-colors cursor-pointer"
                                    title="Editar Alumna"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Sección 2: Alumnas Barre */}
              {displayBarreList && (
                <Card className="p-6 border border-[var(--border-default)] shadow-xs">
                  <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 mb-4">
                    <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Image src="/media/berre.webp" alt="Barre" width={20} height={20} className="h-5 w-5 object-contain" />
                      Alumnas de Studio Barre ({alumnasBarre.length})
                    </h3>
                  </div>

                  {alumnasBarre.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                      No hay alumnas registradas en Studio Barre.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                            <th className="py-3 px-4 font-semibold">Alumna Barre</th>
                            <th className="py-3 px-4 font-semibold">Plan Barre</th>
                            <th className="py-3 px-4 font-semibold">Mensualidad</th>
                            <th className="py-3 px-4 font-semibold">Vencimiento</th>
                            <th className="py-3 px-4 font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                          {alumnasBarre.map((b) => (
                            <tr key={b.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold capitalize">{b.alumna_name}</td>
                              <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">{b.plan_name}</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                                ${b.monthly_fee.toLocaleString()} ARS
                              </td>
                              <td className="py-3.5 px-4 font-mono">{b.due_date}</td>
                              <td className="py-3.5 px-4">
                                {b.status === 'ACTIVE' ? (
                                  <Badge variant="success">Activa</Badge>
                                ) : (
                                  <Badge variant="muted">Inactiva</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {isFormOpen && selectedAlumna && (
        <AlumnaFormModal
          isOpen={isFormOpen}
          alumnaToEdit={selectedAlumna}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedAlumna(null);
          }}
          onSubmit={async (data) => {
            await handleUpdateAlumna(selectedAlumna.id, data);
            return true;
          }}
          loading={submitting}
        />
      )}

      {isDetailOpen && selectedAlumna && (
        <AlumnaDetailModal
          isOpen={isDetailOpen}
          alumna={selectedAlumna}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedAlumna(null);
          }}
          onEdit={(a) => {
            setSelectedAlumna(a);
            setIsDetailOpen(false);
            setIsFormOpen(true);
          }}
        />
      )}

      {isTurnoModalOpen && selectedAlumna && (
        <AsignarTurnoFijoModal
          isOpen={isTurnoModalOpen}
          alumna={selectedAlumna}
          onClose={() => {
            setIsTurnoModalOpen(false);
            setSelectedAlumna(null);
          }}
          onAssign={handleAssignTurnoFijo}
          loading={submitting}
        />
      )}
    </div>
  );
}
