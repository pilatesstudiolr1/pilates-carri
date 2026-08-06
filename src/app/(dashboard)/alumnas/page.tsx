'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { AlumnaFormModal } from '@/components/alumnas/AlumnaFormModal';
import { AlumnaDetailModal } from '@/components/alumnas/AlumnaDetailModal';
import { Alumna, AlumnaInsert, AlumnaStatus } from '@/types/database';
import { getAlumnas, createAlumna, updateAlumna, updateAlumnaStatus } from '@/lib/services/alumnas';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  UserCheck,
  UserX,
  AlertTriangle,
  Phone,
  Heart,
} from 'lucide-react';

export default function AlumnasPage() {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlumnaStatus | 'ALL'>('ALL');
  
  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAlumna, setSelectedAlumna] = useState<Alumna | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAlumnas = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, count, error } = await getAlumnas({
      search,
      status: statusFilter,
      limit: 100,
    });

    if (error) {
      setErrorMsg(error);
    } else {
      setAlumnas(data);
      setTotalCount(count);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlumnas();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAlumnas]);

  const handleCreateOrUpdate = async (data: AlumnaInsert): Promise<boolean> => {
    setSubmitting(true);
    if (selectedAlumna) {
      const { error } = await updateAlumna(selectedAlumna.id, data);
      if (error) {
        alert(`Error al actualizar: ${error}`);
        setSubmitting(false);
        return false;
      }
    } else {
      const { error } = await createAlumna(data);
      if (error) {
        alert(`Error al registrar: ${error}`);
        setSubmitting(false);
        return false;
      }
    }
    setSubmitting(false);
    fetchAlumnas();
    return true;
  };

  const handleStatusChange = async (alumna: Alumna, newStatus: AlumnaStatus) => {
    const confirmMsg = newStatus === 'INACTIVE'
      ? `¿Dar de baja a ${alumna.first_name} ${alumna.last_name}?`
      : `¿Cambiar estado de ${alumna.first_name} a ${newStatus}?`;

    if (!confirm(confirmMsg)) return;

    const { error } = await updateAlumnaStatus(alumna.id, newStatus);
    if (error) {
      alert(`Error al cambiar estado: ${error}`);
    } else {
      fetchAlumnas();
    }
  };

  const getStatusBadge = (status: AlumnaStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Activa</Badge>;
      case 'SUSPENDED':
        return <Badge variant="warning">Suspendida</Badge>;
      case 'INACTIVE':
        return <Badge variant="danger">Inactiva</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--color-wood)]" /> Gestión de Alumnas
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Administra las fichas médicas, contactos e inscripciones ({totalCount} registradas)
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedAlumna(null);
            setIsFormOpen(true);
          }}
          icon={<UserPlus className="h-4 w-4" />}
          size="lg"
        >
          Nueva Alumna
        </Button>
      </div>

      {/* Filtros y Buscador */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <Input
            placeholder="Buscar por nombre, DNI o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="h-3.5 w-3.5" /> Estado:
          </span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'SUSPENDED'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Suspendidas
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'INACTIVE'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Inactivas
          </button>
        </div>
      </Card>

      {/* Mensaje de error si falla Supabase */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/30 text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Tabla / Lista de Alumnas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando lista de alumnas...</p>
        </div>
      ) : alumnas.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No se encontraron alumnas
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm">
            {search
              ? 'No hay registros que coincidan con la búsqueda.'
              : 'Comienza registrando la primera alumna en el sistema.'}
          </p>
          {!search && (
            <Button
              onClick={() => {
                setSelectedAlumna(null);
                setIsFormOpen(true);
              }}
              size="sm"
              className="mt-2"
            >
              Registrar Alumna
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border border-[var(--border-default)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-3.5 px-4 font-semibold">Alumna</th>
                  <th className="py-3.5 px-4 font-semibold">DNI</th>
                  <th className="py-3.5 px-4 font-semibold">Contacto</th>
                  <th className="py-3.5 px-4 font-semibold">Ficha Médica</th>
                  <th className="py-3.5 px-4 font-semibold">Estado</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {alumnas.map((alumna) => (
                  <tr
                    key={alumna.id}
                    className="hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    {/* Alumna Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-wood)]/15 border border-[var(--color-wood)]/30 flex items-center justify-center text-[var(--color-wood)] font-bold text-xs shrink-0">
                          {alumna.first_name[0]}{alumna.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {alumna.first_name} {alumna.last_name}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Ingreso: {alumna.entry_date}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* DNI */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-mono text-xs">
                      {alumna.dni}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-xs">
                        <span className="text-[var(--text-primary)] flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[var(--color-wood)]" /> {alumna.phone}
                        </span>
                        {alumna.emergency_contact_phone && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Emergencia: {alumna.emergency_contact_phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Medical Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {alumna.injuries && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                            Lesión
                          </span>
                        )}
                        {alumna.is_pregnant && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            Embarazo
                          </span>
                        )}
                        {!alumna.injuries && !alumna.is_pregnant && (
                          <span className="text-xs text-[var(--text-muted)]">Sin observaciones</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(alumna.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedAlumna(alumna);
                            setIsDetailOpen(true);
                          }}
                          title="Ver Ficha Completa"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAlumna(alumna);
                            setIsFormOpen(true);
                          }}
                          title="Editar Alumna"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-wood)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {alumna.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(alumna, 'INACTIVE')}
                            title="Dar de baja"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(alumna, 'ACTIVE')}
                            title="Reactivar Alumna"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-success)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modales */}
      <AlumnaFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
        alumnaToEdit={selectedAlumna}
        loading={submitting}
      />

      <AlumnaDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        alumna={selectedAlumna}
        onEdit={(alumna) => {
          setSelectedAlumna(alumna);
          setIsFormOpen(true);
        }}
      />
    </div>
  );
}
