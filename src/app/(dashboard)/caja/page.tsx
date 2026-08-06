import { Card } from '@/components/ui/Card';
import { Wallet } from 'lucide-react';

export const metadata = {
  title: 'Caja',
};

export default function CajaPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Caja</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Apertura, cierre, arqueo y movimientos
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras gestionar la caja diaria con apertura, cierre, arqueo,
            ingresos, egresos y multiples medios de pago.
          </p>
        </div>
      </Card>
    </div>
  );
}
