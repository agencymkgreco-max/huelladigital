-- =====================================================
--  SUPABASE — Ejecuta esto en el SQL Editor de tu proyecto
--  https://supabase.com → tu proyecto → SQL Editor
-- =====================================================

-- 1. Tabla principal de firmas
CREATE TABLE IF NOT EXISTS public.firmas (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio                 TEXT NOT NULL,
  nombre                TEXT NOT NULL,
  email                 TEXT,
  firma_url             TEXT,
  biometrico_verificado BOOLEAN DEFAULT false,
  ip_cliente            TEXT,
  user_agent            TEXT,
  contrato_version      TEXT,
  fecha_firma           TIMESTAMPTZ DEFAULT now(),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_firmas_nombre ON public.firmas (nombre);
CREATE INDEX IF NOT EXISTS idx_firmas_fecha  ON public.firmas (fecha_firma DESC);
CREATE INDEX IF NOT EXISTS idx_firmas_folio  ON public.firmas (folio);

-- 3. Row Level Security (RLS)
ALTER TABLE public.firmas ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede INSERTAR (clientes firmando)
CREATE POLICY "insert_publico"
  ON public.firmas FOR INSERT
  WITH CHECK (true);

-- Solo usuarios autenticados (admin) pueden LEER
CREATE POLICY "select_admin"
  ON public.firmas FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
--  STORAGE — Crea el bucket manualmente en el dashboard:
--  Supabase → Storage → New bucket → nombre: "firmas" → Public: ON
--
--  Luego ejecuta estas políticas:
-- =====================================================

-- Permitir subida anónima al bucket "firmas"
CREATE POLICY "upload_firmas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'firmas');

-- Permitir lectura pública de imágenes
CREATE POLICY "read_firmas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'firmas');
