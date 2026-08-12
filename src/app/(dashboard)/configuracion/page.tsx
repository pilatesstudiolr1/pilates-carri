'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { SedeFormModal } from '@/components/configuracion/SedeFormModal';
import { PlanFormModal } from '@/components/configuracion/PlanFormModal';
import { Sede } from '@/types/database';
import { getSedes, createSede, updateSede } from '@/lib/services/sedes';
import { getPlanes, createPlan, updatePlan, togglePlanActive, deletePlan, PlanItem } from '@/lib/services/planes';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Settings, Building2, MapPin, Phone, BedDouble, Edit2, Plus, Percent, Shield, Save, Tag, Power, Trash2, Calendar } from 'lucide-react';

export default function ConfiguracionPage() {
  const { confirm, alert: alertDialog } = useConfirm();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(true);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Parámetros generales
  const [nombreEstudio, setNombreEstudio] = useState('Pilates Studio LR');
  const [comisionDefault, setComisionDefault] = useState('40');
  const [maxCupo, setMaxCupo] = useState('6');
  const [savedParams, setSavedParams] = useState(false);

  // Modal Sedes
  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);

  // Modal Planes
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingSedes(true);
    setLoadingPlanes(true);
    setErrorMsg('');

    const [sedesRes, planesRes] = await Promise.all([
      getSedes({ isActive: 'ALL' }),
      getPlanes(),
    ]);

    if (sedesRes.error) {
      setErrorMsg(sedesRes.error);
    } else {
      setSedes(sedesRes.data);
    }

    setPlanes(planesRes.data);
    setLoadingSedes(false);
    setLoadingPlanes(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedParams(true);
    setTimeout(() => setSavedParams(false), 3000);
  };

  const handleCreateOrUpdateSede = async (sedeData: {
    name: string;
    address: string | null;
    phone: string | null;
    max_camillas: number;
    is_active?: boolean;
  }): Promise<boolean> => {
    setSubmitting(true);
    if (selectedSede) {
      const { error } = await updateSede(selectedSede.id, sedeData);
      if (error) {
        await alertDialog({
          title: 'Error de Sede',
          message: `Error al actualizar la sede: ${error}`,
          variant: 'danger',
        });
        setSubmitting(false);
        return false;
      }
    } else {
      const { error } = await createSede(sedeData);
      if (error) {
        await alertDialog({
          title: 'Error de Sede',
          message: `Error al crear la sede: ${error}`,
          variant: 'danger',
        });
        setSubmitting(false);
        return false;
      }
    }
    setSubmitting(false);
    fetchData();
    return true;
  };

  const handleCreateOrUpdatePlan = async (planData: {
    name: string;
    weekly_classes: number;
    price: number;
    description?: string;
    is_active?: boolean;
  }): Promise<boolean> => {
    setSubmitting(true);
    if (selectedPlan) {
      const { error } = await updatePlan(selectedPlan.id, planData);
      if (error) {
        await alertDialog({
          title: 'Error de Plan',
          message: `Error al actualizar el plan: ${error}`,
          variant: 'danger',
        });
        setSubmitting(false);
        return false;
      }
    } else {
      const { error } = await createPlan(planData);
      if (error) {
        await alertDialog({
          title: 'Error de Plan',
          message: `Error al crear el plan: ${error}`,
          variant: 'danger',
        });
        setSubmitting(false);
        return false;
      }
    }
    setSubmitting(false);
    fetchData();
    return true;
  };

  const handleTogglePlan = async (plan: PlanItem) => {
    const nextState = !plan.is_active;
    const confirmTitle = nextState ? 'Reactivar plan' : 'Desactivar plan';
    const confirmMsg = nextState
      ? `¿Desea reactivar el plan ${plan.name}?`
      : `¿Desea desactivar el plan ${plan.name}? No aparecerá en la selección de nuevas alumnas.`;

    const isOk = await confirm({
      title: confirmTitle,
      message: confirmMsg,
      confirmText: nextState ? 'Reactivar' : 'Desactivar',
      variant: 'warning',
    });
    if (!isOk) return;

    const { error } = await togglePlanActive(plan.id, nextState);
    if (error) {
      await alertDialog({
        title: 'Error de Plan',
        message: `Error al modificar estado del plan: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchData();
    }
  };

  const handleDeletePlanConfirm = async (plan: PlanItem) => {
    const isOk = await confirm({
      title: 'Eliminar plan de suscripción',
      message: `¿Estás seguro de eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      variant: 'danger',
    });
    if (!isOk) return;

    const { error } = await deletePlan(plan.id);
    if (error) {
      await alertDialog({
        title: 'Error de eliminación',
        message: `Error al eliminar el plan: ${error}`,
        variant: 'danger',
      });
    } else {
      fetchData();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Settings className="h-6 w-6 text-[var(--color-wood)]" /> Configuración General y Planes
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Administración de sedes, catálogo de planes y reglas generales de negocio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedPlan(null);
              setIsPlanModalOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            Nuevo Plan
          </Button>
          <Button
            onClick={() => {
              setSelectedSede(null);
              setIsSedeModalOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            Nueva Sede
          </Button>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Sección 1: Gestión de Planes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Tag className="h-5 w-5 text-[var(--color-wood)]" /> Catálogo de Planes ({planes.length})
          </h2>
        </div>

        {loadingPlanes ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Spinner size="md" />
            <span className="text-xs text-[var(--text-muted)]">Cargando planes...</span>
          </div>
        ) : planes.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[var(--text-muted)]">
            No se han registrado planes en el sistema.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {planes.map((plan) => (
              <Card
                key={plan.id}
                className="p-5 flex flex-col justify-between gap-4 border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-[var(--text-primary)] text-sm">{plan.name}</h3>
                    <Badge variant={plan.is_active ? 'success' : 'danger'}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <p className="text-2xl font-black text-[var(--color-wood)] mb-2">
                    ${plan.price.toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">/ mes</span>
                  </p>

                  <div className="space-y-1 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-default)]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                      <span>Frecuencia: <strong>{plan.weekly_classes} veces por semana</strong></span>
                    </div>
                    {plan.description && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{plan.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setIsPlanModalOpen(true);
                    }}
                    icon={<Edit2 className="h-3.5 w-3.5" />}
                  >
                    Editar
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePlan(plan)}
                      title={plan.is_active ? 'Desactivar plan' : 'Reactivar plan'}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-wood)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    >
                      <Power className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeletePlanConfirm(plan)}
                      title="Eliminar plan"
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sección 2: Gestión de Sedes */}
      <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--color-wood)]" /> Sedes del Estudio ({sedes.length})
          </h2>
        </div>

        {loadingSedes ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Spinner size="md" />
            <span className="text-xs text-[var(--text-muted)]">Cargando sedes desde la base de datos...</span>
          </div>
        ) : sedes.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[var(--text-muted)]">
            No se han registrado sedes en el sistema.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedes.map((sede) => (
              <Card
                key={sede.id}
                className="p-5 flex flex-col justify-between gap-4 border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-wood)]/15 border border-[var(--color-wood)]/30 flex items-center justify-center text-[var(--color-wood)] font-bold text-sm shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">{sede.name}</h3>
                        <Badge variant={sede.is_active ? 'success' : 'danger'} className="mt-0.5">
                          {sede.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-default)]">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                      <span className="truncate">{sede.address || 'Sin dirección registrada'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                      <span>{sede.phone || 'Sin teléfono registrado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-3.5 w-3.5 text-[var(--color-wood)] shrink-0" />
                      <span>Capacidad máxima: <strong>{sede.max_camillas} camillas Reformer</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[var(--border-default)]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSede(sede);
                      setIsSedeModalOpen(true);
                    }}
                    icon={<Edit2 className="h-3.5 w-3.5" />}
                  >
                    Editar Sede
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sección 3: Parámetros Generales */}
      <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--color-wood)]" /> Parámetros Globales
        </h2>

        <Card className="p-6 max-w-2xl">
          <form onSubmit={handleSaveParams} className="flex flex-col gap-4">
            {savedParams && (
              <div className="p-3 rounded-md bg-[var(--color-success-soft)] text-xs text-[var(--color-success)] font-semibold">
                Configuración guardada exitosamente.
              </div>
            )}

            <Input
              label="Nombre Comercial del Estudio *"
              value={nombreEstudio}
              onChange={(e) => setNombreEstudio(e.target.value)}
              icon={<Building2 className="h-4 w-4" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Comisión Profesora Por Defecto (%)"
                type="number"
                value={comisionDefault}
                onChange={(e) => setComisionDefault(e.target.value)}
                icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
                hint="Porcentaje asignado por cobro a profesora"
              />

              <Input
                label="Cupo Máximo Reformer Por Clase"
                type="number"
                min="4"
                max="6"
                value={maxCupo}
                onChange={(e) => setMaxCupo(e.target.value)}
                icon={<Shield className="h-4 w-4 text-[var(--color-wood)]" />}
                hint="Capacidad entre 4 y 6 alumnas"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
              <Button type="submit" icon={<Save className="h-4 w-4" />}>
                Guardar Parámetros
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Modales */}
      <SedeFormModal
        open={isSedeModalOpen}
        onClose={() => setIsSedeModalOpen(false)}
        onSubmit={handleCreateOrUpdateSede}
        sedeToEdit={selectedSede}
        loading={submitting}
      />

      <PlanFormModal
        open={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSubmit={handleCreateOrUpdatePlan}
        planToEdit={selectedPlan}
        loading={submitting}
      />
    </div>
  );
}
