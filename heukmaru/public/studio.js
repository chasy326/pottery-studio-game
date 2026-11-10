/* 흙마루 v3 — 물레 작업실 (아이소메트릭 3D 미니어처 방)
   사진 배경 없이 모든 공간·가구·캐릭터를 3D로 만든다. */
(() => {
'use strict';
const THREE = window.THREE, $ = s => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- 렌더러 · 장면 ---------- */
const mount = $('#world');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2b2724');

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const ISO = V(1, 1.08, 1.22).normalize();   // 오른쪽 앞 위에서 내려다보는 시점
let viewSize = 8.2, viewTarget = 8.2;
const camFocus = V(0, 0.6, 0), camFocusTarget = V(0, 0.6, 0);
function fitCamera() {
  const a = innerWidth / innerHeight;
  const base = a < 0.8 ? viewSize * 1.35 : viewSize;      // 세로 화면은 조금 더 멀리
  camera.left = -base * a / 2; camera.right = base * a / 2;
  camera.top = base / 2; camera.bottom = -base / 2;
  camera.updateProjectionMatrix();
}

/* ---------- 조명 ---------- */
scene.add(new THREE.HemisphereLight('#fff1dc', '#5a4a3c', 1.0));
const sun = new THREE.DirectionalLight('#ffe2b8', 2.1);
sun.position.set(4, 9, -3);          // 뒤쪽 창에서 들어오는 햇빛
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun);
const fillLight = new THREE.DirectionalLight('#c9d6e8', 0.35);
fillLight.position.set(6, 5, 8); scene.add(fillLight);

/* ---------- 재질 ---------- */
const matCache = {};
function M(color, rough = 0.85, metal = 0, extra = {}) {
  const key = color + rough + metal + JSON.stringify(extra);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true, ...extra });
  return matCache[key];
}
const C = {
  plaster: '#ece2d2', wainscot: '#a7a29a', wallCap: '#3a332e', wood: '#c99a64', woodDark: '#8f6a45',
  woodLight: '#dcb98a', metal: '#6f6e6b', metalLight: '#b9b6b0', panWhite: '#f2efe9', wheelGrey: '#8c8b88',
  clay: '#b88a62', clayWet: '#a77b56', terracotta: '#c0774f', cream: '#efe6d6', leaf: '#4f7a4a', leaf2: '#6a9a5c'
};

/* ---------- 도형 도우미 ---------- */
function add(parent, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast !== false; m.receiveShadow = true;
  parent.add(m); return m;
}
const box = (p, x, y, z, w, h, d, mat, o) => add(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
const cyl = (p, x, y, z, rt, rb, h, mat, seg = 24, o) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, o);
const sph = (p, x, y, z, r, mat, o) => add(p, new THREE.SphereGeometry(r, 20, 14), mat, x, y, z, o);
function lathePot(profile, h, mat, seg = 20) {           // profile: 반지름 배열 (아래→위)
  const pts = profile.map((r, i) => new THREE.Vector2(Math.max(0.004, r), i / (profile.length - 1) * h));
  const g = new THREE.LatheGeometry(pts, seg); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
const POT_SHAPES = [
  [0.02, 0.07, 0.085, 0.09, 0.088, 0.085],              // 컵
  [0.02, 0.06, 0.1, 0.12, 0.125, 0.12],                  // 사발
  [0.02, 0.06, 0.09, 0.1, 0.085, 0.055, 0.04, 0.045],    // 병
  [0.02, 0.08, 0.11, 0.1, 0.07, 0.06, 0.065],            // 항아리
  [0.03, 0.14, 0.15, 0.15]                               // 접시
];
const POT_HEIGHT = [0.13, 0.09, 0.22, 0.18, 0.035];
const GLAZES = ['#f1ece2', '#e6dccb', '#d9c8ab', '#9fb3a3', '#7f8e94', '#c8a58a', '#ebe5da', '#b9c4b6'];
let POT_TONE = null;     // 건조실·가마실: 유약 안 바른 흙색
function randPot(seed) {
  seed = Math.abs(Math.round(seed));
  const s = seed % POT_SHAPES.length, g = POT_TONE ? POT_TONE[seed % POT_TONE.length] : GLAZES[(seed * 7 + 3) % GLAZES.length];
  return lathePot(POT_SHAPES[s], POT_HEIGHT[s], M(g, 0.55));
}

/* ---------- 충돌체 ---------- */
let colliders = [];   // {type:'circle',x,z,r} | {type:'box',x0,x1,z0,z1}
const circleCol = (x, z, r) => colliders.push({ type: 'circle', x, z, r });
const boxCol = (x0, x1, z0, z1) => colliders.push({ type: 'box', x0, x1, z0, z1 });

/* ---------- 방 ---------- */
const ROOM = { x0: -5, x1: 5, z0: -4, z1: 4, h: 3.0 };
let room = new THREE.Group(); scene.add(room);

function tileTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#bdb8b0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const v = 180 + ((i * 3 + j * 5) % 4) * 4;
    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(i * 128 + 3, j * 128 + 3, 122, 122);
  }
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(90,80,70,${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 4);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 바닥 (두께가 보이는 미니어처 판)
const floor = new THREE.Mesh(new THREE.BoxGeometry(10.36, 0.24, 8.36),
  [M('#4a423b'), M('#4a423b'), new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.9 }), M('#4a423b'), M('#5a5049'), M('#5a5049')]);
floor.position.set(0, -0.12, 0); floor.receiveShadow = true; room.add(floor);

// 벽: 뒤(z0)와 왼쪽(x0)만 세워 안을 들여다보는 단면
const WT = 0.18;
function wall(x, z, w, d, len, along) {
  box(room, x, 0.45, z, w, 0.9, d, M(C.wainscot, 0.95));                  // 아래 회색 징두리
  box(room, x, 0.9 + (ROOM.h - 0.9) / 2, z, w, ROOM.h - 0.9, d, M(C.plaster, 0.95));
  box(room, x, ROOM.h + 0.03, z, w + 0.002, 0.06, d + 0.002, M(C.wallCap, 0.7));    // 위쪽 단면 띠
}
wall(0, ROOM.z0 - WT / 2, 10 + WT * 2, WT);                  // 뒷벽
wall(ROOM.x0 - WT / 2, 0, WT, 8);                            // 왼벽
boxCol(-6, 6, -5, ROOM.z0 + 0.05); boxCol(-6, ROOM.x0 + 0.05, -5, 5);

// 창문 (뒷벽 오른쪽): 밖 정원 + 햇살
function gardenTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 192); sky.addColorStop(0, '#cfe3e6'); sky.addColorStop(1, '#f3e8cf');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
  const greens = ['#6f9a63', '#86ad72', '#5c8455', '#9cbf83'];
  for (let i = 0; i < 26; i++) { g.fillStyle = greens[i % 4]; g.beginPath(); g.arc((i * 53) % 270, 120 + (i * 17) % 50, 22 + (i * 7) % 18, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
{
  const wx = 3.0, wy = 1.85, ww = 2.4, wh = 1.5, wz = ROOM.z0 + 0.005;
  add(room, new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: gardenTexture() }), wx, wy, wz, { cast: false });
  const f = M(C.woodDark, 0.7);
  box(room, wx, wy + wh / 2 + 0.05, wz + 0.04, ww + 0.2, 0.1, 0.1, f);
  box(room, wx, wy - wh / 2 - 0.05, wz + 0.09, ww + 0.3, 0.08, 0.2, f);
  for (const dx of [-ww / 2 - 0.05, 0, ww / 2 + 0.05]) box(room, wx + dx, wy, wz + 0.04, 0.08, wh, 0.08, f);
  box(room, wx, wy + 0.15, wz + 0.04, ww, 0.05, 0.05, f);
  // 바닥에 떨어지는 햇살 자국
  const patch = add(room, new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ color: '#ffe7b8', transparent: true, opacity: 0.22, depthWrite: false }), 2.6, 0.006, -1.9, { rx: -Math.PI / 2, cast: false });
  patch.rotation.z = -0.35;
}

/* ---------- 가구·소품 ---------- */
function shelfUnit(x, z, w, levels, depth = 0.42, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; room.add(g);
  const wood = M(C.wood, 0.8), post = M(C.woodDark, 0.8);
  const H = 0.35 + levels * 0.42;
  for (const px of [-w / 2, w / 2]) for (const pz of [-depth / 2 + 0.03, depth / 2 - 0.03]) box(g, px, H / 2, pz, 0.06, H, 0.06, post);
  let seed = Math.round(x * 13 + z * 7 + w * 5);
  for (let i = 0; i < levels; i++) {
    const y = 0.25 + i * 0.42;
    box(g, 0, y, 0, w + 0.06, 0.04, depth, wood);
    const n = Math.floor(w / 0.27);
    for (let k = 0; k < n; k++) {
      seed = (seed * 31 + 7) % 997;
      if (seed % 6 === 0) continue;                      // 비어 있는 칸도 조금
      const p = randPot(seed); p.position.set(-w / 2 + 0.17 + k * ((w - 0.3) / Math.max(1, n - 1)), y + 0.02, (seed % 3 - 1) * 0.05);
      g.add(p);
    }
  }
  return g;
}
function wheel(x, z, withClay = true) {
  // 물레: 회색 몸통 + 흰 물받이 + 회전판 + 페달. 앉는 사람은 -z 쪽에서 +z를 바라본다.
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, 0.17, 0, 0.42, 0.34, 0.42, M(C.wheelGrey, 0.75, 0.2));
  box(g, 0, 0.345, 0, 0.44, 0.02, 0.44, M('#7a7976', 0.7, 0.2));
  // 물받이 (바깥벽 + 바닥)
  const pan = new THREE.LatheGeometry([V(0.0, 0, 0), V(0.3, 0, 0), V(0.32, 0.02, 0), V(0.33, 0.13, 0), V(0.31, 0.135, 0), V(0.3, 0.02, 0), V(0.0, 0.02, 0)].map(v => new THREE.Vector2(v.x, v.y)), 32);
  const panMesh = add(g, pan, M(C.panWhite, 0.5, 0, { side: THREE.DoubleSide }), 0, 0.355, 0);
  const head = cyl(g, 0, 0.43, 0, 0.17, 0.17, 0.04, M('#5e5d5a', 0.5, 0.4), 28);
  box(g, 0.2, 0.03, -0.32, 0.12, 0.05, 0.2, M('#4c4b49', 0.6, 0.3));      // 페달
  let clay = null;
  if (withClay) { clay = lathePot([0.11, 0.116, 0.114, 0.104, 0.088, 0.066, 0.042, 0.018], 0.17, M(C.clayWet, 0.5, 0, { flatShading: false }), 40); clay.position.y = 0.45; g.add(clay); }
  circleCol(x, z, 0.4);
  return { g, head, clay, panMesh, seat: V(x, 0, z - 0.5) };
}
function stool(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  cyl(g, 0, 0.42, 0, 0.17, 0.16, 0.04, M(C.woodLight, 0.8), 24);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    add(g, new THREE.CylinderGeometry(0.018, 0.022, 0.42, 8), M(C.woodDark, 0.8), Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12, { rz: Math.cos(a) * 0.08, rx: -Math.sin(a) * 0.08 });
  }
  const ring = add(g, new THREE.TorusGeometry(0.15, 0.012, 6, 24), M(C.woodDark, 0.8), 0, 0.2, 0, { rx: Math.PI / 2 });   // 발 받침 링
  circleCol(x, z, 0.2);
  return g;
}
function table(x, z, w, d, h = 0.72) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, h - 0.03, 0, w, 0.06, d, M(C.wood, 0.75));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 0.08), (h - 0.06) / 2, sz * (d / 2 - 0.08), 0.07, h - 0.06, 0.07, M(C.woodDark, 0.8));
  box(g, 0, 0.18, 0, w - 0.2, 0.03, d - 0.2, M(C.woodLight, 0.8));          // 아래 선반
  boxCol(x - w / 2 - 0.05, x + w / 2 + 0.05, z - d / 2 - 0.05, z + d / 2 + 0.05);
  return g;
}
function bucket(x, z, color = '#f1eee8', h = 0.55, r = 0.2) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  cyl(g, 0, h / 2, 0, r, r * 0.92, h, M(color, 0.6), 20);
  cyl(g, 0, h + 0.02, 0, r + 0.015, r + 0.015, 0.04, M('#e3ded5', 0.6), 20);
  circleCol(x, z, r + 0.05); return g;
}
function plant(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); room.add(g);
  add(g, new THREE.CylinderGeometry(0.22, 0.16, 0.38, 16), M(C.terracotta, 0.85), 0, 0.19, 0);
  cyl(g, 0, 0.37, 0, 0.2, 0.2, 0.02, M('#5a4434', 1), 16);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, t = 0.35 + (i % 3) * 0.18;
    const stem = add(g, new THREE.CylinderGeometry(0.012, 0.012, t + 0.25, 5), M('#5d7d4c'), Math.cos(a) * 0.08, 0.38 + (t + 0.25) / 2, Math.sin(a) * 0.08, { rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3 });
    const leaf = add(g, new THREE.SphereGeometry(0.2, 10, 6), M(i % 2 ? C.leaf : C.leaf2, 0.8), Math.cos(a) * (0.22 + t * 0.35), 0.62 + t, Math.sin(a) * (0.22 + t * 0.35));
    leaf.scale.set(1, 0.18, 0.75); leaf.rotation.y = -a; leaf.rotation.z = 0.35;
  }
  circleCol(x, z, 0.3 * s); return g;
}
function pendant(x, z, y = 2.15) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, ROOM.h + 0.4 - y, 4), M('#2b2b2b'), 0, (ROOM.h + 0.4 + y) / 2, 0, { cast: false });
  add(g, new THREE.CylinderGeometry(0.06, 0.28, 0.2, 20, 1, true), M('#7d97a3', 0.5, 0.1, { side: THREE.DoubleSide }), 0, y, 0, { cast: false });
  add(g, new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe3a8' }), 0, y - 0.08, 0, { cast: false });
  return g;
}
function kiln(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) box(g, lx, 0.12, lz, 0.05, 0.24, 0.05, M('#3d3c3a', 0.6, 0.4));
  cyl(g, 0, 0.62, 0, 0.47, 0.47, 0.76, M('#cfd0cf', 0.3, 0.75), 40);
  cyl(g, 0, 0.62, 0, 0.476, 0.476, 0.03, M('#9a9893', 0.4, 0.6), 40);
  box(g, 0.32, 0.6, 0.36, 0.2, 0.26, 0.08, M('#3b3b3b', 0.5, 0.2), { ry: Math.PI / 4 });
  box(g, 0.34, 0.64, 0.39, 0.12, 0.05, 0.01, M('#7fd18b', 0.4, 0, { emissive: '#3c8a47' }), { ry: Math.PI / 4 });
  cyl(g, 0, 1.03, 0, 0.49, 0.49, 0.07, M('#e9e1d2', 0.8), 32);                  // 뚜껑 테
  cyl(g, 0, 1.075, 0, 0.36, 0.36, 0.03, M('#d8cdb9', 0.9), 32);
  box(g, 0, 0.62, 0.48, 0.18, 0.12, 0.03, M('#d9a441', 0.5));                  // 명판
  circleCol(x, z, 0.55); return g;
}
function sinkCounter(x, z, w) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, 0.42, 0, w, 0.84, 0.6, M('#e9e3d8', 0.8));
  box(g, 0, 0.87, 0, w + 0.04, 0.06, 0.64, M('#8f8b84', 0.6));                 // 콘크리트 상판
  box(g, -w / 4, 0.86, 0.02, 0.6, 0.05, 0.42, M('#55524e', 0.5));              // 개수대
  cyl(g, -w / 4, 1.05, -0.22, 0.02, 0.02, 0.35, M('#cfcfcf', 0.3, 0.8), 8);
  add(g, new THREE.TorusGeometry(0.1, 0.02, 6, 12, Math.PI), M('#cfcfcf', 0.3, 0.8), -w / 4, 1.22, -0.12, { ry: Math.PI / 2 });
  for (let i = 0; i < 3; i++) { const p = randPot(i * 5 + 2); p.position.set(w / 4 - 0.25 + i * 0.25, 0.9, 0); g.add(p); }
  box(g, w / 4, 0.95, 0.15, 0.14, 0.08, 0.1, M('#e6c35c', 0.9));               // 스펀지
  for (let i = 0; i < 3; i++) box(g, -w / 2 + 0.3 + i * (w - 0.6) / 2, 0.45, 0.305, 0.02, 0.6, 0.01, M('#cfc6b8', 0.8));
  boxCol(x - w / 2 - 0.05, x + w / 2 + 0.05, z - 0.35, z + 0.35); return g;
}
function pegboard(x, y, z, w, h) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = c.getContext('2d');
  t.fillStyle = '#d2ab7c'; t.fillRect(0, 0, 256, 128); t.fillStyle = '#9c7853';
  for (let i = 8; i < 256; i += 16) for (let j = 8; j < 128; j += 16) { t.beginPath(); t.arc(i, j, 2.2, 0, 7); t.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const b = add(room, new THREE.BoxGeometry(0.04, h, w), [M('#b98e5f'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), M('#b98e5f'), M('#b98e5f'), M('#b98e5f'), M('#b98e5f')], x, y, z);
  const tools = ['#3d3a37', '#8a6a4a', '#b7b3ac', '#3d3a37', '#c7a04a', '#8a6a4a', '#b7b3ac'];
  for (let i = 0; i < 7; i++) {
    const tz = z - w / 2 + 0.25 + i * (w - 0.5) / 6, len = 0.22 + (i % 3) * 0.06;
    box(room, x + 0.05, y + 0.05, tz, 0.025, len, 0.035, M(tools[i], 0.6, i % 3 === 2 ? 0.6 : 0));
    if (i % 2) sph(room, x + 0.05, y + 0.05 - len / 2, tz, 0.035, M(tools[i], 0.6));
  }
  box(room, x + 0.1, y - h / 2 + 0.1, z, 0.16, 0.03, w - 0.1, M(C.wood, 0.8));      // 아래 작은 선반
  for (let i = 0; i < 4; i++) cyl(room, x + 0.1, y - h / 2 + 0.17, z - w / 2 + 0.35 + i * 0.35, 0.05, 0.04, 0.12, M(['#e7c95e', '#f2ede4', '#9fb3a3', '#f2ede4'][i], 0.8), 12);
  return b;
}

/* ---------- 배치 ---------- */
// 뒷벽 원목 선반 (도자기 가득)
shelfUnit(-3.35, ROOM.z0 + 0.25, 2.9, 5);
shelfUnit(-0.5, ROOM.z0 + 0.25, 2.3, 5);
boxCol(-4.9, 0.7, ROOM.z0, ROOM.z0 + 0.5);
// 창 아래 개수대
sinkCounter(3.0, ROOM.z0 + 0.32, 2.5);
// 왼벽 공구 타공판 + 반죽대
pegboard(ROOM.x0 + 0.03, 1.65, -1.6, 2.2, 0.9);
table(ROOM.x0 + 0.5, -1.6, 0.8, 1.9, 0.82);
box(room, ROOM.x0 + 0.5, 0.85, -1.85, 0.5, 0.06, 0.6, M('#9b958b', 0.95));      // 반죽용 석고판
add(room, new THREE.SphereGeometry(0.14, 10, 8), M(C.clay, 0.8), ROOM.x0 + 0.5, 0.94, -1.2).scale.set(1.2, 0.7, 1);
// 가운데 긴 원목 작업대 (물레 뒤)
table(0.7, -1.75, 4.6, 0.95, 0.74);
{ // 작업대 위 소품
  for (let i = 0; i < 6; i++) { const p = randPot(i * 3 + 1); p.position.set(-1.2 + i * 0.7, 0.74, -1.75 + (i % 2) * 0.18); room.add(p); }
  for (let i = 0; i < 5; i++) cyl(room, 2.6, 0.76 + i * 0.022, -1.6, 0.17, 0.17, 0.02, M('#d8cfc0', 0.9), 20);   // 배트 더미
  box(room, -0.6, 0.77, -1.6, 0.35, 0.02, 0.25, M('#cfa97b', 0.8));                                             // 나무판
  box(room, 1.1, 0.79, -1.85, 0.3, 0.06, 0.22, M('#e6c35c', 0.9));                                              // 스펀지
}
// 물레 3대 + 스툴 (앉는 사람은 뒤쪽에서 앞을 바라봄)
const WHEELS = [wheel(-1.6, 0.75), wheel(0.6, 0.75), wheel(2.8, 0.75)];
WHEELS.forEach(w => { w.stool = stool(w.seat.x, w.seat.z); });
// 펜던트 조명
const lamp = new THREE.PointLight('#ffd49a', 1.4, 5, 1.6); lamp.position.set(-1.6, 1.9, 0.6); scene.add(lamp);
// 화분·통
plant(4.3, -2.9, 1.15); plant(-4.35, 0.2, 0.9); plant(4.35, 3.2, 0.85);
bucket(4.3, 0.9, '#f1eee8', 0.5, 0.19); bucket(4.3, 1.45, '#d9d3c8', 0.42, 0.17);
// 바닥 러그 (물레 구역)
add(room, new THREE.PlaneGeometry(6.6, 1.9), M('#8d8678', 1), 0.6, 0.004, 0.65, { rx: -Math.PI / 2, cast: false });

/* ====================== 방 5개 (같은 크기 판, 한 번에 한 방만 보임) ====================== */
const STUDIO = room, STUDIO_COLS = colliders;
const ROOM_INFO = {
  studio:  { name: '물레 작업실', icon: '🏺', short: '물레실' },
  dry:     { name: '건조·굽깎기실', icon: '🌬️', short: '건조실' },
  kiln:    { name: '가마실', icon: '🔥', short: '가마실' },
  glaze:   { name: '시유실', icon: '🎨', short: '시유실' },
  gallery: { name: '전시관', icon: '🖼️', short: '전시관' }
};
const ROOM_ORDER = Object.keys(ROOM_INFO);
const ROOMS = { studio: { g: STUDIO, cols: STUDIO_COLS, doors: [], spots: [] } };
let buildId = 'studio';
function signTexture(icon, text, bg = '#3a332e') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, 504, 120, 30); g.fill();
  g.fillStyle = '#f6efe4'; g.font = '700 58px "Apple SD Gothic Neo","Noto Sans KR","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(icon + ' ' + text, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function wallSign(x, y, icon, text, bg, w = 1.3) {          // 뒷벽 표지판
  add(room, new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: signTexture(icon, text, bg), transparent: true, toneMapped: false }), x, y, ROOM.z0 + 0.012, { cast: false });
}
/* 문: 왼벽에 낸 출입구 + 위 표지판 + 바닥 매트. 매트를 밟으면 그 방으로 이동 */
const DOOR_Z = [1.35, 3.15];
function door(z, to) {
  const x = ROOM.x0, g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  add(g, new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshStandardMaterial({ color: '#3b312a', roughness: 1 }), 0.006, 1.0, 0, { ry: Math.PI / 2, cast: false });
  add(g, new THREE.PlaneGeometry(0.78, 1.72), new THREE.MeshBasicMaterial({ color: '#f3dfbf', transparent: true, opacity: 0.22 }), 0.009, 0.86, 0, { ry: Math.PI / 2, cast: false });
  const f = M(C.woodDark, 0.7);
  box(g, 0.04, 1.03, -0.54, 0.1, 2.06, 0.08, f); box(g, 0.04, 1.03, 0.54, 0.1, 2.06, 0.08, f); box(g, 0.04, 2.08, 0, 0.1, 0.1, 1.16, f);
  add(g, new THREE.PlaneGeometry(1.16, 0.29), new THREE.MeshBasicMaterial({ map: signTexture(ROOM_INFO[to].icon, ROOM_INFO[to].short), transparent: true, toneMapped: false }), 0.1, 2.34, 0, { ry: Math.PI / 2, cast: false });
  add(room, new THREE.PlaneGeometry(0.66, 0.98), M('#9b7b5a', 1), x + 0.42, 0.006, z, { rx: -Math.PI / 2, cast: false });
  const glow = add(room, new THREE.RingGeometry(0.4, 0.48, 36), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), x + 0.42, 0.014, z, { rx: -Math.PI / 2, cast: false });
  ROOMS[buildId].doors.push({ x: x + 0.42, z, to, g, glow });
}
function spot(x, z, kind, face, lines) { ROOMS[buildId].spots.push({ x, z, kind, face, lines }); }
function newRoom(id, o = {}) {
  buildId = id; room = new THREE.Group(); room.visible = false; scene.add(room); colliders = [];
  ROOMS[id] = { g: room, cols: colliders, doors: [], spots: [] };
  const fl = new THREE.Mesh(new THREE.BoxGeometry(10.36, 0.24, 8.36),
    [M('#4a423b'), M('#4a423b'), new THREE.MeshStandardMaterial({ map: tileTexture(), color: o.floor || '#ffffff', roughness: 0.9 }), M('#4a423b'), M('#5a5049'), M('#5a5049')]);
  fl.position.set(0, -0.12, 0); fl.receiveShadow = true; room.add(fl);
  const keep = { ...C }; Object.assign(C, o.C || {});
  wall(0, ROOM.z0 - WT / 2, 10 + WT * 2, WT); wall(ROOM.x0 - WT / 2, 0, WT, 8);
  Object.assign(C, keep);
  boxCol(-6, 6, -5, ROOM.z0 + 0.05); boxCol(-6, ROOM.x0 + 0.05, -5, 5);
}
function addWindow(wx, ww = 2.2, wh = 1.4, wy = 1.85) {
  const wz = ROOM.z0 + 0.005;
  add(room, new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: gardenTexture() }), wx, wy, wz, { cast: false });
  const f = M(C.woodDark, 0.7);
  box(room, wx, wy + wh / 2 + 0.05, wz + 0.04, ww + 0.2, 0.1, 0.1, f); box(room, wx, wy - wh / 2 - 0.05, wz + 0.09, ww + 0.3, 0.08, 0.2, f);
  for (const dx of [-ww / 2 - 0.05, 0, ww / 2 + 0.05]) box(room, wx + dx, wy, wz + 0.04, 0.08, wh, 0.08, f);
}
function rug(x, z, w, d, color) { add(room, new THREE.PlaneGeometry(w, d), M(color, 1), x, 0.004, z, { rx: -Math.PI / 2, cast: false }); }

// ── 물레 작업실: 문 + NPC 활동 자리
door(DOOR_Z[0], 'gallery'); door(DOOR_Z[1], 'dry');
spot(-3.35, -3.25, 'look', Math.PI, ['이 컵 손잡이 예쁘다', '선반 꽉 찼네', '이거 누가 만들었어요?']);
spot(-0.5, -3.25, 'look', Math.PI, ['유약 색 너무 좋다', '굽이 깔끔해요']);
spot(ROOM.x0 + 1.25, -1.55, 'work', -Math.PI / 2, ['흙 꼬박밀기 중이에요', '공기 빼는 중!']);
spot(0.2, -0.95, 'look', Math.PI, ['오늘 만든 거 말리는 중', '작업대 정리해야지']);
spot(3.0, -3.0, 'work', Math.PI, ['도구 씻는 중이에요', '스펀지 어디 갔지?']);

// ── 건조·굽깎기실
newRoom('dry', { floor: '#fbf4ea', C: { plaster: '#efe7da' } });
door(DOOR_Z[0], 'studio'); door(DOOR_Z[1], 'kiln');
addWindow(2.7);
POT_TONE = ['#d8cdbd', '#cbbfae', '#e3dbcf', '#bfae98', '#a99a86'];
shelfUnit(-2.4, ROOM.z0 + 0.25, 3.4, 5); boxCol(-4.15, -0.65, ROOM.z0, ROOM.z0 + 0.5);
shelfUnit(4.3, -0.6, 2.4, 4, 0.42, Math.PI / 2); boxCol(4.0, 4.6, -1.85, 0.65);
{ const w = wheel(0.4, 0.9, false); w.stool = stool(w.seat.x, w.seat.z);
  const pot = lathePot([0.09, 0.115, 0.12, 0.115, 0.07, 0.04], 0.12, M('#cbbfae', 0.85), 28); pot.rotation.x = Math.PI; pot.position.y = 0.57; w.g.add(pot);   // 뒤집어 놓은 굽깎기 기물
  table(2.2, -1.9, 2.4, 0.85); for (let i = 0; i < 5; i++) { const p = randPot(i * 4 + 2); p.position.set(1.3 + i * 0.45, 0.72, -1.9); room.add(p); }
  for (let i = 0; i < 4; i++) box(room, 3.3, 0.74 + i * 0.025, -1.75, 0.3, 0.02, 0.3, M('#e9e4da', 0.9));   // 석고 배트
  // 굽깎기 도구
  for (let i = 0; i < 4; i++) box(room, 0.95 + i * 0.12, 0.47, 0.45, 0.04, 0.02, 0.3, M(['#8a6a4a', '#b7b3ac', '#3d3a37', '#c7a04a'][i], 0.6, i === 1 ? 0.6 : 0));
}
{ // 선풍기
  const g = new THREE.Group(); g.position.set(-0.3, 0, 2.9); room.add(g);
  cyl(g, 0, 0.03, 0, 0.22, 0.24, 0.05, M('#e9e4da', 0.6)); cyl(g, 0, 0.55, 0, 0.025, 0.025, 1.05, M('#cfcac2', 0.4, 0.4));
  const head = add(g, new THREE.TorusGeometry(0.28, 0.025, 8, 28), M('#e9e4da', 0.5), 0, 1.15, 0, { ry: Math.PI / 4 });
  add(g, new THREE.CircleGeometry(0.26, 24), M('#d8d2c8', 0.5, 0, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 0, 1.15, 0, { ry: Math.PI / 4, cast: false });
  circleCol(-0.3, 2.9, 0.3);
}
wallSign(-2.4, 2.75, '🌬️', '천천히 말려요', '#6f857c');
plant(4.3, 3.2, 0.85); rug(0.4, 0.75, 2.6, 2.0, '#cfc3b2');
spot(-3.2, -3.25, 'look', Math.PI, ['아직 꾸덕해요', '갈라진 데 없나 보는 중']);
spot(-1.4, -3.25, 'look', Math.PI, ['내일이면 다 마르겠다']);
spot(3.75, -0.6, 'look', Math.PI / 2, ['굽 깎을 때 됐다']);
spot(2.2, -1.2, 'work', Math.PI, ['배트에 올려 말리는 중', '물 스펀지로 다듬기']);
spot(1.25, 0.35, 'work', -Math.PI / 2, ['굽깎기 해볼까', '쓱쓱—']);

// ── 가마실
newRoom('kiln', { floor: '#cfc8bf', C: { plaster: '#e3ddd4', wainscot: '#8d8780' } });
door(DOOR_Z[0], 'dry'); door(DOOR_Z[1], 'glaze');
kiln(-2.6, -3.05);
{ // 큰 각가마 (가스) + 연통
  const x = 1.5, z = -3.1, g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, 0.82, 0, 1.7, 1.5, 1.25, M('#d6d3cd', 0.45, 0.55));
  box(g, 0, 0.82, 0.64, 1.3, 1.2, 0.05, M('#bdb9b2', 0.4, 0.6));
  box(g, 0.55, 0.82, 0.7, 0.06, 0.4, 0.06, M('#3d3a37', 0.4, 0.6));
  box(g, -0.55, 1.45, 0.67, 0.35, 0.18, 0.03, M('#2f2f2f', 0.5)); box(g, -0.55, 1.45, 0.69, 0.22, 0.06, 0.01, M('#e2683f', 0.4, 0, { emissive: '#a23a1f' }));
  cyl(g, 0.5, 2.3, -0.2, 0.12, 0.12, 1.5, M('#9a9893', 0.4, 0.6), 16);
  for (const sx of [-0.75, 0.75]) box(g, sx, 0.05, 0, 0.12, 0.1, 1.2, M('#3d3c3a', 0.6, 0.4));
  boxCol(x - 0.9, x + 0.9, z - 0.7, z + 0.75);
}
{ // 가마 선반·지주 더미 + 초벌 기물
  const g = new THREE.Group(); g.position.set(4.05, 0, -1.2); room.add(g);
  POT_TONE = ['#efe4d4', '#e8dccb', '#f3ebdf'];
  for (let i = 0; i < 4; i++) { box(g, 0, 0.3 + i * 0.36, 0, 0.75, 0.04, 0.75, M('#bfb6a8', 0.95));
    for (const [sx, sz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) cyl(g, sx, 0.13 + i * 0.36, sz, 0.03, 0.03, 0.32, M('#d8cfc0', 0.9), 8);
    for (let k = 0; k < 3; k++) { const p = randPot(i * 3 + k); p.position.set(-0.22 + k * 0.22, 0.32 + i * 0.36, 0); g.add(p); } }
  boxCol(3.6, 4.5, -1.65, -0.75);
}
{ // 초벌 기물 수레
  table(-0.4, 0.4, 1.6, 0.8, 0.68); for (let i = 0; i < 5; i++) { const p = randPot(i * 2 + 1); p.position.set(-1.0 + i * 0.3, 0.68, 0.4 + (i % 2) * 0.15); room.add(p); }
  box(room, 0.25, 0.7, 0.2, 0.22, 0.06, 0.14, M('#6f6a63', 0.9));   // 내열 장갑
  for (const sx of [-0.7, 0.7]) for (const sz of [0.05, 0.75]) cyl(room, -0.4 + sx, 0.06, sz, 0.06, 0.06, 0.05, M('#2f2f2f', 0.6), 12);
}
POT_TONE = null;
wallSign(-0.6, 2.4, '🔥', '고온 주의', '#b5442f', 1.2);
wallSign(-4.0, 2.4, '🌡️', '초벌 800° · 재벌 1250°', '#4a423b', 1.7);
rug(-0.4, 0.4, 2.4, 1.6, '#8f877c');
spot(-2.6, -2.25, 'look', Math.PI, ['가마 언제 열어요?', '온도 올라가는 중이래요']);
spot(1.5, -2.15, 'look', Math.PI, ['재벌 들어갔대요', '두근두근']);
spot(3.35, -1.2, 'work', Math.PI / 2, ['가마 선반 정리 중', '지주 높이 맞추기']);
spot(-0.4, -0.15, 'look', Math.PI, ['초벌 나온 거 예쁘다', '이제 유약 바를 차례']);

// ── 시유실
newRoom('glaze', { floor: '#f6eee2', C: { plaster: '#f1e9de' } });
door(DOOR_Z[0], 'kiln'); door(DOOR_Z[1], 'gallery');
addWindow(-1.4, 1.8);
sinkCounter(-1.4, ROOM.z0 + 0.32, 1.9);
const GLAZE_BUCKETS = [['#7f9a8a', '청자유'], ['#2f3436', '흑유'], ['#ebe6dc', '백유'], ['#a5643f', '녹갈유'], ['#d4ad5a', '황유'], ['#6d8fb0', '하늘유']];
GLAZE_BUCKETS.forEach(([c, n], i) => { const x = 0.75 + i * 0.68, z = ROOM.z0 + 0.5; bucket(x, z, '#f3f1ec', 0.5, 0.21); cyl(room, x, 0.49, z, 0.19, 0.19, 0.02, M(c, 0.25, 0), 24);
  add(room, new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshBasicMaterial({ map: signTexture('', n, '#5a4f45'), transparent: true, toneMapped: false }), x, 0.3, z + 0.215, { cast: false }); });
{ // 스프레이 부스
  const g = new THREE.Group(); g.position.set(-3.95, 0, ROOM.z0 + 0.55); room.add(g);
  const wm = M('#e4e1db', 0.5, 0.3);
  box(g, 0, 1.05, -0.35, 1.4, 1.5, 0.05, wm); box(g, -0.68, 1.05, 0, 0.05, 1.5, 0.75, wm); box(g, 0.68, 1.05, 0, 0.05, 1.5, 0.75, wm); box(g, 0, 1.8, 0, 1.4, 0.05, 0.75, wm); box(g, 0, 0.3, 0, 1.4, 0.6, 0.75, M('#d4d0c8', 0.6, 0.2));
  add(g, new THREE.CircleGeometry(0.28, 24), M('#8d8a84', 0.4, 0.5), 0, 1.15, -0.32, { cast: false }); cyl(g, 0, 0.66, 0, 0.12, 0.12, 0.04, M('#5f5e5b', 0.4, 0.5), 20);
  boxCol(-4.7, -3.2, ROOM.z0, ROOM.z0 + 0.95);
}
{ // 테스트 타일 탁자 + 담금 통
  table(1.4, -1.35, 2.4, 0.9);
  GLAZE_BUCKETS.forEach(([c], i) => { for (let k = 0; k < 3; k++) box(room, 0.5 + i * 0.36, 0.735, -1.55 + k * 0.2, 0.22, 0.02, 0.14, M(c, 0.3 + k * 0.2, 0)); });
  bucket(-1.7, -1.4, '#e9e4da', 0.36, 0.42); cyl(room, -1.7, 0.35, -1.4, 0.39, 0.39, 0.02, M('#7f9a8a', 0.2, 0), 28);
  box(room, -1.25, 0.42, -1.1, 0.05, 0.5, 0.04, M('#8f8b84', 0.4, 0.6), { rz: 0.5 });   // 집게
}
POT_TONE = ['#efe4d4', '#e8dccb']; shelfUnit(4.3, 1.0, 2.2, 4, 0.42, Math.PI / 2); boxCol(4.0, 4.6, -0.15, 2.15); POT_TONE = null;
wallSign(2.45, 2.55, '🎨', '유약은 잘 저어서!', '#7f9a8a', 1.5);
plant(-4.35, 0.2, 0.85);
spot(1.1, -2.95, 'work', Math.PI, ['유약 젓는 중이에요', '가라앉으면 색이 달라져요']);
spot(3.15, -2.95, 'work', Math.PI, ['청자유 너무 예뻐', '두 번 담가볼까']);
spot(1.4, -0.65, 'look', Math.PI, ['테스트 타일 보는 중', '이 색 조합 좋다']);
spot(-1.7, -0.75, 'work', Math.PI, ['쑥— 담갔다 빼요', '3초 세기!']);
spot(-3.95, -2.75, 'work', Math.PI, ['스프레이로 뿌리는 중']);

// ── 전시관
newRoom('gallery', { floor: '#fffaf2', C: { plaster: '#f8f4ee', wainscot: '#e8e1d6' } });
door(DOOR_Z[0], 'glaze'); door(DOOR_Z[1], 'studio');
const PEDESTALS = [];
{ const xs = [-1.7, 0.55, 2.8], zs = [-2.5, -0.5, 1.5];
  zs.forEach(z => xs.forEach(x => {
    const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
    box(g, 0, 0.42, 0, 0.62, 0.84, 0.62, M('#f4f1ea', 0.85)); box(g, 0, 0.855, 0, 0.66, 0.03, 0.66, M('#e6dfd3', 0.7));
    const glow = add(g, new THREE.RingGeometry(0.42, 0.5, 36), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), 0, 0.012, 0, { rx: -Math.PI / 2, cast: false });
    const holder = new THREE.Group(); holder.position.y = 0.87; g.add(holder);
    boxCol(x - 0.36, x + 0.36, z - 0.36, z + 0.36);
    PEDESTALS.push({ x, z, g, glow, holder });
  }));
}
// 공방 선생님 작품 3점 (고정)
[[0, 3], [4, 11], [8, 7]].forEach(([i, seed]) => { const p = randPot(seed); p.scale.setScalar(2.4); PEDESTALS[i].holder.add(p); PEDESTALS[i].fixed = true; });
for (const [x, c] of [[-2.6, '#d9c8ab'], [-0.6, '#9fb3a3'], [1.4, '#c8a58a']]) { add(room, new THREE.PlaneGeometry(1.1, 0.8), M(c, 0.9), x, 1.75, ROOM.z0 + 0.03, { cast: false }); box(room, x, 1.75, ROOM.z0 + 0.008, 1.2, 0.9, 0.01, M('#3a332e', 0.7)); }
wallSign(3.4, 2.5, '🖼️', '흙마루 전시관', '#3a332e', 1.5);
box(room, 0.55, 0.22, 3.3, 1.8, 0.08, 0.5, M(C.wood, 0.8)); for (const sx of [-0.8, 0.8]) box(room, 0.55 + sx, 0.1, 3.3, 0.08, 0.2, 0.45, M(C.woodDark, 0.8)); boxCol(-0.4, 1.5, 3.0, 3.6);
PEDESTALS.forEach((p, i) => spot(p.x, p.z + 0.62, 'look', Math.PI, ['와 이거 예쁘다', '유약 흐른 게 멋져요', '누구 작품이에요?', '저도 이런 거 만들고 싶다']));

// 짓기 끝: 기본은 물레 작업실
room = STUDIO; colliders = STUDIO_COLS; buildId = 'studio';

/* ---------- 캐릭터 ---------- */
const UP = V(0, 1, 0);
function seg(mesh, a, b) {                 // 캡슐을 a→b 사이에 놓기
  const d = b.clone().sub(a), len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / (len || 1)));
}
function ik(a, c, l1, l2, pole) {          // 두 마디 IK → [팔꿈치/무릎, 실제 끝점]
  const ac = c.clone().sub(a); let d = ac.length();
  const u = ac.multiplyScalar(1 / (d || 1));
  d = THREE.MathUtils.clamp(d, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999);
  const x = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const mid = a.clone().addScaledVector(u, x).addScaledVector(p, h);
  return [mid, a.clone().addScaledVector(u, d)];
}

/* ---------- 그림 캐릭터 (직접 만든 캐릭터 시트에서 오려낸 컷) ---------- */
const SPR = {"A_back": [95, 210], "A_big": [258, 517], "A_bowl1": [67, 123], "A_bowl2": [65, 124], "A_bq": [85, 212], "A_cheer": [83, 125], "A_front": [95, 209], "A_q": [89, 210], "A_side": [88, 212], "A_w1": [64, 114], "A_w2": [58, 110], "A_w3": [58, 110], "A_w4": [59, 110], "A_wheel": [77, 120], "B_back": [91, 215], "B_big": [201, 519], "B_bowl": [56, 119], "B_bq": [95, 214], "B_cheer": [86, 123], "B_f1": [58, 121], "B_front": [93, 216], "B_q": [91, 216], "B_side": [103, 215], "B_w1": [62, 112], "B_w2": [61, 115], "B_w3": [56, 117], "B_x1": [66, 122], "B_x2": [67, 122], "B_x3": [69, 121], "N_beanie": [144, 346], "N_bowls": [182, 340], "N_braid": [204, 335], "N_cap": [160, 336], "N_glasses": [162, 326], "N_smile": [175, 337], "N_teacher": [198, 321], "A_cw0": [180, 340], "A_cw1": [180, 340], "A_cw2": [180, 340], "A_cw3": [180, 340], "A_cw4": [180, 340], "A_cw5": [180, 340], "A_cw6": [180, 340], "A_cw7": [180, 340], "A_cw8": [180, 340], "A_cw9": [180, 340], "A_cw10": [180, 340], "A_cw11": [180, 340], "B_gl0": [285, 349], "B_gl1": [285, 349], "B_gl2": [285, 349], "B_gl3": [285, 349], "B_gl4": [285, 349], "B_gl5": [285, 349], "B_gl6": [285, 349], "B_gl7": [285, 349], "B_gl8": [285, 349], "B_gl9": [285, 349], "B_gl10": [285, 349], "B_gl11": [285, 349]}
const texLoader = new THREE.TextureLoader(), texCache = {};
function tex(name) { if (!texCache[name]) { const t = texLoader.load('/chars/' + name + '.png'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache[name] = t; } return texCache[name]; }
Object.keys(SPR).forEach(tex);                                  // 미리 불러오기
const CAM_YAW = Math.atan2(ISO.x, ISO.z);
const ELEV_FIX = 1 / Math.hypot(ISO.x, ISO.z);                   // 세운 판을 위에서 볼 때 줄어드는 높이 보정
const CHAR_H = 1.3;
const K = { sheet: CHAR_H / 211, small: CHAR_H / 112, poster: CHAR_H / 336, cw: CHAR_H / 330, gl: 0.72 / 230 };
const kOf = n => n.startsWith('N_') ? K.poster : n.startsWith('A_cw') ? K.cw : n.startsWith('B_gl') ? K.gl : (/_(front|q|side|back|bq)$/.test(n) ? K.sheet : K.small);
const blobGeo = new THREE.CircleGeometry(0.26, 24), blobMat = new THREE.MeshBasicMaterial({ color: '#2a1f18', transparent: true, opacity: 0.22, depthWrite: false });
function makeActor() {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false }));
  mesh.rotation.y = CAM_YAW; scene.add(mesh);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.scale.set(1, 0.6, 1); scene.add(blob);
  return { mesh, blob, cur: null };
}
function showFrame(a, name, x, z, flip = false, lift = 0, squash = 1) {
  if (a.cur !== name) { a.mesh.material.map = tex(name); a.mesh.material.needsUpdate = true; a.cur = name; }
  const [w, h] = SPR[name], k = kOf(name);
  a.mesh.scale.set(w * k * (flip ? -1 : 1), h * k * ELEV_FIX * squash, 1);
  a.mesh.position.set(x, lift, z); a.blob.position.set(x, 0.008, z);
}
// 화면 기준 방향: 0 = 카메라를 봄, +는 화면 오른쪽을 봄
const CAM_RIGHT = V(Math.cos(CAM_YAW), 0, -Math.sin(CAM_YAW)), TO_CAM = V(Math.sin(CAM_YAW), 0, Math.cos(CAM_YAW));
function screenAngle(yaw) { const d = V(Math.sin(yaw), 0, Math.cos(yaw)); return Math.atan2(d.dot(CAM_RIGHT), d.dot(TO_CAM)); }
const SET = {
  A: { front: 'A_front', q: 'A_q', side: 'A_side', bq: 'A_bq', back: 'A_back', walk: ['A_w2', 'A_w3', 'A_w4', 'A_w3'], walkFront: ['A_w1', 'A_front'], sit: ['A_wheel'], big: 'A_big', cheer: 'A_cheer', carry: ['A_bowl1', 'A_bowl2'], carryClip: { front: ['A_cw0', 'A_cw1', 'A_cw2', 'A_cw3'], q: ['A_cw4', 'A_cw5', 'A_cw6', 'A_cw7'], side: ['A_cw8', 'A_cw9', 'A_cw10', 'A_cw11'], stand: 'A_cw0', standQ: 'A_cw4', standSide: 'A_cw8' } },
  B: { front: 'B_front', q: 'B_q', side: 'B_side', bq: 'B_bq', back: 'B_back', walk: ['B_w1', 'B_w2', 'B_w3', 'B_w2'], walkFront: ['B_front'], sit: ['B_x1', 'B_x2', 'B_x3', 'B_x2'], big: 'B_big', cheer: 'B_cheer', carry: ['B_bowl'] }
};
let PLAYER_KEY = 'A';
try { PLAYER_KEY = localStorage.getItem('heukmaru-char') === 'B' ? 'B' : 'A'; } catch {}

const player = new THREE.Group(); scene.add(player);
player.position.set(-2.6, 0, 2.4); player.rotation.y = Math.PI * 0.25;
player.userData = { pose: 'stand', walkAmt: 0, phase: 0 };
const playerActor = makeActor();
/* 캐릭터 그리기: 몸을 기울이거나 튕기지 않고, 그림 컷만 바꿔서 움직임을 만든다 (초당 8컷) */
const FPS = 8;
function drawChar(actor, key, x, z, yaw, walking, t, carry) {
  const S = SET[key], a = screenAngle(yaw), aa = Math.abs(a), right = a > 0, step = Math.floor(t * FPS);
  actor.mesh.rotation.z = 0; actor.blob.scale.set(1, 0.6, 1);
  let name, flip = false;
  if (carry && S.carryClip) {                         // 작품 들고 걷기 (GIF 컷: 정면 · 3/4 · 옆, 원본은 오른쪽을 봄)
    const C = S.carryClip;
    if (aa < 0.42) name = walking ? C.front[step % 4] : C.stand;
    else if (aa < 1.2) { name = walking ? C.q[step % 4] : C.standQ; flip = !right; }
    else { name = walking ? C.side[step % 4] : C.standSide; flip = !right; }
  } else if (carry) { name = S.carry[0]; flip = false; }
  else if (aa < 0.42) name = walking ? S.walkFront[step % S.walkFront.length] : S.front;
  else if (aa < 1.95) { name = walking ? S.walk[step % S.walk.length] : (aa < 1.2 ? S.q : S.side); flip = right; }
  else if (aa < 2.75) { name = S.bq; flip = !right; }
  else name = S.back;
  showFrame(actor, name, x, z, flip);
}
function drawPlayer(now) {
  const u = player.userData, S = SET[PLAYER_KEY], p = player.position;
  playerActor.mesh.rotation.z = 0;
  if (u.pose === 'sit') {
    const w = sitTarget, f = S.sit[Math.floor(now / 1000 * 4) % S.sit.length];
    showFrame(playerActor, f, w.g.position.x, w.g.position.z - 0.12, false);
    playerActor.blob.scale.set(1.6, 0.9, 1);
    return;
  }
  if (performance.now() < cheerUntil) { playerActor.blob.scale.set(1, 0.6, 1); showFrame(playerActor, S.cheer, p.x, p.z, false); return; }
  drawChar(playerActor, PLAYER_KEY, p.x, p.z, player.rotation.y, u.walkAmt > 0.35, u.phase / 9, !!carrying);
}

/* 물레 차는 선생님 (포스터 캐릭터) — 3번 물레 자리, 물레실에서 계속 빚는 중 */
const teacher = new THREE.Group(); scene.add(teacher);
const TW = WHEELS[2]; TW.g.visible = false; TW.stool.visible = false;
teacher.position.set(TW.g.position.x, 0, TW.g.position.z - 0.1);
const teacherActor = makeActor();

/* 공방 손님들(포스터 캐릭터): 그림이 한 장씩이라 보이는 데서는 걷지 않고,
   각자 자리에서 구경·작업을 해요. 내가 다른 방에 있거나 물레를 차는 동안에만 자리를 옮겨요. */
const NPCS = [
  { name: 'N_beanie', room: 'studio' }, { name: 'N_cap', room: 'studio' }, { name: 'N_braid', room: 'dry' },
  { name: 'N_smile', room: 'glaze' }, { name: 'N_glasses', room: 'gallery' }, { name: 'N_bowls', room: 'kiln' }
].map((v, i) => ({ ...v, actor: makeActor(), seed: i, state: 'do', until: 0, spot: null, x: 0, z: 0, obj: (() => { const g = new THREE.Group(); scene.add(g); return g; })() }));
function npcBlocked(rid, x, z) {
  if (x < ROOM.x0 + 0.22 || x > ROOM.x1 - 0.22 || z < ROOM.z0 + 0.22 || z > ROOM.z1 - 0.22) return true;
  for (const c of ROOMS[rid].cols) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + 0.2) return true; }
    else if (x > c.x0 - 0.2 && x < c.x1 + 0.2 && z > c.z0 - 0.2 && z < c.z1 + 0.2) return true;
  }
  return false;
}
function spotTaken(n, sp, room) { return NPCS.some(o => o !== n && o.room === room && o.spot === sp) || (partner.room === room && partner.spot === sp); }
function npcRelocate(n, now) {          // 안 보일 때만: 다른 자리(가끔 다른 방)로 옮겨 둠
  if (Math.random() < 0.3) n.room = ROOM_ORDER[Math.floor(Math.random() * ROOM_ORDER.length)];
  const free = ROOMS[n.room].spots.filter(sp => !spotTaken(n, sp, n.room));
  n.spot = free.length ? free[Math.floor(Math.random() * free.length)] : ROOMS[n.room].spots[0];
  n.x = n.spot.x; n.z = n.spot.z; n.until = now + 9000 + Math.random() * 12000;
}
NPCS.forEach(n => { const f = ROOMS[n.room].spots.filter(sp => !NPCS.some(o => o !== n && o.spot === sp)); n.spot = f[n.seed % f.length]; n.x = n.spot.x; n.z = n.spot.z; n.until = performance.now() + 8000 + n.seed * 3000; });
const roomVisible = id => id === curRoom && !(window.HeukThrow && HeukThrow.active) && !fading;

/* 단짝 캐릭터: 내가 고르지 않은 캐릭터(A↔B). 걷기·작업 컷이 있어서 보이는 데서도 걸어 다녀요.
   B: 시유실 유약 작업대에서 붓으로 유약 바르기(GIF 12컷)  /  A: 작품을 들고 방을 오가며 구경(GIF 12컷) */
let PARTNER_KEY = PLAYER_KEY === 'A' ? 'B' : 'A';
const GLAZE_STATION = { room: 'glaze', x: 1.25, z: 1.55 };
{ // 시유실 유약 작업대 (B가 앉아서 바르는 자리)
  const keep = room; room = ROOMS.glaze.g; colliders = ROOMS.glaze.cols;
  const g = new THREE.Group(); g.position.set(GLAZE_STATION.x, 0, GLAZE_STATION.z); room.add(g);
  box(g, 0, 0.36, 0, 1.15, 0.72, 0.55, M(C.wood, 0.8)); box(g, 0, 0.735, 0, 1.25, 0.03, 0.62, M(C.woodDark, 0.7));
  boxCol(GLAZE_STATION.x - 0.66, GLAZE_STATION.x + 0.66, GLAZE_STATION.z - 0.8, GLAZE_STATION.z + 0.34);
  room = keep; colliders = STUDIO_COLS;
}
const partner = { key: PARTNER_KEY, actor: makeActor(), obj: (() => { const g = new THREE.Group(); scene.add(g); return g; })(),
  room: PARTNER_KEY === 'B' ? 'glaze' : 'dry', x: 0, z: 0, yaw: 0, state: 'do', until: 0, t0: 0, walkT: 0, target: null, spot: null, stuck: 0 };
const GLAZE_SPOT = { x: GLAZE_STATION.x, z: GLAZE_STATION.z - 0.55, kind: 'glazing', lines: ['청자유 발라보는 중', '붓을 한 방향으로!', '와, 색 예쁘게 나왔다!'] };
function resetPartner() {     // 내가 고른 캐릭터가 바뀌면 단짝도 바뀜
  PARTNER_KEY = PLAYER_KEY === 'A' ? 'B' : 'A'; const P = partner; P.key = PARTNER_KEY; P.state = 'do'; P.target = null; P.t0 = performance.now();
  if (P.key === 'B') { P.room = 'glaze'; P.spot = GLAZE_SPOT; P.x = GLAZE_SPOT.x; P.z = GLAZE_SPOT.z; P.until = performance.now() + 30000; }
  else { P.room = 'dry'; const sp = ROOMS.dry.spots[0]; P.spot = sp; P.x = sp.x; P.z = sp.z; P.yaw = sp.face; P.until = performance.now() + 6000; }
}
resetPartner();
partner.obj.position.set(partner.x, 0, partner.z);
function partnerPlan(now) {
  const P = partner, R0 = ROOMS[P.room];
  if (P.key === 'B' && P.room !== 'glaze' && Math.random() < 0.6) { const d = R0.doors.find(o => o.to === 'glaze') || R0.doors[0]; P.target = { x: d.x + 0.05, z: d.z, door: d }; }
  else if (P.key === 'B' && P.room === 'glaze' && P.spot !== GLAZE_SPOT && Math.random() < 0.7) { P.spot = GLAZE_SPOT; P.target = { x: GLAZE_SPOT.x, z: GLAZE_SPOT.z }; }
  else if (Math.random() < 0.3) { const d = R0.doors[Math.floor(Math.random() * R0.doors.length)]; P.target = { x: d.x + 0.05, z: d.z, door: d }; P.spot = null; }
  else { const free = R0.spots.filter(sp => !spotTaken(P, sp, P.room)); const sp = free[Math.floor(Math.random() * free.length)] || R0.spots[0]; P.spot = sp; P.target = { x: sp.x, z: sp.z }; }
  P.state = 'walk'; P.stuck = 0;
}
function partnerStep(dt, now) {
  const P = partner;
  if (P.state === 'do') { if (now > P.until) partnerPlan(now); return; }
  const t = P.target, dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
  if (d < 0.06) {
    if (t.door) { const to = t.door.to, back = ROOMS[to].doors.find(o => o.to === P.room) || ROOMS[to].doors[0]; P.room = to; P.x = back.x + 0.6; P.z = back.z; P.yaw = Math.PI / 2; P.state = 'do'; P.until = now + 300; P.spot = null; return; }
    P.state = 'do'; P.t0 = now; P.until = now + (P.spot === GLAZE_SPOT ? 24000 + Math.random() * 12000 : 4000 + Math.random() * 5000);
    if (P.spot && P.spot.face !== undefined) P.yaw = P.spot.face;
    if (P.spot && roomVisible(P.room) && Math.random() < 0.6) queueLine(P, P.spot.lines[Math.floor(Math.random() * P.spot.lines.length)]);
    return;
  }
  const sp = 1.1 * dt, base = Math.atan2(dx, dz); let moved = false;
  for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
    const a = base + off, mx = Math.sin(a) * sp, mz = Math.cos(a) * sp;
    if (!npcBlocked(P.room, P.x + mx, P.z + mz) || d < 0.5) { P.x += mx; P.z += mz; let dy = a - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.yaw += dy * Math.min(1, dt * 5); moved = true; break; }   // 방향은 천천히 돌려서 컷이 깜빡이지 않게
  }
  P.walkT += dt; P.stuck = moved ? 0 : P.stuck + dt;
  if (P.stuck > 1.2) { P.x = t.x; P.z = t.z; }                   // 끼면 목표로 (드묾)
}

function drawNPCs(now, dt) {
  const inStudio = curRoom === 'studio';
  teacherActor.mesh.visible = teacherActor.blob.visible = inStudio;
  if (inStudio) { showFrame(teacherActor, 'N_teacher', teacher.position.x, teacher.position.z, false); teacherActor.mesh.rotation.z = 0; teacherActor.blob.scale.set(1.8, 0.9, 1); }
  for (const n of NPCS) {
    const vis = roomVisible(n.room);
    if (!vis && now > n.until) npcRelocate(n, now);
    const show = n.room === curRoom; n.actor.mesh.visible = n.actor.blob.visible = show; n.obj.position.set(n.x, 0, n.z);
    if (!show) continue;
    n.actor.mesh.rotation.z = 0;
    showFrame(n.actor, n.name, n.x, n.z, n.spot && n.spot.face !== undefined ? screenAngle(n.spot.face) > 0 : false);
  }
  // 단짝
  const P = partner; partnerStep(dt, now); P.obj.position.set(P.x, 0, P.z);
  const pv = P.room === curRoom; P.actor.mesh.visible = P.actor.blob.visible = pv;
  if (!pv) return;
  if (P.state === 'do' && P.spot === GLAZE_SPOT) {         // 유약 바르기 12컷 + 마지막 컷 잠깐 멈춤
    const k = Math.floor((now - P.t0) / 1000 * FPS) % 16, f = 'B_gl' + Math.min(11, k);
    const fwd = V(ISO.x, 0, ISO.z).normalize().multiplyScalar(0.36);   // 작업대 앞면 바로 앞: 그림 속 나무 판이 작업대 윗면에 겹치게
    showFrame(P.actor, f, GLAZE_STATION.x + fwd.x, GLAZE_STATION.z + fwd.z, false, 0.66); P.actor.blob.visible = false; P.actor.mesh.rotation.z = 0;
    return;
  }
  drawChar(P.actor, P.key, P.x, P.z, P.yaw, P.state === 'walk', P.walkT, P.key === 'A');
}

function seatOn(ch, w) {
  const u = ch.userData; u.pose = 'sit'; u.walkAmt = 0;
  ch.position.copy(w.seat);
  w.g.visible = false; w.stool.visible = false;             // 시트 속 물레 그림이 대신 보임
}
function standUp(ch, w) { ch.userData.pose = 'stand'; if (w) { w.g.visible = true; w.stool.visible = true; } }

/* ---------- 이동 · 충돌 ---------- */
const R = 0.24;
function blocked(x, z) {
  if (x < ROOM.x0 + R || x > ROOM.x1 - R || z < ROOM.z0 + R || z > ROOM.z1 - R) return true;
  for (const c of colliders) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + R) return true; }
    else if (x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R) return true;
  }
  return false;
}
let steerBias = 1; const keys = new Set(); let goal = null, sitting = false, sitTarget = null;
function stepMove(dx, dz, dt) {
  const len = Math.hypot(dx, dz); if (len < 1e-4) return false;
  const sp = 2.2 * dt, p = player.position, base = Math.atan2(dx, dz);
  let moved = false, used = base;
  // 막히면 좌우로 조금씩 꺾어 장애물을 돌아감
  for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.57, -1.57]) {
    const a = base + (steerBias || 1) * off, mx = Math.sin(a) * sp, mz = Math.cos(a) * sp;
    if (!blocked(p.x + mx, p.z + mz)) { p.x += mx; p.z += mz; moved = true; used = a; if (off) steerBias = Math.sign(off) * (steerBias || 1) || 1; break; }
  }
  const want = used; let diff = want - player.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.rotation.y += diff * Math.min(1, dt * 12);
  return moved;
}

/* ---------- 입력 ---------- */
const uiBusy = () => !document.querySelector('#pick').hidden || (window.HeukThrow && window.HeukThrow.active);
addEventListener('keydown', e => {
  if (uiBusy()) { keys.clear(); return; }
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); goal = null; route = []; e.preventDefault(); }
  if (k === 'e') sitting ? stand() : trySit();
  if (k === 'q' && carrying && curRoom === 'studio') putOnTable();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(UP, 0);
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return; down = null;
  if (sitting || fading) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  pendingPlace = null;
  // 문을 누르면 문 앞 매트로 걸어감
  const dh = ray.intersectObjects(ROOMS[curRoom].doors.map(d => d.g), true);
  if (dh.length) { const d = ROOMS[curRoom].doors.find(d => { let o = dh[0].object; while (o) { if (o === d.g) return true; o = o.parent; } return false; }); if (d) { goal = { x: d.x, z: d.z }; route = []; sitTarget = null; showMarker(V(d.x, 0, d.z)); setHint(`${ROOM_INFO[d.to].icon} ${ROOM_INFO[d.to].name}(으)로 가요`); return; } }
  if (curRoom === 'gallery') {
    const ph = ray.intersectObjects(PEDESTALS.map(p => p.g), true);
    if (ph.length) { const i = PEDESTALS.findIndex(p => { let o = ph[0].object; while (o) { if (o === p.g) return true; o = o.parent; } return false; });
      if (i >= 0) { const p = PEDESTALS[i]; if (carrying && !p.fixed && !p.piece) { walkToPedestal(i); setHint('받침대로 가서 내려놓아요'); } else pieceInfo(p); return; } }
  }
  if (curRoom !== 'studio') { const pt = V(); if (ray.ray.intersectPlane(ground, pt)) { goal = { x: pt.x, z: pt.z }; sitTarget = null; route = []; showMarker(pt); } return; }
  // 물레를 누르면 앉으러 감
  if (ray.intersectObjects([WHEELS[2].g, WHEELS[2].stool], true).length || (() => { const p = V(); ray.ray.intersectPlane(ground, p); return p && Math.hypot(p.x - WHEELS[2].g.position.x, p.z - WHEELS[2].g.position.z) < 0.55; })()) { setHint('선생님 자리예요. 1·2번 물레를 써요'); return; }
  const hits = ray.intersectObjects(WHEELS.slice(0, 2).map(w => w.g), true);
  if (hits.length) { const w = WHEELS.find(w => hits[0].object.parent === w.g || hits[0].object.parent?.parent === w.g); if (w) return trySit(w); }
  const pt = V(); if (ray.ray.intersectPlane(ground, pt)) { goal = { x: pt.x, z: pt.z }; sitTarget = null; route = []; showMarker(pt); }
});
renderer.domElement.addEventListener('wheel', e => { viewTarget = THREE.MathUtils.clamp(viewTarget + e.deltaY * 0.006, 3, 11); e.preventDefault(); }, { passive: false });
// 이동 목표 표시
const marker = add(scene, new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.8, depthWrite: false }), 0, 0.01, 0, { rx: -Math.PI / 2, cast: false });
marker.visible = false;
function showMarker(p) { marker.position.set(p.x, 0.012, p.z); marker.visible = true; marker.userData.t = 0; }

/* ---------- 앉기 / 일어서기 ---------- */
const sitBtn = $('#sitBtn'), hint = $('#hint');
function nearestFreeWheel() {
  const free = WHEELS.slice(0, 2);
  return free.sort((a, b) => a.seat.distanceTo(player.position) - b.seat.distanceTo(player.position))[0];
}
let route = [];
function trySit(w = nearestFreeWheel(), force = false) {
  if (curRoom !== 'studio') return;
  if (carrying) { setHint('작품을 들고 있어요. 전시관에 놓거나 작업대에 둬요'); sitTarget = null; return; }
  const approach = V(w.seat.x, 0, w.seat.z - 0.42), p = player.position;
  if (!force && Math.hypot(p.x - approach.x, p.z - approach.z) > 0.25) {
    // 물레 앞쪽에 있으면 옆으로 돌아서 뒤쪽 의자로
    const side = p.x < w.g.position.x ? -1 : 1, sx = w.g.position.x + side * 0.85;
    route = p.z > w.seat.z - 0.2 ? [{ x: sx, z: Math.max(p.z, w.g.position.z) }, { x: sx, z: approach.z }, { x: approach.x, z: approach.z }] : [{ x: approach.x, z: approach.z }];
    goal = route.shift(); sitTarget = w; setHint('물레 쪽으로 걸어가요'); return;
  }
  route = [];
  sitting = true; goal = null; sitTarget = w;
  seatOn(player, w); sitBtn.textContent = '일어서기';
  viewTarget = 5.4; setHint('흙을 물레 가운데에 올렸어요');
  if (window.HeukThrow) window.HeukThrow.open({ skin: PLAYER_KEY === 'B' ? '#f3bda6' : '#f0b39b', onExit: () => stand(), say: t => sayTeacher(t), onCarry: pc => startCarry(pc) });
}
function stand() {
  if (!sitting) return; sitting = false; standUp(player, sitTarget);
  player.position.set(sitTarget.seat.x, 0, sitTarget.seat.z - 0.42); player.rotation.y = Math.PI;
  sitBtn.textContent = '물레에 앉기'; viewTarget = 8.2; setHint('바닥을 누르거나 WASD로 걸어요');
}
sitBtn.onclick = () => (sitting ? stand() : trySit());
// 캐릭터 고르기
const pick = $('#pick');
function openPick() { pick.hidden = false; }
pick.querySelectorAll('.who').forEach(b => b.onclick = () => {
  PLAYER_KEY = b.dataset.k; try { localStorage.setItem('heukmaru-char', PLAYER_KEY); } catch {}
  resetPartner();
  pick.hidden = true; setHint(sitting ? '물레에 앉아 있어요' : '바닥을 누르거나 WASD로 걸어요');
});
$('#changeChar').onclick = openPick;
let hasChar = false; try { hasChar = !!localStorage.getItem('heukmaru-char'); } catch {}
if (!hasChar) openPick();
let hintTimer;
function setHint(t) { hint.textContent = t; hint.classList.remove('fade'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('fade'), 4000); }
setHint('바닥을 누르거나 WASD로 걸어요');

/* ---------- 말풍선: 지금 방에 있는 사람이 말함 ---------- */
const bubble = $('#bubble');
const TEACHER_LINES = ['천천히요, 물 먼저 묻혀요', '중심 잡히면 손 떼지 마세요', '오 잘하고 있네', '흙 반죽 같이 할래요?', '오늘 컵 두 개 만들었어요'];
let speaker = null, speakerH = 1.55, bubbleUntil = 0, nextBubble = 3000, tIdx = 0;
function say(obj, text, h = 1.55, ms = 3200) { speaker = obj; speakerH = h; bubble.textContent = text; bubble.hidden = false; bubbleUntil = performance.now() + ms; nextBubble = performance.now() + ms + 2600; }
function queueLine(n, text) { if (performance.now() > bubbleUntil) say(n.obj, text); }
function updateBubble(now) {
  if (now > nextBubble) {
    const here = NPCS.filter(n => n.room === curRoom).concat(partner.room === curRoom && partner.spot ? [partner] : []);
    if (curRoom === 'studio' && Math.random() < 0.4) say(teacher, TEACHER_LINES[tIdx++ % TEACHER_LINES.length], 1.25);
    else if (here.length) { const n = here[Math.floor(Math.random() * here.length)]; say(n.obj, n.spot ? n.spot.lines[Math.floor(Math.random() * n.spot.lines.length)] : ['흙 묻었어요 ㅎㅎ', '여기 너무 좋다', '다음엔 뭐 만들지?'][Math.floor(Math.random() * 3)]); }
    else nextBubble = now + 3000;
  }
  if (now > bubbleUntil || !speaker) { bubble.hidden = true; return; }
  const p = speaker.localToWorld(V(0, speakerH, 0)).project(camera);
  bubble.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; bubble.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
}

/* ---------- 방 이동 ---------- */
let curRoom = 'studio', doorLock = null, fading = false;
const fadeEl = document.createElement('div'); fadeEl.className = 'fade'; document.body.appendChild(fadeEl);
const roomNav = $('#rooms');
roomNav.innerHTML = ROOM_ORDER.map(id => `<button data-r="${id}" title="${ROOM_INFO[id].name}"><i>${ROOM_INFO[id].icon}</i><span>${ROOM_INFO[id].short}</span></button>`).join('');
roomNav.querySelectorAll('button').forEach(b => b.onclick = () => { if (!sitting && b.dataset.r !== curRoom) goRoom(b.dataset.r); });
function applyRoom(id, from) {
  ROOMS[curRoom].g.visible = false; curRoom = id; ROOMS[id].g.visible = true; colliders = ROOMS[id].cols;
  const d = ROOMS[id].doors.find(o => o.to === from) || ROOMS[id].doors[0];
  player.position.set(d.x + 0.75, 0, d.z); player.rotation.y = Math.PI / 2; doorLock = d;
  goal = null; route = []; sitTarget = null; marker.visible = false; pendingPlace = null;
  camFocus.set(player.position.x * 0.55 + 0.3, 0.55, player.position.z * 0.45);
  roomNav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.r === id));
  $('#placeName').textContent = ROOM_INFO[id].name;
  bubble.hidden = true; speaker = null; nextBubble = performance.now() + 1500;
  updateDock(); updateGalleryGlow();
  setHint(ROOM_HINT[id]());
}
const ROOM_HINT = {
  studio: () => carrying ? '왼쪽 🖼 전시관 문으로 들고 가요' : '물레를 누르면 앉아서 빚어요',
  dry: () => '빚은 기물을 말리고 굽을 깎는 방이에요 (굽깎기는 곧 열려요)',
  kiln: () => '초벌·재벌을 굽는 방이에요 (가마 굽기는 곧 열려요)',
  glaze: () => '유약을 골라 바르는 방이에요 (유약 바르기는 곧 열려요)',
  gallery: () => carrying ? '빛나는 빈 받침대를 눌러 작품을 놓아요' : '받침대를 누르면 작품 정보를 볼 수 있어요'
};
function goRoom(id) {
  if (fading || id === curRoom) return; fading = true; const from = curRoom;
  fadeEl.classList.add('on');
  setTimeout(() => { applyRoom(id, from); fadeEl.classList.remove('on'); setTimeout(() => fading = false, 250); }, 260);
}
function checkDoors() {
  if (sitting || fading) return;
  const p = player.position;
  for (const d of ROOMS[curRoom].doors) {
    const dist = Math.hypot(p.x - d.x, p.z - d.z);
    if (d === doorLock) { if (dist > 0.6) doorLock = null; continue; }
    if (dist < 0.36) { goRoom(d.to); return; }
  }
}

/* ---------- 작품 들고 다니기 · 전시 ---------- */
let carrying = null, pendingPlace = null, cheerUntil = 0;
function loadPieces() { try { return JSON.parse(localStorage.getItem('heukmaru-pieces') || '[]'); } catch { return []; } }
function savePieces(list) { try { localStorage.setItem('heukmaru-pieces', JSON.stringify(list.slice(0, 40))); } catch {} }
function pieceMesh(pc, scale) {
  const pts = [new THREE.Vector2(0.001, 0)], n = pc.r.length, H = pc.H;
  for (let k = 0; k < n; k++) pts.push(new THREE.Vector2(pc.r[k], H * k / (n - 1)));
  for (let k = n - 1; k >= 0; k--) { const y = H * k / (n - 1); if (y < pc.floorT) break; pts.push(new THREE.Vector2(Math.max(0.02, pc.r[k] - pc.t[k]), y)); }
  pts.push(new THREE.Vector2(0.001, pc.floorT));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), new THREE.MeshStandardMaterial({ color: pc.color || '#cfa47c', roughness: 0.8, side: THREE.DoubleSide }));
  m.castShadow = true; m.scale.setScalar(scale); return m;
}
function startCarry(pc) {
  carrying = pc; sitting = false;
  updateDock(); updateGalleryGlow();
  ROOMS.studio.doors.forEach(d => d.pulse = d.to === 'gallery');
  setHint('작품을 들었어요! 왼쪽 🖼 전시관 문으로 가요');
  say(teacher, '전시관에 놓으면 다들 볼 수 있어요!', 1.25, 3600);
}
function updateGalleryGlow() { PEDESTALS.forEach(p => p.glow.material.opacity = 0); }
function renderGallery() {
  const list = loadPieces();
  PEDESTALS.forEach((p, i) => { if (p.fixed) return; p.holder.clear(); const pc = list.find(o => o.place === 'gallery' && o.slot === i); p.piece = pc || null; if (pc) p.holder.add(pieceMesh(pc, 0.46)); });
}
function placeOn(i) {
  const ped = PEDESTALS[i]; if (!carrying || ped.fixed || ped.piece) return;
  const pc = carrying, m = pieceMesh(pc, 0.46); scene.add(m);
  const from = V(player.position.x, 0.62, player.position.z), to = V(ped.x, 0.87, ped.z), t0 = performance.now();
  carrying = null; cheerUntil = t0 + 1500; player.rotation.y = Math.PI;
  const anim = () => { const u = Math.min(1, (performance.now() - t0) / 650), e = 1 - Math.pow(1 - u, 3);
    m.position.lerpVectors(from, to, e); m.position.y += Math.sin(u * Math.PI) * 0.35; m.rotation.y = u * 1.2;
    if (u < 1) requestAnimationFrame(anim); else {
      scene.remove(m); const list = loadPieces(), it = list.find(o => o.id === pc.id); if (it) { it.place = 'gallery'; it.slot = i; } savePieces(list);
      renderGallery(); renderMyPieces(); updateDock();
      const n = NPCS.find(o => o.room === 'gallery'); if (n) say(n.obj, ['와, 잘 어울려요!', '이거 직접 만든 거예요?', '색 너무 예쁘다'][Math.floor(Math.random() * 3)], 1.55, 3200);
      setHint(`${pc.clayName || ''} ${pc.name}을(를) 전시했어요 ✓`);
    } };
  requestAnimationFrame(anim);
}
function putOnTable() {
  if (!carrying) return; const list = loadPieces(), it = list.find(o => o.id === carrying.id); if (it) it.place = 'table'; savePieces(list);
  carrying = null; renderMyPieces(); updateDock(); setHint('물레실 긴 작업대에 올려뒀어요');
}
function pieceInfo(p) {
  if (p.fixed) return setHint('선생님 작품이에요 · 전시용');
  if (!p.piece) return setHint(carrying ? '여기에 놓으려면 받침대를 눌러요' : '빈 받침대예요. 물레실에서 빚어 들고 와요');
  const pc = p.piece; setHint(`${pc.clayName || ''} ${pc.name} · ${'★'.repeat(pc.stars || 1)} ${pc.score || ''}점`);
}
/* 하단 버튼: 방마다 다름 */
const carryBtn = $('#carryBtn');
function updateDock() {
  const inStudio = curRoom === 'studio';
  sitBtn.hidden = !inStudio || !!carrying;
  carryBtn.hidden = !carrying || curRoom === 'gallery';
  const soon = { dry: '굽깎기 · 곧 열려요', kiln: '가마 굽기 · 곧 열려요', glaze: '유약 바르기 · 곧 열려요' }[curRoom];
  soonBtn.hidden = !soon || !!carrying; if (soon) soonBtn.textContent = soon;
  galleryBtn.hidden = curRoom !== 'gallery' || !carrying; 
}
const soonBtn = $('#soonBtn'), galleryBtn = $('#galleryBtn');
soonBtn.onclick = () => setHint('이 방 활동은 곧 열려요! 지금은 둘러볼 수 있어요');
carryBtn.onclick = () => { if (curRoom === 'studio') putOnTable(); else setHint('작업대는 물레실에 있어요. 🖼 전시관이나 🏺 물레실로 가요'); };
galleryBtn.onclick = () => { const i = PEDESTALS.findIndex(p => !p.fixed && !p.piece); if (i < 0) return setHint('받침대가 꽉 찼어요'); walkToPedestal(i); };
function walkToPedestal(i) { const p = PEDESTALS[i]; goal = { x: p.x, z: p.z + 0.62 }; route = []; pendingPlace = i; sitTarget = null; showMarker(V(goal.x, 0, goal.z)); }

function arrivePending() {
  if (pendingPlace === null) return; const i = pendingPlace; pendingPlace = null; const p = PEDESTALS[i];
  if (Math.hypot(player.position.x - p.x, player.position.z - (p.z + 0.62)) < 0.9) placeOn(i);
}
/* ---------- 루프 ---------- */
const clock = new THREE.Clock();
function frame() {
  if (window.HeukThrow && window.HeukThrow.active) { clock.getDelta(); requestAnimationFrame(frame); return; }
  const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
  const u = player.userData;
  if (!sitting) {
    let dx = 0, dz = 0;
    // 화면 기준 방향키: 위 = 화면 안쪽
    const fwd = V(-ISO.x, 0, -ISO.z).normalize(), right = V(fwd.z * -1, 0, fwd.x);
    if (keys.has('w') || keys.has('arrowup')) { dx += fwd.x; dz += fwd.z; }
    if (keys.has('s') || keys.has('arrowdown')) { dx -= fwd.x; dz -= fwd.z; }
    if (keys.has('d') || keys.has('arrowright')) { dx += right.x; dz += right.z; }
    if (keys.has('a') || keys.has('arrowleft')) { dx -= right.x; dz -= right.z; }
    let moving = false;
    if (dx || dz) moving = stepMove(dx, dz, dt);
    else if (goal) {
      const gx = goal.x - player.position.x, gz = goal.z - player.position.z;
      if (Math.hypot(gx, gz) < 0.06) { if (route.length) goal = route.shift(); else { goal = null; marker.visible = false; if (sitTarget) trySit(sitTarget); arrivePending(); } }
      else {
        moving = stepMove(gx, gz, dt);
        const d = Math.hypot(gx, gz);
        if (d < (goal.best ?? 1e9) - 0.02) { goal.best = d; goal.stuck = 0; } else goal.stuck = (goal.stuck || 0) + dt;
        if (!moving || goal.stuck > 1.2) { if (route.length) { goal = route.shift(); } else { goal = null; marker.visible = false; if (sitTarget && Math.hypot(player.position.x - sitTarget.seat.x, player.position.z - sitTarget.seat.z) < 1.1) trySit(sitTarget, true); arrivePending(); } }
      }
    }
    u.walkAmt += ((moving ? 1 : 0) - u.walkAmt) * Math.min(1, dt * 10);
    if (moving) u.phase += dt * 9;
  }
  // 앉아서 빚는 손 움직임
  drawPlayer(now); drawNPCs(now, dt); checkDoors();
  for (const d of ROOMS[curRoom].doors) d.glow.material.opacity = (carrying && d.to === 'gallery') || d.hover ? 0.45 + Math.sin(now * 0.006) * 0.3 : 0;
  if (curRoom === 'gallery') PEDESTALS.forEach(p => p.glow.material.opacity = carrying && !p.fixed && !p.piece ? 0.5 + Math.sin(now * 0.006) * 0.35 : 0);
  WHEELS.forEach((w, i) => { const spin = 0; w.head.rotation.y += spin * dt; if (w.clay) w.clay.rotation.y += spin * dt; });
  if (marker.visible) { marker.userData.t += dt; marker.material.opacity = Math.max(0, 0.8 - marker.userData.t * 0.6); }
  // 카메라: 캐릭터를 부드럽게 따라감
  const focus = window.__focus ? window.__focus : sitting ? V(sitTarget.g.position.x, 0.55, sitTarget.g.position.z - 0.25) : (innerWidth / innerHeight < 0.8 ? V(player.position.x * 0.92, 0.55, player.position.z * 0.85) : V(player.position.x * 0.55 + 0.3, 0.55, player.position.z * 0.45));
  camFocusTarget.copy(focus); camFocus.lerp(camFocusTarget, Math.min(1, dt * 4));
  viewSize += (viewTarget - viewSize) * Math.min(1, dt * 4); fitCamera();
  camera.position.copy(camFocus).addScaledVector(ISO, 30); camera.lookAt(camFocus);
  updateBubble(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fitCamera(); });
fitCamera(); frame();

// 검수용 핸들
// 선생님이 성형 중에 건네는 한마디 (성형 화면 위 말풍선)
let teacherBubble = null;
function sayTeacher(t) {
  if (!teacherBubble) { teacherBubble = document.createElement('div'); teacherBubble.className = 'tw-teacher'; document.body.appendChild(teacherBubble);
    const st = document.createElement('style'); st.textContent = '.tw-teacher{position:fixed;right:70px;top:66px;z-index:40;max-width:240px;display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.35;background:#f6f1e8;color:#3d342c;padding:8px 12px 8px 8px;border-radius:16px;box-shadow:0 6px 20px #0005;opacity:0;transition:opacity .3s;pointer-events:none}.tw-teacher.show{opacity:1}.tw-teacher img{width:40px;height:40px;object-fit:cover;object-position:top;border-radius:50%;background:#e9dfd1}@media(max-width:700px){.tw-teacher{right:8px;top:auto;bottom:250px;max-width:200px}}'; document.head.appendChild(st); }
  teacherBubble.innerHTML = ''; const img = document.createElement('img'); img.src = texCache.N_teacher?.image?.src || ''; const sp = document.createElement('span'); sp.textContent = t; teacherBubble.append(img, sp);
  teacherBubble.classList.add('show'); clearTimeout(teacherBubble._t); teacherBubble._t = setTimeout(() => teacherBubble.classList.remove('show'), 3800);
}
// 내가 빚은 작품: 긴 작업대 앞줄에 올려두기
const myPieces = new THREE.Group(); room.add(myPieces);
function renderMyPieces() {
  myPieces.clear();
  let list = []; try { list = JSON.parse(localStorage.getItem('heukmaru-pieces') || '[]'); } catch {}
  list = list.filter(pc => !pc.place || pc.place === 'table');
  list.slice(0, 8).forEach((pc, i) => {
    const pts = [new THREE.Vector2(0.001, 0)], n = pc.r.length, H = pc.H;
    for (let k = 0; k < n; k++) pts.push(new THREE.Vector2(pc.r[k], H * k / (n - 1)));
    for (let k = n - 1; k >= 0; k--) { const y = H * k / (n - 1); if (y < pc.floorT) break; pts.push(new THREE.Vector2(Math.max(0.02, pc.r[k] - pc.t[k]), y)); }
    pts.push(new THREE.Vector2(0.001, pc.floorT));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), M(pc.color || '#cfa47c', 0.85)); m.material.side = THREE.DoubleSide;
    m.castShadow = true; m.scale.setScalar(0.2); m.position.set(-1.35 + i * 0.55, 0.745, -1.38); myPieces.add(m);
  });
}
renderMyPieces(); addEventListener('heukmaru-pieces', renderMyPieces);
// 들고 있던 작품이 있으면 다시 들기(새로고침 대비)
{ const c = loadPieces().find(o => o.place === 'carry'); if (c) carrying = c; }
renderGallery(); applyRoom('studio', null); player.position.set(-2.6, 0, 2.4); doorLock = null; setHint('바닥을 누르거나 WASD로 걸어요');
window.__heukmaru = { camera, get partner(){return partner}, GLAZE_SPOT: (typeof GLAZE_SPOT!=='undefined'?GLAZE_SPOT:null), goRoom, applyRoom, get curRoom(){return curRoom}, get carrying(){return carrying}, startCarry, placeOn, walkToPedestal, PEDESTALS, NPCS, ROOMS, get goal(){return goal}, get route(){return route}, get sitting(){return sitting}, player, teacher, WHEELS, trySit, stand, seatOn, standUp, colliders, blocked, setView: v => { viewTarget = viewSize = v; } };
})();
