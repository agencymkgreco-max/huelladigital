// =====================================================
//  CONFIGURACIÓN — edita este archivo
// =====================================================

const CONFIG = {
  // 1. Tus credenciales de Supabase
  //    Ve a: https://supabase.com → tu proyecto → Settings → API
  SUPABASE_URL: 'https://XXXXXXXXXXXXXXXX.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXX',

  // 2. Ruta a tu contrato PDF
  //    Opción A: súbelo a tu repo de GitHub y pon la ruta relativa
  //    Opción B: súbelo a Supabase Storage y pon la URL pública
  CONTRACT_PDF_URL: './contrato.pdf',

  // 3. Nombre de tu empresa / marca (aparece en encabezado)
  COMPANY_NAME: 'Mi Empresa',

  // 4. Bucket de Supabase Storage donde se guardan las firmas
  STORAGE_BUCKET: 'firmas',
};
