-- ============================================
-- Pilates Studio - Schema Inicial (Corregido RLS)
-- Archivo: 001_initial_schema.sql
-- Descripcion: Tablas base para auth y sedes sin recursion infinita RLS
-- ============================================

-- ============================================
-- 1. TABLA: sedes
-- ============================================
CREATE TABLE IF NOT EXISTS public.sedes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indices para sedes
CREATE INDEX IF NOT EXISTS idx_sedes_is_active ON public.sedes(is_active);

-- ============================================
-- 2. TABLA: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'PROFESORA' CHECK (role IN ('ADMIN', 'PROFESORA')),
  avatar_url TEXT,
  sede_id UUID REFERENCES public.sedes(id),
  phone TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_sede_id ON public.profiles(sede_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- ============================================
-- 3. FUNCION HELPER SECURITY DEFINER (EVITA RECURSION INFINITA RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. RLS (Row Level Security) Y POLITICAS
-- ============================================
-- Habilitar RLS
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politicas para sedes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver sedes" ON public.sedes;
CREATE POLICY "Usuarios autenticados pueden ver sedes"
  ON public.sedes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Solo admins pueden modificar sedes" ON public.sedes;
CREATE POLICY "Solo admins pueden modificar sedes"
  ON public.sedes
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Politicas para profiles (LECTURA PARA TODOS LOS AUTENTICADOS - EVITA 500 RECURSIVO)
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.profiles;

CREATE POLICY "Usuarios autenticados pueden ver perfiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins pueden gestionar perfiles" ON public.profiles;
CREATE POLICY "Admins pueden gestionar perfiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- 5. FUNCION Y TRIGGER: crear perfil automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'PROFESORA')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. FUNCION Y TRIGGER: actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 7. DATOS INICIALES
-- ============================================
INSERT INTO public.sedes (name, address, is_active)
VALUES ('Sede Principal', 'Nicaragua 148, La Rioja', true)
ON CONFLICT DO NOTHING;
