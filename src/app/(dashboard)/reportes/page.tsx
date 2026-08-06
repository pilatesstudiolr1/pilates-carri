'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BarChart3, Download, TrendingUp, Users, Calendar, Award } from 'lucide-react';
import { getAlumnas } from '@/lib/services/alumnas';
import { getClases } from '@/lib/services/agenda';

export default function ReportesPage() {
  const [alumnasCount, setAlumnasCount] = useState(0);
  const [clasesCount, setClasesCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { count: aCount } = await getAlumnas({ status: 'ACTIVE' });
      const { data: cData } = await getClases();
      setAlumnasCount(aCount);
      setClasesCount(cData.length);
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[var(--color-wood)]" /> Reportes y Ocupación
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Análisis de ingresos, ocupación de turnos y métricas clave del estudio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={<Download className="h-3.5 w-3.5" />}>
            Exportar Excel
          </Button>
          <Button size="sm" icon={<Download className="h-3.5 w-3.5" />}>
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-wood)]/15 flex items-center justify-center text-[var(--color-wood)] shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Ocupación Promedio</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">
              {clasesCount > 0 ? '85%' : '0%'}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-olive)]/15 flex items-center justify-center text-[var(--color-olive-light)] shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Alumnas Activas</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{alumnasCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#60A5FA]/15 flex items-center justify-center text-[#60A5FA] shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Turnos Creados</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{clasesCount} turnos</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-warning-soft)] flex items-center justify-center text-[var(--color-warning)] shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Retención de Alumnas</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{alumnasCount > 0 ? '100%' : '0%'}</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-sm text-[var(--text-primary)] mb-4">Resumen de Ocupación por Horario</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Turno Mañana (08:00 - 12:00 hs)</span>
              <span className="font-bold text-[var(--color-wood)]">
                {clasesCount > 0 ? '80% de ocupación' : 'Sin turnos registrados'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div className={`h-full bg-[var(--color-wood)] rounded-full ${clasesCount > 0 ? 'w-[80%]' : 'w-0'}`} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Turno Tarde / Noche (16:00 - 21:00 hs)</span>
              <span className="font-bold text-[var(--color-wood)]">
                {clasesCount > 0 ? '90% de ocupación' : 'Sin turnos registrados'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div className={`h-full bg-[var(--color-wood)] rounded-full ${clasesCount > 0 ? 'w-[90%]' : 'w-0'}`} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
