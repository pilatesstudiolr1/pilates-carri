'use client';

import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alumna } from '@/types/database';
import { User, Phone, Mail, MapPin, Heart, AlertCircle, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';

interface AlumnaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumna: Alumna | null;
  onEdit?: (alumna: Alumna) => void;
}

export function AlumnaDetailModal({
  isOpen,
  onClose,
  alumna,
  onEdit,
}: AlumnaDetailModalProps) {
  if (!alumna) return null;

  const getStatusBadge = (status: string) => {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha de ${alumna.first_name} ${alumna.last_name}`}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Cabecera y Estado Ficha Médica */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/20 border border-[var(--color-wood)]/40 flex items-center justify-center text-[var(--color-wood)] font-bold text-sm">
              {alumna.first_name[0]}{alumna.last_name[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {alumna.first_name} {alumna.last_name}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                DNI: {alumna.dni} &bull; Alta: {alumna.entry_date}
              </p>
            </div>
          </div>
          <div>{getStatusBadge(alumna.status)}</div>
        </div>

        {/* Ficha Médica Clínico / Antecedentes */}
        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
            <Heart className="h-4 w-4 text-[var(--color-wood)]" /> Ficha Médica & Antecedentes Clínicos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase block mb-1">Lesiones / Patologías</span>
              <p className="text-[var(--text-primary)] font-medium">
                {alumna.injuries || 'Ninguna patología registrada'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase block mb-1">Medicación Habitual</span>
              <p className="text-[var(--text-primary)] font-medium">
                {alumna.medication || 'Sin medicación informada'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              {alumna.is_pregnant ? (
                <CheckCircle className="h-4 w-4 text-[var(--color-warning)]" />
              ) : (
                <XCircle className="h-4 w-4 text-[var(--text-muted)]" />
              )}
              <span className="font-medium text-[var(--text-primary)]">Embarazo: <strong>{alumna.is_pregnant ? 'Sí' : 'No'}</strong></span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              {alumna.consent_signed ? (
                <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <XCircle className="h-4 w-4 text-[var(--color-danger)]" />
              )}
              <span className="font-medium text-[var(--text-primary)]">Consentimiento Informado: <strong>{alumna.consent_signed ? 'Firmado' : 'Pendiente'}</strong></span>
            </div>
          </div>
        </div>

        {/* Informacion de Contacto y Emergencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
              <User className="h-4 w-4" /> Contacto
            </h3>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Tel: <strong className="text-[var(--text-primary)]">{alumna.phone}</strong></p>
              <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Mail: <strong className="text-[var(--text-primary)] truncate">{alumna.email || 'No registrado'}</strong></p>
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Dir: <strong className="text-[var(--text-primary)]">{alumna.address || 'No registrada'}</strong></p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
              <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" /> Contacto de Emergencia
            </h3>
            <div className="text-xs space-y-1">
              <p className="text-[var(--text-primary)] font-bold">{alumna.emergency_contact_name || 'Sin contacto asignado'}</p>
              {alumna.emergency_contact_phone && (
                <p className="text-[var(--text-muted)]">Teléfono: {alumna.emergency_contact_phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {alumna.observations && (
          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Observaciones Generales
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{alumna.observations}</p>
          </div>
        )}

        {/* Pie de modal y acciones */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onClose();
                onEdit(alumna);
              }}
            >
              Editar Ficha
            </Button>
          )}
        </div>
      </div>

    </Modal>
  );
}
