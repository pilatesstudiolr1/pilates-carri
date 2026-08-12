'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Sede } from '@/types/database';
import { getSedes } from '@/lib/services/sedes';

const LOCAL_SEDE_KEY = 'pilates_selected_sede_id';

interface SedeContextType {
  sedes: Sede[];
  selectedSedeId: string;
  setSelectedSedeId: (id: string) => void;
  selectedSede: Sede | null;
  loading: boolean;
}

const SedeContext = createContext<SedeContextType>({
  sedes: [],
  selectedSedeId: 'ALL',
  setSelectedSedeId: () => {},
  selectedSede: null,
  loading: true,
});

export function SedeProvider({ children }: { children: React.ReactNode }) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_SEDE_KEY) || 'ALL';
    }
    return 'ALL';
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const res = await getSedes({ isActive: true });
      if (res.data && res.data.length > 0) {
        setSedes(res.data);
      } else {
        const defaultSedes: Sede[] = [
          {
            id: 'sede-norte',
            name: 'Sede Norte (Nicaragua 148)',
            address: 'Nicaragua 148, La Rioja',
            phone: '3804-000000',
            max_camillas: 6,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'sede-centro',
            name: 'Sede Centro',
            address: 'Av. Rivadavia 250, La Rioja',
            phone: '3804-111111',
            max_camillas: 4,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ];
        setSedes(defaultSedes);
      }
    } catch (err) {
      console.error('Error al cargar sedes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSedes();
  }, []);

  const setSelectedSedeId = (id: string) => {
    setSelectedSedeIdState(id);
    localStorage.setItem(LOCAL_SEDE_KEY, id);
  };

  const selectedSede =
    selectedSedeId === 'ALL'
      ? null
      : sedes.find((s) => s.id === selectedSedeId) || null;

  return (
    <SedeContext.Provider
      value={{
        sedes,
        selectedSedeId,
        setSelectedSedeId,
        selectedSede,
        loading,
      }}
    >
      {children}
    </SedeContext.Provider>
  );
}

export function useSede() {
  return useContext(SedeContext);
}
