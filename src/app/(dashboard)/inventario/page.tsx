'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Package, Plus, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function InventarioPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Accesorios');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('EXCELLENT');
  const [notes, setNotes] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem = {
      id: Date.now().toString(),
      name: name.trim(),
      category,
      quantity: Number(quantity) || 1,
      condition,
      notes: notes.trim(),
    };

    setItems([newItem, ...items]);
    setIsModalOpen(false);
    setName('');
    setNotes('');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--color-wood)]" /> Control de Inventario y Equipamiento
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Registro dinámico de elementos de estudio Reformer y estado de mantenimiento
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
          Nuevo Elemento
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            El inventario se encuentra vacío
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Haz clic en "Nuevo Elemento" para registrar camillas Reformer, insumos o accesorios.
          </p>
        </Card>
      ) : (


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4 flex flex-col justify-between gap-3 border border-[var(--border-default)]">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--color-wood)] tracking-wider">{item.category}</span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">{item.name}</h3>
                </div>
                <Badge variant={item.condition === 'EXCELLENT' ? 'success' : 'warning'}>
                  {item.condition === 'EXCELLENT' ? 'Excelente' : 'Mantenimiento'}
                </Badge>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">
                Cantidad disponible: <strong>{item.quantity} unidades</strong>
              </p>
              {item.notes && <p className="text-xs text-[var(--text-muted)] italic mt-2">{item.notes}</p>}
            </div>

            <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-end">
              <Button size="sm" variant="ghost" icon={<Wrench className="h-3.5 w-3.5" />}>
                Mantenimiento
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
        title="Registrar Elemento de Inventario"
        description="Agrega insumos o equipamiento al inventario del estudio"
        size="md"
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="Nombre del Elemento *" placeholder="Ej. Mat de Yoga / Resortes" value={name} onChange={(e) => setName(e.target.value)} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Categoría *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)]">
                <option value="Equipamiento">Equipamiento Reformer</option>
                <option value="Accesorios">Accesorios</option>
                <option value="Insumos">Insumos y Repuestos</option>
              </select>
            </div>

            <Input label="Cantidad *" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>

          <Input label="Observaciones de Estado" placeholder="Ej. Excelente condición" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--border-default)]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" className="w-full sm:w-auto">Guardar Elemento</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
