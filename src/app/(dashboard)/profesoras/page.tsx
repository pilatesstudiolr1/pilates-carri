'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ProfesorFormModal } from '@/components/profesoras/ProfesorFormModal';
import { Profile, ProfileUpdate, UserRole } from '@/types/database';
import { getProfiles, updateProfileData, toggleProfileActive } from '@/lib/services/profesoras';
import {
  GraduationCap,
  Search,
  Filter,
  Edit2,
  Phone,
  Mail,
  ShieldCheck,
  Percent,
  UserCheck,
  UserX,
  Plus,
} from 'lucide-react';

export default function ProfesorasPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [activeFilter, setActiveFilter] = useState<boolean | 'ALL'>('ALL');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await getProfiles({
      role: roleFilter,
      isActive: activeFilter,
      search,
    });

    if (error) {
      setErrorMsg(error);
    } else {
      setProfiles(data);
    }
    setLoading(false);
  }, [roleFilter, activeFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfiles();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProfiles]);

  const handleUpdate = async (id: string, updateData: ProfileUpdate): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await updateProfileData(id, updateData);
    setSubmitting(false);

    if (error) {
      alert(`Error al actualizar el usuario: ${error}`);
      return false;
    }

    fetchProfiles();
    return true;
  };

  const handleToggleStatus = async (profile: Profile) => {
    const nextState = !profile.is_active;
    const confirmMsg = nextState
      ? `¿Reactivar la cuenta de ${profile.full_name}?`
      : `¿Desactivar la cuenta de ${profile.full_name}? El usuario no podrá acceder al sistema.`;

    if (!confirm(confirmMsg)) return;

    const { error } = await toggleProfileActive(profile.id, nextState);
    if (error) {
      alert(`Error al modificar estado: ${error}`);
    } else {
      fetchProfiles();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[var(--color-wood)]" /> Gestión de Profesoras y Usuarios
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Administra los roles, comisiones, datos de contacto y acceso del personal ({profiles.length} usuarios)
          </p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <Input
            placeholder="Buscar por nombre, correo o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="h-3.5 w-3.5" /> Rol:
          </span>
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              roleFilter === 'ALL'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              roleFilter === 'ADMIN'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Administradas
          </button>
          <button
            onClick={() => setRoleFilter('PROFESORA')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              roleFilter === 'PROFESORA'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Profesoras
          </button>

          <span className="text-xs text-[var(--text-muted)] ml-2 mr-1">Estado:</span>
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveFilter(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              activeFilter === true
                ? 'bg-[var(--color-wood)] text-[var(--color-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Activos
          </button>
        </div>
      </Card>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Lista de Usuarios */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando lista de usuarios...</p>
        </div>
      ) : profiles.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No se encontraron usuarios
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {search ? 'No hay perfiles que coincidan con la búsqueda.' : 'No hay usuarios registrados aún.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className="p-5 flex flex-col justify-between gap-4 border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-wood)]/20 border border-[var(--color-wood)]/40 flex items-center justify-center text-[var(--color-wood)] font-bold text-sm">
                      {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug">
                        {profile.full_name || 'Sin Nombre'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {profile.role === 'ADMIN' ? (
                          <Badge variant="warning">Administradora</Badge>
                        ) : (
                          <Badge variant="default">Profesora</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge variant={profile.is_active ? 'success' : 'danger'}>
                    {profile.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                {/* Contact & Info */}
                <div className="space-y-1.5 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-default)]">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                    <span>{profile.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                    <span>Comisión por turno: <strong>{((profile.commission_rate ?? 0.4) * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedProfile(profile);
                    setIsModalOpen(true);
                  }}
                  icon={<Edit2 className="h-3.5 w-3.5" />}
                >
                  Editar Perfil
                </Button>

                {profile.is_active ? (
                  <button
                    onClick={() => handleToggleStatus(profile)}
                    title="Desactivar cuenta"
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleStatus(profile)}
                    title="Reactivar cuenta"
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-success)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de edición de perfil */}
      <ProfesorFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpdate}
        profileToEdit={selectedProfile}
        loading={submitting}
      />
    </div>
  );
}
