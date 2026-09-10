'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Alumna, Sede } from '@/types/database';
import { Search, X, Check, ChevronDown, UserCheck } from 'lucide-react';

interface AlumnaComboboxProps {
  alumnas: Alumna[];
  selectedAlumnaId: string;
  onChange: (alumnaId: string) => void;
  sedes?: Sede[];
  selectedSedeId?: string;
  disabled?: boolean;
  required?: boolean;
}

export function AlumnaCombobox({
  alumnas,
  selectedAlumnaId,
  onChange,
  sedes = [],
  selectedSedeId = 'ALL',
  disabled = false,
  required = false,
}: AlumnaComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAlumna = useMemo(() => {
    return alumnas.find((a) => a.id === selectedAlumnaId) || null;
  }, [alumnas, selectedAlumnaId]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar alumnas por nombre, apellido y DNI
  const filteredAlumnas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return alumnas.slice(0, 50); // Mostrar primeras 50 si no hay término

    const cleanTerm = term.replace(/[.\-\s]/g, '');

    return alumnas.filter((a) => {
      const nombreCompleto = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const dni = (a.dni || '').replace(/[.\-\s]/g, '').toLowerCase();
      const phone = (a.phone || '').toLowerCase();

      return nombreCompleto.includes(term) || dni.includes(cleanTerm) || phone.includes(term);
    });
  }, [alumnas, searchTerm]);

  const handleSelect = (alumnaId: string) => {
    onChange(alumnaId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const getSedeNombre = (sedeId?: string | null) => {
    if (!sedeId) return null;
    return sedes.find((s) => s.id === sedeId)?.name || null;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo principal */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full min-h-10 px-3 py-2 rounded-[12px] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs border transition-all cursor-pointer flex items-center justify-between gap-2 ${
          isOpen
            ? 'border-[var(--border-focus)] ring-2 ring-[var(--border-focus)]/20'
            : 'border-[var(--border-default)] hover:border-[var(--text-muted)]'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          {selectedAlumna ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-[var(--text-primary)] truncate">
                {selectedAlumna.first_name} {selectedAlumna.last_name || ''}
              </span>
              {selectedAlumna.dni && (
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] shrink-0">
                  DNI: {selectedAlumna.dni}
                </span>
              )}
              {selectedSedeId === 'ALL' && selectedAlumna.sede_id && (
                <span className="text-[10px] text-[var(--text-muted)] shrink-0 truncate">
                  • {getSedeNombre(selectedAlumna.sede_id)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[var(--text-muted)] font-medium">
              Buscar por nombre, apellido o DNI...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedAlumna && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-rose-500 transition-colors"
              title="Quitar alumna seleccionada"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown flotante */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[12px] shadow-xl overflow-hidden animate-fade-in text-[var(--text-primary)]">
          {/* Input de búsqueda interno */}
          <div className="p-2 border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribí nombre, apellido o número de DNI..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-transparent border-0 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none font-medium"
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Listado de resultados */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border-default)] custom-scrollbar">
            {filteredAlumnas.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                No se encontraron alumnas con "{searchTerm}".
              </div>
            ) : (
              filteredAlumnas.map((a) => {
                const isSelected = a.id === selectedAlumnaId;
                const sedeName = getSedeNombre(a.sede_id);

                return (
                  <div
                    key={a.id}
                    onClick={() => handleSelect(a.id)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] font-bold'
                        : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold capitalize truncate">
                          {a.first_name} {a.last_name || ''}
                        </span>
                        {a.dni ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] shrink-0">
                            DNI: {a.dni}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)] italic shrink-0">
                            Sin DNI
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)] mt-0.5">
                        {a.phone && <span>Tel: {a.phone}</span>}
                        {a.plan && <span>• Plan: {a.plan}</span>}
                        {selectedSedeId === 'ALL' && sedeName && (
                          <span className="text-[var(--text-muted)]">• {sedeName}</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pie informativo del buscador */}
          <div className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-default)]">
            <span>{filteredAlumnas.length} alumnas disponibles</span>
            <span>Click o Enter para seleccionar</span>
          </div>
        </div>
      )}
    </div>
  );
}
