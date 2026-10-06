'use client';

import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { Sede } from '@/types/database';
import { getSedes } from '@/lib/services/sedes';
import { useUser } from '@/hooks/useUser';

const LOCAL_SEDE_KEY = 'pilates_selected_sede_id';

interface SedeContextType {
  sedes: Sede[];
  allSedes: Sede[];
  selectedSedeId: string;
  setSelectedSedeId: (id: string) => void;
  selectedSede: Sede | null;
  loading: boolean;
  isTeacherLocked: boolean;
  isTeacher: boolean;
  teacherSedeIds: string[];
}

const SedeContext = createContext<SedeContextType>({
  sedes: [],
  allSedes: [],
  selectedSedeId: 'ALL',
  setSelectedSedeId: () => {},
  selectedSede: null,
  loading: true,
  isTeacherLocked: false,
  isTeacher: false,
  teacherSedeIds: [],
});

export function SedeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUser();
  const [allSedes, setAllSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_SEDE_KEY) || 'ALL';
    }
    return 'ALL';
  });
  const [loading, setLoading] = useState<boolean>(true);

  const isTeacher = profile?.role === 'PROFESORA';

  // Obtener sedes asignadas a la profesora (definidas por Admin)
  const teacherSedeIds = useMemo<string[]>(() => {
    if (!isTeacher || !profile) return [];
    if (Array.isArray(profile.sede_ids) && profile.sede_ids.length > 0) {
      return profile.sede_ids;
    }
    if (profile.sede_id) {
      return [profile.sede_id];
    }
    return [];
  }, [isTeacher, profile]);

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const res = await getSedes({ isActive: true });
      if (res.data) {
        setAllSedes(res.data);
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

  // Sedes visibles para este usuario:
  // Si es Profesora: estrictamente las sedes asignadas por el Admin
  // Si es Admin: todas las sedes activas
  const visibleSedes = useMemo<Sede[]>(() => {
    if (!isTeacher) return allSedes;
    if (teacherSedeIds.length === 0) return allSedes; // Si aún no tiene sedes asignadas, fallback
    return allSedes.filter((s) => teacherSedeIds.includes(s.id));
  }, [isTeacher, allSedes, teacherSedeIds]);

  // Si la profesora tiene solo 1 sede asignada, queda bloqueada a esa sede
  const isTeacherLocked = Boolean(isTeacher && teacherSedeIds.length === 1);

  // Sincronizar selección inicial o cambios de perfil
  useEffect(() => {
    if (!isTeacher) return;

    if (teacherSedeIds.length === 1) {
      const singleSedeId = teacherSedeIds[0];
      setSelectedSedeIdState(singleSedeId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_SEDE_KEY, singleSedeId);
      }
    } else if (teacherSedeIds.length > 1) {
      // Si la selección guardada no está entre sus sedes asignadas ni es 'ALL', reiniciar a 'ALL'
      if (selectedSedeId !== 'ALL' && !teacherSedeIds.includes(selectedSedeId)) {
        setSelectedSedeIdState('ALL');
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_SEDE_KEY, 'ALL');
        }
      }
    }
  }, [isTeacher, teacherSedeIds, selectedSedeId]);

  const setSelectedSedeId = (id: string) => {
    if (isTeacherLocked && teacherSedeIds.length === 1) {
      // Profesora fija en su única sede asignada
      return;
    }
    // Si es profesora, restringir para que no pueda seleccionar una sede ajena
    if (isTeacher && id !== 'ALL' && !teacherSedeIds.includes(id)) {
      return;
    }
    setSelectedSedeIdState(id);
    localStorage.setItem(LOCAL_SEDE_KEY, id);
  };

  const selectedSede =
    selectedSedeId === 'ALL'
      ? null
      : visibleSedes.find((s) => s.id === selectedSedeId) || null;

  return (
    <SedeContext.Provider
      value={{
        sedes: visibleSedes,
        allSedes,
        selectedSedeId,
        setSelectedSedeId,
        selectedSede,
        loading,
        isTeacherLocked,
        isTeacher,
        teacherSedeIds,
      }}
    >
      {children}
    </SedeContext.Provider>
  );
}

export function useSede() {
  return useContext(SedeContext);
}
