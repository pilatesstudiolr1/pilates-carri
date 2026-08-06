'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getAlumnas } from '@/lib/services/alumnas';
import { getPagos } from '@/lib/services/pagos';
import { getMovimientos } from '@/lib/services/caja';
import { Alumna, Pago, CajaMovimiento } from '@/types/database';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Wallet,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Cake,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardHome() {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const [alumnasRes, pagosRes, movRes] = await Promise.all([
        getAlumnas({ status: 'ACTIVE' }),
        getPagos({ status: 'ALL' }),
        getMovimientos(),
      ]);

      setAlumnas(alumnasRes.data);
      setPagos(pagosRes.data);
      setMovimientos(movRes.data);
      setLoading(false);
    }

    loadStats();
  }, []);

  const totalActivas = alumnas.length;
  const totalPagosMes = pagos.reduce((acc, p) => acc + (p.status === 'PAID' ? p.amount : 0), 0);
  const totalIngresosCaja = movimientos
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((acc, m) => acc + m.monto, 0);
  const totalEgresosCaja = movimientos
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((acc, m) => acc + m.monto, 0);
  const saldoCajaActual = totalIngresosCaja - totalEgresosCaja;

  // Recent payments
  const pagosRecientes = pagos.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Saludo y Titulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            ¡Hola, Julieta!
          </h1>

          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Resumen en tiempo real de Pilates Studio LR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/alumnas">
            <Button size="sm" variant="outline" icon={<Users className="h-3.5 w-3.5" />}>
              Gestionar Alumnas
            </Button>
          </Link>
          <Link href="/pagos">
            <Button size="sm" icon={<CreditCard className="h-3.5 w-3.5" />}>
              Registrar Cobro
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando datos del panel...</p>
        </div>
      ) : (
        <>
          {/* Métricas Principales KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hover padding="lg" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-wood)]/20 flex items-center justify-center text-[var(--color-wood)] shrink-0 shadow-xs">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-semibold">Alumnas Activas</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{totalActivas}</p>
              </div>
            </Card>

            <Card hover padding="lg" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-success-soft)] flex items-center justify-center text-[var(--color-success)] shrink-0 shadow-xs">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-semibold">Recaudado Mes</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">${totalPagosMes.toLocaleString()}</p>
              </div>
            </Card>

            <Card hover padding="lg" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-info-soft)] flex items-center justify-center text-[var(--color-info)] shrink-0 shadow-xs">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-semibold">Saldo en Caja</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">${saldoCajaActual.toLocaleString()}</p>
              </div>
            </Card>

            <Card hover padding="lg" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-warning-soft)] flex items-center justify-center text-[var(--color-warning)] shrink-0 shadow-xs">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-semibold">Vencimientos</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">{pagos.filter(p => p.status === 'PAID').length} al día</p>
              </div>
            </Card>
          </div>


          {/* Grilla Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Pagos Recientes */}
            <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)] mb-4">
                  <h2 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[var(--color-wood)]" /> Útimos Cobros Registrados
                  </h2>
                  <Link href="/pagos" className="text-xs text-[var(--color-wood)] hover:underline flex items-center gap-1 font-semibold">
                    Ver todos <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {pagosRecientes.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">No hay cobros registrados recientemente.</p>
                ) : (
                  <div className="divide-y divide-[var(--border-default)]">
                    {pagosRecientes.map((pago) => (
                      <div key={pago.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {pago.alumna ? `${pago.alumna.last_name}, ${pago.alumna.first_name}` : 'Alumna'}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Fecha: {pago.payment_date} • {pago.payment_method}
                          </p>
                        </div>
                        <span className="font-bold text-[var(--color-wood)]">${pago.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Accesos Rápidos y Alertas */}
            <div className="space-y-4">
              <Card className="p-5">
                <h2 className="font-bold text-[var(--text-primary)] text-sm mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-wood)]" /> Acciones Rápidas
                </h2>
                <div className="flex flex-col gap-2">
                  <Link href="/agenda">
                    <button className="w-full p-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)]/20 text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between transition-colors cursor-pointer">
                      <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[var(--color-wood)]" /> Ver Agenda de Clases</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>

                  <Link href="/whatsapp">
                    <button className="w-full p-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)]/20 text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between transition-colors cursor-pointer">
                      <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#25D366]" /> Enviar Recordatorios WhatsApp</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>

                  <Link href="/profesoras">
                    <button className="w-full p-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--color-wood)]/20 text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between transition-colors cursor-pointer">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[var(--color-wood)]" /> Gestionar Profesoras</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
