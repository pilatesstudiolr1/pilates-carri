import { Card } from '@/components/ui/Card';
import { Calendar } from 'lucide-react';

export const metadata = {
  title: 'Agenda',
};

export default function AgendaPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Agenda</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gestion de turnos, horarios y clases
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras gestionar la agenda de clases con vistas diaria, semanal y mensual,
            arrastrar alumnas entre horarios y manejar recuperaciones.
          </p>
        </div>
      </Card>
    </div>
  );
}
