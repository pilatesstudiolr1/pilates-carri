'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PagoFormModal } from '@/components/pagos/PagoFormModal';
import { Pago, MetodoPago, StatusPago } from '@/types/database';
import { getPagos, registrarPago } from '@/lib/services/pagos';
import { CreditCard, Plus, DollarSign, Calendar, MessageCircle, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusPago | 'ALL'>('ALL');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await getPagos({ status: statusFilter });

    if (error) {
      setErrorMsg(error);
    } else {
      setPagos(data);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  const handleRegistrar = async (pagoData: {
    alumna_id: string;
    amount: number;
    payment_method: MetodoPago;
    due_date: string;
    commission_rate: number;
    notes?: string;
  }): Promise<boolean> => {
    setSubmitting(true);
    const { error } = await registrarPago(pagoData);
    setSubmitting(false);

    if (error) {
      alert(`Error al registrar el pago: ${error}`);
      return false;
    }

    fetchPagos();
    return true;
  };

  // Stats calculation
  const totalRecaudado = pagos.reduce((acc, p) => acc + (p.status === 'PAID' ? p.amount : 0), 0);
  const totalComisiones = pagos.reduce((acc, p) => acc + (p.status === 'PAID' ? p.commission_amount : 0), 0);

  const sendWhatsAppComprobante = (pago: Pago) => {
    if (!pago.alumna) return;
    const phone = pago.alumna.phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `¡Hola ${pago.alumna.first_name}! Confirmamos la recepción de tu pago de mensualidad en Pilates Studio LR por $${pago.amount.toLocaleString()}. Próximo vencimiento: ${pago.due_date}. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[var(--color-wood)]" /> Gestión de Pagos y Mensualidades
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Cobro en 1 clic, historial de transacciones y comprobantes automáticos
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="h-4 w-4" />}
        >
          Registrar Cobro
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/15 flex items-center justify-center text-[var(--color-wood)] shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total Recaudado</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">${totalRecaudado.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-olive)]/15 flex items-center justify-center text-[var(--color-olive-light)] shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Comisiones Profesoras (40%)</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">${totalComisiones.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-warning-soft)] flex items-center justify-center text-[var(--color-warning)] shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Pagos Registrados</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{pagos.length} transacciones</p>
          </div>
        </Card>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-4 rounded-md bg-[var(--color-danger-soft)] text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Lista de Pagos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando historial de pagos...</p>
        </div>
      ) : pagos.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No se han registrado pagos aún
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Haz clic en "Registrar Cobro" para ingresar la mensualidad de una alumna.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)] uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Alumna</th>
                  <th className="p-3.5">Monto</th>
                  <th className="p-3.5">Método</th>
                  <th className="p-3.5">Fecha Cobro</th>
                  <th className="p-3.5">Vencimiento</th>
                  <th className="p-3.5">Comisión (40%)</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {pagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="p-3.5 font-semibold">
                      {pago.alumna ? `${pago.alumna.last_name}, ${pago.alumna.first_name}` : 'Alumna'}
                      {pago.notes && <p className="text-[10px] text-[var(--text-muted)] font-normal truncate max-w-xs">{pago.notes}</p>}
                    </td>
                    <td className="p-3.5 font-bold text-[var(--color-wood)]">${pago.amount.toLocaleString()}</td>
                    <td className="p-3.5 capitalize">{pago.payment_method.replace('_', ' ')}</td>
                    <td className="p-3.5">{pago.payment_date}</td>
                    <td className="p-3.5">{pago.due_date}</td>
                    <td className="p-3.5 text-[var(--text-secondary)]">${pago.commission_amount.toLocaleString()}</td>
                    <td className="p-3.5">
                      <Badge variant={pago.status === 'PAID' ? 'success' : 'warning'}>
                        {pago.status === 'PAID' ? 'Pagado' : pago.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => sendWhatsAppComprobante(pago)}
                        title="Enviar comprobante por WhatsApp"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de cobro */}
      <PagoFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRegistrar}
        loading={submitting}
      />
    </div>
  );
}
