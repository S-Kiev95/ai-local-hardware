/* ═══════════════════════════════════════════════════════════════
   Controlador del deck.
   Escenario fijo escalado, navegación por teclado y clicker,
   direcciones propias por slide, y sincronía con el plano.
   ═══════════════════════════════════════════════════════════════ */


const $ = (s, r = document) => r.querySelector(s);

const deck      = $('.deck');
const stage     = $('.stage');
const slidesEl  = $('.slides');
const railMarks = $('.rail-marks');
const railCount = $('.rail-count');
const overview  = $('.overview');
const ovGrid    = $('.ov-grid');
const planeHost = $('.plane');

const plano = crearPlano(planeHost);

let idx = 0;
const vistas = new Set();

/* ── Construcción ───────────────────────────────────────────── */
function construir() {
  $('.lb-name').textContent = PROYECTO.nombre;
  $('.lb-meta').textContent = `${PROYECTO.subtitulo} · ${PROYECTO.relevamiento}`;
  CEREBRO.montar($('.cerebro'));
  document.title = `${PROYECTO.nombre} — El Techo`;

  SLIDES.forEach((s, i) => {
    const sec = document.createElement('section');
    sec.className = 'slide';
    sec.id = 's-' + s.id;
    sec.dataset.layout = s.layout || 'default';
    /* Cuando el plano está quieto no reserva la mitad derecha, así que
       el contenido se queda con todo el ancho. La composición sigue al
       instrumento en vez de asumir siempre la misma caja. */
    sec.dataset.plotmode = (s.plot ? s.plot().mode : 'quiet') || 'quiet';
    /* Con el cerebro a la derecha, el texto se queda con la columna
       izquierda como cuando el plano está presente. */
    if (s.cerebro) sec.dataset.cerebro = 'true';
    sec.setAttribute('aria-label', `${i + 1}. ${s.nav || s.title || ''}`);

    if (s.layout === 'hero') {
      sec.innerHTML = s.body();
    } else {
      sec.innerHTML = `
        <header class="slide-head settle">
          <h2 class="title">${s.title}</h2>
        </header>
        <div class="slide-body settle">${s.body()}</div>
        <footer class="slide-foot settle">
          <span class="tick">${s.sec}</span>
          <span class="obs">${i + 1} / ${SLIDES.length}</span>
        </footer>`;
    }
    slidesEl.appendChild(sec);

    const b = document.createElement('button');
    b.className = 'rail-mark';
    b.type = 'button';
    b.dataset.secStart = String(SECCIONES.some((x) => x.desde === i));
    b.title = `${i + 1}. ${s.nav || ''}`;
    b.setAttribute('aria-label', `Ir a ${i + 1}. ${s.nav || ''}`);
    b.addEventListener('click', () => ir(i));
    railMarks.appendChild(b);
  });

  SECCIONES.forEach((sec) => {
    const h = document.createElement('div');
    h.className = 'ov-sec';
    h.textContent = sec.nombre;
    ovGrid.appendChild(h);
    sec.items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'ov-item';
      b.type = 'button';
      b.innerHTML = `<span class="n mono">${String(it.i + 1).padStart(2, '0')}</span><span>${it.nav}</span>`;
      b.addEventListener('click', () => { cerrarIndice(); ir(it.i); });
      ovGrid.appendChild(b);
    });
  });

  cargarFotos();
}

/* Las fotos son opcionales. Si el archivo no está, la slide se
   sostiene sola y dice qué falta. Nunca un hueco silencioso. */
/* Si la foto está, entra anotada. Si no está, la figura desaparece
   por completo y la slide se sostiene sola.
   Lo que NUNCA puede pasar es proyectarle a un panel de evaluadores
   una ruta de archivo interna y una nota dirigida al presentador:
   la guía de qué falta va a la consola y a assets/hardware/LEEME.md,
   que es donde la lee quien arma el deck, no la sala. */
/* Prueba las extensiones en orden hasta que una cargue. Así el
   archivo se llama `rtx-5090` y da igual si es jpg, png o webp. */
const EXTS = ['jpg', 'jpeg', 'png', 'webp'];
function cargarConExtension(base) {
  return new Promise((resolve) => {
    let i = 0;
    const probar = () => {
      if (i >= EXTS.length) return resolve(null);
      const img = new Image();
      const url = `${base}.${EXTS[i++]}`;
      img.onload = () => resolve({ img, url });
      img.onerror = probar;
      img.src = url;
    };
    probar();
  });
}

function cargarFotos() {
  const faltantes = [];
  const tareas = [];

  document.querySelectorAll('.photo[data-base]').forEach((fig) => {
    const nota = fig.querySelector('.ph-what')?.textContent.trim() || '';
    tareas.push(cargarConExtension(fig.dataset.base).then((r) => {
      if (!r) { fig.dataset.state = 'absent'; faltantes.push(fig.dataset.base); return; }
      fig.dataset.state = 'ok';
      fig.querySelectorAll('.ph-file, .ph-what').forEach((n) => n.remove());
      r.img.alt = nota;
      fig.prepend(r.img);
    }));
  });

  /* Logos: cada uno entra si existe; la franja entera desaparece si
     no entró ninguno, para no dejar una fila vacía. */
  document.querySelectorAll('.logos, .logo-wall').forEach((strip) => {
    const items = [...strip.querySelectorAll('.logo[data-base]')];
    tareas.push(Promise.all(items.map((el) =>
      cargarConExtension(el.dataset.base).then((r) => {
        if (!r) { (el.closest('.lw-item') || el).remove(); faltantes.push(el.dataset.base); return false; }
        r.img.alt = el.title;
        el.appendChild(r.img);
        return true;
      }),
    )).then((res) => { strip.dataset.state = res.some(Boolean) ? 'ok' : 'absent'; }));
  });

  Promise.all(tareas).then(() => {
    if (faltantes.length) {
      const lista = faltantes.map((f) => '  · ' + f + '.(jpg|png|webp)').join(String.fromCharCode(10));
      console.info(
        '[deck] ' + faltantes.length + ' imagen(es) sin archivo — quedaron ocultas.' +
        String.fromCharCode(10) + lista + String.fromCharCode(10) +
        'Ver assets/hardware/LEEME.md para los nombres exactos.',
      );
    }
  });
}

/* ── Navegación ─────────────────────────────────────────────── */
function ir(i, { replace = false } = {}) {
  i = Math.max(0, Math.min(SLIDES.length - 1, i));
  const prev = idx;
  idx = i;
  vistas.add(i);

  slidesEl.children[prev]?.setAttribute('data-active', 'false');
  const el = slidesEl.children[i];
  el.setAttribute('data-active', 'true');
  /* Reinicia la animación de asentado sin recrear el nodo. */
  el.querySelectorAll('.settle').forEach((n) => {
    n.style.animation = 'none';
    void n.offsetWidth;
    n.style.animation = '';
  });

  [...railMarks.children].forEach((m, k) => {
    m.setAttribute('aria-current', String(k === i));
    m.dataset.seen = String(vistas.has(k));
  });
  [...ovGrid.querySelectorAll('.ov-item')].forEach((b, k) => {
    b.setAttribute('aria-current', String(k === i));
  });
  railCount.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> / ${SLIDES.length}`;

  const st = SLIDES[i].plot ? SLIDES[i].plot() : { mode: 'quiet', ceilings: [], markers: [] };
  planeHost.dataset.mode = st.mode || 'quiet';
  plano.setState(st);

  /* El cartucho pertenece al instrumento, así que existe solo cuando
     el instrumento está presentando. Con el plano quieto el contenido
     toma todo el ancho y el cartucho quedaba impreso encima del texto;
     esconderlo solo en las hero movía el problema en vez de resolverlo.
     Va al pie del plano, no a la cabecera: arriba tapaba la etiqueta de
     la década superior — el tope del eje que este deck enseña a leer. */
  const r = plano.rect;
  const leyenda = document.querySelector('.legend-block');
  leyenda.style.left = `${r.x0 + 8}px`;
  leyenda.style.top = `${r.y1 - 56}px`;
  /* El cartucho cede ante el dato. Una slide puede pedir que no se
     dibuje cuando su evidencia ocupa el pie del plano: tapar aunque
     sea un tramo de la prueba cuesta mucho más de lo que aporta una
     firma que ya aparece en otras diez slides. */
  const conLeyenda = st.mode === 'present' && st.leyenda !== false;
  deck.dataset.leyenda = conLeyenda ? 'true' : 'false';

  /* El cerebro corre solo mientras su slide está activa: en una
     máquina ajena no se deja un WebGL girando detrás de 24 slides. */
  if (SLIDES[i].cerebro) {
    CEREBRO.mostrar(SLIDES[i].cerebro === true ? 'portada' : SLIDES[i].cerebro);
  } else {
    CEREBRO.ocultar();
  }

  const hash = '#' + SLIDES[i].id;
  if (location.hash !== hash) {
    if (replace) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
  }
  despertar();
}

const sig = () => ir(idx + 1);
const ant = () => ir(idx - 1);

function abrirIndice()  { overview.dataset.open = 'true'; overview.querySelector('.ov-item')?.focus(); }
function cerrarIndice() { overview.dataset.open = 'false'; }
const indiceAbierto = () => overview.dataset.open === 'true';

/* ── Teclado y clicker ──────────────────────────────────────── */
let buffer = '';
let bufferT = 0;

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (indiceAbierto() && e.key !== 'Escape' && !/^\d$/.test(e.key)) return;

  switch (e.key) {
    case 'ArrowRight': case 'PageDown': case ' ': case 'Enter':
      e.preventDefault();
      if (buffer) { ir(parseInt(buffer, 10) - 1); buffer = ''; }
      else sig();
      break;
    case 'ArrowLeft': case 'PageUp': case 'Backspace':
      e.preventDefault(); ant(); break;
    case 'ArrowDown': e.preventDefault(); sig(); break;
    case 'ArrowUp':   e.preventDefault(); ant(); break;
    case 'Home': e.preventDefault(); ir(0); break;
    case 'End':  e.preventDefault(); ir(SLIDES.length - 1); break;
    case 'Escape':
      e.preventDefault();
      indiceAbierto() ? cerrarIndice() : abrirIndice();
      break;
    default:
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        const on = deck.dataset.sala === 'true';
        deck.dataset.sala = String(!on);
        avisar(on ? 'Modo sala: apagado' : 'Modo sala: encendido');
      } else if (/^\d$/.test(e.key)) {
        const now = Date.now();
        buffer = (now - bufferT < 900 ? buffer : '') + e.key;
        bufferT = now;
      }
  }
  despertar();
});

/* Confirmación breve para lo que no tiene efecto visual obvio. */
let avisoT;
function avisar(txt) {
  let n = document.querySelector('.aviso');
  if (!n) {
    n = document.createElement('div');
    n.className = 'aviso';
    stage.appendChild(n);
  }
  n.textContent = txt;
  n.dataset.on = 'true';
  clearTimeout(avisoT);
  avisoT = setTimeout(() => { n.dataset.on = 'false'; }, 1600);
}

/* El clicker de presentación emite flechas, así que ya está cubierto.
   El tacto en pantalla no. */
let tx = 0, ty = 0;
window.addEventListener('touchstart', (e) => {
  tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? sig() : ant());
}, { passive: true });

window.addEventListener('popstate', () => {
  const i = SLIDES.findIndex((s) => '#' + s.id === location.hash);
  if (i >= 0 && i !== idx) ir(i, { replace: true });
});

/* ── Escalado del escenario ─────────────────────────────────── */
function escalar() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = vw < 720 ? 8 : 24;
  const s = Math.min((vw - pad * 2) / 1600, (vh - pad * 2) / 900);
  /* Traslación calculada, no porcentual: con transform-origin 0 0 la
     cuenta es exacta y no depende del orden de composición. */
  const tx = (vw - 1600 * s) / 2;
  const ty = (vh - 900 * s) / 2;
  stage.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s})`;
}
window.addEventListener('resize', escalar);

/* ── Reposo: la ayuda de teclado aparece con la actividad ───── */
let idleT;
function despertar() {
  deck.dataset.idle = 'false';
  clearTimeout(idleT);
  idleT = setTimeout(() => { deck.dataset.idle = 'true'; }, 2600);
}
window.addEventListener('mousemove', despertar, { passive: true });

/* ── Arranque ───────────────────────────────────────────────── */
construir();
escalar();
const inicial = SLIDES.findIndex((s) => '#' + s.id === location.hash);
ir(inicial >= 0 ? inicial : 0, { replace: true });
despertar();
