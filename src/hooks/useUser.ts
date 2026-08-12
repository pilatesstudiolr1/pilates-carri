'use client';

import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { useEffect, useState } from 'react';

interface UseUserReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useUser(): UseUserReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError || !data) {
          setError(profileError?.message || 'Perfil no encontrado');
          setProfile({
            id: user.id,
            email: user.email || 'admin@gmail.com',
            full_name: user.user_metadata?.full_name || 'Juliana',
            role: 'ADMIN',
            avatar_url: null,
            sede_id: null,
            phone: null,
            dni: null,
            commission_rate: 0.40,
            hourly_rate: 0,
            work_days: [],
            work_hours: [],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else {
          setProfile(data as Profile);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }

    }

    fetchProfile();
  }, []);

  return { profile, loading, error };
}
