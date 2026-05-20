// =====================================================
//  CONFIGURACIÓN — edita este archivo
// =====================================================

const CONFIG = {
  // 1. Tus credenciales de Supabase
  //    Ve a: https://supabase.com → tu proyecto → Settings → API
  SUPABASE_URL: 'sb_publistable_GjpPdeFrKsATmYlJuVNYCQ_7OiDEKSp',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycXRwemt0cm15b2hrbHR1Z3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzc5OTUsImV4cCI6MjA5NDgxMzk5NX0.pZpobZNUQvMYwlRAliDIJneJeCdJ5b3JySz1nUb6Jh8',

  // 2. Ruta a tu contrato PDF
  //    Opción A: súbelo a tu repo de GitHub y pon la ruta relativa
  //    Opción B: súbelo a Supabase Storage y pon la URL pública
  CONTRACT_PDF_URL: 'contrato.pdf',

  // 3. Nombre de tu empresa / marca (aparece en encabezado)
  COMPANY_NAME: 'Smitt-Dent',

  // 4. Bucket de Supabase Storage donde se guardan las firmas
  STORAGE_BUCKET: 'firmas',
};
