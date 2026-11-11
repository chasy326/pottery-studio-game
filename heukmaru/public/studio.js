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
  YAW_MIN: -0.3, YAW_MAX: 1.72, PITCH_MIN: 0.3, PITCH_MAX: 1.15 };   // 벽(뒤·왼쪽)이 화면을 가리지 않는 범위에서만 돌려요
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
const lamp = new THREE.PointLight('#ffd49a', 1.4, 5, 1.6); lamp.position.set(0.4, 2.2, 0.3); scene.add(lamp);
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
// 2) 가운데 흰 받침대 18개 (3줄 × 6)
for (const z of [-0.8, 0.75, 2.3]) for (let c = 0; c < 6; c++) {
  const x = -1.9 + c * 1.15, g = new THREE.Group(); g.position.set(x, 0, z); room.add(g);
  box(g, 0, 0.42, 0, 0.55, 0.84, 0.55, M('#f6f4ef', 0.85)); box(g, 0, 0.855, 0, 0.59, 0.03, 0.59, M('#e6dfd3', 0.7));
  const glow = add(g, new THREE.RingGeometry(0.38, 0.45, 36), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }), 0, 0.012, 0, { rx: -Math.PI / 2, cast: false });
  const holder = new THREE.Group(); holder.position.y = 0.87; g.add(holder);
  boxCol(x - 0.3, x + 0.3, z - 0.3, z + 0.3);   // 받침대 사이로 지나갈 수 있게 (간격 0.55)
  PEDESTALS.push({ x, z, g, glow, holder, scale: 0.42, wall: false, stand: { x, z: z + 0.62 } });
}
// 벽 선반 9칸에는 공방 컵을 미리 진열 (참고 사진처럼 색이 다른 컵들)
{ const CUPC = ['#5f9a8f', '#7b4a2e', '#a5643f', '#9db8b0', '#3f3a36', '#6fa3a0', '#8a5a3a', '#c98a4a', '#4f7f86'];
  [2, 6, 10, 15, 19, 23, 29, 33, 40].forEach((i, k) => { const prof = [[0.05, 0.075, 0.085, 0.09, 0.088], [0.06, 0.08, 0.07, 0.08, 0.09], [0.05, 0.07, 0.08, 0.1, 0.105]][k % 3];
    const c = lathePot(prof, 0.2 + (k % 3) * 0.04, M(CUPC[k], 0.35), 20); PEDESTALS[i].holder.add(c); PEDESTALS[i].fixed = true; }); }
// 선생님 작품 3점 (고정) — 바닥 받침대
[[45, 3], [52, 11], [59, 7]].forEach(([i, seed]) => { const p = randPot(seed); p.scale.setScalar(2.3); PEDESTALS[i].holder.add(p); PEDESTALS[i].fixed = true; });
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
Object.keys(SPR).forEach(tex);                                  // 미리 불러오기
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
let heldMesh = null, heldId = null;
function syncHeld(c) {
  const id = carrying ? carrying.id : null;
  if (id !== heldId) { if (heldMesh) { heldMesh.parent && heldMesh.parent.remove(heldMesh); heldMesh = null; }
    heldId = id; if (carrying) { heldMesh = pieceMesh(carrying, 0.28 / c.scale); heldMesh.position.set(0, -0.05, 0.02); c.holdPt.add(heldMesh); } }
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
  if (u.pose === 'sit' && sitTarget) {
    const w = sitTarget; c.set('sit'); c.root.position.set(w.seat.x, 0.44 - 0.075 * c.scale, w.seat.z + 0.02); c.root.rotation.y = 0;
    playerActor.blob.position.set(w.seat.x, 0.008, w.seat.z); c.update(dt, false); return;
  }
  const walking = u.walkAmt > 0.35;
  c.set(carrying ? 'carry' : 'idle'); if (now < cheerUntil && !c._cheer) { c.set('wave'); c._cheer = true; } if (now >= cheerUntil) c._cheer = false;
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
function blocked(x, z) {
  if (x < ROOM.x0 + R || x > ROOM.x1 - R || z < ROOM.z0 + R || z > ROOM.z1 - R) return true;
  for (const c of colliders) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + R) return true; }
    else if (x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R) return true;
  }
  for (const n of peopleHere()) if (Math.hypot(x - n.x, z - n.z) < 0.4) return true;   // 사람끼리 통과하지 않게
  return false;
}
let steerBias = 1; const keys = new Set(); let goal = null, sitting = false, sitTarget = null;
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
const CELL = 0.1;
function clearLine(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.05); for (let i = 1; i <= n; i++) { const t = i / n; if (blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
function findPath(fx, fz, tx, tz) {
  const t = freeSpotNear(tx, tz); tx = t.x; tz = t.z;
  if (blocked(fx, fz)) { const f = freeSpotNear(fx, fz); return [f, ...findPath(f.x, f.z, tx, tz)]; }   // 막힌 곳에서 출발하면 가까운 빈자리부터
  if (clearLine(fx, fz, tx, tz)) return [{ x: tx, z: tz }];
  const X0 = ROOM.x0, Z0 = ROOM.z0, W = Math.ceil((ROOM.x1 - X0) / CELL) + 1, H = Math.ceil((ROOM.z1 - Z0) / CELL) + 1;
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
      const ng = g[c] + (ddx && ddz ? 1.414 : 1); if (ng < g[n]) { g[n] = ng; from[n] = c; if (!open.includes(n)) open.push(n); }
    }
  }
  const endI = found ? goalI : bestI;                     // 못 가는 곳이면 가장 가까이 갈 수 있는 곳까지
  if (endI === start) return [{ x: fx, z: fz }];
  const pts = []; for (let i = endI; i !== -1 && i !== start; i = from[i]) pts.unshift({ x: cx(i), z: cz(i) }); if (found) pts[pts.length - 1] = { x: tx, z: tz };
  const out = []; let ax = fx, az = fz, k = 0;                   // 직선으로 갈 수 있으면 건너뛰기
  while (k < pts.length) { let j = pts.length - 1; while (j > k && !clearLine(ax, az, pts[j].x, pts[j].z)) j--; out.push(pts[j]); ax = pts[j].x; az = pts[j].z; k = j + 1; }
  return out;
}
function walkTo(x, z) { route = findPath(player.position.x, player.position.z, x, z); goal = route.shift(); }
function stepMove(dx, dz, dt) {
  const len = Math.hypot(dx, dz); if (len < 1e-4) return false;
  const sp = 1.7 * dt, p = player.position, base = Math.atan2(dx, dz);
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
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); goal = null; route = []; e.preventDefault(); }
  if (k === 'e') sitting ? stand() : trySit();
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
  // 문을 누르면 문 앞 매트로 걸어감
  const dh = ray.intersectObjects(ROOMS[curRoom].doors.map(d => d.g), true);
  if (dh.length) { const d = ROOMS[curRoom].doors.find(d => { let o = dh[0].object; while (o) { if (o === d.g) return true; o = o.parent; } return false; }); if (d) { sitTarget = null; route = findPath(player.position.x, player.position.z, d.x, d.z); route[route.length - 1] = { x: d.x, z: d.z }; goal = route.shift(); showMarker(V(d.x, 0, d.z)); setHint(`${ROOM_INFO[d.to].icon} ${ROOM_INFO[d.to].name}(으)로 가요`); return; } }
  if (curRoom === 'gallery') {
    const ph = ray.intersectObjects(PEDESTALS.map(p => p.g), true);
    if (ph.length) { const i = PEDESTALS.findIndex(p => { let o = ph[0].object; while (o) { if (o === p.g) return true; o = o.parent; } return false; });
      if (i >= 0) { const p = PEDESTALS[i]; if (carrying && !p.fixed && !p.piece) { walkToPedestal(i); setHint('받침대로 가서 내려놓아요'); } else pieceInfo(p); return; } }
  }
  if (curRoom !== 'studio') { const pt = V(); if (ray.ray.intersectPlane(ground, pt)) { sitTarget = null; walkTo(pt.x, pt.z); showMarker(pt); } return; }
  // 물레를 누르면 앉으러 감
  if (SHOW_NPC && ray.intersectObjects([WHEELS[2].g, WHEELS[2].stool], true).length || (() => { const p = V(); ray.ray.intersectPlane(ground, p); return p && Math.hypot(p.x - WHEELS[2].g.position.x, p.z - WHEELS[2].g.position.z) < 0.55; })()) { setHint('선생님 자리예요. 1·2번 물레를 써요'); return; }
  const hits = ray.intersectObjects(FREE_WHEELS().map(w => w.g), true);
  if (hits.length) { const w = WHEELS.find(w => hits[0].object.parent === w.g || hits[0].object.parent?.parent === w.g); if (w) return trySit(w); }
  const pt = V(); if (ray.ray.intersectPlane(ground, pt)) { sitTarget = null; walkTo(pt.x, pt.z); showMarker(pt); }
});
renderer.domElement.addEventListener('wheel', e => { viewTarget = THREE.MathUtils.clamp(viewTarget * (1 + e.deltaY * 0.0012), 2.2, 10); e.preventDefault(); }, { passive: false });
renderer.domElement.style.touchAction = 'none';
// 이동 목표 표시
const marker = add(scene, new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.8, depthWrite: false }), 0, 0.01, 0, { rx: -Math.PI / 2, cast: false });
marker.visible = false;
function showMarker(p) { marker.position.set(p.x, 0.012, p.z); marker.visible = true; marker.userData.t = 0; }

/* ---------- 앉기 / 일어서기 ---------- */
const sitBtn = $('#sitBtn'), hint = $('#hint');
const FREE_WHEELS = () => WHEELS.filter((w, i) => !SHOW_NPC || i !== 2);
function nearestFreeWheel() {
  const free = FREE_WHEELS();
  return free.sort((a, b) => a.seat.distanceTo(player.position) - b.seat.distanceTo(player.position))[0];
}
let route = [];
function trySit(w = nearestFreeWheel(), force = false) {
  if (curRoom !== 'studio') return;
  if (carrying) { setHint('작품을 들고 있어요. 전시관에 놓거나 작업대에 둬요'); sitTarget = null; return; }
  const approach = V(w.seat.x, 0, w.seat.z - 0.42), p = player.position;
  if (!force && Math.hypot(p.x - approach.x, p.z - approach.z) > 0.25) {
    // 물레 앞쪽에 있으면 옆으로 돌아서 뒤쪽 의자로
    walkTo(approach.x, approach.z); sitTarget = w; setHint('물레 쪽으로 걸어가요'); return;
  }
  route = [];
  sitting = true; goal = null; sitTarget = w;
  seatOn(player, w); sitBtn.textContent = '일어서기';
  viewTarget = 3.6; setHint('흙을 물레 가운데에 올렸어요');
  if (window.HeukThrow) window.HeukThrow.open({ skin: PLAYER_KEY === 'B' ? '#f3bda6' : '#f0b39b', onExit: () => stand(), say: t => sayTeacher(t), onCarry: pc => startCarry(pc) });
}
function stand() {
  if (!sitting) return; sitting = false; standUp(player, sitTarget);
  const spot = freeSpotNear(sitTarget.seat.x, sitTarget.seat.z - 0.42); player.position.set(spot.x, 0, spot.z); player.rotation.y = Math.PI;
  goal = null; route = []; keys.clear(); sitTarget = null;
  sitBtn.textContent = '물레에 앉기'; viewTarget = DEFAULT_VIEW; setHint('바닥을 누르거나 WASD로 걸어요');
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
roomNav.innerHTML = ROOM_ORDER.map(id => `<button data-r="${id}" title="${ROOM_INFO[id].name}"><i>${ROOM_INFO[id].icon}</i><span>${ROOM_INFO[id].short}</span></button>`).join('');
roomNav.querySelectorAll('button').forEach(b => b.onclick = () => { if (!sitting && b.dataset.r !== curRoom) goRoom(b.dataset.r); });
function applyRoom(id, from) {
  ROOMS[curRoom].g.visible = false; curRoom = id; ROOMS[id].g.visible = true; colliders = ROOMS[id].cols;
  const d = ROOMS[id].doors.find(o => o.to === from) || ROOMS[id].doors[0];
  player.position.set(d.x + 0.75, 0, d.z); player.rotation.y = Math.PI / 2; doorLock = d;
  goal = null; route = []; sitTarget = null; marker.visible = false; pendingPlace = null;
  camFocus.set(player.position.x, 0.62, player.position.z);
  roomNav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.r === id));
  $('#placeName').textContent = ROOM_INFO[id].name;
  bubble.hidden = true; speaker = null; nextBubble = performance.now() + 1500;
  updateDock(); updateGalleryGlow();
  setHint(ROOM_HINT[id]());
}
const ROOM_HINT = {
  studio: () => carrying ? '왼쪽 🖼 전시관 문으로 들고 가요' : '물레를 누르면 앉아서 빚어요',
  dry: () => { const L = loadPieces().filter(p => HeukCraft.stageOf(p) === 'raw'); return L.length ? `굽 깎을 그릇 ${L.length}개 · 아래 🔪 버튼 (빚고 15초~2분이 깎기 좋아요)` : '빚은 그릇을 뒤집어 굽을 깎는 방이에요 · 굽을 깎아야 가마에 넣을 수 있어요'; },
  kiln: () => { const k = window.HeukCraft && HeukCraft.kilnInfo(); return k && k.phase === 'firing' ? `가마가 굽는 중이에요 · ${k.left}초 남음` : k && k.phase === 'done' ? '🔥 다 구워졌어요! 아래 버튼으로 가마를 열어요' : '마른 그릇은 초벌, 유약 바른 그릇은 재벌해요 · 아래 🔥 버튼'; },
  glaze: () => '초벌한 그릇을 꾸미고 유약에 담가요 · 아래 🎨 버튼',
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
  setHint('작품을 들었어요! 왼쪽 🖼 전시관 문으로 가요');
  if (SHOW_NPC) say(teacher, '전시관에 놓으면 다들 볼 수 있어요!', 1.25, 3600);
}
function updateGalleryGlow() { PEDESTALS.forEach(p => p.glow.material.opacity = 0); }
function renderGallery() {
  const list = loadPieces();
  PEDESTALS.forEach((p, i) => { if (p.fixed) return; p.holder.clear(); const pc = list.find(o => o.place === 'gallery' && o.slot === i); p.piece = pc || null; if (pc) p.holder.add(pieceMesh(pc, p.scale)); });
}
function placeOn(i) {
  const ped = PEDESTALS[i]; if (!carrying || ped.fixed || ped.piece) return;
  const pc = carrying, m = pieceMesh(pc, ped.scale); scene.add(m);
  const from = V(player.position.x, 0.62, player.position.z), to = ped.holder.getWorldPosition(V()), t0 = performance.now();
  carrying = null; cheerUntil = t0 + 1500; player.rotation.y = Math.PI;
  const anim = () => { const u = Math.min(1, (performance.now() - t0) / 650), e = 1 - Math.pow(1 - u, 3);
    m.position.lerpVectors(from, to, e); m.position.y += Math.sin(u * Math.PI) * 0.35; m.rotation.y = u * 1.2;
    if (u < 1) requestAnimationFrame(anim); else {
      scene.remove(m); const list = loadPieces(), it = list.find(o => o.id === pc.id); if (it) { it.place = 'gallery'; it.slot = i; } savePieces(list);
      renderGallery(); renderMyPieces(); updateDock();
      const n = SHOW_NPC && NPCS.find(o => o.room === 'gallery' && o.spot); if (n) say(n.obj, ['와, 잘 어울려요!', '이거 직접 만든 거예요?', '색 너무 예쁘다'][Math.floor(Math.random() * 3)], 1.55, 3200);
      setHint(`${pc.clayName || ''} ${pc.name}을(를) 전시했어요 ✓`);
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
  const pc = p.piece; setHint(`${pc.clayName || ''} ${pc.name} · ${'★'.repeat(pc.stars || 1)} ${pc.score || ''}점 · ${HeukCraft.STAGE_NAME[HeukCraft.stageOf(pc)]}${pc.result && pc.result.yo ? ' · ✨요변' : ''}`);
}
/* 하단 버튼: 방마다 다름 */
const carryBtn = $('#carryBtn');
function updateDock() {
  const inStudio = curRoom === 'studio';
  sitBtn.hidden = !inStudio || !!carrying;
  carryBtn.hidden = !carrying || curRoom === 'gallery';
  const soon = null;
  soonBtn.hidden = !soon || !!carrying; if (soon) soonBtn.textContent = soon;
  craftBtn.hidden = !['kiln', 'glaze', 'dry'].includes(curRoom) || !!carrying;
  if (curRoom === 'kiln') { const k = HeukCraft.kilnInfo(); craftBtn.textContent = k.phase === 'firing' ? `🔥 굽는 중 · ${k.left}초` : k.phase === 'done' ? '🔥 가마 열기!' : '🔥 가마에 넣고 굽기'; craftBtn.classList.toggle('hot', k.phase === 'done'); }
  if (curRoom === 'glaze') { craftBtn.textContent = '🎨 꾸미고 유약 바르기'; craftBtn.classList.remove('hot'); }
  if (curRoom === 'dry') { craftBtn.textContent = '🔪 굽깎기'; craftBtn.classList.remove('hot'); }
  galleryBtn.hidden = curRoom !== 'gallery' || !carrying; 
}
const soonBtn = $('#soonBtn'), galleryBtn = $('#galleryBtn');
soonBtn.onclick = () => setHint('이 방 활동은 곧 열려요! 지금은 둘러볼 수 있어요');
const craftBtn = $('#craftBtn');
const craftExit = () => { renderGallery(); renderMyPieces(); updateDock(); setHint(ROOM_HINT[curRoom]()); };
craftBtn.onclick = () => { goal = null; route = []; marker.visible = false;
  if (curRoom === 'kiln') HeukCraft.openKiln({ onExit: craftExit });
  else if (curRoom === 'dry') HeukCraft.openTrim({ onExit: craftExit });
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
  const target = V(player.position.x, 0.55, player.position.z), from = camera.position.clone(), dir = target.clone().sub(from), len = dir.length(); dir.normalize();
  const hitNow = new Set(), grp = ROOMS[curRoom].g;
  for (const off of [0, 0.35, -0.35]) {                       // 몸 가운데 · 머리 · 발 쪽 세 줄
    const t2 = target.clone().add(V(0, off + 0.1, 0)), d2 = t2.clone().sub(from); const l2 = d2.length(); d2.normalize();
    occRay.set(from, d2); occRay.far = l2 - 0.35;
    for (const h of occRay.intersectObject(grp, true)) { const o = h.object; if (!o.isMesh || !o.material || o.userData.noFade) continue; hitNow.add(o); }
  }
  for (const o of hitNow) if (!faded.has(o)) { const orig = o.material; const m = (Array.isArray(orig) ? orig[0] : orig).clone(); m.transparent = true; m.opacity = 0.22; m.depthWrite = false; o.material = m; faded.set(o, orig); }
  for (const [o, orig] of faded) if (!hitNow.has(o)) { o.material.dispose(); o.material = orig; faded.delete(o); }
}
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
    const fwd = V(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)), right = V(fwd.z * -1, 0, fwd.x);
    if (keys.has('w') || keys.has('arrowup')) { dx += fwd.x; dz += fwd.z; }
    if (keys.has('s') || keys.has('arrowdown')) { dx -= fwd.x; dz -= fwd.z; }
    if (keys.has('d') || keys.has('arrowright')) { dx += right.x; dz += right.z; }
    if (keys.has('a') || keys.has('arrowleft')) { dx -= right.x; dz -= right.z; }
    let moving = false;
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
  drawPlayer(now); drawNPCs(now, dt); checkDoors();
  for (const d of ROOMS[curRoom].doors) d.glow.material.opacity = (carrying && d.to === 'gallery') || d.hover ? 0.45 + Math.sin(now * 0.006) * 0.3 : 0;
  if (curRoom === 'gallery') PEDESTALS.forEach(p => p.glow.material.opacity = carrying && !p.fixed && !p.piece ? 0.5 + Math.sin(now * 0.006) * 0.35 : 0);
  WHEELS.forEach((w, i) => { const spin = 0; w.head.rotation.y += spin * dt; if (w.clay) w.clay.rotation.y += spin * dt; });
  if (marker.visible) { marker.userData.t += dt; marker.material.opacity = Math.max(0, 0.8 - marker.userData.t * 0.6); }
  // 카메라: 캐릭터를 부드럽게 따라감
  const focus = window.__focus ? window.__focus : sitting ? V(sitTarget.g.position.x, 0.6, sitTarget.g.position.z - 0.25) : V(player.position.x, 0.62, player.position.z);
  camFocusTarget.copy(focus); camFocus.lerp(camFocusTarget, Math.min(1, dt * 5));
  viewSize += (viewTarget - viewSize) * Math.min(1, dt * 5);
  CAM.yaw += (CAM.yawT - CAM.yaw) * Math.min(1, dt * 10); CAM.pitch += (CAM.pitchT - CAM.pitch) * Math.min(1, dt * 10);
  camera.position.copy(camFocus).addScaledVector(camDir(), camDist()); camera.lookAt(camFocus);
  fadeOccluders(now);
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
    const m = pieceMesh(pc, 0.2); m.position.set(-1.2 + i * 0.42, 0.76, 0.78); myPieces.add(m);
  });
}
renderMyPieces(); addEventListener('heukmaru-pieces', renderMyPieces);
// 들고 있던 작품이 있으면 다시 들기(새로고침 대비)
{ const c = loadPieces().find(o => o.place === 'carry'); if (c) carrying = c; }
addEventListener('contextmenu', e => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
renderGallery(); applyRoom('studio', null); player.position.set(-2.6, 0, 2.4); doorLock = null; setHint('바닥을 누르거나 WASD로 걸어요');
window.__heukmaru = { craftBtn, camera, setGoalDirect(x, z) { goal = { x, z }; route = []; }, findPath, walkTo, sim(sec, keyset) { const k0 = [...keys]; keys.clear(); (keyset || []).forEach(k => keys.add(k)); window.__freeze = true; for (let t = 0; t < sec; t += 1 / 60) updateMove(1 / 60); keys.clear(); k0.forEach(k => keys.add(k)); window.__freeze = false; }, get sitTarget(){return sitTarget}, stepMove, freeSpotNear, penetration, get partner(){return partner}, goRoom, applyRoom, get curRoom(){return curRoom}, get carrying(){return carrying}, startCarry, placeOn, walkToPedestal, PEDESTALS, NPCS, ROOMS, get goal(){return goal}, get route(){return route}, get sitting(){return sitting}, player, teacher, WHEELS, trySit, stand, seatOn, standUp, colliders, blocked, setView: v => { viewTarget = viewSize = v; }, CAM };
})();
