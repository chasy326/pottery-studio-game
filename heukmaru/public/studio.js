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
function randPot(seed) {
  seed = Math.abs(Math.round(seed));
  const s = seed % POT_SHAPES.length, g = GLAZES[(seed * 7 + 3) % GLAZES.length];
  return lathePot(POT_SHAPES[s], POT_HEIGHT[s], M(g, 0.55));
}

/* ---------- 충돌체 ---------- */
const colliders = [];   // {type:'circle',x,z,r} | {type:'box',x0,x1,z0,z1}
const circleCol = (x, z, r) => colliders.push({ type: 'circle', x, z, r });
const boxCol = (x0, x1, z0, z1) => colliders.push({ type: 'box', x0, x1, z0, z1 });

/* ---------- 방 ---------- */
const ROOM = { x0: -5, x1: 5, z0: -4, z1: 4, h: 3.0 };
const room = new THREE.Group(); scene.add(room);

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
// 가마 + 흙 보관통 (왼쪽 앞)
kiln(-4.25, 2.7);
bucket(-4.35, 1.6, '#f3f1ec', 0.6, 0.2); bucket(-3.85, 1.75, '#ece7de', 0.5, 0.18);
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
plant(4.3, -2.9, 1.15); plant(-4.4, 0.45, 0.95); plant(4.35, 3.2, 0.85);
bucket(4.3, 0.9, '#f1eee8', 0.5, 0.19); bucket(4.3, 1.45, '#d9d3c8', 0.42, 0.17);
// 바닥 러그 (물레 구역)
add(room, new THREE.PlaneGeometry(6.6, 1.9), M('#8d8678', 1), 0.6, 0.004, 0.65, { rx: -Math.PI / 2, cast: false });

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
const SPR = {"A_back": [95, 210], "A_big": [258, 517], "A_bowl1": [67, 123], "A_bowl2": [65, 124], "A_bq": [85, 212], "A_cheer": [83, 125], "A_front": [95, 209], "A_q": [89, 210], "A_side": [88, 212], "A_w1": [64, 114], "A_w2": [58, 110], "A_w3": [58, 110], "A_w4": [59, 110], "A_wheel": [77, 120], "B_back": [91, 215], "B_big": [201, 519], "B_bowl": [56, 119], "B_bq": [95, 214], "B_cheer": [86, 123], "B_f1": [58, 121], "B_front": [93, 216], "B_q": [91, 216], "B_side": [103, 215], "B_w1": [62, 112], "B_w2": [61, 115], "B_w3": [56, 117], "B_x1": [66, 122], "B_x2": [67, 122], "B_x3": [69, 121], "N_beanie": [144, 346], "N_bowls": [182, 340], "N_braid": [204, 335], "N_cap": [160, 336], "N_glasses": [162, 326], "N_smile": [175, 337], "N_teacher": [198, 321]};
const texLoader = new THREE.TextureLoader(), texCache = {};
function tex(name) { if (!texCache[name]) { const t = texLoader.load('/chars/' + name + '.png'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache[name] = t; } return texCache[name]; }
Object.keys(SPR).forEach(tex);                                  // 미리 불러오기
const CAM_YAW = Math.atan2(ISO.x, ISO.z);
const ELEV_FIX = 1 / Math.hypot(ISO.x, ISO.z);                   // 세운 판을 위에서 볼 때 줄어드는 높이 보정
const CHAR_H = 1.3;
const K = { sheet: CHAR_H / 211, small: CHAR_H / 112, poster: CHAR_H / 336 };
const kOf = n => n.startsWith('N_') ? K.poster : (/_(front|q|side|back|bq)$/.test(n) ? K.sheet : K.small);
const blobGeo = new THREE.CircleGeometry(0.26, 24), blobMat = new THREE.MeshBasicMaterial({ color: '#2a1f18', transparent: true, opacity: 0.22, depthWrite: false });
function makeActor() {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false }));
  mesh.rotation.y = CAM_YAW; room.add(mesh);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.scale.set(1, 0.6, 1); room.add(blob);
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
  A: { front: 'A_front', q: 'A_q', side: 'A_side', bq: 'A_bq', back: 'A_back', walk: ['A_w2', 'A_w3', 'A_w4', 'A_w3'], walkFront: ['A_w1', 'A_front'], sit: ['A_wheel'], big: 'A_big', cheer: 'A_cheer' },
  B: { front: 'B_front', q: 'B_q', side: 'B_side', bq: 'B_bq', back: 'B_back', walk: ['B_w1', 'B_w2'], walkFront: ['B_front'], sit: ['B_x1', 'B_x2', 'B_x3', 'B_x2'], big: 'B_big', cheer: 'B_cheer' }
};
let PLAYER_KEY = 'A';
try { PLAYER_KEY = localStorage.getItem('heukmaru-char') === 'B' ? 'B' : 'A'; } catch {}

const player = new THREE.Group(); room.add(player);
player.position.set(-2.6, 0, 2.4); player.rotation.y = Math.PI * 0.25;
player.userData = { pose: 'stand', walkAmt: 0, phase: 0 };
const playerActor = makeActor();
function drawPlayer(now) {
  const u = player.userData, S = SET[PLAYER_KEY], p = player.position;
  if (u.pose === 'sit') {
    const w = sitTarget, f = S.sit[Math.floor(now / 260) % S.sit.length];
    showFrame(playerActor, f, w.g.position.x, w.g.position.z - 0.12, false, 0, 1 + Math.sin(now * 0.008) * 0.008);
    playerActor.blob.scale.set(1.6, 0.9, 1);
    return;
  }
  playerActor.blob.scale.set(1, 0.6, 1);
  const a = screenAngle(player.rotation.y), aa = Math.abs(a), right = a > 0, walking = u.walkAmt > 0.35;
  const step = Math.floor(u.phase / Math.PI * 1.0), bob = walking ? Math.abs(Math.sin(u.phase)) * 0.035 : 0;
  let name, flip = false;
  if (aa < 0.42) { name = walking ? S.walkFront[step % S.walkFront.length] : S.front; }
  else if (aa < 1.95) { if (walking) { name = S.walk[step % S.walk.length]; } else name = aa < 1.2 ? S.q : S.side; flip = right; }
  else if (aa < 2.75) { name = S.bq; flip = !right; }
  else name = S.back;
  showFrame(playerActor, name, p.x, p.z, flip, bob);
}

/* 물레 차는 선생님 (포스터 캐릭터) — 3번 물레 자리 */
const teacher = new THREE.Group(); room.add(teacher);
const TW = WHEELS[2]; TW.g.visible = false; TW.stool.visible = false;
teacher.position.set(TW.g.position.x, 0, TW.g.position.z - 0.1);
const teacherActor = makeActor();
/* 공방 손님들 */
const VISITORS = [
  { name: 'N_beanie', x: -3.25, z: 0.95 }, { name: 'N_cap', x: -0.35, z: 2.75, flip: true },
  { name: 'N_glasses', x: 3.95, z: -1.55, flip: true }, { name: 'N_braid', x: 1.85, z: 2.45 },
  { name: 'N_smile', x: 2.05, z: -0.75 }
].map((v, i) => { const a = makeActor(); circleCol(v.x, v.z, 0.28); return { ...v, actor: a, seed: i * 1.7, obj: (() => { const g = new THREE.Group(); g.position.set(v.x, 0, v.z); room.add(g); return g; })() }; });
function drawNPCs(now) {
  showFrame(teacherActor, 'N_teacher', teacher.position.x, teacher.position.z, false, 0, 1 + Math.sin(now * 0.006) * 0.006);
  teacherActor.blob.scale.set(1.8, 0.9, 1);
  for (const v of VISITORS) showFrame(v.actor, v.name, v.x, v.z, !!v.flip, 0, 1 + Math.sin(now * 0.002 + v.seed) * 0.01);
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
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(UP, 0);
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return; down = null;
  if (sitting) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // 물레를 누르면 앉으러 감
  if (ray.intersectObjects([WHEELS[2].g, WHEELS[2].stool], true).length || (() => { const p = V(); ray.ray.intersectPlane(ground, p); return p && Math.hypot(p.x - WHEELS[2].g.position.x, p.z - WHEELS[2].g.position.z) < 0.55; })()) { setHint('선생님 자리예요. 1·2번 물레를 써요'); return; }
  const hits = ray.intersectObjects(WHEELS.slice(0, 2).map(w => w.g), true);
  if (hits.length) { const w = WHEELS.find(w => hits[0].object.parent === w.g || hits[0].object.parent?.parent === w.g); if (w) return trySit(w); }
  const pt = V(); if (ray.ray.intersectPlane(ground, pt)) { goal = { x: pt.x, z: pt.z }; sitTarget = null; route = []; showMarker(pt); }
});
renderer.domElement.addEventListener('wheel', e => { viewTarget = THREE.MathUtils.clamp(viewTarget + e.deltaY * 0.006, 3, 11); e.preventDefault(); }, { passive: false });
// 이동 목표 표시
const marker = add(room, new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.8, depthWrite: false }), 0, 0.01, 0, { rx: -Math.PI / 2, cast: false });
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
  if (window.HeukThrow) window.HeukThrow.open({ skin: PLAYER_KEY === 'B' ? '#f3bda6' : '#f0b39b', onExit: () => stand(), say: t => sayTeacher(t) });
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
  pick.hidden = true; setHint(sitting ? '물레에 앉아 있어요' : '바닥을 누르거나 WASD로 걸어요');
});
$('#changeChar').onclick = openPick;
let hasChar = false; try { hasChar = !!localStorage.getItem('heukmaru-char'); } catch {}
if (!hasChar) openPick();
let hintTimer;
function setHint(t) { hint.textContent = t; hint.classList.remove('fade'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('fade'), 4000); }
setHint('바닥을 누르거나 WASD로 걸어요');

/* ---------- 말풍선 (선생님) ---------- */
const bubble = $('#bubble');
const LINES = [['t', '천천히요, 물 먼저 묻혀요'], [0, '흙 반죽 같이 할래요?'], ['t', '중심 잡히면 손 떼지 마세요'], [3, '오늘 컵 두 개 만들었어요'], [2, '이 유약 색 예쁘다'], ['t', '오 잘하고 있네'], [4, '가마 언제 열어요?'], [1, '흙 묻었어요 ㅎㅎ']];
let speaker = teacher;
let lineIdx = 0, bubbleUntil = 0, nextBubble = 2500;
function updateBubble(now) {
  if (now > nextBubble) { const [who, text] = LINES[lineIdx++ % LINES.length]; speaker = who === 't' ? teacher : VISITORS[who].obj; bubble.textContent = text; bubble.hidden = false; bubbleUntil = now + 3200; nextBubble = now + 6500; }
  if (now > bubbleUntil) { bubble.hidden = true; return; }
  const p = speaker.localToWorld(V(0, speaker === teacher ? 1.25 : 1.55, 0)).project(camera);
  bubble.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; bubble.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
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
      if (Math.hypot(gx, gz) < 0.06) { if (route.length) goal = route.shift(); else { goal = null; marker.visible = false; if (sitTarget) trySit(sitTarget); } }
      else {
        moving = stepMove(gx, gz, dt);
        const d = Math.hypot(gx, gz);
        if (d < (goal.best ?? 1e9) - 0.02) { goal.best = d; goal.stuck = 0; } else goal.stuck = (goal.stuck || 0) + dt;
        if (!moving || goal.stuck > 1.2) { if (route.length) { goal = route.shift(); } else { goal = null; marker.visible = false; if (sitTarget && Math.hypot(player.position.x - sitTarget.seat.x, player.position.z - sitTarget.seat.z) < 1.1) trySit(sitTarget, true); } }
      }
    }
    u.walkAmt += ((moving ? 1 : 0) - u.walkAmt) * Math.min(1, dt * 10);
    if (moving) u.phase += dt * 9;
  }
  // 앉아서 빚는 손 움직임
  drawPlayer(now); drawNPCs(now);
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
  list.slice(0, 8).forEach((pc, i) => {
    const pts = [new THREE.Vector2(0.001, 0)], n = pc.r.length, H = pc.H;
    for (let k = 0; k < n; k++) pts.push(new THREE.Vector2(pc.r[k], H * k / (n - 1)));
    for (let k = n - 1; k >= 0; k--) { const y = H * k / (n - 1); if (y < pc.floorT) break; pts.push(new THREE.Vector2(Math.max(0.02, pc.r[k] - pc.t[k]), y)); }
    pts.push(new THREE.Vector2(0.001, pc.floorT));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), M('#cfa47c', 0.85)); m.material.side = THREE.DoubleSide;
    m.castShadow = true; m.scale.setScalar(0.2); m.position.set(-1.35 + i * 0.55, 0.745, -1.38); myPieces.add(m);
  });
}
renderMyPieces(); addEventListener('heukmaru-pieces', renderMyPieces);
window.__heukmaru = { get goal(){return goal}, get route(){return route}, get sitting(){return sitting}, player, teacher, WHEELS, trySit, stand, seatOn, standUp, colliders, blocked, setView: v => { viewTarget = viewSize = v; } };
})();
