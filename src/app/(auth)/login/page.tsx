'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { APP_NAME } from '@/lib/constants';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Email o contrasena incorrectos');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Ocurrio un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-4 animate-fade-in-up">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--color-wood)] mb-5 shadow-[var(--shadow-glow)]">
          <span className="text-2xl font-bold text-[var(--color-dark)]">PS</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          {APP_NAME}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Ingresa tus credenciales para acceder
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] border border-[var(--border-default)] p-6 shadow-[var(--shadow-lg)]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" />}
            required
            autoComplete="email"
          />

          <div className="relative">
            <Input
              label="Contrasena"
              type={showPassword ? 'text' : 'password'}
              placeholder="Tu contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full mt-2"
            size="lg"
          >
            Iniciar sesion
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-[var(--text-muted)] mt-6">
        Sistema de gestion interna
      </p>
    </div>
  );
}
