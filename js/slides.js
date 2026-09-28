/* ═══════════════════════════════════════════════════════════════
   Las slides. Todo se computa desde data.js en runtime.
   Corregís una cifra allá y acá se redibuja solo.
   ═══════════════════════════════════════════════════════════════ */


/* ── Utilidades ─────────────────────────────────────────────── */
const hw = (id) => HARDWARE.find((h) => h.id === id);
const md = (id) => MODELOS.find((m) => m.id === id);

const n = (v, dec = 0) =>
  v.toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const usd = (v) => 'USD ' + v.toLocaleString('es-UY', { maximumFractionDigits: 0 });

const obs = (t) => `<span class="obs">${t}</span>`;
const src = (t) => `<span class="src">${t}</span>`;

/* Cifra + unidad + fecha, siempre juntas. */
const fig = (v, u, key = '', o = '') => `
  <span class="figure" data-key="${key}">
    <span class="v">${v}</span><span class="u">${u}</span>${o ? obs(o) : ''}
  </span>`;

/* Barra horizontal comparativa. Escala desde cero siempre: una barra
   que arranca en 40 exagera diferencias y este deck no hace eso.
   El color dice licencia (lleno = abierto, apagado = cerrado) y el
   foco dice de quién estamos hablando en esta slide. */
const barras = (filas, max, fmt, cola = null, tono = '', ancho = false) => `
  <div class="barras" data-tono="${tono}" data-ancho="${ancho}">
    ${filas.map((f) => `
      <div class="barra" data-abierto="${!!f.abierto}" data-foco="${!!f.foco}" data-no="${!!f.no}">
        <span class="ba-m">${f.m}</span>
        <span class="ba-t">${f.local
          ? `<span class="ba-cero">${f.local}</span>`
          : `<span class="ba-f" style="--f:${(f.v / max).toFixed(4)}"></span>`}</span>
<span class="ba-v mono">${f.local ? '' : fmt(f.v)}</span>
        ${cola ? `<span class="ba-c mono">${cola(f)}</span>` : ''}
      </div>`).join('')}
  </div>`;

/* Leyenda compartida de las barras de memoria. */
const leyendaMem = `
  <p class="tick ba-leyenda">
    <span data-abierto="true"></span> entra
    <span data-no="true"></span> no entra
    <span data-abierto="false"></span> memoria del equipo
  </p>`;

/* Esquema de las tres tendencias de la tesis. Es ILUSTRATIVO y lo
   dice: no hay una unidad común entre inteligencia y gigabytes, así
   que no hay eje Y con números. Lo que sí es exacto es la geometría:
   las curvas salen de funciones y el cruce 2×3 se calcula, no se
   dibuja a ojo, así que la marca cae siempre donde las líneas se tocan.
   Cada curva lleva el número del punto de la lista de la izquierda. */
const tresCurvas = () => {
  const W = 700, H = 440, X0 = 40, X1 = 636, Y0 = 44, Y1 = 392;
  const T0 = 2023, T1 = 2027;
  const sx = (t) => X0 + ((t - T0) / (T1 - T0)) * (X1 - X0);
  const sy = (v) => Y1 - v * (Y1 - Y0);
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const C = [
    { k: 1, tono: 'bw', dir: 'sube', txt: 'Inteligencia de los modelos abiertos',
      f: (t) => 0.10 + 0.78 * sig((t - 2025.9) * 1.8) },
    { k: 2, tono: 'medido', dir: 'baja', txt: 'Memoria que necesita un modelo capaz',
      f: (t) => 0.86 - 0.62 * sig((t - 2025.8) * 1.7) },
    { k: 3, tono: 'ink', dir: 'sube', txt: 'Memoria del hardware accesible',
      f: (t) => 0.13 + 0.30 * sig((t - 2025.6) * 1.6) },
  ];
  const trazo = (f) => {
    let d = '';
    for (let i = 0; i <= 96; i++) {
      const t = T0 + ((T1 - T0) * i) / 96;
      d += (i ? 'L' : 'M') + sx(t).toFixed(1) + ',' + sy(f(t)).toFixed(1);
    }
    return d;
  };
  let tc = T1;
  for (let t = 2025; t <= T1; t += 0.002) {
    if (C[1].f(t) <= C[2].f(t)) { tc = t; break; }
  }
  const xc = sx(tc), yc = sy(C[2].f(tc));
  const semestre = tc - Math.floor(tc) < 0.5 ? '1S' : '2S';
  const anios = [2023, 2024, 2025, 2026, 2027];
  return `
  <figure class="tres-curvas">
    <svg viewBox="0 0 ${W} ${H}" role="img"
      aria-label="Esquema: la inteligencia de los modelos abiertos sube, la memoria que necesita un modelo capaz baja y la memoria del hardware accesible sube; las dos últimas se cruzan en ${semestre} ${Math.floor(tc)}.">
      ${[0.25, 0.5, 0.75, 1].map((v) => `<line class="tc-grid" x1="${X0}" x2="${X1}" y1="${sy(v)}" y2="${sy(v)}"/>`).join('')}
      ${anios.map((a) => `
        <line class="tc-grid" x1="${sx(a)}" x2="${sx(a)}" y1="${Y0}" y2="${Y1}"/>
        <text class="tc-anio" x="${sx(a)}" y="${Y1 + 24}" text-anchor="middle">${a}</text>`).join('')}
      <line class="tc-eje" x1="${X0}" x2="${X1}" y1="${Y1}" y2="${Y1}"/>
      <text class="tc-mas" x="${X0}" y="${Y0 - 14}">↑ más</text>
      <rect class="tc-zona" x="${xc}" y="${Y0}" width="${X1 - xc}" height="${Y1 - Y0}"/>
      ${C.map((c) => `<path class="tc-curva" data-tono="${c.tono}" d="${trazo(c.f)}" pathLength="1"/>`).join('')}
      <line class="tc-cruce" x1="${xc}" x2="${xc}" y1="${Y0 - 4}" y2="${yc}"/>
      <circle class="tc-punto" cx="${xc}" cy="${yc}" r="6"/>
      <text class="tc-nota" x="${xc - 10}" y="${Y0 + 6}" text-anchor="end">${semestre} ${Math.floor(tc)}</text>
      <text class="tc-nota-sub" x="${xc - 10}" y="${Y0 + 26}" text-anchor="end">un modelo capaz ya entra</text>
      <text class="tc-nota-sub" x="${xc - 10}" y="${Y0 + 44}" text-anchor="end">en hardware accesible</text>
      ${C.map((c) => {
        const y = sy(c.f(T1));
        return `<g class="tc-fin" data-tono="${c.tono}">
          <circle cx="${X1}" cy="${y}" r="13"/>
          <text x="${X1}" y="${y + 5}" text-anchor="middle">${c.k}</text>
        </g>`;
      }).join('')}
    </svg>
    <figcaption class="tc-leyenda">
      ${C.map((c) => `
        <span class="tc-ley" data-tono="${c.tono}">
          <b>${c.k}</b><span class="tc-dir" data-dir="${c.dir}"></span>${c.txt}
        </span>`).join('')}
      <span class="tc-aviso">Esquema de tendencias, sin escala. Las cifras están en las slides que siguen.</span>
    </figcaption>
  </figure>`;
};

const contra = (t) => `<p class="contra"><b>El contra.</b> ${t}</p>`;

/* Franja de logos. Cada uno se carga solo si el archivo existe; los
   que faltan no dejan hueco. Sin cifras: es quién empuja la frontera
   abierta, no cuánto. */
const logos = (items, opts = {}) => `
  <div class="logos${opts.color ? ' logos--color' : ''}" data-state="empty">
    ${items.map((it) => `<span class="logo${it.oscuro ? ' logo--oscuro' : ''}" data-base="assets/hardware/${it.base}" title="${it.nombre}"></span>`).join('')}
  </div>`;

/* Muro de logos: el logo ES el contenido de la slide, así que va grande,
   a color, con nombre y laboratorio. Sin cifras. */
const muroLogos = (items) => `
  <ul class="logo-wall" data-state="empty">
    ${items.map((it) => `
      <li class="lw-item">
        <span class="logo lw-logo${it.oscuro ? ' logo--oscuro' : ''}" data-base="assets/hardware/${it.base}" title="${it.nombre}"></span>
        <span class="lw-text">
          <span class="lw-name">${it.nombre}</span>
          <span class="lw-lab">${it.lab}</span>
        </span>
      </li>`).join('')}
  </ul>`;

/* Hueco de foto: dice exactamente qué archivo falta y qué debería
   mostrar. Nunca un hueco silencioso. */
const foto = (base, que, callouts = [], opts = {}) => `
  <figure class="photo" data-state="empty" data-base="assets/hardware/${base}"${opts.contain ? ' data-fit="contain"' : ''} style="${opts.pos ? `--pos:${opts.pos};` : ''}${opts.alto ? `--alto:${opts.alto}px;` : ''}">
    <span class="ph-file">assets/hardware/${base}.(jpg|png|webp)</span>
    <span class="ph-what">${que}</span>
    ${callouts.map((c) => `
      <span class="callout" style="left:${c.x}%;top:${c.y}%">
        <span class="c-dot"></span><span class="c-line"></span>
        <span class="c-text">${c.t}</span>
      </span>`).join('')}
  </figure>`;

/* ── El punto de calibración ────────────────────────────────────
   GPT-OSS 120B es el modelo con más mediciones públicas
   independientes, por eso ancla el plano.                        */
const CAL = md('gptoss120b');
const CAL_BYTES = bytesActivosGB(CAL.activos, 'MXFP4');

function medicionesCalibradas() {
  return MEDICIONES.filter((m) => m.calibra).map((m) => {
    const bw = m.bwOverride ?? hw(m.hw).bw;
    const techo = techoTokens(bw, CAL_BYTES);
    return { ...m, bw, techo, ef: m.tokens / techo };
  });
}
const CALS = medicionesCalibradas();
const EF_LO = Math.min(...CALS.map((c) => c.ef));
const EF_HI = Math.max(...CALS.map((c) => c.ef));

/* Marcadores de todo el hardware corriendo el modelo de calibración. */
function marcadoresTecho(ids, emphId) {
  return ids.map((id) => {
    const h = hw(id);
    return {
      id, x: CAL_BYTES, y: techoTokens(h.bw, CAL_BYTES),
      label: h.nombre, obs: `${n(h.bw)} GB/s`,
      emphasis: id === emphId,
      tone: h.alerta === 'banda' ? 'warn' : 'ink',
    };
  });
}

/* La región alcanzable acompaña siempre al techo en discusión.
   La INALCANZABLE es opt-in: pintada en todas las slides tapaba media
   pantalla de crimson y competía con el titular. Aparece solo donde
   enseña algo — cuando el argumento es justamente que arriba del techo
   no hay nada que comprar. */
/* La referencia de tres 3090 usadas no es una opcion de compra, asi
   que no vive en HARDWARE. Pero su sonda SI esta en el plano, y un
   punto medido sin la recta contra la cual leerlo no dice nada —
   ademas es la cifra que remata el argumento. */
function techoReferencia(emph = false) {
  return {
    id: 'c-ref3090', bw: REFERENCIA.bw,
    label: `${REFERENCIA.nombre} · ${n(REFERENCIA.bw)} GB/s`,
    emphasis: emph, reach: false, unreach: false, tone: 'bw',
  };
}

function techosDe(ids, emphId, reachId, opts = {}) {
  const foco = reachId ?? emphId;
  return ids.map((id) => {
    const h = hw(id);
    return {
      id: 'c-' + id, bw: h.bw,
      /* Cuando los marcadores ya nombran cada hardware, la etiqueta de
         la recta repite lo mismo y se cruza con ellos. */
      label: opts.sinEtiqueta ? '' : `${h.nombre} · ${n(h.bw)} GB/s`,
      emphasis: id === emphId,
      reach: opts.region !== false && id === foco,
      unreach: opts.inalcanzable === true && id === foco,
      tone: 'bw',
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   SLIDES
   ═══════════════════════════════════════════════════════════════ */
const SLIDES = [

/* ── APERTURA ─────────────────────────────────────────────────── */
{
  id: 'portada', sec: 'Apertura', nav: 'Portada',
  layout: 'hero',
  /* La portada no lleva plano: lleva el cerebro (js/cerebro.js). */
  cerebro: true,
  plot: () => ({ mode: 'off', ceilings: [], markers: [] }),
  body: () => `
    <div class="settle hero-mark">
      <h1 class="display">La tendencia de la AI, el hardware y nuevas oportunidades</h1>
    </div>
    <div class="settle hero-sub">
      <p class="lede">
        La AI es una revolución transversal y llegó para quedarse. Es la mayor
        apuesta económica de la humanidad: las empresas tecnológicas lo saben
        y apuestan a un futuro con AI.
      </p>
    </div>
    <div class="settle hero-meta">
      <span class="tick">${PROYECTO.subtitulo}</span>
      <span class="tick">Relevamiento ${PROYECTO.relevamiento}</span>
    </div>`,
},

{
  id: 'tesis', sec: 'Apertura', nav: 'La tesis',
  /* Antes llevaba el plano con los diez techos de hardware: exacto,
     pero ilegible para quien no lee log-log. El título promete tres
     curvas que se cruzan, así que eso es lo que se dibuja. */
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Tres curvas se cruzaron.',
  body: () => `
    <div class="split split--tesis">
    <div class="stack-lg">
      <p class="lede">
        En la segunda mitad de 2026 las cosas empezaron a cambiar y convergen
        hacia un nuevo modelo de AI local.
      </p>
      <ol class="curvas">
        <li>
          <h3 class="sub">Open Source</h3>
          <p>Los modelos de código abierto, principalmente chinos, están
          acercándose a los privativos y están disponibles para empresas,
          emprendedores y curiosos.</p>
        </li>
        <li>
          <h3 class="sub">Arquitectura y cuantización</h3>
          <p>Nuevas técnicas de arquitectura de modelos como MoE y compresión
          han permitido optimizar hasta en un <em class="mark">70 %</em> la
          memoria con pérdidas de calidad mínimas del 3 %.</p>
        </li>
        <li>
          <h3 class="sub">Chips y memoria</h3>
          <p>Los fabricantes de hardware se están enfocando en chips
          especializados en AI y en unificar la memoria RAM.</p>
        </li>
      </ol>
      <p>El cuello de botella que separa a las grandes empresas de AI de las
      pequeñas y consumidores <strong>se está moviendo</strong>.</p>
    </div>
    ${tresCurvas()}
    </div>`,
},

{
  id: 'opensource', sec: 'Apertura', nav: 'Open Source y modelos chinos',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  title: 'El Open Source y los modelos chinos',
  body: () => `
    <div class="split split--logos">
      <div class="stack">
        <p class="lede">Los modelos más inteligentes y capaces son privativos:
        OpenAI, Claude, Gemini, Grok.</p>
        <p>Están a la vanguardia y son los más inteligentes. Pero algunos
        laboratorios de AI, principalmente en China, han liberado modelos de
        <strong>código abierto</strong> que habilitan a cualquier persona a
        descargarlos y utilizarlos según sus licencias — en muchos casos,
        licencias que habilitan el <strong>uso comercial</strong>.</p>
        <p>Y las capacidades de estos modelos siguen a los privativos con
        apenas <em class="mark">unos pocos meses de retraso</em>.</p>
      </div>
      ${muroLogos([
        { base: 'logo-qwen',     nombre: 'Qwen',     lab: 'Alibaba · China' },
        { base: 'logo-deepseek', nombre: 'DeepSeek', lab: 'DeepSeek · China' },
        { base: 'logo-glm',      nombre: 'GLM',      lab: 'Z.ai (Zhipu) · China', oscuro: true },
        { base: 'logo-kimi',     nombre: 'Kimi',     lab: 'Moonshot AI · China', oscuro: true },
        { base: 'logo-gemma',    nombre: 'Gemma 4',  lab: 'Google DeepMind · EE. UU.' },
      ])}
    </div>`,
},

/* ── LA FRONTERA ──────────────────────────────────────────────── */
{
  id: 'brecha', sec: 'La frontera', nav: 'La brecha',
  plot: () => ({ mode: 'quiet', ceilings: techosDe(['rtx5090'], null), markers: [] }),
  title: 'Los modelos abiertos van cuatro meses atrás.',
  body: () => `
    <div class="split">
      <div class="stack">
        <div class="big-read">
          ${fig(FRONTERA.brechaMeses, 'meses de retraso', 'bw', FRONTERA.obs)}
          <p>Es lo que separa hoy al mejor modelo de pesos abiertos de la
          frontera cerrada, medido en el índice de capacidad de Epoch AI.
          Equivale a ${FRONTERA.brechaEci} puntos ECI.</p>
          ${src(FRONTERA.src)}
        </div>
        <p>Cuatro meses es el tiempo que tarda una compra de hardware en
        llegar y montarse. La brecha dejó de ser una razón para esperar.</p>
        ${logos([
          { base: 'logo-qwen', nombre: 'Qwen' },
          { base: 'logo-deepseek', nombre: 'DeepSeek' },
          { base: 'logo-kimi', nombre: 'Kimi', oscuro: true },
        ])}
      </div>
      <div class="stack">
        <div class="delta-read">
          <div class="dr-row">
            <span class="tick">hace un año</span>
            <span class="num dr-v dim">${FRONTERA.indice.haceUnAnio}</span>
          </div>
          <div class="dr-bar"><i style="--f:${FRONTERA.indice.haceUnAnio / 60}"></i></div>
          <div class="dr-row">
            <span class="tick">${FRONTERA.indice.hoyVentana}</span>
            <span class="num dr-v">${FRONTERA.indice.hoy}+</span>
          </div>
          <div class="dr-bar"><i class="on" style="--f:${FRONTERA.indice.hoy / 60}"></i></div>
          <p class="foot-note">Puntaje en el Artificial Analysis Intelligence Index.
          ${FRONTERA.indice.hoyCantidad} modelos abiertos superaron los
          ${FRONTERA.indice.hoy} puntos en una ventana de tres meses.
          ${src(FRONTERA.indice.src)}</p>
        </div>
      </div>
    </div>`,
},

{
  id: 'donde-pierden', sec: 'La frontera', nav: 'Dónde aún pierden',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  title: 'Y esto es lo que todavía no alcanzan.',
  body: () => `
    <div class="stack">
      <p class="lede">Un deck que solo cuenta la mitad buena se cae en la
      primera repregunta. Esta es la tabla completa.</p>
      <ul class="paridad">
        ${FRONTERA.paridad.map((p) => `
          <li data-estado="${p.estado}">
            <span class="pa-area">${p.area}</span>
            <span class="pa-det">${p.detalle}</span>
            <span class="pa-estado">${
              p.estado === 'paridad' ? 'paridad' :
              p.estado === 'cerca' ? 'a un dígito' :
              p.estado === 'acercan' ? 'se acercan' : 'los cerrados ganan'
            }</span>
          </li>`).join('')}
      </ul>
      ${contra(`Para coding de producción y agentes complejos, un modelo cerrado
      sigue siendo mejor herramienta. La tesis de este proyecto no es que lo local
      reemplace todo — es que <b>hay una clase enorme de trabajo donde ya alcanza,
      y donde el dato no puede salir del edificio</b>.`)}
    </div>`,
},

{
  id: 'cerebro', sec: 'Las tres curvas', nav: 'Un cerebro que enciende lo justo',
  cerebro: 'expertos',
  plot: () => ({ mode: 'off', ceilings: [], markers: [] }),
  title: 'Un cerebro que enciende solo lo que necesita.',
  body: () => `
    <div class="stack">
      <p class="lede">Los modelos nuevos funcionan como un cerebro: no usan
      todas sus neuronas para cada tarea. Encienden solo la región que hace
      falta.</p>
      <p>Un modelo puede tener billones de parámetros —su «tamaño»— pero al
      responder activa apenas una fracción. Cada pregunta despierta a los
      expertos que la resuelven y deja al resto en reposo.</p>
      <div class="figure" data-key="bw">
        <span class="v">4 %</span>
        <span class="u">del modelo trabaja en cada respuesta</span>
        ${obs('Qwen3.8-Max · 95 B activos de 2,4 T · ago 2026')}
      </div>
      <p>El resultado es un modelo mucho más inteligente que, en cada momento,
      exige mucho menos de la máquina: <strong>la potencia de un modelo enorme
      con el esfuerzo de uno pequeño</strong>.</p>
    </div>`,
},

{
  id: 'cuantizacion-llana', sec: 'Las tres curvas', nav: 'Cuantización',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  title: 'La misma inteligencia, en menos espacio.',
  body: () => `
    <div class="split">
      <div class="stack">
        <p class="lede">La cuantización es una técnica de compresión: guarda
        el modelo con menos precisión en cada número, y el modelo ocupa hasta
        un <em class="mark">70 % menos de memoria</em> perdiendo apenas un
        3 % de calidad.</p>
        <p>Es como una foto en alta resolución que se guarda en JPG: pesa una
        fracción, y a simple vista es la misma foto.</p>
        <p>Juntas, estas dos técnicas permiten usar <strong>modelos más
        potentes e inteligentes a un costo menor</strong>, en hardware con
        menos recursos.</p>
      </div>
      <div class="stack">
        <div class="peso">
          <span class="tick">El mismo modelo de 31 mil millones de parámetros</span>
          ${['FP16', 'Q8_0', 'Q4_K_M'].map((k) => {
            const f = FORMATOS[k]; const gb = 31 * f.bytes;
            const sel = k === 'Q4_K_M';
            return `<div class="peso-row"${sel ? ' data-sel="true"' : ''}>
              <span class="peso-lab">${sel ? 'comprimido' : (k === 'FP16' ? 'sin comprimir' : 'compresión media')}</span>
              <span class="peso-bar"><i style="--f:${(gb / 62).toFixed(3)}"></i></span>
              <span class="num peso-gb">${n(gb, 0)} GB</span>
            </div>`;
          }).join('')}
          <p class="foot-note">Gemma 4 31B: de ${n(62)} GB a ${n(17)} GB de memoria.
          ${src('SitePoint · Fungies')}</p>
        </div>
      </div>
    </div>`,
},

/* ── LA FÍSICA ────────────────────────────────────────────────── */
{
  id: 'monopolio', sec: 'La física', nav: 'NVIDIA y la crisis de la RAM',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  title: '¿El fin del monopolio de NVIDIA?',
  body: () => `
    <div class="split">
      <div class="stack">
        <p class="lede">NVIDIA es el proveedor monopólico del hardware de AI.</p>
        <p>Por eso, y por la expansión de todo el sector tecnológico alrededor
        de la AI, la demanda provocó una <strong>subida vertical</strong> del
        precio de las gráficas y los chips de NVIDIA. Uno de los efectos más
        significativos fue la <em class="mark">«crisis de la RAM»</em>: la
        memoria se volvió el componente escaso, y cada aumento de precio la
        cita como causa.</p>
        <p>Sin embargo, en el último año otros fabricantes —Apple, AMD,
        Xiaomi, Intel— empezaron a entrar con productos especializados en AI.
        Puede ser un <strong>punto de inflexión</strong> en el mercado.</p>
        ${logos([
          { base: 'logo-apple',  nombre: 'Apple', oscuro: true },
          { base: 'logo-amd',    nombre: 'AMD',   oscuro: true },
          { base: 'logo-xiaomi', nombre: 'Xiaomi' },
          { base: 'logo-intel',  nombre: 'Intel' },
        ])}
      </div>
      <div class="stack">
        ${logos([{ base: 'logo-nvidia', nombre: 'NVIDIA' }])}
        <div class="subida">
          <span class="tick">De precio de lista a precio de calle</span>
          ${['rtx5090', 'dgxspark', 'arcprob70'].map((id) => {
            const h = hw(id);
            const lo = Math.round((h.precio[0] / h.precioMsrp - 1) * 100);
            const hi = Math.round((h.precio[1] / h.precioMsrp - 1) * 100);
            const delta = lo === hi ? `+${lo} %` : `+${lo}–${hi} %`;
            return `<div class="su-row">
              <span class="su-name">${h.nombre} <span class="su-mk">${h.fabricante}</span></span>
              <span class="num su-from">${usd(h.precioMsrp)}</span>
              <span class="su-arrow"></span>
              <span class="num su-to">${usd(h.precio[0])}${h.precio[1] !== h.precio[0] ? '–' + n(h.precio[1]) : ''}</span>
              <span class="num su-delta">${delta}</span>
              ${obs(h.obs)}
            </div>`;
          }).join('')}
          <p class="foot-note">NVIDIA notificó a sus socios de placa otro aumento
          de USD 300 en la 5090 en mayo de 2026, atribuido al costo de la GDDR7.
          El DGX Spark subió 18 % en febrero por «restricciones de suministro de
          memoria». ${src('Tech Insider · Wccftech · NVIDIA · Tom’s Hardware')}</p>
        </div>
      </div>
    </div>`,
},

{
  id: 'dos-restricciones', sec: 'La física', nav: 'Dos factores clave',
  cerebro: 'chip',
  plot: () => ({ mode: 'off', ceilings: [], markers: [] }),
  title: 'Los dos factores clave: VRAM y ancho de banda',
  body: () => `
    <div class="stack">
      <p class="lede">Confundirlos es el error más caro de este mercado.</p>
      <div class="two-rule">
        <div class="tr-item">
          <span class="tick">La memoria decide</span>
          <h3 class="sub">Qué modelo entra</h3>
          <p>Si el modelo cuantizado no cabe, no corre. Punto. Es una
          restricción binaria.</p>
        </div>
        <div class="tr-item" data-emph="true">
          <span class="tick">El ancho de banda decide</span>
          <h3 class="sub">A qué velocidad corre</h3>
          <p>Cada token obliga a releer todos los pesos activos desde la
          memoria. La velocidad de ese trayecto es el techo. Es una
          restricción continua.</p>
        </div>
      </div>
      <p>Son <strong>independientes</strong>. Podés tener muchísima de una y
      poquísima de la otra — y el mercado hoy vende exactamente eso.</p>
    </div>`,
},

{
  id: 'spark', sec: 'La física', nav: 'El hardware de NVIDIA',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'El hardware de NVIDIA',
  body: () => `
    <div class="split split--fotos">
      <div class="stack">
        <p class="lede">Tres productos, tres apuestas distintas: la gráfica de
        consumo, la profesional, y la mini estación con memoria unificada.</p>
        <div class="fotos-2">
          ${foto('rtx-pro-6000', 'La RTX PRO 6000 Blackwell.', [
            { x: 56, y: 62, t: '96 GB GDDR7' },
          ], { contain: true })}
          ${foto('dgx-spark', 'El DGX Spark sobre el escritorio, debajo del monitor.', [
            { x: 30, y: 64, t: '128 GB unificados' },
          ])}
        </div>
      </div>
      <div class="stack">
        <table class="tbl nv-tbl">
          <thead>
            <tr><th>Producto</th><th class="ta-r">VRAM</th><th class="ta-r">Velocidad</th><th>Evolución de precio</th></tr>
          </thead>
          <tbody>
            ${['rtx5090', 'rtxpro6000', 'dgxspark'].map((id) => {
              const h = hw(id);
              const ult = h.historial[h.historial.length - 1];
              const delta = Math.round((ult.precio / h.historial[0].precio - 1) * 100);
              return `<tr data-alerta="${h.alerta || ''}">
                <td><b>${h.nombre}</b><span class="hw-mk">${h.memTipo}</span></td>
                <td class="mono ta-r"><b>${h.mem} GB</b></td>
                <td class="mono ta-r">${n(h.bw)} <span class="tick">GB/s</span></td>
                <td>
                  <ol class="hist">
                    ${h.historial.map((e, i) => `<li${i === h.historial.length - 1 ? ' data-hoy="true"' : ''}>
                      <span class="num hi-p">${usd(e.precio)}</span>
                      <span class="hi-f">${e.fecha}</span>
                      <span class="hi-n">${e.nota}</span>
                    </li>`).join('')}
                  </ol>
                  <span class="num hi-delta">+${delta} %</span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <p class="foot-note">VRAM decide qué modelo entra; la velocidad de memoria
        decide a cuántos tokens por segundo corre. La PRO 6000 y la 5090 mueven
        datos a la misma velocidad: la diferencia está en cuánto entra.
        ${src('NVIDIA · Tech Insider · Thunder Compute · IntuitionLabs')}</p>
      </div>
    </div>`,
},

{
  id: 'intel', sec: 'La física', nav: 'El hardware de Intel',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'El hardware de Intel',
  body: () => `
    <div class="split split--fotos">
      <div class="stack">
        <p class="lede">La Arc Pro B70: la misma VRAM que una RTX 5090, por
        una fracción del precio.</p>
        <div class="fotos-2">
          ${foto('arc-pro-b70', 'La Intel Arc Pro B70.', [
            { x: 62, y: 30, t: '32 GB GDDR6' },
          ], { contain: true })}
        </div>
        <p>Arquitectura Xe2 Battlemage, 367 TOPS INT8. Intel la posiciona
        explícitamente para servir modelos de 20B a 30B en una sola placa,
        y la familia Arc Pro trae también la B65 y la B60 de 24 GB.</p>
        ${contra(`No tiene CUDA. Corre con oneAPI y SYCL: hay stacks que
        arrancan sin tocar nada y hay stacks que directamente no arrancan.
        <b>El ahorro en la factura se paga en horas de integración</b>, y esas
        horas hay que presupuestarlas como parte del precio.`)}
      </div>
      <div class="stack">
        <table class="tbl nv-tbl">
          <thead>
            <tr><th>Producto</th><th class="ta-r">VRAM</th><th class="ta-r">Velocidad</th><th>Evolución de precio</th></tr>
          </thead>
          <tbody>
            ${['arcprob70', 'rtx5090'].map((id) => {
              const h = hw(id);
              const ult = h.historial[h.historial.length - 1];
              const delta = Math.round((ult.precio / h.historial[0].precio - 1) * 100);
              return `<tr data-alerta="${h.alerta || ''}"${id === 'rtx5090' ? ' data-ref="true"' : ''}>
                <td><b>${h.nombre}</b><span class="hw-mk">${h.fabricante} · ${h.memTipo}${id === 'rtx5090' ? ' · referencia' : ''}</span></td>
                <td class="mono ta-r"><b>${h.mem} GB</b></td>
                <td class="mono ta-r">${n(h.bw)} <span class="tick">GB/s</span></td>
                <td>
                  <ol class="hist">
                    ${h.historial.map((e, i) => `<li${i === h.historial.length - 1 ? ' data-hoy="true"' : ''}>
                      <span class="num hi-p">${usd(e.precio)}</span>
                      <span class="hi-f">${e.fecha}</span>
                      <span class="hi-n">${e.nota}</span>
                    </li>`).join('')}
                  </ol>
                  <span class="num hi-delta">+${delta} %</span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <p class="foot-note">Misma memoria, un tercio de la velocidad, y entre un
        tercio y la mitad del precio. Tampoco escapó a la crisis de la RAM: subió
        entre 34 y 87 % en cinco meses. ${src('Tom’s Hardware · Gigazine · Newegg')}</p>
      </div>
    </div>`,
},

{
  id: 'apple', sec: 'La física', nav: 'El hardware de Apple',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'El hardware de Apple',
  body: () => `
    <div class="split split--fotos">
      <div class="stack">
        <p class="lede">Memoria unificada: un solo pool que la CPU, la GPU y el
        Neural Engine comparten sin copiar nada entre ellos.</p>
        <div class="fotos-2">
          ${foto('mac-studio', 'Mac mini M6 y Mac Studio, con los chips M5 Max y M5 Ultra.', [
            { x: 66, y: 62, t: 'hasta 512 GB unificados' },
          ], { pos: '50% 58%', alto: 320 })}
        </div>
        <p>El M5 Ultra llega a <strong>1,2 TB/s</strong> — 50 % más que el M3
        Ultra — y es el primer equipo de escritorio capaz de correr un modelo
        de 405 mil millones de parámetros en 4 bits sin partirlo entre placas.</p>
        ${contra(`Sin CUDA. MLX y llama.cpp cubren muchísimo y el rendimiento es
        real, pero hay herramientas del ecosistema que asumen NVIDIA. Y la
        configuración de 512 GB <b>todavía no tiene precio publicado</b>: llega
        en octubre.`)}
      </div>
      <div class="stack">
        <table class="tbl nv-tbl">
          <thead>
            <tr><th>Producto</th><th class="ta-r">Memoria</th><th class="ta-r">Velocidad</th><th>Precio de lista</th></tr>
          </thead>
          <tbody>
            ${['m5ultra', 'm5max'].map((id) => {
              const h = hw(id);
              return `<tr>
                <td><b>${h.nombre}</b><span class="hw-mk">${h.fabricante} · ${h.memTipo}</span></td>
                <td class="mono ta-r"><b>${h.mem} GB</b></td>
                <td class="mono ta-r">${n(h.bw)} <span class="tick">GB/s</span></td>
                <td>
                  <ol class="hist">
                    ${h.historial.map((e) => `<li${e.precio ? ' data-hoy="true"' : ''}>
                      <span class="num hi-p">${e.precio ? usd(e.precio) : '—'}</span>
                      <span class="hi-f">${e.fecha}</span>
                      <span class="hi-n">${e.nota}</span>
                    </li>`).join('')}
                  </ol>
                </td>
              </tr>`;
            }).join('')}
            <tr data-ref="true">
              <td><b>Mac mini M6</b><span class="hw-mk">Apple · unificada</span></td>
              <td class="mono ta-r"><b>32 GB</b></td>
              <td class="mono ta-r">170 <span class="tick">GB/s</span></td>
              <td><span class="hi-n">la puerta de entrada: +10 % de banda vs. M5</span></td>
            </tr>
          </tbody>
        </table>
        <p class="foot-note">La velocidad del M5 Ultra es dos tercios de la de una
        RTX 5090, pero entra dieciséis veces más memoria. Es la apuesta opuesta a
        la de NVIDIA: capacidad antes que velocidad. ${src('Apple Newsroom · Macworld · MacRumors')}</p>
      </div>
    </div>`,
},

{
  id: 'amd', sec: 'La física', nav: 'El hardware de AMD',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'El hardware de AMD',
  body: () => `
    <div class="split split--fotos">
      <div class="stack">
        <p class="lede">Dos caminos: un mini PC con 128 GB unificados a un tercio
        del precio de un Mac equivalente, y una gráfica de 32 GB que compite
        de frente con la B70.</p>
        <div class="fotos-2">
          ${foto('ryzen-ai-max', 'Un mini PC con Ryzen AI Max+ 395.', [
            { x: 58, y: 40, t: '128 GB unificados' },
          ], { contain: true, alto: 250 })}
        </div>
        <p>El Ryzen AI Max+ 395 junta 16 núcleos Zen 5 con una Radeon 8060S de
        40 unidades de cómputo y hasta 96 GB asignables a la GPU. Corre
        GPT-OSS 120B a unos 30 tok/s y un MoE de 35B por encima de 50.
        Es la <strong>mejor relación GB por dólar</strong> del mercado real.</p>
        ${contra(`ROCm, no CUDA. Y 256 GB/s es <b>poca velocidad para lo que
        entra</b> en 128 GB: te deja cargar modelos que después vas a esperar.
        La R9700, además, aparece y desaparece del stock.`)}
      </div>
      <div class="stack">
        <table class="tbl nv-tbl">
          <thead>
            <tr><th>Producto</th><th class="ta-r">Memoria</th><th class="ta-r">Velocidad</th><th>Evolución de precio</th></tr>
          </thead>
          <tbody>
            ${['ryzenaimax', 'r9700'].map((id) => {
              const h = hw(id);
              return `<tr>
                <td><b>${h.nombre}</b><span class="hw-mk">${h.fabricante} · ${h.memTipo}</span></td>
                <td class="mono ta-r"><b>${h.mem} GB</b></td>
                <td class="mono ta-r">${n(h.bw)} <span class="tick">GB/s</span></td>
                <td>
                  <ol class="hist">
                    ${h.historial.map((e, i) => `<li${i === h.historial.length - 1 ? ' data-hoy="true"' : ''}>
                      <span class="num hi-p">${usd(e.precio)}</span>
                      <span class="hi-f">${e.fecha}</span>
                      <span class="hi-n">${e.nota}</span>
                    </li>`).join('')}
                  </ol>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <p class="foot-note">AMD es el único que hoy juega en las dos ligas a la
        vez: memoria unificada barata en el mini PC, y una discreta de 32 GB con
        más banda que la B70 al mismo precio de lista. Ninguna de las dos escaló
        de precio como NVIDIA — pero la discreta se agota.
        ${src('runaihome · MindStudio · TechRadar · Phoronix')}</p>
      </div>
    </div>`,
},

{
  id: 'xiaomi', sec: 'La física', nav: 'El hardware de Xiaomi',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'El hardware de Xiaomi',
  body: () => `
    <div class="split split--fotos">
      <div class="stack">
        <p class="lede">El AI Cube: la velocidad de una RTX 5090 con la
        capacidad de un Mac Studio, en un cubo de 150 vatios. Si los números se
        sostienen.</p>
        <div class="fotos-2">
          ${foto('ai-cube', 'El prototipo del Xiaomi AI Cube.', [
            { x: 47, y: 30, t: '1,22 TB/s · 3 chips XRING' },
          ], { contain: true, alto: 330 })}
        </div>
        <p>Tres chips propios: el <strong>XRING O3</strong> con NPU de 200 TOPS,
        el <strong>O100</strong> con dos capas de DRAM apiladas sobre la lógica
        (wafer-on-wafer, unión híbrida a 1,4 μm), y el <strong>D100</strong> de
        3 nm. Juntos direccionan hasta 160 GB con 28.672 conexiones de datos.</p>
        ${contra(`<b>No existe todavía.</b> Es un prototipo mostrado en agosto de
        2026, sin versión de venta anunciada, y el O100 y el D100 recién entran
        en uso comercial en 2027. No se puede presupuestar. Lo incluyo porque
        marca hacia dónde va la curva — y porque cualquier plan a tres años
        tiene que contemplar que esto llegue.`)}
      </div>
      <div class="stack">
        <table class="tbl nv-tbl">
          <thead>
            <tr><th>Producto</th><th class="ta-r">Memoria</th><th class="ta-r">Velocidad</th><th>Precio</th></tr>
          </thead>
          <tbody>
            ${(() => { const h = hw('aicube'); return `<tr>
              <td><b>${h.nombre}</b><span class="hw-mk">${h.fabricante} · ${h.memTipo}</span></td>
              <td class="mono ta-r"><b>${h.mem}–${h.memMax} GB</b></td>
              <td class="mono ta-r">${n(h.bw)} <span class="tick">GB/s</span></td>
              <td>
                <ol class="hist">
                  <li><span class="num hi-p">—</span><span class="hi-f">ago 2026</span><span class="hi-n">prototipo, sin precio ni fecha de venta</span></li>
                  <li data-hoy="true"><span class="num hi-p flag-txt">2027</span><span class="hi-f"></span><span class="hi-n">O100 y D100 en uso comercial</span></li>
                </ol>
              </td>
            </tr>`; })()}
            ${['rtx5090', 'm5ultra'].map((id) => {
              const h = hw(id);
              return `<tr data-ref="true">
                <td><b>${h.nombre}</b><span class="hw-mk">${h.fabricante} · referencia</span></td>
                <td class="mono ta-r"><b>${h.mem} GB</b></td>
                <td class="mono ta-r">${n(h.bw)} <span class="tick">GB/s</span></td>
                <td><span class="hi-n">${id === 'rtx5090' ? 'la velocidad que iguala' : 'la capacidad que se acerca'}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <p class="foot-note">1,22 TB/s de banda near-memory con 128 GB de base:
        ningún producto en venta hoy junta las dos cosas a ese nivel. Es la
        promesa del mercado, todavía no su realidad.
        ${src('VideoCardz · Gizmochina · Hardware Corner')}</p>
      </div>
    </div>`,
},

{
  id: 'tabla', sec: 'El hardware', nav: 'La tabla',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'El mercado completo, con sus contras.',
  body: () => `
    <div class="stack">
      <table class="tbl hw-tbl">
        <thead>
          <tr>
            <th>Opción</th><th class="ta-r">Memoria</th><th class="ta-r">GB/s</th>
            <th class="ta-r">Precio calle</th><th>Estado</th><th>El contra</th>
          </tr>
        </thead>
        <tbody>
          ${[...HARDWARE].sort((a, b) => b.bw - a.bw).map((h) => `
            <tr data-alerta="${h.alerta || ''}" data-estado="${h.estado}">
              <td>
                <b>${h.nombre}</b>
                <span class="hw-mk">${h.fabricante} · ${h.tipo}${h.cuda ? ' · CUDA' : ''}</span>
              </td>
              <td class="mono ta-r">${h.mem}${h.memMax ? `–${h.memMax}` : ''} GB</td>
              <td class="mono ta-r"><b>${n(h.bw)}</b></td>
              <td class="mono ta-r">${
                h.precio
                  ? (h.precio[0] === h.precio[1] ? usd(h.precio[0]) : `${usd(h.precio[0])}–${n(h.precio[1])}`)
                  : '<span class="dim">—</span>'
              }<br>${obs(h.obs)}</td>
              <td>${h.estado === 'prototipo' ? '<span class="flag">2027</span>' : '<span class="dim">disponible</span>'}</td>
              <td class="hw-contra">${h.contra}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="foot-note">Precios de calle observados, no MSRP. Cada uno lleva
      su fecha porque en 2026 se mueven en semanas. ${src('Tom’s Hardware · Newegg · VideoCardz · Apple · IntuitionLabs')}</p>
    </div>`,
},

/* ── LOS MODELOS ──────────────────────────────────────────────── */
{
  id: 'catalogo', sec: 'Los modelos', nav: 'Modelos abiertos',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Modelos abiertos, en cada área de la AI',
  body: () => `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-opensource', nombre: 'Open Source' }], { color: true })}
        <p class="lede">Existen modelos de código abierto y de pesos abiertos en
        todas las áreas de la AI —texto, visión, voz, series de tiempo— que
        cualquiera puede descargar y usar según su licencia, en el hardware
        que tenga.</p>
        <p>Cuando el modelo corre en tu propio equipo, cambian tres cosas:</p>
        <ul class="cambios">
          <li>
            <span class="cb-antes">Suscripción a uno o varios servicios privativos</span>
            <span class="cb-flecha"></span>
            <span class="cb-ahora">El costo es la <strong>electricidad del equipo</strong></span>
          </li>
          <li>
            <span class="cb-antes">Sujeto a las políticas de esas empresas</span>
            <span class="cb-flecha"></span>
            <span class="cb-ahora"><strong>Sin límites de uso</strong> impuestos por terceros</span>
          </li>
          <li>
            <span class="cb-antes">Tus datos alimentan el negocio de otros</span>
            <span class="cb-flecha"></span>
            <span class="cb-ahora">La información <strong>no sale del edificio</strong></span>
          </li>
        </ul>
      </div>
      <div class="stack">
        <div class="noticia">
          ${logos([
            { base: 'logo-nvidia', nombre: 'NVIDIA' },
            { base: 'logo-huggingface', nombre: 'Hugging Face' },
          ])}
          <h3 class="sub">NVIDIA compra Hugging Face</h3>
          <div class="figure" data-key="bw">
            <span class="v">USD 12.930 M</span>
            ${obs('anunciado 3 sep 2026 · cierre previsto 1S 2027')}
          </div>
          <p>Hugging Face es el repositorio donde se publican y descargan los
          modelos abiertos del mundo. Con la compra, el mayor fabricante de
          chips de AI pasa a ser dueño también del lugar donde se distribuyen
          los modelos. NVIDIA se comprometió públicamente a mantener la
          plataforma abierta y a seguir soportando a otros fabricantes.</p>
          <p class="foot-note">La segunda compra más grande de la historia de
          NVIDIA. Es la señal más clara de que el ecosistema abierto no es un
          nicho: es el terreno que las grandes empresas quieren controlar.
          ${src('NVIDIA · SEC 8-K · CNBC · Bloomberg')}</p>
        </div>
      </div>
    </div>`,
},

/* ── LOS MODELOS, UNO POR UNO ─────────────────────────────────── */
{
  id: 'qwen', sec: 'Los modelos', nav: 'Qwen 3.8',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Qwen 3.8: programar con un modelo que te podés bajar',
  body: () => `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-qwen', nombre: 'Qwen' }], { color: true })}
        <p class="lede">Qwen es la familia de modelos abiertos de Alibaba. La
        3.8 no llega a la frontera, pero se le acerca — y se descarga.</p>
        <h3 class="sub">Inteligencia <span class="obs">${AA.version} · ${AA.fecha}</span></h3>
        ${barras(AA.indice, AA.indiceMax, (v) => n(v))}
        <p class="tick ba-leyenda">
          <span data-abierto="true"></span> pesos abiertos
          <span data-abierto="false"></span> cerrados
        </p>
        <p>Y no es solo texto: el 27B <strong>entiende imágenes y video</strong>
        de forma nativa. Para vigilancia, la familia cubre las dos puntas:</p>
        <ul class="vram">
          <li><span class="num">8 GB</span> Qwen3-VL 2B mira la cámara en vivo</li>
          <li><span class="num">24 GB</span> Qwen3.8-27B razona sobre el video, en 4 bits</li>
        </ul>
      </div>
      <div class="stack">
        <p>Para programar publicó números concretos con la versión de 27 mil
        millones de parámetros: <strong>61,7 en SWE-bench Pro</strong> y
        <strong>73,0 en Terminal-Bench</strong>. Es la versión que entra en una
        placa sola.</p>
        <h3 class="sub">Costo por tarea resuelta <span class="obs">USD que factura el proveedor</span></h3>
        ${barras(AA.costo, AA.costoMax, (v) => 'USD ' + n(v, 2), null, 'gasto')}
        <p>Las cuatro primeras son lo que cobra un proveedor cada vez que le
        pedís algo. La última corre en tu equipo: ahí <strong>no hay factura por
        tarea</strong>, solo la electricidad que consume mientras piensa.</p>
        ${contra(`La brecha es real y conviene decirla: el 27B mide 34 contra
        58 del mejor cerrado. El que pelea arriba es Qwen3.8-Max, con 45, pero
        son 2,4 billones de parámetros — no entra en ningún equipo de esta
        presentación. Los números de coding los mide el propio fabricante. Y ese
        cero es <b>cero de factura, no de costo</b>: el equipo hay que comprarlo,
        y esa cuenta está más adelante.`)}
        <p class="foot-note">${src('Artificial Analysis · Qwen (QwenLM)')}</p>
      </div>
    </div>`,
},

{
  id: 'qwen-eco', sec: 'Los modelos', nav: 'El ecosistema Qwen',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Qwen no es un modelo: es un catálogo de servicios',
  body: () => `
    <div class="split">
      <div class="stack">
        <p class="lede">Texto, código, imagen, transcripción y voz. Todos
        descargables, todos del mismo laboratorio, todos corriendo en el mismo
        equipo — sin una cuenta de por medio.</p>
        <table class="tbl qw-tbl">
          <thead>
            <tr><th>Servicio</th><th>Modelo</th><th class="ta-r">Tamaño</th><th>Licencia</th></tr>
          </thead>
          <tbody>
            ${QWEN.map((q) => `
              <tr data-libre="${q.libre}">
                <td>${q.area}</td>
                <td><b>${q.modelo}</b><span class="hw-mk">${q.nota}</span></td>
                <td class="mono ta-r">${q.tam}</td>
                <td class="mono qw-lic">${q.lic}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="stack">
        <h3 class="sub">Imagen: puntaje contra tamaño <span class="obs">comparativo de Qwen-Image 2.1</span></h3>
        ${barras(AA.imagen, AA.imagenMax, (v) => n(v, 2), (f) => f.pr ? f.pr + ' B' : '—')}
        <p>Qwen-Image 2.1 le gana a modelos <strong>cuatro y once veces más
        grandes</strong> con 7 mil millones de parámetros. Los que están arriba
        de él son cerrados y ni siquiera publican su tamaño.</p>
        ${contra(`Se descarga, pero su licencia es <b>solo de investigación</b>:
        para vender algo hecho con él hay que acordar aparte con Alibaba. La
        alternativa libre es Qwen-Image-2512, ocho puntos abajo y con
        Apache 2.0. Leer la licencia es parte del trabajo.`)}
        <p class="foot-note">${src('Qwen · Artificial Analysis · Hugging Face')}</p>
      </div>
    </div>`,
},

{
  id: 'deepseek', sec: 'Los modelos', nav: 'DeepSeek V4.1',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'DeepSeek: 552 mil millones, 8 encendidos',
  body: () => {
    const d = md('dsv41flash');
    const xVivo = bytesActivosGB(d.activos, 'Q4_K_M');
    const xTodo = bytesActivosGB(d.total, 'Q4_K_M');
    const bw = hw('m5ultra').bw;
    const vVivo = techoTokens(bw, xVivo);
    const vTodo = techoTokens(bw, xTodo);
    return `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-deepseek', nombre: 'DeepSeek' }], { color: true })}
        <p class="lede">El laboratorio chino que hizo caer el precio de la
        inteligencia. Su última versión abierta tiene 552 mil millones de
        parámetros y enciende 8 por cada palabra que escribe.</p>
        <p>Es el cerebro de hace unas slides llevado al extremo: la red entera
        está ahí, pero para cada palabra se prende <strong>menos del 2 %</strong>.</p>
        <ul class="vram">
          <li><span class="num">${n(xVivo, 1)} GB</span> se mueven por cada palabra</li>
          <li><span class="num">${n(xTodo)} GB</span> si estuviera todo encendido</li>
        </ul>
        <p class="ds-meta mono">MIT · 1 millón de tokens de contexto · multimodal · ${d.obs}</p>
      </div>
      <div class="stack">
        <h3 class="sub">Palabras por segundo <span class="obs">mismo modelo, mismo Mac Studio</span></h3>
        ${barras([
          { m: 'Con 8 mil millones encendidos', v: vVivo, abierto: true, foco: true },
          { m: 'Con los 552 mil millones', v: vTodo, no: true },
        ], 300, (v) => n(v, v < 10 ? 1 : 0), null, '', true)}
        <p><strong>${n(vVivo / vTodo)} veces más rápido</strong>, sabiendo
        exactamente lo mismo. Lo único que cambia es cuánto hay que mover por
        cada palabra.</p>
        ${contra(`Los 8 mil millones se <b>mueven</b>; los 552 mil hay que
        <b>tenerlos</b>. Son ${n(xTodo)} GB en memoria sí o sí, y el único equipo
        acá que los aguanta es el Mac Studio de 512 GB — que todavía no tiene
        precio publicado en esa configuración.`)}
      </div>
    </div>`;
  },
},

{
  id: 'kimi', sec: 'Los modelos', nav: 'Kimi K3',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Kimi K3: el modelo abierto más grande del mundo',
  body: () => {
    const k = md('kimik3');
    const d = md('dsv41flash');
    const xK = bytesActivosGB(k.activos, 'Q4_K_M');
    const tK = bytesActivosGB(k.total, 'Q4_K_M');
    const tD = bytesActivosGB(d.total, 'Q4_K_M');
    const mac = hw('m5ultra');
    return `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-kimi', nombre: 'Kimi', oscuro: true }], { color: true })}
        <p class="lede">Moonshot AI publicó en julio los pesos de un modelo de
        2,8 billones de parámetros. Es el más grande que cualquiera puede
        descargar — y nadie en esta presentación lo puede correr.</p>
        <p>Enciende 104 mil millones por palabra, lee un millón de tokens de una
        vez, entiende imágenes y video y trae su propio agente de terminal.</p>
        <p class="ds-meta mono">${k.licencia} · 1 millón de tokens · multimodal · ${k.obs}</p>
        ${contra(`Hay letra chica. Kimi K3 no sale con una licencia libre: es una
        licencia propia con <b>condiciones atadas a la facturación</b>, así que no
        califica como código abierto. Descargable no es lo mismo que libre — ni lo
        mismo que ejecutable.`)}
      </div>
      <div class="stack">
        <h3 class="sub">¿Entra en memoria? <span class="obs">GB, ya comprimido a 4 bits</span></h3>
        ${barras([
          { m: 'Kimi K3 entero', v: tK, no: true },
          { m: 'Mac Studio más grande', v: mac.mem },
          { m: 'DeepSeek V4.1 entero', v: tD, abierto: true },
        ], 1600, (v) => n(v) + ' GB', null, '', true)}
        ${leyendaMem}
        <p>Kimi pesa <strong>tres veces</strong> lo que entra en el equipo más
        grande de esta presentación. DeepSeek, de la slide anterior, sí entra.</p>
        <p>Y aunque entrara, movería ${n(xK)} GB por cada palabra: unas
        <strong>${n(techoTokens(mac.bw, xK))} palabras por segundo</strong>.
        Utilizable, pero lejos de las 273 de DeepSeek.</p>
      </div>
    </div>`;
  },
},

{
  id: 'glm', sec: 'Los modelos', nav: 'GLM-5.3',
  /* Sin plano: tres slides seguidas con el mismo gráfico lo vuelven
     papel tapiz. Acá la cifra que importa es una resta —409 sobre
     512 GB— y esa se lee mejor escrita que dibujada. */
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'GLM-5.3: el más grande que todavía entra',
  body: () => {
    const g = md('glm53');
    const xVivo = bytesActivosGB(g.activos, 'Q4_K_M');
    const xTodo = bytesActivosGB(g.total, 'Q4_K_M');
    const mem = hw('m5ultra').mem;
    return `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-glm', nombre: 'GLM', oscuro: true }], { color: true })}
        <p class="lede">Z.ai es el otro laboratorio chino que juega en la punta.
        GLM-5.3 mide 45 en el índice, empatado con lo mejor de Qwen — y es el
        modelo más grande de esta presentación que todavía entra en un equipo
        que se puede comprar.</p>
        <ul class="vram">
          <li><span class="num">${n(xVivo)} GB</span> se mueven por cada palabra</li>
          <li><span class="num">${n(xTodo)} GB</span> pesa entero, de los ${n(mem)} del Mac Studio</li>
        </ul>
        <p class="ds-meta mono">${g.licencia} · ${g.contexto} de contexto · ${n(g.total)} B totales · ${g.obs}</p>
      </div>
      <div class="stack">
        <p>Lo interesante es <strong>cómo</strong> lo consiguieron: no
        reentrenaron nada. Tomaron la base de GLM-5.2 y todas las mejoras vienen
        del pulido posterior. Es una señal de que todavía queda margen sin
        necesidad de gastar más cómputo — que es exactamente la clase de margen
        que le sirve a quien no tiene un centro de datos.</p>
        <div class="claim" data-tone="warn">
          <p><strong>Y la licencia fue para atrás.</strong> GLM-5.2 salió con
          licencia MIT, la más permisiva que existe. GLM-5.3 salió con una
          licencia propia, escrita por Z.ai — igual que Kimi.</p>
        </div>
        ${contra(`Entra, pero apenas: ${n(xTodo)} GB de pesos sobre ${n(mem)} no
        dejan mucho lugar para el contexto, que también ocupa memoria. Y la
        licencia propia hay que leerla antes de facturar nada.`)}
        <p class="foot-note">${src('Z.ai · Hugging Face · Artificial Analysis')}</p>
      </div>
    </div>`;
  },
},

{
  id: 'mimo', sec: 'Los modelos', nav: 'MiMo de Xiaomi',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'MiMo: Xiaomi entra, y con licencia MIT',
  body: () => {
    const pr = md('mimopro');
    const ch = md('mimo9b');
    const tPro = bytesActivosGB(pr.total, 'Q4_K_M');
    const tCh = bytesActivosGB(ch.total, 'Q4_K_M');
    const mac = hw('m5ultra');
    const placa = hw('rtx5060ti');
    return `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-xiaomi', nombre: 'Xiaomi' }], { color: true })}
        <p class="lede">Xiaomi publicó MiMo-V2.6 el 22 de septiembre. Es el modelo
        de pesos abiertos <strong>mejor ubicado del índice</strong>: 46 puntos,
        arriba de todo lo demás que se puede descargar.</p>
        <p>Un billón de parámetros, 42 mil millones encendidos por palabra, y
        <strong>licencia MIT sin registro</strong>: se descarga, se modifica y se
        vende. En el gráfico de costos era el punto de USD 0,13 por tarea —
        cuarenta y seis veces más barato que el mejor cerrado, con doce puntos
        menos de índice.</p>
        <p class="ds-meta mono">MIT · Pro, Flash y 9B · más de 7.000 entornos de entrenamiento publicados · ${pr.obs}</p>
      </div>
      <div class="stack">
        <h3 class="sub">El grande <span class="obs">GB, comprimido a 4 bits</span></h3>
        ${barras([
          { m: 'MiMo-V2.6-Pro entero', v: tPro, no: true },
          { m: 'Mac Studio más grande', v: mac.mem },
        ], 600, (v) => n(v) + ' GB', null, '', true)}
        <h3 class="sub">El chico <span class="obs">GB, comprimido a 4 bits</span></h3>
        ${barras([
          { m: 'MiMo 9B destilado', v: tCh, abierto: true, foco: true },
          { m: placa.nombre, v: placa.mem },
        ], 18, (v) => n(v, v < 10 ? 1 : 0) + ' GB', null, '', true)}
        ${leyendaMem}
        ${contra(`Lo que mide 46 no es lo que te corre en casa. El Pro no entra en
        ningún equipo de esta presentación; el que entra en una placa de entrada
        es el 9B, que no juega en esa liga. Y hace <b>días</b> que existe: fuera
        del índice todavía no hay mediciones independientes.`)}
      </div>
    </div>`;
  },
},

{
  id: 'gemma', sec: 'Los modelos', nav: 'Gemma 4',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Gemma 4: la familia que entra en cualquier cosa',
  body: () => {
    const e4 = md('gemma4_e4b');
    const g12 = md('gemma4_12b');
    const g26 = md('gemma4_26b');
    const g31 = md('gemma4_31b');
    const placa = hw('rtx5060ti');
    const t = (m) => bytesActivosGB(m.total, 'Q4_K_M');
    const v = (m) => techoTokens(placa.bw, bytesActivosGB(m.activos, 'Q4_K_M'));
    return `
    <div class="split">
      <div class="stack">
        ${logos([{ base: 'logo-gemma', nombre: 'Gemma' }], { color: true })}
        <p class="lede">La familia abierta de Google DeepMind, construida al revés
        que las anteriores: no para batir un récord, sino para que entre. Cinco
        tamaños —de un teléfono a 31 mil millones—, <strong>todos
        multimodales</strong> y con <strong>licencia Apache 2.0</strong>.</p>
        <p>El dato curioso: el modelo de 26 mil millones es más grande que el de
        12 y sin embargo <strong>escribe ${n(v(g26) / v(g12))} veces más
        rápido</strong>, porque enciende 4 mil millones por palabra. Es toda la
        idea de la que venimos hablando, dentro de una sola familia.</p>
        <p class="ds-meta mono">Apache 2.0 · 256 K de contexto · +140 idiomas · texto e imagen, audio hasta el 12B · ${g26.obs}</p>
      </div>
      <div class="stack">
        <h3 class="sub">¿Entra en la placa más barata? <span class="obs">GB, comprimido a 4 bits</span></h3>
        ${barras([
          { m: placa.nombre, v: placa.mem },
          { m: 'Gemma 4 E4B', v: t(e4), abierto: true },
          { m: 'Gemma 4 12B', v: t(g12), abierto: true },
          { m: 'Gemma 4 26B-A4B', v: t(g26), abierto: true, foco: true },
          { m: 'Gemma 4 31B', v: t(g31), no: true },
        ], 18, (x) => n(x, 1) + ' GB', null, '', true)}
        ${leyendaMem}
        <h3 class="sub">Palabras por segundo en esa placa</h3>
        ${barras([
          { m: 'Gemma 4 26B-A4B', v: v(g26), abierto: true, foco: true },
          { m: 'Gemma 4 12B', v: v(g12), abierto: true },
        ], 240, (x) => n(x), null, '', true)}
        ${contra(`No pelea el índice: Gemma ni aparece en la comparación de
        inteligencia de hace unas slides, y contra MiMo o Qwen3.8-Max pierde. Lo
        que trae es otra cosa — <b>licencia sin letra chica</b>, 140 idiomas y un
        tamaño que ya tenés en el escritorio.`)}
      </div>
    </div>`;
  },
},

{
  id: 'decision', sec: 'Los modelos', nav: 'Jev y Laya',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Jev y Laya: modelos que deciden, no que escriben',
  body: () => {
    const j = DECISION.jev;
    const l = DECISION.laya;
    return `
    <div class="split">
      <div class="stack">
        <p class="lede">No todos los modelos de AI escriben. Estos dos miran un
        caso —un correo, un reclamo, un formulario— y contestan preguntas
        concretas con una probabilidad: ¿es urgente? ¿a qué área va? ¿es queja o
        consulta?</p>
        <p>Lo hacen de una sola pasada, sin redactar ni una palabra, y por eso
        tardan milésimas de segundo en vez de segundos. Son la pieza que decide
        <strong>qué hacer con cada caso que entra</strong> — el trabajo que hoy
        hace una persona leyendo una bandeja de entrada.</p>
        <h3 class="sub">Tiempo por decisión <span class="obs">milisegundos</span></h3>
        ${barras([
          { m: `${j.nombre} · por la red`, v: j.latencia, abierto: false },
          { m: `${l.nombre} · en tu equipo`, v: l.latencia, abierto: true, foco: true },
        ], 160, (v) => n(v) + ' ms')}
        <p>Son <strong>la misma idea publicada dos veces</strong>: Jev cerrado
        detrás de una API, Laya con los pesos en Hugging Face. El deck entero en
        una sola comparación.</p>
      </div>
      <div class="stack">
        <table class="tbl vs-tbl">
          <thead>
            <tr>
              <th></th>
              <th>${j.nombre}<span class="hw-mk">${j.casa} · cerrado</span></th>
              <th>${l.nombre}<span class="hw-mk">${l.casa} · abierto</span></th>
            </tr>
          </thead>
          <tbody>
            ${DECISION.filas.map((f) => `
              <tr data-gana="${f.gana}">
                <td class="vs-que">${f.que}</td>
                <td class="vs-j">${f.jev}</td>
                <td class="vs-l">${f.laya}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${contra(`Sin afinar, Laya acierta apenas más que tirar una moneda en el
        banco de pruebas de decisiones. El número bueno aparece <b>después de
        entrenarlo con tus propios casos</b> — unas cuatro horas en una GPU
        gratuita. Es una base para especializar, no un oráculo para enchufar.`)}
        <p class="foot-note">Y ahí está lo interesante para un organismo: lo que
        lo vuelve flojo de fábrica es lo mismo que lo vuelve tuyo. Los casos con
        los que se afina son exactamente los que no querés subir a ningún lado.
        ${src(`${j.src} · ${l.src}`)}</p>
      </div>
    </div>`;
  },
},

/* ── LOS CASOS ────────────────────────────────────────────────── */
{
  id: 'casos', sec: 'Los casos', nav: 'Cuatro casos',
  plot: () => ({ mode: 'quiet', ceilings: [], markers: [] }),
  layout: 'wide',
  title: 'Cuatro cosas que ya se pueden construir.',
  body: () => `
    <div class="stack">
      <div class="casos">
        ${CASOS.map((c) => `
          <article class="caso">
            <h3 class="sub">${c.titulo}</h3>
            <p class="caso-stack mono">${c.stack.join(' + ')}</p>
            <p class="caso-huella tick">${c.huella}</p>
            <p>${c.que}</p>
            <p class="caso-por"><strong>Por qué local:</strong> ${c.porque}</p>
            <p class="caso-prec">${c.precedente}</p>
          </article>`).join('')}
      </div>
      ${contra(`Ninguno de estos cuatro es un piloto propio. Son
      <b>precedentes públicos que prueban viabilidad técnica</b>, no tracción
      de este proyecto. Los cito con nombre y fuente justamente para que la
      diferencia quede clara.`)}
    </div>`,
},

/* ── CONCLUSIONES ─────────────────────────────────────────────── */
{
  id: 'conclusiones', sec: 'Conclusiones', nav: 'Conclusiones',
  /* Cierra con el mismo cerebro de la portada: el deck termina donde
     empezó, con la tesis ya demostrada en vez de anunciada. */
  cerebro: true,
  plot: () => ({ mode: 'off', ceilings: [], markers: [] }),
  title: 'Conclusiones',
  body: () => `
    <div class="stack">
      <p class="lede conclusion">La disponibilidad de <strong>modelos Open Source
      y Open Weight</strong> con mayores capacidades y optimización de recursos
      computacionales, sumada a la reciente aparición de <strong>hardware
      especializado</strong>, abren a la AI local la posibilidad de llevar
      adelante <strong>proyectos locales cercanos a potenciales clientes en la
      región</strong>, bajando los costes operativos y garantizando la
      privacidad de los datos frente a las grandes empresas.</p>
      <div class="hero-meta">
        <span class="tick">${PROYECTO.subtitulo}</span>
        <span class="tick">Relevamiento ${PROYECTO.relevamiento}</span>
      </div>
    </div>`,
},

];

/* Índice de secciones para el rail y el overview. */
const SECCIONES = SLIDES.reduce((acc, s, i) => {
  if (!acc.length || acc[acc.length - 1].nombre !== s.sec) {
    acc.push({ nombre: s.sec, desde: i, items: [] });
  }
  acc[acc.length - 1].items.push({ i, nav: s.nav || s.title });
  return acc;
}, []);
