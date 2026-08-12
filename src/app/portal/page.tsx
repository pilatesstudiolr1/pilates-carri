'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/hooks/useTheme';
import {
  LogOut,
  Sun,
  Moon,
  ArrowRight,
  UserCheck,
  Layers,
  Receipt,
  Lock,
} from 'lucide-react';

export default function DesignInspiredPortalPage() {
  const router = useRouter();
  const { profile, loading } = useUser();
  const { theme, toggleTheme } = useTheme();
  const userName = profile?.full_name || 'Juliana';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-6 sm:p-10 transition-colors duration-300 relative overflow-hidden"
      style={{
        backgroundImage:
          theme === 'dark'
            ? 'radial-gradient(rgba(255, 255, 255, 0.06) 1.5px, transparent 1.5px)'
            : 'radial-gradient(rgba(0, 0, 0, 0.05) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Bar Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4 pb-8 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <Image
            src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
            alt="Pilates Studio Logo"
            width={260}
            height={80}
            priority
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs font-semibold">
            <UserCheck className="h-3.5 w-3.5 text-[var(--color-wood)]" />
            <span>Usuario: <strong className="text-[var(--text-primary)]">{userName}</strong></span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
            title="Cambiar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Cerrar Sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center gap-10 py-8">
        {/* Title Section */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Selección de{' '}
            <span className="relative inline-block text-[var(--text-primary)]">
              Unidad
              <span className="absolute -bottom-1.5 left-0 w-full h-[4px] bg-[var(--color-wood)] rounded-full"></span>
            </span>
          </h1>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Panel de Profesora / Mis Clases (EXCLUSIVO PARA PROFESORA) */}
          {!loading && profile?.role === 'PROFESORA' && (
            <Link href="/profesora" className="group block">
              <div className="bg-[var(--bg-secondary)] border-2 border-emerald-500/80 hover:border-emerald-500 rounded-xl p-5 transition-all duration-200 flex flex-col gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 h-full justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                      Panel de Profesora
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">Turnos, asistencias y cobros</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-default)]/60 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-500 group-hover:underline">
                    MIS CLASES
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 flex items-center justify-center transition-all duration-200">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Tarjetas Exclusivas de Administración (Visibles únicamente para ADMIN) */}
          {!loading && profile?.role === 'ADMIN' && (
            <>
              {/* Card 2: Studio Pilates Reformer & Barre (SOLO ADMIN) */}
              <Link href="/reformer" className="group block">
                <div className="bg-[var(--bg-secondary)] border-2 border-[var(--color-wood)]/80 hover:border-[var(--color-wood)] rounded-xl p-5 transition-all duration-200 flex flex-col gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 h-full justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-wood)]/10 border border-[var(--color-wood)]/30 flex items-center justify-center text-[var(--color-wood)]">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                        Reformer &amp; Barre
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">Control general del estudio y clases</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-default)]/60 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--color-wood)] group-hover:underline">
                      INGRESAR
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] group-hover:bg-[var(--color-wood)] group-hover:text-white group-hover:border-[var(--color-wood)] flex items-center justify-center transition-all duration-200">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 3: Liquidación Semanal (SOLO ADMIN) */}
              <Link href="/liquidaciones-semanales" className="group block">
                <div className="bg-[var(--bg-secondary)] border-2 border-blue-500/80 hover:border-blue-500 rounded-xl p-5 transition-all duration-200 flex flex-col gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 h-full justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
                        Liquidaciones Semanales
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">Cálculo de comisiones y pagos</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-default)]/60 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-500 group-hover:underline">
                      INGRESAR
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 flex items-center justify-center transition-all duration-200">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>

      </main>
    </div>
  );
}
