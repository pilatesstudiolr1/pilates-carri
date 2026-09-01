'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, CheckSquare, Square, Loader2 } from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'pilates_remembered_email';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      const supabase = createClient();
      const identifier = email.trim();
      let targetEmail = identifier;

      if (!identifier.includes('@')) {
        // Buscar el email asociado al nombre de usuario
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('email')
          .ilike('username', identifier)
          .maybeSingle();

        if (matchedProfile?.email) {
          targetEmail = matchedProfile.email;
        } else {
          targetEmail = `${identifier.toLowerCase()}@pilateslr.com`;
        }
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (authError) {
        setError('Usuario/email o contraseña incorrectos');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Ocurrió un error inesperado al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto px-2">
      {/* Logo Display */}
      <div className="text-center mb-6 flex justify-center">
        <Image
          src="/media/LOGO.webp"
          alt="Pilates Studio Logo"
          width={210}
          height={75}
          priority
          className="h-auto w-auto object-contain"
        />
      </div>

      {/* Main Title Section (matching referencia.png layout) */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-[#1E1E1E] tracking-tight">
          Bienvenido a
        </h1>
        <h2 className="text-3xl font-bold text-[#1E1E1E] tracking-tight -mt-1">
          Pilates Studio
        </h2>
        <p className="text-xs text-[#78716C] mt-2">
          Ingresa con tu correo o usuario para continuar
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email or Username Pill Input */}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 w-7 h-7 rounded-full bg-[#F5EFEE] flex items-center justify-center text-[#3D4A3E] pointer-events-none">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Usuario o correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="w-full h-13 pl-13 pr-4 rounded-full bg-white text-[#1E1E1E] caret-[#1E1E1E] cursor-text border border-[#E5E0D8] placeholder:text-[#A8A29E] hover:bg-white hover:border-[#DFB267]/60 focus:bg-white focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:border-[#DFB267]/60 focus:shadow-[0_0_12px_rgba(223,178,103,0.22)] transition-all duration-300 shadow-xs"
          />
        </div>

        {/* Password Pill Input */}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 w-7 h-7 rounded-full bg-[#F5EFEE] flex items-center justify-center text-[#3D4A3E] pointer-events-none">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full h-13 pl-13 pr-11 rounded-full bg-white text-[#1E1E1E] caret-[#1E1E1E] cursor-text border border-[#E5E0D8] placeholder:text-[#A8A29E] hover:bg-white hover:border-[#DFB267]/60 focus:bg-white focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:border-[#DFB267]/60 focus:shadow-[0_0_12px_rgba(223,178,103,0.22)] transition-all duration-300 shadow-xs"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 text-[#A8A29E] hover:text-[#1E1E1E] transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>


        {/* Checkbox option */}
        <div className="flex items-center justify-between px-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-[#57534E] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="hidden"
            />
            <span className="text-[#3D4A3E]">
              {rememberMe ? (
                <CheckSquare className="h-4 w-4 text-[#3D4A3E]" />
              ) : (
                <Square className="h-4 w-4 text-[#A8A29E]" />
              )}
            </span>
            <span>Recordar sesión</span>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2.5 rounded-full bg-[#F87171]/10 border border-[#F87171]/30 text-xs text-[#DC2626] font-medium text-center">
            {error}
          </div>
        )}

        {/* Submit Pill Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-13 mt-2 rounded-full bg-[#DFB267] hover:bg-[#D4A556] text-[#1E1E1E] font-semibold text-sm tracking-wide transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#1E1E1E]" />
          ) : (
            <span>Iniciar sesión</span>
          )}
        </button>
      </form>
    </div>
  );
}




