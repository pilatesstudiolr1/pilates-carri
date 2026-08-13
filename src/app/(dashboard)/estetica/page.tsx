'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  getEsteticaTratamientos,
  getEsteticaSesiones,
  registrarPagoEstetica,
  EsteticaTratamiento,
  EsteticaSesion,
} from '@/lib/services/estetica';
import {
  Flower2,
  Calendar,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  DollarSign,
  UserCheck,
  Clock,
  Sparkles,
  Check,
  XCircle,
  RotateCcw,
} from 'lucide-react';

export default function EsteticaPage() {
  const { alert: alertDialog } = useConfirm();

  const [tratamientos, setTratamientos] = useState<EsteticaTratamiento[]>([]);
  const [sesiones, setSesiones] = useState<EsteticaSesion[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'TRATAMIENTOS' | 'SESIONES' | 'LIQUIDACIONES'>('TRATAMIENTOS');

  // Registrar Pago Modal State
  const [selectedTratamiento, setSelectedTratamiento] = useState<EsteticaTratamiento | null>(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [submittingPago, setSubmittingPago] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tratRes, sesRes] = await Promise.all([
      getEsteticaTratamientos(),
      getEsteticaSesiones(),
    ]);

    setTratamientos(tratRes.data);
    setSesiones(sesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPagoModal = (t: EsteticaTratamiento) => {
    setSelectedTratamiento(t);
    setMontoPago(t.balance_due > 0 ? t.balance_due.toString() : '0');
  };

  const handleConfirmPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTratamiento) return;

    const amountNum = parseFloat(montoPago);
    if (isNaN(amountNum) || amountNum <= 0) {
      await alertDialog({
        title: 'Monto inválido',
        message: 'Por favor ingresa un monto válido mayor a 0.',
        variant: 'warning',
      });
      return;
    }

    setSubmittingPago(true);
    await registrarPagoEstetica({
      tratamiento_id: selectedTratamiento.id,
      paciente_name: selectedTratamiento.paciente_name,
      combo_name: selectedTratamiento.combo_name,
      amount: amountNum,
      payment_method: metodoPago,
    });
    setSubmittingPago(false);

    await alertDialog({
      title: 'Pago Registrado',
      message: `Abono de $${amountNum.toLocaleString()} registrado con éxito e ingresado a Finanzas generales.`,
      variant: 'success',
    });

    setSelectedTratamiento(null);
    loadData();
  };

  const handleToggleSesionStatus = (sesionId: string, newStatus: 'REALIZADA' | 'CANCELADA' | 'REPROGRAMADA') => {
    setSesiones((prev) =>
      prev.map((s) => (s.id === sesionId ? { ...s, status: newStatus } : s))
    );
  };

  // Métricas
  const totalRecaudadoEstetica = tratamientos.reduce((acc, t) => acc + t.amount_paid, 0);
  const totalSaldosPendientes = tratamientos.reduce((acc, t) => acc + t.balance_due, 0);
  const totalSesionesRealizadas = tratamientos.reduce((acc, t) => acc + t.completed_sessions, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 text-[var(--text-primary)]">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Flower2 className="h-6 w-6 text-emerald-500" /> Centro de Estética
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Ficha de pacientes, tratamientos, combos contratados, agenda de sesiones y comisiones a profesionales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1 rounded-md border border-[var(--border-default)] w-fit">
        <button
          onClick={() => setActiveTab('TRATAMIENTOS')}
          className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'TRATAMIENTOS'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Flower2 className="h-4 w-4 text-emerald-500" /> Pacientes &amp; Combos ({tratamientos.length})
        </button>

        <button
          onClick={() => setActiveTab('SESIONES')}
          className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'SESIONES'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Calendar className="h-4 w-4 text-emerald-500" /> Agenda de Sesiones
        </button>

        <button
          onClick={() => setActiveTab('LIQUIDACIONES')}
          className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'LIQUIDACIONES'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <DollarSign className="h-4 w-4 text-emerald-500" /> Liquidaciones Estética
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando módulo de Estética...</p>
        </div>
      ) : activeTab === 'TRATAMIENTOS' ? (
        /* Pestaña 1: Pacientes, Combos & Progreso */
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="p-5 border-l-4 border-l-emerald-500 shadow-xs">
              <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                Recaudación Total Estética
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ${totalRecaudadoEstetica.toLocaleString()} ARS
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500 shadow-xs">
              <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                Saldos Pendientes por Cobrar
              </span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ${totalSaldosPendientes.toLocaleString()} ARS
              </p>
            </Card>

            <Card className="p-5 border-l-4 border-l-blue-500 shadow-xs">
              <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">
                Sesiones Realizadas
              </span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {totalSesionesRealizadas} sesiones
              </p>
            </Card>
          </div>

          <Card className="p-6 border border-[var(--border-default)] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Ficha de Pacientes y Combos Contratados
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Control de sesiones compradas, realizadas y saldo adeudado.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Paciente</th>
                    <th className="py-3 px-4 font-semibold">Tratamiento / Combo</th>
                    <th className="py-3 px-4 font-semibold">Precio Total</th>
                    <th className="py-3 px-4 font-semibold text-[var(--color-success)]">Abonado</th>
                    <th className="py-3 px-4 font-semibold text-amber-500">Saldo Pendiente</th>
                    <th className="py-3 px-4 font-semibold">Sesiones</th>
                    <th className="py-3 px-4 font-semibold">Profesional</th>
                    <th className="py-3 px-4 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                  {tratamientos.map((t) => {
                    const restantes = t.total_sessions - t.completed_sessions;

                    return (
                      <tr key={t.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold">{t.paciente_name}</td>
                        <td className="py-3.5 px-4 font-semibold text-[var(--color-wood)]">{t.combo_name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">${t.total_price.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-mono text-[var(--color-success)] font-bold">
                          ${t.amount_paid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-amber-600 dark:text-amber-400 font-bold">
                          ${t.balance_due.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-1 rounded bg-[var(--bg-tertiary)] font-bold text-xs">
                            {t.completed_sessions} / {t.total_sessions} ({restantes} restantes)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">{t.professional_name}</td>
                        <td className="py-3.5 px-4">
                          {t.balance_due > 0 && (
                            <button
                              onClick={() => handleOpenPagoModal(t)}
                              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Cobrar Saldo
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeTab === 'SESIONES' ? (
        /* Pestaña 2: Agenda de Sesiones de Estética */
        <Card className="p-4 sm:p-6 border border-[var(--border-default)] shadow-xs">
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
            Agenda y Turnos de Tratamientos
          </h3>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Fecha &amp; Hora</th>
                  <th className="py-3 px-4 font-semibold">Paciente</th>
                  <th className="py-3 px-4 font-semibold">Tratamiento</th>
                  <th className="py-3 px-4 font-semibold">Profesional</th>
                  <th className="py-3 px-4 font-semibold">Estado Sesión</th>
                  <th className="py-3 px-4 font-semibold">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {sesiones.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {s.scheduled_date} &bull; {s.scheduled_time.slice(0, 5)} hs
                    </td>
                    <td className="py-3.5 px-4 font-bold">{s.paciente_name}</td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{s.combo_name}</td>
                    <td className="py-3.5 px-4">{s.professional_name}</td>
                    <td className="py-3.5 px-4">
                      {s.status === 'REALIZADA' ? (
                        <Badge variant="success">Realizada</Badge>
                      ) : s.status === 'CANCELADA' ? (
                        <Badge variant="danger">Cancelada</Badge>
                      ) : (
                        <Badge variant="warning">Programada</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleSesionStatus(s.id, 'REALIZADA')}
                          className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-200"
                        >
                          <Check className="h-3 w-3 inline mr-1" /> Realizada
                        </button>
                        <button
                          onClick={() => handleToggleSesionStatus(s.id, 'CANCELADA')}
                          className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs cursor-pointer hover:bg-rose-200"
                        >
                          <XCircle className="h-3 w-3 inline mr-1" /> Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Pestaña 3: Liquidaciones Estética */
        <Card className="p-6 border border-[var(--border-default)] shadow-xs">
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
            Liquidación de Profesionales de Estética
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Cálculo de comisiones sobre tratamientos efectuados.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tratamientos.map((t) => {
              const commProfe = t.amount_paid * (t.commission_rate || 0.40);
              const restoEstudio = t.amount_paid - commProfe;

              return (
                <div key={t.id} className="p-4 rounded-md bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)] space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{t.professional_name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      Comisión ({(t.commission_rate * 100).toFixed(0)}%): ${commProfe.toLocaleString()} ARS
                    </span>
                  </div>
                  <p className="text-[var(--text-muted)]">
                    Paciente: {t.paciente_name} &bull; {t.combo_name}
                  </p>
                  <div className="flex justify-between text-[11px] pt-2 border-t border-[var(--border-default)]">
                    <span>Recaudado: ${t.amount_paid.toLocaleString()}</span>
                    <span className="font-bold">Remanente Estudio: ${restoEstudio.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal Registrar Pago Estética */}
      {selectedTratamiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Cobrar Saldo Estética - {selectedTratamiento.paciente_name}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Tratamiento: {selectedTratamiento.combo_name}
            </p>

            <form onSubmit={handleConfirmPago} className="space-y-4">
              <Input
                label="Monto a cobrar ($ ARS) *"
                type="number"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                required
              />

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                  Método de pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="mercadopago">MercadoPago</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setSelectedTratamiento(null)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={submittingPago} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Confirmar Cobro
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
