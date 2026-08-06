'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getAlumnas } from '@/lib/services/alumnas';
import { Alumna } from '@/types/database';
import { ClipboardList, Plus, Clock, Calendar, CheckCircle2, User } from 'lucide-react';

export default function ListaEsperaPage() {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alumnaId, setAlumnaId] = useState('');
  const [dia, setDia] = useState('1');
  const [hora, setHora] = useState('09:00');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await getAlumnas({ status: 'ACTIVE' });
      setAlumnas(data);
      if (data.length > 0) setAlumnaId(data[0].id);
    }
    load();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const alumna = alumnas.find((a) => a.id === alumnaId);
    if (!alumna) return;

    const newItem = {
      id: Date.now().toString(),
      alumnaNombre: `${alumna.last_name}, ${alumna.first_name}`,
      telefono: alumna.phone,
      diaNombre: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][Number(dia) - 1],
      hora,
      observaciones,
      fecha: new Date().toLocaleDateString(),
    };

    setItems([newItem, ...items]);
    setIsModalOpen(false);
    setObservaciones('');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[var(--color-wood)]" /> Lista de Espera de Turnos
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Registro de solicitudes de alumnas en espera de vacantes en turnos concurridos
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Añadir a Lista de Espera
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            La lista de espera se encuentra vacía
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Todas las alumnas cuentan con turno asignado en el horario deseado.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col justify-between gap-3 border border-[var(--border-default)]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{item.alumnaNombre}</h3>
                  <Badge variant="warning">En Espera</Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--color-wood)]" /> Día: <strong>{item.diaNombre}</strong> ({item.hora} hs)
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Tel: {item.telefono}</p>
                {item.observaciones && <p className="text-xs italic text-[var(--text-muted)] mt-2">{item.observaciones}</p>}
              </div>

              <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-end">
                <Button size="sm" variant="outline" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                  Asignar Vacante
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar en Lista de Espera"
        description="Ingresa la preferencia de día y horario deseado"
        size="md"
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Alumna *</label>
            <select
              value={alumnaId}
              onChange={(e) => setAlumnaId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
            >
              {alumnas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.last_name}, {a.first_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Día Preferido *</label>
              <select
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]"
              >
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
              </select>
            </div>

            <Input label="Hora Preferida *" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </div>

          <Input label="Notas u Observaciones" placeholder="Ej. Prefiere turno mañana antes de las 10hs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar en Espera</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
