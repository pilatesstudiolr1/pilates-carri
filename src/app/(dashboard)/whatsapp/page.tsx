import { Card } from '@/components/ui/Card';
import { MessageCircle } from 'lucide-react';

export const metadata = {
  title: 'WhatsApp',
};

export default function WhatsAppPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">WhatsApp</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Plantillas, recordatorios y mensajes automaticos
          </p>
        </div>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
            Modulo en desarrollo
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            Aqui podras crear plantillas de mensajes, programar recordatorios
            y enviar mensajes con variables automaticas via WhatsApp.
          </p>
        </div>
      </Card>
    </div>
  );
}
