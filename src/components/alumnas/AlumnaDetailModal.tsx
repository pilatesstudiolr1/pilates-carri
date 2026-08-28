'use client';

import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alumna } from '@/types/database';
import { User, Phone, Mail, Heart, AlertCircle, Calendar, FileText, CheckCircle, XCircle, Cake, AlertTriangle, Clock, Trash2 } from 'lucide-react';

interface AlumnaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumna: Alumna | null;
  onEdit?: (alumna: Alumna) => void;
  onDelete?: (alumna: Alumna) => void;
}

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

function getVencimientoEstado(fechaVencimiento: string | null): {
  label: string;
  color: string;
  bg: string;
} {
  if (!fechaVencimiento) return { label: 'Sin vencimiento', color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento);
  const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return { label: `Vencida hace ${Math.abs(diffDias)} dias`, color: '#ef4444', bg: '#fecaca' };
  if (diffDias <= 5) return { label: `Vence en ${diffDias} dias`, color: '#f59e0b', bg: '#fef3c7' };
  return { label: `Vence: ${fechaVencimiento}`, color: '#22c55e', bg: '#bbf7d0' };
}

export function AlumnaDetailModal({
  isOpen,
  onClose,
  alumna,
  onEdit,
  onDelete,
}: AlumnaDetailModalProps) {
  if (!alumna) return null;

  const edad = calcularEdad(alumna.date_of_birth);
  const vencimientoEstado = getVencimientoEstado(alumna.billing_due_date);

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
        {/* Cabecera y Estado */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/20 border border-[var(--color-wood)]/40 flex items-center justify-center text-[var(--color-wood)] font-bold text-sm">
              {alumna.first_name[0]}{(alumna.last_name || '')[0] || ''}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {alumna.first_name} {alumna.last_name}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                DNI: {alumna.dni} &bull; Alta: {alumna.entry_date}
                {edad !== null && <span className="ml-2 font-semibold text-[var(--color-wood)]">&bull; {edad} anos</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Vencimiento */}
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ color: vencimientoEstado.color, background: vencimientoEstado.bg + '33' }}
            >
              <AlertTriangle className="h-3 w-3" />
              {vencimientoEstado.label}
            </span>
            {getStatusBadge(alumna.status)}
          </div>
        </div>

        {/* Datos Personales Rapidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {alumna.date_of_birth && (
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center gap-2 text-xs">
              <Cake className="h-4 w-4 text-[var(--color-wood)] shrink-0" />
              <div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Nacimiento</p>
                <p className="text-[var(--text-primary)] font-medium">{alumna.date_of_birth}</p>
              </div>
            </div>
          )}
          {alumna.plan && (
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center gap-2 text-xs">
              <Calendar className="h-4 w-4 text-[var(--color-wood)] shrink-0" />
              <div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Plan</p>
                <p className="text-[var(--text-primary)] font-medium">{alumna.plan}</p>
              </div>
            </div>
          )}
          {alumna.billing_start_date && (
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center gap-2 text-xs">
              <Clock className="h-4 w-4 text-[var(--color-wood)] shrink-0" />
              <div>
                <p className="text-[var(--text-muted)] text-[10px] uppercase font-semibold">Inicio Período</p>
                <p className="text-[var(--text-primary)] font-medium">{alumna.billing_start_date}</p>
              </div>
            </div>
          )}
          {alumna.billing_due_date && (
            <div className="p-3 rounded-lg border text-xs" style={{ borderColor: vencimientoEstado.color + '44', background: vencimientoEstado.bg + '22' }}>
              <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: vencimientoEstado.color }}>Vencimiento Cuota</p>
              <p className="font-bold" style={{ color: vencimientoEstado.color }}>{alumna.billing_due_date}</p>
            </div>
          )}
        </div>

        {/* Ficha Medica */}
        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
            <Heart className="h-4 w-4 text-[var(--color-wood)]" /> Ficha Medica y Antecedentes
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase block mb-1">Lesiones / Patologias</span>
              <p className="text-[var(--text-primary)] font-medium">
                {alumna.injuries || 'Ninguna patologia registrada'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase block mb-1">Medicacion Habitual</span>
              <p className="text-[var(--text-primary)] font-medium">
                {alumna.medication || 'Sin medicacion informada'}
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
              <span className="font-medium text-[var(--text-primary)]">Embarazo: <strong>{alumna.is_pregnant ? 'Si' : 'No'}</strong></span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              {alumna.consent_signed ? (
                <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <XCircle className="h-4 w-4 text-[var(--color-danger)]" />
              )}
              <span className="font-medium text-[var(--text-primary)]">Consentimiento: <strong>{alumna.consent_signed ? 'Firmado' : 'Pendiente'}</strong></span>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
              <User className="h-4 w-4" /> Contacto
            </h3>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Tel: <strong className="text-[var(--text-primary)]">{alumna.phone}</strong></p>
              <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Mail: <strong className="text-[var(--text-primary)] truncate">{alumna.email || 'No registrado'}</strong></p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-wood)] flex items-center gap-2 pb-2 border-b border-[var(--border-default)]">
              <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" /> Contacto de Emergencia
            </h3>
            <div className="text-xs space-y-1">
              <p className="text-[var(--text-primary)] font-bold">{alumna.emergency_contact_name || 'Sin contacto asignado'}</p>
              {alumna.emergency_contact_phone && (
                <p className="text-[var(--text-muted)]">Telefono: {alumna.emergency_contact_phone}</p>
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

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Cerrar
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                onClick={() => {
                  onClose();
                  onDelete(alumna);
                }}
                className="w-full sm:w-auto text-red-500 hover:bg-red-500/10"
                icon={<Trash2 className="h-4 w-4" />}
              >
                Eliminar
              </Button>
            )}
          </div>
          {onEdit && (
            <Button
              onClick={() => {
                onClose();
                onEdit(alumna);
              }}
              className="w-full sm:w-auto"
            >
              Editar Ficha
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
