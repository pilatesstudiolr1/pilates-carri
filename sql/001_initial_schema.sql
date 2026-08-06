-- ============================================
-- Pilates Studio - Schema Inicial
-- Archivo: 001_initial_schema.sql
-- Descripcion: Tablas base para auth y sedes
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_sedes_is_active ON public.sedes(is_active);

-- RLS
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

-- Politica: cualquier usuario autenticado puede leer sedes
CREATE POLICY "Usuarios autenticados pueden ver sedes"
  ON public.sedes
  FOR SELECT
  TO authenticated
  USING (true);

-- Politica: solo admins pueden modificar sedes
CREATE POLICY "Solo admins pueden modificar sedes"
  ON public.sedes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

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

-- Indices
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_sede_id ON public.profiles(sede_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios pueden ver su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politica: admins pueden ver todos los perfiles
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- Politica: usuarios pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politica: admins pueden gestionar todos los perfiles
CREATE POLICY "Admins pueden gestionar perfiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
    )
  );

-- ============================================
-- 3. FUNCION: crear perfil automaticamente
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

-- Trigger: ejecutar al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. FUNCION: actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: actualizar updated_at en profiles
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. DATOS INICIALES
-- ============================================
-- Sede principal
INSERT INTO public.sedes (name, address, is_active)
VALUES ('Sede Principal', '', true)
ON CONFLICT DO NOTHING;
