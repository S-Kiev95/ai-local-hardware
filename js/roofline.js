/* ═══════════════════════════════════════════════════════════════
   EL PLANO
   Un solo instrumento, persistente a lo largo de todo el deck.
   Los ejes no se reinician entre slides: solo se mueven los techos
   y los marcadores.

   La matemática que lo hace barato:
     techo de tokens/s = ancho de banda ÷ bytes de parámetros activos
     y = BW / x   ⟹   log y = log BW − log x
   En log–log toda recta de techo tiene pendiente −1 y son PARALELAS
   entre sí. Cambiar de hardware es, literalmente, una traslación
   vertical. Por eso cada techo se dibuja una sola vez y se mueve con
   un transform — que CSS sí sabe transicionar con suavidad.
   ═══════════════════════════════════════════════════════════════ */


const NS = 'http://www.w3.org/2000/svg';
const L10 = Math.log10;

/* Dominios fijos del plano. No cambian nunca: son la promesa de que
   los ejes se quedan quietos. */
const X_MIN = 0.5, X_MAX = 320;      // GB de parámetros activos
const Y_MIN = 2,   Y_MAX = 3000;     // tokens/segundo

const BW_REF = 1000;                 // recta de referencia, GB/s

/* Los dos encuadres. El deck rescala exactamente una vez: al salir
   de la portada. Después de eso los ejes no se mueven más. */
const RECTS = {
  hero:    { x0: 520, y0: 150, x1: 1520, y1: 800 },
  present: { x0: 726, y0: 178, x1: 1510, y1: 726 },
};

function bytesActivosGB(paramsActivosB, formatoKey) {
  const f = FORMATOS[formatoKey] || FORMATOS.Q4_K_M;
  return paramsActivosB * f.bytes;      // miles de millones × bytes = GB
}

function techoTokens(bwGBs, bytesGB) {
  return bwGBs / bytesGB;
}

function el(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    n.setAttribute(k, String(v));
  }
  if (parent) parent.appendChild(n);
  return n;
}

/* Ticks de década con subdivisiones, como un papel log real. */
function decades(min, max) {
  const out = [];
  for (let d = Math.floor(L10(min)); d <= Math.ceil(L10(max)); d++) {
    for (let m = 1; m <= 9; m++) {
      const v = m * Math.pow(10, d);
      if (v < min * 0.999 || v > max * 1.001) continue;
      out.push({ v, major: m === 1 });
    }
  }
  return out;
}

function fmtGB(v) {
  if (v >= 100) return String(Math.round(v));
  if (v >= 10) return String(Math.round(v));
  if (v >= 1) return String(+v.toFixed(v < 2 ? 1 : 0));
  return String(+v.toFixed(2)).replace('0.', ',');
}
function fmtTok(v) {
  if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
  return String(Math.round(v));
}

function crearPlano(host) {
  const svg = el('svg', {
    viewBox: '0 0 1600 900',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
  }, host);

  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: 'plot-clip' }, defs);
  const clipRect = el('rect', {}, clip);

  const gGrid    = el('g', { class: 'p-grid' }, svg);
  const gRegion  = el('g', { class: 'p-region', 'clip-path': 'url(#plot-clip)' }, svg);
  const gCeil    = el('g', { class: 'p-ceilings', 'clip-path': 'url(#plot-clip)' }, svg);
  const gBand    = el('g', { class: 'p-band', 'clip-path': 'url(#plot-clip)' }, svg);
  const gCursor  = el('g', { class: 'p-cursor' }, svg);
  const gMark    = el('g', { class: 'p-marks' }, svg);
  const gAxis    = el('g', { class: 'p-axis' }, svg);

  let rect = RECTS.hero;
  let state = null;
  const ceilNodes = new Map();
  const markNodes = new Map();

  const sx = (v) => rect.x0 + (L10(v) - L10(X_MIN)) / (L10(X_MAX) - L10(X_MIN)) * (rect.x1 - rect.x0);
  const sy = (v) => rect.y1 - (L10(v) - L10(Y_MIN)) / (L10(Y_MAX) - L10(Y_MIN)) * (rect.y1 - rect.y0);
  const pxDecadeY = () => (rect.y1 - rect.y0) / (L10(Y_MAX) - L10(Y_MIN));

  /* Desplazamiento vertical de un techo respecto de la recta de
     referencia. Esto es todo lo que hace falta para mover un techo. */
  const dyDe = (bw) => -(L10(bw) - L10(BW_REF)) * pxDecadeY();

  function dibujarEjes() {
    gGrid.textContent = '';
    gAxis.textContent = '';
    clipRect.setAttribute('x', rect.x0);
    clipRect.setAttribute('y', rect.y0);
    clipRect.setAttribute('width', rect.x1 - rect.x0);
    clipRect.setAttribute('height', rect.y1 - rect.y0);

    for (const t of decades(X_MIN, X_MAX)) {
      const x = sx(t.v);
      el('line', {
        x1: x, y1: rect.y0, x2: x, y2: rect.y1,
        class: t.major ? 'gl gl-major' : 'gl gl-minor',
      }, gGrid);
      if (t.major) {
        el('text', { x, y: rect.y1 + 22, class: 'ax-tick', 'text-anchor': 'middle' }, gAxis)
          .textContent = fmtGB(t.v);
      }
    }
    for (const t of decades(Y_MIN, Y_MAX)) {
      const y = sy(t.v);
      el('line', {
        x1: rect.x0, y1: y, x2: rect.x1, y2: y,
        class: t.major ? 'gl gl-major' : 'gl gl-minor',
      }, gGrid);
      if (t.major) {
        /* Los ticks van ADENTRO del plano. Colgados por fuera del
           borde izquierdo caían sobre la columna de texto y partían
           palabras — el eje se comía la prosa. */
        el('text', { x: rect.x0 + 8, y: y - 6, class: 'ax-tick', 'text-anchor': 'start' }, gAxis)
          .textContent = fmtTok(t.v);
      }
    }

    el('rect', {
      x: rect.x0, y: rect.y0,
      width: rect.x1 - rect.x0, height: rect.y1 - rect.y0,
      class: 'ax-frame',
    }, gAxis);

    el('text', {
      x: rect.x1, y: rect.y1 + 48,
      class: 'ax-label', 'text-anchor': 'end',
    }, gAxis).textContent = 'GB DE PARÁMETROS ACTIVOS POR TOKEN →';

    /* Rótulo del eje vertical horizontal y dentro del plano. Rotado
       por fuera del borde izquierdo se imprimía encima del texto de
       la slide. */
    el('text', {
      x: rect.x0 + 8, y: rect.y0 + 18,
      class: 'ax-label', 'text-anchor': 'start',
    }, gAxis).textContent = '↑ TOKENS POR SEGUNDO';
  }

  /* Un techo: la recta de referencia más la región alcanzable
     debajo. La región es una figura llena con identidad propia,
     no el blanco que sobró. */
  function crearTecho(id) {
    const g = el('g', { class: 'ceil', 'data-id': id }, gCeil);
    const yRefL = sy(techoTokens(BW_REF, X_MIN));
    const yRefR = sy(techoTokens(BW_REF, X_MAX));

    /* Lo que queda POR ENCIMA del techo es inalcanzable: ninguna
       cantidad de cómputo compra esos tokens si el ancho de banda no
       los mueve. Se dibuja como campo propio, no como blanco. */
    el('polygon', {
      class: 'ceil-unreach',
      points: `${rect.x0},${yRefL} ${rect.x1},${yRefR} ${rect.x1},${rect.y0 - 900} ${rect.x0},${rect.y0 - 900}`,
    }, g);
    el('polygon', {
      class: 'ceil-reach',
      points: `${rect.x0},${yRefL} ${rect.x1},${yRefR} ${rect.x1},${rect.y1 + 900} ${rect.x0},${rect.y1 + 900}`,
    }, g);
    el('line', {
      class: 'ceil-line',
      x1: rect.x0, y1: yRefL, x2: rect.x1, y2: yRefR,
    }, g);

    /* La etiqueta va SOBRE la recta, a dos tercios del recorrido —
       no en el extremo derecho. Ahí una recta de poco ancho de banda
       ya salió por abajo del plano y la etiqueta se recorta.
       A esta altura toda recta del rango sigue adentro, y como cada
       una está a distinta altura, quedan separadas solas. */
    const xLab = Math.pow(10, L10(X_MIN) + 0.62 * (L10(X_MAX) - L10(X_MIN)));
    const lab = el('text', { class: 'ceil-label' }, g);
    lab.setAttribute('text-anchor', 'end');

    const node = { g, lab, lx: sx(xLab), ly: sy(techoTokens(BW_REF, xLab)) };
    ceilNodes.set(id, node);
    return node;
  }

  function crearMarcador(id) {
    const g = el('g', { class: 'mk', 'data-id': id }, gMark);
    el('circle', { class: 'mk-halo', r: 13, cx: 0, cy: 0 }, g);
    el('circle', { class: 'mk-dot',  r: 4.5, cx: 0, cy: 0 }, g);
    const guia = el('path', { class: 'mk-guia', d: 'M0,0' }, g);
    const lab = el('text', { class: 'mk-label', x: 12, y: -9 }, g);
    const obs = el('text', { class: 'mk-obs',   x: 12, y: 6 }, g);
    const node = { g, lab, obs, guia };
    markNodes.set(id, node);
    return node;
  }

  function aplicar(next) {
    const prev = state;
    state = next;
    /* Extremos de la recta de referencia: con ellos se despeja en qué
       x está la recta a una altura dada. */
    const yRefIzq = sy(techoTokens(BW_REF, X_MIN));
    const yRefDer = sy(techoTokens(BW_REF, X_MAX));

    if (next.rect && next.rect !== rect) {
      rect = next.rect;
      dibujarEjes();
      /* Los techos se redibujan en la geometría nueva; sus
         traslaciones siguen animando. */
      for (const [id, n] of ceilNodes) { n.g.remove(); ceilNodes.delete(id); }
      for (const [id, n] of markNodes) { n.g.remove(); markNodes.delete(id); }
    }

    // ── Techos ────────────────────────────────────────────────
    /* Dos anchos de banda parecidos dan dos rectas casi pegadas, y sus
       etiquetas se imprimen una encima de la otra hasta volverse una
       mancha (M5 Ultra 1.200 contra AI Cube 1.220). Calculo la altura
       final de cada etiqueta, las ordeno y las separo lo mínimo
       necesario. El desplazamiento va SOLO en la etiqueta: la recta no
       se mueve, porque la recta es el dato. */
    const GAP = 17;
    const conY = (next.ceilings || []).map((c) => ({ c, dy: dyDe(c.bw) }))
      .sort((a, b) => a.dy - b.dy);
    let ultimo = -Infinity;
    for (const it of conY) {
      const yFinal = Math.max(it.dy, ultimo + GAP);
      it.labDy = yFinal - it.dy;
      ultimo = yFinal;
    }

    const vivos = new Set();
    for (const { c, dy, labDy } of conY) {
      vivos.add(c.id);
      const n = ceilNodes.get(c.id) || crearTecho(c.id);
      n.g.style.transform = `translateY(${dy.toFixed(2)}px)`;
      n.g.dataset.tone = c.tone || 'bw';
      n.g.dataset.emph = c.emphasis ? 'true' : 'false';
      n.g.dataset.reach = c.reach ? 'true' : 'false';
      n.g.dataset.unreach = c.unreach ? 'true' : 'false';
      n.lab.textContent = c.label || '';
      /* La etiqueta cuelga de SU recta: a la altura donde quedó tras el
         desapilado, despejo en qué x está esa recta y apoyo ahí el
         extremo derecho del texto. Así ocho etiquetas dejan de leerse
         como leyenda suelta — cada una toca la recta que nombra, y da
         igual cuántas otras rectas le pasen por detrás. */
      const yLab = n.ly - 9 + labDy;
      const xEnRecta = rect.x0 +
        (yLab - yRefIzq) / (yRefDer - yRefIzq) * (rect.x1 - rect.x0);
      n.lab.setAttribute('x', (xEnRecta - 9).toFixed(1));
      n.lab.setAttribute('y', yLab.toFixed(1));
      n.g.style.opacity = '1';
    }
    for (const [id, n] of ceilNodes) {
      if (!vivos.has(id)) n.g.style.opacity = '0';
    }

    // ── Banda de eficiencia real ─────────────────────────────
    gBand.textContent = '';
    if (next.band) {
      const { lo, hi, bw } = next.band;
      const p = (frac) => {
        const yl = sy(techoTokens(bw, X_MIN) * frac);
        const yr = sy(techoTokens(bw, X_MAX) * frac);
        return [yl, yr];
      };
      const [aL, aR] = p(hi);
      const [bL, bR] = p(lo);
      el('polygon', {
        class: 'band-fill',
        points: `${rect.x0},${aL} ${rect.x1},${aR} ${rect.x1},${bR} ${rect.x0},${bL}`,
      }, gBand);
      el('line', { class: 'band-edge', x1: rect.x0, y1: aL, x2: rect.x1, y2: aR }, gBand);
      el('line', { class: 'band-edge', x1: rect.x0, y1: bL, x2: rect.x1, y2: bR }, gBand);
      const t = el('text', {
        class: 'band-label', x: rect.x0 + 12, y: (bL + aL) / 2 + 4,
      }, gBand);
      t.textContent = next.band.label || '';
    }

    // ── Marcadores ───────────────────────────────────────────
    /* Varios marcadores comparten x (mismo modelo, distinto hardware),
       así que sus etiquetas se apilan y se vuelven ilegibles. Mismo
       tratamiento que los techos: separo las ETIQUETAS lo mínimo
       necesario y dejo el punto donde el dato lo pone. */
    const GAP_M = 31;   // alto real del bloque etiqueta + fecha
    const mCon = (next.markers || []).map((m) => ({
      m,
      x: sx(Math.min(Math.max(m.x, X_MIN), X_MAX)),
      y: sy(Math.min(Math.max(m.y, Y_MIN), Y_MAX)),
    })).sort((a, b) => a.y - b.y);
    let ultimoM = -Infinity;
    for (const it of mCon) {
      const yF = Math.max(it.y, ultimoM + GAP_M);
      it.labDy = yF - it.y;
      ultimoM = yF;
    }

    const mVivos = new Set();
    for (const { m, x, y, labDy } of mCon) {
      mVivos.add(m.id);
      const n = markNodes.get(m.id) || crearMarcador(m.id);
      n.g.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      n.g.dataset.tone = m.tone || 'ink';
      n.g.dataset.emph = m.emphasis ? 'true' : 'false';
      n.lab.textContent = m.label || '';
      n.obs.textContent = m.obs || '';
      /* Etiqueta a la izquierda cuando el punto esta pegado al borde. */
      const flip = x > rect.x1 - 190;
      n.lab.setAttribute('text-anchor', flip ? 'end' : 'start');
      n.obs.setAttribute('text-anchor', flip ? 'end' : 'start');
      n.lab.setAttribute('x', flip ? -12 : 12);
      n.obs.setAttribute('x', flip ? -12 : 12);
      /* La guia conecta el punto con su etiqueta desplazada: sin esto,
         separar la etiqueta la desvincula del dato que nombra. */
      n.lab.setAttribute('y', -9 + labDy);
      n.obs.setAttribute('y', 6 + labDy);
      if (labDy > 1) {
        n.guia.setAttribute('d', `M0,0 L${flip ? -8 : 8},${labDy - 4}`);
        n.guia.style.opacity = '1';
      } else {
        n.guia.style.opacity = '0';
      }
      n.g.style.opacity = '1';
    }
    for (const [id, n] of markNodes) {
      if (!mVivos.has(id)) n.g.style.opacity = '0';
    }

    // ── Cursor delta ─────────────────────────────────────────
    gCursor.textContent = '';
    if (next.cursor) {
      const c = next.cursor;
      const x = sx(c.x), y1 = sy(c.yA), y2 = sy(c.yB);
      el('line', { class: 'cur-line', x1: x, y1, x2: x, y2 }, gCursor);
      for (const yy of [y1, y2]) {
        el('line', { class: 'cur-cap', x1: x - 7, y1: yy, x2: x + 7, y2: yy }, gCursor);
      }
      const t = el('text', {
        class: 'cur-read', x: x + 12, y: (y1 + y2) / 2 + 4,
      }, gCursor);
      t.textContent = c.label || '';
    }

    void prev;
  }

  dibujarEjes();

  return {
    setState: aplicar,
    get rect() { return rect; },
    sx, sy,
  };
}
