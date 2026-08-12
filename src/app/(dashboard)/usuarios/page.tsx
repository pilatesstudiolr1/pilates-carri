'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';

export default function UsuariosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profesoras');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner size="lg" />
      <p className="text-xs text-[var(--text-muted)]">Redirigiendo a Profesores y Usuarios...</p>
    </div>
  );
}
