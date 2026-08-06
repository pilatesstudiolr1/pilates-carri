import { Card } from '@/components/ui/Card';
import { Package } from 'lucide-react';

export const metadata = {
  title: 'Inventario',
};

export default function InventarioPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Inventario</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Elementos del estudio con campos dinamicos
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras gestionar el inventario general de elementos del estudio
            con campos y modificaciones dinamicas.
          </p>
        </div>
      </Card>
    </div>
  );
}
