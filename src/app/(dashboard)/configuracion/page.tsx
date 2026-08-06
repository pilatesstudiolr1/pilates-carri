'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Settings, Building2, Percent, Shield, Save } from 'lucide-react';

export default function ConfiguracionPage() {
  const [nombreEstudio, setNombreEstudio] = useState('Pilates Studio LR');
  const [direccion, setDireccion] = useState('Nicaragua 148, La Rioja, Argentina');
  const [comisionDefault, setComisionDefault] = useState('40');
  const [maxCupo, setMaxCupo] = useState('6');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="h-6 w-6 text-[var(--color-wood)]" /> Configuración General del Sistema
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Parámetros globales del estudio, sedes y reglas de negocio
        </p>
      </div>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {saved && (
            <div className="p-3 rounded-md bg-[var(--color-success-soft)] text-xs text-[var(--color-success)] font-semibold">
              ¡Configuración guardada exitosamente!
            </div>
          )}

          <Input
            label="Nombre Comercial del Estudio *"
            value={nombreEstudio}
            onChange={(e) => setNombreEstudio(e.target.value)}
            icon={<Building2 className="h-4 w-4" />}
            required
          />

          <Input
            label="Dirección Sede Principal *"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            icon={<Building2 className="h-4 w-4" />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Comisión Profesora Por Defecto (%)"
              type="number"
              value={comisionDefault}
              onChange={(e) => setComisionDefault(e.target.value)}
              icon={<Percent className="h-4 w-4 text-[var(--color-wood)]" />}
              hint="Porcentaje asignado por cobro a profesora"
            />

            <Input
              label="Cupo Máximo Reformer Por Clase"
              type="number"
              min="4"
              max="6"
              value={maxCupo}
              onChange={(e) => setMaxCupo(e.target.value)}
              icon={<Shield className="h-4 w-4 text-[var(--color-wood)]" />}
              hint="Capacidad entre 4 y 6 alumnas"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
            <Button type="submit" icon={<Save className="h-4 w-4" />}>
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
