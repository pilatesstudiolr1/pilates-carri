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
  Flower2,
} from 'lucide-react';

export default function LatticePortalPage() {
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-6 sm:p-12 transition-colors duration-150 relative">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 pb-8 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <Image
            src={theme === 'dark' ? '/media/LOGO BLANCO.webp' : '/media/LOGO.webp'}
            alt="Pilates Studio Logo"
            width={180}
            height={48}
            priority
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-[22px] bg-[var(--badge-meadow-bg)] text-[var(--badge-meadow-text)] border border-[var(--badge-meadow-border)] text-xs font-medium shadow-2xs">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Usuario: <strong>{userName}</strong></span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-[29px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] transition-colors cursor-pointer"
            title="Cambiar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-[29px] bg-[var(--bg-secondary)] text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
            title="Cerrar Sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center gap-10 py-10">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Portal de módulos
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Seleccioná el módulo de trabajo correspondiente
          </p>
        </div>

        {/* Cards Grid — Lattice Pastel Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Profesora (Solo si es PROFESORA) */}
          {!loading && profile?.role === 'PROFESORA' && (
            <Link href="/profesora" className="group block">
              <div className="surface-mint rounded-[14px] p-6 transition-all duration-200 flex flex-col gap-8 shadow-md hover:-translate-y-1 hover:shadow-lg h-full justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[var(--color-deep-teal)] text-white dark:text-[#001f1f] flex items-center justify-center">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                    Mis Clases
                  </h2>
                </div>

                <div className="pt-4 border-t border-[var(--surface-mint-border)] flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-primary)]">
                    Ingresar al Panel
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center transition-transform group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Cards Exclusivas ADMIN */}
          {!loading && profile?.role === 'ADMIN' && (
            <>
              {/* Card 1: Studio Pilates Reformer (Mint Surface) */}
              <Link href="/reformer" className="group block">
                <div className="surface-mint rounded-[14px] p-6 transition-all duration-200 flex flex-col gap-8 shadow-md hover:-translate-y-1 hover:shadow-lg h-full justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-deep-teal)] text-white dark:text-[#001f1f] flex items-center justify-center">
                      <Layers className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                      Pilates Reformer
                    </h2>
                  </div>

                  <div className="pt-4 border-t border-[var(--surface-mint-border)] flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-primary)]">
                      Centro de Control
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 2: Liquidaciones Semanales (Lavender Surface) */}
              <Link href="/liquidaciones-semanales" className="group block">
                <div className="surface-lavender rounded-[14px] p-6 transition-all duration-200 flex flex-col gap-8 shadow-md hover:-translate-y-1 hover:shadow-lg h-full justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-iris)] text-white dark:text-[#001f1f] flex items-center justify-center">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                      Liquidaciones Semanales
                    </h2>
                  </div>

                  <div className="pt-4 border-t border-[var(--surface-lavender-border)] flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-primary)]">
                      Gestionar Comisiones
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Card 3: Centro de Estética (Lime / Buttercream Surface) */}
              <Link href="/estetica" className="group block">
                <div className="surface-lime rounded-[14px] p-6 transition-all duration-200 flex flex-col gap-8 shadow-md hover:-translate-y-1 hover:shadow-lg h-full justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-olive)] text-white dark:text-[#001f1f] flex items-center justify-center">
                      <Flower2 className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                      Centro de Estética
                    </h2>
                  </div>

                  <div className="pt-4 border-t border-[var(--surface-lime-border)] flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-primary)]">
                      Ingresar a Estética
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center transition-transform group-hover:translate-x-1">
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
