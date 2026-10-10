'use client';

import { useState, useEffect, useMemo } from 'react';
import { Alumna } from '@/types/database';
import { getAlumnas } from '@/lib/services/alumnas';
import { getBirthdayInfo, buildMensajeCumpleanos, openWhatsAppMessage } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Cake,
  MessageCircle,
  Search,
  Calendar,
  Sparkles,
  PartyPopper,
  Clock,
  Heart,
  Phone,
  Filter,
} from 'lucide-react';

interface AlumnaWithBirthday extends Alumna {
  bdayInfo: NonNullable<ReturnType<typeof getBirthdayInfo>>;
}

export function CumpleanosView() {
  const [alumnas, setAlumnas] = useState<Alumna[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'HOY' | 'MES' | 'PROXIMOS' | 'TODOS'>('MES');

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Traer alumnas activas y suspendidas con fecha de nacimiento
      const res = await getAlumnas({ status: 'ACTIVE_AND_SUSPENDED', limit: 500 });
      setAlumnas(res.data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Filtrar y calcular información de cumpleaños
  const alumnasConCumple = useMemo<AlumnaWithBirthday[]>(() => {
    return alumnas
      .map((a) => {
        const bdayInfo = getBirthdayInfo(a.date_of_birth);
        if (!bdayInfo) return null;
        return { ...a, bdayInfo };
      })
      .filter((a): a is AlumnaWithBirthday => a !== null);
  }, [alumnas]);

  // Contadores para métricas
  const cumplenHoyCount = useMemo(
    () => alumnasConCumple.filter((a) => a.bdayInfo.isToday).length,
    [alumnasConCumple]
  );
  const cumplenMesCount = useMemo(
    () => alumnasConCumple.filter((a) => a.bdayInfo.isThisMonth).length,
    [alumnasConCumple]
  );
  const proximos30Count = useMemo(
    () => alumnasConCumple.filter((a) => a.bdayInfo.daysUntil >= 0 && a.bdayInfo.daysUntil <= 30).length,
    [alumnasConCumple]
  );

  // Auto-ajustar tab si hoy hay cumpleañeras
  useEffect(() => {
    if (cumplenHoyCount > 0) {
      setFilterMode('HOY');
    }
  }, [cumplenHoyCount]);

  // Filtrar según el modo seleccionado y búsqueda
  const listaFiltrada = useMemo(() => {
    let list = [...alumnasConCumple];

    if (filterMode === 'HOY') {
      list = list.filter((a) => a.bdayInfo.isToday);
    } else if (filterMode === 'MES') {
      list = list.filter((a) => a.bdayInfo.isThisMonth);
    } else if (filterMode === 'PROXIMOS') {
      list = list.filter((a) => a.bdayInfo.daysUntil >= 0 && a.bdayInfo.daysUntil <= 30);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const full = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
        return full.includes(q) || (a.phone && a.phone.includes(q));
      });
    }

    // Ordenar: primero los más próximos
    return list.sort((a, b) => a.bdayInfo.daysUntil - b.bdayInfo.daysUntil);
  }, [alumnasConCumple, filterMode, search]);

  const handleEnviarSaludo = (alumna: AlumnaWithBirthday) => {
    if (!alumna.phone) return;
    const msg = buildMensajeCumpleanos(alumna.first_name);
    openWhatsAppMessage(alumna.phone, msg);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* 1. Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilterMode('HOY')}
          className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
            filterMode === 'HOY'
              ? 'bg-amber-500/10 border-amber-500 shadow-sm'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <PartyPopper className="h-4 w-4 text-amber-500" /> Cumplen Hoy
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                cumplenHoyCount > 0
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}
            >
              {cumplenHoyCount}
            </span>
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-2">
            {cumplenHoyCount} {cumplenHoyCount === 1 ? 'Alumna' : 'Alumnas'}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {cumplenHoyCount > 0 ? '¡Tienen saludo listo para enviar hoy!' : 'No hay cumpleaños registrados para hoy'}
          </p>
        </button>

        <button
          onClick={() => setFilterMode('MES')}
          className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
            filterMode === 'MES'
              ? 'bg-[var(--color-wood)]/10 border-[var(--color-wood)] shadow-sm'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-[var(--color-wood)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Cake className="h-4 w-4 text-[var(--color-wood)]" /> Cumplen este Mes
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-wood)]/20 text-[var(--color-wood)]">
              {cumplenMesCount}
            </span>
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-2">
            {cumplenMesCount} {cumplenMesCount === 1 ? 'Alumna' : 'Alumnas'}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Cumpleaños durante el mes en curso
          </p>
        </button>

        <button
          onClick={() => setFilterMode('PROXIMOS')}
          className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
            filterMode === 'PROXIMOS'
              ? 'bg-blue-500/10 border-blue-500 shadow-sm'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" /> Próximos 30 Días
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400">
              {proximos30Count}
            </span>
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-2">
            {proximos30Count} {proximos30Count === 1 ? 'Alumna' : 'Alumnas'}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Cumpleaños en los próximos 30 días
          </p>
        </button>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-default)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('HOY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'HOY'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Hoy ({cumplenHoyCount})
          </button>
          <button
            onClick={() => setFilterMode('MES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'MES'
                ? 'bg-[var(--color-wood)] text-white shadow-xs'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Este Mes ({cumplenMesCount})
          </button>
          <button
            onClick={() => setFilterMode('PROXIMOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'PROXIMOS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Próximos 30d ({proximos30Count})
          </button>
          <button
            onClick={() => setFilterMode('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === 'TODOS'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xs'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todos ({alumnasConCumple.length})
          </button>
        </div>
      </div>

      {/* 3. Listado */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)]">
          <Spinner size="md" />
          <p className="text-xs text-[var(--text-muted)]">Cargando fechas de cumpleaños...</p>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="p-10 text-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
            <Cake className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {filterMode === 'HOY'
              ? 'Hoy no hay cumpleaños de alumnas'
              : 'No se encontraron alumnas con este criterio'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {filterMode === 'HOY'
              ? 'Podés consultar la pestaña "Este Mes" o "Próximos 30 Días" para planificar los saludos.'
              : 'Podés cargar la fecha de nacimiento al editar o crear una alumna para que aparezca en este calendario.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {listaFiltrada.map((alumna) => {
            const isToday = alumna.bdayInfo.isToday;
            const hasPhone = Boolean(alumna.phone && alumna.phone.replace(/\D/g, '').length >= 6);

            return (
              <Card
                key={alumna.id}
                className={`p-4 flex flex-col justify-between gap-3 border transition-all ${
                  isToday
                    ? 'border-amber-400 bg-amber-500/5 shadow-md ring-2 ring-amber-400/20'
                    : 'border-[var(--border-default)] hover:border-[var(--color-wood)]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center shrink-0 border ${
                        isToday
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-default)]'
                      }`}
                    >
                      {alumna.first_name[0] || 'A'}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
                        {alumna.first_name} {alumna.last_name || ''}
                        {isToday && <PartyPopper className="h-4 w-4 text-amber-500" />}
                      </h4>
                      <p className="text-xs font-semibold text-[var(--color-wood)] mt-0.5 flex items-center gap-1">
                        <Cake className="h-3.5 w-3.5" />
                        {alumna.bdayInfo.formattedDate}
                        {alumna.bdayInfo.ageToTurn && (
                          <span className="text-[var(--text-muted)] font-normal">
                            ({alumna.bdayInfo.ageToTurn} años)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Badge de Días */}
                  <div>
                    {isToday ? (
                      <span className="px-2 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white uppercase tracking-wider animate-bounce inline-block">
                        ¡Hoy! 🎂
                      </span>
                    ) : alumna.bdayInfo.daysUntil === 1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Mañana
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                        En {alumna.bdayInfo.daysUntil} días
                      </span>
                    )}
                  </div>
                </div>

                {/* Pie con Teléfono y Botón WhatsApp 1 Clic */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-default)] text-xs">
                  <span className="text-[var(--text-muted)] font-mono text-[11px] flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {alumna.phone || 'Sin teléfono'}
                  </span>

                  <button
                    onClick={() => handleEnviarSaludo(alumna)}
                    disabled={!hasPhone}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      hasPhone
                        ? isToday
                          ? 'bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-xs'
                          : 'bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30'
                        : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    }`}
                    title={hasPhone ? 'Abrir WhatsApp con saludo generado' : 'Esta alumna no tiene teléfono registrado'}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{isToday ? '¡Saludar Ahora!' : 'Enviar Saludo'}</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
