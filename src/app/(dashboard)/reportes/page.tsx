import { Card } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Reportes',
};

export default function ReportesPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Reportes</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Ingresos, ocupacion y exportaciones
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras ver reportes de ingresos, alumnas nuevas, bajas,
            ocupacion por horario y exportar a PDF/Excel.
          </p>
        </div>
      </Card>
    </div>
  );
}
