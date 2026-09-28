/* ═══════════════════════════════════════════════════════════════
   EL CEREBRO — portada
   Nube de puntos con forma de cerebro y pulsos sinápticos viajando
   por sus aristas. Todo procedural: dos hemisferios deformados con
   ruido para los surcos, sin modelo externo, sin red.
   Corre solo mientras la portada está activa.
   ═══════════════════════════════════════════════════════════════ */

const CEREBRO = (() => {
  let renderer, scene, camera, grupo, puntos, lineas, pulsos;
  let raf = null, t0 = 0, activo = false, listo = false;
  let host;
  /* 'portada': todo encendido. 'expertos': el cerebro está dividido en
     regiones y solo se encienden dos o tres por turno — la analogía de
     Mixture of Experts: el modelo es enorme, pero para cada tarea activa
     apenas la parte que hace falta. */
  let modo = 'portada';
  let regiones = null;
  /* 'chip': el cerebro chico gira sobre un chip; del chip salen señales
     por las pistas y sube una columna de partículas hacia el cerebro. */
  let chip = null;       // { grupo, senales, trazas, columna }
  /* Encuadre del cerebro por modo: escala base y posición. */
  const ENCUADRE = {
    portada:  { escala: 1.18, pos: [1.22, -0.10, 0] },
    expertos: { escala: 1.18, pos: [1.22, -0.10, 0] },
    chip:     { escala: 0.58, pos: [1.42,  0.62, 0] },
  };   // { de: Uint8Array por vértice, listas: [[idx...]], base: Float32Array, factor: Float32Array, activas: Set }

  /* ── Ruido simplex 3D (Gustavson), compacto ──────────────────── */
  const ruido3 = (() => {
    const G = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    const p = new Uint8Array(512);
    let s = 1337;
    const base = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    const dot = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;
    const F3 = 1 / 3, G3 = 1 / 6;
    return (xin, yin, zin) => {
      const sk = (xin + yin + zin) * F3;
      const i = Math.floor(xin + sk), j = Math.floor(yin + sk), k = Math.floor(zin + sk);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      const g0 = G[p[ii + p[jj + p[kk]]] % 12];
      const g1 = G[p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12];
      const g2 = G[p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12];
      const g3 = G[p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12];
      let n = 0, tt;
      tt = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (tt > 0) { tt *= tt; n += tt * tt * dot(g0, x0, y0, z0); }
      tt = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (tt > 0) { tt *= tt; n += tt * tt * dot(g1, x1, y1, z1); }
      tt = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (tt > 0) { tt *= tt; n += tt * tt * dot(g2, x2, y2, z2); }
      tt = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (tt > 0) { tt *= tt; n += tt * tt * dot(g3, x3, y3, z3); }
      return 32 * n;
    };
  })();

  /* ── Forma del cerebro ───────────────────────────────────────
     Elipsoide alargado hacia adelante, cisura longitudinal arriba,
     dos hemisferios apenas separados, y surcos por ruido en cresta
     desplazando cada vértice a lo largo de su normal.               */
  function deformar(geo) {
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    /* Cresta brillante, surco apagado: es lo que vuelve legibles las
       circunvoluciones. Sin esto todos los puntos brillan igual y el
       relieve desaparece en la proyección. */
    const col = new Float32Array(pos.count * 3);
    const relieve = new Float32Array(pos.count);
    const base = new THREE.Color(0x2bd9c4);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);

      // elipsoide: ancho x, alto y, largo z
      v.x *= 1.00; v.y *= 0.82; v.z *= 1.22;

      // cisura longitudinal: hundir la línea media en la mitad superior
      const cis = Math.exp(-(v.x * v.x) / (2 * 0.10 * 0.10));
      if (v.y > -0.15) v.y -= 0.30 * cis * Math.max(0, (v.y + 0.15));

      // hemisferios apenas separados
      v.x += Math.sign(v.x) * 0.06;

      // base más plana, frente algo más estrecho (lóbulos frontales)
      if (v.y < 0) v.y *= 0.86;
      if (v.z > 0) v.x *= 1 - 0.10 * v.z;

      // surcos: ruido en cresta en tres octavas, alargado a lo largo
      // del eje z para que las circunvoluciones corran como en un
      // cerebro y no como un ruido isótropo
      const r1 = 1 - Math.abs(ruido3(v.x * 3.6, v.y * 3.6, v.z * 2.4));
      const r2 = 1 - Math.abs(ruido3(v.x * 7.8 + 4.1, v.y * 7.8, v.z * 5.2 - 2.3));
      const r3 = 1 - Math.abs(ruido3(v.x * 15 + 9.7, v.y * 15 - 3.3, v.z * 10 + 1.1));
      const d = 0.11 * r1 + 0.05 * r2 + 0.018 * r3 - 0.09;
      v.addScaledVector(n, d);

      pos.setXYZ(i, v.x, v.y, v.z);

      // relieve normalizado a [0,1] → brillo entre 0.30 y 1.0
      const t = Math.min(1, Math.max(0, (d + 0.09) / 0.178));
      const b = 0.30 + 0.70 * t * t;
      relieve[i] = b;
      col[i * 3] = base.r * b; col[i * 3 + 1] = base.g * b; col[i * 3 + 2] = base.b * b;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.userData.colorBase = Float32Array.from(col);
    geo.userData.relieve = relieve;
    geo.computeVertexNormals();
  }

  /* ── Indexar la geometría ────────────────────────────────────
     IcosahedronGeometry viene sin índice: cada triángulo trae sus
     tres vértices propios, así que dos caras vecinas no comparten
     ninguno y no hay aristas por las que un pulso pueda viajar.
     Fusiono por posición y reconstruyo el índice.                   */
  function indexar(geo) {
    const src = geo.attributes.position;
    const clave = new Map();
    const pos = [];
    const idx = new Uint32Array(src.count);
    for (let i = 0; i < src.count; i++) {
      const x = src.getX(i), y = src.getY(i), z = src.getZ(i);
      const k = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
      let id = clave.get(k);
      if (id === undefined) { id = pos.length / 3; clave.set(k, id); pos.push(x, y, z); }
      idx[i] = id;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    return g;
  }

  /* ── Adyacencia para que los pulsos viajen por aristas reales ── */
  function adyacencia(geo) {
    const idx = geo.index.array;
    const ady = Array.from({ length: geo.attributes.position.count }, () => []);
    const vistas = new Set();
    const arista = (a, b) => {
      const k = a < b ? a * 65536 + b : b * 65536 + a;
      if (vistas.has(k)) return;
      vistas.add(k);
      ady[a].push(b); ady[b].push(a);
    };
    for (let i = 0; i < idx.length; i += 3) {
      arista(idx[i], idx[i + 1]); arista(idx[i + 1], idx[i + 2]); arista(idx[i + 2], idx[i]);
    }
    return ady;
  }

  /* ── Regiones ────────────────────────────────────────────────
     Siete lóbulos, por semilla más cercana. No es anatomía: es una
     partición que se vea como «partes de un cerebro» al encenderse. */
  function particionar(geo) {
    const P = geo.attributes.position;
    const semillas = [
      [-0.55, 0.45, 0.75], [0.55, 0.45, 0.75],     // frontales
      [-0.75, 0.55, -0.1], [0.75, 0.55, -0.1],     // parietales
      [-0.85, -0.15, 0.25], [0.85, -0.15, 0.25],   // temporales
      [0.0, 0.35, -0.95],                          // occipital
    ].map((v) => new THREE.Vector3(...v).normalize());
    const de = new Uint8Array(P.count);
    const listas = semillas.map(() => []);
    const v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).normalize();
      let mejor = 0, md = -2;
      for (let k = 0; k < semillas.length; k++) {
        const d = v.dot(semillas[k]);
        if (d > md) { md = d; mejor = k; }
      }
      de[i] = mejor; listas[mejor].push(i);
    }
    /* Cada turno enciende sus regiones de un color distinto: rojo,
       amarillo, cian, violeta, verde, naranja, blanco. Las apagadas se
       quedan en el cian base, muy tenue. */
    const paleta = [0xE0245E, 0xFFB020, 0x2BD9C4, 0x8B6CFF, 0x6EE07A, 0xFF7A1A, 0xE8EDF2]
      .map((h) => new THREE.Color(h));
    return {
      de, listas, paleta,
      base: geo.userData.colorBase,
      relieve: geo.userData.relieve,
      cur: Float32Array.from(geo.userData.colorBase),
      activas: new Set([0, 1]),
      turno: 0, reloj: 0, DURACION: 3.0,
      /* Secuencia de turnos: de a dos o tres regiones, sin repetir la
         misma pareja seguida, recorriendo todo el cerebro. */
      secuencia: [[0, 1], [3, 6], [4, 2], [1, 5], [6, 0, 4], [2, 3], [5, 1], [0, 6], [4, 5, 2]],
    };
  }

  /* Sprite redondo con halo suave. Sin esto los puntos son cuadrados
     y el conjunto lee como grilla, no como tejido. */
  function sprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0.00, 'rgba(255,255,255,1)');
    rg.addColorStop(0.28, 'rgba(255,255,255,0.85)');
    rg.addColorStop(0.60, 'rgba(255,255,255,0.18)');
    rg.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function construir() {
    const W = 1600, H = 900;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    /* Niebla del color del fondo: el lado lejano del cerebro se hunde
       y el volumen aparece sin necesidad de luces. */
    scene.fog = new THREE.Fog(0x0b0e11, 5.0, 8.0);
    camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 50);
    camera.position.set(0, 1.35, 5.6);
    camera.lookAt(0, 0, 0);

    grupo = new THREE.Group();
    /* El titular vive en el tercio izquierdo del escenario; el cerebro
       ocupa los dos tercios derechos, como lo hacía el plano. */
    grupo.position.set(1.22, -0.10, 0);
    grupo.scale.setScalar(1.18);
    scene.add(grupo);

    /* detail es subdivisión LINEAL en three: caras = 20·(detail+1)². Con 36
       salen ~27 k triángulos y ~13,7 k vértices únicos: densidad de tejido. */
    const geo = indexar(new THREE.IcosahedronGeometry(1.0, 36));
    deformar(geo);
    const tex = sprite();

    // ── nube de puntos ──
    const matPuntos = new THREE.PointsMaterial({
      vertexColors: true, size: 0.046, sizeAttenuation: true, map: tex,
      transparent: true, opacity: 0.85, alphaTest: 0.02,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    puntos = new THREE.Points(geo, matPuntos);
    grupo.add(puntos);

    // ── malla de aristas: casi invisible. Con más presencia el
    //    icosaedro se delata y todo lee como cúpula geodésica. ──
    const wire = new THREE.WireframeGeometry(geo);
    lineas = new THREE.LineSegments(wire, new THREE.LineBasicMaterial({
      color: 0x17766b, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    grupo.add(lineas);

    // ── pulsos sinápticos + la arista que cada uno recorre ──
    const ady = adyacencia(geo);
    const N = 220;
    const posP = new Float32Array(N * 3);
    const geoP = new THREE.BufferGeometry();
    geoP.setAttribute('position', new THREE.BufferAttribute(posP, 3));
    const matP = new THREE.PointsMaterial({
      color: 0xffb020, size: 0.12, sizeAttenuation: true, map: tex,
      transparent: true, opacity: 0.95, alphaTest: 0.02,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    pulsos = new THREE.Points(geoP, matP);
    grupo.add(pulsos);

    const posS = new Float32Array(N * 6);
    const geoS = new THREE.BufferGeometry();
    geoS.setAttribute('position', new THREE.BufferAttribute(posS, 3));
    const sinapsis = new THREE.LineSegments(geoS, new THREE.LineBasicMaterial({
      color: 0xffb020, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    grupo.add(sinapsis);
    pulsos.userData.posS = posS;
    pulsos.userData.sinapsis = sinapsis;

    const P = geo.attributes.position;
    const estado = [];
    for (let i = 0; i < N; i++) {
      const a = Math.floor(Math.random() * P.count);
      const b = ady[a][Math.floor(Math.random() * ady[a].length)];
      estado.push({ a, b, f: Math.random(), vel: 1.4 + Math.random() * 1.6 });
    }
    Object.assign(pulsos.userData, { estado, ady, P, posP });
    regiones = particionar(geo);
    chip = construirChip(tex);
  }

  function paso(dt) {
    const { estado, ady, P, posP, posS, sinapsis } = pulsos.userData;
    for (let i = 0; i < estado.length; i++) {
      const e = estado[i];
      e.f += dt * e.vel;
      while (e.f >= 1) {
        e.f -= 1;
        e.a = e.b;
        if (modo === 'expertos' && !regiones.activas.has(regiones.de[e.a])) {
          /* Salió de una región encendida: reaparece dentro de una. */
          const act = [...regiones.activas];
          const lista = regiones.listas[act[Math.floor(Math.random() * act.length)]];
          e.a = lista[Math.floor(Math.random() * lista.length)];
        }
        const vecinos = ady[e.a];
        e.b = vecinos[Math.floor(Math.random() * vecinos.length)];
      }
      const ax = P.getX(e.a), ay = P.getY(e.a), az = P.getZ(e.a);
      const bx = P.getX(e.b), by = P.getY(e.b), bz = P.getZ(e.b);
      posP[i * 3] = ax + (bx - ax) * e.f;
      posP[i * 3 + 1] = ay + (by - ay) * e.f;
      posP[i * 3 + 2] = az + (bz - az) * e.f;
      // la arista que está recorriendo, encendida
      posS[i * 6] = ax; posS[i * 6 + 1] = ay; posS[i * 6 + 2] = az;
      posS[i * 6 + 3] = bx; posS[i * 6 + 4] = by; posS[i * 6 + 5] = bz;
    }
    pulsos.geometry.attributes.position.needsUpdate = true;
    sinapsis.geometry.attributes.position.needsUpdate = true;
  }

  /* Turnos: cada ~1,9 s cambia el conjunto de regiones encendidas.
     El brillo de cada vértice sigue a su región con salida exponencial,
     así que una región no «aparece»: se enciende. */
  const APAGADO = 0.13;
  function iluminar(dt) {
    const R = regiones;
    const col = puntos.geometry.attributes.color;
    const arr = col.array;
    if (modo === 'expertos') {
      R.reloj += dt;
      if (R.reloj >= R.DURACION) {
        R.reloj = 0;
        R.turno = (R.turno + 1) % R.secuencia.length;
        R.activas = new Set(R.secuencia[R.turno]);
      }
    }
    const k = 1 - Math.exp(-dt * 4.5);
    const c = R.paleta[R.turno % R.paleta.length];
    const cur = R.cur, base = R.base, rel = R.relieve;
    for (let i = 0; i < rel.length; i++) {
      let tr, tg, tb;
      if (modo !== 'expertos') {
        tr = base[i * 3]; tg = base[i * 3 + 1]; tb = base[i * 3 + 2];
      } else if (R.activas.has(R.de[i])) {
        /* Encendida: el color del turno, modulado por el relieve para
           que los surcos sigan leyéndose. */
        const b = rel[i];
        tr = c.r * b; tg = c.g * b; tb = c.b * b;
      } else {
        tr = base[i * 3] * APAGADO; tg = base[i * 3 + 1] * APAGADO; tb = base[i * 3 + 2] * APAGADO;
      }
      cur[i * 3]     += (tr - cur[i * 3]) * k;
      cur[i * 3 + 1] += (tg - cur[i * 3 + 1]) * k;
      cur[i * 3 + 2] += (tb - cur[i * 3 + 2]) * k;
      arr[i * 3] = cur[i * 3]; arr[i * 3 + 1] = cur[i * 3 + 1]; arr[i * 3 + 2] = cur[i * 3 + 2];
    }
    col.needsUpdate = true;
  }

  /* ── El chip ──────────────────────────────────────────────────
     Sustrato, die, pines y pistas: todo geometría básica con aristas
     en hairline, en el lenguaje del plano. Sin luces: materiales
     básicos y aditivos, como el resto de la escena.                 */
  function construirChip(tex) {
    const g = new THREE.Group();
    g.position.set(1.42, -0.55, 0);
    g.scale.setScalar(0.86);
    g.visible = false;

    const base = (col) => new THREE.MeshBasicMaterial({ color: col });
    const arista = (col, op) => new THREE.LineBasicMaterial({
      color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false,
    });

    // sustrato
    const sub = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.10, 1.7), base(0x11161B));
    g.add(sub);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(sub.geometry), arista(0x2bd9c4, 0.55)));

    // die, con marco cian
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.07, 0.74), base(0x070A0C));
    die.position.y = 0.085;
    g.add(die);
    const dieBorde = new THREE.LineSegments(new THREE.EdgesGeometry(die.geometry), arista(0x2bd9c4, 0.9));
    dieBorde.position.copy(die.position);
    g.add(dieBorde);

    // retícula del die, como el papel milimetrado del plano
    const ret = [];
    for (let i = -3; i <= 3; i++) {
      const t = i * 0.105;
      ret.push(-0.36, 0.122, t, 0.36, 0.122, t, t, 0.122, -0.36, t, 0.122, 0.36);
    }
    const retGeo = new THREE.BufferGeometry();
    retGeo.setAttribute('position', new THREE.Float32BufferAttribute(ret, 3));
    g.add(new THREE.LineSegments(retGeo, arista(0x17766b, 0.7)));

    // pines: 11 por lado, y de cada pin sale una pista con un quiebre
    const pinMat = base(0x566575);
    const pinGeo = new THREE.BoxGeometry(0.05, 0.035, 0.12);
    const trazas = [];
    const puntosTraza = [];
    const lados = [
      { dir: [1, 0, 0], eje: 'z' }, { dir: [-1, 0, 0], eje: 'z' },
      { dir: [0, 0, 1], eje: 'x' }, { dir: [0, 0, -1], eje: 'x' },
    ];
    for (const l of lados) {
      for (let i = 0; i < 11; i++) {
        const t = -0.6 + i * 0.12;
        const pin = new THREE.Mesh(pinGeo, pinMat);
        if (l.eje === 'z') { pin.position.set(0.85 * l.dir[0], 0, t); }
        else { pin.position.set(t, 0, 0.85 * l.dir[2]); pin.rotation.y = Math.PI / 2; }
        g.add(pin);

        // pista: recta hacia afuera, quiebre a 45°, y sigue
        const p0 = pin.position.clone(); p0.y = -0.05;
        const d = new THREE.Vector3(...l.dir);
        /* Las pistas que van hacia la izquierda (−x) se acortan: en
           perspectiva se metían debajo de la columna de texto. */
        const k = l.dir[0] < 0 ? 0.45 : 1;
        const p1 = p0.clone().addScaledVector(d, (0.35 + Math.random() * 0.25) * k);
        const lateral = l.eje === 'z' ? new THREE.Vector3(0, 0, Math.sign(t || 1)) : new THREE.Vector3(Math.sign(t || 1), 0, 0);
        const p2 = p1.clone().addScaledVector(d, 0.55 * k).addScaledVector(lateral, 0.35 + Math.random() * 0.3);
        const p3 = p2.clone().addScaledVector(d, (0.5 + Math.random() * 0.6) * k);
        trazas.push([p0, p1, p2, p3]);
        puntosTraza.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
      }
    }
    const trGeo = new THREE.BufferGeometry();
    trGeo.setAttribute('position', new THREE.Float32BufferAttribute(puntosTraza, 3));
    g.add(new THREE.LineSegments(trGeo, arista(0x17766b, 0.5)));

    // señales: una por pista, en ámbar, que salen del chip y se pierden
    const N = trazas.length;
    const sPos = new Float32Array(N * 3);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    const senales = new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0xffb020, size: 0.09, sizeAttenuation: true, map: tex,
      transparent: true, opacity: 0.95, alphaTest: 0.02,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    senales.userData.f = Float32Array.from({ length: N }, () => Math.random());
    senales.userData.vel = Float32Array.from({ length: N }, () => 0.45 + Math.random() * 0.5);
    g.add(senales);

    // columna: partículas que suben del die al cerebro
    const M = 90;
    const cPos = new Float32Array(M * 3);
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
    const columna = new THREE.Points(cGeo, new THREE.PointsMaterial({
      color: 0x2bd9c4, size: 0.05, sizeAttenuation: true, map: tex,
      transparent: true, opacity: 0.7, alphaTest: 0.02,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    columna.userData.f = Float32Array.from({ length: M }, () => Math.random());
    columna.userData.r = Float32Array.from({ length: M }, () => 0.05 + Math.random() * 0.28);
    columna.userData.a = Float32Array.from({ length: M }, () => Math.random() * Math.PI * 2);
    g.add(columna);

    scene.add(g);
    return { grupo: g, senales, trazas, columna };
  }

  /* Punto sobre una polilínea a fracción f ∈ [0,1]. */
  function sobreTraza(tr, f, out) {
    const segs = tr.length - 1;
    const u = f * segs;
    const i = Math.min(segs - 1, Math.floor(u));
    return out.copy(tr[i]).lerp(tr[i + 1], u - i);
  }

  const _v = new THREE.Vector3();
  function pasoChip(dt) {
    const { senales, trazas, columna } = chip;
    const sp = senales.geometry.attributes.position.array;
    const sf = senales.userData.f, sv = senales.userData.vel;
    for (let i = 0; i < trazas.length; i++) {
      sf[i] += dt * sv[i];
      if (sf[i] >= 1) sf[i] -= 1 + Math.random() * 1.5;   // pausa antes de la próxima
      const f = Math.max(0, sf[i]);
      sobreTraza(trazas[i], f, _v);
      sp[i * 3] = _v.x; sp[i * 3 + 1] = _v.y + 0.012; sp[i * 3 + 2] = _v.z;
    }
    senales.geometry.attributes.position.needsUpdate = true;

    const cp = columna.geometry.attributes.position.array;
    const cf = columna.userData.f, cr = columna.userData.r, ca = columna.userData.a;
    for (let i = 0; i < cf.length; i++) {
      cf[i] += dt * 0.28;
      if (cf[i] >= 1) cf[i] -= 1;
      const y = 0.13 + cf[i] * 0.95;                 // del die a la base del cerebro
      const r = cr[i] * (1 - cf[i] * 0.6);            // se estrecha al subir
      ca[i] += dt * 0.6;
      cp[i * 3] = Math.cos(ca[i]) * r; cp[i * 3 + 1] = y; cp[i * 3 + 2] = Math.sin(ca[i]) * r;
    }
    columna.geometry.attributes.position.needsUpdate = true;
  }

  let ultimo = 0;
  function cuadro(ts) {
    if (!activo) return;
    raf = requestAnimationFrame(cuadro);
    if (!t0) { t0 = ts; ultimo = ts; }
    const t = (ts - t0) / 1000;
    /* Dos deltas: el físico se topa en 50 ms para que los pulsos no
       salten; el de reloj sigue el tiempo real (con techo de medio
       dos segundos para volver de una pestaña en segundo plano). Si la
       máquina rinde pocos cuadros, los turnos igual cambian a tiempo. */
    const dtReal = Math.min(2.0, (ts - ultimo) / 1000);
    const dt = Math.min(0.05, dtReal);
    ultimo = ts;

    const enc = ENCUADRE[modo] || ENCUADRE.portada;
    grupo.rotation.y = -0.65 + t * (modo === 'chip' ? 0.35 : 0.10);
    grupo.rotation.x = 0.10 + Math.sin(t * 0.35) * 0.04;
    const resp = enc.escala * (1 + Math.sin(t * 0.9) * 0.012);
    grupo.scale.setScalar(resp);
    /* La posición sigue al encuadre con salida exponencial, así que
       cambiar de slide mueve el cerebro en vez de teletransportarlo. */
    grupo.position.lerp(_v.set(enc.pos[0], enc.pos[1] + (modo === 'chip' ? Math.sin(t * 0.8) * 0.03 : 0), enc.pos[2]), 1 - Math.exp(-dtReal * 3));

    iluminar(dtReal);
    paso(dt);
    if (modo === 'chip') pasoChip(dt);
    renderer.render(scene, camera);
  }

  const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    montar(el) { host = el; },
    mostrar(m = 'portada') {
      if (!host || typeof THREE === 'undefined') return;
      if (!listo) { construir(); listo = true; }
      if (m !== modo) {
        modo = m;
        if (regiones) { regiones.reloj = 0; regiones.turno = 0; regiones.activas = new Set(regiones.secuencia[0]); }
        /* Los pulsos son ámbar sobre el cian de portada; sobre regiones
           que cambian de color van en blanco, que se lee sobre todas. */
        const cp = modo === 'expertos' ? 0xffffff : 0xffb020;
        pulsos.material.color.setHex(cp);
        pulsos.userData.sinapsis.material.color.setHex(cp);
        if (chip) chip.grupo.visible = (modo === 'chip');
      }
      host.dataset.on = 'true';
      if (reducido) {
        const enc = ENCUADRE[modo] || ENCUADRE.portada;
        grupo.position.set(...enc.pos); grupo.scale.setScalar(enc.escala);
        iluminar(1); paso(0); if (modo === 'chip') pasoChip(0);
        renderer.render(scene, camera); return;
      }
      if (activo) return;
      activo = true; t0 = 0;
      raf = requestAnimationFrame(cuadro);
    },
    /* Solo lectura, para verificar desde afuera qué está encendido. */
    estado() {
      if (!regiones) return null;
      const col = puntos.geometry.attributes.color.array;
      const prom = regiones.listas.map((lista) => {
        let acc = 0;
        for (const i of lista) acc += col[i * 3 + 1];
        return +(acc / lista.length).toFixed(3);
      });
      return { modo, turno: regiones.turno, activas: [...regiones.activas],
        color: '#' + regiones.paleta[regiones.turno % regiones.paleta.length].getHexString(),
        brilloPorRegion: prom };
    },
    ocultar() {
      if (!host) return;
      host.dataset.on = 'false';
      activo = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    },
  };
})();
