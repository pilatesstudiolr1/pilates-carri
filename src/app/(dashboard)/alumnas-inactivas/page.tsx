'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { AlumnaDetailModal } from '@/components/alumnas/AlumnaDetailModal';
import { Alumna } from '@/types/database';
import { getAlumnas, reactivarAlumna, deleteAlumna } from '@/lib/services/alumnas';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import { useSede } from '@/hooks/useSede';
import { formatFechaArg } from '@/lib/utils';
import {
  UserX,
  Search,
  RotateCcw,
  Trash2,
  Eye,
  ArrowLeft,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const ITEMS_PER_PAGE = 25;

export default function AlumnasInactivasPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const toast = useToast();
  const { selectedSedeId, sedes } = useSede();

  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal de detalle
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Estados de carga de acciones
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchInactivas = useCallback(async () => {
    setLoading(true);
    const res = await getAlumnas({
      status: 'INACTIVE',
      search: search || undefined,
      sedeId: selectedSedeId && selectedSedeId !== 'ALL' ? selectedSedeId : undefined,
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    });

    setAlumnas(res.data || []);
    setTotalCount(res.count || 0);
    setLoading(false);
  }, [search, selectedSedeId, currentPage]);

  useEffect(() => {
    fetchInactivas();
  }, [fetchInactivas]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedSedeId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // Reactivar Alumna
  const handleReactivar = async (alumna: Alumna) => {
    const isOk = await confirm({
      title: 'Reactivar Alumna',
      message: `¿Deseas reactivar a ${alumna.first_name} ${alumna.last_name || ''}? Volverá a estar Activa en el módulo general conservando todo su historial clínico y de pagos.`,
      confirmText: 'Sí, reactivar alumna',
      variant: 'success',
    });
    if (!isOk) return;

    setActionLoadingId(alumna.id);
    const { error } = await reactivarAlumna(alumna.id);
    setActionLoadingId(null);

    if (error) {
      toast.error(`Error al reactivar alumna: ${error}`, 'Error');
    } else {
      toast.success(`${alumna.first_name} ha sido reactivada correctamente.`, 'Alumna Reactivada');
      setIsDetailOpen(false);
      fetchInactivas();
    }
  };

  // Eliminar definitivamente
  const handleDeleteDefinitivo = async (alumna: Alumna) => {
    const isOk = await confirm({
      title: 'Eliminar Alumna Definitivamente',
      message: `⚠️ ATENCIÓN: Esta acción eliminará por completo el legajo de ${alumna.first_name} ${alumna.last_name || ''} y no se puede deshacer. ¿Deseas proceder?`,
      confirmText: 'Sí, eliminar definitivamente',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!isOk) return;

    setActionLoadingId(alumna.id);
    const { error } = await deleteAlumna(alumna.id);
    setActionLoadingId(null);

    if (error) {
      toast.error(`Error al eliminar: ${error}`, 'Error');
    } else {
      toast.success('Alumna eliminada definitivamente del sistema.', 'Eliminada');
      setIsDetailOpen(false);
      fetchInactivas();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* 1. ENCABEZADO Y ACCIONES DE NAVEGACIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/alumnas"
              className="p-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors inline-flex items-center justify-center"
              title="Volver a Alumnas Activas"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Alumnas Inactivas
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Registro histórico de bajas temporales o definitivas con opción de reactivación
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/alumnas">
            <Button variant="secondary" size="sm" icon={<Users className="h-4 w-4" />}>
              Ver Alumnas Activas
            </Button>
          </Link>
        </div>
      </div>


      {/* 2. PANEL DE FILTRADO Y BÚSQUEDA */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Buscar inactiva por nombre, apellido, DNI o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-xs sm:text-sm w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
          <span>
            Mostrando <strong>{alumnas.length}</strong> de <strong>{totalCount}</strong> alumnas en estado de baja
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[var(--text-primary)] hover:underline font-semibold cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {/* 3. TABLA DE ALUMNAS INACTIVAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[var(--bg-secondary)] rounded-[14px] border border-[var(--border-default)]">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-secondary)]">Cargando alumnas inactivas...</p>
        </div>
      ) : alumnas.length === 0 ? (
        <div className="p-12 text-center bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 flex items-center justify-center mx-auto">
            <UserX className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No hay alumnas inactivas</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            {search
              ? 'No se encontraron registros con los términos de búsqueda ingresados.'
              : 'Actualmente todas las alumnas registradas se encuentran en estado activo o suspendido.'}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserX className="h-5 w-5 text-rose-500" /> Bajas Registradas ({totalCount})
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">
              Página {currentPage} de {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  <th className="py-3 px-4 font-semibold">Alumna</th>
                  <th className="py-3 px-4 font-semibold">DNI / Teléfono</th>
                  <th className="py-3 px-4 font-semibold">Fecha de Baja</th>
                  <th className="py-3 px-4 font-semibold">Motivo de Baja</th>
                  <th className="py-3 px-4 font-semibold">Último Plan</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {alumnas.map((a) => (
                  <tr key={a.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-3.5 px-4 font-bold capitalize text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {a.first_name[0] || 'A'}
                        </div>
                        <div>
                          <p className="leading-tight">
                            {a.first_name} {a.last_name || ''}
                          </p>
                          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            Inactiva
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                      <p>{a.phone || 'Sin teléfono'}</p>
                      {a.dni && <span className="text-[11px] opacity-75">DNI {a.dni}</span>}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                      {a.exit_date ? formatFechaArg(a.exit_date) : (a.updated_at ? formatFechaArg(a.updated_at) : 'No registrada')}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)] max-w-xs truncate">
                      <span className="italic text-xs">
                        {a.exit_reason || 'Baja temporal / Inactiva'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                      {a.plan || 'Sin plan'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reactivar */}
                        <button
                          onClick={() => handleReactivar(a)}
                          disabled={actionLoadingId === a.id}
                          className="px-2.5 py-1.5 rounded-[8px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Reactivar Alumna"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reactivar</span>
                        </button>

                        {/* Ver Ficha */}
                        <button
                          onClick={() => {
                            setSelectedAlumna(a);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 rounded-[8px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
                          title="Ver Ficha y Ficha Médica"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Eliminar Definitivamente */}
                        <button
                          onClick={() => handleDeleteDefinitivo(a)}
                          disabled={actionLoadingId === a.id}
                          className="p-1.5 rounded-[8px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                          title="Eliminar Definitivamente del Sistema"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE FICHA DETALLADA (Lectura / Ficha Médica / Historial) */}
      <AlumnaDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAlumna(null);
        }}
        alumna={selectedAlumna}
        onReactivar={(alum) => handleReactivar(alum)}
        onDelete={(alum) => handleDeleteDefinitivo(alum)}
      />
    </div>
  );
}
