import { Card } from '@/components/ui/Card';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Alumnas',
};

export default function AlumnasPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Alumnas</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Fichas completas, historial y busqueda
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras gestionar las fichas de alumnas con datos personales, lesiones,
            historial completo y busqueda avanzada.
          </p>
        </div>
      </Card>
    </div>
  );
}
