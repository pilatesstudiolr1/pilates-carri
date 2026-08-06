import { Card } from '@/components/ui/Card';
import { Settings } from 'lucide-react';

export const metadata = {
  title: 'Configuracion',
};

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Configuracion</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Sedes, roles, permisos y ajustes del sistema
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Settings className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras configurar sedes, gestionar roles y permisos,
            auditoria, copias de seguridad y ajustes generales.
          </p>
        </div>
      </Card>
    </div>
  );
}
