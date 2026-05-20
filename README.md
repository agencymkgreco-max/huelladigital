# 📝 App de Firma Digital de Contratos

Aplicación web para que tus clientes firmen tu contrato con:
- ✍️ Firma con el dedo (imagen PNG guardada)
- 🔐 Verificación biométrica WebAuthn (huella / Face ID)
- 📄 Visualización del contrato PDF
- 🗄️ Almacenamiento en Supabase

---

## 🚀 Pasos para instalar

### 1. Crea tu proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta todo el contenido de `supabase_setup.sql`
4. Ve a **Storage → New bucket** → nombre: `firmas` → activa "Public bucket"

### 2. Crea tu cuenta de admin

1. En Supabase ve a **Authentication → Users → Invite user**
2. Ingresa tu correo — recibirás un email para crear contraseña
3. Esa cuenta es la que usas para entrar a `admin.html`

### 3. Configura el proyecto

Edita el archivo `js/config.js`:

```js
const CONFIG = {
  SUPABASE_URL:  'https://XXXXXXXX.supabase.co',   // ← tu URL
  SUPABASE_ANON_KEY: 'eyJ...',                       // ← tu anon key
  CONTRACT_PDF_URL: './contrato.pdf',                // ← ruta a tu PDF
  COMPANY_NAME: 'Mi Empresa',                        // ← tu nombre
  STORAGE_BUCKET: 'firmas',
};
```

> Encontrarás `SUPABASE_URL` y `SUPABASE_ANON_KEY` en:
> Supabase → Settings → API → Project URL y anon public key

### 4. Agrega tu contrato PDF

- Copia tu archivo PDF a la raíz del proyecto
- Renómbralo `contrato.pdf` (o cambia `CONTRACT_PDF_URL` en config)

### 5. Publica en GitHub Pages

```bash
# 1. Crea un repositorio en GitHub

# 2. Sube los archivos
git init
git add .
git commit -m "App firma digital"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main

# 3. En GitHub: Settings → Pages → Source: main branch → Save
# Tu app estará en: https://TU_USUARIO.github.io/TU_REPO/
```

---

## 📁 Estructura de archivos

```
/
├── index.html          ← Página de firma para clientes
├── admin.html          ← Panel admin (solo tú)
├── contrato.pdf        ← Tu contrato (agrégalo tú)
├── js/
│   ├── config.js       ← ⚠️ Configura aquí tus credenciales
│   └── app.js          ← Lógica principal
└── supabase_setup.sql  ← SQL para crear tablas en Supabase
```

---

## 🗄️ Datos que se guardan por cada firma

| Campo | Descripción |
|-------|-------------|
| `folio` | ID único del contrato (ej: CTR-ABC123) |
| `nombre` | Nombre completo del cliente |
| `email` | Correo (opcional) |
| `firma_url` | URL de la imagen PNG de la firma |
| `biometrico_verificado` | Si usó huella/Face ID |
| `ip_cliente` | IP del dispositivo |
| `fecha_firma` | Fecha y hora exacta |
| `contrato_version` | Ruta al PDF usado |

---

## ⚠️ Nota sobre biometría

WebAuthn (el estándar web para huella/Face ID) **verifica** que alguien con biometría registrada en el dispositivo confirmó la acción — pero por seguridad del SO, **no expone la imagen de la huella**. Esto es igual a como funciona en apps bancarias.

La combinación firma-en-pantalla + verificación biométrica + timestamp + IP es equivalente a lo que usan servicios como DocuSign.

---

## 🔒 Seguridad

- La llave `SUPABASE_ANON_KEY` es segura de exponer en el frontend (solo permite insertar firmas y leer imágenes públicas)
- El panel admin requiere autenticación de Supabase
- Las firmas solo son visibles para usuarios autenticados (tú)
