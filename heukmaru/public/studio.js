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

/* 카메라: 캐릭터를 비스듬히 뒤에서 따라다니는 3인칭 시점 (산사 방식)
   화면 드래그 = 캐릭터를 중심으로 돌려보기 · 휠/두 손가락 = 확대·축소 */
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 120);
const ISO = V(1, 1.08, 1.22).normalize();   // 처음 시점 방향 (오른쪽 앞 위)
const CAM = { yaw: Math.atan2(ISO.x, ISO.z), pitch: Math.atan2(ISO.y, Math.hypot(ISO.x, ISO.z)), yawT: 0, pitchT: 0,
  YAW_MIN: -Infinity, YAW_MAX: Infinity, PITCH_MIN: 0.3, PITCH_MAX: 1.15 };   // 벽(뒤·왼쪽)이 화면을 가리지 않는 범위에서만 돌려요
CAM.yawT = CAM.yaw; CAM.pitchT = CAM.pitch;
const DEFAULT_VIEW = 5.2;
let viewSize = DEFAULT_VIEW, viewTarget = DEFAULT_VIEW;          // 보이는 세로 폭(m) — 작을수록 가까이
const camFocus = V(0, 0.6, 0), camFocusTarget = V(0, 0.6, 0);
const camDir = () => V(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
function fitCamera() {
  const a = innerWidth / innerHeight; camera.aspect = a;
  camera.updateProjectionMatrix();
}
function camDist() { const a = innerWidth / innerHeight, h = a < 0.8 ? viewSize * 1.25 : viewSize; return h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }

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
{ const keep = { ...C }; Object.assign(C, { plaster: '#f4f1ea', wainscot: '#b9b6af' });
  wall(0, ROOM.z0 - WT / 2, 10 + WT * 2, WT);                  // 뒷벽
  wall(ROOM.x0 - WT / 2, 0, WT, 8);                            // 왼벽
  Object.assign(C, keep); }
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
const DOOR_Z = [-2.0, 0.4];
function door(z, to) {
  const x = ROOM.x0, g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  add(g, new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshStandardMaterial({ color: '#3b312a', roughness: 1 }), 0.006, 1.0, 0, { ry: Math.PI / 2, cast: false });
  add(g, new THREE.PlaneGeometry(0.78, 1.72), new THREE.MeshBasicMaterial({ color: '#f3dfbf', transparent: true, opacity: 0.22 }), 0.009, 0.86, 0, { ry: Math.PI / 2, cast: false });
  const f = M(C.woodDark, 0.7);
  box(g, 0.04, 1.03, -0.54, 0.1, 2.06, 0.08, f); box(g, 0.04, 1.03, 0.54, 0.1, 2.06, 0.08, f); box(g, 0.04, 2.08, 0, 0.1, 0.1, 1.16, f);
  add(g, new THREE.PlaneGeometry(1.16, 0.29), new THREE.MeshBasicMaterial({ map: signTexture(ROOM_INFO[to].icon, ROOM_INFO[to].short), transparent: true, toneMapped: false }), 0.1, 2.34, 0, { ry: Math.PI / 2, cast: false });
  const mat = add(room, new THREE.PlaneGeometry(0.66, 0.98), M('#9b7b5a', 1), x + 0.42, 0.006, z, { rx: -Math.PI / 2, cast: false });
  const glow = add(room, new THREE.RingGeometry(0.4, 0.48, 36), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), x + 0.42, 0.014, z, { rx: -Math.PI / 2, cast: false });
  ROOMS[buildId].doors.push({ x: x + 0.42, z, to, g, glow, mat });
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

/* ====== 도면(2차 확정안) 그대로 짓기 — 도면 좌표 (0~10, 0~8) → 게임 좌표 (x-5, z-4) ====== */
// 캔버스 질감
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const speckle = (g, w, h, n, cols, s = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * w, Math.random() * h, s, s); } };
const TEX = {
  brick: (base, mortar) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const v = (r * 7 + c * 3) % 5; g.fillStyle = base[v % base.length]; g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 16 + 2, 60, 12); } }, 5, 3),
  tile: (a, b, line) => canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 3 ? a : b; g.fillRect(i * 64, j * 64, 64, 64); }
    g.strokeStyle = line; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    speckle(g, w, h, 600, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.05)']); }, 3, 2.4),
  terrazzo: () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#cdc7bc'; g.fillRect(0, 0, w, h); speckle(g, w, h, 1400, ['#9a948a', '#e9e5dd', '#7d776e', '#b6a58c', '#f3efe8'], 3); }, 3, 2),
  concrete: (c) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); speckle(g, w, h, 1500, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.06)'], 3); }, 3, 2.4),
  pegboard: (bg, hole) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = hole; for (let i = 8; i < w; i += 16) for (let j = 8; j < h; j += 16) { g.beginPath(); g.arc(i, j, 2.2, 0, 7); g.fill(); } }, 3, 2)
};
function floorTex(tex) { add(room, new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0.003, 0, { rx: -Math.PI / 2, cast: false }); }
function backPlane(x0, x1, y0, y1, mat, dz = 0.006) { return add(room, new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat, (x0 + x1) / 2, (y0 + y1) / 2, ROOM.z0 + dz, { cast: false }); }
function leftPlane(z0, z1, y0, y1, mat, dx = 0.006) { return add(room, new THREE.PlaneGeometry(z1 - z0, y1 - y0), mat, ROOM.x0 + dx, (y0 + y1) / 2, (z0 + z1) / 2, { ry: Math.PI / 2, cast: false }); }
/* 큰 창: 정원 풍경 + 원목 창틀(가로·세로 살) + 바닥 햇살 */
function bigWindow(side, a0, a1, y0, y1) {
  const f = M(C.woodDark, 0.7), w = a1 - a0, h = y1 - y0, m = (a0 + a1) / 2, ym = (y0 + y1) / 2, glass = new THREE.MeshBasicMaterial({ map: gardenTexture() });
  if (side === 'back') {
    backPlane(a0, a1, y0, y1, glass, 0.008); const z = ROOM.z0 + 0.05;
    box(room, m, y1 + 0.05, z, w + 0.16, 0.1, 0.1, f); box(room, m, y0 - 0.05, z + 0.05, w + 0.24, 0.08, 0.2, f);
    for (const x of [a0, m, a1]) box(room, x, ym, z, 0.08, h, 0.08, f); box(room, m, ym, z, w, 0.05, 0.05, f);
    add(room, new THREE.PlaneGeometry(w * 0.9, 1.6), new THREE.MeshBasicMaterial({ color: '#ffe7b8', transparent: true, opacity: 0.2, depthWrite: false }), m - 0.3, 0.008, ROOM.z0 + 1.3, { rx: -Math.PI / 2, cast: false }).rotation.z = -0.35;
  } else {
    leftPlane(a0, a1, y0, y1, glass, 0.008); const x = ROOM.x0 + 0.05;
    box(room, x, y1 + 0.05, m, 0.1, 0.1, w + 0.16, f); box(room, x + 0.05, y0 - 0.05, m, 0.2, 0.08, w + 0.24, f);
    for (const z of [a0, m, a1]) box(room, x, ym, z, 0.08, h, 0.08, f); box(room, x, ym, m, 0.05, 0.05, w, f);
    add(room, new THREE.PlaneGeometry(1.6, w * 0.9), new THREE.MeshBasicMaterial({ color: '#ffe7b8', transparent: true, opacity: 0.2, depthWrite: false }), ROOM.x0 + 1.3, 0.008, m + 0.3, { rx: -Math.PI / 2, cast: false }).rotation.z = 0.35;
  }
}
function wheelSet(x, z) { const w = wheel(x, z); w.stool = stool(w.seat.x, w.seat.z); return w; }
function potRow(x0, z, y, n, dx, seed = 1, scale = 1) { for (let i = 0; i < n; i++) { const p = randPot(seed + i * 3); p.scale.setScalar(scale); p.position.set(x0 + i * dx, y, z); room.add(p); } }
function crate(x, y, z, w = 0.9, d = 0.5, h = 0.32) { const g = new THREE.Group(); g.position.set(x, y, z); room.add(g); const m = M('#d8b07a', 0.85);
  box(g, 0, 0.02, 0, w, 0.04, d, m); for (const sz of [-1, 1]) box(g, 0, h / 2, sz * (d / 2 - 0.02), w, h, 0.04, m); for (const sx of [-1, 1]) box(g, sx * (w / 2 - 0.02), h / 2, 0, 0.04, h, d, m);
  for (let k = 1; k < 3; k++) box(g, 0, h * k / 3, d / 2 + 0.005, w, 0.03, 0.01, M('#b98e5f', 0.85)); return g; }
function metalShelf(x, z, w, d, levels, h, potsTone) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g); const post = M('#3d3d3d', 0.5, 0.5), deck = M('#9a9a96', 0.6, 0.3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02), 0.04, h, 0.04, post);
  const keep = POT_TONE; POT_TONE = potsTone;
  for (let i = 0; i < levels; i++) { const y = 0.12 + i * (h - 0.2) / (levels - 1); box(g, 0, y, 0, w, 0.03, d, deck); const n = Math.floor(w / 0.32);
    for (let k = 0; k < n; k++) { if ((i * 7 + k) % 5 === 4) continue; const p = randPot(i * 11 + k * 3 + 2); p.scale.setScalar(1.25); p.position.set(-w / 2 + 0.2 + k * (w - 0.4) / Math.max(1, n - 1), y + 0.015, 0); g.add(p); } }
  POT_TONE = keep; boxCol(x - w / 2 - 0.05, x + w / 2 + 0.05, z - d / 2 - 0.05, z + d / 2 + 0.05); return g;
}
function cubby(x, z, len, h = 2.6) {          // 합판 칸칸이 선반 (왼벽에 붙음, z 방향으로 길게)
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g); const ply = M('#cfa06a', 0.85), edge = M('#b98a55', 0.85);
  box(g, -0.24, h / 2, 0, 0.03, h, len, ply);
  const rows = 6, cols = Math.max(2, Math.round(len / 0.45)); const keep = POT_TONE; POT_TONE = ['#efe6d8', '#e7dccb', '#d9c7ad', '#f3ede2'];
  for (let r = 0; r <= rows; r++) box(g, 0, 0.05 + r * (h - 0.1) / rows, 0, 0.5, 0.03, len, ply);
  for (let c = 0; c <= cols; c++) box(g, 0, h / 2, -len / 2 + c * len / cols, 0.5, h, 0.03, edge);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if ((r * 5 + c) % 7 === 3) continue; const p = randPot(r * 13 + c * 5 + 1); p.scale.setScalar(1.15); p.position.set(0.02, 0.07 + r * (h - 0.1) / rows, -len / 2 + (c + 0.5) * len / cols); g.add(p); }
  POT_TONE = keep; boxCol(x - 0.3, x + 0.3, z - len / 2 - 0.03, z + len / 2 + 0.03); return g;
}
function trestle(x, z, w, d, h = 0.76) {      // 트레슬 작업대 (참고 3)
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g); const top = M('#d9a96a', 0.8), leg = M('#b9894f', 0.85);
  box(g, 0, h - 0.035, 0, w, 0.07, d, top);
  for (const sx of [-1, 1]) { box(g, sx * (w / 2 - 0.2), (h - 0.07) / 2, -d / 2 + 0.12, 0.07, h - 0.07, 0.07, leg, { rz: sx * 0.12 }); box(g, sx * (w / 2 - 0.2), (h - 0.07) / 2, d / 2 - 0.12, 0.07, h - 0.07, 0.07, leg, { rz: sx * 0.12 }); box(g, sx * (w / 2 - 0.2), 0.25, 0, 0.05, 0.05, d - 0.2, leg); }
  box(g, 0, 0.35, 0, w - 0.5, 0.05, 0.05, leg); boxCol(x - w / 2 - 0.05, x + w / 2 + 0.05, z - d / 2 - 0.05, z + d / 2 + 0.05); return g;
}

/* ───────────── 1. 물레 작업실 (참고 8·9·5 + 타공판 진열) ───────────── */
floorTex(TEX.concrete('#d8d4cc'));
add(room, new THREE.PlaneGeometry(5.6, 3.8), new THREE.MeshStandardMaterial({ map: TEX.terrazzo(), roughness: 0.8 }), 0.4, 0.006, 0.3, { rx: -Math.PI / 2, cast: false });   // 물레 구역 테라조
add(room, new THREE.PlaneGeometry(0.5, 0.3), M('#6f6a63', 0.6, 0.3), 0.4, 0.008, 2.0, { rx: -Math.PI / 2, cast: false });                                              // 배수구
bigWindow('back', 1.3, 4.6, 1.25, 2.75);                                                     // 4) 큰 원목 창
{ // 2) 뒷벽 공구 타공판
  backPlane(-3.8, -0.6, 1.4, 2.55, new THREE.MeshStandardMaterial({ map: TEX.pegboard('#d7b07a', '#9c7853'), roughness: 0.9 }), 0.01);
  const tools = ['#3d3a37', '#8a6a4a', '#b7b3ac', '#3d3a37', '#c7a04a', '#8a6a4a', '#b7b3ac', '#5a4636', '#c7a04a', '#3d3a37', '#8a6a4a', '#b7b3ac', '#3d3a37'];
  tools.forEach((c, i) => { const x = -3.6 + i * 0.235, len = 0.26 + (i % 3) * 0.08; box(room, x, 2.25 - len / 2, ROOM.z0 + 0.04, 0.035, len, 0.025, M(c, 0.6, i % 3 === 2 ? 0.6 : 0)); if (i % 2) sph(room, x, 2.25 - len, ROOM.z0 + 0.05, 0.035, M(c, 0.6)); });
  box(room, -2.2, 1.5, ROOM.z0 + 0.1, 3.0, 0.03, 0.16, M(C.wood, 0.8));
  for (let i = 0; i < 6; i++) cyl(room, -3.5 + i * 0.5, 1.58, ROOM.z0 + 0.1, 0.05, 0.04, 0.12, M(['#e7c95e', '#f2ede4', '#9fb3a3', '#f2ede4', '#c8a58a', '#e7c95e'][i], 0.8), 12);
}
{ // 3) 흙 반죽대 (철사 커터)
  table(-3.8, -3.0, 1.6, 1.0, 0.82); box(room, -3.8, 0.85, -3.0, 1.3, 0.06, 0.8, M('#9b958b', 0.95));
  add(room, new THREE.SphereGeometry(0.16, 10, 8), M(C.clay, 0.8), -3.6, 0.95, -2.95).scale.set(1.2, 0.7, 1);
  for (const sx of [-1, 1]) box(room, -3.8 + sx * 0.6, 1.1, -3.35, 0.03, 0.5, 0.03, M('#5f5e5b', 0.4, 0.6)); add(room, new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), M('#cfcfcf', 0.3, 0.8), -3.8, 1.33, -3.35, { rz: Math.PI / 2, cast: false });
}
// 5) 기물 선반 + 스펀지 개수대
sinkCounter(2.3, ROOM.z0 + 0.32, 1.8); shelfUnit(4.1, ROOM.z0 + 0.25, 1.3, 4); boxCol(3.4, 4.8, ROOM.z0, ROOM.z0 + 0.5);
// 1) 긴 원목 테이블 + 물레 6대 + 원목 스툴 (참고 9)
table(0.4, 0.3, 3.6, 1.2, 0.76);
for (let i = 0; i < 5; i++) { const p = randPot(i * 3 + 1); p.position.set(-0.9 + i * 0.6, 0.76, 0.1 + (i % 2) * 0.25); room.add(p); }
for (let i = 0; i < 5; i++) cyl(room, 1.9, 0.78 + i * 0.022, 0.55, 0.17, 0.17, 0.02, M('#d8cfc0', 0.9), 20);
box(room, -1.1, 0.79, 0.55, 0.3, 0.06, 0.22, M('#e6c35c', 0.9));
// 물레: 0·1 = 뒷줄(내가 쓰는 자리), 2 = 선생님, 3·4·5 = 나머지
const WHEELS = [wheelSet(-1.0, -1.0), wheelSet(0.3, -1.0), wheelSet(1.6, 2.0), wheelSet(1.6, -1.0), wheelSet(-1.0, 2.0), wheelSet(0.3, 2.0)];
const lamp = new THREE.PointLight('#ffd49a', 1.4, 5, 1.6); lamp.position.set(0.4, 2.2, 0.3); room.add(lamp);
pendant(-0.6, 0.3, 2.3); pendant(1.4, 0.3, 2.3);
plant(4.3, 2.8, 1.3); plant(-4.4, 2.75, 1.0);
{ // 8) 왼벽 흰 타공판 진열: 7색 앞치마 · 밀대 · 정리함 · 원형 배트 (참고: 두 번째 사진)
  const z0 = 1.0, z1 = 3.9;
  leftPlane(z0, z1, 1.1, 2.8, new THREE.MeshStandardMaterial({ map: TEX.pegboard('#fbfaf6', '#c9c4ba'), roughness: 0.9 }), 0.01);
  const APR = ['#3f6fb0', '#c83a32', '#b8302c', '#4f8a3a', '#6f7a3a', '#e0782a', '#e8b630'];
  APR.forEach((c, i) => { const z = z0 + 0.18 + i * 0.22, m = M(c, 0.9);
    box(room, ROOM.x0 + 0.05, 2.25, z, 0.03, 0.75, 0.17, m); box(room, ROOM.x0 + 0.07, 2.66, z, 0.02, 0.12, 0.1, m);
    box(room, ROOM.x0 + 0.075, 2.0, z, 0.015, 0.14, 0.12, M(c, 0.95)); box(room, ROOM.x0 + 0.05, 1.82, z + 0.05, 0.015, 0.2, 0.012, m); });
  for (let i = 0; i < 7; i++) add(room, new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), M(['#d9b98a', '#c9a271', '#e2c59a'][i % 3], 0.7), ROOM.x0 + 0.06, 1.75 - i * 0.08, z0 + 0.45, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) add(room, new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), M('#d9b98a', 0.7), ROOM.x0 + 0.06, 1.45, z0 + 0.9 + i * 0.07);
  const BIN = ['#e8b630', '#5aa0d8', '#e86a4a'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) box(room, ROOM.x0 + 0.09, 2.15 - r * 0.25, z0 + 1.75 + c * 0.2, 0.12, 0.13, 0.16, M(BIN[(r + c) % 3], 0.5, 0, { transparent: true, opacity: 0.85 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) add(room, new THREE.CylinderGeometry(0.17, 0.17, 0.025, 24), M(['#e2c08f', '#4a4744', '#3a7fc4'][(r + c) % 3], 0.7), ROOM.x0 + 0.06, 2.45 - r * 0.42, z1 - 0.5 + c * 0.38 - 0.1, { rz: Math.PI / 2 });
  // 아래 원목 벤치 + 흙 양동이 · 흙 포대
  table(ROOM.x0 + 0.42, 1.65, 0.55, 1.3, 0.5); bucket(-4.55, 3.7, '#f1eee8', 0.4, 0.17);
  add(room, new THREE.SphereGeometry(0.2, 10, 8), M('#cfc2ad', 0.95), -4.2, 0.16, 3.7).scale.set(1, 0.8, 1.3);
}
door(DOOR_Z[0], 'gallery'); door(DOOR_Z[1], 'dry');
spot(-2.2, -3.2, 'look', Math.PI, ['공구 정리 잘 돼 있다', '이 조각칼 좋아 보여요']);
spot(-2.75, -2.75, 'work', -Math.PI / 2, ['흙 꼬박밀기 중이에요', '공기 빼는 중!']);
spot(0.4, 1.15, 'look', Math.PI, ['오늘 만든 거 말리는 중', '작업대 정리해야지']);
spot(2.3, -3.0, 'work', Math.PI, ['도구 씻는 중이에요', '스펀지 어디 갔지?']);
spot(-4.0, 2.6, 'look', -Math.PI / 2, ['앞치마 색 예쁘다', '난 노란색 할래']);
spot(4.1, -2.9, 'look', Math.PI, ['선반 꽉 찼네', '이거 누가 만들었어요?']);

/* ───────────── 2. 건조·굽깎기실 (참고 3·4) ───────────── */
newRoom('dry', { C: { plaster: '#efe6d6', wainscot: '#e2d7c4' } });
floorTex(TEX.concrete('#d9d6cf'));
backPlane(-5, 5, 0, ROOM.h, new THREE.MeshStandardMaterial({ map: TEX.brick(['#b5674a', '#a85d42', '#bf7154', '#9f553c', '#b86a4c'], '#8e4c37'), roughness: 0.95 }), 0.012);
box(room, 0, ROOM.h - 0.05, ROOM.z0 + 0.08, 10.2, 0.12, 0.12, M('#2f2f2f', 0.5, 0.5));                 // 철골 보
for (const x of [-2.5, 2.5]) box(room, x, ROOM.h / 2, ROOM.z0 + 0.08, 0.12, ROOM.h, 0.12, M('#2f2f2f', 0.5, 0.5));
for (const [x, z] of [[-1, -1], [2.5, -0.5]]) add(room, new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.25, depthWrite: false }), x, 0.007, z, { rx: -Math.PI / 2, cast: false });   // 5) 천창 빛
// 1) 합판 칸칸이 선반 (문 사이사이)
cubby(ROOM.x0 + 0.3, -3.25, 1.4); cubby(ROOM.x0 + 0.3, -0.8, 1.1); cubby(ROOM.x0 + 0.3, 2.45, 2.8);
// 2) 뒷벽 나무 상자 건조대
{ const keep = POT_TONE; POT_TONE = ['#efe6d8', '#e7dccb', '#d9c7ad'];
  box(room, 0.4, 0.45, ROOM.z0 + 0.5, 8.4, 0.9, 0.6, M('#c99a63', 0.85)); boxCol(-3.85, 4.65, ROOM.z0, ROOM.z0 + 0.85);
  for (let i = 0; i < 7; i++) { crate(-3.2 + i * 1.15, 0.9, ROOM.z0 + 0.5, 1.0, 0.5); potRow(-3.5 + i * 1.15, ROOM.z0 + 0.5, 0.95, 3, 0.3, i * 4 + 1); }
  // 3) 트레슬 작업대 3개 + 상자 + 기물
  for (const [x, z] of [[-1.4, -0.5], [1.4, -0.5], [-1.4, 1.9]]) { trestle(x, z, 2.0, 1.0); crate(x - 0.4, 0.76, z, 0.8, 0.6, 0.25); potRow(x + 0.4, z, 0.76, 2, 0.3, Math.round(x * 3 + z * 5)); }
  POT_TONE = keep; }
{ // 4) 굽깎기 물레 (뒤집은 기물)
  const w = wheel(2.6, 1.6, false); w.stool = stool(w.seat.x, w.seat.z);
  const pot = lathePot([0.09, 0.115, 0.12, 0.115, 0.07, 0.04], 0.12, M('#cbbfae', 0.85), 28); pot.rotation.x = Math.PI; pot.position.y = 0.57; w.g.add(pot);
  for (let i = 0; i < 4; i++) box(room, 3.05 + i * 0.12, 0.47, 1.9, 0.04, 0.02, 0.3, M(['#8a6a4a', '#b7b3ac', '#3d3a37', '#c7a04a'][i], 0.6, i === 1 ? 0.6 : 0));
}
plant(4.3, 3.2, 0.9);
door(DOOR_Z[0], 'studio'); door(DOOR_Z[1], 'kiln');
spot(-4.1, 1.6, 'look', -Math.PI / 2, ['아직 꾸덕해요', '갈라진 데 없나 보는 중']);
spot(-1.0, -3.0, 'look', Math.PI, ['내일이면 다 마르겠다', '상자째 옮기면 돼요']);
spot(1.4, 0.15, 'work', Math.PI, ['배트에 올려 말리는 중', '물 스펀지로 다듬기']);
spot(-1.4, 2.55, 'look', Math.PI, ['굽 깎을 때 됐다']);
spot(3.4, 1.1, 'work', -Math.PI / 2, ['굽깎기 해볼까', '쓱쓱—']);

/* ───────────── 3. 가마실 (참고 1·2·6) ───────────── */
newRoom('kiln', { C: { plaster: '#ecd9bd', wainscot: '#e3cba8' } });
floorTex(TEX.tile('#c9825e', '#bf7753', '#a9654a'));
box(room, 0, ROOM.h - 0.1, ROOM.z0 + 0.12, 10.2, 0.2, 0.2, M('#8a5a34', 0.8)); box(room, ROOM.x0 + 0.12, ROOM.h - 0.1, 0, 0.2, 0.2, 8.2, M('#8a5a34', 0.8));
bigWindow('back', -4.7, -1.3, 0.7, 2.8); bigWindow('left', 1.4, 3.8, 0.7, 2.8);                  // 6) 큰 창 2개
{ // 1) 원뿔 후드 가마 + 금속 연통
  const g = new THREE.Group(); g.position.set(0, 0, -2.7); room.add(g);
  box(g, 0, 0.55, 0, 1.8, 1.1, 1.4, M('#e2ddd4', 0.95));
  box(g, 0, 0.45, 0.71, 0.9, 0.6, 0.02, M('#5a3a2a', 0.9)); for (let i = 0; i < 5; i++) cyl(g, -0.3 + i * 0.15, 0.2, 0.55, 0.05, 0.05, 0.6, M('#8a6040', 0.9), 8, { rx: Math.PI / 2 });
  cyl(g, 0, 1.7, 0, 0.28, 1.05, 1.2, M('#efe2c9', 0.9), 32); for (let i = 1; i < 6; i++) cyl(g, 0, 1.1 + i * 0.2, 0, 1.05 - i * 0.13, 1.06 - i * 0.13, 0.01, M('#c9b99c', 0.9), 32);
  cyl(g, 0, 2.6, 0, 0.18, 0.18, 1.4, M('#9a9893', 0.4, 0.6), 20);
  boxCol(-0.95, 0.95, -3.45, -1.95);
}
{ // 2) 흰 돔 장작가마 + 불빛 + 장작
  const g = new THREE.Group(); g.position.set(-3.6, 0, 2.6); room.add(g);
  const domeG = new THREE.SphereGeometry(0.95, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2); const d = add(g, domeG, M('#f4f1ea', 0.95), 0, 0.35, 0); d.scale.set(1, 1.35, 1);
  cyl(g, 0, 0.17, 0, 1.0, 1.0, 0.35, M('#ece7dd', 0.95), 28);
  box(g, 0.75, 0.75, 0.15, 0.2, 0.62, 0.62, M('#3a2a20', 0.95), { ry: 0.6 }); sph(g, 0.82, 0.62, 0.2, 0.17, new THREE.MeshBasicMaterial({ color: '#f08a3e' }));
  cyl(g, 0, 1.75, 0, 0.12, 0.12, 1.4, M('#2f2f2f', 0.5, 0.4), 12);
  for (let i = 0; i < 6; i++) cyl(g, 0.5 + (i % 3) * 0.22, 0.08 + Math.floor(i / 3) * 0.13, 1.05, 0.065, 0.065, 0.5, M('#8a6040', 0.9), 8, { rx: Math.PI / 2 });
  circleCol(-3.6, 2.6, 1.05); circleCol(-3.0, 3.65, 0.35);
  const fire = new THREE.PointLight('#ff9a4a', 0.8, 3, 2); fire.position.set(-2.8, 0.7, 2.8); room.add(fire);
}
{ // 3) 뚜껑 열린 스테인리스 전기가마
  const g = kiln(3.2, -0.8); const lid = cyl(g, 0, 1.55, -0.52, 0.49, 0.49, 0.07, M('#e9e1d2', 0.8), 32); lid.rotation.x = Math.PI / 2;
  cyl(g, 0, 1.1, 0, 0.37, 0.37, 0.02, M('#3a3530', 0.9), 32);
}
metalShelf(3.2, ROOM.z0 + 0.3, 2.8, 0.5, 4, 1.9, ['#c46a3d', '#b65e34', '#d27b4a', '#c0774f']);  // 4) 금속 선반 + 테라코타 항아리
{ // 5) 원목 테이블 + 테라코타 그릇 더미 + 유리구 조명
  table(-0.9, 1.05, 2.6, 1.3, 0.76); const keep = POT_TONE; POT_TONE = ['#c46a3d', '#b65e34', '#d27b4a'];
  for (let s2 = 0; s2 < 3; s2++) for (let k = 0; k < 4 - s2; k++) { const p = lathePot([0.03, 0.11, 0.16, 0.18, 0.18], 0.1, M(POT_TONE[k % 3], 0.8), 24); p.position.set(-1.8 + s2 * 0.7, 0.76 + k * 0.07, 1.0); room.add(p); }
  POT_TONE = keep;
  for (const x of [-1.6, -0.2]) { add(room, new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), M('#2b2b2b'), x, ROOM.h - 0.45, 1.05, { cast: false }); add(room, new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd9a0', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), x, ROOM.h - 0.95, 1.05, { cast: false }); }
}
door(DOOR_Z[0], 'dry'); door(DOOR_Z[1], 'glaze');
spot(0, -1.75, 'look', Math.PI, ['가마 언제 열어요?', '온도 올라가는 중이래요']);
spot(-2.3, 2.3, 'look', -Math.PI / 2, ['장작 타는 냄새 좋다', '불 조절 어렵대요']);
spot(3.2, 0.05, 'look', Math.PI, ['재벌 나왔대요!', '두근두근']);
spot(3.2, -2.9, 'work', Math.PI, ['항아리 정리 중', '선반 꽉 찼네']);
spot(-0.9, 1.95, 'look', Math.PI, ['초벌 나온 거 예쁘다', '이제 유약 바를 차례']);

/* ───────────── 4. 시유실 (참고 6·5·2) ───────────── */
newRoom('glaze', { C: { plaster: '#efe8dd', wainscot: '#e2dace' } });
floorTex(TEX.tile('#4a4744', '#45423f', '#3a3836'));
bigWindow('back', 1.2, 4.8, 1.1, 2.9); bigWindow('left', 1.3, 3.9, 0.7, 2.8);                    // 6·7) 큰 창 2개
{ // 2) 벽 선반 + 테스트 컵 (참고 6)
  const CUP = ['#f2efe8', '#d9d2c4', '#9db0b8', '#7f8c94'];
  for (const [x0, x1] of [[-4.0, -1.7], [-1.5, 0.8]]) { for (let k = 0; k < 4; k++) { const y = 1.4 + k * 0.4; box(room, (x0 + x1) / 2, y, ROOM.z0 + 0.13, x1 - x0, 0.04, 0.24, M('#c9a06c', 0.8));
    for (let i = 0; i < 7; i++) { const c = lathePot([0.04, 0.05, 0.052, 0.054], 0.1, M(CUP[(i + k) % 4], 0.5), 16); c.position.set(x0 + 0.17 + i * (x1 - x0 - 0.3) / 6, y + 0.02, ROOM.z0 + 0.13); room.add(c); } }
    for (const x of [x0 + 0.2, x1 - 0.2]) box(room, x, 1.95, ROOM.z0 + 0.04, 0.06, 1.3, 0.04, M('#c9a06c', 0.8)); }
}
{ // 1) 꼭지 달린 유약통 (바퀴)
  const GL = ['#7f9a8a', '#ebe6dc', '#6d8fb0', '#d4ad5a', '#a5643f'], NAMES = ['청자유', '백유', '하늘유', '황유', '녹갈유'];
  GL.forEach((c, i) => { const x = -3.8 + i * 0.9, z = -2.6, g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
    cyl(g, 0, 0.42, 0, 0.3, 0.28, 0.68, M(i % 2 ? '#e7dccb' : '#f4f1ea', 0.6), 24); cyl(g, 0, 0.77, 0, 0.31, 0.31, 0.03, M('#d8d2c6', 0.6), 24); cyl(g, 0, 0.75, 0, 0.27, 0.27, 0.02, M(c, 0.25), 24);
    box(g, 0, 0.2, 0.31, 0.06, 0.06, 0.08, M('#7a7570', 0.4, 0.6)); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) sph(g, a, 0.05, b, 0.045, M('#2f2f2f', 0.6));
    add(g, new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshBasicMaterial({ map: signTexture('', NAMES[i], '#5a4f45'), transparent: true, toneMapped: false }), 0, 0.5, 0.301, { cast: false });
    circleCol(x, z, 0.35); });
}
sinkCounter(3.6, ROOM.z0 + 0.35, 2.0);                                                                 // 3) 개수대
{ // 4) 스프레이 부스 (왼벽, 문 사이)
  const g = new THREE.Group(); g.position.set(ROOM.x0 + 0.45, 0, -0.8); room.add(g); const wm = M('#e4e1db', 0.5, 0.3);
  box(g, -0.38, 1.05, 0, 0.05, 1.5, 1.2, wm); box(g, 0, 1.05, -0.6, 0.8, 1.5, 0.05, wm); box(g, 0, 1.05, 0.6, 0.8, 1.5, 0.05, wm); box(g, 0, 1.8, 0, 0.8, 0.05, 1.2, wm); box(g, 0, 0.3, 0, 0.8, 0.6, 1.2, M('#d4d0c8', 0.6, 0.2));
  add(g, new THREE.CircleGeometry(0.26, 24), M('#8d8a84', 0.4, 0.5), -0.35, 1.15, 0, { ry: Math.PI / 2, cast: false }); cyl(g, 0, 0.66, 0, 0.12, 0.12, 0.04, M('#5f5e5b', 0.4, 0.5), 20);
  boxCol(ROOM.x0, ROOM.x0 + 0.9, -1.45, -0.15);
}
{ // 5) 리넨 덮은 작업대 + 테스트 타일
  table(-0.3, 0.8, 3.0, 1.2, 0.85); add(room, new THREE.PlaneGeometry(3.0, 0.6), M('#e8dfcd', 1, 0, { side: THREE.DoubleSide }), -0.3, 0.56, 1.41, { cast: false });
  const GL = ['#7f9a8a', '#2f3436', '#ebe6dc', '#a5643f', '#d4ad5a', '#6d8fb0']; GL.forEach((c, i) => { for (let k = 0; k < 2; k++) box(room, -1.5 + i * 0.45, 0.86, 0.6 + k * 0.4, 0.35, 0.02, 0.3, M(c, 0.3 + k * 0.3)); });
}
plant(4.3, 2.6, 1.1);
door(DOOR_Z[0], 'kiln'); door(DOOR_Z[1], 'gallery');
spot(-3.0, -1.9, 'work', Math.PI, ['유약 젓는 중이에요', '가라앉으면 색이 달라져요']);
spot(-1.2, -1.9, 'work', Math.PI, ['청자유 너무 예뻐', '두 번 담가볼까']);
spot(-0.3, 1.75, 'look', Math.PI, ['테스트 타일 보는 중', '이 색 조합 좋다']);
spot(-3.9, -0.8, 'work', -Math.PI / 2, ['스프레이로 뿌리는 중']);
spot(3.6, -3.0, 'work', Math.PI, ['붓 씻는 중', '스펀지로 굽 닦기']);

/* ───────────── 5. 전시관 (참고 7·3·8 + 계단식 벽 선반) ───────────── */
newRoom('gallery', { C: { plaster: '#f4f1ec', wainscot: '#ebe6dd' } });
floorTex(TEX.tile('#ebe4d8', '#e6dfd2', '#ddd5c7'));
backPlane(-5, 5, 0, ROOM.h, new THREE.MeshStandardMaterial({ map: TEX.brick(['#f4f1ec', '#f1ede7', '#f6f3ee'], '#e2ddd5'), roughness: 0.95 }), 0.012);
bigWindow('left', 1.2, 3.8, 0.65, 2.8);                                                                 // 6) 큰 창
// 1) 뒷벽 원목 선반 4칸 (공방 작품)
for (const x of [-3.55, -1.25, 1.05, 3.35]) shelfUnit(x, ROOM.z0 + 0.25, 2.1, 6); boxCol(-4.65, 4.45, ROOM.z0, ROOM.z0 + 0.5);
const PEDESTALS = [];
// 5) 흰 전시 벽 + 계단식 벽 선반 36칸 (참고: 첫 번째 사진)
box(room, 0.85, 1.25, -2.15, 7.7, 2.5, 0.2, M('#ece6dc', 0.95)); boxCol(-3.05, 4.75, -2.3, -2.0);
for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
  const x = -2.75 + c * 0.83 + (r % 2) * 0.3, y = 0.4 + r * 0.45, z = -1.9, g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, y, 0, 0.42, 0.035, 0.28, M('#ffffff', 0.7)); box(g, 0.15, y - 0.09, -0.08, 0.04, 0.15, 0.12, M('#f2f0eb', 0.7));
  const holder = new THREE.Group(); holder.position.y = y + 0.02; g.add(holder);
  const glow = add(g, new THREE.RingGeometry(0.11, 0.15, 28), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), 0, y + 0.022, 0, { rx: -Math.PI / 2, cast: false });
  PEDESTALS.push({ x, z, g, glow, holder, scale: 0.28, wall: true, stand: { x, z: z + 0.6 } });
}
// 2) 바닥 받침대 9개 — 오른벽 한 줄 · 가운데 섬 · 왼쪽 두 개 (사이사이 1m 넘게 비워 지나다니기 편하게)
for (const [x, z] of [[4.3, -0.7], [4.3, 0.8], [4.3, 2.3], [0.0, 0.2], [1.7, 0.2], [0.0, 1.7], [1.7, 1.7], [-2.9, 0.3], [-2.9, 1.8]]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, 0.42, 0, 0.55, 0.84, 0.55, M('#f6f4ef', 0.85)); box(g, 0, 0.855, 0, 0.59, 0.03, 0.59, M('#e6dfd3', 0.7));
  const glow = add(g, new THREE.RingGeometry(0.38, 0.45, 36), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), 0, 0.012, 0, { rx: -Math.PI / 2, cast: false });
  const holder = new THREE.Group(); holder.position.y = 0.87; g.add(holder);
  boxCol(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
  const cx = 0.85 - x, cz = 1.0 - z, cl = Math.hypot(cx, cz) || 1;          // 방 가운데 쪽에 서서 놓아요
  PEDESTALS.push({ x, z, g, glow, holder, scale: 0.42, wall: false, stand: { x: x + cx / cl * 0.66, z: z + cz / cl * 0.66 } });
}
// 벽 선반 9칸에는 공방 컵을 미리 진열 (참고 사진처럼 색이 다른 컵들)
{ const CUPC = ['#5f9a8f', '#7b4a2e', '#a5643f', '#9db8b0', '#3f3a36', '#6fa3a0', '#8a5a3a', '#c98a4a', '#4f7f86'];
  [2, 6, 10, 15, 19, 23, 29, 33, 40].forEach((i, k) => { const prof = [[0.05, 0.075, 0.085, 0.09, 0.088], [0.06, 0.08, 0.07, 0.08, 0.09], [0.05, 0.07, 0.08, 0.1, 0.105]][k % 3];
    const c = lathePot(prof, 0.2 + (k % 3) * 0.04, M(CUPC[k], 0.35), 20); PEDESTALS[i].holder.add(c); PEDESTALS[i].fixed = true; }); }
// 선생님 작품 3점 (고정) — 바닥 받침대
[[45, 3], [48, 11], [53, 7]].forEach(([i, seed]) => { const p = randPot(seed); p.scale.setScalar(2.3); PEDESTALS[i].holder.add(p); PEDESTALS[i].fixed = true; });
// 3) 벤치 · 4) 안내 데스크 · 화분
box(room, -3.2, 0.22, 3.55, 1.8, 0.08, 0.5, M(C.wood, 0.8)); for (const sx of [-0.8, 0.8]) box(room, -3.2 + sx, 0.1, 3.55, 0.08, 0.2, 0.45, M(C.woodDark, 0.8)); boxCol(-4.15, -2.25, 3.25, 3.85);
table(-4.25, -0.8, 0.9, 1.1, 0.95); plant(4.45, 3.6, 1.0); plant(-4.45, 2.55, 0.9);
wallSign(-3.4, 2.7, '🖼️', '흙마루 전시관', '#3a332e', 1.4);
door(DOOR_Z[0], 'glaze'); door(DOOR_Z[1], 'studio');
PEDESTALS.forEach((p, i) => { if (!p.wall && i % 2 === 0) spot(p.x + 0.55, p.z + 0.5, 'look', Math.PI, ['와 이거 예쁘다', '유약 흐른 게 멋져요', '누구 작품이에요?', '저도 이런 거 만들고 싶다']); });
spot(4.45, -1.45, 'look', Math.PI, ['벽에 컵들 귀엽다', '저 청자 컵 갖고 싶어']);
spot(-3.4, -1.5, 'look', Math.PI, ['색이 다 달라요', '하나씩 보는 재미가 있네']);

// 짓기 끝: 기본은 물레 작업실
room = STUDIO; colliders = STUDIO_COLS; buildId = 'studio';

/* ====== 열린 마을 — 숲속 마당 하나에 공방 다섯 채. 문 화면 전환 없이 걸어서 드나들어요 ======
   방마다 길찾기·충돌은 그 방 좌표(예전 그대로)로 하고, 그림만 마을 자리로 옮겨 놓아요.
   건물 안에 들어가면 지붕은 걷히고 카메라 쪽 벽은 낮아져서 안이 보여요. */
ROOM_INFO.yard = { name: '흙마루 마당', icon: '🌳', short: '마당' };
const YAW0 = CAM.yaw;
const LAYOUT = {
  studio:  { x: 0,   z: -10, r: 0 },            // 북쪽 가운데 — 물레 작업실
  dry:     { x: -11.6, z: -10, r: 0 },            // 북서 — 건조·굽깎기
  kiln:    { x: 11.6,  z: -10, r: 0 },            // 북동 — 가마실
  glaze:   { x: -15, z: 4,   r: Math.PI / 2 },  // 서쪽, 동쪽(마당)을 봄 — 시유실
  gallery: { x: 15,  z: 4,   r: -Math.PI / 2 }  // 동쪽, 서쪽(마당)을 봄 — 전시관
};
const BUILDINGS = Object.keys(LAYOUT);
const BENCH_DEF = [                         // [x, z, 회전, 방석 색, 정자]
  [-6.6, 10.8, 0, ['#c8584a', '#4f6f9a', '#d9a441', '#6f8f5a'], false],
  [-10.0, 12.2, 0, ['#8a5a8c', '#d98a5a', '#5a8a8a', '#c8584a'], false],
  [6.6, 5.2, 0, ['#4f6f9a', '#d9a441', '#c8584a', '#8a5a8c'], false],
  [8.8, 0.0, Math.PI / 2, ['#6f8f5a', '#c8584a', '#4f6f9a', '#d98a5a'], false],
  [3.0, -3.4, 0, ['#d9a441', '#5a8a8a', '#c8584a', '#6f8f5a'], true]
];
const BENCH_SEAT_L = [[-0.8, 0.35], [-0.8, -0.35], [1.05, 0.38], [1.05, -0.38]];
const BENCHES = [];
const YARD = new THREE.Group(); scene.add(YARD);
const SCENERY = new THREE.Group(); scene.add(SCENERY);       // 숲·산·땅 (가림 처리 대상 아님)
ROOMS.yard = { g: YARD, cols: [], doors: [], spots: [], b: { x0: -20.3, x1: 20.3, z0: -15.1, z1: 13.6 }, cell: 0.25 };
const toWorld = (id, x, z, y = 0) => ROOMS[id].g.localToWorld(V(x, y, z));
const toLocal = (id, v) => ROOMS[id].g.worldToLocal(v.clone());
function colHit(cols, x, z, r) {
  for (const c of cols) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true; }
    else if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
  }
  return false;
}
const yardCol = {
  circle: (x, z, r) => ROOMS.yard.cols.push({ type: 'circle', x, z, r }),
  box: (x0, x1, z0, z1) => ROOMS.yard.cols.push({ type: 'box', x0, x1, z0, z1 })
};
const SH = {
  lower: M('#b4a996', 0.95), plaster: M('#f2ece1', 0.95), cap: M('#3a332e', 0.7), post: M('#6b4a32', 0.8),
  stub: M('#a99d89', 0.95)
};
const tileTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#56575c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { const gr = g.createLinearGradient(i * 32, 0, i * 32 + 32, 0); gr.addColorStop(0, '#3e3f44'); gr.addColorStop(0.5, '#6d6e73'); gr.addColorStop(1, '#3e3f44'); g.fillStyle = gr; g.fillRect(i * 32, 0, 32, h); }
  g.fillStyle = 'rgba(0,0,0,.28)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * 32 + 28, w, 4);
}, 1, 1);
function roofMat(len, wid) { const t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(len / 0.5, wid / 0.5); return t; }
function shellWall(parent, x, z, w, d, h) {
  box(parent, x, 0.45, z, w, 0.9, d, SH.lower);
  box(parent, x, 0.9 + (h - 0.9) / 2, z, w, h - 0.9, d, SH.plaster);
  box(parent, x, h + 0.03, z, w + 0.002, 0.06, d + 0.002, SH.cap);
}
function buildShell(id) {
  const R0 = ROOMS[id], g = R0.g, H = ROOM.h, dx = R0.dx, zf = ROOM.z1 + WT / 2, xr = ROOM.x1 + WT / 2,
    gap0 = dx - 0.7, gap1 = dx + 0.7, xa = ROOM.x0 - WT, xb = ROOM.x1 + WT;
  const S = { front: new THREE.Group(), frontLow: new THREE.Group(), right: new THREE.Group(), rightLow: new THREE.Group(), roof: new THREE.Group() };
  Object.values(S).forEach(o => g.add(o)); S.frontLow.visible = S.rightLow.visible = false;
  // 앞벽 (문 자리만 비움) · 오른벽
  for (const [a, b] of [[xa, gap0], [gap1, xb]]) { shellWall(S.front, (a + b) / 2, zf, b - a, WT, H); box(S.frontLow, (a + b) / 2, 0.17, zf, b - a, 0.34, WT, SH.stub); }
  box(S.front, dx, (2.3 + H) / 2, zf, 1.4, H - 2.3, WT, SH.plaster); box(S.front, dx, H + 0.03, zf, 1.402, 0.06, WT + 0.002, SH.cap);
  shellWall(S.right, xr, 0, WT, 8, H); box(S.rightLow, xr, 0.17, 0, WT, 0.34, 8, SH.stub);
  // 바깥 기둥 (한옥처럼 짙은 나무)
  const posts = [[xa + 0.1, ROOM.z0 - WT + 0.1, 'bl'], [xb - 0.1, ROOM.z0 - WT + 0.1, 'br'], [xa + 0.1, ROOM.z1 + WT - 0.1, 'fl'], [xb - 0.1, ROOM.z1 + WT - 0.1, 'fr'],
    [ROOM.x0 + 3.4, ROOM.z1 + WT + 0.02, 'f'], [ROOM.x1 - 3.4, ROOM.z1 + WT + 0.02, 'f']];
  S.posts = [];
  for (const [px, pz, tag] of posts) if (Math.abs(px - dx) > 0.95 || Math.abs(pz) < 4) S.posts.push({ m: box(g, px, H / 2, pz, 0.25, H + 0.07, 0.25, SH.post), tag });
  box(S.front, 0, H - 0.12, ROOM.z1 + WT + 0.03, 10.6, 0.16, 0.06, SH.post);           // 앞 처마 아래 도리
  // 문틀 · 문패
  const fr = new THREE.Group(); fr.position.set(dx, 0, zf); S.front.add(fr);
  box(fr, -0.74, 1.15, 0, 0.13, 2.3, WT + 0.08, SH.post); box(fr, 0.74, 1.15, 0, 0.13, 2.3, WT + 0.08, SH.post); box(fr, 0, 2.34, 0, 1.6, 0.13, WT + 0.08, SH.post);
  box(g, dx, 0.012, zf, 1.4, 0.024, WT, M('#8a6a4c', 0.85), { cast: false });
  S.shade = add(fr, new THREE.PlaneGeometry(1.36, 2.26), new THREE.MeshBasicMaterial({ color: '#2a221c' }), 0, 1.15, 0.02, { cast: false });
  add(fr, new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: signTexture(ROOM_INFO[id].icon, ROOM_INFO[id].short), transparent: true, toneMapped: false }), (dx > 2.5 ? -1.65 : 1.65), 1.9, WT / 2 + 0.02, { cast: false });
  // 문 앞 디딤돌 (바깥)
  add(g, new THREE.CylinderGeometry(0.55, 0.6, 0.05, 10), M('#a8a196', 0.95), dx, 0.0, ROOM.z1 + 0.75, { cast: false });
  // 지붕: 기와 맞배지붕
  const ox = 5.85, oz = 4.95, rise = 1.75, ang = Math.atan2(rise, oz), sl = Math.hypot(rise, oz) + 0.08, tm = roofMat(ox * 2, sl), dark = M('#4a3a2f', 0.9);
  S.roof.position.y = H + 0.06;
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ox * 2, 0.14, sl), [dark, dark, new THREE.MeshStandardMaterial({ map: tm, roughness: 0.85 }), dark, dark, dark]);
    m.position.set(0, rise / 2, s * oz / 2); m.rotation.x = s * ang; m.castShadow = true; m.receiveShadow = true; S.roof.add(m);
  }
  box(S.roof, 0, rise + 0.06, 0, ox * 2 + 0.3, 0.22, 0.34, M('#3b3c40', 0.8));                 // 용마루
  for (const sx of [-1, 1]) box(S.roof, sx * (ox + 0.2), rise + 0.16, 0, 0.3, 0.42, 0.34, M('#3b3c40', 0.8), { rz: sx * 0.35 });
  const tri = new THREE.Shape([new THREE.Vector2(-(ROOM.z1 + WT), 0), new THREE.Vector2(ROOM.z1 + WT, 0), new THREE.Vector2(0, rise * (ROOM.z1 + WT) / oz)]);
  for (const sx of [-1, 1]) add(S.roof, new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: '#efe7da', roughness: 0.95, side: THREE.DoubleSide }), sx * (ROOM.x1 + WT), 0, 0, { ry: Math.PI / 2 });
  R0.shell = S;
  // 드나드는 문 (안쪽 · 마당 쪽)
  const glowMat = () => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false });
  const inGlow = add(g, new THREE.RingGeometry(0.4, 0.48, 36), glowMat(), dx, 0.016, ROOM.z1 - 0.7, { rx: -Math.PI / 2, cast: false });
  const out = toWorld(id, dx, ROOM.z1 + 1.1), pass = toWorld(id, dx, ROOM.z1 - 0.3);
  R0.doors.push({ x: dx, z: ROOM.z1 - 0.7, to: 'yard', g: fr, glow: inGlow, spawn: { x: dx, z: ROOM.z1 - 0.9, yaw: Math.PI }, dest: { room: 'yard', x: out.x, z: out.z } });
  const outGlow = add(YARD, new THREE.RingGeometry(0.4, 0.48, 36), glowMat(), out.x, 0.016, out.z, { rx: -Math.PI / 2, cast: false });
  ROOMS.yard.doors.push({ x: out.x, z: out.z, to: id, g: fr, glow: outGlow, spawn: { x: out.x, z: out.z, yaw: LAYOUT[id].r }, dest: { room: id, x: dx, z: ROOM.z1 - 1.1 }, pass: { x: pass.x, z: pass.z } });
  // 마당에서 본 건물 자리 (문 칸만 비움)
  const rect = (x0, x1, z0, z1) => { const a = toWorld(id, x0, z0), b = toWorld(id, x1, z1); yardCol.box(Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)); };
  rect(xa, xb, ROOM.z0 - WT, ROOM.z1 - 0.6); rect(xa, gap0, ROOM.z1 - 0.6, ROOM.z1 + WT); rect(gap1, xb, ROOM.z1 - 0.6, ROOM.z1 + WT);
}
for (const id of BUILDINGS) {
  const R0 = ROOMS[id], L = LAYOUT[id], g = R0.g;
  for (const d of R0.doors) { d.g.visible = false; d.glow.visible = false; if (d.mat) d.mat.visible = false; }
  g.updateMatrixWorld(true); R0.backW = []; R0.leftW = [];                 // 원래 뒷벽·왼벽에 붙은 것들 (방 좌표에서 재요)
  for (const o of g.children) { if (!o.visible) continue; const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) continue;
    if (bb.max.z < ROOM.z0 + 0.14 && bb.min.x > ROOM.x0 - 0.3) R0.backW.push(o); else if (bb.max.x < ROOM.x0 + 0.14) R0.leftW.push(o); }
  g.position.set(L.x, 0, L.z); g.rotation.y = L.r; g.visible = true; g.updateMatrixWorld(true);
  R0.b = { x0: ROOM.x0, x1: ROOM.x1, z0: ROOM.z0, z1: ROOM.z1 }; R0.cell = 0.1;
  for (const d of R0.doors) { d.g.visible = false; d.glow.visible = false; if (d.mat) d.mat.visible = false; }   // 예전 방-방 문은 닫아요
  R0.doors = [];
  let dx = 0;                                                    // 앞벽에서 안쪽이 비어 있는 자리를 문으로
  for (const c of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, 3, -3, 3.5, -3.5]) {
    let ok = true; for (let z = 2.4; z <= 3.9 && ok; z += 0.15) for (const o of [-0.5, 0, 0.5]) if (colHit(R0.cols, c + o, z, 0.26)) { ok = false; break; }
    if (ok) { dx = c; break; }
  }
  R0.interior = g.children.filter(o => { if (!o.visible) return false; if (o.isLight) return true; const sz = new THREE.Box3().setFromObject(o).getSize(V()); return !(Math.max(sz.x, sz.z) > 4.5); });
  R0.backLow = box(g, 0, 0.17, ROOM.z0 - WT / 2, 10 + WT * 2, 0.34, WT, SH.stub); R0.leftLow = box(g, ROOM.x0 - WT / 2, 0.17, 0, WT, 0.34, 8, SH.stub);
  R0.backLow.visible = R0.leftLow.visible = false; R0.lowB = R0.lowL = false;
  R0.dx = dx; buildShell(id); R0.inState = true;
  const S = R0.shell, fadeGroup = list => { const ms = []; list.forEach(o => o.traverse(m => m.isMesh && ms.push(m))); ms.forEach(m => m.userData.fadeSet = ms); };
  fadeGroup([S.roof]); fadeGroup([S.front]); fadeGroup([S.right]); fadeGroup(R0.backW); fadeGroup(R0.leftW);    // 가릴 땐 벽 한 면을 통째로 흐리게
}
YARD.updateMatrixWorld(true);

/* --- 하늘 · 땅 · 숲 · 산 --- */
scene.background = canvasTex(4, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#79aed6'); gr.addColorStop(0.5, '#b7d5e8'); gr.addColorStop(0.8, '#e3ebe6'); gr.addColorStop(1, '#efe8d6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
scene.background.wrapS = scene.background.wrapT = THREE.ClampToEdgeWrapping; scene.background.repeat.set(1, 1);
scene.fog = new THREE.Fog('#dfe6e0', 55, 190);
camera.far = 260; camera.updateProjectionMatrix();
const rnd = (() => { let s = 20251111; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
{
  const grass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7f9a5a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2600, ['#6f8d4d', '#8fa866', '#748f52', '#9bb070', '#66834a'], 3); }, 70, 70);
  add(SCENERY, new THREE.CircleGeometry(200, 48), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }), 0, -0.04, 0, { rx: -Math.PI / 2, cast: false });
  const dirt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d7c6a4'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2200, ['#c9b690', '#e2d4b6', '#bfae8c', '#d0c09e', '#ece2cc'], 3); }, 12, 9);
  add(SCENERY, new THREE.PlaneGeometry(41.6, 30), new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 }), 0, -0.02, -0.8, { rx: -Math.PI / 2, cast: false });
  // 마을 밖 오솔길
  add(SCENERY, new THREE.PlaneGeometry(3.2, 60), new THREE.MeshStandardMaterial({ map: dirt, roughness: 1, color: '#e9dcc4' }), 0, -0.03, 44, { rx: -Math.PI / 2, cast: false });
  // 산 (멀리, 안개에 흐리게)
  const mcol = ['#6e8c78', '#7b977f', '#86a08f', '#5f7d6c', '#91a99a'];
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2 + rnd() * 0.2, d = 125 + rnd() * 45, r = 32 + rnd() * 30, h = 22 + rnd() * 34;
    const m = add(SCENERY, new THREE.ConeGeometry(r, h, 7, 1), M(mcol[i % mcol.length], 1), Math.sin(a) * d, h / 2 - 2, Math.cos(a) * d, { cast: false }); m.rotation.y = rnd() * 3; m.receiveShadow = false;
  }
  // 숲 (소나무 · 활엽수)
  const pts = [];
  for (let k = 0; k < 4000 && pts.length < 520; k++) {
    const x = (rnd() * 2 - 1) * 95, z = (rnd() * 2 - 1) * 95, d = Math.hypot(x, z);
    if (d > 92) continue; if (Math.abs(x) < 24 && z > -19 && z < 17.5) continue; if (Math.abs(x) < 4.5 && z > 14) continue;
    if (pts.some(p => Math.hypot(p.x - x, p.z - z) < 2.3)) continue; pts.push({ x, z, s: 0.8 + rnd() * 0.9, t: rnd() });
  }
  const pines = pts.filter(p => p.t < 0.55), rounds = pts.filter(p => p.t >= 0.55);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const inst = (geo, mat, list, place, colors) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((p, i) => { place(p); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); if (colors) { col.set(colors[i % colors.length]); im.setColorAt(i, col); } }); im.castShadow = false; im.receiveShadow = false; SCENERY.add(im); return im; };
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4c36', roughness: 1, flatShading: true }), leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  inst(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6), trunkMat, pts, p => { dummy.position.set(p.x, 0.8 * p.s, p.z); dummy.scale.setScalar(p.s); dummy.rotation.set(0, 0, 0); });
  inst(new THREE.ConeGeometry(1.25, 2.6, 7), leafMat, pines, p => { dummy.position.set(p.x, (1.2 + 1.3) * p.s, p.z); dummy.scale.setScalar(p.s); dummy.rotation.set(0, p.t * 9, 0); }, ['#3f6b47', '#4a7650', '#36603f', '#55805a']);
  inst(new THREE.ConeGeometry(0.95, 2.0, 7), leafMat, pines, p => { dummy.position.set(p.x, (2.4 + 1.0) * p.s, p.z); dummy.scale.setScalar(p.s); dummy.rotation.set(0, p.t * 7, 0); }, ['#4a7a52', '#55855b', '#3f6c48']);
  inst(new THREE.IcosahedronGeometry(1.5, 0), leafMat, rounds, p => { dummy.position.set(p.x, 2.5 * p.s, p.z); dummy.scale.set(p.s, p.s * 0.9, p.s); dummy.rotation.set(0, p.t * 9, 0); }, ['#6f9a52', '#86a95c', '#5e8a4c', '#9aae5e', '#7a9f58']);
}
/* --- 돌담 · 대문 --- */
{
  const stone = TEX.brick(['#9d978d', '#b1aa9e', '#8b857b', '#a7a093', '#c0b9ab'], '#7a746b');
  const wallM = new THREE.MeshStandardMaterial({ map: stone, roughness: 1 });
  const seg = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), m = add(YARD, new THREE.BoxGeometry(len, 1.0, 0.55), wallM, (x0 + x1) / 2, 0.5, (z0 + z1) / 2, { ry: -Math.atan2(z1 - z0, x1 - x0) }); m.material = wallM.clone(); m.material.map = stone.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(len / 2, 1);
    box(YARD, (x0 + x1) / 2, 1.06, (z0 + z1) / 2, len + 0.1, 0.12, 0.66, M('#55565b', 0.8), { ry: -Math.atan2(z1 - z0, x1 - x0) }); };
  const X = 20.85, ZN = -15.65, ZS = 14.15;
  seg(-X, ZN, X, ZN); seg(-X, ZN, -X, ZS); seg(X, ZN, X, ZS); seg(-X, ZS, -1.7, ZS); seg(1.7, ZS, X, ZS);
  // 일각문
  for (const sx of [-1, 1]) box(YARD, sx * 1.55, 1.25, ZS, 0.34, 2.5, 0.34, SH.post);
  box(YARD, 0, 2.45, ZS, 3.4, 0.18, 0.3, SH.post);
  const gr = new THREE.Group(); gr.position.set(0, 2.55, ZS); YARD.add(gr);
  for (const s of [1, -1]) box(gr, 0, 0.22, s * 0.42, 4.0, 0.1, 1.0, M('#4f5055', 0.85), { rx: s * 0.5 });
  box(gr, 0, 0.46, 0, 4.2, 0.14, 0.2, M('#3b3c40', 0.8));
  add(gr, new THREE.PlaneGeometry(1.5, 0.37), new THREE.MeshBasicMaterial({ map: signTexture('흙', '흙마루'), transparent: true, toneMapped: false }), 0, -0.42, 0.2, { cast: false });
}
/* --- 디딤돌 길 --- */
const YARD_HUB = { x: 0, z: 2 };
{
  const st = [];
  const lay = (ax, az, bx, bz, step = 0.9) => { const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(d / step)); for (let i = 0; i <= n; i++) { const t = i / n, j = (rnd() - 0.5) * 0.25;
    st.push({ x: ax + (bx - ax) * t + j, z: az + (bz - az) * t + j * 0.6, r: 0.3 + rnd() * 0.12, ry: rnd() * 3, sz: 0.8 + rnd() * 0.3 }); } };
  lay(0, 16.5, YARD_HUB.x, YARD_HUB.z);
  for (const d of ROOMS.yard.doors) lay(YARD_HUB.x, YARD_HUB.z, d.x, d.z);
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.06, 0.05, 9), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), st.length), o3 = new THREE.Object3D(), c3 = new THREE.Color();
  st.forEach((q, i) => { o3.position.set(q.x, 0, q.z); o3.rotation.set(0, q.ry, 0); o3.scale.set(q.r, 1, q.r * q.sz); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); c3.set(['#aaa397', '#9c968b', '#b5aea2'][i % 3]); im.setColorAt(i, c3); });
  im.receiveShadow = true; SCENERY.add(im);
}
/* --- 마당 살림: 느티나무 · 평상 · 우물 · 장작가마 · 장독대 · 석등 --- */
{
  // 느티나무
  const tg = new THREE.Group(); tg.position.set(-9.5, 0, 9.2); YARD.add(tg);
  cyl(tg, 0, 1.3, 0, 0.3, 0.46, 2.6, M('#6a4c37', 1), 9);
  box(tg, 0.55, 2.5, 0.1, 0.16, 1.2, 0.16, M('#6a4c37', 1), { rz: -0.7 }); box(tg, -0.5, 2.6, -0.2, 0.15, 1.1, 0.15, M('#6a4c37', 1), { rz: 0.6 });
  [[0, 3.6, 0, 1.7], [1.3, 3.2, 0.4, 1.25], [-1.3, 3.3, -0.3, 1.3], [0.4, 4.4, -0.6, 1.2], [-0.5, 3.2, 1.1, 1.15], [0.6, 3.1, -1.2, 1.1], [-0.2, 4.6, 0.6, 1.0]]
    .forEach(([x, y, z, r], i) => add(tg, new THREE.IcosahedronGeometry(r, 1), M(['#5f8a4b', '#6b9652', '#557f44', '#77a05a'][i % 4], 1), x, y, z));
  yardCol.circle(-9.5, 9.2, 0.5);
  // 평상 다섯 채 — 찻상 하나에 방석 넷. 마지막 것은 지붕 있는 정자
  for (const [bx, bz, br, cush, canopy] of BENCH_DEF) {
    const pg = new THREE.Group(); pg.position.set(bx, 0, bz); pg.rotation.y = br; YARD.add(pg); const pw = M('#c89a62', 0.8), pd = M('#9a7246', 0.85);
    box(pg, 0, 0.42, 0, 2.6, 0.08, 1.7, pw); for (let i = -5; i <= 5; i++) box(pg, i * 0.24, 0.465, 0, 0.012, 0.01, 1.68, pd, { cast: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(pg, sx * 1.18, 0.19, sz * 0.74, 0.12, 0.38, 0.12, pd);
    box(pg, 0, 0.3, 0.8, 2.5, 0.06, 0.06, pd); box(pg, 0, 0.3, -0.8, 2.5, 0.06, 0.06, pd);
    box(pg, 0.12, 0.5, 0, 0.95, 0.04, 0.62, M('#7b5a3d', 0.8));                                  // 찻상
    const pot = lathePot([0.06, 0.09, 0.1, 0.085, 0.04], 0.15, M('#d9d3c4', 0.4), 16); pot.position.set(0.12, 0.52, 0); pg.add(pot);
    BENCH_SEAT_L.forEach(([x, z], k) => box(pg, x, 0.5, z, 0.5, 0.06, 0.5, M(cush[k % cush.length], 0.9)));   // 방석
    if (canopy) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(pg, sx * 1.25, 1.4, sz * 0.8, 0.12, 2.8, 0.12, SH.post);
      const rf = new THREE.Group(); rf.position.y = 2.82; pg.add(rf);
      for (const s2 of [1, -1]) box(rf, 0, 0.28, s2 * 0.6, 3.3, 0.1, 1.35, M('#4f5055', 0.85), { rx: s2 * 0.42 });
      box(rf, 0, 0.56, 0, 3.5, 0.14, 0.22, M('#3b3c40', 0.8));
    }
    pg.updateMatrixWorld(true);
    const cs = [[-1.32, -0.88], [1.32, -0.88], [-1.32, 0.88], [1.32, 0.88]].map(([x, z]) => pg.localToWorld(V(x, 0, z)));
    yardCol.box(Math.min(...cs.map(c => c.x)), Math.max(...cs.map(c => c.x)), Math.min(...cs.map(c => c.z)), Math.max(...cs.map(c => c.z)));
    const tc = pg.localToWorld(V(0.12, 0, 0));
    BENCHES.push({ x: bx, z: bz, g: pg, tray: { x: tc.x, z: tc.z }, seats: BENCH_SEAT_L.map(([x, z]) => { const w = pg.localToWorld(V(x, 0, z)), it = pg.localToWorld(V(x + (0.12 - x) * 0.58, 0, z * 0.55)); return { x: w.x, z: w.z, yaw: Math.atan2(tc.x - w.x, tc.z - w.z), ix: it.x, iz: it.z }; }) });
  }
  // 물확 — 대나무 홈통에서 돌확으로 물이 졸졸
  { const qg = new THREE.Group(); qg.position.set(-3.4, 0, 8.4); YARD.add(qg); const st2 = M('#9d978d', 1);
    add(qg, new THREE.CylinderGeometry(0.5, 0.58, 0.42, 14), st2, 0, 0.21, 0);
    add(qg, new THREE.CircleGeometry(0.38, 16), M('#3d5f6b', 0.15), 0, 0.425, 0, { rx: -Math.PI / 2, cast: false });
    box(qg, -0.62, 0.55, 0, 0.1, 1.1, 0.1, M('#7a8a4e', 0.7)); cyl(qg, -0.36, 0.95, 0, 0.045, 0.045, 0.6, M('#8a9a58', 0.6), 8, { rz: Math.PI / 2 - 0.25 });
    const drip = add(qg, new THREE.CylinderGeometry(0.012, 0.012, 0.48, 6), new THREE.MeshBasicMaterial({ color: '#cfe6ee', transparent: true, opacity: 0.6 }), -0.08, 0.67, 0, { cast: false });
    YARD.userData.drip = drip;
    for (const [x, z, r] of [[0.5, 0.45, 0.16], [-0.4, 0.5, 0.12], [0.55, -0.4, 0.13]]) add(qg, new THREE.IcosahedronGeometry(r, 0), M('#8f897f', 1), x, r * 0.6, z);
    yardCol.circle(-3.4, 8.4, 0.62); }
  // 우물
  const wg = new THREE.Group(); wg.position.set(3.4, 0, 6.6); YARD.add(wg); const ws = M('#9a948a', 1);
  add(wg, new THREE.CylinderGeometry(0.78, 0.86, 0.72, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#9a948a', roughness: 1, side: THREE.DoubleSide, flatShading: true }), 0, 0.36, 0);
  add(wg, new THREE.TorusGeometry(0.8, 0.08, 6, 18), M('#b3ada2', 1), 0, 0.73, 0, { rx: Math.PI / 2 });
  add(wg, new THREE.CircleGeometry(0.72, 18), M('#2f4a55', 0.3), 0, 0.3, 0, { rx: -Math.PI / 2, cast: false });
  for (const sx of [-1, 1]) box(wg, sx * 0.9, 0.95, 0, 0.12, 1.9, 0.12, SH.post);
  box(wg, 0, 1.75, 0, 2.0, 0.1, 0.1, SH.post); cyl(wg, 0, 1.55, 0, 0.09, 0.09, 0.5, M('#8a6a4c', 0.8), 10, { rz: Math.PI / 2 });
  for (const s of [1, -1]) box(wg, 0, 2.02, s * 0.3, 2.3, 0.07, 0.75, M('#4f5055', 0.85), { rx: s * 0.6 });
  const bk = lathePot([0.12, 0.13, 0.14], 0.18, M('#8a6a4c', 0.8), 12); bk.position.set(0.55, 0.78, 0.35); wg.add(bk);
  box(wg, 0, 1.1, 0, 0.01, 0.9, 0.01, M('#d8c7a0', 1), { cast: false });
  yardCol.circle(3.4, 6.6, 0.98);
  // 장작가마 (오름가마) — 불 지핀 가마
  const kg = new THREE.Group(); kg.position.set(4.2, 0, 9.6); YARD.add(kg);
  const brick = new THREE.MeshStandardMaterial({ map: TEX.brick(['#b0613e', '#a25638', '#bd7150', '#9a5a3e'], '#8b7866'), roughness: 0.95 });
  box(kg, 2.6, 0.12, 0, 6.0, 0.24, 2.3, M('#8c7b68', 1));
  for (let i = 0; i < 4; i++) { const m = add(kg, new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), brick, 1.0 + i * 1.22, 0.2 + i * 0.1, 0); m.scale.set(0.72, 0.95 + i * 0.06, 1.02);
    add(kg, new THREE.CircleGeometry(0.1, 10), M('#2a1a12', 1), 1.0 + i * 1.22, 0.55 + i * 0.1, 1.0, { cast: false }); }
  add(kg, new THREE.CylinderGeometry(0.7, 0.7, 0.9, 14, 1, false, 0, Math.PI), brick, 0.05, 0.2, 0, { rz: Math.PI / 2, ry: Math.PI / 2 });
  const mouth = add(kg, new THREE.CircleGeometry(0.36, 14, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff9a3c', toneMapped: false }), -0.42, 0.2, 0, { ry: -Math.PI / 2, cast: false });
  box(kg, 5.75, 1.45, 0, 0.75, 2.9, 0.75, brick); box(kg, 5.75, 2.95, 0, 0.85, 0.12, 0.85, M('#3a2e26', 0.9));
  const fireLight = new THREE.PointLight('#ff8a3c', 2.2, 6, 2); fireLight.position.set(-0.9, 0.5, 0); kg.add(fireLight);
  YARD.userData.fire = { mouth, light: fireLight };
  yardCol.box(3.55, 10.4, 8.35, 10.85);
  // 장작더미
  const lg = new THREE.Group(); lg.position.set(2.0, 0, 11.6); YARD.add(lg);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 7 - r; i++) cyl(lg, -0.75 + i * 0.25 + r * 0.125, 0.12 + r * 0.21, 0, 0.11, 0.11, 0.9, M(['#9a7048', '#8a6440', '#a77b4f'][(r + i) % 3], 1), 8, { rx: Math.PI / 2 });
  yardCol.box(1.05, 2.95, 11.0, 12.2);
  // 장독대 (북서 모퉁이)
  const jg = new THREE.Group(); jg.position.set(-16.2, 0, -3.6); YARD.add(jg);
  box(jg, 0, 0.13, 0, 3.0, 0.26, 1.7, M('#a29b8f', 1));
  [[-1.0, -0.4, 1.25], [0, -0.45, 1.4], [1.0, -0.4, 1.2], [-0.55, 0.45, 0.95], [0.5, 0.45, 1.0], [1.25, 0.5, 0.75]].forEach(([x, z, s], i) => {
    const j = lathePot([0.16, 0.26, 0.31, 0.29, 0.2, 0.15], 0.5, M(['#5a3624', '#4e2f20', '#633d29'][i % 3], 0.35), 18); j.scale.setScalar(s); j.position.set(x, 0.26, z); jg.add(j);
    cyl(jg, x, 0.26 + 0.5 * s + 0.02, z, 0.16 * s, 0.17 * s, 0.05, M('#3f271a', 0.4), 14); });
  yardCol.box(-17.75, -14.65, -4.5, -2.7);
  // 장작 · 땔감 (북동 모퉁이)
  const fg = new THREE.Group(); fg.position.set(16.2, 0, -3.6); YARD.add(fg);
  for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) cyl(fg, -1.2 + i * 0.3, 0.14 + r * 0.26, (r % 2) * 0.06, 0.13, 0.13, 1.2, M(['#a37950', '#8f6844', '#b08657'][(r * 3 + i) % 3], 1), 8, { rx: Math.PI / 2 });
  box(fg, 0, 1.5, 0, 3.0, 0.08, 1.6, M('#4f5055', 0.85), { rx: 0.1 });
  for (const sx of [-1, 1]) box(fg, sx * 1.45, 0.75, -0.7, 0.1, 1.5, 0.1, SH.post);
  yardCol.box(14.6, 17.8, -4.4, -2.8);
  // 석등
  for (const [x, z] of [[-1.5, 12.4], [1.5, 12.4], [-1.5, 8.2], [1.5, 8.2]]) {
    const sg = new THREE.Group(); sg.position.set(x, 0, z); YARD.add(sg); const st = M('#a9a398', 1);
    box(sg, 0, 0.08, 0, 0.5, 0.16, 0.5, st); cyl(sg, 0, 0.5, 0, 0.09, 0.12, 0.7, st, 8); box(sg, 0, 0.9, 0, 0.42, 0.1, 0.42, st);
    box(sg, 0, 1.1, 0, 0.32, 0.3, 0.32, st);
    for (const [ax, az, ry] of [[0, 0.162, 0], [0, -0.162, Math.PI], [0.162, 0, Math.PI / 2], [-0.162, 0, -Math.PI / 2]]) add(sg, new THREE.PlaneGeometry(0.16, 0.18), new THREE.MeshBasicMaterial({ color: '#ffd98a', toneMapped: false }), ax, 1.1, az, { ry, cast: false });
    add(sg, new THREE.ConeGeometry(0.34, 0.26, 4), st, 0, 1.38, 0, { ry: Math.PI / 4 });
    yardCol.circle(x, z, 0.32);
  }
  // 담장 밑 풀포기 · 꽃
  const tufts = [];
  for (let k = 0; k < 220; k++) { const side = k % 4, t = rnd(); let x, z;
    if (side === 0) { x = -20 + t * 40; z = -15.1; } else if (side === 1) { x = -20.2; z = -15 + t * 28.5; } else if (side === 2) { x = 20.2; z = -15 + t * 28.5; } else { x = -20 + t * 40; z = 13.6; }
    if (side === 3 && Math.abs(x) < 2.2) continue; tufts.push({ x: x + (rnd() - 0.5) * 0.5, z: z + (rnd() - 0.5) * 0.5, s: 0.5 + rnd() * 0.6, f: rnd() < 0.18 }); }
  const dm = new THREE.Object3D(), tc = new THREE.Color(), tm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.18, 0.45, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), tufts.length);
  tufts.forEach((p, i) => { dm.position.set(p.x, 0.2 * p.s, p.z); dm.scale.setScalar(p.s); dm.updateMatrix(); tm.setMatrixAt(i, dm.matrix); tc.set(p.f ? ['#e8b04a', '#e27a6a', '#f2efe4'][i % 3] : ['#6f9452', '#5f8547', '#83a35e'][i % 3]); tm.setColorAt(i, tc); });
  SCENERY.add(tm);
}

/* --- 건물 드나들기 (문 칸을 걸어서 지나가면 바로 안/밖) --- */
let crossTarget = null;
function roomUI(id) {
  roomNav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.r === id));
  $('#placeName').textContent = ROOM_INFO[id].name;
  bubble.hidden = true; speaker = null; nextBubble = performance.now() + 1500;
  updateDock(); updateGalleryGlow(); setHint(ROOM_HINT[id]());
}
function attachActors(id) {
  const g = ROOMS[id].g;
  // attach()는 회전을 (π, y, π)처럼 바꿔 놓을 수 있어서(→ 뒤돌아 걷기) 그냥 옮겨 달고 회전은 y만 남겨요
  const mw = marker.parent ? marker.getWorldPosition(V()) : null;
  [player, playerActor.mesh, playerActor.blob, marker, ...Object.values(C3).map(c => c.root)].forEach(o => { g.add(o); o.traverse(m => m.userData.noFade = true); });
  for (const c of Object.values(C3)) c.root.rotation.set(0, c.root.rotation.y, 0);
  player.rotation.set(0, player.rotation.y, 0);
  if (mw) { const l = g.worldToLocal(mw); marker.position.set(l.x, 0.012, l.z); }
}
function enterRoom(to) {
  const from = curRoom, conv = p => { const l = toLocal(to, toWorld(from, p.x, p.z)); return Object.assign({}, p, { x: l.x, z: l.z }); };
  const yawW = player.rotation.y + ROOMS[from].g.rotation.y, w = toWorld(from, player.position.x, player.position.z);
  if (goal) goal = conv(goal); route = route.map(conv);
  curRoom = to; colliders = ROOMS[to].cols; attachActors(to);
  const l = toLocal(to, w); player.position.set(l.x, 0, l.z); player.rotation.y = yawW - ROOMS[to].g.rotation.y;
  if (to === 'yard' && viewTarget < 6.4) viewTarget = 6.4; else if (to !== 'yard' && Math.abs(viewTarget - 6.4) < 0.01) viewTarget = DEFAULT_VIEW;
  roomUI(to);
  if (crossTarget) planCross();
}
function planCross() {
  const t = crossTarget, p = player.position; if (!t) return;
  if (t.room === curRoom) { crossTarget = null; walkTo(t.x, t.z); return; }
  if (curRoom === 'yard') { const d = ROOMS.yard.doors.find(o => o.to === t.room); route = findPath(p.x, p.z, d.x, d.z); route.push({ x: d.pass.x, z: d.pass.z }); }
  else { const R0 = ROOMS[curRoom]; route = findPath(p.x, p.z, R0.dx, ROOM.z1 - 0.6); route.push({ x: R0.dx, z: ROOM.z1 + 0.45 }); }
  goal = route.shift();
}
function crossCheck() {
  if (sitting || fading) return;
  const p = player.position;
  if (curRoom !== 'yard') { if (p.z > ROOM.z1 + 0.3 && Math.abs(p.x - ROOMS[curRoom].dx) < 0.8) enterRoom('yard'); return; }
  const w = toWorld('yard', p.x, p.z);
  for (const id of BUILDINGS) { const l = toLocal(id, w); if (Math.abs(l.x - ROOMS[id].dx) < 0.7 && l.z < ROOM.z1 - 0.1 && l.z > ROOM.z1 - 1.3) { enterRoom(id); return; } }
}
function regionAt(pw) {                 // 땅의 한 점이 어느 건물 안인지 (아니면 마당)
  for (const id of BUILDINGS) { const l = toLocal(id, pw); if (l.x > ROOM.x0 && l.x < ROOM.x1 && l.z > ROOM.z0 && l.z < ROOM.z1) return { room: id, x: l.x, z: l.z }; }
  return { room: 'yard', x: pw.x, z: pw.z };
}
function tapGround(pw) {
  if (bench) { standBench(); return; } stopFollow();
  sitTarget = null; const r = regionAt(pw), lm = toLocal(curRoom, pw);
  if (r.room === curRoom) { crossTarget = null; walkTo(r.x, r.z); }
  else { crossTarget = r; planCross(); }
  showMarker(lm);
}
/* 건물 안에선 지붕을 걷고, 카메라 쪽 앞벽·옆벽을 낮춰요 */
function segHitsRect(ax, az, bx, bz, x0, x1, z0, z1) {   // 땅 위에서 본 선분이 네모를 지나는지
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
function updateShells() {
  const pw = toWorld(curRoom, player.position.x, player.position.z);
  for (const id of BUILDINGS) {
    const R0 = ROOMS[id], S = R0.shell, cl = toLocal(id, camera.position), pl = toLocal(id, pw), M0 = 0.8;
    // 내가 들어간 건물, 또는 카메라와 나 사이에 있는 건물은 지붕을 걷고 앞쪽 벽을 낮춰 속이 보이게
    const inside = !fading && (curRoom === id || segHitsRect(cl.x, cl.z, pl.x, pl.z, ROOM.x0 - M0, ROOM.x1 + M0, ROOM.z0 - M0, ROOM.z1 + M0));
    S.roof.visible = !inside; S.shade.visible = !inside;
    const all = inside && curRoom !== id;          // 가리는 건물은 네 벽 모두 낮춤
    const lowF = inside && (all || cl.z > ROOM.z1 - 0.3), lowR = inside && (all || cl.x > ROOM.x1 - 0.3), lowB = inside && (all || cl.z < ROOM.z0 + 0.3), lowL = inside && (all || cl.x < ROOM.x0 + 0.3);
    for (const p of S.posts) p.m.visible = !((p.tag.includes('b') && lowB) || (p.tag.includes('l') && lowL) || (p.tag.includes('f') && lowF) || (p.tag.includes('r') && lowR));
    S.front.visible = !lowF; S.frontLow.visible = lowF; S.right.visible = !lowR; S.rightLow.visible = lowR;
    const key = +inside + 2 * lowB + 4 * lowL;
    if (R0.visKey !== key) { R0.visKey = key;
      if (!R0.inSet) R0.inSet = new Set(R0.interior);
      for (const o of R0.interior) o.visible = inside;
      for (const o of R0.backW) o.visible = !lowB && (inside || !R0.inSet.has(o));
      for (const o of R0.leftW) o.visible = !lowL && (inside || !R0.inSet.has(o));
      R0.backLow.visible = lowB; R0.leftLow.visible = lowL; }
  }
}
const SUN_OFF = sun.position.clone(); scene.add(sun.target);
function updateSun() {
  const q = v => Math.round(v * 2) / 2; sun.target.position.set(q(camFocus.x), 0, q(camFocus.z)); sun.position.copy(sun.target.position).add(SUN_OFF);
  const f = YARD.userData.fire, t = performance.now() / 1000; const dr = YARD.userData.drip; if (dr) { dr.material.opacity = 0.45 + 0.2 * Math.sin(t * 9); dr.scale.x = dr.scale.z = 0.8 + 0.3 * Math.sin(t * 13); } f.light.intensity = 1.8 + Math.sin(t * 13) * 0.35 + Math.sin(t * 7.3) * 0.3; f.mouth.material.color.setHSL(0.07 + Math.sin(t * 9) * 0.012, 1, 0.56 + Math.sin(t * 11) * 0.05);
}

/* --- 소리 — 🎵 잔잔한 배경음악 · 🌿 자연의 소리(새 · 바람 · 물 · 장작불) · 🔔 효과음. 위 🔊 단추에서 따로 끄고 켜요 --- */
const Sound = (() => {
  let ctx = null, master, bus = {}, nodes = {}, verb;
  let pref = { all: true, music: true, nature: true, sfx: true };
  try { const v = JSON.parse(localStorage.getItem('heukmaru-snd') || 'null'); if (v) pref = Object.assign(pref, v); else if (localStorage.getItem('heukmaru-sound') === 'off') pref.all = false; } catch {}
  const LV = { music: 0.55, nature: 0.9, sfx: 0.8 };
  const save = () => { try { localStorage.setItem('heukmaru-snd', JSON.stringify(pref)); } catch {} };
  function noiseBuf(sec, brown) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } return b; }
  function loop(buf, type, freq, q, out) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(out); s.start(); return { s, f, g }; }
  function impulse(sec, decay) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
  function applyGains() { if (!ctx) return; const t = ctx.currentTime; master.gain.setTargetAtTime(pref.all ? 0.9 : 0, t, 0.15); for (const k of ['music', 'nature', 'sfx']) bus[k].gain.setTargetAtTime(pref[k] ? LV[k] : 0, t, 0.3); }
  let WHITE, BROWN;
  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    for (const k of ['music', 'nature', 'sfx']) { bus[k] = ctx.createGain(); bus[k].gain.value = 0; bus[k].connect(master); }
    verb = ctx.createConvolver(); verb.buffer = impulse(3.2, 2.6); const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg).connect(bus.music);
    WHITE = noiseBuf(2, false); BROWN = noiseBuf(4, true);
    // 자연: 바람 · 나뭇잎 · 물확 졸졸 · 장작불 · 물레
    nodes.wind = loop(BROWN, 'lowpass', 480, 0.7, bus.nature); nodes.leaf = loop(WHITE, 'highpass', 3200, 0.5, bus.nature);
    nodes.water = loop(WHITE, 'bandpass', 1500, 1.4, bus.nature); nodes.water2 = loop(BROWN, 'bandpass', 420, 1.0, bus.nature);
    nodes.fire = loop(BROWN, 'lowpass', 180, 0.7, bus.nature); nodes.crack = loop(WHITE, 'bandpass', 2600, 2, bus.nature);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), hg = ctx.createGain(); o1.frequency.value = 92; o2.frequency.value = 184; o2.type = 'triangle'; hg.gain.value = 0; o1.connect(hg); o2.connect(hg); hg.connect(bus.nature); o1.start(); o2.start(); nodes.hum = { g: hg };
    // 효과음용 상시 소리 (끓기 · 우리기 · 따르기)
    nodes.boil = loop(BROWN, 'bandpass', 700, 0.9, bus.sfx); nodes.steam = loop(WHITE, 'highpass', 5200, 0.6, bus.sfx); nodes.pour = loop(WHITE, 'bandpass', 900, 1.6, bus.sfx);
    applyGains(); setInterval(tick, 200); birdLoop(); dropLoop(); musicStart();
  }
  let state = { out: 1, fire: 0, hum: 0, water: 0 }, fx = { boil: 0, steep: 0, pour: 0 };
  function tick() {
    if (!ctx) return; const t = ctx.currentTime, wob = 0.6 + Math.sin(t * 0.37) * 0.25 + Math.sin(t * 0.13) * 0.15, set = (n, v, k = 0.4) => n.g.gain.setTargetAtTime(v, t, k);
    set(nodes.wind, 0.05 * wob * (0.35 + 0.65 * state.out)); set(nodes.leaf, 0.006 * Math.max(0, wob - 0.55) * state.out);
    set(nodes.water, 0.035 * state.water * (0.8 + 0.2 * Math.sin(t * 3.1))); set(nodes.water2, 0.05 * state.water);
    set(nodes.fire, 0.16 * state.fire); set(nodes.hum, 0.022 * state.hum);
    nodes.crack.g.gain.cancelScheduledValues(t); nodes.crack.g.gain.setValueAtTime(0, t);
    if (state.fire > 0.05) for (let k = 0; k < 3; k++) if (Math.random() < 0.55) { const at = t + Math.random() * 0.18; nodes.crack.g.gain.setValueAtTime(0, at); nodes.crack.g.gain.linearRampToValueAtTime(0.12 * state.fire * Math.random(), at + 0.004); nodes.crack.g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05); }
    // 효과음: 보글보글 · 쉬익 · 졸졸
    set(nodes.boil, 0.22 * fx.boil, 0.15); nodes.boil.f.frequency.setTargetAtTime(500 + 500 * fx.boil, t, 0.2); set(nodes.steam, 0.03 * Math.max(fx.boil - 0.6, 0) + 0.02 * fx.steep, 0.2);
    set(nodes.pour, 0.25 * fx.pour, 0.05); nodes.pour.f.frequency.setTargetAtTime(1100 - 500 * (fx.fill || 0), t, 0.1);
    if (fx.boil > 0.3 || fx.steep > 0.1) for (let k = 0; k < 2; k++) if (Math.random() < 0.6 * Math.max(fx.boil, fx.steep * 0.6)) bubble(t + Math.random() * 0.2, 260 + Math.random() * 500, 0.05 * Math.max(fx.boil, fx.steep));
  }
  function tone(at, f, dur, vol, type = 'sine', out = bus.sfx, f2) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(g).connect(out); o.start(at); o.stop(at + dur + 0.05); }
  function bubble(at, f, vol) { tone(at, f, 0.07, vol, 'sine', bus.sfx, f * 1.8); }
  function chirp(at, f0, f1, dur, vol) { tone(at, f0, dur, vol, 'sine', bus.nature, f1); }
  function birdLoop() {
    const t = ctx.currentTime + 0.05, v = 0.03 * (0.25 + 0.75 * state.out), kind = Math.floor(Math.random() * 5);
    if (kind === 0) for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) chirp(t + i * 0.13, 3200 + Math.random() * 600, 4300 + Math.random() * 500, 0.08, v);
    else if (kind === 1) { chirp(t, 2600, 3900, 0.18, v); chirp(t + 0.26, 3900, 2500, 0.22, v * 0.8); }
    else if (kind === 2) for (let i = 0; i < 6; i++) chirp(t + i * 0.07, 5200, 4600, 0.05, v * 0.6);
    else if (kind === 3 && state.out > 0.5) { tone(t, 740, 0.32, v * 1.1, 'sine', bus.nature, 700); tone(t + 0.42, 587, 0.45, v * 1.1, 'sine', bus.nature, 560); }   // 멀리서 뻐꾹
    else for (let i = 0; i < 2; i++) chirp(t + i * 0.5, 2100, 2900, 0.3, v * 0.7);
    setTimeout(birdLoop, 1600 + Math.random() * 5200);
  }
  function dropLoop() { if (state.water > 0.05) tone(ctx.currentTime + 0.02, 900 + Math.random() * 700, 0.09, 0.03 * state.water, 'sine', bus.nature, 1500 + Math.random() * 600); setTimeout(dropLoop, 180 + Math.random() * 520); }
  /* 잔잔한 배경음악 — 오음계(라 도 레 미 솔)로 천천히 흘러가는 소리 */
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
  const CHORDS = [[110, 164.81, 220], [98, 146.83, 196], [87.31, 130.81, 174.61], [98, 146.83, 220]];
  let mStep = 0, mIdx = 5, padNodes = [];
  function pluck(at, f, vol) {             // 가야금·피아노 같은 부드러운 소리
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.003; lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, at); lp.frequency.exponentialRampToValueAtTime(700, at + 1.6);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + 2.8);
    const g2 = ctx.createGain(); g2.gain.value = 0.25; o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g); g.connect(bus.music); g.connect(verb);
    o.start(at); o2.start(at); o.stop(at + 3); o2.stop(at + 3);
  }
  function pad(at, freqs) {
    for (const n of padNodes) { n.g.gain.setTargetAtTime(0.0001, at, 1.2); n.o.stop(at + 5); } padNodes = [];
    for (const f of freqs) { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sine'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 600; g.gain.setValueAtTime(0.0001, at); g.gain.setTargetAtTime(0.028, at, 1.8); o.connect(lp).connect(g); g.connect(bus.music); g.connect(verb); o.start(at); padNodes.push({ o, g }); }
  }
  function musicStart() { pad(ctx.currentTime + 0.1, CHORDS[0]); musicLoop(); }
  function musicLoop() {
    const t = ctx.currentTime + 0.05;
    if (mStep % 16 === 0) pad(t, CHORDS[(mStep / 16) % CHORDS.length]);
    const rest = Math.random() < 0.28 || mStep % 8 === 7;
    if (!rest) { mIdx = Math.max(0, Math.min(SCALE.length - 1, mIdx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)])); pluck(t, SCALE[mIdx], 0.06 + Math.random() * 0.03);
      if (Math.random() < 0.18) pluck(t + 0.02, SCALE[Math.max(0, mIdx - 2)], 0.035); }
    mStep++; setTimeout(musicLoop, (mStep % 4 === 0 ? 1300 : 850) + Math.random() * 250);
  }
  const sfx = {
    set(k, v) { fx[k] = v; },
    clink() { if (!ctx) return; const t = ctx.currentTime; tone(t, 2350, 0.5, 0.05); tone(t, 3120, 0.4, 0.035); },
    ding() { if (!ctx) return; const t = ctx.currentTime; tone(t, 1046.5, 0.9, 0.04, 'sine', bus.sfx); tone(t + 0.12, 1568, 1.0, 0.03, 'sine', bus.sfx); },
    click() { if (!ctx) return; tone(ctx.currentTime, 1400, 0.06, 0.025, 'triangle'); },
    sip() { if (!ctx) return; const t = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = WHITE; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.5); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); s.connect(f).connect(g).connect(bus.sfx); s.start(t); s.stop(t + 0.6); },
    good() { if (!ctx) return; const t = ctx.currentTime; [784, 988, 1175].forEach((f, i) => tone(t + i * 0.1, f, 0.6, 0.035)); }
  };
  return { start, update(s) { state = Object.assign(state, s); }, sfx, pref, set(k, v) { pref[k] = v; save(); applyGains(); }, get on() { return pref.all; }, get ctx() { return ctx; } };
})();
{
  const sb = document.createElement('button'); sb.className = 'mini'; sb.id = 'soundBtn'; sb.title = '소리 설정';
  const panel = document.createElement('div'); panel.id = 'soundPanel'; panel.hidden = true; document.body.appendChild(panel);
  const st = document.createElement('style'); st.textContent = '#soundPanel[hidden]{display:none}#soundPanel{position:fixed;top:56px;right:12px;z-index:48;background:#f6f1e8;color:#3d342c;border-radius:16px;box-shadow:0 8px 26px #0005;padding:10px;display:flex;flex-direction:column;gap:6px;min-width:190px;font-size:13px}' +
    '#soundPanel button{display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;background:#fff;border-radius:10px;padding:9px 11px;font:inherit;font-weight:600;cursor:pointer;color:#3d342c}#soundPanel button i{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;background:#e6dccb}#soundPanel button.on i{background:#3d342c;color:#fff}';
  document.head.appendChild(st);
  const items = [['all', '🔊 소리 전체'], ['music', '🎵 배경음악'], ['nature', '🌿 자연의 소리'], ['sfx', '🔔 효과음']];
  const paint = () => { sb.textContent = Sound.pref.all ? '🔊' : '🔇'; panel.querySelectorAll('button').forEach(b => { const on = Sound.pref[b.dataset.k]; b.classList.toggle('on', on); b.querySelector('i').textContent = on ? '켜짐' : '꺼짐'; }); };
  panel.innerHTML = items.map(([k, t]) => `<button data-k="${k}">${t}<i></i></button>`).join('');
  panel.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); Sound.start(); Sound.set(b.dataset.k, !Sound.pref[b.dataset.k]); paint(); });
  sb.onclick = e => { e.stopPropagation(); Sound.start(); panel.hidden = !panel.hidden; paint(); };
  addEventListener('pointerdown', e => { if (!panel.hidden && !panel.contains(e.target) && e.target !== sb) panel.hidden = true; }, true);
  paint();
  const tr = document.querySelector('.topR'); if (tr) tr.insertBefore(sb, tr.firstChild);
  const kick = () => { Sound.start(); if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume(); };
  addEventListener('pointerdown', kick, { once: true }); addEventListener('keydown', kick, { once: true });
  setInterval(() => {
    const w = toWorld(curRoom, player.position.x, player.position.z), kd = Math.hypot(w.x - 4.2, w.z - 9.6), wd = Math.hypot(w.x + 3.4, w.z - 8.4), wl = Math.hypot(w.x - 3.4, w.z - 6.6);
    const firing = window.HeukCraft && HeukCraft.kilnInfo && HeukCraft.kilnInfo().phase === 'firing', out = curRoom === 'yard';
    Sound.update({ out: out ? 1 : 0.25, water: out ? Math.max(0, 1 - wd / 11) + Math.max(0, 0.4 - wl / 12) : 0.06,
      fire: Math.max(0, 1 - kd / 9) * (out ? 1 : 0.3) + (curRoom === 'kiln' && firing ? 0.7 : 0), hum: (window.HeukThrow && HeukThrow.active) ? 1 : curRoom === 'studio' ? 0.25 : 0 });
  }, 300);
}


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
const SPR = {"A_back": [95, 210], "A_big": [258, 517], "A_bowl1": [67, 123], "A_bowl2": [65, 124], "A_bq": [85, 212], "A_cheer": [83, 125], "A_front": [95, 209], "A_q": [89, 210], "A_side": [88, 212], "A_w1": [64, 114], "A_w2": [58, 110], "A_w3": [58, 110], "A_w4": [59, 110], "A_wheel": [77, 120], "B_back": [91, 215], "B_big": [201, 519], "B_bowl": [56, 119], "B_bq": [95, 214], "B_cheer": [86, 123], "B_f1": [58, 121], "B_front": [93, 216], "B_q": [91, 216], "B_side": [103, 215], "B_w1": [62, 112], "B_w2": [61, 115], "B_w3": [56, 117], "B_x1": [66, 122], "B_x2": [67, 122], "B_x3": [69, 121], "N_beanie": [144, 346], "N_bowls": [182, 340], "N_braid": [204, 335], "N_cap": [160, 336], "N_glasses": [162, 326], "N_smile": [175, 337], "N_teacher": [198, 321], "A_ws0": [220, 425], "A_ws1": [220, 425], "A_ws2": [220, 425], "A_ws3": [220, 425], "A_ws4": [220, 425], "A_ws5": [220, 425], "A_ws6": [220, 425], "A_ws7": [220, 425], "A_wq0": [212, 434], "A_wq1": [212, 434], "A_wq2": [212, 434], "A_wq3": [212, 434], "A_wq4": [212, 434], "A_wq5": [212, 434], "A_wq6": [212, 434], "A_wq7": [212, 434], "A_cw0": [180, 340], "A_cw1": [180, 340], "A_cw2": [180, 340], "A_cw3": [180, 340], "A_cw4": [180, 340], "A_cw5": [180, 340], "A_cw6": [180, 340], "A_cw7": [180, 340], "A_cw8": [180, 340], "A_cw9": [180, 340], "A_cw10": [180, 340], "A_cw11": [180, 340], "B_gl0": [285, 349], "B_gl1": [285, 349], "B_gl2": [285, 349], "B_gl3": [285, 349], "B_gl4": [285, 349], "B_gl5": [285, 349], "B_gl6": [285, 349], "B_gl7": [285, 349], "B_gl8": [285, 349], "B_gl9": [285, 349], "B_gl10": [285, 349], "B_gl11": [285, 349]}
const texLoader = new THREE.TextureLoader(), texCache = {};
function tex(name) { if (!texCache[name]) { const t = texLoader.load('/chars/' + name + '.png'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache[name] = t; } return texCache[name]; }
if (!window.HeukChar3D) Object.keys(SPR).forEach(tex);           // 그림 캐릭터를 쓸 때만 미리 불러오기
const CAM_YAW = Math.atan2(ISO.x, ISO.z);
const ELEV_FIX = 1 / Math.hypot(ISO.x, ISO.z);                   // 세운 판을 위에서 볼 때 줄어드는 높이 보정
const CHAR_H = 1.3;
const K = { sheet: CHAR_H / 211, small: CHAR_H / 112, poster: CHAR_H / 336, cw: CHAR_H / 330, gl: 0.72 / 230, ws: 0.487 / 144.5, wq: 0.511 / 155 };
const kOf = n => n.startsWith('N_') ? K.poster : n.startsWith('A_cw') ? K.cw : n.startsWith('A_ws') ? K.ws : n.startsWith('A_wq') ? K.wq : n.startsWith('B_gl') ? K.gl : (/_(front|q|side|back|bq)$/.test(n) ? K.sheet : K.small);
const blobGeo = new THREE.CircleGeometry(0.26, 24), blobMat = new THREE.MeshBasicMaterial({ color: '#2a1f18', transparent: true, opacity: 0.22, depthWrite: false });
function makeActor() {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false }));
  mesh.rotation.y = CAM_YAW; scene.add(mesh);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.scale.set(1, 0.6, 1); scene.add(blob);
  return { mesh, blob, cur: null };
}
// 걷기·들기·앉기 컷은 시트의 작은 그림이라 머리가 서 있는 컷보다 20% 정도 커요 → 머리 크기를 재서 맞춤
const SCALE_FIX = { A_w1: 0.815, A_w2: 0.815, A_w3: 0.815, A_w4: 0.815, A_bowl1: 0.78, A_bowl2: 0.78, A_cheer: 0.8, A_wheel: 0.815,
  B_w1: 0.906, B_w2: 0.906, B_w3: 0.906, B_f1: 0.93, B_bowl: 0.93, B_cheer: 0.91, B_x1: 0.906, B_x2: 0.906, B_x3: 0.906 };
function showFrame(a, name, x, z, flip = false, lift = 0, squash = 1) {
  if (a.cur !== name) { a.mesh.material.map = tex(name); a.mesh.material.needsUpdate = true; a.cur = name; }
  const [w, h] = SPR[name], k = kOf(name) * (SCALE_FIX[name] || 1);
  a.mesh.scale.set(w * k * (flip ? -1 : 1), h * k * ELEV_FIX * squash, 1);
  a.mesh.position.set(x, lift, z); a.blob.position.set(x, 0.008, z);
}
// 화면 기준 방향: 0 = 카메라를 봄, +는 화면 오른쪽을 봄
const CAM_RIGHT = V(Math.cos(CAM_YAW), 0, -Math.sin(CAM_YAW)), TO_CAM = V(Math.sin(CAM_YAW), 0, Math.cos(CAM_YAW));
function screenAngle(yaw) { const d = V(Math.sin(yaw), 0, Math.cos(yaw)); return Math.atan2(d.dot(CAM_RIGHT), d.dot(TO_CAM)); }
const SET = {
  A: { front: 'A_front', q: 'A_q', side: 'A_side', bq: 'A_bq', back: 'A_back', walk: ['A_w2', 'A_w3', 'A_w4', 'A_w3'], walkFront: ['A_w1', 'A_front'], sit: ['A_wheel'], big: 'A_big', cheer: 'A_cheer', carry: ['A_bowl1', 'A_bowl2'], walkClip: { side: [0, 1, 2, 3, 4, 5, 6, 7].map(i => 'A_ws' + i), q: [0, 1, 2, 3, 4, 5, 6, 7].map(i => 'A_wq' + i) }, carryClip: { front: ['A_cw0', 'A_cw1', 'A_cw2', 'A_cw3'], q: ['A_cw4', 'A_cw5', 'A_cw6', 'A_cw7'], side: ['A_cw8', 'A_cw9', 'A_cw10', 'A_cw11'], stand: 'A_cw0', standQ: 'A_cw4', standSide: 'A_cw8' } },
  B: { front: 'B_front', q: 'B_q', side: 'B_side', bq: 'B_bq', back: 'B_back', walk: ['B_w1', 'B_w2', 'B_w3', 'B_w2'], walkFront: ['B_front'], sit: ['B_x1', 'B_x2', 'B_x3', 'B_x2'], big: 'B_big', cheer: 'B_cheer', carry: ['B_bowl'] }
};
let PLAYER_KEY = 'A';
try { PLAYER_KEY = localStorage.getItem('heukmaru-char') === 'B' ? 'B' : 'A'; } catch {}

const player = new THREE.Group(); scene.add(player);
player.position.set(-2.6, 0, 2.4); player.rotation.y = Math.PI * 0.25;
player.userData = { pose: 'stand', walkAmt: 0, phase: 0 };
const playerActor = makeActor();
/* 3D 점토 인형 캐릭터 (char3d.js) — 그림 캐릭터 대신 내 캐릭터로 써요 */
const USE_3D = !!window.HeukChar3D;
const C3 = {};
if (USE_3D) for (const k of ['A', 'B']) {
  const c = HeukChar3D.make(k); c.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  const bb = new THREE.Box3().setFromObject(c.root), h = bb.max.y - bb.min.y; c.scale = 1.22 / h; c.root.scale.setScalar(c.scale);
  c.root.visible = false; scene.add(c.root); C3[k] = c;
}
let heldMesh = null, heldId = null, gesture = null, gestureUntil = 0;
function doGesture(kind) {
  if (!USE_3D || sitting || fading) return;
  gesture = kind; gestureUntil = performance.now() + (kind === 'bow' ? 1600 : 1900); netGesture = { g: kind, gt: Date.now() };
  goal = null; route = []; marker.visible = false;
  if (kind === 'wave' || kind === 'clap') C3[PLAYER_KEY].set(kind);
  const b = $(kind === 'bow' ? '#bowBtn' : kind === 'clap' ? '#clapBtn' : '#waveBtn'); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 900);
  setHint(kind === 'bow' ? '🙇 꾸벅 인사했어요' : kind === 'clap' ? '👏 짝짝짝' : '👋 손을 흔들었어요');
}
function syncHeld(c) {
  const id = carrying ? carrying.id : null;
  if (id !== heldId) { if (heldMesh) { heldMesh.parent && heldMesh.parent.remove(heldMesh); heldMesh = null; }
    heldId = id; if (carrying) { heldMesh = pieceMesh(carrying, 0.28 / c.scale); heldMesh.traverse(m => m.userData.noFade = true); heldMesh.position.set(0, -0.05, 0.02); c.holdPt.add(heldMesh); } }
}
/* 캐릭터 그리기: 몸을 기울이거나 튕기지 않고, 그림 컷만 바꿔서 움직임을 만든다 (초당 8컷) */
const FPS = 10;   // 8컷 걷기 한 바퀴 0.8초
function viewOf(aa) { return aa < 0.42 ? 'front' : aa < 1.2 ? 'q' : aa < 1.95 ? 'side' : aa < 2.75 ? 'bq' : 'back'; }
function drawChar(actor, key, x, z, yaw, walking, t, carry, fps = FPS) {
  const S = SET[key], a = screenAngle(yaw), aa = Math.abs(a), step = Math.floor(t * fps), now = performance.now();
  // 방향 그림은 새 방향이 0.15초 넘게 유지될 때만 바꿈 (장애물 피할 때 깜빡임 방지)
  const v = viewOf(aa), r = a > 0;
  if (!actor.view) { actor.view = v; actor.right = r; }
  if (v !== actor.view || r !== actor.right) { if (actor.candKey !== v + r) { actor.candKey = v + r; actor.candT = now; } else if (now - actor.candT > 150) { actor.view = v; actor.right = r; } }
  else actor.candKey = null;
  const view = actor.view, right = actor.right;
  actor.mesh.rotation.z = 0; actor.blob.scale.set(1, 0.6, 1);
  let name, flip = false;
  if (carry && S.carryClip) {                         // 작품 들고 걷기 (GIF 컷: 정면 · 3/4 · 옆, 원본은 오른쪽을 봄)
    const C = S.carryClip;
    if (view === 'front') name = walking ? C.front[step % 4] : C.stand;
    else if (view === 'q') { name = walking ? C.q[step % 4] : C.standQ; flip = !right; }
    else { name = walking ? C.side[step % 4] : C.standSide; flip = !right; }
  } else if (carry) { name = S.carry[0]; }
  else if (walking && S.walkClip) {                   // AI로 만든 8컷 걷기 (원본은 오른쪽을 봄): 정면·3/4 → 3/4 앞 걷기, 옆·뒤 → 옆 걷기
    const clip = view === 'front' || view === 'q' ? S.walkClip.q : S.walkClip.side;
    name = clip[step % clip.length]; flip = !right;
  }
  else if (walking) {                                 // 걷기: 정면 컷 / 그 외(3/4·옆·뒤)는 옆 걷기 컷 — 뒤로 걷는 컷이 없어서 미끄러지지 않게
    if (view === 'front') name = S.walkFront[step % S.walkFront.length];
    else { name = S.walk[step % S.walk.length]; flip = right; }
  }
  else if (view === 'front') name = S.front;
  else if (view === 'q' || view === 'side') { name = view === 'q' ? S.q : S.side; flip = right; }
  else if (view === 'bq') { name = S.bq; flip = !right; }
  else name = S.back;
  showFrame(actor, name, x, z, flip);
}
let last3d = performance.now();
function drawPlayer3d(now) {
  const u = player.userData, p = player.position, c = C3[PLAYER_KEY], dt = Math.min(0.05, (now - last3d) / 1000); last3d = now;
  for (const k in C3) C3[k].root.visible = k === PLAYER_KEY;
  playerActor.mesh.visible = false; playerActor.blob.visible = true;
  syncHeld(c);
  if (bench) {
    if (gesture && now > gestureUntil) gesture = null;
    c.set('sit'); c.root.position.set(bench.x, 0.47 - 0.075 * c.scale, bench.z); c.root.rotation.y = bench.yaw;
    playerActor.blob.position.set(bench.x, 0.48, bench.z); c.update(dt, false); return;
  }
  if (u.pose === 'sit' && sitTarget) {
    const w = sitTarget; c.set('sit'); c.root.position.set(w.seat.x, 0.44 - 0.075 * c.scale, w.seat.z + 0.02); c.root.rotation.y = 0;
    playerActor.blob.position.set(w.seat.x, 0.008, w.seat.z); c.update(dt, false); return;
  }
  const walking = u.walkAmt > 0.35;
  if (gesture && now > gestureUntil) gesture = null;
  c.set(carrying ? 'carry' : gesture === 'bow' ? 'bow' : 'idle'); if (now < cheerUntil && !c._cheer) { c.set('wave'); c._cheer = true; } if (now >= cheerUntil) c._cheer = false;
  c.root.position.set(p.x, 0, p.z); c.root.rotation.y = player.rotation.y;
  playerActor.blob.position.set(p.x, 0.008, p.z); playerActor.blob.scale.set(1, 0.6, 1);
  c.update(dt, walking, Math.max(0.6, Math.min(1.3, u.walkAmt)));
}
function drawPlayer(now) {
  if (USE_3D) return drawPlayer3d(now);
  const u = player.userData, S = SET[PLAYER_KEY], p = player.position;
  playerActor.mesh.rotation.z = 0;
  if (u.pose === 'sit') {
    const w = sitTarget, f = S.sit[Math.floor(now / 1000 * 4) % S.sit.length];
    showFrame(playerActor, f, w.g.position.x, w.g.position.z - 0.12, false);
    playerActor.blob.scale.set(1.6, 0.9, 1);
    return;
  }
  if (performance.now() < cheerUntil) { playerActor.blob.scale.set(1, 0.6, 1); showFrame(playerActor, S.cheer, p.x, p.z, false); return; }
  drawChar(playerActor, PLAYER_KEY, p.x, p.z, player.rotation.y, u.walkAmt > 0.35, u.phase / 9, !!carrying, 13);   // 이동 속도에 맞춰 발이 미끄러지지 않게
}

/* 물레 차는 선생님 (포스터 캐릭터) — 3번 물레 자리, 물레실에서 계속 빚는 중 */
const teacher = new THREE.Group(); scene.add(teacher);
// NPC(선생님·손님·단짝) 표시 끄기 — 요청으로 모두 뺐어요. 다시 넣으려면 true
const SHOW_NPC = false;
const TW = WHEELS[2]; if (SHOW_NPC) { TW.g.visible = false; TW.stool.visible = false; }
teacher.position.set(TW.g.position.x, 0, TW.g.position.z - 0.1);
const teacherActor = makeActor();

/* 공방 손님들(포스터 캐릭터): 그림이 한 장씩이라 보이는 데서는 걷지 않고,
   각자 자리에서 구경·작업을 해요. 내가 다른 방에 있거나 물레를 차는 동안에만 자리를 옮겨요. */
// face: 그림 속 캐릭터가 보는 쪽 (-1 화면 왼쪽, 0 정면). 걷는 자세 그림(N_bowls, N_braid)은 서 있으면 굳어 보여서 걷기 컷이 생길 때까지 뺐어요.
const NPCS = [
  { name: 'N_beanie', room: 'studio', face: 0, likes: 'work' }, { name: 'N_cap', room: 'studio', face: -1, likes: 'look' },
  { name: 'N_smile', room: 'glaze', face: 0, likes: 'work' }, { name: 'N_glasses', room: 'gallery', face: -1, likes: 'look' }
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
  const all = ROOMS[n.room].spots.filter(sp => !spotTaken(n, sp, n.room)), pref = all.filter(sp => sp.kind === n.likes), free = pref.length ? pref : all;
  n.spot = free.length ? free[Math.floor(Math.random() * free.length)] : ROOMS[n.room].spots[0];
  n.x = n.spot.x; n.z = n.spot.z; n.until = now + 9000 + Math.random() * 12000;
}
NPCS.forEach(n => { const all = ROOMS[n.room].spots.filter(sp => !NPCS.some(o => o !== n && o.spot === sp)), pref = all.filter(sp => sp.kind === n.likes), f = pref.length ? pref : all; n.spot = f[n.seed % f.length]; n.x = n.spot.x; n.z = n.spot.z; n.until = performance.now() + 8000 + n.seed * 3000; });
const craftOn = () => !!(window.HeukCraft && HeukCraft.active);
const roomVisible = id => id === curRoom && !(window.HeukThrow && HeukThrow.active) && !craftOn() && !fading;
function peopleHere() { if (!SHOW_NPC) return []; return NPCS.filter(n => n.room === curRoom).concat(partner.room === curRoom ? [partner] : []); }   // 지금 방에 보이는 손님·단짝
// 보는 물건이 화면 오른쪽에 있으면 오른쪽을 보게 뒤집기
function lookFlip(n) { if (!n.spot || !n.face) return false; const ox = Math.sin(n.spot.face), oz = Math.cos(n.spot.face), sx = ox * CAM_RIGHT.x + oz * CAM_RIGHT.z; return sx > 0.05; }

/* 단짝 캐릭터: 내가 고르지 않은 캐릭터(A↔B). 걷기·작업 컷이 있어서 보이는 데서도 걸어 다녀요.
   B: 시유실 유약 작업대에서 붓으로 유약 바르기(GIF 12컷)  /  A: 작품을 들고 방을 오가며 구경(GIF 12컷) */
let PARTNER_KEY = PLAYER_KEY === 'A' ? 'B' : 'A';
// 시유실 유약 바르던 B와 작업대는 뺐어요 (요청). 단짝은 시유실에 들어가지 않아요.
const partner = { key: PARTNER_KEY, actor: makeActor(), obj: (() => { const g = new THREE.Group(); scene.add(g); return g; })(),
  room: 'dry', x: 0, z: 0, yaw: 0, state: 'do', until: 0, t0: 0, walkT: 0, target: null, spot: null, stuck: 0 };
function resetPartner() {     // 내가 고른 캐릭터가 바뀌면 단짝도 바뀜
  PARTNER_KEY = PLAYER_KEY === 'A' ? 'B' : 'A'; const P = partner; P.key = PARTNER_KEY; P.state = 'do'; P.target = null; P.t0 = performance.now();
  { P.room = P.key === 'B' ? 'gallery' : 'dry'; const sp = ROOMS[P.room].spots.find(o => o.kind === 'look') || ROOMS[P.room].spots[0]; P.spot = sp; P.x = sp.x; P.z = sp.z; P.yaw = sp.face; P.until = performance.now() + 6000; }
}
resetPartner();
partner.obj.position.set(partner.x, 0, partner.z);
function partnerPlan(now) {
  const P = partner, R0 = ROOMS[P.room];
  const okDoors = R0.doors.filter(o => o.to !== 'glaze');
  if (okDoors.length && Math.random() < 0.3) { const d = okDoors[Math.floor(Math.random() * okDoors.length)]; P.target = { x: d.x + 0.05, z: d.z, door: d }; P.spot = null; }
  else { const free = R0.spots.filter(sp => !spotTaken(P, sp, P.room)); const sp = free[Math.floor(Math.random() * free.length)] || R0.spots[0]; P.spot = sp; P.target = { x: sp.x, z: sp.z }; }
  P.state = 'walk'; P.stuck = 0;
}
function partnerStep(dt, now) {
  const P = partner;
  if (P.state === 'do') { if (now > P.until) partnerPlan(now); return; }
  const t = P.target, dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
  if (d < 0.06) {
    if (t.door) { const to = t.door.to, back = ROOMS[to].doors.find(o => o.to === P.room) || ROOMS[to].doors[0]; P.room = to; P.x = back.x + 0.6; P.z = back.z; P.yaw = Math.PI / 2; P.state = 'do'; P.until = now + 300; P.spot = null; return; }
    P.state = 'do'; P.t0 = now; P.until = now + 4000 + Math.random() * 5000;
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
  if (!SHOW_NPC) { teacherActor.mesh.visible = teacherActor.blob.visible = false; for (const n of NPCS) n.actor.mesh.visible = n.actor.blob.visible = false; partner.actor.mesh.visible = partner.actor.blob.visible = false; return; }
  const inStudio = curRoom === 'studio';
  teacherActor.mesh.visible = teacherActor.blob.visible = inStudio;
  if (inStudio) { showFrame(teacherActor, 'N_teacher', teacher.position.x, teacher.position.z, false); teacherActor.mesh.rotation.z = 0; teacherActor.blob.scale.set(1.8, 0.9, 1); }
  for (const n of NPCS) {
    const vis = roomVisible(n.room);
    if (!vis && now > n.until) npcRelocate(n, now);
    const show = n.room === curRoom; n.actor.mesh.visible = n.actor.blob.visible = show; n.obj.position.set(n.x, 0, n.z);
    if (!show) continue;
    n.actor.mesh.rotation.z = 0;
    showFrame(n.actor, n.name, n.x, n.z, lookFlip(n));
  }
  // 단짝
  const P = partner; partnerStep(dt, now); P.obj.position.set(P.x, 0, P.z);
  const pv = P.room === curRoom; P.actor.mesh.visible = P.actor.blob.visible = pv;
  if (!pv) return;
  drawChar(P.actor, P.key, P.x, P.z, P.yaw, P.state === 'walk', P.walkT, P.key === 'A');
}

function seatOn(ch, w) {
  const u = ch.userData; u.pose = 'sit'; u.walkAmt = 0;
  ch.position.copy(w.seat);
  if (!USE_3D) { w.g.visible = false; w.stool.visible = false; }            // 그림 캐릭터일 때만: 시트 속 물레 그림이 대신 보임
}
function standUp(ch, w) { ch.userData.pose = 'stand'; if (w) { w.g.visible = true; w.stool.visible = true; } }

/* ---------- 이동 · 충돌 ---------- */
const R = 0.24;
function inBounds(rid, x, z, r) {
  const B = ROOMS[rid], b = B.b;
  if (x < b.x0 + r || x > b.x1 - r || z < b.z0 + r) return false;
  if (z <= b.z1 - r) return true;
  return B.dx !== undefined && Math.abs(x - B.dx) < 0.7 - r && z < b.z1 + 0.75;    // 앞벽 문 칸은 지나갈 수 있어요
}
function blocked(x, z) {
  if (!inBounds(curRoom, x, z, R)) return true;
  for (const c of colliders) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + R) return true; }
    else if (x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R) return true;
  }
  for (const n of peopleHere()) if (Math.hypot(x - n.x, z - n.z) < 0.4) return true;   // 사람끼리 통과하지 않게
  return false;
}
let steerBias = 1; const keys = new Set(); let goal = null, sitting = false, sitTarget = null;
/* 문(밖)으로 걸어 나갈 수 있는 칸 지도 — 방마다 한 번 계산해 두고 써요 */
const REACH = {};
function reachMap(rid = curRoom) {
  if (REACH[rid]) return REACH[rid];
  const B = ROOMS[rid], b = B.b, C = rid === 'yard' ? 0.25 : 0.1, x0 = b.x0, z0 = b.z0, W = Math.ceil((b.x1 - x0) / C) + 1, Hh = Math.ceil((b.z1 + 0.8 - z0) / C) + 1;
  const ok = new Uint8Array(W * Hh), q = [], save = curRoom, saveCols = colliders; curRoom = rid; colliders = B.cols;
  const start = rid === 'yard' ? { x: YARD_HUB.x, z: YARD_HUB.z } : { x: B.dx, z: ROOM.z1 - 0.7 };
  const si = Math.round((start.x - x0) / C), sj = Math.round((start.z - z0) / C); ok[sj * W + si] = 1; q.push(si, sj);
  for (let h = 0; h < q.length; h += 2) { const i = q[h], j = q[h + 1];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj, k = c * W + a; if (a < 0 || c < 0 || a >= W || c >= Hh || ok[k]) continue;
      if (!blocked(x0 + a * C, z0 + c * C)) { ok[k] = 1; q.push(a, c); } else ok[k] = 2; } }
  curRoom = save; colliders = saveCols;
  return (REACH[rid] = { has: (x, z) => { const i = Math.round((x - x0) / C), j = Math.round((z - z0) / C); return i >= 0 && j >= 0 && i < W && j < Hh && ok[j * W + i] === 1; } });
}
function exitSpotNear(x, z) {            // 막히지 않았고 문까지 걸어 나갈 수 있는 가장 가까운 자리
  const m = reachMap();
  if (m.has(x, z)) return { x, z };
  for (let r = 0.1; r < 4; r += 0.08) for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (m.has(px, pz) && !blocked(px, pz)) return { x: px, z: pz }; }
  return freeSpotNear(x, z);
}
function freeSpotNear(x, z) {          // 막히지 않은 가장 가까운 자리
  if (!blocked(x, z)) return { x, z };
  for (let r = 0.1; r < 2.5; r += 0.08) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (!blocked(px, pz)) return { x: px, z: pz }; }
  return { x, z };
}
function penetration(x, z) {           // 충돌 범위에 얼마나 깊이 들어가 있는지
  let d = 0;
  for (const c of colliders) {
    if (c.type === 'circle') d = Math.max(d, c.r + R - Math.hypot(x - c.x, z - c.z));
    else if (x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R) d = Math.max(d, Math.min(x - (c.x0 - R), c.x1 + R - x, z - (c.z0 - R), c.z1 + R - z));
  }
  for (const n of peopleHere()) d = Math.max(d, 0.4 - Math.hypot(x - n.x, z - n.z));
  return d;
}
/* 길찾기(A*): 0.1칸 격자에서 장애물을 돌아가는 길을 찾고, 직선으로 갈 수 있는 구간은 합쳐요 */
function clearLine(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.05); for (let i = 1; i <= n; i++) { const t = i / n; if (blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
function findPath(fx, fz, tx, tz) {
  const t = freeSpotNear(tx, tz); tx = t.x; tz = t.z;
  if (blocked(fx, fz)) { const f = freeSpotNear(fx, fz); return [f, ...findPath(f.x, f.z, tx, tz)]; }   // 막힌 곳에서 출발하면 가까운 빈자리부터
  if (clearLine(fx, fz, tx, tz)) return [{ x: tx, z: tz }];
  const RB = ROOMS[curRoom].b, CELL = ROOMS[curRoom].cell, X0 = RB.x0, Z0 = RB.z0, W = Math.ceil((RB.x1 - X0) / CELL) + 1, H = Math.ceil((RB.z1 + (ROOMS[curRoom].dx !== undefined ? 0.8 : 0) - Z0) / CELL) + 1;
  const ci = (x, z) => Math.round((x - X0) / CELL) + Math.round((z - Z0) / CELL) * W, cx = i => X0 + (i % W) * CELL, cz = i => Z0 + Math.floor(i / W) * CELL;
  const free = new Int8Array(W * H).fill(-1), ok = i => { if (free[i] < 0) free[i] = blocked(cx(i), cz(i)) ? 0 : 1; return free[i] === 1; };
  const start = ci(fx, fz), goalI = ci(tx, tz), g = new Float32Array(W * H).fill(1e9), from = new Int32Array(W * H).fill(-1), open = [start], closed = new Uint8Array(W * H);
  g[start] = 0; const hh = i => Math.hypot(cx(i) - tx, cz(i) - tz);
  let found = false, guard = 0, bestI = start, bestH = hh(start);
  while (open.length && guard++ < 20000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (g[open[k]] + hh(open[k]) < g[open[bi]] + hh(open[bi])) bi = k;
    const c = open.splice(bi, 1)[0]; if (c === goalI) { found = true; break; } closed[c] = 1; if (hh(c) < bestH) { bestH = hh(c); bestI = c; }
    const x = c % W, z = Math.floor(c / W);
    for (const [ddx, ddz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + ddx, nz = z + ddz; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const n = nx + nz * W; if (closed[n] || (n !== goalI && !ok(n))) continue;
      if (ddx && ddz && (!ok(x + ddx + z * W) || !ok(x + (z + ddz) * W))) continue;   // 모서리 끼기 방지
      const ng = g[c] + (ddx && ddz ? 1.414 : 1) * CELL * 10; if (ng < g[n]) { g[n] = ng; from[n] = c; if (!open.includes(n)) open.push(n); }
    }
  }
  const endI = found ? goalI : bestI;                     // 못 가는 곳이면 가장 가까이 갈 수 있는 곳까지
  if (endI === start) return [{ x: fx, z: fz }];
  const pts = []; for (let i = endI; i !== -1 && i !== start; i = from[i]) pts.unshift({ x: cx(i), z: cz(i) }); if (found) pts[pts.length - 1] = { x: tx, z: tz };
  const out = []; let ax = fx, az = fz, k = 0;                   // 직선으로 갈 수 있으면 건너뛰기
  while (k < pts.length) { let j = pts.length - 1; while (j > k && !clearLine(ax, az, pts[j].x, pts[j].z)) j--; out.push(pts[j]); ax = pts[j].x; az = pts[j].z; k = j + 1; }
  return out;
}
function walkTo(x, z) { const p0 = player.position; if (curRoom !== 'yard' && !sitting && !reachMap().has(p0.x, p0.z)) { const e = exitSpotNear(p0.x, p0.z); if (Math.hypot(e.x - p0.x, e.z - p0.z) > 0.12) p0.set(e.x, 0, e.z); }   // 갇혔으면 빼 줘요
  route = findPath(player.position.x, player.position.z, x, z); goal = route.shift(); }
function stepMove(dx, dz, dt) {
  const len = Math.hypot(dx, dz); if (len < 1e-4) return false;
  const sp = (curRoom === 'yard' ? 2.5 : 1.7) * dt, p = player.position, base = Math.atan2(dx, dz);
  let moved = false, used = base;
  // 막히면 좌우로 조금씩 꺾어 장애물을 돌아감
  for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.57, -1.57]) {
    const a = base + (steerBias || 1) * off, mx = Math.sin(a) * sp, mz = Math.cos(a) * sp;
    const ok = !blocked(p.x + mx, p.z + mz) || (blocked(p.x, p.z) && penetration(p.x + mx, p.z + mz) < penetration(p.x, p.z));   // 이미 막힌 곳에 있으면 빠져나가는 쪽은 허용
    if (ok) { p.x += mx; p.z += mz; moved = true; used = a; if (off) steerBias = Math.sign(off) * (steerBias || 1) || 1; break; }
  }
  const want = used; let diff = want - player.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.rotation.y += diff * Math.min(1, dt * 12);
  return moved;
}

/* ---------- 입력 ---------- */
const uiBusy = () => !document.querySelector('#pick').hidden || (window.HeukThrow && window.HeukThrow.active) || craftOn();
addEventListener('keydown', e => {
  if (uiBusy()) { keys.clear(); return; }
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); goal = null; route = []; e.preventDefault(); if (bench) standBench(); stopFollow(); }
  if (k === 'e') sitting ? stand() : trySit();
  if (k === '1') doGesture('wave');
  if (k === '2') doGesture('bow');
  if (k === '3') doGesture('clap');
  if (k === 'q' && carrying && curRoom === 'studio') putOnTable();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(UP, 0);
let down = null;
const touches = new Map(); let pinch0 = 0, view0 = 0, dragging = false;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY }; dragging = false; touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); view0 = viewTarget; down = null; } });
renderer.domElement.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); viewTarget = THREE.MathUtils.clamp(view0 * pinch0 / Math.max(20, d), 2.2, 10); return; }
  if (!down || !(e.buttons & 1) && e.pointerType === 'mouse') return;
  if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) dragging = true;
  if (dragging) { const k = 4.2 / Math.min(innerWidth, innerHeight);
    CAM.yawT = THREE.MathUtils.clamp(CAM.yawT - (e.clientX - down.lx) * k, CAM.YAW_MIN, CAM.YAW_MAX);
    CAM.pitchT = THREE.MathUtils.clamp(CAM.pitchT + (e.clientY - down.ly) * k * 0.7, CAM.PITCH_MIN, CAM.PITCH_MAX); }
  down.lx = e.clientX; down.ly = e.clientY;
});
const endTouch = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; };
renderer.domElement.addEventListener('pointercancel', e => { endTouch(e); down = null; });
renderer.domElement.addEventListener('pointerup', e => {
  endTouch(e);
  if (!down || dragging || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down = null; return; } down = null;
  if (sitting || fading) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  pendingPlace = null;
  { const pid = peerAt(ray); if (pid) { openPeerMenu(pid, e.clientX, e.clientY); return; } }
  { const tp = tablePieceAt(e.clientX, e.clientY); if (tp != null) { const pc = loadPieces().find(o => o.id === tp); if (pc && takeUp(pc)) setHint('작업대에서 작품을 들었어요 · 🖼 전시관으로 가져가요'); return; } }
  // 문을 누르면 문 앞 매트로 걸어감
  const dh = ray.intersectObjects(ROOMS[curRoom].doors.map(d => d.g), true).filter(h => { for (let q = h.object; q; q = q.parent) if (!q.visible) return false; return true; });
  if (dh.length) { const d = ROOMS[curRoom].doors.find(d => { let o = dh[0].object; while (o) { if (o === d.g) return true; o = o.parent; } return false; }); if (d) { sitTarget = null; crossTarget = Object.assign({}, d.dest); planCross(); showMarker(V(d.x, 0, d.z)); setHint(`${ROOM_INFO[d.to].icon} ${josaRo(ROOM_INFO[d.to].name)} 가요`); return; } }
  if (curRoom === 'gallery') {
    const ph = ray.intersectObjects(PEDESTALS.map(p => p.g), true);
    if (ph.length) { const i = PEDESTALS.findIndex(p => { let o = ph[0].object; while (o) { if (o === p.g) return true; o = o.parent; } return false; });
      if (i >= 0) { const p = PEDESTALS[i]; if (carrying && !p.fixed && !p.piece) { walkToPedestal(i); setHint('받침대로 가서 내려놓아요'); } else pieceInfo(p); return; } }
  }
  if (curRoom !== 'studio') { const pt = V(); if (ray.ray.intersectPlane(ground, pt)) tapGround(pt); return; }
  // 물레를 누르면 앉으러 감
  if (SHOW_NPC && ray.intersectObjects([WHEELS[2].g, WHEELS[2].stool], true).length || (() => { const p = V(); ray.ray.intersectPlane(ground, p); return SHOW_NPC && p && Math.hypot(p.x - WHEELS[2].g.position.x, p.z - WHEELS[2].g.position.z) < 0.55; })()) { setHint('선생님 자리예요. 1·2번 물레를 써요'); return; }
  const hits = ray.intersectObjects(FREE_WHEELS().map(w => w.g), true);
  if (hits.length) { const w = WHEELS.find(w => hits[0].object.parent === w.g || hits[0].object.parent?.parent === w.g); if (w) return trySit(w); }
  const pt = V(); if (ray.ray.intersectPlane(ground, pt)) tapGround(pt);
});
renderer.domElement.addEventListener('wheel', e => { viewTarget = THREE.MathUtils.clamp(viewTarget * (1 + e.deltaY * 0.0012), 2.2, 10); e.preventDefault(); }, { passive: false });
renderer.domElement.style.touchAction = 'none';
// 이동 목표 표시
const marker = add(scene, new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.8, depthWrite: false }), 0, 0.01, 0, { rx: -Math.PI / 2, cast: false });
marker.visible = false;
function showMarker(p) { marker.position.set(p.x, 0.012, p.z); marker.visible = true; marker.userData.t = 0; }

/* ---------- 앉기 / 일어서기 ---------- */
const sitBtn = $('#sitBtn'), hint = $('#hint');
const FREE_WHEELS = () => WHEELS.filter((w, i) => (!SHOW_NPC || i !== 2) && !(typeof wheelBusy === 'function' && wheelBusy(i)));
function nearestFreeWheel() {
  const free = FREE_WHEELS();
  return free.sort((a, b) => a.seat.distanceTo(player.position) - b.seat.distanceTo(player.position))[0];
}
let route = [];
function trySit(w = nearestFreeWheel(), force = false) {
  if (curRoom !== 'studio') return;
  if (!w) { setHint('물레가 다 차 있어요 · 잠깐 기다려요'); return; }
  { const bz = wheelBusy(WHEELS.indexOf(w)); if (bz) { setHint(`${bz.st.n}님이 쓰는 물레예요 · 다른 물레를 써요`); return; } }
  if (carrying) { setHint('작품을 들고 있어요. 전시관에 놓거나 작업대에 둬요'); sitTarget = null; return; }
  const approach = V(w.seat.x, 0, w.seat.z - 0.42), p = player.position;
  if (!force && Math.hypot(p.x - approach.x, p.z - approach.z) > 0.25) {
    // 물레 앞쪽에 있으면 옆으로 돌아서 뒤쪽 의자로
    walkTo(approach.x, approach.z); sitTarget = w; setHint('물레 쪽으로 걸어가요'); return;
  }
  route = [];
  sitting = true; goal = null; sitTarget = w;
  seatOn(player, w); updateDock();
  viewTarget = 3.6; setHint('흙을 물레 가운데에 올렸어요');
  if (window.HeukThrow) window.HeukThrow.open({ skin: PLAYER_KEY === 'B' ? '#f3bda6' : '#f0b39b', onExit: () => stand(), say: t => sayTeacher(t), onCarry: pc => startCarry(pc) });
}
function stand() {
  if (!sitting) return; sitting = false; standUp(player, sitTarget);
  const spot = exitSpotNear(sitTarget.seat.x, sitTarget.seat.z - 0.42); player.position.set(spot.x, 0, spot.z); player.rotation.y = Math.PI;
  goal = null; route = []; keys.clear(); sitTarget = null;
  nearKey = ''; updateDock(); viewTarget = DEFAULT_VIEW; setHint('바닥을 누르거나 WASD로 걸어요');
}
sitBtn.onclick = () => (sitting ? stand() : trySit(NEAR_WHEEL || undefined));
// 캐릭터 고르기
const pick = $('#pick');
const NAME_A = ['느긋한', '다정한', '포근한', '고요한', '말랑한', '반짝이는', '수줍은', '따뜻한', '조용한', '촉촉한', '동그란', '살랑이는', '보송한', '둥실한'];
const NAME_B = ['백자', '청자', '분청', '물레', '찻사발', '달항아리', '흙손', '가마불', '유약', '굽칼', '찻잔', '옹기', '흙덩이', '접시'];
const rollName = () => NAME_A[Math.floor(Math.random() * NAME_A.length)] + ' ' + NAME_B[Math.floor(Math.random() * NAME_B.length)];
let MY_NAME = ''; try { MY_NAME = localStorage.getItem('heukmaru-name') || ''; } catch {}
if (!MY_NAME) { MY_NAME = rollName(); try { localStorage.setItem('heukmaru-name', MY_NAME); } catch {} }
function showName() { $('#myName').textContent = MY_NAME; nametag.innerHTML = '<em>나</em>' + MY_NAME; }
$('#reroll').onclick = () => { MY_NAME = rollName(); try { localStorage.setItem('heukmaru-name', MY_NAME); } catch {} showName(); };
let pickShots = false;
function pickThumbs() {
  if (pickShots || !USE_3D) return; pickShots = true;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(300, 420, false); r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#fff7ee', '#b9a892', 1.25)); const dl = new THREE.DirectionalLight('#fff3df', 1.25); dl.position.set(1.5, 3, 4); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(26, 300 / 420, 0.05, 20);
  for (const k of ['A', 'B']) {
    const c = HeukChar3D.make(k); sc.add(c.root); c.set('idle'); c.update(0.016, false);
    const bb = new THREE.Box3().setFromObject(c.root), h = bb.max.y - bb.min.y, cy = (bb.max.y + bb.min.y) / 2;
    const d = h / (2 * Math.tan(THREE.MathUtils.degToRad(13))) * 1.12; cam.position.set(Math.sin(0.35) * d, cy + 0.12, Math.cos(0.35) * d); cam.lookAt(0, cy, 0);
    r.render(sc, cam); pick.querySelector(`.who[data-k="${k}"] img`).src = r.domElement.toDataURL(); sc.remove(c.root);
  }
  r.dispose();
}
function openPick() { pickThumbs(); showName(); pick.hidden = false; }
pick.querySelectorAll('.who').forEach(b => b.onclick = () => {
  PLAYER_KEY = b.dataset.k; try { localStorage.setItem('heukmaru-char', PLAYER_KEY); } catch {}
  resetPartner();
  pick.hidden = true; setHint(sitting ? '물레에 앉아 있어요' : '바닥을 누르거나 WASD로 걸어요');
});
$('#changeChar').onclick = openPick;
const nametag = $('#nametag'); showName();
$('#waveBtn').onclick = () => doGesture('wave'); $('#bowBtn').onclick = () => doGesture('bow');
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
  if (now > nextBubble && SHOW_NPC) {
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
roomNav.innerHTML = ['yard', ...ROOM_ORDER].map(id => `<button data-r="${id}" title="${ROOM_INFO[id].name}"><i>${ROOM_INFO[id].icon}</i><span>${ROOM_INFO[id].short}</span></button>`).join('');
roomNav.querySelectorAll('button').forEach(b => b.onclick = () => { if (!sitting && b.dataset.r !== curRoom) goRoom(b.dataset.r); });
function applyRoom(id, from) {
  curRoom = id; colliders = ROOMS[id].cols; attachActors(id);
  const d = ROOMS[id].doors.find(o => o.to === from) || ROOMS[id].doors[0];
  player.position.set(d.spawn.x, 0, d.spawn.z); player.rotation.y = d.spawn.yaw; doorLock = null;
  goal = null; route = []; sitTarget = null; marker.visible = false; pendingPlace = null; crossTarget = null;
  camFocus.copy(toWorld(id, player.position.x, player.position.z, 0.62));
  if (id !== 'yard') { CAM.yaw = CAM.yawT = ROOMS[id].g.rotation.y + YAW0; if (viewTarget > 6) viewTarget = DEFAULT_VIEW; } else if (viewTarget < 6.4) viewTarget = 6.4;
  roomUI(id);
}
const ROOM_HINT = {
  yard: () => carrying ? '마당 건너 오른쪽 🖼 전시관으로 들고 가요' : '건물 문으로 걸어 들어가요 · 화면을 끌어 빙 둘러봐요',
  studio: () => carrying ? '문 밖으로 나가 🖼 전시관으로 들고 가요' : '물레 가까이 가면 🏺 도자기 빚기 단추가 떠요 · 물레를 눌러도 돼요',
  dry: () => { const L = loadPieces().filter(p => HeukCraft.stageOf(p) === 'raw'); return L.length ? `굽 깎을 그릇 ${L.length}개 · 굽깎기 물레 앞으로 가요 (빚고 15초~2분이 깎기 좋아요)` : '빚은 그릇을 뒤집어 굽을 깎는 방이에요 · 굽을 깎아야 가마에 넣을 수 있어요'; },
  kiln: () => { const k = window.HeukCraft && HeukCraft.kilnInfo(); return k && k.phase === 'firing' ? `가마가 굽는 중이에요 · ${k.left}초 남음` : k && k.phase === 'done' ? '🔥 다 구워졌어요! 가마 앞으로 가서 열어요' : '마른 그릇은 초벌, 유약 바른 그릇은 재벌해요 · 반짝이는 가마 앞으로 가요'; },
  glaze: () => '초벌한 그릇을 꾸미고 유약에 담가요 · 유약통 앞으로 가요',
  gallery: () => carrying ? '빛나는 빈 받침대를 눌러 작품을 놓아요' : '받침대를 누르면 작품 정보를 볼 수 있어요'
};
function goRoom(id) {
  if (fading || id === curRoom) return; fading = true; const from = curRoom;
  fadeEl.classList.add('on');
  setTimeout(() => { applyRoom(id, from); fadeEl.classList.remove('on'); setTimeout(() => fading = false, 250); }, 260);
}
function checkDoors() {
  return;
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
function savePieces(list) { let k = 0; list = list.filter(pc => pc.place === 'gallery' || pc.place === 'carry' || pc.stage === 'bisque' || pc.stage === 'glazed' || k++ < 30); try { localStorage.setItem('heukmaru-pieces', JSON.stringify(list)); } catch {} }
function pieceMesh(pc, scale) {
  if (window.HeukCraft) return HeukCraft.makeMesh(pc, scale);
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
  setHint('작품을 들었어요! 마당 건너 🖼 전시관으로 가요');
  if (SHOW_NPC) say(teacher, '전시관에 놓으면 다들 볼 수 있어요!', 1.25, 3600);
}
function updateGalleryGlow() { PEDESTALS.forEach(p => p.glow.material.opacity = 0); }
let galMigrated = false;
function renderGallery() {
  if (!galMigrated) { galMigrated = true; const L = loadPieces(); let ch = false;      // 전시관 받침대 배치가 바뀌어서 없어진 자리의 작품은 빈 자리로 옮겨요
    for (const o of L) if (o.place === 'gallery' && (!PEDESTALS[o.slot] || PEDESTALS[o.slot].fixed || L.some(q => q !== o && q.place === 'gallery' && q.slot === o.slot && L.indexOf(q) < L.indexOf(o)))) {
      const free = PEDESTALS.findIndex((pd, i) => !pd.fixed && !L.some(q => q.place === 'gallery' && q.slot === i)); if (free >= 0) o.slot = free; else o.place = 'table'; ch = true; }
    if (ch) savePieces(L); }
  const list = loadPieces();
  PEDESTALS.forEach((p, i) => { if (p.fixed) return; const ne = NET_GAL[i]; const pc = ne && ne.pc ? Object.assign({}, ne.pc, { by: ne.by, mine: ne.id === Net.id }) : list.find(o => o.place === 'gallery' && o.slot === i);
    const key = pc ? (pc.id + ':' + (pc.by || '')) : ''; if (p._key === key) return; p._key = key; p.holder.clear(); p.piece = pc || null; if (pc) p.holder.add(pieceMesh(pc, p.scale)); });
}
function placeOn(i) {
  const ped = PEDESTALS[i]; if (!carrying || ped.fixed || ped.piece) return;
  const pc = carrying, m = pieceMesh(pc, ped.scale); scene.add(m);
  const from = toWorld(curRoom, player.position.x, player.position.z, 0.62), to = ped.holder.getWorldPosition(V()), t0 = performance.now();
  carrying = null; cheerUntil = t0 + 1500; player.rotation.y = Math.PI;
  const anim = () => { const u = Math.min(1, (performance.now() - t0) / 650), e = 1 - Math.pow(1 - u, 3);
    m.position.lerpVectors(from, to, e); m.position.y += Math.sin(u * Math.PI) * 0.35; m.rotation.y = u * 1.2;
    if (u < 1) requestAnimationFrame(anim); else {
      scene.remove(m); const list = loadPieces(), it = list.find(o => o.id === pc.id); if (it) { it.place = 'gallery'; it.slot = i; } savePieces(list);
      if (netOnline) netPlace(i, Object.assign({}, it || pc, { place: 'gallery', slot: i })).then(ok => { if (!ok) setHint('앗, 방금 다른 사람이 그 받침대에 놓았어요 · 내 화면에만 보여요'); });
      renderGallery(); renderMyPieces(); updateDock();
      const n = SHOW_NPC && NPCS.find(o => o.room === 'gallery' && o.spot); if (n) say(n.obj, ['와, 잘 어울려요!', '이거 직접 만든 거예요?', '색 너무 예쁘다'][Math.floor(Math.random() * 3)], 1.55, 3200);
      setHint(`${pc.clayName || ''} ${josa(pc.name, '을', '를')} 전시했어요 ✓`);
    } };
  requestAnimationFrame(anim);
}
function putOnTable() {
  if (!carrying) return; const list = loadPieces(), it = list.find(o => o.id === carrying.id); if (it) it.place = 'table'; savePieces(list);
  carrying = null; renderMyPieces(); updateDock(); setHint('작업대에 올려뒀어요 · 15초쯤 지나면 🌬 건조실에서 굽을 깎아요');
}
function pieceInfo(p) {
  if (p.fixed) return setHint('선생님 작품이에요 · 전시용');
  if (!p.piece) return setHint(carrying ? '여기에 놓으려면 받침대를 눌러요' : '빈 받침대예요. 물레실에서 빚어 들고 와요');
  const pc = p.piece; setHint(`${pc.by && !pc.mine ? pc.by + '님의 ' : ''}${pc.clayName || ''} ${pc.name} · ${'★'.repeat(pc.stars || 1)} ${pc.score || ''}점 · ${HeukCraft.STAGE_NAME[HeukCraft.stageOf(pc)]}${pc.result && pc.result.yo ? ' · ✨요변' : ''}`);
}
/* 하단 버튼: 방마다 다름 */
const carryBtn = $('#carryBtn');
function updateDock() {
  sitBtn.hidden = !(sitting || (NEAR_WHEEL && !carrying)); sitBtn.textContent = sitting ? '일어서기' : '🏺 도자기 빚기';
  $('#waveBtn').hidden = $('#bowBtn').hidden = !USE_3D || sitting;
  carryBtn.hidden = !carrying || curRoom === 'gallery';
  const soon = null;
  soonBtn.hidden = !soon || !!carrying; if (soon) soonBtn.textContent = soon;
  const nk = NEAR && NEAR.kind;
  craftBtn.hidden = !['kiln', 'glaze', 'trim'].includes(nk) || !!carrying;
  if (nk === 'kiln') { const k = HeukCraft.kilnInfo(); craftBtn.textContent = k.phase === 'firing' ? `🔥 굽는 중 · ${k.left}초` : k.phase === 'done' ? '🔥 가마 열기!' : '🔥 가마에 넣고 굽기'; craftBtn.classList.toggle('hot', k.phase === 'done'); }
  if (nk === 'glaze') { craftBtn.textContent = '🎨 꾸미고 유약 바르기'; craftBtn.classList.remove('hot'); }
  if (nk === 'trim') { craftBtn.textContent = '🔪 굽깎기'; craftBtn.classList.remove('hot'); }
  galleryBtn.hidden = curRoom !== 'gallery' || !carrying;
  const bb = window.__benchBtn; if (bb) { const on = window.__bench(); bb.hidden = !(on || (nk === 'bench' && !carrying && curRoom === 'yard')); bb.textContent = on ? '일어서기' : '🪑 평상에 앉기'; }
}
const soonBtn = $('#soonBtn'), galleryBtn = $('#galleryBtn');
soonBtn.onclick = () => setHint('이 방 활동은 곧 열려요! 지금은 둘러볼 수 있어요');
const craftBtn = $('#craftBtn');
/* 기구 가까이 가면 그 기구 단추가 떠요 (바닥 고리가 반짝여서 어디서 할 수 있는지 보여요) */
const STATIONS = [
  { room: 'dry', x: 2.6, z: 1.6, r: 1.35, kind: 'trim' },
  { room: 'kiln', x: 0, z: -1.95, r: 1.3, kind: 'kiln' }, { room: 'kiln', x: 3.2, z: -0.8, r: 1.35, kind: 'kiln' }, { room: 'kiln', x: -3.6, z: 2.6, r: 1.85, kind: 'kiln' },
  ...[0, 1, 2, 3, 4].map(i => ({ room: 'glaze', x: -3.8 + i * 0.9, z: -2.6, r: 1.05, kind: 'glaze' })),
  { room: 'yard', x: 3.3, z: 9.6, r: 1.4, kind: 'kiln' }
];
function addStationRing(st) { st.ring = add(ROOMS[st.room].g, new THREE.RingGeometry(st.r * 0.5, st.r * 0.5 + 0.06, 40), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), st.x, 0.02, st.z, { rx: -Math.PI / 2, cast: false }); st.ring.userData.noFade = true; }
STATIONS.forEach(addStationRing);
let NEAR = null, NEAR_WHEEL = null, nearKey = '', nearT = 0;
function updateNear(now) {
  const p = player.position;
  for (const st of STATIONS) if (st.room === curRoom) st.ring.material.opacity = st === NEAR ? 0.8 : carrying ? 0 : 0.18 + 0.1 * Math.sin(now / 380);
  if (now - nearT < 120) return; nearT = now;
  let best = null, bd = 1e9; for (const st of STATIONS) { if (st.room !== curRoom) continue; const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < st.r && d < bd) { bd = d; best = st; } }
  let w = null; if (curRoom === 'studio' && !sitting) { let wd = 1.2; for (const x of FREE_WHEELS()) { const d = Math.hypot(p.x - x.g.position.x, p.z - x.g.position.z); if (d < wd) { wd = d; w = x; } } }
  const key = STATIONS.indexOf(best) + ':' + WHEELS.indexOf(w);
  if (key !== nearKey) { nearKey = key; NEAR = best; NEAR_WHEEL = w; updateDock(); }
}
const craftExit = () => { renderGallery(); renderMyPieces(); updateDock(); setHint(ROOM_HINT[curRoom]()); };
craftBtn.onclick = () => { goal = null; route = []; marker.visible = false;
  const nk = NEAR && NEAR.kind; if (!nk) return;
  if (nk === 'kiln') HeukCraft.openKiln({ onExit: craftExit });
  else if (nk === 'trim') HeukCraft.openTrim({ onExit: craftExit });
  else HeukCraft.openGlaze({ onExit: craftExit, goKiln: () => goRoom('kiln') }); };
// 가마 알림: 다른 방에 있어도 다 구워지면 알려줘요
{ let was = HeukCraft.kilnInfo().phase; setInterval(() => { const k = HeukCraft.kilnInfo();
  if (was === 'firing' && k.phase === 'done' && !craftOn()) setHint('🔥 가마가 다 구워졌어요! 가마실에서 열어 보세요');
  was = k.phase; if (curRoom === 'kiln' && !craftOn()) updateDock(); }, 1000); }
carryBtn.onclick = () => { if (curRoom === 'studio') putOnTable(); else setHint('작업대는 물레실에 있어요. 🖼 전시관이나 🏺 물레실로 가요'); };
galleryBtn.onclick = () => { let i = -1, best = 1e9; PEDESTALS.forEach((p, k) => { if (p.fixed || p.piece) return; const d = Math.hypot(p.stand.x - player.position.x, p.stand.z - player.position.z); if (d < best) { best = d; i = k; } }); if (i < 0) return setHint('받침대가 꽉 찼어요'); walkToPedestal(i); };
function walkToPedestal(i) { const p = PEDESTALS[i]; sitTarget = null; walkTo(p.stand.x, p.stand.z); pendingPlace = i; showMarker(V(p.stand.x, 0, p.stand.z)); }

function arrivePending() {
  if (pendingPlace === null) return; const i = pendingPlace; pendingPlace = null; const p = PEDESTALS[i];
  if (Math.hypot(player.position.x - p.stand.x, player.position.z - p.stand.z) < 0.9) placeOn(i);
}
/* 카메라와 캐릭터 사이를 가리는 가구·벽은 반투명하게 */
const occRay = new THREE.Raycaster(), faded = new Map(); let occT = 0;
function fadeOccluders(now) {
  if (now - occT < 90) return; occT = now;
  const target = toWorld(curRoom, player.position.x, player.position.z, 0.55), from = camera.position.clone(), dir = target.clone().sub(from), len = dir.length(); dir.normalize();
  const hitNow = new Set(), grps = Object.values(ROOMS).map(r => r.g);
  const side = V(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw)).multiplyScalar(0.42);
  for (const [off, sd] of [[0, 0], [0.35, 0], [-0.35, 0], [0, 1], [0, -1]]) {          // 몸 가운데 · 머리 · 발 · 양옆
    const t2 = target.clone().add(V(0, off + 0.1, 0)).addScaledVector(side, sd), d2 = t2.clone().sub(from); const l2 = d2.length(); d2.normalize();
    occRay.set(from, d2); occRay.far = l2 - 0.35;
    for (const h of occRay.intersectObjects(grps, true)) { const o = h.object; if (!o.isMesh || !o.material || o.userData.noFade) continue; let v = true; for (let q = o; q; q = q.parent) if (!q.visible) { v = false; break; } if (!v) continue; hitNow.add(o); }
  }
  for (const o of hitNow) if (!faded.has(o)) { const orig = o.material; const m = (Array.isArray(orig) ? orig[0] : orig).clone(); m.transparent = true; m.opacity = 0.22; m.depthWrite = false; o.material = m; faded.set(o, orig); }
  for (const [o, orig] of faded) if (!hitNow.has(o)) { o.material.dispose(); o.material = orig; faded.delete(o); }
}

/* ====== 같이 놀기 (온라인) — 다른 사람 캐릭터 · 인사 알림 · 물레 사용 중 · 전시관 같이 보기 ======
   Firebase 실시간 데이터베이스(무료)를 써요. 설정(window.HEUK_FB)이 없거나 연결이 막히면 혼자 놀기로 그대로 돌아가요.
   검수용: 주소 끝에 ?net=local 을 붙이면 같은 브라우저의 다른 탭끼리 연결돼요. */
const Net = (() => {
  let myId = ''; try { myId = sessionStorage.getItem('heukmaru-net-id') || ''; } catch {}
  if (!myId) { myId = 'p' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('heukmaru-net-id', myId); } catch {} }
  const H = { peer: () => {}, leave: () => {}, gallery: () => {}, status: () => {}, gift: () => {} };
  let tr = null;
  function firebaseTr(cfg) {
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg), db = firebase.database(app), root = db.ref('heukmaru');
    const me = root.child('players/' + myId); me.onDisconnect().remove();
    const players = root.child('players');
    players.on('child_added', s => s.key !== myId && H.peer(s.key, s.val()));
    players.on('child_changed', s => s.key !== myId && H.peer(s.key, s.val()));
    players.on('child_removed', s => H.leave(s.key));
    root.child('gallery').on('value', s => H.gallery(s.val() || {}));
    root.child('gifts/' + myId).on('child_added', s => { H.gift(s.val()); s.ref.remove(); });
    db.ref('.info/connected').on('value', s => { const on = !!s.val(); if (on) me.onDisconnect().remove(); H.status(on); });
    return {
      send: st => me.set(Object.assign({}, st, { t: firebase.database.ServerValue.TIMESTAMP })),
      place: (slot, entry) => new Promise(res => root.child('gallery/' + slot).transaction(cur => cur ? undefined : entry, (err, ok) => res(!err && ok))),
      gift: (to, entry) => root.child('gifts/' + to).push(entry).then(() => true, () => false)
    };
  }
  function localTr() {                     // 검수용: 같은 브라우저 탭끼리
    const bc = new BroadcastChannel('heukmaru-net'), seen = {};
    const galGet = () => { try { return JSON.parse(localStorage.getItem('heukmaru-net-gal') || '{}'); } catch { return {}; } };
    bc.onmessage = e => { const m = e.data; if (m.id === myId) return;
      if (m.type === 'st') { seen[m.id] = Date.now(); H.peer(m.id, m.st); } else if (m.type === 'bye') { delete seen[m.id]; H.leave(m.id); } else if (m.type === 'gal') H.gallery(galGet()); else if (m.type === 'gift' && m.to === myId) H.gift(m.entry); };
    setInterval(() => { for (const k in seen) if (Date.now() - seen[k] > 25000) { delete seen[k]; H.leave(k); } }, 1000);
    addEventListener('pagehide', () => bc.postMessage({ type: 'bye', id: myId }));
    addEventListener('storage', e => { if (e.key === 'heukmaru-net-gal') H.gallery(galGet()); });
    setTimeout(() => { H.status(true); H.gallery(galGet()); }, 300);
    return {
      send: st => bc.postMessage({ type: 'st', id: myId, st: Object.assign({}, st, { t: Date.now() }) }),
      gift: (to, entry) => { bc.postMessage({ type: 'gift', id: myId, to, entry }); return Promise.resolve(true); },
      place: (slot, entry) => { const g = galGet(); if (g[slot]) return Promise.resolve(false); g[slot] = entry; localStorage.setItem('heukmaru-net-gal', JSON.stringify(g)); bc.postMessage({ type: 'gal', id: myId }); H.gallery(g); return Promise.resolve(true); }
    };
  }
  function start() {
    try {
      if (/[?&]net=off\b/.test(location.search)) tr = null;
      else if (/[?&]net=local\b/.test(location.search) && window.BroadcastChannel) tr = localTr();
      else if (window.HEUK_FB && window.HEUK_FB.databaseURL && window.firebase && firebase.database) tr = firebaseTr(window.HEUK_FB);
    } catch (e) { console.warn('흙마루 온라인 연결 실패', e); tr = null; }
    return !!tr;
  }
  return { start, on: (k, f) => { H[k] = f; }, send: st => tr && tr.send(st), place: (s, e) => tr ? tr.place(s, e) : Promise.resolve(false), gift: (to, e) => tr ? tr.gift(to, e) : Promise.resolve(false), get id() { return myId; }, get on_() { return !!tr; } };
})();
const PEERS = new Map();                  // id → { st, c, tag, room, x, z, yaw, gt, gUntil, seen }
let NET_GAL = {}, netOnline = false;
const netUI = (() => {
  const st = document.createElement('style');
  st.textContent = '.nametag.peer{background:rgba(58,51,46,.62);color:#f6efe4}.nametag.peer b{color:#ffd98a}' +
    '#netToast{position:fixed;left:50%;top:70px;transform:translateX(-50%) translateY(-8px);z-index:45;background:#f6f1e8;color:#3d342c;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;box-shadow:0 6px 20px #0004;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;white-space:nowrap}' +
    '#netToast.show{opacity:1;transform:translateX(-50%) translateY(0)}#onlineBtn{cursor:default}@media(max-width:700px){#netToast{top:58px;font-size:12px}}';
  document.head.appendChild(st);
  const toast = document.createElement('div'); toast.id = 'netToast'; document.body.appendChild(toast);
  const badge = document.createElement('button'); badge.className = 'mini'; badge.id = 'onlineBtn'; badge.hidden = true; badge.title = '지금 같이 있는 사람';
  const tr = document.querySelector('.topR'); if (tr) tr.insertBefore(badge, tr.firstChild);
  let tt = 0;
  return {
    toast(t) { toast.textContent = t; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 3200); },
    count() { badge.hidden = !netOnline; badge.textContent = '👥 ' + (PEERS.size + 1); }
  };
})();
function makePeerChar(k) {
  const c = HeukChar3D.make(k === 'B' ? 'B' : 'A');
  c.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.noFade = true; } });
  const bb = new THREE.Box3().setFromObject(c.root); c.scale = 1.22 / (bb.max.y - bb.min.y); c.root.scale.setScalar(c.scale);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.scale.set(1, 0.6, 1); blob.userData.noFade = true; c.blob = blob;
  return c;
}
Net.on('peer', (id, st) => {
  if (!st || !ROOMS[st.r]) return;
  let P = PEERS.get(id);
  if (!P) {
    if (!USE_3D) return;
    P = { c: makePeerChar(st.k), k: st.k, tag: document.createElement('div'), x: st.x, z: st.z, yaw: st.y || 0, room: null, gt: st.gt || 0, gUntil: 0, gKind: null };
    P.tag.className = 'nametag peer'; document.body.appendChild(P.tag); PEERS.set(id, P);
    netUI.toast(`🌿 ${st.n || '손님'}님이 들어왔어요`); netUI.count();
  }
  if (st.k !== P.k) { P.c.root.parent && P.c.root.parent.remove(P.c.root); P.c.blob.parent && P.c.blob.parent.remove(P.c.blob); P.c = makePeerChar(st.k); P.k = st.k; P.room = null; }
  if (P.room !== st.r) { ROOMS[st.r].g.add(P.c.root); ROOMS[st.r].g.add(P.c.blob); P.room = st.r; P.x = st.x; P.z = st.z; }
  P.st = st; P.seen = performance.now();
  P.tag.textContent = st.n || '손님';
  if (st.gt && st.gt !== P.gt) {                       // 새 인사
    P.gt = st.gt; P.gKind = st.g; P.gUntil = performance.now() + (st.g === 'bow' ? 1600 : 1900);
    if (st.g === 'wave' || st.g === 'clap' || st.g === 'drink') P.c.set(st.g);
    if (st.g !== 'drink') netUI.toast(`${st.g === 'bow' ? '🙇' : st.g === 'clap' ? '👏' : '👋'} ${st.n || '손님'}님이 ${st.g === 'bow' ? '꾸벅 인사했어요' : st.g === 'clap' ? '박수를 쳐요' : '손을 흔들어요'}`);
  }
});
function peerLeave(id) {
  const P = PEERS.get(id); if (!P) return;
  P.c.root.parent && P.c.root.parent.remove(P.c.root); P.c.blob.parent && P.c.blob.parent.remove(P.c.blob); P.tag.remove(); PEERS.delete(id);
  netUI.toast(`${(P.st && P.st.n) || '손님'}님이 나갔어요`); netUI.count();
}
Net.on('leave', peerLeave);
Net.on('gallery', g => { NET_GAL = g || {}; renderGallery(); });
Net.on('status', on => { netOnline = on; netUI.count(); });
const wheelBusy = i => { for (const P of PEERS.values()) if (P.st && P.st.r === 'studio' && P.st.p === 'sit' && P.st.s === i) return P; return null; };
function updatePeers(dt, now) {
  for (const P of PEERS.values()) {
    const st = P.st, c = P.c; if (!st) continue;
    const sitW = st.p === 'sit' && st.r === 'studio' ? WHEELS[st.s] : null;
    const bS = st.p === 'bench' && st.r === 'yard' ? BENCH_SEATS[st.bs] : null;
    if (bS) {
      c.set('sit'); c.root.position.set(bS.x, 0.47 - 0.075 * c.scale, bS.z); c.root.rotation.y = bS.yaw; c.blob.position.set(bS.x, 0.48, bS.z); c.update(dt, false); P.x = bS.x; P.z = bS.z;
    } else if (sitW) {
      c.set('sit'); c.root.position.set(sitW.seat.x, 0.44 - 0.075 * c.scale, sitW.seat.z + 0.02); c.root.rotation.y = 0; c.blob.position.set(sitW.seat.x, 0.008, sitW.seat.z); c.update(dt, false);
    } else {
      const k = Math.min(1, dt * 8), dx = st.x - P.x, dz = st.z - P.z, far = Math.hypot(dx, dz) > 3;
      P.x = far ? st.x : P.x + dx * k; P.z = far ? st.z : P.z + dz * k;
      let dy = (st.y || 0) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); P.yaw += dy * Math.min(1, dt * 10);
      const bow = P.gKind === 'bow' && now < P.gUntil;
      c.set(st.c ? 'carry' : bow ? 'bow' : 'idle');
      c.root.position.set(P.x, 0, P.z); c.root.rotation.y = P.yaw; c.blob.position.set(P.x, 0.008, P.z);
      c.update(dt, !!st.w, 1);
    }
    // 이름표: 닫힌 건물 안에 있으면 숨김
    const R0 = ROOMS[st.r], closed = st.r !== 'yard' && !(R0.visKey & 1), show = pick.hidden && !closed && !craftOn() && !(window.HeukThrow && HeukThrow.active);
    c.root.visible = c.blob.visible = !closed;
    if (show) { const v = c.root.getWorldPosition(V()).add(V(0, 1.42, 0)).project(camera);
      P.tag.hidden = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1; P.tag.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; P.tag.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
    else P.tag.hidden = true;
  }
}
/* 내 상태 보내기 (0.2초마다, 바뀌었을 때만 · 10초마다 한 번은 꼭) */
let netGesture = { g: null, gt: 0 }, netLast = '', netLastT = 0;
function netState() {
  const p = player.position, r2 = v => Math.round(v * 100) / 100;
  return { n: MY_NAME, k: PLAYER_KEY, r: curRoom, x: r2(p.x), z: r2(p.z), y: r2(player.rotation.y), p: bench ? 'bench' : sitting ? 'sit' : 'stand', bs: bench ? bench.i : -1,
    s: sitting && sitTarget ? WHEELS.indexOf(sitTarget) : -1, w: player.userData.walkAmt > 0.35 ? 1 : 0, c: carrying ? 1 : 0, g: netGesture.g, gt: netGesture.gt, tea: window.Tea ? Tea.net() : null, drank: window.Tea ? Tea.drank : null };
}
if (Net.start()) {
  setInterval(() => { if (!pick.hidden) return; const st = netState(), key = JSON.stringify(st), now = performance.now();
    if (key !== netLast || now - netLastT > 10000) { netLast = key; netLastT = now; Net.send(st); } }, 200);
  setInterval(() => { const now = performance.now(); for (const [id, P] of PEERS) if (now - (P.seen || 0) > 45000) peerLeave(id); }, 5000);
}
function netPlace(i, pc) {                 // 전시관 받침대에 놓은 작품을 모두에게
  let entry = { pc, by: MY_NAME, id: Net.id, t: Date.now() };
  try { if (JSON.stringify(entry).length > 400000) entry = { pc: Object.assign({}, pc, { decor: null }), by: MY_NAME, id: Net.id, t: Date.now() }; } catch {}
  return Net.place(i, entry);
}


const josaRo = w => { const c = (w || '').charCodeAt((w || '').length - 1), f = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; return (w || '') + (f && f !== 8 ? '으로' : '로'); };
const josa = (w, a, b) => { const c = (w || '').charCodeAt((w || '').length - 1); const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; return (w || '') + (has ? a : b); };
/* ====== 함께 하는 행동 — 평상에 앉기 · 따라가기 · 도자기 선물하기 · 박수 ====== */
// 평상 자리 (마당 좌표) — 찻상을 바라보고 앉아요
const BENCH_SEATS = BENCHES.flatMap((B, b) => B.seats.map((st, k) => Object.assign({}, st, { b, k, i: b * 4 + k })));
BENCHES.forEach((B, b) => { const st = { room: 'yard', x: B.x, z: B.z, r: 2.2, kind: 'bench', b }; STATIONS.push(st); addStationRing(st); });
let bench = null;                         // { i, x, z, yaw }
const benchBtn = document.createElement('button'); benchBtn.className = 'pill primary'; benchBtn.id = 'benchBtn'; benchBtn.hidden = true;
const followBtn = document.createElement('button'); followBtn.className = 'pill'; followBtn.id = 'followBtn'; followBtn.hidden = true;
const clapBtn = document.createElement('button'); clapBtn.className = 'pill act'; clapBtn.id = 'clapBtn'; clapBtn.title = '박수 (3)'; clapBtn.innerHTML = '👏<small>박수</small>';
{ const dock = $('#dock'), bow = $('#bowBtn'); bow.after(clapBtn); dock.insertBefore(benchBtn, $('#sitBtn')); dock.appendChild(followBtn); }
clapBtn.onclick = () => doGesture('clap');
function benchTaken(i) { for (const P of PEERS.values()) if (P.st && P.st.r === 'yard' && P.st.p === 'bench' && P.st.bs === i) return true; return false; }
function sitBench() {
  if (curRoom !== 'yard' || sitting || bench) return;
  if (carrying) { setHint('작품을 들고는 못 앉아요 · 먼저 전시하거나 작업대에 둬요'); return; }
  const p = player.position, nb = NEAR && NEAR.kind === 'bench' ? NEAR.b : -1; let best = -1, bd = 1e9;
  BENCH_SEATS.forEach((s, i) => { if (benchTaken(i) || (nb >= 0 && s.b !== nb)) return; const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < bd) { bd = d; best = i; } });
  if (best < 0) { setHint('평상 자리가 다 찼어요'); return; }
  const s = BENCH_SEATS[best]; bench = { i: best, b: s.b, x: s.x, z: s.z, yaw: s.yaw };
  goal = null; route = []; crossTarget = null; marker.visible = false; stopFollow(true);
  p.set(s.x, 0, s.z); player.rotation.y = s.yaw; updateDock(); setHint('🍵 평상에 앉았어요 · 👋 👏 인사하며 쉬어 가요');
}
function standBench() {
  if (!bench) return; const s = bench; bench = null; const C = BENCHES[s.b].tray;
  if (window.Tea) Tea.leave();
  const ox = s.x - C.x, oz = s.z - C.z, l = Math.hypot(ox, oz) || 1, e = freeSpotNear(s.x + ox / l * 1.0, s.z + oz / l * 1.0);
  player.position.set(e.x, 0, e.z); updateDock(); setHint(ROOM_HINT[curRoom]());
}
benchBtn.onclick = () => (bench ? standBench() : sitBench());
window.__benchBtn = benchBtn; window.__bench = () => !!bench;

/* 다른 사람 캐릭터를 누르면 메뉴: 인사 · 따라가기 · 선물하기 */
const peerMenu = document.createElement('div'); peerMenu.id = 'peerMenu'; peerMenu.hidden = true; document.body.appendChild(peerMenu);
const giftBox = document.createElement('div'); giftBox.id = 'giftBox'; giftBox.hidden = true; document.body.appendChild(giftBox);
{ const st = document.createElement('style');
  st.textContent = '#peerMenu[hidden],#giftBox[hidden]{display:none!important}#peerMenu{position:fixed;z-index:46;transform:translate(-50%,-100%);background:#f6f1e8;border-radius:16px;box-shadow:0 8px 26px #0005;padding:8px;display:flex;flex-direction:column;gap:4px;min-width:150px;font-size:13px;color:#3d342c}' +
    '#peerMenu b{padding:2px 6px 4px;font-size:13px}#peerMenu button{border:0;background:#fff;border-radius:10px;padding:9px 10px;text-align:left;font:inherit;font-weight:600;cursor:pointer;color:#3d342c}#peerMenu button:hover{background:#efe6d6}' +
    '#giftBox{position:fixed;inset:0;z-index:47;background:#2b2724aa;display:flex;align-items:center;justify-content:center}#giftBox .gb{background:#f6f1e8;border-radius:20px;padding:16px;width:min(92vw,420px);max-height:80vh;overflow:auto;color:#3d342c}' +
    '#giftBox h3{margin:0 0 4px;font-size:16px}#giftBox p{margin:0 0 10px;font-size:12px;opacity:.7}#giftBox .gl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#giftBox .gi{background:#fff;border:2px solid transparent;border-radius:14px;padding:6px;text-align:center;font-size:11px;cursor:pointer}' +
    '#giftBox .gi img{width:100%;aspect-ratio:1;object-fit:contain;display:block}#giftBox .gi.on{border-color:#c98a4a}#giftBox .row{display:flex;gap:8px;margin-top:12px}#giftBox .row button{flex:1;border:0;border-radius:12px;padding:11px;font:inherit;font-weight:700;cursor:pointer}' +
    '#giftBox .send{background:#3d342c;color:#fff}#giftBox .send:disabled{opacity:.35}#giftBox .cancel{background:#e6dccb;color:#3d342c}';
  document.head.appendChild(st); }
let menuPeer = null;
function openPeerMenu(id, sx, sy) {
  const P = PEERS.get(id); if (!P || !P.st) return; menuPeer = id;
  peerMenu.innerHTML = ''; const b = document.createElement('b'); b.textContent = P.st.n || '손님'; peerMenu.appendChild(b);
  const item = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.onclick = ev => { ev.stopPropagation(); closePeerMenu(); f(); }; peerMenu.appendChild(x); };
  item('👋 인사하기', () => { faceTo(P); doGesture('wave'); });
  item(followId === id ? '✋ 그만 따라가기' : '🚶 따라가기', () => (followId === id ? stopFollow() : startFollow(id)));
  item('🎁 도자기 선물하기', () => openGift(id));
  peerMenu.style.left = Math.min(innerWidth - 90, Math.max(90, sx)) + 'px'; const below = sy < 230; peerMenu.style.top = (below ? sy + 14 : sy - 12) + 'px'; peerMenu.style.transform = below ? 'translate(-50%,0)' : 'translate(-50%,-100%)'; peerMenu.hidden = false;
}
function closePeerMenu() { peerMenu.hidden = true; menuPeer = null; }
addEventListener('pointerdown', e => { if (!peerMenu.hidden && !peerMenu.contains(e.target)) closePeerMenu(); }, true);
function faceTo(P) { if (P.st && P.st.r === curRoom) player.rotation.y = Math.atan2(P.x - player.position.x, P.z - player.position.z); }
function peerAt(ray) {
  const list = [...PEERS.entries()].filter(([, P]) => P.c.root.visible && P.c.root.parent);
  const hits = ray.intersectObjects(list.map(([, P]) => P.c.root), true); if (!hits.length) return null;
  for (const [id, P] of list) { let o = hits[0].object; while (o) { if (o === P.c.root) return id; o = o.parent; } }
  return null;
}

/* 따라가기 */
let followId = null, followT = 0, followTgt = null;
function startFollow(id) {
  const P = PEERS.get(id); if (!P) return; if (sitting) stand(); if (bench) standBench();
  followId = id; followTgt = null; followBtn.hidden = false; followBtn.textContent = `✋ ${P.st.n || '손님'}님 그만 따라가기`;
  setHint(`🚶 ${P.st.n || '손님'}님을 따라가요 · 바닥을 누르거나 움직이면 멈춰요`);
}
function stopFollow(quiet) {
  if (!followId) return; const P = PEERS.get(followId); followId = null; followTgt = null; followBtn.hidden = true;
  if (!quiet) setHint(`${(P && P.st && P.st.n) || '손님'}님 따라가기를 멈췄어요`);
}
followBtn.onclick = () => stopFollow();
function updateFollow(now) {
  if (!followId || now - followT < 300) return; followT = now;
  const P = PEERS.get(followId); if (!P || !P.st) { stopFollow(true); setHint('따라가던 사람이 나갔어요'); return; }
  if (sitting || bench || fading) return;
  const st = P.st, me = player.position;
  if (st.r === curRoom) {
    crossTarget = null;
    const tx = st.p === 'sit' && st.r === 'studio' && WHEELS[st.s] ? WHEELS[st.s].seat.x : P.x, tz = st.p === 'sit' && st.r === 'studio' && WHEELS[st.s] ? WHEELS[st.s].seat.z - 0.5 : P.z;
    const d = Math.hypot(tx - me.x, tz - me.z);
    if (d < 1.3) { if (!goal) faceTo(P); return; }
    const ax = me.x - tx, az = me.z - tz, l = Math.hypot(ax, az) || 1, gx = tx + ax / l * 0.95, gz = tz + az / l * 0.95;
    if (!followTgt || Math.hypot(followTgt.x - gx, followTgt.z - gz) > 0.6 || !goal) { followTgt = { x: gx, z: gz }; const f = freeSpotNear(gx, gz); walkTo(f.x, f.z); }
  } else if (!crossTarget || crossTarget.room !== st.r) {
    followTgt = null; crossTarget = { room: st.r, x: st.x, z: st.z }; planCross();
  }
}

/* 도자기 선물하기 */
const GIFTABLE = pc => pc && !(window.Tea && Tea.uses(pc.id)) && pc.place !== 'gallery' && !(carrying && carrying.id === pc.id) && !(typeof inKiln === 'function' && inKiln(pc));
async function openGift(id) {
  const P = PEERS.get(id); if (!P || !P.st) return;
  const list = loadPieces().filter(GIFTABLE);
  giftBox.innerHTML = ''; const box = document.createElement('div'); box.className = 'gb'; giftBox.appendChild(box);
  const h = document.createElement('h3'); h.textContent = `🎁 ${P.st.n || '손님'}님께 선물하기`; box.appendChild(h);
  const sub = document.createElement('p'); sub.textContent = list.length ? '고른 작품은 내 작품함에서 빠지고 상대 물레실 작업대로 가요' : '선물할 작품이 없어요 · 물레실에서 먼저 빚어 봐요'; box.appendChild(sub);
  const grid = document.createElement('div'); grid.className = 'gl'; box.appendChild(grid);
  let chosen = null; const row = document.createElement('div'); row.className = 'row';
  const cancel = document.createElement('button'); cancel.className = 'cancel'; cancel.textContent = '닫기'; cancel.onclick = () => { giftBox.hidden = true; };
  const send = document.createElement('button'); send.className = 'send'; send.textContent = '선물 보내기'; send.disabled = true;
  row.append(cancel, send); box.appendChild(row); giftBox.hidden = false;
  for (const pc of list) {
    const it = document.createElement('div'); it.className = 'gi'; const img = document.createElement('img'); const cap = document.createElement('div');
    cap.textContent = `${pc.clayName || ''} ${pc.name || '작품'}`.trim(); it.append(img, cap); grid.appendChild(it);
    it.onclick = () => { grid.querySelectorAll('.gi').forEach(x => x.classList.remove('on')); it.classList.add('on'); chosen = pc; send.disabled = false; };
    HeukCraft.thumb(pc, 120).then(u => { img.src = u; }).catch(() => {});
  }
  send.onclick = async () => { if (!chosen) return; send.disabled = true; send.textContent = '보내는 중…'; await sendGift(id, chosen); giftBox.hidden = true; };
}
async function sendGift(id, chosen) {
  const P = PEERS.get(id); if (!P || !P.st) { setHint('그 사람이 지금 없어요'); return false; }
  if (carrying && carrying.id === chosen.id) { setHint('들고 있는 작품은 먼저 내려놓고 선물해요'); return false; }
  if (window.Tea && Tea.uses(chosen.id)) { setHint('찻상에 올린 그릇은 먼저 치우고 선물해요'); return false; }
  const pc = Object.assign({}, chosen, { place: 'table' }); delete pc.slot; delete pc.gift;
  let entry = { pc, by: MY_NAME, from: Net.id, t: Date.now() };
  try { if (JSON.stringify(entry).length > 400000) entry.pc = Object.assign({}, pc, { decor: null }); } catch {}
  const ok = await Net.gift(id, entry);
  if (!ok) { setHint('선물을 보내지 못했어요 · 잠시 뒤 다시 해 봐요'); return false; }
  const L = loadPieces().filter(o => o.id !== chosen.id); savePieces(L); renderMyPieces(); renderGallery();
  faceTo(P); doGesture('bow');
  netUI.toast(`🎁 ${P.st.n || '손님'}님께 ${josa(chosen.name || '작품', '을', '를')} 선물했어요`);
  return true;
}
Net.on('gift', g => {
  if (!g || !g.pc) return;
  const L = loadPieces(), pc = Object.assign({}, g.pc, { id: Date.now() * 10 + Math.floor(Math.random() * 10), place: 'table', gift: g.by || '손님' });
  delete pc.slot; L.push(pc); savePieces(L); renderMyPieces();
  netUI.toast(`🎁 ${g.by || '손님'}님이 ${josa(pc.name || '작품', '을', '를')} 선물했어요 · 물레실 작업대에 놓였어요`);
});


/* ====== 🧺 내 보관함 — 내 작품을 한눈에 보고, 들고 가기 · 전시하기 · 선물하기 ====== */
const invBox = document.createElement('div'); invBox.id = 'invBox'; invBox.hidden = true; document.body.appendChild(invBox);
{ const st = document.createElement('style');
  st.textContent = '#invBox[hidden]{display:none!important}#invBox{position:fixed;inset:0;z-index:47;background:#2b2724aa;display:flex;align-items:center;justify-content:center}' +
    '#invBox .ib{background:#f6f1e8;border-radius:20px;padding:16px;width:min(94vw,520px);max-height:86vh;display:flex;flex-direction:column;color:#3d342c}' +
    '#invBox .ih{display:flex;align-items:center;gap:8px;margin-bottom:10px}#invBox .ih h3{margin:0;font-size:17px;flex:1}#invBox .ih button{border:0;background:#e6dccb;border-radius:10px;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer;color:#3d342c}' +
    '#invBox .il{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;overflow:auto;padding:2px}#invBox .ic{background:#fff;border:2px solid transparent;border-radius:14px;padding:6px;text-align:center;font-size:11px;cursor:pointer;line-height:1.35}' +
    '#invBox .ic.on{border-color:#c98a4a}#invBox .ic img{width:100%;aspect-ratio:1;object-fit:contain;display:block}#invBox .ic .nm{font-weight:700;font-size:12px}#invBox .ic .bd{display:inline-block;margin-top:3px;padding:2px 7px;border-radius:999px;background:#efe6d6;font-size:10.5px}' +
    '#invBox .empty{padding:30px 10px;text-align:center;opacity:.7;font-size:13px}#invBox .ia{margin-top:12px;background:#fff;border-radius:14px;padding:10px;display:none}#invBox .ia.show{display:block}' +
    '#invBox .ia .t{font-weight:700;font-size:13px;margin-bottom:8px}#invBox .ia .bs{display:flex;gap:6px;flex-wrap:wrap}#invBox .ia button{flex:1;min-width:96px;border:0;border-radius:12px;padding:10px 8px;font:inherit;font-weight:700;cursor:pointer;background:#3d342c;color:#fff}' +
    '#invBox .ia button.sub{background:#e6dccb;color:#3d342c}#invBox .ia button:disabled{opacity:.35;cursor:default}#invBox .ia .note{font-size:11.5px;opacity:.7;margin-top:6px}#invBox .peers{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}#invBox .peers button{flex:0 0 auto;background:#c98a4a}@media(max-width:700px){#invBtn .lbl{display:none}}';
  document.head.appendChild(st); }
const invBtn = document.createElement('button'); invBtn.className = 'pill act'; invBtn.id = 'invBtn'; invBtn.innerHTML = '🧺<small>보관함</small>'; invBtn.title = '내 작품 보관함 (B)';
{ const w = $('#waveBtn'); w.before(invBtn); }
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'b' && !uiBusy()) openInv(); });
invBtn.onclick = e => { e.stopPropagation(); openInv(); };
function inKiln(pc) { try { const k = HeukCraft._kiln(); return k && k.slots && k.slots.includes(pc.id); } catch { return false; } }
function pieceWhere(pc) {
  if (carrying && carrying.id === pc.id) return '🤲 들고 있음';
  if (window.Tea && Tea.uses(pc.id)) return '🍵 찻자리에 있음';
  if (pc.place === 'gallery') return '🖼 전시 중';
  if (inKiln(pc)) return '🔥 가마 안';
  const s = window.HeukCraft ? HeukCraft.stageOf(pc) : 'done';
  return (s === 'done' ? '✨ ' : '') + (HeukCraft.STAGE_NAME[s] || '완성') + ' · 작업대';
}
function takeUp(pc) {                    // 보관함/작업대에서 꺼내 손에 들기
  if (carrying) { setHint('이미 작품을 들고 있어요 · 먼저 내려놓아요'); return false; }
  if (sitting) stand(); if (bench) standBench();
  if (window.Tea && Tea.uses(pc.id)) { setHint('찻상에 올린 그릇이에요 · 먼저 찻상을 치워요'); return false; }
  const L = loadPieces(), it = L.find(o => o.id === pc.id); if (!it) return false;
  it.place = 'carry'; savePieces(L); renderMyPieces(); startCarry(it); updateDock(); return true;
}
function goExhibit(pc) {
  if (!(carrying && carrying.id === pc.id) && !takeUp(pc)) return;
  if (curRoom === 'gallery') { const i = PEDESTALS.findIndex(p => !p.fixed && !p.piece); if (i >= 0) { walkToPedestal(i); setHint('빈 받침대로 가서 내려놓아요'); } return; }
  crossTarget = { room: 'gallery', x: 0.85, z: 3.0 }; planCross();
  setHint('🖼 전시관으로 가요 · 도착하면 빛나는 빈 받침대를 눌러요');
}
let invSel = null;
async function openInv() {
  closePeerMenu(); giftBox.hidden = true; invSel = null;
  const L = loadPieces().slice().sort((a, b) => (b.madeAt || b.id || 0) - (a.madeAt || a.id || 0));
  invBox.innerHTML = ''; const box = document.createElement('div'); box.className = 'ib'; invBox.appendChild(box);
  const head = document.createElement('div'); head.className = 'ih'; const h = document.createElement('h3'); h.textContent = `🧺 내 보관함 · ${L.length}점`;
  const x = document.createElement('button'); x.textContent = '닫기'; x.onclick = () => { invBox.hidden = true; }; head.append(h, x); box.appendChild(head);
  if (!L.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = '아직 만든 작품이 없어요 · 물레실에서 물레 가까이 가서 🏺 도자기 빚기를 눌러요'; box.appendChild(e); invBox.hidden = false; return; }
  const grid = document.createElement('div'); grid.className = 'il'; box.appendChild(grid);
  const act = document.createElement('div'); act.className = 'ia'; box.appendChild(act);
  invBox.hidden = false;
  for (const pc of L) {
    const c = document.createElement('div'); c.className = 'ic'; const img = document.createElement('img');
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = `${pc.clayName || ''} ${pc.name || '작품'}`.trim();
    const bd = document.createElement('div'); bd.className = 'bd'; bd.textContent = pieceWhere(pc);
    c.append(img, nm, bd); if (pc.gift) { const g = document.createElement('div'); g.textContent = `🎁 ${pc.gift}님 선물`; g.style.fontSize = '10px'; c.appendChild(g); }
    grid.appendChild(c);
    c.onclick = () => { grid.querySelectorAll('.ic').forEach(o => o.classList.remove('on')); c.classList.add('on'); invSel = pc; showActs(act, pc); };
    HeukCraft.thumb(pc, 120).then(u => { img.src = u; }).catch(() => {});
  }
}
function showActs(act, pc) {
  act.innerHTML = ''; act.classList.add('show');
  const t = document.createElement('div'); t.className = 't'; t.textContent = `${pc.clayName || ''} ${pc.name || '작품'} — ${pieceWhere(pc)}`; act.appendChild(t);
  const bs = document.createElement('div'); bs.className = 'bs'; act.appendChild(bs);
  const note = document.createElement('div'); note.className = 'note';
  const btn = (label, f, dis, sub) => { const b = document.createElement('button'); b.textContent = label; if (sub) b.className = 'sub'; b.disabled = !!dis; b.onclick = () => { invBox.hidden = true; f(); }; bs.appendChild(b); return b; };
  const held = carrying && carrying.id === pc.id, locked = pc.place === 'gallery' || inKiln(pc);
  if (held) {
    btn('🖼 전시관으로', () => goExhibit(pc), curRoom === 'gallery' && false);
    if (curRoom === 'studio') btn('작업대에 두기', () => putOnTable(), false, true);
    note.textContent = '들고 있는 작품이에요';
  } else {
    btn('🖼 전시하기', () => goExhibit(pc), locked || !!carrying);
    btn('🤲 꺼내 들기', () => { if (takeUp(pc)) setHint('작품을 들었어요 · 🖼 전시관에 놓거나 들고 다녀요'); }, locked || !!carrying, true);
    if (pc.place === 'gallery') note.textContent = '전시관 받침대에 놓여 있어요 · 누구나 볼 수 있어요';
    else if (inKiln(pc)) note.textContent = '가마 안에 있어요 · 다 구워지면 꺼낼 수 있어요';
    else if (carrying) note.textContent = '손에 든 작품을 먼저 내려놓아야 해요';
  }
  // 선물: 지금 같이 있는 사람에게
  const peers = [...PEERS.entries()].filter(([, P]) => P.st);
  const gl = document.createElement('div'); gl.className = 'note'; gl.style.marginTop = '10px';
  if (pc.place === 'gallery' || inKiln(pc)) gl.textContent = '';
  else if (!peers.length) gl.textContent = '🎁 선물은 같이 접속한 사람이 있을 때 보낼 수 있어요';
  else {
    gl.textContent = '🎁 선물할 사람을 골라요'; const pr = document.createElement('div'); pr.className = 'peers';
    for (const [id, P] of peers) { const b = document.createElement('button'); b.textContent = P.st.n || '손님'; b.onclick = () => { invBox.hidden = true; sendGift(id, pc); }; pr.appendChild(b); }
    gl.appendChild(pr);
  }
  act.append(note, gl);
}
/* 물레실 작업대 위 작품을 누르면 집어 들어요 */
function tablePieceAt(cx, cy) {          // 화면에서 손가락 근처(36px)에 있는 작업대 작품 — 폰에서도 잘 집히게
  if (curRoom !== 'studio') return null; let best = null, bd = 36;
  for (const m of myPieces.children) { const v = m.getWorldPosition(V()).add(V(0, 0.06, 0)).project(camera); if (v.z > 1) continue;
    const d = Math.hypot((v.x + 1) / 2 * innerWidth - cx, (1 - v.y) / 2 * innerHeight - cy); if (d < bd) { bd = d; best = m.userData.pid; } }
  return best;
}


/* ====== 🍵 찻자리 — 평상에 앉아 내 그릇에 차를 내리고, 접시에 다과를 올리고, 옆 사람에게 대접해요 ======
   상에 올린 그릇은 보관함에서 빌려 온 것이라 사라지지 않아요. 같이 접속한 사람 화면에도 그대로 보여요. */
const Tea = (() => {
  const TEAS = {
    green: { name: '녹차', icon: '🍵', col: '#a7b55a', band: [70, 80], steep: [2.4, 3.4], tip: '여린 잎이라 조금 식힌 물(70~80℃)에 짧게 우려요' },
    chrys: { name: '국화차', icon: '🌼', col: '#e0b84a', band: [84, 94], steep: [3.2, 4.2], tip: '말린 국화는 뜨거운 물(85~95℃)에 천천히 우려요' },
    puer:  { name: '보이차', icon: '🍂', col: '#8a3f22', band: [92, 100], steep: [1.6, 2.6], tip: '보이차는 펄펄 끓는 물에 짧게 우려요' }
  };
  const QNAME = { green: ['조금 쓴', '괜찮은', '향긋한'], chrys: ['밍밍한', '괜찮은', '은은한'], puer: ['떫은', '괜찮은', '깊고 진한'] };
  // 크기는 접시 반지름을 1로 본 비율 (2D 담기 화면과 3D 찻상이 같은 비율을 써요)
  const SNACKS = {
    yakgwa: { name: '약과', icon: '🟤', r: 0.24, snack: true }, injeolmi: { name: '인절미', icon: '🟨', r: 0.17, snack: true }, dasik: { name: '다식', icon: '🌸', r: 0.16, snack: true },
    gotgam: { name: '곶감', icon: '🟠', r: 0.22, snack: true }, yanggaeng: { name: '양갱', icon: '🟥', r: 0.18, snack: true },
    jat: { name: '잣', icon: '⚪', r: 0.06 }, petal: { name: '꽃잎', icon: '🌺', r: 0.09 }, daechu: { name: '대추채', icon: '🔴', r: 0.12 }, pine: { name: '솔잎', icon: '🌿', r: 0.17 }
  };
  const DASIK_C = ['#f2d24a', '#8fbf6a', '#e99ab2'];
  const CUPLIKE = ['cup', 'bowl', 'goblet'], PLATELIKE = ['plate', 'bowl'];
  let mine = null;                           // { cup, tt, q, plate, snack, srv, empty, t }
  let drank = null, servedSeen = {}, myDrinkFrom = null;
  const lite = pc => { const o = {}; for (const k of ['id', 'r', 't', 'H', 'floorT', 'clay', 'clayName', 'color', 'stage', 'glaze', 'vessel', 'name', 'fired', 'firing', 'kiln', 'atmo']) if (pc[k] !== undefined) o[k] = pc[k];
    if (o.r) o.r = o.r.map(v => Math.round(v * 1000) / 1000); if (o.t) o.t = o.t.map(v => Math.round(v * 1000) / 1000); return o; };
  const isDone = pc => { try { return HeukCraft.stageOf(pc) === 'done'; } catch { return false; } };
  const usable = pc => pc && pc.place !== 'gallery' && !inKiln(pc) && !(carrying && carrying.id === pc.id);
  function seatOf(st) { return st && st.p === 'bench' ? BENCH_SEATS[st.bs] : null; }

  /* --- 찻상 위 그릇 · 차 · 다과 (3D) --- */
  const WHITE = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.25 });
  function houseCup() {
    const pts = [[0.001, 0], [0.03, 0], [0.032, 0.004], [0.036, 0.02], [0.044, 0.05], [0.046, 0.056], [0.041, 0.056], [0.039, 0.05], [0.031, 0.02], [0.026, 0.008], [0.001, 0.008]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), WHITE); m.castShadow = true; m.userData.rim = { y: 0.046, r: 0.038 }; return m;
  }
  function ownMesh(pc, maxH, maxR) {
    const R = Math.max(...pc.r), s = Math.min(maxH / pc.H, maxR / R), m = pieceMesh(pc, s), n = pc.r.length, k = Math.round(0.7 * (n - 1));
    m.userData.rim = { y: 0.7 * pc.H * s, r: Math.max(0.01, (pc.r[k] - (pc.t ? pc.t[k] : 0.05)) * s) }; m.userData.top = (pc.floorT || 0.06) * s + 0.003; m.userData.Rp = 0.62 * R * s; return m;
  }
  const SN_MAT = {};
  const snm = c => SN_MAT[c] || (SN_MAT[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  function itemMesh(k, c) {                 // 접시 반지름 1 기준으로 만든 다과 한 개
    const g = new THREE.Group(), put = (geo, col, x, y, z, sy) => { const m = new THREE.Mesh(geo, snm(col)); m.position.set(x, y, z); if (sy) m.scale.y = sy; m.castShadow = true; g.add(m); return m; };
    if (k === 'yakgwa') { const sh = new THREE.Shape(); for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, r = 0.24 * (0.86 + 0.14 * Math.cos(a * 6)); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(r, 0); }
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), snm('#8a4f24')); m.rotation.x = -Math.PI / 2; m.castShadow = true; g.add(m);
      put(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10), '#6b3a18', 0, 0.115, 0); }
    if (k === 'injeolmi') put(new THREE.BoxGeometry(0.24, 0.16, 0.24), '#e3cf8a', 0, 0.08, 0);
    if (k === 'dasik') { put(new THREE.CylinderGeometry(0.15, 0.16, 0.1, 18), DASIK_C[(c || 0) % 3], 0, 0.05, 0); const rg = put(new THREE.TorusGeometry(0.08, 0.012, 6, 18), '#c9b48a', 0, 0.1, 0); rg.rotation.x = Math.PI / 2; rg.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(DASIK_C[(c || 0) % 3]).multiplyScalar(0.8), roughness: 0.7 }); }
    if (k === 'gotgam') { put(new THREE.SphereGeometry(0.2, 14, 10), '#d9772f', 0, 0.06, 0, 0.42); put(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 6), '#5d6b2f', 0, 0.13, 0); }
    if (k === 'yanggaeng') put(new THREE.BoxGeometry(0.2, 0.2, 0.4), '#6e2331', 0, 0.1, 0);
    if (k === 'jat') put(new THREE.SphereGeometry(0.05, 8, 6), '#f3e8cf', 0, 0.03, 0, 0.6).scale.x = 0.6;
    if (k === 'petal') { const m = put(new THREE.CircleGeometry(0.09, 12), '#f0a3b8', 0, 0.012, 0); m.rotation.x = -Math.PI / 2; m.scale.set(0.6, 1, 1); m.material = new THREE.MeshStandardMaterial({ color: '#f0a3b8', side: THREE.DoubleSide, roughness: 0.6 }); }
    if (k === 'daechu') for (let i = 0; i < 4; i++) { const m = put(new THREE.BoxGeometry(0.2, 0.02, 0.02), '#9a1f1f', 0, 0.015 + i * 0.006, (i - 1.5) * 0.03); m.rotation.y = (i - 1.5) * 0.35; }
    if (k === 'pine') for (const a of [-0.25, 0.25]) { const m = put(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 4), '#3f6b2f', Math.sin(a) * 0.08, 0.012, 0); m.rotation.set(Math.PI / 2, 0, a); }
    return g;
  }
  function defaultArr(snack) { return snack ? [[snack, -0.25, 0, 0.3], [snack, 0.25, 0.1, 1.2]] : []; }
  const TABLE = new Map();                   // owner → { sig, g }
  function buildSet(tea) {
    const g = new THREE.Group(), c = tea.cup === 'house' || !tea.cup ? houseCup() : ownMesh(tea.cup, 0.075, 0.055); c.position.x = 0.05; g.add(c);
    if (!tea.empty) {
      const rim = c.userData.rim, T = TEAS[tea.tt] || TEAS.green, col = new THREE.Color(T.col); if (tea.q === 0) col.multiplyScalar(0.72);
      const surf = new THREE.Mesh(new THREE.CircleGeometry(rim.r, 22), new THREE.MeshStandardMaterial({ color: col, roughness: 0.12 })); surf.rotation.x = -Math.PI / 2; surf.position.set(0.05, rim.y, 0); g.add(surf);
      if (Date.now() - (tea.t || 0) < 90000) { const stm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.02, 0.16, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false })); stm.position.set(0.05, rim.y + 0.09, 0); stm.userData.steam = true; g.add(stm); }
    }
    if (tea.plate) {
      const tray = tea.plate === 'tray', p = tray ? (() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.12), M('#9a6e45', 0.7)); m.position.y = 0.006; m.userData.top = 0.013; return m; })() : ownMesh(tea.plate, 0.05, 0.1);
      p.position.x = -0.08; g.add(p);
      const Rp = tray ? 0.06 : p.userData.Rp || 0.05, arr = tea.arr || defaultArr(tea.snack);
      for (const [k, u, v, a, c] of arr) { if (!SNACKS[k]) continue; const it = itemMesh(k, c); it.scale.setScalar(Rp); it.rotation.y = -(a || 0); it.position.set(-0.08 + u * (tray ? 0.085 : Rp), (p.userData.top || 0.01), v * (tray ? 0.06 : Rp)); g.add(it); }
    }
    g.scale.setScalar(1.5); g.traverse(o => { if (o.isMesh) o.userData.noFade = true; });
    return g;
  }
  function place(owner, tea, seat) {
    if (!tea || !seat) { const e = TABLE.get(owner); if (e) { e.g.parent && e.g.parent.remove(e.g); TABLE.delete(owner); } return; }
    const sig = JSON.stringify([tea.cup && tea.cup.id || 'h', tea.tt, tea.q, tea.plate && (tea.plate.id || tea.plate), tea.snack, tea.arr, tea.empty, tea.srv, seat.i, Math.floor((Date.now() - (tea.t || 0)) / 90000) > 0]);
    let e = TABLE.get(owner);
    if (!e || e.sig !== sig) { if (e) e.g.parent && e.g.parent.remove(e.g); e = { sig, g: buildSet(tea) }; TABLE.set(owner, e); YARD.add(e.g); }
    let tx = seat.ix, tz = seat.iz;
    if (tea.srv) { const tgt = tea.srv === Net.id ? (bench ? BENCH_SEATS[bench.i] : null) : seatOf(PEERS.get(tea.srv) && PEERS.get(tea.srv).st); if (tgt && tgt.b === seat.b) { tx = tgt.ix; tz = tgt.iz; } }
    e.g.position.set(tx, 0.52, tz); e.g.rotation.y = Math.atan2(BENCHES[seat.b].tray.x - tx, BENCHES[seat.b].tray.z - tz) + Math.PI / 2;
  }
  function sync() {
    place('me', mine, bench ? BENCH_SEATS[bench.i] : null);
    const alive = new Set(['me']);
    for (const [id, P] of PEERS) { alive.add(id); place(id, P.st && P.st.tea, seatOf(P.st)); }
    for (const k of [...TABLE.keys()]) if (!alive.has(k)) place(k, null);
    // 나에게 내어 준 차 · 내가 내어 준 차를 마셨는지
    let served = null;
    for (const [id, P] of PEERS) { const t = P.st && P.st.tea; if (t && t.srv === Net.id && !t.empty && bench) { served = { id, P, t };
        if (servedSeen[id] !== t.t) { servedSeen[id] = t.t; netUI.toast(`🍵 ${P.st.n || '손님'}님이 ${TEAS[t.tt].name}를 내어 줬어요`); Sound.sfx.ding(); } }
      const d = P.st && P.st.drank; if (mine && d && d.from === Net.id && d.t > (mine.t || 0) && !mine.empty) { mine.empty = true; netUI.toast(`😊 ${P.st.n || '손님'}님이 차를 맛있게 마셨어요`); } }
    Tea.served = served;
    for (const e of TABLE.values()) e.g.traverse(o => { if (o.userData.steam) o.material.opacity = 0.08 + 0.06 * Math.sin(performance.now() / 300 + o.id); });
    dock();
  }
  /* --- 아래 단추 --- */
  const teaBtn = document.createElement('button'); teaBtn.className = 'pill primary'; teaBtn.id = 'teaBtn'; teaBtn.hidden = true;
  const gotBtn = document.createElement('button'); gotBtn.className = 'pill primary'; gotBtn.id = 'gotTeaBtn'; gotBtn.hidden = true; gotBtn.textContent = '🍵 받은 차 마시기';
  { const b = $('#benchBtn') || $('#sitBtn'); b.before(teaBtn); b.before(gotBtn); }
  function dock() {
    teaBtn.hidden = !bench; teaBtn.textContent = !mine || mine.empty ? '🍵 차 내리기' : '🍵 찻자리';
    gotBtn.hidden = !(bench && Tea.served);
  }
  teaBtn.onclick = () => { Sound.sfx.click(); if (!mine || mine.empty) openPicker(); else openMenu(); };
  gotBtn.onclick = () => { const s = Tea.served; if (!s) return; drinkPose(); drank = { from: s.id, t: Date.now() }; netUI.toast(`🍵 ${s.P.st.n || '손님'}님이 내어 준 ${TEAS[s.t.tt].name}를 마셨어요`); };
  function drinkPose() { C3[PLAYER_KEY] && C3[PLAYER_KEY].set('drink'); netGesture = { g: 'drink', gt: Date.now() }; setTimeout(() => Sound.sfx.sip(), 700); }
  /* --- 창 --- */
  const box = document.createElement('div'); box.id = 'teaBox'; box.hidden = true; document.body.appendChild(box);
  const css = document.createElement('style');
  css.textContent = '#teaBox[hidden]{display:none!important}#teaBox{position:fixed;inset:0;z-index:47;background:#2b2724aa;display:flex;align-items:center;justify-content:center;-webkit-user-select:none;user-select:none}' +
    '#teaBox .tb{background:#f6f1e8;border-radius:20px;padding:16px;width:min(94vw,480px);max-height:88vh;overflow:auto;color:#3d342c}#teaBox h3{margin:0 0 2px;font-size:17px}#teaBox .sub{margin:0 0 10px;font-size:12px;opacity:.7}' +
    '#teaBox .sec{font-size:12px;font-weight:700;margin:10px 0 6px;opacity:.8}#teaBox .gr{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}#teaBox .it{background:#fff;border:2px solid transparent;border-radius:12px;padding:5px;text-align:center;font-size:11px;cursor:pointer;line-height:1.3}' +
    '#teaBox .it.on{border-color:#c98a4a}#teaBox .it.off{opacity:.38;cursor:default}#teaBox .it img,#teaBox .it .em{width:100%;aspect-ratio:1;object-fit:contain;display:flex;align-items:center;justify-content:center;font-size:30px}' +
    '#teaBox .row{display:flex;gap:8px;margin-top:14px}#teaBox .row button,#teaBox .big{flex:1;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:700;cursor:pointer;background:#3d342c;color:#fff}#teaBox .row button.sub2{background:#e6dccb;color:#3d342c}#teaBox button:disabled{opacity:.35}' +
    '#teaBox .tip{font-size:12px;background:#fff;border-radius:10px;padding:8px 10px;margin-top:6px}#teaBox .stage{display:flex;gap:14px;align-items:stretch;margin:12px 0}#teaBox .gauge{position:relative;width:46px;height:190px;border-radius:23px;background:#e6dccb;overflow:hidden}' +
    '#teaBox .gauge .band{position:absolute;left:0;right:0;background:#9fc27a88;border-top:2px solid #6f9a4a;border-bottom:2px solid #6f9a4a}#teaBox .gauge .fill{position:absolute;left:6px;right:6px;bottom:6px;border-radius:17px;background:#d9773f;transition:height .05s}' +
    '#teaBox .hbar{position:relative;height:30px;border-radius:15px;background:#e6dccb;overflow:hidden;margin:16px 0}#teaBox .hbar .band{position:absolute;top:0;bottom:0;background:#9fc27a88;border-left:2px solid #6f9a4a;border-right:2px solid #6f9a4a}#teaBox .hbar .fill{position:absolute;left:0;top:0;bottom:0;background:#b8893f}' +
    '#teaBox .info{flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;font-size:13px}#teaBox .info b{font-size:22px}#teaBox .big{padding:16px;font-size:15px;touch-action:none}#teaBox .big.hold{background:#c0602f}#teaBox .steps{display:flex;gap:6px;font-size:11px;margin-bottom:6px}#teaBox .steps span{padding:3px 8px;border-radius:999px;background:#e6dccb}#teaBox .steps span.on{background:#3d342c;color:#fff}' +
    '#teaBox .res{text-align:center;padding:10px 0}#teaBox .res .e{font-size:54px}#teaBox .res b{display:block;font-size:20px;margin:6px 0}#teaBox .menu button{display:block;width:100%;margin-top:6px;text-align:left;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:700;background:#fff;color:#3d342c;cursor:pointer}';
  document.head.appendChild(css);
  const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function frame(title, sub) { box.innerHTML = ''; const b = el('div', 'tb'); box.appendChild(b); b.append(el('h3', '', title)); if (sub) b.append(el('p', 'sub', sub)); box.hidden = false; return b; }
  const close = () => { box.hidden = true; stopFx(); };
  function stopFx() { Sound.sfx.set('boil', 0); Sound.sfx.set('steep', 0); Sound.sfx.set('pour', 0); }
  function card(grid, label, imgP, on, onPick, emoji) {
    const c = el('div', 'it' + (on ? '' : ' off')); if (emoji) c.append(el('div', 'em', emoji)); else { const im = el('img'); c.append(im); imgP && imgP.then(u => { im.src = u; }).catch(() => {}); }
    c.append(el('div', '', label)); grid.append(c); if (on) c.onclick = () => { grid.querySelectorAll('.it').forEach(x => x.classList.remove('on')); c.classList.add('on'); onPick(); }; return c;
  }
  /* 1) 고르기 */
  function openPicker() {
    closePeerMenu(); const b = frame('🍵 차 내리기', '찻잔과 차를 고르고, 원하면 접시에 다과도 올려요');
    const L = loadPieces(), cups = L.filter(pc => CUPLIKE.includes(pc.vessel)), plates = L.filter(pc => PLATELIKE.includes(pc.vessel));
    let cup = 'house', tt = 'green', plate = null;
    b.append(el('div', 'sec', '① 찻잔')); const g1 = el('div', 'gr'); b.append(g1);
    card(g1, '공방 흰 찻잔', null, true, () => { cup = 'house'; }, '🍵').classList.add('on');
    for (const pc of cups) { const ok = isDone(pc) && usable(pc); const c = card(g1, `${pc.name}${ok ? '' : isDone(pc) ? ' · 사용 중' : ' · 안 구움'}`, HeukCraft.thumb(pc, 90), ok, () => { cup = pc; }); if (!isDone(pc)) c.title = '아직 구워지지 않아 물이 새요'; }
    if (!cups.length) b.append(el('div', 'tip', '💡 물레실에서 컵·사발을 빚어 구우면 내 그릇에 차를 따를 수 있어요'));
    b.append(el('div', 'sec', '② 차')); const g2 = el('div', 'gr'); b.append(g2); const tip = el('div', 'tip', TEAS.green.tip);
    Object.entries(TEAS).forEach(([k, T], i) => { const c = card(g2, T.name, null, true, () => { tt = k; tip.textContent = T.tip; }, T.icon); if (!i) c.classList.add('on'); }); b.append(tip);
    b.append(el('div', 'sec', '③ 다과 (안 골라도 돼요)')); const g3 = el('div', 'gr'); b.append(g3);
    const note = el('div', 'tip', '접시를 고르면 다음 화면에서 약과·다식 같은 다과를 직접 담아요');
    card(g3, '안 올려요', null, true, () => { plate = null; }, '🚫').classList.add('on');
    card(g3, '공방 나무 쟁반', null, true, () => { plate = 'tray'; }, '🪵');
    for (const pc of plates) { const ok = isDone(pc) && usable(pc); card(g3, `${pc.name}${ok ? '' : isDone(pc) ? ' · 사용 중' : ' · 안 구움'}`, HeukCraft.thumb(pc, 90), ok, () => { plate = pc; }); }
    b.append(note);
    const row = el('div', 'row'); const x = el('button', 'sub2', '닫기'); x.onclick = close; const go = el('button', '', '🔥 차 내리기 시작'); row.append(x, go); b.append(row);
    go.onclick = () => { Sound.sfx.click(); const sel = { cup, tt, plate: plate ? (plate === 'tray' ? 'tray' : plate) : null, arr: null }; if (sel.plate) plating(sel, () => play(sel)); else play(sel); };
  }

  /* 1.5) 다과 담기 — 위에서 본 접시에 눌러 담고, 끌어 옮기고, 돌려요 */
  function plateColor(pl) { if (pl === 'tray') return '#a87a4e'; try { return pl.glaze && pl.glaze.color || '#efe9df'; } catch { return '#efe9df'; } }
  function drawItem(g, k, x, y, a, R, c) {
    const S = SNACKS[k], r = S.r * R; g.save(); g.translate(x, y); g.rotate(a || 0); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    const fill = (col) => { g.fillStyle = col; g.fill(); };
    if (k === 'yakgwa') { g.beginPath(); for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2, rr = r * (0.86 + 0.14 * Math.cos(t * 6)); i ? g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : g.moveTo(rr, 0); } fill('#8a4f24'); g.shadowBlur = 0; g.beginPath(); g.arc(0, 0, r * 0.22, 0, 7); fill('#6b3a18'); }
    if (k === 'injeolmi') { g.beginPath(); g.roundRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4, r * 0.2); fill('#e3cf8a'); }
    if (k === 'dasik') { g.beginPath(); g.arc(0, 0, r, 0, 7); fill(DASIK_C[(c || 0) % 3]); g.shadowBlur = 0; g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(i) * r * 0.6, Math.sin(i) * r * 0.6); g.stroke(); } }
    if (k === 'gotgam') { g.beginPath(); g.ellipse(0, 0, r, r * 0.92, 0, 0, 7); fill('#d9772f'); g.shadowBlur = 0; g.beginPath(); g.arc(0, 0, r * 0.18, 0, 7); fill('#5d6b2f'); }
    if (k === 'yanggaeng') { g.beginPath(); g.roundRect(-r * 0.55, -r * 1.1, r * 1.1, r * 2.2, r * 0.12); fill('#6e2331'); }
    if (k === 'jat') { g.beginPath(); g.ellipse(0, 0, r * 0.6, r, 0, 0, 7); fill('#f3e8cf'); }
    if (k === 'petal') { g.beginPath(); g.ellipse(0, 0, r * 0.6, r, 0, 0, 7); fill('#f0a3b8'); }
    if (k === 'daechu') { g.strokeStyle = '#9a1f1f'; g.lineWidth = Math.max(2, R * 0.025); g.lineCap = 'round'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-r, (i - 1.5) * r * 0.3); g.quadraticCurveTo(0, (i - 1.5) * r * 0.3 - r * 0.25, r, (i - 1.5) * r * 0.3); g.stroke(); } }
    if (k === 'pine') { g.strokeStyle = '#3f6b2f'; g.lineWidth = Math.max(1.5, R * 0.015); g.lineCap = 'round'; for (const t of [-0.25, 0.25]) { g.beginPath(); g.moveTo(0, r); g.lineTo(Math.sin(t) * r * 2, -r); g.stroke(); } }
    g.restore();
  }
  function judge(arr, tray) {
    const sn = arr.filter(o => SNACKS[o[0]].snack); if (!sn.length) return '🍃 담백해요';
    let overlap = false; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const A = arr[i], B = arr[j]; if (!SNACKS[A[0]].snack || !SNACKS[B[0]].snack) continue; if (Math.hypot(A[1] - B[1], A[2] - B[2]) < (SNACKS[A[0]].r + SNACKS[B[0]].r) * 0.85) overlap = true; }
    const cx = arr.reduce((t, o) => t + o[1], 0) / arr.length, cy = arr.reduce((t, o) => t + o[2], 0) / arr.length, edge = arr.some(o => Math.hypot(o[1], o[2]) > 0.86);
    if (!overlap && !edge && Math.hypot(cx, cy) < 0.3 && sn.length >= 2) return '정갈해요 ✨';
    if (sn.length >= 5) return '푸짐해요 😋'; if (sn.length === 1) return '단출해요 🍃'; return '자유로워요 🎨';
  }
  function plating(sel, next) {
    const tray = sel.plate === 'tray', b = frame('🍡 다과 담기', '바구니에서 눌러 담고, 끌어서 옮겨요 · 고른 다과는 ↻ 로 돌려요 · 접시 밖으로 끌면 빠져요');
    const cv = el('canvas'); const W = Math.min(340, innerWidth - 70); cv.width = W * 2; cv.height = W * 2; cv.style.cssText = `width:${W}px;height:${W}px;display:block;margin:6px auto;touch-action:none;border-radius:18px;background:#e9dcc6`; b.append(cv);
    const g = cv.getContext('2d'), C = W, Rpx = W * 0.8, arr = sel.arr ? sel.arr.map(o => o.slice()) : []; let selI = -1;
    const toPx = (u, v) => tray ? [C + u * Rpx, C + v * Rpx * 0.7] : [C + u * Rpx, C + v * Rpx], fromPx = (x, y) => tray ? [(x - C) / Rpx, (y - C) / (Rpx * 0.7)] : [(x - C) / Rpx, (y - C) / Rpx];
    const pal = el('div', 'gr'); pal.style.gridTemplateColumns = 'repeat(auto-fill,minmax(58px,1fr))'; b.append(pal);
    const cnt = el('div', 'tip'); b.append(cnt);
    const tools = el('div', 'row'); const rot = el('button', 'sub2', '↻ 돌리기'), del = el('button', 'sub2', '🗑 빼기'), clr = el('button', 'sub2', '다 비우기'); tools.append(rot, del, clr); b.append(tools);
    const row = el('div', 'row'), back = el('button', 'sub2', '뒤로'), ok = el('button', '', '다 담았어요'); row.append(back, ok); b.append(row);
    function draw() {
      g.clearRect(0, 0, cv.width, cv.height); g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 16; g.shadowOffsetY = 6; g.fillStyle = plateColor(sel.plate);
      g.beginPath(); if (tray) g.roundRect(C - Rpx * 1.08, C - Rpx * 0.78, Rpx * 2.16, Rpx * 1.56, 20); else g.arc(C, C, Rpx * 1.08, 0, 7); g.fill(); g.restore();
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.beginPath(); if (tray) g.roundRect(C - Rpx, C - Rpx * 0.7, Rpx * 2, Rpx * 1.4, 14); else g.arc(C, C, Rpx * 0.98, 0, 7); g.stroke();
      if (!tray) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 6; g.beginPath(); g.arc(C, C, Rpx * 1.03, -2.4, -1.2); g.stroke(); }
      arr.forEach((o, i) => { const [x, y] = toPx(o[1], o[2]); drawItem(g, o[0], x, y, o[3], Rpx, o[4]); if (i === selI) { g.strokeStyle = '#c98a4a'; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.arc(x, y, SNACKS[o[0]].r * Rpx + 10, 0, 7); g.stroke(); g.setLineDash([]); } });
      const n = arr.filter(o => SNACKS[o[0]].snack).length; cnt.textContent = `다과 ${n} / 6 · 장식 ${arr.length - n} / 4${arr.length ? ' · ' + judge(arr, tray) : ''}`;
      rot.disabled = del.disabled = selI < 0; clr.disabled = !arr.length;
    }
    Object.entries(SNACKS).forEach(([k, S]) => { const c = el('div', 'it'); c.append(el('div', 'em', S.icon), el('div', '', S.name)); c.querySelector('.em').style.fontSize = '22px'; pal.append(c);
      c.onclick = () => { const n = arr.filter(o => SNACKS[o[0]].snack).length; if (S.snack ? n >= 6 : arr.length - n >= 4) { cnt.textContent = S.snack ? '다과는 6개까지 담을 수 있어요' : '장식은 4개까지예요'; return; }
        const a = Math.random() * 6.28, d = arr.length ? 0.35 + Math.random() * 0.25 : 0; arr.push([k, +(Math.cos(a) * d).toFixed(2), +(Math.sin(a) * d * (tray ? 0.8 : 1)).toFixed(2), +(Math.random() * 3).toFixed(2), Math.floor(Math.random() * 3)]); selI = arr.length - 1; Sound.sfx.click(); draw(); }; });
    const ptr = new Map(); let drag = null, rot0 = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2]; };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const p = pos(e); ptr.set(e.pointerId, p);
      if (ptr.size === 2 && selI >= 0) { const [a, b2] = [...ptr.values()]; rot0 = { a: Math.atan2(b2[1] - a[1], b2[0] - a[0]), base: arr[selI][3] }; drag = null; return; }
      selI = -1; for (let i = arr.length - 1; i >= 0; i--) { const [x, y] = toPx(arr[i][1], arr[i][2]); if (Math.hypot(p[0] - x, p[1] - y) < SNACKS[arr[i][0]].r * Rpx + 16) { selI = i; break; } }
      if (selI >= 0) { const [x, y] = toPx(arr[selI][1], arr[selI][2]); drag = { dx: x - p[0], dy: y - p[1] }; } draw(); });
    cv.addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const p = pos(e); ptr.set(e.pointerId, p);
      if (ptr.size === 2 && rot0 && selI >= 0) { const [a, b2] = [...ptr.values()]; arr[selI][3] = +(rot0.base + Math.atan2(b2[1] - a[1], b2[0] - a[0]) - rot0.a).toFixed(2); draw(); return; }
      if (drag && selI >= 0) { const [u, v] = fromPx(p[0] + drag.dx, p[1] + drag.dy); arr[selI][1] = +u.toFixed(2); arr[selI][2] = +v.toFixed(2); draw(); } });
    const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) rot0 = null; if (drag && selI >= 0) { const o = arr[selI]; if (Math.hypot(o[1], o[2] / (tray ? 1 : 1)) > 1.12 || (tray && (Math.abs(o[1]) > 1.05 || Math.abs(o[2]) > 1.05))) { arr.splice(selI, 1); selI = -1; Sound.sfx.click(); } } drag = null; draw(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { if (selI < 0) return; e.preventDefault(); arr[selI][3] = +(arr[selI][3] + e.deltaY * 0.004).toFixed(2); draw(); }, { passive: false });
    rot.onclick = () => { if (selI < 0) return; arr[selI][3] = +(arr[selI][3] + Math.PI / 6).toFixed(2); draw(); };
    del.onclick = () => { if (selI < 0) return; arr.splice(selI, 1); selI = -1; draw(); };
    clr.onclick = () => { arr.length = 0; selI = -1; draw(); };
    back.onclick = () => openPicker();
    ok.onclick = () => { sel.arr = arr.map(o => o.slice()); sel.judge = arr.length ? judge(arr, tray) : null; if (sel.judge === '정갈해요 ✨') Sound.sfx.good(); else Sound.sfx.click(); next(); };
    draw(); Plating._cv = cv; Plating._arr = arr;
  }
  const Plating = {};
  /* 2) 끓이기 · 우리기 · 따르기 */
  function play(sel) {
    const T = TEAS[sel.tt], score = [];
    const steps = ['물 끓이기', '우리기', '따르기'];
    const head = (b, i) => { const s = el('div', 'steps'); steps.forEach((n, k) => s.append(el('span', k === i ? 'on' : '', `${k < i ? '✓ ' : ''}${n}`))); b.prepend(s); };
    const holdBtn = (label, onDown, onUp) => { const bt = el('button', 'big', label); const dn = e => { e.preventDefault(); bt.classList.add('hold'); onDown(); }, up = e => { if (!bt.classList.contains('hold')) return; bt.classList.remove('hold'); onUp(); };
      bt.addEventListener('pointerdown', dn); bt.addEventListener('pointerup', up); bt.addEventListener('pointerleave', up); bt.addEventListener('pointercancel', up); bt.oncontextmenu = e => e.preventDefault(); return bt; };
    const Pour = Plating; let raf = 0; const loop = f => { let last = performance.now(); const tick = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (f(dt) !== false && !box.hidden) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); };
    // 끓이기
    (() => {
      const b = frame(`${T.icon} ${T.name} — 물 끓이기`, `꾹 누르는 동안 불이 세져요. 초록 칸(${T.band[0]}~${T.band[1]}℃)에 2초 머물러요`); head(b, 0);
      const stg = el('div', 'stage'), gau = el('div', 'gauge'), band = el('div', 'band'), fill = el('div', 'fill'), info = el('div', 'info'), tv = el('b', '', '20℃'), msg = el('div', '', '찬물이에요');
      band.style.bottom = (T.band[0]) + '%'; band.style.height = (T.band[1] - T.band[0]) + '%'; gau.append(band, fill); info.append(tv, msg); stg.append(gau, info); b.append(stg);
      let temp = 20, heat = false, inT = 0, over = 0, el2 = 0;
      b.append(holdBtn('🔥 꾹 눌러 불 올리기', () => { heat = true; }, () => { heat = false; }));
      loop(dt => {
        el2 += dt; temp += (heat ? 26 : -9) * dt * (temp > 90 && heat ? 0.6 : 1); temp = Math.max(20, Math.min(100, temp));
        const inside = temp >= T.band[0] && temp <= T.band[1]; if (inside) inT += dt; else if (temp > T.band[1] + 3) over += dt;
        fill.style.height = `calc(${(temp - 0) / 100 * 100}% - 12px)`; tv.textContent = Math.round(temp) + '℃';
        msg.textContent = inside ? `좋아요! ${Math.min(2, inT).toFixed(1)} / 2초` : temp < T.band[0] ? '조금 더 데워요' : '너무 뜨거워요 · 손을 떼요';
        Sound.sfx.set('boil', Math.max(0, (temp - 40) / 60));
        if (inT >= 2 || el2 > 18) { score.push(inT >= 2 ? (over < 0.8 ? 2 : 1) : 0); Sound.sfx.set('boil', 0); setTimeout(steep, 350); return false; }
      });
    })();
    // 우리기
    function steep() {
      const b = frame(`${T.icon} ${T.name} — 우리기`, '찻잎이 우러나요. 초록 칸에 들어오면 "그만!"을 눌러요'); head(b, 1);
      const bar = el('div', 'hbar'), band = el('div', 'band'), fill = el('div', 'fill'), info = el('div', 'tip', '찻잎이 천천히 풀려요…'); const MAX = 6;
      band.style.left = (T.steep[0] / MAX * 100) + '%'; band.style.width = ((T.steep[1] - T.steep[0]) / MAX * 100) + '%'; bar.append(fill, band); b.append(bar, info);
      let t = 0, done = false; const stop = el('button', 'big', '✋ 그만!'); b.append(stop);
      const end = () => { if (done) return; done = true; Sound.sfx.set('steep', 0); const s = t >= T.steep[0] && t <= T.steep[1] ? 2 : (t >= T.steep[0] - 0.7 && t <= T.steep[1] + 0.7) ? 1 : 0; score.push(s);
        info.textContent = s === 2 ? '딱 알맞게 우러났어요!' : t < T.steep[0] ? '조금 연해요' : '조금 진해요'; setTimeout(pour, 700); };
      stop.onclick = end;
      loop(dt => { if (done) return false; t += dt; fill.style.width = Math.min(100, t / MAX * 100) + '%'; Sound.sfx.set('steep', 1); if (t > T.steep[0] && t < T.steep[1]) info.textContent = '지금이에요!'; if (t >= MAX) { end(); return false; } });
    }
    // 따르기 — 공방 다관을 끌어 올려 기울이면 찻물이 잔으로 떨어져요
    function pour() {
      const b = frame(`${T.icon} ${T.name} — 다관으로 따르기`, '화면을 위로 끌어 올리면 다관이 기울어요 · 잔의 초록 선까지 채우고 손을 떼요'); head(b, 2);
      const wrap = el('div'); wrap.style.cssText = 'position:relative;margin:8px 0'; const W = Math.min(420, innerWidth - 60), Hh = Math.round(W * 0.78);
      const cv = el('canvas'); cv.width = W * Math.min(2, devicePixelRatio || 1); cv.height = Hh * Math.min(2, devicePixelRatio || 1); cv.style.cssText = `width:${W}px;height:${Hh}px;display:block;border-radius:16px;background:linear-gradient(#f3ece1,#e6d8c2);touch-action:none`;
      const hud = el('div'); hud.style.cssText = 'position:absolute;left:10px;top:8px;font-size:13px;font-weight:700;color:#3d342c;text-shadow:0 1px 0 #fff8'; const tip = el('div', 'tip', '천천히 일정하게 따르면 더 곱게 따라져요');
      wrap.append(cv, hud); b.append(wrap, tip);
      let R3; try { R3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { R3 = null; }
      if (!R3) { tip.textContent = '이 기기에선 3D 따르기를 열 수 없어요'; score.push(1); setTimeout(result, 800); return; }
      R3.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R3.setSize(W, Hh, false); R3.shadowMap.enabled = true;
      const S3 = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W / Hh, 0.05, 50); cam.position.set(0.5, 2.1, 4.0); cam.lookAt(-0.4, 0.75, 0);
      S3.add(new THREE.HemisphereLight('#fff8ee', '#b9a283', 1.25)); const dl = new THREE.DirectionalLight('#ffffff', 1.4); dl.position.set(2, 4, 3); dl.castShadow = true; dl.shadow.mapSize.set(512, 512); S3.add(dl);
      const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 3), new THREE.MeshStandardMaterial({ color: '#7b5a3d', roughness: 0.75 })); table.position.y = -0.06; table.receiveShadow = true; S3.add(table);
      // 찻잔: 공방 흰 찻잔이면 18배, 내 그릇이면 높이 1 정도로
      let cup, fl;
      if (sel.cup === 'house') { cup = houseCup(); cup.scale.setScalar(18); fl = { y0: 0.008 * 18, y1: 0.05 * 18, r0: 0.027 * 18, r1: 0.04 * 18 }; }
      else { const pc = sel.cup, Rm = Math.max(...pc.r), sc = Math.min(1.0 / pc.H, 0.8 / Rm); cup = pieceMesh(pc, sc); const n = pc.r.length, f0 = (pc.floorT || 0.06) / pc.H, inner = f => { const k = Math.round(Math.min(1, f) * (n - 1)); return Math.max(0.04, (pc.r[k] - (pc.t ? pc.t[k] : 0.05))) * sc; };
        fl = { y0: (pc.floorT || 0.06) * sc, y1: 0.92 * pc.H * sc, r0: inner(f0 + 0.02), r1: inner(0.92), inner, f0, H: pc.H * sc }; }
      cup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); S3.add(cup);
      const T3 = TEAS[sel.tt], teaMat = new THREE.MeshStandardMaterial({ color: T3.col, roughness: 0.1, transparent: true, opacity: 0.92 });
      const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 28), teaMat); surf.rotation.x = -Math.PI / 2; surf.visible = false; S3.add(surf);
      const bandY0 = fl.y0 + (fl.y1 - fl.y0) * 0.72, bandY1 = fl.y0 + (fl.y1 - fl.y0) * 0.9, radAt = y => fl.inner ? fl.inner(y / fl.H) : fl.r0 + (fl.r1 - fl.r0) * (y - fl.y0) / (fl.y1 - fl.y0);
      for (const yy of [bandY0, bandY1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(radAt(yy) * 0.98, 0.008, 6, 40), new THREE.MeshBasicMaterial({ color: '#6f9a4a', transparent: true, opacity: 0.75 })); ring.rotation.x = Math.PI / 2; ring.position.y = yy; S3.add(ring); }
      // 공방 다관 (흰 백자) — 손잡이 쪽 아래를 축으로 기울어요
      const pot = new THREE.Group(), body = new THREE.Group(); pot.position.set(-1.25, 0, 0); pot.add(body); S3.add(pot); const wm = new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.28 });
      const bp = [[0.001, 0], [0.32, 0], [0.42, 0.08], [0.47, 0.25], [0.44, 0.45], [0.33, 0.58], [0.2, 0.62], [0.001, 0.62]].map(([x, y]) => new THREE.Vector2(x, y));
      const bm = new THREE.Mesh(new THREE.LatheGeometry(bp, 32), wm); bm.castShadow = true; body.add(bm);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.05, 24), wm); lid.position.y = 0.64; body.add(lid); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), wm); knob.position.y = 0.7; body.add(knob);
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.08, 0.5, 12), wm); sp.position.set(0.58, 0.38, 0); sp.rotation.z = -0.95; sp.castShadow = true; body.add(sp);
      const tipL = new THREE.Vector3(0.79, 0.53, 0);
      const hd = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20, Math.PI * 1.25), wm); hd.position.set(-0.47, 0.33, 0); hd.rotation.z = Math.PI * 0.4; body.add(hd);
      // 찻물 줄기 · 물방울
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), teaMat); stream.visible = false; S3.add(stream);
      const drops = []; const dropGeo = new THREE.SphereGeometry(0.025, 6, 4);
      const spill = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), new THREE.MeshStandardMaterial({ color: T3.col, roughness: 0.1, transparent: true, opacity: 0 })); spill.rotation.x = -Math.PI / 2; spill.position.set(0.3, 0.002, 0.25); S3.add(spill);
      let tilt = 0, want = 0, lv = 0, fin = false, poured = false, idle = 0, splashT = 0, splashes = 0; const flows = [];
      let y0 = null; cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); y0 = e.clientY; });
      cv.addEventListener('pointermove', e => { if (y0 == null) return; want = Math.max(0, Math.min(1, (y0 - e.clientY) / (Hh * 0.55))); });
      const rel = () => { y0 = null; want = 0; }; cv.addEventListener('pointerup', rel); cv.addEventListener('pointercancel', rel);
      Pour._set = v => { want = v; }; Pour._st = () => ({ tilt, lv, fin, splashes });
      const finish = () => { if (fin) return; fin = true; Sound.sfx.set('pour', 0);
        let sc2 = lv > 1.0 ? 0 : lv >= 0.72 && lv <= 0.92 ? 2 : lv >= 0.55 ? 1 : 0; if (sc2 === 2 && splashes > 1) sc2 = 1;
        const m = flows.length ? flows.reduce((a, v) => a + v, 0) / flows.length : 0, sd = flows.length ? Math.sqrt(flows.reduce((a, v) => a + (v - m) * (v - m), 0) / flows.length) : 1;
        sel.gentle = sc2 === 2 && sd / (m || 1) < 0.45 && !splashes; score.push(sc2);
        hud.textContent = lv > 1.0 ? '앗, 넘쳤어요' : sc2 === 2 ? (sel.gentle ? '곱게 따랐어요 ✨' : '알맞게 따랐어요') : lv < 0.72 ? '조금 모자라요' : '조금 많아요';
        setTimeout(() => { R3.dispose(); R3.forceContextLoss && R3.forceContextLoss(); result(); }, 900); };
      loop(dt => {
        if (box.hidden) { R3.dispose(); return false; }
        tilt += (want - tilt) * Math.min(1, dt * 7); pot.rotation.z = -tilt * 1.15; pot.position.set(-1.3 + tilt * 0.22, tilt * 1.55 + Math.max(0, fl.y1 - 0.9) * tilt, 0);   // 들어 올리며 기울여서 부리가 잔 위로
        pot.updateMatrixWorld(true); const tip3 = body.localToWorld(tipL.clone());
        const flow = fin ? 0 : Math.max(0, (tilt - 0.32) / 0.68); const q = flow * flow * 0.55;
        if (q > 0.001) { poured = true; idle = 0; flows.push(q); lv += q * dt / Math.max(0.35, (fl.y1 - fl.y0)) * 0.9; }
        else if (poured && !fin) { idle += dt; if (idle > 0.45 && lv >= 0.55) finish(); }
        if (tilt > 0.9 && !fin) { splashT += dt; if (splashT > 0.25) { splashT = 0; splashes++; for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(dropGeo, teaMat); d.position.set(Math.random() * 0.3 - 0.15, fl.y1, Math.random() * 0.3 - 0.15); d.userData.v = new THREE.Vector3(Math.random() * 2 - 1, 1.6 + Math.random(), Math.random() * 2 - 1); S3.add(d); drops.push(d); } hud.textContent = '앗, 튀었어요! 살살'; } } else splashT = 0;
        const sy = fl.y0 + Math.min(1, lv) * (fl.y1 - fl.y0); surf.visible = lv > 0.02; surf.position.y = sy; const sr = radAt(sy); surf.scale.set(sr, sr, 1);
        if (q > 0.001) { const top = tip3, bot = new THREE.Vector3(0, sy, 0), mid = top.clone().add(bot).multiplyScalar(0.5), len = top.distanceTo(bot), th = 0.012 + 0.05 * flow;
          stream.visible = true; stream.position.copy(mid); stream.scale.set(th, len, th); stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()); } else stream.visible = false;
        for (let k = drops.length - 1; k >= 0; k--) { const d = drops[k]; d.userData.v.y -= 9 * dt; d.position.addScaledVector(d.userData.v, dt); if (d.position.y < 0) { S3.remove(d); drops.splice(k, 1); spill.material.opacity = Math.min(0.55, spill.material.opacity + 0.05); } }
        if (lv > 1.02 && !fin) { spill.material.opacity = 0.6; finish(); }
        Sound.sfx.set('pour', q > 0.001 ? Math.min(1, 0.4 + flow) : 0); Sound.sfx.set('fill', Math.min(1, lv));
        if (!fin && !splashT) hud.textContent = lv < 0.02 ? '위로 끌어 올려 기울여요' : lv < 0.72 ? `${Math.round(lv * 100)}% · 조금 더` : lv <= 0.92 ? `${Math.round(lv * 100)}% · 좋아요! 손을 떼요` : `${Math.round(lv * 100)}% · 넘치기 직전!`;
        R3.render(S3, cam);
      });
    }
    function result() {
      const bad = score.filter(s => s === 0).length, good = score.filter(s => s === 2).length, q = bad ? 0 : good === 3 ? 2 : 1;
      const nm = `${QNAME[sel.tt][q]} ${T.name}`, b = frame('🍵 차가 다 됐어요'); const r = el('div', 'res'); r.append(el('div', 'e', q === 2 ? '✨🍵' : q === 1 ? '🍵' : '😅🍵'), el('b', '', nm),
        el('div', 'sub', `${sel.cup === 'house' ? '공방 흰 찻잔' : '내 ' + sel.cup.name}에 ${sel.gentle ? '곱게 ' : ''}따랐어요${sel.plate && sel.arr && sel.arr.length ? ` · 다과 ${sel.arr.length}가지 · ${sel.judge}` : ''}`)); b.append(r);
      if (q === 2) Sound.sfx.good();
      const row = el('div', 'row'), again = el('button', 'sub2', '다시 내리기'), ok = el('button', '', '찻상에 올리기'); row.append(again, ok); b.append(row);
      again.onclick = () => play(sel);
      ok.onclick = () => { mine = { cup: sel.cup === 'house' ? 'house' : lite(sel.cup), tt: sel.tt, q, plate: sel.plate ? (sel.plate === 'tray' ? 'tray' : lite(sel.plate)) : null, arr: sel.arr || [], snack: null, srv: null, empty: false, t: Date.now(), name: nm };
        close(); Sound.sfx.clink(); setHint(`🍵 ${nm}를 찻상에 올렸어요 · 🍵 찻자리에서 마시거나 대접해요`); sync(); };
    }
  }
  /* 3) 찻자리 메뉴: 마시기 · 대접하기 · 치우기 */
  function openMenu() {
    const b = frame(`🍵 ${mine.name || '차'}`, mine.srv ? '옆 사람 앞에 내어 놓았어요' : '내 자리 찻상에 있어요'); const m = el('div', 'menu'); b.append(m);
    const add2 = (t, f) => { const bt = el('button', '', t); bt.onclick = () => { close(); f(); }; m.append(bt); };
    if (!mine.srv) add2('🍵 마시기', () => { drinkPose(); setTimeout(() => { mine.empty = true; sync(); }, 2200); });
    const mates = [...PEERS.entries()].filter(([, P]) => { const s = seatOf(P.st); return s && bench && s.b === bench.b; });
    if (!mine.empty) for (const [id, P] of mates) if (mine.srv !== id) add2(`🫖 ${P.st.n || '손님'}님께 대접하기`, () => { mine.srv = id; mine.t = Date.now(); Sound.sfx.clink(); doGesture('bow'); sync(); });
    if (mine.srv) add2('↩️ 내 앞으로 가져오기', () => { mine.srv = null; sync(); });
    if (!mates.length) m.append(el('div', 'tip', '💡 같은 평상에 다른 사람이 앉으면 차를 대접할 수 있어요'));
    add2('🔄 새로 차 내리기', () => openPicker());
    add2('🧹 찻상 치우기', () => { mine = null; sync(); });
    const row = el('div', 'row'); const x = el('button', 'sub2', '닫기'); x.onclick = close; row.append(x); b.append(row);
  }
  setInterval(() => { if (pick.hidden) sync(); }, 300);
  return {
    leave() { mine = null; drank = null; sync(); close(); },
    uses(id) { return !!(mine && ((mine.cup && mine.cup.id === id) || (mine.plate && mine.plate.id === id))); },
    net() { return mine ? Object.assign({}, mine) : null; },
    get drank() { return drank; }, served: null, TEAS, SNACKS, Plating, _plating: plating, _open: openPicker, _menu: openMenu, get mine() { return mine; },
    _test(o) { mine = Object.assign({ cup: 'house', tt: 'green', q: 2, plate: 'tray', arr: [['yakgwa', -0.3, 0, 0.3], ['dasik', 0.3, 0.1, 0, 1], ['pine', 0, -0.5, 0.5]], srv: null, empty: false, t: Date.now(), name: '향긋한 녹차' }, o || {}); sync(); }
  };
})();
window.Tea = Tea;

/* ---------- 루프 ---------- */
const clock = new THREE.Clock();
function frame() {
  if ((window.HeukThrow && window.HeukThrow.active) || craftOn()) { clock.getDelta(); requestAnimationFrame(frame); return; }
  const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
  if (!window.__freeze) updateMove(dt);
  afterMove(dt, now);
}
function updateMove(dt) {
  const u = player.userData;
  if (!sitting) {
    let dx = 0, dz = 0;
    // 화면 기준 방향키: 위 = 화면 안쪽
    const yl = CAM.yaw - ROOMS[curRoom].g.rotation.y, fwd = V(-Math.sin(yl), 0, -Math.cos(yl)), right = V(fwd.z * -1, 0, fwd.x);
    if (keys.has('w') || keys.has('arrowup')) { dx += fwd.x; dz += fwd.z; }
    if (keys.has('s') || keys.has('arrowdown')) { dx -= fwd.x; dz -= fwd.z; }
    if (keys.has('d') || keys.has('arrowright')) { dx += right.x; dz += right.z; }
    if (keys.has('a') || keys.has('arrowleft')) { dx -= right.x; dz -= right.z; }
    let moving = false;
    if ((dx || dz) && gesture === 'bow') gesture = null;
    if (dx || dz) { crossTarget = null; stopFollow(); }
    if (dx || dz) moving = stepMove(dx, dz, dt);
    else if (goal) {
      const gx = goal.x - player.position.x, gz = goal.z - player.position.z;
      if (Math.hypot(gx, gz) < 0.06) { if (route.length) goal = route.shift(); else { goal = null; marker.visible = false; if (sitTarget) trySit(sitTarget, Math.hypot(player.position.x - sitTarget.seat.x, player.position.z - sitTarget.seat.z) < 1.1); arrivePending(); } }
      else {
        moving = stepMove(gx, gz, dt);
        const d = Math.hypot(gx, gz);
        if (d < (goal.best ?? 1e9) - 0.02) { goal.best = d; goal.stuck = 0; } else goal.stuck = (goal.stuck || 0) + dt;
        if ((!moving || goal.stuck > 1.2) && !goal.replanned) { const last = route.length ? route[route.length - 1] : goal; walkTo(last.x, last.z); if (goal) goal.replanned = true; }
        else if (!moving || goal.stuck > 1.2) { if (route.length) { goal = route.shift(); } else { goal = null; marker.visible = false; if (sitTarget && Math.hypot(player.position.x - sitTarget.seat.x, player.position.z - sitTarget.seat.z) < 1.1) trySit(sitTarget, true); arrivePending(); } }
      }
    }
    u.walkAmt += ((moving ? 1 : 0) - u.walkAmt) * Math.min(1, dt * 10);
    if (moving) u.phase += dt * 9;
  }
}
function afterMove(dt, now) {
  // 앉아서 빚는 손 움직임
  drawPlayer(now); drawNPCs(now, dt); updatePeers(dt, now); crossCheck(); updateNear(now); updateFollow(now);
  for (const d of ROOMS[curRoom].doors) d.glow.material.opacity = (carrying && (d.to === 'gallery' || (d.to === 'yard' && curRoom !== 'gallery'))) || d.hover ? 0.45 + Math.sin(now * 0.006) * 0.3 : 0;
  if (curRoom === 'gallery') PEDESTALS.forEach(p => p.glow.material.opacity = carrying && !p.fixed && !p.piece ? 0.5 + Math.sin(now * 0.006) * 0.35 : 0);
  WHEELS.forEach((w, i) => { const spin = 0; w.head.rotation.y += spin * dt; if (w.clay) w.clay.rotation.y += spin * dt; });
  if (marker.visible) { marker.userData.t += dt; marker.material.opacity = Math.max(0, 0.8 - marker.userData.t * 0.6); }
  // 카메라: 캐릭터를 부드럽게 따라감
  const focus = window.__focus ? window.__focus : sitting ? toWorld('studio', sitTarget.g.position.x, sitTarget.g.position.z - 0.25, 0.6) : toWorld(curRoom, player.position.x, player.position.z, 0.62);
  camFocusTarget.copy(focus); camFocus.lerp(camFocusTarget, Math.min(1, dt * 5));
  viewSize += (viewTarget - viewSize) * Math.min(1, dt * 5);
  CAM.yaw += (CAM.yawT - CAM.yaw) * Math.min(1, dt * 10); CAM.pitch += (CAM.pitchT - CAM.pitch) * Math.min(1, dt * 10);
  camera.position.copy(camFocus).addScaledVector(camDir(), camDist()); camera.lookAt(camFocus);
  updateShells(); updateSun(); fadeOccluders(now);
  if (USE_3D) { const show = !sitting && pick.hidden && !fading; nametag.hidden = !show;
    if (show) { const v = toWorld(curRoom, player.position.x, player.position.z, 1.42).project(camera); nametag.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; nametag.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; } }
  if (!window.__loaded) { window.__loaded = true; const ld = document.getElementById('loading'); if (ld) { ld.classList.add('done'); setTimeout(() => ld.remove(), 600); } }
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
    const m = pieceMesh(pc, 0.2); m.position.set(-1.2 + i * 0.42, 0.76, 0.78); m.userData.pid = pc.id; myPieces.add(m);
  });
}
renderMyPieces(); addEventListener('heukmaru-pieces', renderMyPieces);
// 들고 있던 작품이 있으면 다시 들기(새로고침 대비)
{ const c = loadPieces().find(o => o.place === 'carry'); if (c) carrying = c; }
addEventListener('contextmenu', e => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
renderGallery(); applyRoom('studio', null); player.position.set(-2.6, 0, 2.4); doorLock = null; setHint('바닥을 누르거나 WASD로 걸어요');
window.__heukmaru = { openInv, Tea, sitBench, standBench, get bench(){return bench}, BENCHES, C3, myPieces, tablePieceAt,  get PLAYER_KEY(){return PLAYER_KEY}, reachMap, startFollow,  get NET_GAL(){return NET_GAL}, get netOnline(){return netOnline}, PEERS, get netState(){return netState()}, get fading(){return fading}, get viewTarget(){return viewTarget}, renderer, scene, cross(t) { crossTarget = Object.assign({}, t); planCross(); }, enterRoom, toWorld, LAYOUT, get crossTarget(){return crossTarget}, craftBtn, camera, setGoalDirect(x, z) { goal = { x, z }; route = []; }, findPath, walkTo, sim(sec, keyset) { const k0 = [...keys]; keys.clear(); (keyset || []).forEach(k => keys.add(k)); window.__freeze = true; for (let t = 0; t < sec; t += 1 / 60) updateMove(1 / 60); keys.clear(); k0.forEach(k => keys.add(k)); window.__freeze = false; }, get sitTarget(){return sitTarget}, stepMove, freeSpotNear, penetration, get partner(){return partner}, goRoom, applyRoom, get curRoom(){return curRoom}, get carrying(){return carrying}, startCarry, placeOn, walkToPedestal, PEDESTALS, NPCS, ROOMS, get goal(){return goal}, get route(){return route}, get sitting(){return sitting}, player, teacher, WHEELS, trySit, stand, seatOn, standUp, colliders, blocked, setView: v => { viewTarget = viewSize = v; }, CAM };
})();
