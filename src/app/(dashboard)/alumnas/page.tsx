'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { AlumnaFormModal } from '@/components/alumnas/AlumnaFormModal';
import { AlumnaDetailModal } from '@/components/alumnas/AlumnaDetailModal';
import { AsignarTurnoFijoModal } from '@/components/alumnas/AsignarTurnoFijoModal';
import { NuevaAlumnaForm } from '@/components/alumnas/NuevaAlumnaForm';
import { Alumna, AlumnaInsert, AlumnaStatus, MetodoPago } from '@/types/database';
import { getAlumnas, updateAlumna, createAlumna, deleteAlumna } from '@/lib/services/alumnas';
import { addAlumnaToClase } from '@/lib/services/agenda';
import { registrarPago } from '@/lib/services/pagos';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useUser } from '@/hooks/useUser';
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

const ITEMS_PER_PAGE = 30;

function getVencimientoCell(fechaVencimiento: string | null) {
  if (!fechaVencimiento) {
    return <span className="text-[var(--text-muted)] text-[11px] font-medium">Sin fecha</span>;
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[22px] text-[11px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        <AlertTriangle className="h-3 w-3" />
        Vencida ({fechaVencimiento})
      </span>
    );
  }
  if (diffDias <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[22px] text-[11px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        <Clock className="h-3 w-3" />
        {diffDias === 0 ? 'Vence hoy' : `${diffDias}d`} ({fechaVencimiento})
      </span>
    );
  }
  return (
    <span className="text-xs font-bold text-[var(--text-primary)] font-mono tracking-tight">
      {fechaVencimiento}
    </span>
  );
}

function AlumnasPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const { confirm, alert: alertDialog } = useConfirm();
  const { profile } = useUser();
  const isProfesora = profile?.role === 'PROFESORA';

  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>(() => {
    return tabParam === 'new' ? 'NEW' : 'LIST';
  });

  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlumnaStatus | 'ALL'>('ALL');
  const [vencimientoFilter, setVencimientoFilter] = useState<'ALL' | 'OVERDUE' | 'UPCOMING'>('ALL');

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [alumnaToEdit, setAlumnaToEdit] = useState<Alumna | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tabParam === 'new') {
      setActiveTab('NEW');
    } else {
      setActiveTab('LIST');
    }
  }, [tabParam]);

  const fetchAlumnas = useCallback(async () => {
    setLoading(true);

    const refRes = await getAlumnas({
      search: search || undefined,
      status: statusFilter,
      vencimientoFilter,
      profesoraId: isProfesora && profile?.id ? profile.id : undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    });

    setAlumnas(refRes.data || []);
    setTotalCount(refRes.count || 0);
    setLoading(false);
  }, [search, statusFilter, vencimientoFilter, currentPage, isProfesora, profile?.id]);

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

  const handleSaveAlumnaModal = async (data: AlumnaInsert) => {
    setSubmitting(true);
    if (selectedAlumna) {
      const { error } = await updateAlumna(selectedAlumna.id, data);
      setSubmitting(false);
      if (error) {
        await alertDialog({ title: 'Error al guardar', message: error, variant: 'danger' });
        return false;
      }
    } else {
      const { data: created, error } = await createAlumna(data);
      setSubmitting(false);
      if (error || !created) {
        await alertDialog({ title: 'Error al crear', message: error || 'Error al registrar la alumna', variant: 'danger' });
        return false;
      }

      // Si se marcó cobrar inscripción inicial
      if (data.enrollment_paid && data.enrollment_amount) {
        try {
          await registrarPago({
            alumna_id: created.id,
            amount: data.enrollment_amount,
            payment_method: (data.preferred_payment_method as MetodoPago) || 'efectivo',
            payment_type: 'INSCRIPCION',
            concept: 'Inscripción inicial',
            sede_id: data.sede_id || undefined,
          });
        } catch (pagoErr) {
          console.error('Error al registrar cobro de inscripción:', pagoErr);
        }
      }
    }

    setIsFormOpen(false);
    setSelectedAlumna(null);
    fetchAlumnas();
    return true;
  };

  const handleDeleteAlumna = async (alumna: Alumna) => {
    const isOk = await confirm({
      title: 'Eliminar Alumna',
      message: `¿Estás segura de eliminar a ${alumna.first_name} ${alumna.last_name || ''} del sistema? Esta acción no se puede deshacer y también la quitará de todos los turnos asignados.`,
      confirmText: 'Sí, eliminar',
      variant: 'danger',
    });
    if (!isOk) return;

    const { error } = await deleteAlumna(alumna.id);
    if (error) {
      await alertDialog({ title: 'Error al eliminar', message: error, variant: 'danger' });
    } else {
      await alertDialog({ title: 'Alumna eliminada', message: `${alumna.first_name} ${alumna.last_name || ''} fue eliminada del sistema correctamente.`, variant: 'success' });
      fetchAlumnas();
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16 max-w-[var(--page-max-width)] mx-auto text-[var(--text-primary)]">
      {/* 1. ENCABEZADO Y ACCIÓN RÁPIDA A CREAR ALUMNA */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-meadow text-[11px] font-medium px-3 py-0.5 uppercase">
              Pilates Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Gestión de Alumnas
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Registro de fichas, estado de cuotas y asignación de turnos de Reformer.
          </p>
        </div>

        {/* BOTÓN TRANQUILIZADOR Y VISIBLE: NUEVA ALUMNA */}
        <div className="flex items-center gap-3">
          {activeTab === 'NEW' ? (
            <Button
              variant="secondary"
              icon={<List className="h-4 w-4" />}
              onClick={() => {
                setSelectedAlumna(null);
                setActiveTab('LIST');
              }}
            >
              Volver al Listado
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setSelectedAlumna(null);
                setActiveTab('NEW');
              }}
            >
              Nueva Alumna
            </Button>
          )}

          <div className="flex items-center bg-[var(--bg-secondary)] p-1 rounded-[29px] border border-[var(--border-default)]">
            <button
              onClick={() => {
                setSelectedAlumna(null);
                setActiveTab('LIST');
              }}
              className={`px-3.5 py-1.5 rounded-[29px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Listado
            </button>
            <button
              onClick={() => {
                setSelectedAlumna(null);
                setActiveTab('NEW');
              }}
              className={`px-3.5 py-1.5 rounded-[29px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'NEW'
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Formulario
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'NEW' ? (
        /* Pestaña: Registro y Edición de Alumna Completo */
        <div className="w-full max-w-6xl mx-auto">
          <NuevaAlumnaForm
            alumnaToEdit={selectedAlumna}
            onCancel={() => {
              setSelectedAlumna(null);
              setActiveTab('LIST');
            }}
            onSuccess={() => {
              setSelectedAlumna(null);
              setActiveTab('LIST');
              fetchAlumnas();
            }}
          />
        </div>
      ) : (
        /* Pestaña: Listado de Alumnas con Filtros Interactivos */
        <div className="flex flex-col gap-4">
          {/* 2. PANEL DE BÚSQUEDA Y BOTONES DE FILTRADO INTERACTIVOS */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-5 shadow-sm space-y-4">
            {/* Fila Superior: Buscador */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Buscar por nombre, apellido, DNI o teléfono..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 text-xs sm:text-sm w-full"
              />
            </div>

            {/* Fila Inferior: Botones Interactivos de Filtrado */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-[var(--border-default)]">
              {/* Botones de Estado: Activas, Inactivas, Suspendidas */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">
                  Estado:
                </span>
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${statusFilter === 'ALL' ? 'filter-pill-active' : ''}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('ACTIVE');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${statusFilter === 'ACTIVE' ? 'filter-pill-active-success' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusFilter === 'ACTIVE' ? 'bg-white' : 'bg-emerald-500'}`} />
                  Activas
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('INACTIVE');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${statusFilter === 'INACTIVE' ? 'filter-pill-active-muted' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusFilter === 'INACTIVE' ? 'bg-white' : 'bg-slate-400'}`} />
                  Inactivas
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('SUSPENDED');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${statusFilter === 'SUSPENDED' ? 'filter-pill-active-warning' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusFilter === 'SUSPENDED' ? 'bg-white' : 'bg-amber-500'}`} />
                  Suspendidas
                </button>
              </div>

              {/* Botones de Referencia: Vencimientos & Cuotas */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">
                  Vencimiento:
                </span>
                <button
                  onClick={() => {
                    setVencimientoFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${vencimientoFilter === 'ALL' ? 'filter-pill-active' : ''}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    setVencimientoFilter('OVERDUE');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${vencimientoFilter === 'OVERDUE' ? 'filter-pill-active-danger' : ''}`}
                >
                  <AlertTriangle className={`h-3.5 w-3.5 ${vencimientoFilter === 'OVERDUE' ? 'text-white' : 'text-rose-500'}`} />
                  Cuotas Vencidas
                </button>
                <button
                  onClick={() => {
                    setVencimientoFilter('UPCOMING');
                    setCurrentPage(1);
                  }}
                  className={`filter-pill ${vencimientoFilter === 'UPCOMING' ? 'filter-pill-active-warning' : ''}`}
                >
                  <Clock className={`h-3.5 w-3.5 ${vencimientoFilter === 'UPCOMING' ? 'text-white' : 'text-amber-500'}`} />
                  Vencen en 7 días
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[var(--bg-secondary)] rounded-[14px] border border-[var(--border-default)]">
              <Spinner size="lg" />
              <p className="text-xs text-[var(--text-secondary)]">Cargando listado de alumnas...</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="h-5 w-5 text-[var(--badge-meadow-text)]" /> Listado de Alumnas ({totalCount})
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">
                  Página {currentPage} de {totalPages} (30 por página)
                </span>
              </div>

              {alumnas.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-12 text-center">
                  No se encontraron alumnas con los filtros seleccionados.
                </p>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                        <th className="py-3 px-4 font-semibold">Alumna</th>
                        <th className="py-3 px-4 font-semibold">DNI / Teléfono</th>
                        <th className="py-3 px-4 font-semibold">Plan Actual</th>
                        <th className="py-3 px-4 font-bold text-[var(--text-primary)]">Vencimiento</th>
                        <th className="py-3 px-4 font-semibold">Estado</th>
                        <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                      {alumnas.map((a) => (
                        <tr key={a.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                          <td className="py-3.5 px-4 font-bold capitalize text-sm">
                            {a.first_name} {a.last_name || ''}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                            {a.phone} {a.dni ? `· DNI ${a.dni}` : ''}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                            {a.plan || 'Sin plan asignado'}
                          </td>
                          <td className="py-3.5 px-4 font-bold">{getVencimientoCell(a.billing_due_date)}</td>
                          <td className="py-3.5 px-4">
                            {a.status === 'ACTIVE' ? (
                              <span className="px-2.5 py-0.5 rounded-[22px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/30">
                                Activa
                              </span>
                            ) : a.status === 'INACTIVE' ? (
                              <span className="px-2.5 py-0.5 rounded-[22px] bg-slate-500/15 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-500/30">
                                Inactiva
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-[22px] bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-medium border border-amber-500/30">
                                Suspendida
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedAlumna(a);
                                  setIsDetailOpen(true);
                                }}
                                className="p-2 rounded-[8px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
                                title="Ver Ficha Completa"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAlumna(a);
                                  setActiveTab('NEW');
                                }}
                                className="p-2 rounded-[8px] bg-[var(--bg-tertiary)] hover:bg-blue-500/20 text-[var(--text-secondary)] hover:text-blue-500 border border-[var(--border-default)] transition-colors cursor-pointer"
                                title="Editar Alumna"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAlumna(a)}
                                className="p-2 rounded-[8px] bg-[var(--bg-tertiary)] hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--border-default)] transition-colors cursor-pointer"
                                title="Eliminar Alumna"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Barra de Paginación */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-default)]">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Mostrando <strong className="text-[var(--text-primary)] font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a{' '}
                    <strong className="text-[var(--text-primary)] font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</strong> de{' '}
                    <strong className="text-[var(--text-primary)] font-bold">{totalCount}</strong> alumnas
                  </p>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      icon={<ChevronLeft className="h-4 w-4" />}
                    >
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => {
                          const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                          return (
                            <div key={p} className="flex items-center">
                              {showEllipsis && <span className="px-1 text-xs text-[var(--text-muted)]">...</span>}
                              <button
                                onClick={() => setCurrentPage(p)}
                                className={`w-8 h-8 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                                  currentPage === p
                                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                                }`}
                              >
                                {p}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      icon={<ChevronRight className="h-4 w-4" />}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {isFormOpen && (
        <AlumnaFormModal
          isOpen={isFormOpen}
          alumnaToEdit={selectedAlumna}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedAlumna(null);
          }}
          onSubmit={handleSaveAlumnaModal}
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
            setActiveTab('NEW');
          }}
          onDelete={(a) => {
            setIsDetailOpen(false);
            setSelectedAlumna(null);
            handleDeleteAlumna(a);
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

export default function AlumnasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)]">Cargando alumnas...</div>}>
      <AlumnasPageContent />
    </Suspense>
  );
}
