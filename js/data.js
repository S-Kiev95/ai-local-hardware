/* Datos del deck. Fuente única de verdad.
 *
 * REGLA: toda cifra lleva `obs` (fecha de observación) y `src` (fuente).
 * El plano se computa desde acá en runtime — corregís un número acá
 * y la rampa, los marcadores y las tablas se redibujan solos.
 *
 * Trazabilidad completa en datos/fuentes.md
 */

const PROYECTO = {
  // ─────────────────────────────────────────────────────────────
  // CAMBIÁ ESTO Y LISTO. Es el único lugar donde vive el nombre.
  nombre: 'PROYECTO SIN NOMBRE',
  // ─────────────────────────────────────────────────────────────
  subtitulo: 'Inferencia de IA en hardware propio',
  relevamiento: 'septiembre 2026',
};

/* Bytes por parámetro según formato de cuantización.
 * Incluye el overhead real de los bloques GGUF (escalas y mínimos),
 * por eso Q4_K_M no es 0.500 sino ~0.55 bytes/param. */
const FORMATOS = {
  FP16:   { bytes: 2.00,  label: 'FP16',   nota: 'referencia sin cuantizar' },
  Q8_0:   { bytes: 1.06,  label: 'Q8_0',   nota: 'pérdida imperceptible' },
  Q5_K_M: { bytes: 0.68,  label: 'Q5_K_M', nota: 'punto medio' },
  Q4_K_M: { bytes: 0.55,  label: 'Q4_K_M', nota: 'el default sensato' },
  MXFP4:  { bytes: 0.53,  label: 'MXFP4',  nota: 'nativo de entrenamiento' },
  Q2_K:   { bytes: 0.35,  label: 'Q2_K',   nota: 'degrada razonamiento' },
};

/* ── HARDWARE ────────────────────────────────────────────────────
 * bw    : ancho de banda de memoria en GB/s  → define la pendiente
 * mem   : memoria direccionable por el acelerador en GB
 * precio: [min, max] observado en la calle, USD
 * tipo  : 'discreta' | 'unificada'
 * estado: 'disponible' | 'prototipo'
 * cuda  : si corre el ecosistema CUDA sin traducción
 */
const HARDWARE = [
  {
    id: 'rtx5060ti',
    nombre: 'RTX 5060 Ti 16GB',
    fabricante: 'NVIDIA',
    tipo: 'discreta',
    estado: 'disponible',
    cuda: true,
    mem: 16,
    memTipo: 'GDDR7',
    bw: 448,
    precioMsrp: 429,
    precio: [514, 600],
    obs: 'abr–ago 2026',
    src: "Tom's Hardware · Newegg",
    nota: 'La puerta de entrada a CUDA. El techo de 16 GB llega rápido.',
    contra: 'Con 16 GB quedás fuera de los modelos de 30B+ sin cuantización agresiva.',
  },
  {
    id: 'rtx5090',
    nombre: 'RTX 5090',
    fabricante: 'NVIDIA',
    tipo: 'discreta',
    estado: 'disponible',
    cuda: true,
    mem: 32,
    memTipo: 'GDDR7',
    bw: 1792,
    precioMsrp: 1999,
    precio: [3700, 4300],
    obs: 'ago 2026',
    src: 'Tech Insider · Wccftech',
    nota: 'El ancho de banda más alto del mercado de escritorio: 1.792 GB/s sobre bus de 512 bits.',
    contra: 'El precio se despegó del MSRP casi al doble, y NVIDIA notificó a sus partners otro aumento de USD 300 en mayo de 2026 por el costo de la GDDR7.',
    alerta: 'precio',
    historial: [
      { fecha: 'ene 2025', precio: 1999, nota: 'lanzamiento' },
      { fecha: 'may 2026', precio: 2299, nota: '+USD 300 notificado a partners' },
      { fecha: 'ago 2026', precio: 4000, nota: 'calle, USD 3.700–4.300' },
    ],
  },
  {
    id: 'rtxpro6000',
    nombre: 'RTX PRO 6000',
    fabricante: 'NVIDIA',
    tipo: 'discreta',
    estado: 'disponible',
    cuda: true,
    mem: 96,
    memTipo: 'GDDR7 ECC',
    bw: 1792,
    precioMsrp: 8565,
    precio: [16000, 16000],
    obs: 'sep 2026',
    src: 'NVIDIA · Thunder Compute · Tech Insider',
    nota: 'La placa de escritorio más potente de 2026: 96 GB con el mismo ancho de banda que la 5090. Entra un modelo de 70B en Q8 sin partirlo.',
    contra: 'De USD 8.565 a 16.000 en dieciocho meses, +87 %, con dos aumentos de lista de la propia NVIDIA. Es el caso más extremo de la crisis de la RAM.',
    alerta: 'precio',
    historial: [
      { fecha: 'mar 2025', precio: 8565, nota: 'lanzamiento' },
      { fecha: '2026', precio: 13250, nota: 'suba de lista, +55 %' },
      { fecha: 'ago 2026', precio: 16000, nota: 'suba de lista, +87 %' },
    ],
  },
  {
    id: 'arcprob70',
    nombre: 'Arc Pro B70',
    fabricante: 'Intel',
    tipo: 'discreta',
    estado: 'disponible',
    cuda: false,
    mem: 32,
    memTipo: 'GDDR6',
    bw: 608,
    precioMsrp: 949,
    precio: [1268, 1779],
    obs: 'mar–ago 2026',
    src: "Tom's Hardware · Gigazine",
    nota: 'La misma VRAM que una 5090 por una fracción. Xe2 Battlemage, 367 TOPS INT8.',
    contra: 'Sin CUDA. El ahorro en la factura se paga en horas de integración, y hay stacks que directamente no arrancan.',
    alerta: 'software',
    historial: [
      { fecha: 'mar 2026', precio: 949, nota: 'lanzamiento, 25 de marzo' },
      { fecha: 'may 2026', precio: 1099, nota: 'calle, Newegg' },
      { fecha: 'ago 2026', precio: 1500, nota: 'calle, USD 1.268–1.779' },
    ],
  },
  {
    id: 'dgxspark',
    nombre: 'DGX Spark',
    fabricante: 'NVIDIA',
    tipo: 'unificada',
    estado: 'disponible',
    cuda: true,
    mem: 128,
    memTipo: 'LPDDR5x unificada',
    bw: 273,
    precioMsrp: 3999,
    precio: [4699, 4699],
    obs: 'feb 2026',
    src: 'NVIDIA · IntuitionLabs',
    nota: 'Stack NVIDIA completo en 128 GB coherentes. Un petaflop declarado.',
    contra: 'La contradicción del mercado: entra el modelo pero no corre. 273 GB/s es menos de la sexta parte de una 5090.',
    alerta: 'banda',
    historial: [
      { fecha: '2025', precio: 3999, nota: 'lanzamiento' },
      { fecha: 'feb 2026', precio: 4699, nota: '+18 %, «restricciones de suministro de memoria»' },
    ],
  },
  {
    id: 'm5max',
    nombre: 'Mac Studio M5 Max',
    fabricante: 'Apple',
    tipo: 'unificada',
    estado: 'disponible',
    cuda: false,
    mem: 128,
    memTipo: 'unificada',
    bw: 614,
    precioMsrp: 2499,
    precio: [2499, 2499],
    precioNota: 'desde, configuración base',
    obs: 'ago 2026',
    src: 'Apple Newsroom · Macworld',
    nota: '18 núcleos de CPU, hasta 40 de GPU.',
    historial: [
      { fecha: 'ago 2026', precio: 2499, nota: 'lanzamiento, desde (config. base)' },
    ],
    contra: 'Sin CUDA: MLX y llama.cpp cubren mucho, pero no todo el ecosistema.',
  },
  {
    id: 'm5ultra',
    nombre: 'Mac Studio M5 Ultra',
    fabricante: 'Apple',
    tipo: 'unificada',
    estado: 'disponible',
    cuda: false,
    mem: 512,
    memTipo: 'unificada',
    bw: 1200,
    precioMsrp: 5499,
    precio: [5499, 5499],
    precioNota: 'desde, configuración base; la de 512 GB sin precio publicado',
    obs: 'ago 2026',
    src: 'Apple Newsroom · Macworld',
    historial: [
      { fecha: 'ago 2026', precio: 5499, nota: 'lanzamiento, desde (config. base)' },
      { fecha: 'oct 2026', precio: null, nota: '512 GB: sin precio publicado aún' },
    ],
    nota: '512 GB coherentes a 1,2 TB/s — 50 % más de banda que el M3 Ultra. El primer escritorio que corre un modelo de 405B en 4 bits sin partirlo.',
    contra: 'Sin CUDA, y el precio de la configuración de 512 GB no es de escritorio.',
    destacado: true,
  },
  {
    id: 'ryzenaimax',
    nombre: 'Ryzen AI Max+ 395',
    fabricante: 'AMD',
    tipo: 'unificada',
    estado: 'disponible',
    cuda: false,
    mem: 128,
    memTipo: 'LPDDR5X unificada',
    bw: 256,
    precio: [1499, 1999],
    obs: '2026',
    src: 'runaihome · MindStudio',
    nota: '16 núcleos Zen 5 y una Radeon 8060S de 40 CU. 96 GB asignables a la GPU por cerca de un tercio de un Mac equivalente.',
    contra: 'ROCm, no CUDA. Y 256 GB/s es poca banda para lo que entra en 128 GB.',
    historial: [
      { fecha: '2026', precio: 1499, nota: 'mini PC completo, desde' },
      { fecha: '2026', precio: 1999, nota: 'configuraciones de 128 GB' },
    ],
  },
  {
    id: 'r9700',
    nombre: 'Radeon AI PRO R9700',
    fabricante: 'AMD',
    tipo: 'discreta',
    estado: 'disponible',
    cuda: false,
    mem: 32,
    memTipo: 'GDDR6',
    bw: 640,
    precioMsrp: 1299,
    precio: [1299, 1299],
    obs: 'jul 2026',
    src: 'TechRadar · runaihome · Phoronix',
    nota: 'RDNA 4, 32 GB sobre bus de 256 bits. La respuesta discreta de AMD a la B70: misma memoria, algo más de banda.',
    contra: 'ROCm, no CUDA. El stock es irregular: Newegg alterna entre USD 1.299 y agotado, y el mercado secundario pide entre 1.403 y 2.500.',
    historial: [
      { fecha: '2025', precio: 1299, nota: 'lanzamiento, socios entre 1.244 y 1.329' },
      { fecha: 'jul 2026', precio: 1299, nota: 'lista; agotado por rachas, usados hasta 2.500' },
    ],
  },
  {
    id: 'aicube',
    nombre: 'Xiaomi AI Cube',
    fabricante: 'Xiaomi',
    tipo: 'unificada',
    estado: 'prototipo',
    cuda: false,
    mem: 128,
    memMax: 160,
    memTipo: 'LPDDR6 + DRAM apilada',
    bw: 1220,
    precio: null,
    obs: 'ago 2026',
    src: 'VideoCardz · Gizmochina',
    nota: 'Tres chips XRING (O3 + O100 + D100) en 150 W. 1,22 TB/s de banda near-memory con 28.672 conexiones efectivas, vía apilado wafer-on-wafer con hybrid bonding a 1,4 μm.',
    contra: 'No existe. Es un prototipo sin versión retail anunciada, y el O100 y el D100 recién entran en uso comercial en 2027.',
    alerta: 'prototipo',
  },
];

/* Referencia de validación: no es una opción de compra, es el punto
 * que prueba que la banda de eficiencia se sostiene entre arquitecturas. */
const REFERENCIA = {
  id: 'rtx3090x3',
  nombre: '3× RTX 3090 (usadas)',
  bw: 936,
  mem: 72,
  nota: 'Tres placas de 2020 en el mercado de usados.',
};

/* ── MODELOS ─────────────────────────────────────────────────────
 * total   : parámetros totales (miles de millones)
 * activos : parámetros activos por token — lo que realmente se mueve
 * El cociente total/activos es la palanca del MoE.
 */
const MODELOS = [
  {
    id: 'qwen38max',
    nombre: 'Qwen3.8-Max',
    familia: 'Qwen',
    total: 2400,
    activos: 95,
    contexto: '1 M',
    licencia: 'pesos abiertos',
    obs: '12 ago 2026',
    modalidad: 'texto · imagen · video',
    nota: '512 expertos: 10 enrutados más 1 compartido por token. Mueve 25 veces menos memoria que su tamaño nominal.',
  },
  {
    id: 'qwen38flash',
    nombre: 'Qwen3.8-Flash-Next',
    familia: 'Qwen',
    total: 125,
    activos: 6,
    contexto: '—',
    licencia: 'pesos abiertos',
    obs: 'ago 2026',
    modalidad: 'multimodal',
    nota: 'Anticipa la arquitectura Qwen4. Veinte a uno entre totales y activos.',
  },
  {
    id: 'dsv41flash',
    nombre: 'DeepSeek-V4.1-Flash',
    familia: 'DeepSeek',
    total: 552,
    activos: 8,
    contexto: '1 M',
    licencia: 'MIT',
    obs: '10 sep 2026',
    modalidad: 'multimodal',
    nota: 'Enciende menos del 2 % de sí mismo por token. Es el caso extremo de la tesis: lo que pesa y lo que se mueve dejaron de ser el mismo número.',
  },
  {
    id: 'kimik3',
    nombre: 'Kimi K3',
    familia: 'Moonshot AI',
    total: 2800,
    activos: 104,
    contexto: '1 M',
    licencia: 'Kimi K3 License',
    licenciaLibre: false,
    obs: '27 jul 2026',
    modalidad: 'multimodal',
    nota: 'El modelo de pesos abiertos más grande publicado. Licencia propia con condiciones atadas a la facturación: no califica como código abierto según la OSI.',
  },
  {
    id: 'glm53',
    nombre: 'GLM-5.3',
    familia: 'Z.ai',
    total: 744,
    activos: 40,
    contexto: '200 K',
    licencia: 'GLM-5.3 License',
    licenciaLibre: false,
    obs: '14 ago 2026',
    modalidad: 'texto',
    nota: 'Misma base que GLM-5.2: todas las mejoras vienen del entrenamiento posterior. La versión anterior salía con MIT; esta con licencia propia.',
  },
  {
    id: 'mimopro',
    nombre: 'MiMo-V2.6-Pro',
    familia: 'Xiaomi',
    total: 1020,
    activos: 42,
    contexto: '—',
    licencia: 'MIT',
    licenciaLibre: true,
    obs: '22 sep 2026',
    modalidad: 'texto',
    nota: '384 expertos enrutados, 8 encendidos por token. El modelo de pesos abiertos mejor ubicado del índice.',
  },
  {
    id: 'mimo9b',
    nombre: 'MiMo-V2.6-Distill-Qwen-9B',
    familia: 'Xiaomi',
    total: 9,
    activos: 9,
    contexto: '—',
    licencia: 'MIT',
    licenciaLibre: true,
    obs: '22 sep 2026',
    modalidad: 'texto',
    nota: 'Destilado sobre Qwen3.5-9B con datos generados por MiMo. Es el que entra en una placa de entrada.',
  },
  {
    id: 'gptoss120b',
    nombre: 'GPT-OSS 120B',
    familia: 'OpenAI',
    total: 120,
    activos: 5.1,
    contexto: '131 K',
    licencia: 'abierto',
    obs: '2025',
    modalidad: 'texto',
    nota: 'El modelo con más mediciones públicas independientes. Por eso lo uso para calibrar el plano.',
    calibracion: true,
  },
  {
    id: 'gemma4_e4b',
    nombre: 'Gemma 4 E4B',
    familia: 'Gemma',
    total: 4.5,
    activos: 4.5,
    contexto: '256 K',
    licencia: 'Apache 2.0',
    obs: '2 abr 2026',
    modalidad: 'texto · imagen · audio',
    nota: '4,5 B efectivos. El escalón de abajo de la familia: corre en un teléfono.',
  },
  {
    id: 'gemma4_31b',
    nombre: 'Gemma 4 31B',
    familia: 'Gemma',
    total: 31,
    activos: 31,
    contexto: '256 K',
    licencia: 'Apache 2.0',
    obs: '2 abr 2026',
    modalidad: 'texto · imagen',
    nota: 'Denso: activa todo lo que pesa.',
  },
  {
    id: 'gemma4_26b',
    nombre: 'Gemma 4 26B-A4B',
    familia: 'Gemma',
    total: 26,
    activos: 3.8,
    contexto: '256 K',
    licencia: 'Apache 2.0',
    obs: '2 abr 2026',
    modalidad: 'texto · imagen',
    nota: 'MoE con 3,8 B activos. Más de 140 idiomas.',
  },
  {
    id: 'gemma4_12b',
    nombre: 'Gemma 4 12B',
    familia: 'Gemma',
    total: 12,
    activos: 12,
    contexto: '256 K',
    licencia: 'Apache 2.0',
    obs: '2 abr 2026',
    modalidad: 'texto · imagen · audio',
    nota: 'Multimodal unificado con audio.',
  },
  {
    id: 'qwen3vl2b',
    nombre: 'Qwen3-VL 2B',
    familia: 'Qwen',
    total: 2,
    activos: 2,
    contexto: '—',
    licencia: 'abierto',
    obs: '2026',
    modalidad: 'texto · imagen',
    nota: '1,1 GB en Q4_K_M más 0,4 GB de projector. Entra en cualquier cosa.',
  },
];

/* ── MEDICIONES REALES ───────────────────────────────────────────
 * Son de terceros, no propias. Cada una calibra el plano. */
const MEDICIONES = [
  {
    hw: 'dgxspark', hwLabel: 'DGX Spark',
    modelo: 'gptoss120b', modeloLabel: 'GPT-OSS 120B',
    formato: 'MXFP4',
    tokens: 38.6,
    obs: '2026', src: 'IntuitionLabs',
    calibra: true,
  },
  {
    hw: 'rtx3090x3', hwLabel: '3× RTX 3090',
    modelo: 'gptoss120b', modeloLabel: 'GPT-OSS 120B',
    formato: 'MXFP4',
    tokens: 124.0,
    obs: '2026', src: 'IntuitionLabs',
    calibra: true,
    bwOverride: 936,
  },
  {
    hw: 'ryzenaimax', hwLabel: 'Ryzen AI Max+ 395',
    modelo: 'gptoss120b', modeloLabel: 'GPT-OSS 120B',
    formato: 'MXFP4',
    tokens: 30,
    obs: '2026', src: 'runaihome',
    calibra: true,
  },
  {
    hw: 'ryzenaimax', hwLabel: 'Ryzen AI Max+ 395',
    modelo: null, modeloLabel: 'Qwen3.6 35B-A3B',
    formato: 'Q4_K_M',
    activosOverride: 3,
    tokens: 50,
    obs: '2026', src: 'runaihome',
  },
  {
    hw: 'rtx5060ti', hwLabel: 'RTX 5060 Ti 16GB',
    modelo: null, modeloLabel: 'Qwen3.5 35B-A3B',
    formato: 'Q4_K_M',
    activosOverride: 3,
    tokens: 44,
    obs: 'ene 2026', src: 'Hardware Corner',
    caveat: 'Medido con 100 K de contexto: a esa longitud la caché KV compite con los pesos por el mismo ancho de banda, y por eso cae bien debajo de la banda.',
  },
];

/* ── LA BRECHA ───────────────────────────────────────────────── */
const FRONTERA = {
  brechaMeses: 4,
  brechaEci: 8,
  obs: 'desde ene 2026',
  src: 'Epoch AI',
  indice: {
    hoy: 50, hoyCantidad: 4, hoyVentana: 'feb–abr 2026',
    haceUnAnio: 30,
    src: 'Artificial Analysis · SemiAnalysis',
  },
  paridad: [
    { area: 'Conocimiento (MMLU)', estado: 'paridad', detalle: 'Brecha efectivamente cero.' },
    { area: 'Matemática (AIME, MATH-500)', estado: 'paridad', detalle: 'Los abiertos igualan o superan.' },
    { area: 'Ciencia de posgrado (GPQA Diamond)', estado: 'paridad', detalle: 'Los abiertos igualan o superan.' },
    { area: 'Razonamiento general', estado: 'cerca', detalle: 'Diferencia de un dígito.' },
    { area: 'Coding de producción (SWE-bench)', estado: 'acercan', detalle: 'Brecha de 2–3 puntos en la primera mitad de 2026.' },
    { area: 'Tareas agénticas complejas', estado: 'acercan', detalle: 'Los cerrados lideran, con distancia que se acorta.' },
    { area: 'Preferencia humana (Chatbot Arena)', estado: 'atras', detalle: 'Los cerrados mantienen ventaja clara.' },
  ],
};

/* ── MODELOS POR TAREA ───────────────────────────────────────── */
/* ── Artificial Analysis ──────────────────────────────────────────
   El índice de inteligencia promedia diez evaluaciones distintas en
   un solo número, y el costo por tarea es el promedio ponderado de
   lo que sale resolverla contra la API del proveedor. Los dos vienen
   de la misma casa y de la misma corrida, así que se pueden leer
   juntos sin mezclar metodologías. `abierto` es si los pesos se
   descargan; `foco` es si la fila es de Qwen.                       */
const AA = {
  version: 'Intelligence Index v4.3.2',
  fecha: 'sep 2026',
  src: 'artificialanalysis.ai',

  indiceMax: 60,
  indice: [
    { m: 'Claude Opus 5.5', v: 58, abierto: false },
    { m: 'GPT-6 Astra', v: 53, abierto: false },
    { m: 'Claude Opus 5', v: 51, abierto: false },
    { m: 'GPT-6 Sol', v: 48, abierto: false },
    { m: 'Qwen3.8-Max', v: 45, abierto: true, foco: true },
    { m: 'GLM-5.3', v: 45, abierto: true },
    { m: 'Kimi K3', v: 44, abierto: true },
    { m: 'DeepSeek V4.1 Flash', v: 39, abierto: true },
    { m: 'Qwen3.8-27B', v: 34, abierto: true, foco: true },
  ],

  /* La última fila no es una medición de Artificial Analysis: es la
     consecuencia de no tener proveedor. Cero de factura por tarea, que
     no es cero de costo — el equipo se amortiza en la slide de economía. */
  costoMax: 6,
  costo: [
    { m: 'Claude Opus 5.5', v: 5.98, abierto: false },
    { m: 'GPT-6 Astra', v: 3.26, abierto: false },
    { m: 'Kimi K3', v: 2.00, abierto: true },
    { m: 'DeepSeek V4.1 Flash', v: 0.27, abierto: true },
    { m: 'Qwen3.8-27B', v: 0, abierto: true, foco: true,
      local: 'en tu equipo · solo la electricidad' },
  ],

  /* Imagen: el puntaje es el total del comparativo de Qwen-Image 2.1.
     `pr` es el tamaño declarado; los cerrados no lo publican.        */
  imagenMax: 70,
  imagen: [
    { m: 'GPT Image 2.5 Sunburst', v: 67.01, pr: null, abierto: false },
    { m: 'Qwen Image 3 Pro', v: 62.36, pr: null, abierto: false },
    { m: 'Qwen-Image 2.1', v: 60.28, pr: 7, abierto: true, foco: true },
    { m: 'Nano Banana 2.0', v: 59.82, pr: null, abierto: false },
    { m: 'FLUX 2 Max', v: 55.33, pr: 32, abierto: true },
    { m: 'Qwen-Image-2512', v: 52.06, pr: 20, abierto: true, foco: true },
    { m: 'Hunyuan Image 3.0', v: 50.81, pr: 80, abierto: true },
  ],
};

/* ── El catálogo Qwen autoalojable ────────────────────────────────
   Un servicio por fila: qué hace, con qué modelo, cuánto pesa y bajo
   qué licencia. La licencia es la columna que decide si se puede
   facturar con esto, así que va explícita y no en una nota al pie.  */
const QWEN = [
  { area: 'Texto y código', modelo: 'Qwen3.8-27B', tam: '27 B', lic: 'pesos abiertos', libre: true, nota: 'el que entra en una placa sola' },
  { area: 'Imagen', modelo: 'Qwen-Image 2.1', tam: '7 B', lic: 'investigación', libre: false, nota: 'transparencia nativa · no comercial' },
  { area: 'Imagen', modelo: 'Qwen-Image-2512', tam: '20 B', lic: 'Apache 2.0', libre: true, nota: 'la alternativa que sí se puede facturar' },
  { area: 'Transcripción', modelo: 'Qwen3-ASR', tam: '1,7 B · 0,6 B', lic: 'Apache 2.0', libre: true, nota: '52 idiomas y dialectos' },
  { area: 'Voz', modelo: 'Qwen3-TTS', tam: '1,7 B · 0,6 B', lic: 'Apache 2.0', libre: true, nota: '10 idiomas, español incluido' },
  { area: 'Visión', modelo: 'Qwen3-VL 2B', tam: '2 B', lic: 'abierto', libre: true, nota: 'el de la cámara, más adelante' },
];

/* ── Modelos de decisión ──────────────────────────────────────────
   No generan texto: leen un caso y contestan preguntas tipadas con
   una probabilidad, en una sola pasada hacia adelante. Por eso NO van
   al plano — el plano mide caudal de palabras por segundo y acá la
   métrica es latencia por decisión. Meterlos en el roofline sería
   dibujar una física que no es la suya.
   `ece` es el error de calibración esperado: cuánto se despega la
   probabilidad declarada de la frecuencia real. Más bajo, mejor.    */
const DECISION = {
  jev: {
    nombre: 'Jev',
    casa: 'TypeSafe AI',
    obs: '15 sep 2026',
    latencia: 150,
    ece: 0.144,
    src: 'TypeSafe AI',
  },
  laya: {
    nombre: 'Laya',
    casa: 'Convai Innovations',
    obs: 'sep 2026',
    latencia: 33,
    ece: 0.213,
    params: 421,
    paramsMulti: 322,
    memoriaGB: 1,
    idiomas: '100+',
    src: 'Convai Innovations · Hugging Face',
  },
  /* `gana` marca de quién es la ventaja en cada fila. Jev gana una y
     se muestra: una comparación donde uno gana todo no se cree.      */
  filas: [
    { que: 'Pesos', jev: 'cerrados · solo API', laya: 'abiertos · Apache 2.0', gana: 'laya' },
    { que: 'Dónde corre', jev: 'servidor de un tercero', laya: 'tu equipo · 1 GB de memoria', gana: 'laya' },
    { que: 'Tiempo por decisión', jev: '~150 ms', laya: '~33 ms', gana: 'laya' },
    { que: 'Costo', jev: 'USD 0,042 por millón de tokens', laya: 'la electricidad', gana: 'laya' },
    { que: 'Confianza sin afinar', jev: '0,144 de error', laya: '0,213 de error', gana: 'jev' },
    { que: 'Idiomas', jev: 'no publicado', laya: 'más de 100', gana: 'laya' },
    { que: 'Se puede afinar', jev: 'no', laya: 'sí · ~4 h en GPU gratuita', gana: 'laya' },
  ],
};

const CATALOGO = [
  {
    tarea: 'Detección de objetos',
    modelo: 'RF-DETR',
    autor: 'Roboflow',
    licencia: 'Apache 2.0 hasta Large',
    licenciaAlerta: 'XL y 2XL van bajo PML 1.0 — revisar antes de uso comercial.',
    cifra: '60,1 AP',
    cifraNota: 'en COCO, el primer modelo real-time en superar 60',
    detalle: 'La variante L llega a 56,5 AP en 6,8 ms sobre una T4 con TensorRT FP16. Backbone DINOv2, diseñado explícitamente para fine-tuning.',
    obs: 'ICLR 2026',
  },
  {
    tarea: 'Voz sintética',
    modelo: 'Chatterbox Multilingual',
    autor: 'Resemble AI',
    licencia: 'MIT',
    cifra: '23 idiomas',
    cifraNota: 'clonación zero-shot con 10 s de referencia',
    detalle: 'Solo 0,5 B de parámetros. Conserva timbre y acento al cruzar de idioma. Primer TTS abierto con control de exageración emocional. Marca de agua PerTh embebida en generación: imperceptible, sobrevive al re-encoding y es verificable.',
    obs: '2026',
    virtud: 'La marca de agua es un argumento de trazabilidad ética que un organismo público sabe leer.',
  },
  {
    tarea: 'Transcripción',
    modelo: 'Parakeet TDT 0.6B v3',
    autor: 'NVIDIA',
    licencia: 'abierto',
    cifra: '6,32 % WER',
    cifraNota: 'en inglés, contra 7,83 % de Whisper large-v3',
    detalle: 'Cerca de 60× tiempo real en Apple Silicon, y entre 25 y 30 veces más rápido que Whisper sobre la misma GPU NVIDIA. Cubre 25 idiomas europeos.',
    obs: '2026',
    alternativa: 'Whisper large-v3-turbo cuando hacen falta las ~100 lenguas: 6× más rápido que large-v3 por recortar el decoder de 32 capas a 4.',
  },
  {
    tarea: 'Series temporales',
    modelo: 'TimesFM 2.5',
    autor: 'Google Research',
    licencia: 'Apache 2.0',
    licenciaAlerta: 'La 3.0 agrega multivariante nativo pero sus pesos son NO COMERCIALES. Para producción, quedarse en la 2.5.',
    cifra: '#1 GIFT-Eval',
    cifraNota: 'sobre 28 datasets, con 200 M de parámetros',
    detalle: 'Contexto de 16.000 pasos con la mitad de parámetros que la 2.0. Preentrenado sobre ~100 mil millones de puntos temporales. El cabezal de cuantiles entrega intervalos de predicción sin trabajo extra.',
    obs: 'sep 2025',
  },
];

/* ── CASOS DE USO ────────────────────────────────────────────── */
const CASOS = [
  {
    id: 'camara',
    titulo: 'La cámara que ve y razona',
    stack: ['YOLOv10-M (ONNX)', 'Qwen3-VL 2B (GGUF Q4_K_M)'],
    huella: '~1,5 GB en memoria',
    que: 'Detección rápida de cajas para personas, vehículos, animales y bultos; encima, un modelo de visión que describe la escena y emite un veredicto NORMAL o ALERTA.',
    porque: 'Los frames nunca salen del equipo. No hay stream que interceptar ni biblioteca en la nube de lo que pasa en tu planta.',
    precedente: 'QVAC de Tether tiene esto publicado y funcionando. Descarga ~2 GB la primera vez y después opera sin conexión.',
    esPropio: false,
  },
  {
    id: 'cinta',
    titulo: 'Control de calidad en cinta',
    stack: ['RF-DETR fine-tuneado'],
    huella: 'una GPU de entrada alcanza',
    que: 'Detectar desperfectos en fruta sobre una cinta transportadora, a la velocidad de la línea.',
    porque: '6,8 ms de inferencia da margen de sobra frente a la cadencia de una cinta real. Y el dataset de defectos es propio: no hay API que lo conozca.',
    precedente: 'RF-DETR está diseñado explícitamente para fine-tuning; RF100-VL es su benchmark de adaptación a dominio.',
    esPropio: false,
  },
  {
    id: 'sala',
    titulo: 'Sala de reunión multilingüe',
    stack: ['Parakeet o Whisper', 'traducción', 'Chatterbox'],
    huella: 'cabe en un equipo de escritorio',
    que: 'Cada participante escucha a los demás en su propio idioma, con la voz clonada de quien habla en vez de una voz robótica genérica.',
    porque: 'La latencia de ida y vuelta a la nube arruina una conversación. Y el contenido de una reunión de directorio no debería salir del edificio.',
    precedente: 'Los tres componentes están probados por separado. La integración es el trabajo — y es donde está el aporte.',
    esPropio: false,
  },
  {
    id: 'series',
    titulo: 'Demanda y mantenimiento predictivo',
    stack: ['TimesFM 2.5'],
    huella: '200 M de parámetros',
    que: 'Pronóstico sobre series propias sin entrenar nada: zero-shot, con intervalos de predicción incluidos.',
    porque: 'Los datos de producción de una empresa son exactamente lo que no querés subir a un tercero.',
    precedente: '#1 en GIFT-Eval sobre 28 datasets, sin entrenamiento previo.',
    esPropio: false,
  },
];

/* ── ECONOMÍA ────────────────────────────────────────────────── */
const ECONOMIA = {
  breakeven: { min: 5, max: 15, unidad: 'M tokens/día' },
  gastoUmbral: { min: 500, max: 700, payback: '18–24 meses' },
  equipo10: { costo: [2500, 7500], payback: '3–5 meses' },
  electricidad: { plena: 30, real: 9, nota: 'USD/mes, tarifas EE.UU., al 100 % y al 30 % de utilización' },
  costoOculto: { horas: 20, valor: 2000, nota: 'setup y mantenimiento antes del primer dólar ahorrado' },
  contraHonesto: 'Contra proveedores commodity que sirven estos mismos modelos abiertos por menos de USD 1 por millón de tokens, el hardware local NO gana en costo puro. Gana en privacidad, latencia, soberanía del dato y operación sin conexión. Presentarlo de otra manera ante alguien que va a correr el número es perder la sala.',
};

/* ── URUGUAY ─────────────────────────────────────────────────── */
const URUGUAY = {
  estrategia: {
    nombre: 'Estrategia Nacional de Inteligencia Artificial 2024–2030',
    organismo: 'AGESIC',
    mandato: 'art. 74 de la Ley 20.212 (6 nov 2023)',
    cita: 'fortalecimiento de la soberanía',
    participacion: '+300 personas, +40 instituciones estatales, 45 organizaciones privadas, 11 de sociedad civil',
  },
  leyes: [
    { num: '18.331', fecha: '11 ago 2008', que: 'Protección de datos personales', porque: 'Restringe la transferencia internacional de datos personales. La inferencia local es la arquitectura que directamente evita el problema.' },
    { num: '18.381', fecha: '17 oct 2008', que: 'Acceso a la información pública', porque: 'Marco de referencia de la Estrategia Nacional.' },
  ],
  importacion: {
    iva: 22,
    consular: 5,
    arancel: [0, 35],
    arancelNota: 'Depende de la posición NCM. FALTA: confirmar la posición exacta con la Dirección Nacional de Aduanas antes de presupuestar.',
    franquicia: 800,
    ejemplo: { fob: 4000, estimado: [5200, 5500], nota: 'solo con IVA y tasa consular, antes de arancel, flete y despachante' },
  },
  electricidad: {
    estructura: 'cargo fijo (exento de IVA) + energía + potencia contratada, con IVA 22 % sobre energía y potencia',
    falta: 'FALTA: tarifa industrial exacta en UYU/kWh 2026. Pedirla a UTE antes de poner un número en el presupuesto.',
  },
  instrumento: {
    organismo: 'ANII',
    nombre: 'Implementación de la Innovación',
    porcentaje: 70,
    tope: 4000000,
    topeMoneda: 'UYU',
    topeUsdAprox: 100000,
    tcNota: 'a ~40 UYU/USD — verificar el tipo de cambio del día',
    topeAmpliado: 5000000,
    condiciones: [
      'si el proyecto contribuye a mitigación o adaptación al cambio climático',
      'si hay asociación entre empresa nacional y extranjera',
    ],
    duracion: '18 meses',
    modalidad: 'postulación permanente, cierre sujeto a disponibilidad de fondos',
  },
};

/* ── LO QUE ESTE DECK NO AFIRMA ──────────────────────────────── */
const AUSENCIAS = [
  'Clientes, pilotos, cartas de intención o acuerdos firmados',
  'Ingresos, proyecciones validadas o pipeline comercial',
  'Testimonios o casos de éxito propios',
  'Benchmarks corridos por este equipo — los del plano son de terceros y están citados como tales',
  'Fotografías propias de una instalación en operación',
  'Equipo fundador, CVs o capacidades declaradas',
  'Presupuesto detallado o cronograma de hitos',
  'Una sociedad constituida',
];
