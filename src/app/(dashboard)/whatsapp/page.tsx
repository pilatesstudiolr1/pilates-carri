'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getAlumnas } from '@/lib/services/alumnas';
import { Alumna } from '@/types/database';
import { MessageCircle, Send, Copy, Sparkles, User, Calendar, DollarSign, Search, X } from 'lucide-react';

const PLANTILLAS_PREDEFINIDAS = [
  {
    id: 'vencimiento',
    titulo: 'Recordatorio de Vencimiento de Cuota',
    texto: '¡Hola {nombre}! Te recordamos que la cuota de Pilates Reformer de este mes vence el {vencimiento}. Importe: ${monto}. ¡Muchas gracias!',
  },
  {
    id: 'bienvenida',
    titulo: 'Mensaje de Bienvenida al Estudio',
    texto: '¡Hola {nombre}! Te damos la más cálida bienvenida a Pilates Studio LR. Tu turno asignado es: {horario}. ¡Nos vemos en tu clase!',
  },
  {
    id: 'cumpleanos',
    titulo: 'Feliz Cumpleaños',
    texto: '¡Feliz cumpleaños {nombre}! Te deseamos un día hermoso de parte de todo el equipo de Pilates Studio LR. ¡Gracias por entrenar con nosotros!',

  },
  {
    id: 'recuperacion',
    titulo: 'Confirmación de Turno de Recuperación',
    texto: '¡Hola {nombre}! Te confirmamos tu turno de recuperación para el día {horario}. Por favor avísanos si necesitas reprogramar. ¡Te esperamos!',
  },
];

export default function WhatsAppPage() {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [alumnaSearch, setAlumnaSearch] = useState('');
  const [selectedAlumnaId, setSelectedAlumnaId] = useState('');
  const [selectedPlantilla, setSelectedPlantilla] = useState(PLANTILLAS_PREDEFINIDAS[0].id);
  const [mensajeEditable, setMensajeEditable] = useState(PLANTILLAS_PREDEFINIDAS[0].texto);
  const [vencimientoCustom, setVencimientoCustom] = useState('10 de este mes');
  const [montoCustom, setMontoCustom] = useState('35.000');
  const [horarioCustom, setHorarioCustom] = useState('Lunes y Miercoles 09:00 hs');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await getAlumnas({ status: 'ACTIVE' });
      setAlumnas(data);
    }
    load();
  }, []);

  const alumnaSeleccionada = alumnas.find((a) => a.id === selectedAlumnaId);

  // Filtrado local por nombre para el buscador
  const alumnasFiltradas = alumnaSearch.trim().length >= 1
    ? alumnas.filter((a) => {
        const q = alumnaSearch.toLowerCase();
        const firstName = (a.first_name || '').toLowerCase();
        const lastName = (a.last_name || '').toLowerCase();
        return (
          firstName.includes(q) ||
          lastName.includes(q) ||
          `${lastName} ${firstName}`.includes(q)
        );
      }).slice(0, 8)
    : [];

  const handleSelectAlumna = (alumna: Alumna) => {
    setSelectedAlumnaId(alumna.id);
    setAlumnaSearch(`${alumna.last_name || ''}, ${alumna.first_name}`);
    setShowDropdown(false);
  };

  const handleSelectPlantilla = (id: string) => {
    setSelectedPlantilla(id);
    const p = PLANTILLAS_PREDEFINIDAS.find((item) => item.id === id);
    if (p) setMensajeEditable(p.texto);
  };

  const getMensajeFinal = () => {
    const nombre = alumnaSeleccionada ? alumnaSeleccionada.first_name : 'Alumna';
    return mensajeEditable
      .replace(/{nombre}/g, nombre)
      .replace(/{vencimiento}/g, vencimientoCustom)
      .replace(/{monto}/g, montoCustom)
      .replace(/{horario}/g, horarioCustom);
  };

  const handleEnviarWhatsApp = () => {
    if (!alumnaSeleccionada) {
      alert('Selecciona una alumna');
      return;
    }

    const phone = alumnaSeleccionada.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(getMensajeFinal());
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-[#25D366]" /> Centro de Envíos WhatsApp
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Generador directo de mensajes con variables dinámicas sin costos de API
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plantillas Predefinidas */}
        <Card className="p-5 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
            <Sparkles className="h-4 w-4 text-[var(--color-wood)]" /> Plantillas Rápidas
          </h2>

          <div className="space-y-2">
            {PLANTILLAS_PREDEFINIDAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPlantilla(p.id)}
                className={`w-full p-3 rounded-md text-left text-xs transition-all cursor-pointer border ${
                  selectedPlantilla === p.id
                    ? 'bg-[var(--color-wood)]/20 border-[var(--color-wood)] text-[var(--text-primary)] font-semibold'
                    : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <p className="font-bold">{p.titulo}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{p.texto}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Editor de Mensaje y Destinatario */}
        <Card className="lg:col-span-2 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Send className="h-4 w-4 text-[#25D366]" /> Configurar Mensaje y Destinataria
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Buscador de Alumna */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
                Buscar Alumna *
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre o apellido..."
                  value={alumnaSearch}
                  onChange={(e) => {
                    setAlumnaSearch(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) setSelectedAlumnaId('');
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full h-10 pl-9 pr-9 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-sm placeholder:text-[var(--text-muted)]"
                />
                {alumnaSearch && (
                  <button
                    type="button"
                    onClick={() => { setAlumnaSearch(''); setSelectedAlumnaId(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Dropdown */}
                {showDropdown && alumnasFiltradas.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {alumnasFiltradas.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelectAlumna(a)}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-b border-[var(--border-default)] last:border-b-0 ${
                          selectedAlumnaId === a.id ? 'bg-[var(--color-wood)]/10' : ''
                        }`}
                      >
                        <p className="font-semibold text-[var(--text-primary)]">{a.last_name}, {a.first_name}</p>
                        <p className="text-[var(--text-muted)]">{a.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {alumnaSeleccionada && (
                <p className="text-xs text-[var(--color-wood)] mt-1 font-semibold">
                  Tel: {alumnaSeleccionada.phone}
                </p>
              )}
            </div>

            <Input
              label="Variable {vencimiento}"
              value={vencimientoCustom}
              onChange={(e) => setVencimientoCustom(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Variable {monto}"
              value={montoCustom}
              onChange={(e) => setMontoCustom(e.target.value)}
            />
            <Input
              label="Variable {horario}"
              value={horarioCustom}
              onChange={(e) => setHorarioCustom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">
              Cuerpo del Mensaje (Soporta variables &#123;nombre&#125;, &#123;vencimiento&#125;, &#123;monto&#125;, &#123;horario&#125;)
            </label>
            <textarea
              rows={4}
              value={mensajeEditable}
              onChange={(e) => setMensajeEditable(e.target.value)}
              className="w-full p-3 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-wood)] text-xs"
            />
          </div>

          {/* Vista previa final */}
          <div className="p-3.5 rounded-md bg-[#25D366]/10 border border-[#25D366]/30">
            <p className="text-[11px] font-bold text-[#25D366] uppercase mb-1">Vista Previa del Mensaje Final:</p>
            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{getMensajeFinal()}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleEnviarWhatsApp}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white"
              icon={<Send className="h-4 w-4" />}
            >
              Abrir en WhatsApp Web / App
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
