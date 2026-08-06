'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { TrendingUp, ArrowUpRight, Building2 } from 'lucide-react';
import { getMovimientos } from '@/lib/services/caja';
import { getPagos } from '@/lib/services/pagos';
import { createClient } from '@/lib/supabase/client';

export default function FinanzasPage() {
  const [ingresos, setIngresos] = useState(0);
  const [egresos, setEgresos] = useState(0);
  const [sedes, setSedes] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: sedesData } = await supabase.from('sedes').select('*');
        if (sedesData && sedesData.length > 0) {
          setSedes(sedesData);
        } else {
          setSedes([{ id: 'sedeprincipla', name: 'Sede Principal', address: 'Nicaragua 148, La Rioja', is_active: true }]);
        }

        const { data: movs } = await getMovimientos();
        const { data: pagos } = await getPagos({ status: 'PAID' });

        const totalPagos = (pagos || []).reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalIngresosCaja = (movs || []).filter((m) => m.tipo === 'INGRESO').reduce((acc, m) => acc + (m.monto || 0), 0);
        const totalEgresosCaja = (movs || []).filter((m) => m.tipo === 'EGRESO').reduce((acc, m) => acc + (m.monto || 0), 0);

        setIngresos(totalPagos + totalIngresosCaja);
        setEgresos(totalEgresosCaja);
      } catch (e) {
        setSedes([{ id: 'sedeprincipla', name: 'Sede Principal', address: 'Nicaragua 148, La Rioja', is_active: true }]);
      }
    }
    load();
  }, []);

  const rentabilidad = ingresos - egresos;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[var(--color-wood)]" /> Estado de Resultados y Finanzas
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Flujo de caja, balance mensual y estimaciones de rentabilidad por sede
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-[var(--color-success)]">
          <p className="text-xs text-[var(--text-muted)]">Ingresos Operativos Totales</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">${ingresos.toLocaleString()} ARS</p>
          <span className="text-[11px] text-[var(--color-success)] font-semibold flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> Transacciones reales en tiempo real
          </span>
        </Card>

        <Card className="p-5 border-l-4 border-l-[var(--color-danger)]">
          <p className="text-xs text-[var(--text-muted)]">Costos y Gastos Fijos/Variables</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">${egresos.toLocaleString()} ARS</p>
          <span className="text-[11px] text-[var(--text-muted)] font-normal flex items-center gap-1 mt-1">
            Egresos registrados en caja
          </span>
        </Card>

        <Card className="p-5 border-l-4 border-l-[var(--color-wood)]">
          <p className="text-xs text-[var(--text-muted)]">Rentabilidad Neta Estimada</p>
          <p className="text-2xl font-bold text-[var(--color-wood)] mt-1">${rentabilidad.toLocaleString()} ARS</p>
          <span className="text-[11px] text-[var(--color-wood)] font-semibold flex items-center gap-1 mt-1">
            Balance neto de operaciones
          </span>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--color-wood)]" /> Recaudación por Sede
        </h3>

        <div className="space-y-3">
          {sedes.map((s) => (
            <div key={s.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">{s.name} - {s.address || 'Nicaragua 148, La Rioja'}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Estado: {s.is_active ? 'Sede Activa' : 'Inactiva'}</p>
              </div>
              <span className="font-bold text-sm text-[var(--color-wood)]">${ingresos.toLocaleString()} ARS</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


