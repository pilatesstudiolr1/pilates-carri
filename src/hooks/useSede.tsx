'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Sede } from '@/types/database';
import { getSedes } from '@/lib/services/sedes';
import { useUser } from '@/hooks/useUser';

const LOCAL_SEDE_KEY = 'pilates_selected_sede_id';

interface SedeContextType {
  sedes: Sede[];
  selectedSedeId: string;
  setSelectedSedeId: (id: string) => void;
  selectedSede: Sede | null;
  loading: boolean;
  isTeacherLocked: boolean;
}

const SedeContext = createContext<SedeContextType>({
  sedes: [],
  selectedSedeId: 'ALL',
  setSelectedSedeId: () => {},
  selectedSede: null,
  loading: true,
  isTeacherLocked: false,
});

export function SedeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUser();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_SEDE_KEY) || 'ALL';
    }
    return 'ALL';
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Si el usuario es profesora y tiene una sede fija asignada, fijarla automáticamente
  const isTeacher = profile?.role === 'PROFESORA';
  const assignedSedeId = profile?.sede_id;
  const isTeacherLocked = Boolean(isTeacher && assignedSedeId);

  useEffect(() => {
    if (isTeacher && assignedSedeId) {
      setSelectedSedeIdState(assignedSedeId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_SEDE_KEY, assignedSedeId);
      }
    }
  }, [isTeacher, assignedSedeId]);

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const res = await getSedes({ isActive: true });
      if (res.data) {
        setSedes(res.data);
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
    if (isTeacherLocked && assignedSedeId) {
      // Profesora fija en su sede asignada
      return;
    }
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
        isTeacherLocked,
      }}
    >
      {children}
    </SedeContext.Provider>
  );
}

export function useSede() {
  return useContext(SedeContext);
}
