import { Card } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Finanzas',
};

export default function FinanzasPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Finanzas</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Flujo de caja, gastos y rentabilidad
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras ver el flujo de caja, estado de resultados, gastos fijos/variables,
            rentabilidad por sede y comparaciones mensuales.
          </p>
        </div>
      </Card>
    </div>
  );
}
