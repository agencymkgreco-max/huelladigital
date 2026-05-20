// =====================================================
//  app.js — Lógica principal
// =====================================================

// ── Supabase ──────────────────────────────────────
const { createClient } = supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── Estado global ─────────────────────────────────
const state = {
  nombre: '',
  email: '',
  firmaDataURL: null,
  biometricVerified: false,
  hasDrawn: false,
  submitting: false,
};

// ── Helpers ───────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = isError ? 'show error' : 'show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 3000);
}

function setDot(n, state) {
  const dot = document.getElementById('dot-' + n);
  if (!dot) return;
  dot.className = 'step-dot ' + state;
  if (state === 'done') dot.innerHTML = '✓';
  else dot.textContent = n;
}

function goToStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const target = n === 'success' ? document.getElementById('step-success') : document.getElementById('step-' + n);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function generateFolio() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CTR-${ts}-${rand}`;
}

// ── Cargar PDF ────────────────────────────────────
function loadContract() {
  const viewer = document.getElementById('contract-viewer');
  const placeholder = document.getElementById('contract-placeholder');
  const url = CONFIG.CONTRACT_PDF_URL;

  if (!url || url.includes('XXXXX')) {
    placeholder.querySelector('p').innerHTML =
      '⚠️ Configura <code>CONTRACT_PDF_URL</code> en <code>js/config.js</code>';
    return;
  }

  // Detectar móvil — embed puede fallar, usar iframe con Google Docs viewer como fallback
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  viewer.innerHTML = '';

  if (isMobile) {
    // En móvil, iframe con Google Docs viewer o link directo
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'height:100%;display:flex;flex-direction:column;';

    const iframe = document.createElement('iframe');
    // Intentar cargar directo primero; si falla mostramos fallback
    iframe.src = url;
    iframe.style.cssText = 'flex:1;border:none;';
    iframe.onerror = () => showPdfFallback(viewer, url);

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.style.cssText = 'display:block;text-align:center;padding:10px;font-size:0.8rem;color:#b8943f;border-top:1px solid #c8bfa8;text-decoration:none;';
    link.textContent = '↗ Abrir PDF en pantalla completa';

    wrapper.appendChild(iframe);
    wrapper.appendChild(link);
    viewer.appendChild(wrapper);
  } else {
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.style.cssText = 'width:100%;height:100%;';
    viewer.appendChild(embed);
  }
}

function showPdfFallback(viewer, url) {
  viewer.innerHTML = `
    <div class="contract-placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <p>Tu navegador no puede mostrar el PDF inline.</p>
      <a href="${url}" target="_blank" style="color:#b8943f;font-size:0.88rem;margin-top:8px;">
        Toca aquí para leer el contrato ↗
      </a>
    </div>`;
}

// ── Canvas firma ──────────────────────────────────
function initCanvas() {
  const canvas = document.getElementById('firma-canvas');
  const wrapper = document.getElementById('canvas-wrapper');
  const hint    = document.getElementById('canvas-hint');
  const ctx     = canvas.getContext('2d');

  // Ajustar resolución al DPR del dispositivo
  function resize() {
    const rect = wrapper.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = 200         * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0f0e0c';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }
  resize();
  window.addEventListener('resize', resize);

  let drawing = false;
  let lastX = 0, lastY = 0;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    lastX = x; lastY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
    hint.classList.add('hidden');
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    lastX = x; lastY = y;
    if (!state.hasDrawn) {
      state.hasDrawn = true;
      updateSubmitBtn();
    }
  }

  function stopDraw() {
    drawing = false;
    state.firmaDataURL = canvas.toDataURL('image/png');
  }

  canvas.addEventListener('mousedown',  startDraw);
  canvas.addEventListener('mousemove',  draw);
  canvas.addEventListener('mouseup',    stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove',  draw,      { passive: false });
  canvas.addEventListener('touchend',   stopDraw);

  document.getElementById('btn-clear').addEventListener('click', () => {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    hint.classList.remove('hidden');
    state.hasDrawn     = false;
    state.firmaDataURL = null;
    updateSubmitBtn();
  });
}

// ── WebAuthn ──────────────────────────────────────
async function doWebAuthn() {
  const btn   = document.getElementById('btn-biometric');
  const block = document.getElementById('biometric-block');

  // Verificar soporte
  if (!window.PublicKeyCredential) {
    block.classList.add('not-available');
    block.querySelector('h3').textContent = 'No disponible';
    block.querySelector('p').textContent  =
      'Este dispositivo no soporta biometría web. Puedes continuar solo con tu firma.';
    btn.textContent = 'Omitir verificación';
    btn.onclick = () => {
      state.biometricVerified = false;
      block.querySelector('h3').textContent = 'Omitida';
      btn.disabled = true;
      updateSubmitBtn();
    };
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Verificando…';

  try {
    // Generar challenge aleatorio
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required', // fuerza biometría (huella/FaceID)
        rpId: location.hostname === 'localhost' ? 'localhost' : location.hostname,
      },
    });

    if (credential) {
      state.biometricVerified = true;
      block.classList.add('verified');
      block.querySelector('h3').textContent = '✓ Identidad verificada';
      block.querySelector('p').textContent  = 'Tu biometría fue confirmada correctamente.';
      btn.textContent = '✓ Verificado';
      btn.style.background = '#27635a';
      toast('Biometría verificada correctamente');
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Reintentar verificación';

    if (err.name === 'NotAllowedError') {
      // Usuario canceló o no hay credencial registrada → ofrecer omitir
      block.querySelector('p').textContent =
        'Verificación cancelada. Puedes reintentar o continuar sin biometría.';
      const skip = document.createElement('button');
      skip.className = 'btn btn-outline';
      skip.style.cssText = 'margin-top:10px;max-width:240px;margin-left:auto;margin-right:auto;';
      skip.textContent = 'Continuar sin biometría';
      skip.onclick = () => {
        state.biometricVerified = false;
        skip.remove();
        btn.disabled = true;
        btn.textContent = 'Omitido';
        updateSubmitBtn();
      };
      block.appendChild(skip);
    } else {
      toast('Error de biometría: ' + err.message, true);
    }
  }

  updateSubmitBtn();
}

function updateSubmitBtn() {
  const btn = document.getElementById('btn-submit');
  const ready = state.hasDrawn && (state.biometricVerified || true);
  // El botón se habilita si al menos tiene firma dibujada
  btn.disabled = !state.hasDrawn;
}

// ── Subir firma a Supabase ────────────────────────
async function uploadFirma(dataURL) {
  const blob = await (await fetch(dataURL)).blob();
  const filename = `firma_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
  const { data, error } = await db.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(filename, blob, { contentType: 'image/png', upsert: false });
  if (error) throw error;

  const { data: { publicUrl } } = db.storage
    .from(CONFIG.STORAGE_BUCKET)
    .getPublicUrl(filename);

  return publicUrl;
}

// ── Guardar registro ──────────────────────────────
async function guardarFirma() {
  if (state.submitting) return;
  state.submitting = true;

  const btn = document.getElementById('btn-submit');
  btn.innerHTML = '<span class="spinner"></span>Guardando…';
  btn.disabled = true;

  try {
    // 1. Subir imagen de firma
    const firmaURL = await uploadFirma(state.firmaDataURL);

    // 2. Obtener IP del cliente
    let ip = 'desconocida';
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      ip = (await r.json()).ip;
    } catch (_) {}

    // 3. Insertar en tabla `firmas`
    const folio = generateFolio();
    const { error } = await db.from('firmas').insert({
      folio,
      nombre:              state.nombre,
      email:               state.email || null,
      firma_url:           firmaURL,
      biometrico_verificado: state.biometricVerified,
      ip_cliente:          ip,
      user_agent:          navigator.userAgent,
      contrato_version:    CONFIG.CONTRACT_PDF_URL,
      fecha_firma:         new Date().toISOString(),
    });

    if (error) throw error;

    // 4. Éxito
    document.getElementById('folio-num').textContent = folio;
    setDot(1, 'done'); setDot(2, 'done'); setDot(3, 'done');
    goToStep('success');

  } catch (err) {
    console.error(err);
    toast('Error al guardar: ' + (err.message || 'intenta de nuevo'), true);
    btn.innerHTML = 'Firmar contrato';
    btn.disabled = false;
  } finally {
    state.submitting = false;
  }
}

// ── Flujo de pasos ────────────────────────────────
function initSteps() {
  // Paso 1 → 2
  document.getElementById('btn-step1').addEventListener('click', () => {
    const nombre = document.getElementById('nombre').value.trim();
    if (nombre.length < 3) {
      toast('Ingresa tu nombre completo', true); return;
    }
    state.nombre = nombre;
    state.email  = document.getElementById('email').value.trim();
    setDot(1, 'done'); setDot(2, 'active');
    goToStep(2);
    loadContract();
  });

  // Checkbox habilita btn paso 2
  document.getElementById('check-acepto').addEventListener('change', e => {
    document.getElementById('btn-step2').disabled = !e.target.checked;
  });

  // Paso 2 → 3
  document.getElementById('btn-step2').addEventListener('click', () => {
    setDot(2, 'done'); setDot(3, 'active');
    goToStep(3);
    initCanvas();
  });

  // Biométrico
  document.getElementById('btn-biometric').addEventListener('click', doWebAuthn);

  // Submit final
  document.getElementById('btn-submit').addEventListener('click', guardarFirma);
}

// ── Nombre empresa ────────────────────────────────
document.querySelector('header h1').textContent =
  (CONFIG.COMPANY_NAME || 'Firma de Contrato');

// ── Init ──────────────────────────────────────────
initSteps();
