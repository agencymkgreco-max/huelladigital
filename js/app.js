// js/app.js — Versión adaptada y mejorada
const { createClient } = supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const state = {
  nombre: '',
  email: '',
  firmaDataURL: null,
  biometricVerified: false,
  biometricSkipped: false,
  hasDrawn: false,
  submitting: false,
  huellasource: null, // 'webauthn', 'usb', null
};

// ── Helpers ───────────────────────────────────────
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = isError ? 'show error' : 'show';
  setTimeout(() => el.className = '', 3000);
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
  const url = CONFIG.CONTRACT_PDF_URL;

  if (!url || url.includes('XXXX')) {
    viewer.innerHTML = `<p style="color:red;">⚠️ Configura CONTRACT_PDF_URL en config.js</p>`;
    return;
  }

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  viewer.innerHTML = '';

  if (isMobile) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'height:100%;display:flex;flex-direction:column;';
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'flex:1;border:none;';
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.textContent = '↗ Abrir PDF completo';
    link.style.cssText = 'display:block;text-align:center;padding:10px;color:#b8943f;';

    wrapper.append(iframe, link);
    viewer.appendChild(wrapper);
  } else {
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.style.cssText = 'width:100%;height:100%;';
    viewer.appendChild(embed);
  }
}

// ── Canvas Firma ──────────────────────────────────
function initCanvas() {
  const canvas = document.getElementById('firma-canvas');
  const wrapper = document.getElementById('canvas-wrapper');
  const hint = document.getElementById('canvas-hint');
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0f0e0c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  resize();
  window.addEventListener('resize', resize);

  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
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
    if (!state.hasDrawn) {
      state.hasDrawn = true;
      updateSubmitBtn();
    }
  }

  function stopDraw() {
    drawing = false;
    state.firmaDataURL = canvas.toDataURL('image/png');
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  document.getElementById('btn-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hint.classList.remove('hidden');
    state.hasDrawn = false;
    state.firmaDataURL = null;
    updateSubmitBtn();
  });
}

// ── WebAuthn (Huella / Face ID) ─────────────────────
async function doWebAuthn() {
  const btn = document.getElementById('btn-biometric');
  const block = document.getElementById('biometric-block');

  if (!window.PublicKeyCredential) {
    block.classList.add('not-available');
    btn.textContent = 'No disponible';
    btn.disabled = true;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Verificando…';

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: location.hostname === 'localhost' ? 'localhost' : location.hostname,
      }
    });

    if (credential) {
      state.biometricVerified = true;
      state.biometricSkipped = false;
      state.huellasource = 'webauthn';
      block.classList.add('verified');
      btn.textContent = '✓ Verificado';
      btn.disabled = true;
      toast('Biometría verificada correctamente');
      updateSubmitBtn();
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'Reintentar';
    if (err.name === 'NotAllowedError') {
      toast('Verificación cancelada por el usuario', true);
    } else {
      toast('Error: ' + err.message, true);
    }
  }
}

function updateSubmitBtn() {
  document.getElementById('btn-submit').disabled = !state.hasDrawn;
}

// ── Guardar Firma ─────────────────────────────────
async function guardarFirma() {
  if (state.submitting) return;
  state.submitting = true;

  const btn = document.getElementById('btn-submit');
  btn.innerHTML = '<span class="spinner"></span>Guardando…';
  btn.disabled = true;

  try {
    const blob = await (await fetch(state.firmaDataURL)).blob();
    const filename = `firma_${Date.now()}.png`;

    const { error: uploadError } = await db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(filename, blob, { contentType: 'image/png' });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = db.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(filename);

    let ip = 'desconocida';
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      ip = (await r.json()).ip;
    } catch (_) {}

    const folio = generateFolio();

    const { error } = await db.from('firmas').insert({
      folio,
      nombre: state.nombre,
      email: state.email || null,
      firma_url: publicUrl,
      biometrico_verificado: state.biometricVerified,
      biometrico_omitido: state.biometricSkipped,
      huella_source: state.huellasource,
      ip_cliente: ip,
      user_agent: navigator.userAgent,
      contrato_version: CONFIG.CONTRACT_PDF_URL,
      fecha_firma: new Date().toISOString(),
    });

    if (error) throw error;

    document.getElementById('folio-num').textContent = folio;
    setDot(1, 'done'); setDot(2, 'done'); setDot(3, 'done');
    goToStep('success');

  } catch (err) {
    console.error(err);
    toast('Error al guardar: ' + err.message, true);
  } finally {
    state.submitting = false;
    btn.innerHTML = 'Firmar contrato';
    btn.disabled = false;
  }
}

// ── Inicialización ─────────────────────────────────
function initSteps() {
  document.getElementById('btn-step1').addEventListener('click', () => {
    const nombre = document.getElementById('nombre').value.trim();
    if (nombre.length < 3) return toast('Ingresa nombre completo', true);

    state.nombre = nombre;
    state.email = document.getElementById('email').value.trim();

    setDot(1, 'done');
    goToStep(2);
    loadContract();
  });

  document.getElementById('check-acepto').addEventListener('change', e => {
    document.getElementById('btn-step2').disabled = !e.target.checked;
  });

  document.getElementById('btn-step2').addEventListener('click', () => {
    setDot(2, 'done');
    goToStep(3);
    initCanvas();
  });

  document.getElementById('btn-biometric').addEventListener('click', doWebAuthn);
  document.getElementById('btn-submit').addEventListener('click', guardarFirma);
}

document.querySelector('header h1').textContent = CONFIG.COMPANY_NAME || 'Smitt-Dent';

initSteps();
