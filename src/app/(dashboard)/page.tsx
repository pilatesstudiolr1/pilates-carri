import { Card, CardHeader } from '@/components/ui/Card';
import {
  Users,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  MapPin,
} from 'lucide-react';

const stats = [
  {
    label: 'Alumnas Activas',
    value: '--',
    icon: Users,
    color: 'var(--color-wood)',
    bgColor: 'rgba(223, 178, 103, 0.1)',
  },
  {
    label: 'Cobros del Dia',
    value: '--',
    icon: DollarSign,
    color: 'var(--color-success)',
    bgColor: 'var(--color-success-soft)',
  },
  {
    label: 'Pagos Pendientes',
    value: '--',
    icon: CreditCard,
    color: 'var(--color-warning)',
    bgColor: 'var(--color-warning-soft)',
  },
  {
    label: 'Proximos Vencimientos',
    value: '--',
    icon: AlertTriangle,
    color: 'var(--color-danger)',
    bgColor: 'var(--color-danger-soft)',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} hover>
              <div className="flex items-center gap-4">
                <div
                  className="shrink-0 w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center"
                  style={{ backgroundColor: stat.bgColor }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: stat.color }}
                  />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Caja del dia */}
        <Card>
          <CardHeader title="Caja del Dia" />
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-sm text-[var(--text-secondary)]">Ingresos</span>
              <span className="text-sm font-medium text-[var(--color-success)]">--</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-sm text-[var(--text-secondary)]">Egresos</span>
              <span className="text-sm font-medium text-[var(--color-danger)]">--</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">Total</span>
              <span className="text-base font-bold text-[var(--color-wood)]">--</span>
            </div>
          </div>
        </Card>

        {/* Proximas clases */}
        <Card>
          <CardHeader title="Proximas Clases" />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Conecta Supabase para ver las clases
            </p>
          </div>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader title="Alertas" />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Sin alertas pendientes
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cobros del mes */}
        <Card>
          <CardHeader title="Cobros del Mes" />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Los indicadores se activaran con datos reales
            </p>
          </div>
        </Card>

        {/* Disponibilidad */}
        <Card>
          <CardHeader title="Disponibilidad por Sede" />
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Configura las sedes para ver disponibilidad
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
