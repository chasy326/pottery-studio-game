/* 흙마루 · 공정 (그릇 상태 · 유약 26색 · 표면 질감 계산 · 가마 · 시유실)
   그릇 상태: raw(날그릇, 굽깎기 전) → drying(굽 깎고 말리는 중, 30초) → dry(마름) → bisque(초벌) → glazed(꾸미기·유약) → done(재벌 완성) / broken(깨짐)
   기존 작품(상태 없음)은 done 으로 봐요. */
(() => {
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, r = document) => r.querySelector(s);
const DRY_MS = 30000, FIRE_MS = 20000;

/* ---------- 흙 색 (물레와 같은 값) ---------- */
const CLAY = {
  white: { name: '백자토', dry: '#ebe6dd', fired: '#f4f1ea', red: '#eef0f0', speck: 0 },
  buff:  { name: '분청토', dry: '#cbbfae', fired: '#d9cfc0', red: '#c9c4bb', speck: 0.5 },
  red:   { name: '적토',   dry: '#c08060', fired: '#b5654a', red: '#8f5a48', speck: 0.3 },
  black: { name: '흑토',   dry: '#6e6761', fired: '#3a3532', red: '#2f2d2c', speck: 0.6 }
};
/* ---------- 유약 26색: raw = 바른 직후(분칠 색), ox = 산화, red = 환원, op = 불투명도, fin = 질감 ---------- */
const GLAZES = [
  { id: 'celadon', name: '청자유', raw: '#d9dccd', ox: '#b8b27a', red: '#8fb5a2', op: 0.45, fin: 'crackle', yo: '#6fa7b5', note: '환원에서 맑은 비취색' },
  { id: 'white', name: '백유', raw: '#f2efe8', ox: '#f2eee6', red: '#eef1f3', op: 0.92, fin: 'gloss' },
  { id: 'clear', name: '투명유', raw: '#ecebe6', ox: '#f6f3ea', red: '#f1f3f1', op: 0.12, fin: 'gloss', note: '흙색과 그림이 비쳐요' },
  { id: 'black', name: '흑유', raw: '#9d958d', ox: '#2b2622', red: '#1f2326', op: 0.95, fin: 'gloss', yo: '#3b4a6a' },
  { id: 'tenmoku', name: '천목유', raw: '#a99a8a', ox: '#4a2a18', red: '#3a2416', op: 0.93, fin: 'gloss', yo: '#b56a2a', note: '두꺼운 곳은 검고 얇은 곳은 갈색' },
  { id: 'olive', name: '녹갈유', raw: '#c9c2a8', ox: '#6b5a2c', red: '#4f5a34', op: 0.85, fin: 'gloss' },
  { id: 'yellow', name: '황유', raw: '#ece2c0', ox: '#d4ad5a', red: '#c9a24a', op: 0.8, fin: 'gloss' },
  { id: 'sky', name: '하늘유', raw: '#dfe6ea', ox: '#8fb4d1', red: '#7aa6cc', op: 0.75, fin: 'gloss' },
  { id: 'cobalt', name: '코발트 청유', raw: '#c9cfe0', ox: '#2f5aa8', red: '#2b4f9a', op: 0.85, fin: 'gloss' },
  { id: 'copper', name: '진사유', raw: '#d6dcd2', ox: '#5f8c6a', red: '#a8323a', op: 0.85, fin: 'gloss', yo: '#6a3a8a', note: '산화는 초록, 환원은 붉은색' },
  { id: 'oribe', name: '녹유', raw: '#d2dccd', ox: '#3f7a4a', red: '#3d6d48', op: 0.7, fin: 'gloss' },
  { id: 'pink', name: '분홍유', raw: '#f1e2df', ox: '#e8b8b8', red: '#dcb0b8', op: 0.85, fin: 'gloss' },
  { id: 'lavender', name: '라벤더유', raw: '#e7e2ee', ox: '#b8a8d8', red: '#a89cc8', op: 0.85, fin: 'gloss' },
  { id: 'mint', name: '민트유', raw: '#e2efe9', ox: '#a9d8c4', red: '#9ccfbf', op: 0.85, fin: 'gloss' },
  { id: 'lemon', name: '레몬유', raw: '#f2edcc', ox: '#ecd65a', red: '#e2cc56', op: 0.85, fin: 'gloss' },
  { id: 'orange', name: '오렌지유', raw: '#f0dccb', ox: '#e48a3a', red: '#d47c34', op: 0.9, fin: 'gloss' },
  { id: 'rust', name: '녹물유', raw: '#dcc9bb', ox: '#9a4a2a', red: '#8a3f28', op: 0.9, fin: 'matte' },
  { id: 'ash', name: '재유', raw: '#d6d2c4', ox: '#a8a074', red: '#8c9a7a', op: 0.6, fin: 'ash', yo: '#5f8a6a', note: '흘러내리며 줄무늬가 생겨요' },
  { id: 'mwhite', name: '무광 백유', raw: '#f1efea', ox: '#e8e4da', red: '#e4e3dc', op: 0.95, fin: 'matte' },
  { id: 'mblack', name: '무광 흑유', raw: '#a19c96', ox: '#3a3836', red: '#33373a', op: 0.95, fin: 'matte' },
  { id: 'mgray', name: '무광 회유', raw: '#dad8d3', ox: '#9a9894', red: '#8f9396', op: 0.92, fin: 'matte' },
  { id: 'molive', name: '올리브 무광', raw: '#d9d8c4', ox: '#7a7a4a', red: '#6c7450', op: 0.9, fin: 'matte' },
  { id: 'crystal', name: '결정유', raw: '#e2e6e0', ox: '#c9d4c8', red: '#b9c9cf', op: 0.85, fin: 'crystal', yo: '#e9eef2', note: '눈꽃 같은 결정이 피어요' },
  { id: 'crackle', name: '빙렬유', raw: '#efe9de', ox: '#ece4d4', red: '#e6e2d8', op: 0.88, fin: 'crackle' },
  { id: 'bronze', name: '금속광유', raw: '#b8ad9c', ox: '#6a5a3a', red: '#4f4a3e', op: 0.95, fin: 'metal' },
  { id: 'terra', name: '테라코타 무광', raw: '#eedacb', ox: '#c47a52', red: '#a86a4e', op: 0.9, fin: 'matte' },
  { id: 'speckle', name: '점박이 백유', raw: '#efece4', ox: '#ebe5d8', red: '#e6e3dc', op: 0.9, fin: 'speckle', note: '갈색 점이 톡톡' },
  { id: 'ruri', name: '유리 청유', raw: '#d4dde6', ox: '#2d6f8e', red: '#22597a', op: 0.6, fin: 'gloss', yo: '#3fa0a8' }
];
const G = Object.fromEntries(GLAZES.map(g => [g.id, g]));
/* 그리기 도구 색 (도자기용 색연필·크레파스·물감) */
const DECOR_COLORS = ['#1f2a44', '#2f5aa8', '#4f8ac8', '#2f7a5a', '#6aa84f', '#e0b53a', '#e07a2a', '#c8392f', '#d86a9a', '#7a4fa0', '#6b4a32', '#2b2622', '#ffffff'];

/* ---------- 저장 ---------- */
function loadPieces() { try { return JSON.parse(localStorage.getItem('heukmaru-pieces') || '[]'); } catch { return []; } }
function savePieces(list) { let k = 0; list = list.filter(pc => pc.place === 'gallery' || pc.place === 'carry' || pc.stage === 'bisque' || pc.stage === 'glazed' || k++ < 30);
  try { localStorage.setItem('heukmaru-pieces', JSON.stringify(list)); } catch (e) { console.warn('저장 공간 부족', e); }
  dispatchEvent(new Event('heukmaru-pieces')); }
function updatePiece(id, fn) { const list = loadPieces(), pc = list.find(p => p.id === id); if (pc) { fn(pc); savePieces(list); } return pc; }
function stageOf(pc) { if (!pc.stage) return 'done'; if (pc.stage === 'raw') { if (!pc.trim) return 'raw'; return Date.now() - pc.trim.at > DRY_MS ? 'dry' : 'drying'; } return pc.stage; }
const STAGE_NAME = { raw: '굽깎기 전', drying: '굽 깎음 · 말리는 중', dry: '마름 · 초벌 대기', bisque: '초벌 완료', glazed: '유약 바름 · 재벌 대기', done: '완성', broken: '깨짐' };
function dryLeft(pc) { return Math.max(0, Math.ceil((DRY_MS - (Date.now() - (pc.trim ? pc.trim.at : Date.now()))) / 1000)); }
const WET_MS = 15000, HARD_MS = 120000;
function wetState(pc) { const a = Date.now() - (pc.madeAt || 0); return a < WET_MS ? 'wet' : a < HARD_MS ? 'leather' : 'hard'; }
const WET_NAME = { wet: '💧 아직 젖음', leather: '✅ 깎기 좋음 (반건조)', hard: '🪨 단단해짐' };

/* ---------- 그릇 모양 → 메쉬 (UV를 표면 길이에 맞춰서 그림이 고르게) ---------- */
function profile(pc) {
  const n = pc.r.length, H = pc.H, tr = pc.trim, ro = tr && tr.ro ? tr.ro : pc.r, d = tr && tr.d > 0.002 ? tr.d : 0;
  const pts = d ? [[0.001, d, 'cap', d], [tr.fi, d, 'cap', d], [tr.fi, 0, 'cap', 0]] : [[0.001, 0, 'cap', 0]];
  for (let k = 0; k < n; k++) pts.push([ro[k], H * k / (n - 1), 'out', H * k / (n - 1)]);
  for (let k = n - 1; k >= 0; k--) { const y = H * k / (n - 1); if (y < pc.floorT) break; pts.push([Math.max(0.02, pc.r[k] - pc.t[k]), y, 'in', y]); }
  pts.push([0.001, pc.floorT, 'floor', pc.floorT]);
  const s = [0]; for (let j = 1; j < pts.length; j++) s.push(s[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
  const S = s[s.length - 1]; return { pts, v: s.map(x => x / S), H, S };
}
function geometryOf(pc, seg = 48) {
  const pr = profile(pc), P = pr.pts.length;
  const g = new THREE.LatheGeometry(pr.pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
  const uv = g.attributes.uv; for (let i = 0; i <= seg; i++) for (let j = 0; j < P; j++) uv.setY(i * P + j, pr.v[j]); uv.needsUpdate = true;
  g.userData.pr = pr; return g;
}
// v(0~1) → 표면 위치 {side, h(높이), r}
function locate(pr, v) {
  const P = pr.pts.length; let j = 1; while (j < P - 1 && pr.v[j] < v) j++;
  const a = pr.pts[j - 1], b = pr.pts[j], t = clamp((v - pr.v[j - 1]) / Math.max(1e-6, pr.v[j] - pr.v[j - 1]), 0, 1);
  const side = b[2] === 'in' || b[2] === 'floor' ? 'in' : (a[2] === 'cap' ? 'foot' : 'out');
  return { side, h: lerp(a[1], b[1], t), r: lerp(a[0], b[0], t) };
}

/* ---------- 색 계산 도구 ---------- */
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
function rnd(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function loadImg(src) { return new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }

/* 유약 두께: 담근 시간(초) → 두께. 2~3초가 1.0 근처 */
const thickOf = sec => clamp(sec / 2.5, 0.15, 2.4);
/* 표면 한 점에 덮인 유약 층들 */
function glazeAt(pc, loc) {
  const gz = pc.glaze; if (!gz || !gz.layers) return [];
  const out = []; const fromRim = (pc.H - loc.h) / pc.H;
  for (const L of gz.layers) {
    let cov = loc.side === 'in' ? 1 : (loc.side === 'foot' ? (L.depth >= 0.995 ? 1 : 0) : (fromRim <= L.depth ? 1 : 0));
    if (gz.wax && (loc.side === 'foot' || (loc.side === 'out' && loc.h < pc.H * 0.05))) cov = 0;       // 왁스 바른 굽은 유약이 안 묻음
    if (cov) out.push({ g: G[L.g], t: thickOf(L.sec), edge: loc.side === 'out' ? (L.depth - fromRim) : 1 });
  }
  return out;
}

/* ---------- 표면 질감 만들기 (mode: raw · dry · bisque · glazed · done) ---------- */
const TW = 512, TH = 256;
async function compose(pc, mode, atmos = 'ox', seed = 1) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d');
  const img = g.createImageData(TW, TH), d = img.data, pr = profile(pc), R = rnd(seed), cl = CLAY[pc.clay] || CLAY.buff;
  const fired = mode === 'done' || mode === 'bisque' || mode === 'glazed';
  const base = hex(mode === 'raw' ? (pc.color || cl.dry) : mode === 'dry' ? cl.dry : mode === 'done' && atmos === 'red' ? cl.red : cl.fired);
  // 흙 바탕 + 점박이
  const rowLoc = []; for (let y = 0; y < TH; y++) rowLoc.push(locate(pr, 1 - (y + 0.5) / TH));   // 캔버스 위쪽 = 텍스처 v=1
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const i = (y * TW + x) * 4, n = (R() - 0.5) * 10; let col = [base[0] + n, base[1] + n, base[2] + n];
    if (cl.speck && fired && R() < 0.004 * cl.speck) col = shade(col, 0.55); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  // 그림(언더글레이즈): 구우면 살짝 진해짐
  const deco = await loadImg(pc.decor);
  if (deco) { g.save(); if (mode === 'done') { g.globalAlpha = 0.95; g.filter = 'saturate(1.15) brightness(0.92)'; } g.drawImage(deco, 0, 0, TW, TH); g.restore(); }
  if (mode !== 'glazed' && mode !== 'done') return c;
  // 유약
  const im2 = g.getImageData(0, 0, TW, TH), e = im2.data;
  const drip = new Float32Array(TW); for (let x = 0; x < TW; x++) drip[x] = R();
  const crack = mode === 'done' ? crackleMap(seed) : null;
  const yoBand = new Float32Array(TW); { let v = 0; for (let x = 0; x < TW; x++) { v = clamp(v + (R() - 0.5) * 0.25, 0, 1); yoBand[x] = v; } }
  const pcYo = mode === 'done' && pc.result && pc.result.yo;
  for (let y = 0; y < TH; y++) {
    const loc = rowLoc[y]; const layers = glazeAt(pc, loc);
    for (let x = 0; x < TW; x++) {
      const i = (y * TW + x) * 4; let col = [e[i], e[i + 1], e[i + 2]];
      let ls = layers;
      // 흘러내림: 두꺼우면 유약 선 아래로 줄줄
      if (!ls.length && loc.side === 'out' && pc.glaze && mode === 'done') {
        const fromRim = (pc.H - loc.h) / pc.H;
        for (const L of pc.glaze.layers) { const t = thickOf(L.sec); const run = t > 1.45 ? (t - 1.3) * 0.18 * drip[x] : 0; if (fromRim > L.depth && fromRim < L.depth + run) ls = [{ g: G[L.g], t: t * 0.7, edge: 0 }]; }
        if (pc.glaze.wax && loc.h < pc.H * 0.05) ls = [];
      }
      if (ls.length) {
        let tSum = 0, gc = null, op = 0, fin = 'gloss';
        for (const L of ls) { const cc = hex(mode === 'done' ? L.g[atmos] : L.g.raw); gc = gc ? mix(gc, cc, 0.55) : cc; tSum += L.t; op = Math.max(op, L.g.op); fin = L.g.fin; }
        if (mode === 'glazed') { col = mix(col, shade(gc, 1 + (R() - 0.5) * 0.06), clamp(0.55 + tSum * 0.3, 0, 0.95)); }
        else {
          const t = tSum, edge = Math.min(...ls.map(l => l.edge));
          let a = clamp(op * clamp(t, 0.3, 1.3) + (t < 0.45 ? -0.25 : 0), 0.05, 0.98);
          let gcol = gc; if (edge < 0.05 && loc.side === 'out') gcol = shade(gcol, 0.82);           // 유약 끝선에 고여 진해짐
          if (t > 1.2) gcol = shade(gcol, 1 - (t - 1.2) * 0.12);
          if (ls[0].g.id === 'tenmoku' && t < 0.8) gcol = mix(gcol, hex('#9a5a2a'), 0.6);            // 천목: 얇은 곳은 갈색
          if (fin === 'ash') gcol = mix(gcol, shade(gcol, 0.75), Math.abs(Math.sin(x * 0.09 + drip[x] * 6)) * 0.5);
          if (pcYo && ls[0].g.yo) gcol = mix(gcol, hex(ls[0].g.yo), yoBand[x] * 0.7);
          col = mix(col, gcol, a);
          if (fin === 'speckle' && R() < 0.012) col = mix(col, hex('#6a4a32'), 0.8);
          if (fin === 'crystal' && crack) { let best = 9; for (const [cx2, cy2, cr] of crack.seeds) { const d = Math.hypot(x - cx2, (y - cy2) * 2) / cr; if (d < best) best = d; } if (best < 1) col = mix(col, hex(ls[0].g.yo || '#ffffff'), 0.6 * (1 - best * best) * (0.75 + 0.25 * Math.cos(Math.atan2(y, x) * 12))); }
          if ((fin === 'crackle' || (t > 1.1 && ls[0].g.id === 'celadon')) && crack && crack.lines[y * TW + x]) col = shade(col, 0.72);
          if (t < 0.45) col = mix(col, shade(col, 0.9), R() * 0.5);                                   // 얇으면 거칠게
          col = shade(col, 1 + (R() - 0.5) * 0.04);
        }
      }
      e[i] = clamp(col[0], 0, 255); e[i + 1] = clamp(col[1], 0, 255); e[i + 2] = clamp(col[2], 0, 255);
    }
  }
  g.putImageData(im2, 0, 0);
  // 구운 뒤 결함 표시: 바늘구멍 · 말림
  if (mode === 'done' && pc.result) {
    const R2 = rnd(seed + 7);
    if (pc.result.pin) for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(60,50,40,.55)'; g.beginPath(); g.arc(R2() * TW, R2() * TH * 0.5, 0.9 + R2(), 0, 7); g.fill(); }
    if (pc.result.crawl) for (let k = 0; k < 10; k++) { g.fillStyle = `rgb(${base.join(',')})`; g.beginPath(); g.ellipse(R2() * TW, R2() * TH * 0.45, 4 + R2() * 8, 3 + R2() * 6, R2(), 0, 7); g.fill(); }
  }
  return c;
}
function crackleMap(seed) {
  const R = rnd(seed + 3), lines = new Uint8Array(TW * TH), crys = new Float32Array((TW >> 3) * (TH >> 3));
  const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d'); g.strokeStyle = '#000'; g.lineWidth = 1;
  for (let k = 0; k < 90; k++) { let x = R() * TW, y = R() * TH; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 5; s++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  const dd = g.getImageData(0, 0, TW, TH).data; for (let i = 0; i < TW * TH; i++) lines[i] = dd[i * 4 + 3] > 120 ? 1 : 0;
  const seeds = []; for (let i = 0; i < 26; i++) seeds.push([R() * TW, R() * TH, 10 + R() * 22]);
  return { lines, crys, seeds };
}
function finishOf(pc) {
  if (stageOf(pc) !== 'done' || !pc.glaze || !pc.glaze.layers.length) return { rough: 0.85, metal: 0 };
  const f = G[pc.glaze.layers[pc.glaze.layers.length - 1].g].fin;
  return f === 'matte' ? { rough: 0.8, metal: 0 } : f === 'metal' ? { rough: 0.35, metal: 0.55 } : f === 'ash' ? { rough: 0.45, metal: 0 } : { rough: 0.18, metal: 0.02 };
}
/* 그릇 메쉬: 바로 돌려주고 질감은 준비되면 입힘 */
const texCache = new Map();
function textureFor(pc) {
  const st = stageOf(pc);
  if (st === 'done' && pc.tex) { const key = pc.id + ':tex:' + pc.tex.length; if (!texCache.has(key)) texCache.set(key, loadImg(pc.tex).then(im => { if (!im) return null; const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; })); return texCache.get(key); }
  if (st === 'done' && !pc.glaze && !pc.decor) return Promise.resolve(null);                             // 예전 작품
  const key = pc.id + ':' + st + ':' + (pc.glaze ? pc.glaze.layers.length + (pc.glaze.wax ? 'w' : '') : '') + ':' + (pc.decorV || 0);
  if (!texCache.has(key)) texCache.set(key, compose(pc, st === 'broken' ? 'bisque' : st).then(cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }));
  return texCache.get(key);
}
function makeMesh(pc, scale = 1) {
  const st = stageOf(pc), fin = finishOf(pc);
  const mat = new THREE.MeshStandardMaterial({ color: pc.tex || pc.glaze || pc.decor || pc.stage ? '#ffffff' : (pc.color || '#cfa47c'), roughness: fin.rough, metalness: fin.metal, side: THREE.DoubleSide });
  if (pc.stage && !pc.tex && !pc.glaze && !pc.decor) mat.color.set(st === 'raw' ? (pc.color || CLAY[pc.clay]?.dry) : st === 'dry' ? CLAY[pc.clay]?.dry || '#cbbfae' : CLAY[pc.clay]?.fired || '#d9cfc0');
  const m = new THREE.Mesh(geometryOf(pc), mat); m.castShadow = true; m.scale.setScalar(scale);
  if (pc.tex || pc.glaze || pc.decor) textureFor(pc).then(t => { if (t) { mat.map = t; mat.color.set('#ffffff'); mat.needsUpdate = true; } });
  if (st === 'broken') { m.scale.y *= 0.55; m.rotation.z = 0.5; }
  return m;
}

/* ---------- 썸네일 (작은 3D 사진) ---------- */
let thumbR = null, thumbS, thumbC;
async function thumb(pc, size = 120) {
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.outputColorSpace = THREE.SRGBColorSpace;
    thumbS = new THREE.Scene(); thumbS.add(new THREE.HemisphereLight('#fff6e8', '#6a5a4a', 1.05)); const dl = new THREE.DirectionalLight('#ffffff', 1.25); dl.position.set(2, 4, 3); thumbS.add(dl);
    thumbC = new THREE.PerspectiveCamera(30, 1, 0.1, 50); }
  thumbR.setSize(size, size, false);
  const m = makeMesh(pc); const t = await textureFor(pc); if (t) { m.material.map = t; m.material.color.set('#ffffff'); m.material.needsUpdate = true; }
  thumbS.add(m); const H = pc.H || 1, R = Math.max(...pc.r); thumbC.position.set(0, H * 0.9 + 0.8, Math.max(H, R * 2) * 2.4 + 1); thumbC.lookAt(0, H * 0.42, 0);
  if (stageOf(pc) === 'broken') thumbC.lookAt(0, 0.2, 0);
  thumbR.render(thumbS, thumbC); const url = thumbR.domElement.toDataURL(); thumbS.remove(m); m.geometry.dispose(); m.material.dispose(); return url;
}

/* ---------- 공통 화면 틀 ---------- */
const css = document.createElement('style'); css.textContent = `
.cf{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;position:fixed;inset:0;z-index:30;background:#221e1b;color:#f3ebdf;font-family:inherit;display:flex;flex-direction:column}
.cf[hidden]{display:none}
.cf-top{display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 16px 10px;border-bottom:1px solid #ffffff14}
.cf-top h2{margin:0;font-size:17px;font-weight:700;flex:1}
.cf-go{padding:8px 14px;font-size:13px;white-space:nowrap}
.cf-x{border:1px solid #ffffff33;background:#3a3430;color:#f3ebdf;border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;cursor:pointer}
.cf-body{flex:1;min-height:0;display:flex;gap:14px;padding:14px;overflow:auto}
.cf-col{display:flex;flex-direction:column;gap:10px;min-width:0}
.cf-card{background:#2d2723;border:1px solid #ffffff12;border-radius:14px;padding:12px}
.cf-card h3{margin:0 0 8px;font-size:13px;color:#d8cbb9;font-weight:700}
.cf-btn{border:1px solid #ffffff2b;background:#3a3430;color:#f3ebdf;border-radius:999px;padding:10px 16px;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.cf-btn.pri{background:#f3ece2;color:#2f2925;border-color:#f3ece2}
.cf-btn:disabled{opacity:.4;cursor:default}
.cf-btn.on{transform:scale(.97);background:#e9c35a;color:#2b2420;border-color:#e9c35a}
.cf-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.cf-item{background:#38312c;border:2px solid transparent;border-radius:12px;padding:6px 4px 8px;text-align:center;cursor:pointer;font:inherit;color:#e9dfd1}
.cf-item img{width:72px;height:72px;display:block;margin:0 auto}
.cf-item b{display:block;font-size:12px}.cf-item small{display:block;font-size:10.5px;color:#b8aa98;line-height:1.3}
.cf-item.sel{border-color:#e9c35a}.cf-item.off{opacity:.38;cursor:default}
.cf-note{font-size:12.5px;color:#cfc2b0;line-height:1.55}
.cf-steps{display:flex;gap:6px;flex-wrap:wrap}.cf-steps span{font-size:12px;padding:5px 10px;border-radius:999px;background:#3a3430;color:#cdbfad}.cf-steps span.on{background:#f3ece2;color:#2f2925;font-weight:700}.cf-steps span.done{background:#3f5a43;color:#cfe8cf}
.cf-toast{position:absolute;left:50%;top:80px;transform:translateX(-50%);background:#2b2420f0;border:1px solid #e9c35a;color:#ffe2a6;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:700;pointer-events:none;transition:opacity .3s;z-index:5}
@media (max-width:760px){.cf-body{flex-direction:column}.cf-top .cf-go{order:4;flex-basis:100%;padding:11px}.cf-top{flex-wrap:wrap;row-gap:8px}.cf-top h2{flex:1 1 60%;font-size:16px}.cf-top .cf-steps{order:3;flex-basis:100%}.cf-top .cf-steps span{font-size:11.5px;padding:4px 8px}.cf-x{padding:7px 12px}#dcWrap [data-r],#dcWrap #spin,#dcWrap #tilt{padding:7px 11px;font-size:12px}.cf-side{width:100%!important}}
`; document.head.appendChild(css);
let active = null;
function open(id, html) { let el = $('#' + id); if (!el) { el = document.createElement('div'); el.id = id; el.className = 'cf'; document.body.appendChild(el); } el.innerHTML = html; el.hidden = false; active = id; el.oncontextmenu = e => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); };
  el.querySelectorAll('.cf-go').forEach(b => b.onclick = () => { const t = el.querySelector(b.dataset.go);
    if (t && !t.disabled) return t.click();
    if (b.dataset.alt) return toast(el, '왁스를 다 바르거나, 아래 \'건너뛰기\'를 눌러요');
    toast(el, b.dataset.go === '#done' ? '유약통에 한 번 이상 담가야 완성할 수 있어요' : '잠깐만요'); });
  return el; }
function closeAll() { document.querySelectorAll('.cf').forEach(e => e.hidden = true); active = null; }
function toast(el, text, ms = 1800) { const t = document.createElement('div'); t.className = 'cf-toast'; t.textContent = text; el.appendChild(t); setTimeout(() => t.style.opacity = 0, ms); setTimeout(() => t.remove(), ms + 400); }
async function fillThumbs(root) { for (const im of root.querySelectorAll('img[data-pid]')) { const pc = loadPieces().find(p => String(p.id) === im.dataset.pid); if (pc) im.src = await thumb(pc); } }

/* =====================================================================
   가마
   ===================================================================== */
const KILN_KEY = 'heukmaru-kiln';
function kilnState() { try { return JSON.parse(localStorage.getItem(KILN_KEY)) || { phase: 'idle', slots: Array(12).fill(null) }; } catch { return { phase: 'idle', slots: Array(12).fill(null) }; } }
function saveKiln(k) { try { localStorage.setItem(KILN_KEY, JSON.stringify(k)); } catch {} }
function kilnInfo() { const k = kilnState(); if (k.phase === 'firing') { const left = Math.ceil((k.start + FIRE_MS - Date.now()) / 1000); return left > 0 ? { phase: 'firing', left } : { phase: 'done' }; } return { phase: k.phase }; }
const SLOT_POS = i => ({ shelf: i < 6 ? 0 : 1, c: i % 3, r: Math.floor((i % 6) / 3) });
const touching = (k, pcs) => {          // 재벌: 옆 칸 그릇과 닿는지 (지름이 크면 닿음)
  const pairs = [];
  for (let i = 0; i < 12; i++) for (const j of [i + 1, i + 3]) { if (j >= 12) continue; const a = SLOT_POS(i), b = SLOT_POS(j); if (a.shelf !== b.shelf || (j === i + 1 && a.r !== b.r)) continue;
    const pa = pcs[k.slots[i]], pb = pcs[k.slots[j]]; if (pa && pb && Math.max(...pa.r) + Math.max(...pb.r) > 1.02) pairs.push([i, j]); }
  return pairs;
};
let kilnTimer = null, kilnCtl = null;
function openKiln(opts = {}) {
  const k = kilnState(); const info = kilnInfo();
  if (info.phase === 'firing' || (k.phase === 'firing' && info.phase === 'done')) return firingView(opts);
  if (k.phase === 'opened') { k.phase = 'idle'; k.slots = Array(12).fill(null); saveKiln(k); }
  loadView(opts);
}
function loadView(opts) {
  const k = kilnState(); const list = loadPieces(); const byId = Object.fromEntries(list.map(p => [p.id, p]));
  k.slots = k.slots.map(id => byId[id] && ['dry', 'glazed'].includes(stageOf(byId[id])) ? id : null);
  const loaded = k.slots.filter(Boolean).map(id => byId[id]);
  const kind = loaded.length ? (stageOf(loaded[0]) === 'dry' ? 'bisque' : 'glaze') : null;
  const el = open('cfKiln', `
  <div class="cf-top"><h2>🔥 가마 넣기</h2><button class="cf-x" data-a="x">나가기</button></div>
  <div class="cf-body">
    <div class="cf-col" style="flex:1.1">
      <div class="cf-card"><h3>가마 안 (위에서 본 모습) · 칸을 누르면 빼요</h3><canvas id="kilnCv" width="560" height="300" style="width:100%;border-radius:12px;background:#1a1613"></canvas>
      <div class="cf-note" id="kilnWarn" style="margin-top:6px"></div></div>
      <div class="cf-card" id="kilnOpts"></div>
    </div>
    <div class="cf-col" style="flex:1">
      <div class="cf-card"><h3>넣을 수 있는 그릇 · 누르면 빈 칸에 들어가요</h3><div class="cf-list" id="kilnList"></div>
      <div class="cf-note" style="margin-top:8px">초벌: 건조실에서 굽을 깎고 30초 말린 그릇 · 재벌: 시유실에서 유약 바른 그릇. 초벌과 재벌은 섞어 넣을 수 없어요.</div></div>
    </div>
  </div>`);
  const cv = $('#kilnCv', el), g = cv.getContext('2d'); const imgs = {};
  const slotXY = i => { const s = SLOT_POS(i); return [30 + s.shelf * 270 + s.c * 80 + 40, 60 + s.r * 110 + 50]; };
  async function draw() {
    g.clearRect(0, 0, cv.width, cv.height);
    for (let sh = 0; sh < 2; sh++) { g.fillStyle = '#3a2e27'; g.beginPath(); g.roundRect(20 + sh * 270, 30, 260, 250, 18); g.fill(); g.fillStyle = '#cfc4b4'; g.font = '700 13px system-ui'; g.fillText(sh ? '아래 선반' : '위 선반', 32 + sh * 270, 22); }
    const pairs = kind === 'glaze' ? touching(k, byId) : [];
    for (const [a, b] of pairs) { const [x1, y1] = slotXY(a), [x2, y2] = slotXY(b); g.strokeStyle = '#e2683f'; g.lineWidth = 6; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    for (let i = 0; i < 12; i++) { const [x, y] = slotXY(i), id = k.slots[i];
      g.strokeStyle = '#ffffff22'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 34, 0, 7); g.stroke(); g.setLineDash([]);
      if (id) { const pc = byId[id]; const rr = 22 + Math.max(...pc.r) * 26; if (!imgs[id]) { imgs[id] = new Image(); imgs[id].src = await thumb(pc, 120); await imgs[id].decode().catch(() => {}); }
        g.drawImage(imgs[id], x - rr, y - rr, rr * 2, rr * 2); } }
    $('#kilnWarn', el).innerHTML = pairs.length ? `⚠️ 빨간 줄로 이어진 그릇은 서로 닿아요. 재벌 때 유약이 녹아 붙어 버려요. 칸을 띄워 주세요.` : kind === 'glaze' ? '✅ 그릇끼리 떨어져 있어요.' : kind === 'bisque' ? '초벌은 그릇끼리 닿아도 괜찮아요.' : '';
  }
  function renderList() {
    const items = list.filter(p => ['raw', 'drying', 'dry', 'glazed'].includes(stageOf(p)) && !k.slots.includes(p.id) && p.place !== 'carry');
    $('#kilnList', el).innerHTML = items.length ? items.map(p => { const st = stageOf(p), ok = st !== 'raw' && st !== 'drying' && (!kind || (kind === 'bisque' ? st === 'dry' : st === 'glazed'));
      return `<button class="cf-item ${ok ? '' : 'off'}" data-id="${p.id}"><img data-pid="${p.id}" alt=""><b>${p.clayName || ''} ${p.name}</b><small>${st === 'raw' ? '🔪 굽깎기 먼저 (건조실)' : st === 'drying' ? `말리는 중 ${dryLeft(p)}초` : st === 'dry' ? '초벌 대기' : '재벌 대기'}</small></button>`; }).join('') : '<div class="cf-note">넣을 그릇이 없어요. 물레실에서 빚거나, 초벌한 그릇은 시유실에서 유약을 발라 오세요.</div>';
    fillThumbs($('#kilnList', el));
    $('#kilnList', el).querySelectorAll('.cf-item').forEach(b => b.onclick = () => { if (b.classList.contains('off')) return toast(el, (t => t.includes('굽깎기') ? '🌬 건조실에서 굽을 먼저 깎아야 가마에 넣을 수 있어요' : t.includes('말리는') ? '굽 깎은 그릇이 아직 마르는 중이에요' : '초벌과 재벌은 따로 구워요')(b.querySelector('small').textContent)); const i = k.slots.indexOf(null); if (i < 0) return toast(el, '가마가 꽉 찼어요'); k.slots[i] = +b.dataset.id; saveKiln(k); loadView(opts); });
  }
  cv.onclick = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
    for (let i = 0; i < 12; i++) { const [sx, sy] = slotXY(i); if (Math.hypot(x - sx, y - sy) < 36 && k.slots[i]) { k.slots[i] = null; saveKiln(k); return loadView(opts); } } };
  const o = $('#kilnOpts', el); k.atmos = k.atmos || 'ox'; k.mode = k.mode || 'easy';
  o.innerHTML = kind ? `<h3>${kind === 'bisque' ? '초벌 · 약 800°C' : '재벌 · 약 1250°C'} · 굽는 시간 20초</h3>
    ${kind === 'glaze' ? `<div class="cf-steps" style="margin-bottom:8px"><span data-at="ox" class="${k.atmos === 'ox' ? 'on' : ''}" style="cursor:pointer">🔥 산화 (공기 충분)</span><span data-at="red" class="${k.atmos === 'red' ? 'on' : ''}" style="cursor:pointer">🌫️ 환원 (공기 줄이기)</span></div>
    <div class="cf-note" style="margin-bottom:8px">같은 유약도 색이 달라져요. 예) 청자유: 산화 누르스름 → 환원 맑은 비취색 · 진사유: 산화 초록 → 환원 붉은색. 환원에서는 드물게 요변(신비한 색 번짐)이 생겨요.</div>` : '<div class="cf-note" style="margin-bottom:8px">처음엔 천천히 데워 그릇 속 물기를 빼야 터지지 않아요.</div>'}
    <div class="cf-steps" style="margin-bottom:10px"><span data-md="easy" class="${k.mode === 'easy' ? 'on' : ''}" style="cursor:pointer">쉬움 · 자동 불 조절</span><span data-md="real" class="${k.mode === 'real' ? 'on' : ''}" style="cursor:pointer">실전 · 내가 불 조절</span></div>
    <button class="cf-btn pri" data-a="fire" ${kind === 'glaze' && touching(k, byId).length ? 'disabled' : ''}>불 때기 (20초)</button>`
    : '<h3>그릇을 넣어 주세요</h3><div class="cf-note">\'넣을 수 있는 그릇\' 목록에서 그릇을 누르면 가마에 들어가요.</div>';
  o.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { k.atmos = b.dataset.at; saveKiln(k); loadView(opts); });
  o.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { k.mode = b.dataset.md; saveKiln(k); loadView(opts); });
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
  const fire = el.querySelector('[data-a="fire"]'); if (fire) fire.onclick = () => { k.phase = 'firing'; k.kind = kind; k.start = Date.now(); k.ctl = { over: 0, reduced: kind === 'glaze' && k.atmos === 'red' && k.mode === 'easy', reduceAt: 0, dev: 0, n: 0 }; saveKiln(k); firingView(opts); };
  draw(); renderList();
  clearInterval(kilnTimer); kilnTimer = setInterval(() => { if (active !== 'cfKiln' || !$('#kilnList')) return clearInterval(kilnTimer); if (list.some(p => stageOf(p) === 'drying')) renderList(); }, 3000);
}
/* 온도 목표 곡선 (0~1 시간 → °C) */
function targetT(kind, u) { const top = kind === 'bisque' ? 800 : 1250; if (kind === 'bisque') return u < 0.3 ? 20 + u / 0.3 * 180 : 200 + (u - 0.3) / 0.6 * (top - 200) * (u < 0.9 ? 1 : 0) + (u >= 0.9 ? top - 200 : 0); return u < 0.15 ? 20 + u / 0.15 * 280 : u < 0.9 ? 300 + (u - 0.15) / 0.75 * (top - 300) : top; }
function firingView(opts) {
  const k = kilnState();
  const el = open('cfKiln', `
  <div class="cf-top"><h2>🔥 ${k.kind === 'bisque' ? '초벌' : '재벌'} 굽는 중 ${k.kind === 'glaze' ? (k.atmos === 'red' ? '· 환원' : '· 산화') : ''}</h2><button class="cf-x" data-a="x">${k.mode === 'real' ? '나가기 (자동으로 계속)' : '나가서 기다리기'}</button></div>
  <div class="cf-body"><div class="cf-col" style="flex:1">
    <div class="cf-card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <canvas id="peep" width="200" height="200" style="width:150px;border-radius:50%"></canvas>
      <div style="flex:1;min-width:220px"><div style="font-size:34px;font-weight:800" id="tNow">20°C</div><div class="cf-note" id="tLeft"></div>
      <div id="ctl" style="margin-top:10px"></div></div></div>
    <div class="cf-card"><h3>온도 그래프 · 노란 띠 = 알맞은 온도</h3><canvas id="graph" width="640" height="220" style="width:100%;background:#1a1613;border-radius:10px"></canvas></div>
    <div id="openArea"></div>
  </div></div>`);
  const real = k.mode === 'real' && k.kind;
  let heat = 0.5; const ctl = $('#ctl', el);
  if (real) { ctl.innerHTML = `<div class="cf-note">불 세기</div><input type="range" min="0" max="100" value="50" id="heat" style="width:100%">${k.kind === 'glaze' && k.atmos === 'red' ? '<button class="cf-btn" id="redBtn" style="margin-top:8px">🌫️ 환원 시작 (950~1050°C 사이에)</button>' : ''}`;
    $('#heat', el).oninput = e => heat = e.target.value / 100;
    const rb = $('#redBtn', el); if (rb) rb.onclick = () => { const T = k.ctl.temp || 0; k.ctl.reduced = T >= 900 && T <= 1100; k.ctl.reduceAt = T; rb.disabled = true; rb.textContent = k.ctl.reduced ? '✅ 환원 성공' : '⚠️ 때를 놓쳤어요 (산화로 구워져요)'; saveKiln(k); }; }
  else ctl.innerHTML = `<div class="cf-note">${k.mode === 'real' ? '' : '불 조절은 자동이에요. 나가서 다른 방을 둘러봐도 계속 구워져요.'}</div>`;
  const pv = $('#peep', el).getContext('2d'), gr = $('#graph', el).getContext('2d'); const hist = k.hist || [];
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
  let T = k.ctl.temp || 20, lastU = 0, lastMs = performance.now();
  const step = () => {
    if (active !== 'cfKiln' || !$('#graph')) return;
    const nowMs = performance.now(), dtk = Math.min(0.2, (nowMs - lastMs) / 1000); lastMs = nowMs;
    const kk = kilnState(); const u = clamp((Date.now() - kk.start) / FIRE_MS, 0, 1), tgt = targetT(kk.kind, u);
    if (real && u < 1) { T = lerp(T, lerp(20, kk.kind === 'bisque' ? 1000 : 1400, heat), 1 - Math.exp(-dtk * 1.8)); const dv = (T - tgt) / 100; kk.ctl.n++; kk.ctl.dev += Math.abs(dv); if (u < 0.35 && T > tgt + 90) kk.ctl.over = Math.max(kk.ctl.over, (T - tgt - 90) / 200); }
    else T = lerp(T, tgt, 1 - Math.exp(-dtk * 12));
    kk.ctl.temp = T; if (u - lastU > 0.01) { hist.push([u, T]); lastU = u; kk.hist = hist; } saveKiln(kk); k.ctl = kk.ctl;
    // 엿보는 구멍
    const glow = clamp((T - 300) / 1000, 0, 1); pv.fillStyle = '#2a201b'; pv.fillRect(0, 0, 200, 200); const rg = pv.createRadialGradient(100, 100, 10, 100, 100, 95);
    rg.addColorStop(0, `rgb(${255},${lerp(120, 240, glow)},${lerp(40, 160, glow)})`); rg.addColorStop(1, `rgba(${lerp(60, 230, glow)},${lerp(30, 90, glow)},20,${0.2 + glow * 0.8})`); pv.fillStyle = rg; pv.beginPath(); pv.arc(100, 100, 92, 0, 7); pv.fill();
    $('#tNow', el).textContent = Math.round(T) + '°C'; $('#tLeft', el).textContent = u < 1 ? `남은 시간 ${Math.ceil((1 - u) * FIRE_MS / 1000)}초` : '다 구워졌어요! 가마를 열어 볼까요?';
    // 그래프
    const W = 640, Hh = 220, X = v => 30 + v * (W - 50), Y = t => Hh - 20 - t / 1450 * (Hh - 40); gr.clearRect(0, 0, W, Hh);
    gr.strokeStyle = 'rgba(233,195,90,.35)'; gr.lineWidth = 18; gr.beginPath(); for (let i = 0; i <= 50; i++) { const v = i / 50; i ? gr.lineTo(X(v), Y(targetT(kk.kind, v))) : gr.moveTo(X(v), Y(targetT(kk.kind, v))); } gr.stroke();
    gr.strokeStyle = '#ff8a4a'; gr.lineWidth = 3; gr.beginPath(); hist.forEach(([v, t], i) => i ? gr.lineTo(X(v), Y(t)) : gr.moveTo(X(v), Y(t))); gr.stroke();
    gr.fillStyle = '#cfc4b4'; gr.font = '12px system-ui'; [0, 400, 800, 1200].forEach(t => gr.fillText(t + '°', 2, Y(t) + 4));
    if (kk.kind === 'glaze' && kk.atmos === 'red') { gr.fillStyle = 'rgba(120,160,220,.25)'; const a = X(lerp(0.15, 0.9, (950 - 300) / 950)), b = X(lerp(0.15, 0.9, (1050 - 300) / 950)); gr.fillRect(a, 0, b - a, Hh); }
    if (u >= 1) { const oa = $('#openArea', el); if (!oa.innerHTML) { oa.innerHTML = `<button class="cf-btn pri" id="openBtn" style="width:100%;padding:16px;font-size:17px">🔥 가마 열기!</button>`; $('#openBtn', el).onclick = () => openResult(opts); } }
    else requestAnimationFrame(step);
  };
  step();
}
/* 결과 계산: 앞 단계의 행동으로 정해짐 (같은 그릇이면 같은 결과가 나오게 id로 씨앗) */
function judge(pc, k, byId, touchSet) {
  const R = rnd(pc.id % 100000 + (k.kind === 'glaze' ? 77 : 11)); const res = { ok: true, msgs: [], yo: false };
  if (k.kind === 'bisque') {
    const tr = pc.trim || {}; const weak = (pc.score < 45 ? 0.3 : pc.score < 60 ? 0.1 : 0.02) + (tr.score < 50 ? 0.15 : tr.score < 70 ? 0.05 : 0) + (tr.wet === 'hard' ? 0.1 : 0) + Math.min(0.2, tr.crack || 0); const fast = (k.ctl.over || 0) * 0.9;
    if (R() < weak + fast) { res.ok = false; res.broken = true; res.msgs.push(fast > 0.2 ? '💥 처음에 너무 빨리 데워서 물기 때문에 터졌어요' : (tr.wet === 'hard' ? '💥 너무 마른 뒤에 깎아서 생긴 금이 터졌어요' : tr.score < 60 ? '💥 굽깎기가 고르지 않아 두꺼운 곳에서 금이 갔어요' : '💥 벽 두께가 고르지 않아 금이 가 깨졌어요')); }
    else res.msgs.push('✅ 초벌 완료! 이제 시유실에서 꾸미고 유약을 발라요');
    return res;
  }
  const L = pc.glaze.layers, th = L.map(l => thickOf(l.sec)).sort((a, b) => b - a), t = th.length ? th[0] + th.slice(1).reduce((s, v) => s + v * 0.3, 0) : 0;
  const footGlazed = L.some(l => l.depth >= 0.995) && !pc.glaze.wax;
  if (touchSet.has(pc.id)) { res.ok = false; res.msgs.push('🔗 옆 그릇과 닿아서 유약이 녹아 붙었어요'); res.stuck = true; }
  if (footGlazed) { res.ok = false; res.msgs.push('🫠 굽(바닥)까지 유약이 묻어 선반에 붙었어요. 다음엔 굽에 왁스를!'); res.stuck = true; }
  if (t > 1.75) { res.msgs.push('🫠 유약이 두꺼워 아래로 흘러내렸어요 (2~3초가 알맞아요)'); if (!pc.glaze.wax && R() < 0.5) { res.stuck = true; res.ok = false; } }
  else if (t > 1.4 && R() < 0.4) { res.crawl = true; res.msgs.push('🌀 유약이 조금 말려 들어갔어요 (조금 두꺼웠어요)'); }
  if (t < 0.45) res.msgs.push('🪨 유약이 얇아서 거칠게 나왔어요');
  if (R() < 0.08 + (t > 1.2 ? 0.1 : 0)) { res.pin = true; res.msgs.push('🕳️ 작은 바늘구멍이 생겼어요'); }
  const red = k.atmos === 'red' && (k.ctl.reduced || k.mode === 'easy');
  if (red && t >= 0.6 && t <= 1.45 && L.some(l => G[l.g].yo) && R() < 0.22) { res.yo = true; res.msgs.unshift('✨ 요변! 가마 속에서 신비한 색이 번졌어요'); }
  if (k.atmos === 'red' && k.mode === 'real' && !k.ctl.reduced) res.msgs.push('⚠️ 환원 시작을 놓쳐서 산화로 구워졌어요');
  if (res.ok && !res.msgs.length) res.msgs.push('✅ 잘 구워졌어요!');
  res.atmos = red ? 'red' : 'ox'; return res;
}
async function openResult(opts) {
  const k = kilnState(); if (k.phase !== 'firing') return openKiln(opts);
  const list = loadPieces(), byId = Object.fromEntries(list.map(p => [p.id, p])); const ids = k.slots.filter(id => byId[id]);
  const touchSet = new Set(); if (k.kind === 'glaze') for (const [a, b] of touching(k, byId)) { touchSet.add(k.slots[a]); touchSet.add(k.slots[b]); }
  const results = [];
  for (const id of ids) { const pc = byId[id]; const res = judge(pc, k, byId, touchSet); results.push([id, res]);
    if (k.kind === 'bisque') { pc.stage = res.broken ? 'broken' : 'bisque'; pc.bisqueAt = Date.now(); }
    else { pc.stage = 'done'; pc.result = { yo: res.yo, pin: res.pin, crawl: res.crawl, stuck: res.stuck, atmos: res.atmos, msgs: res.msgs };
      const cv = await compose(pc, 'done', res.atmos, pc.id % 9999); pc.tex = cv.toDataURL('image/webp', 0.86); if (pc.tex.length < 100) pc.tex = cv.toDataURL('image/jpeg', 0.86);
      if (res.stuck) pc.stars = Math.max(1, (pc.stars || 1) - 1); pc.color = '#ffffff'; delete pc.decor; } }
  savePieces(list); k.phase = 'opened'; k.slots = Array(12).fill(null); k.hist = []; saveKiln(k);
  const el = open('cfKiln', `<div class="cf-top"><h2>🔥 가마를 열었어요</h2><button class="cf-x" data-a="x">닫기</button></div>
    <div class="cf-body"><div class="cf-col" style="flex:1"><div class="cf-list" id="resList" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))"></div>
    <div class="cf-note">${k.kind === 'bisque' ? '초벌한 그릇은 🎨 시유실에서 꾸미고 유약을 발라요.' : '완성한 그릇은 전시관에 놓거나 물레실 작업대에 둘 수 있어요.'}</div></div></div>`);
  const box = $('#resList', el);
  for (const [id, res] of results) { const pc = loadPieces().find(p => p.id === id); const card = document.createElement('div'); card.className = 'cf-item'; card.style.cssText = 'cursor:default;opacity:0;transform:rotateY(90deg);transition:.45s;padding:10px';
    card.innerHTML = `<img alt="" style="width:120px;height:120px"><b>${pc.clayName || ''} ${pc.name}</b><small style="text-align:left;margin-top:6px">${res.msgs.join('<br>')}</small>`; box.appendChild(card);
    card.querySelector('img').src = await thumb(pc, 200); await new Promise(r => setTimeout(r, 120)); card.style.opacity = 1; card.style.transform = 'none'; await new Promise(r => setTimeout(r, 450)); }
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
}

/* =====================================================================
   시유실: ① 꾸미기 → ② 굽 왁스 → ③ 집게로 유약 담그기
   ===================================================================== */
let G3 = null;          // 꾸미기용 3D
function openGlaze(opts = {}) {
  const list = loadPieces().filter(p => stageOf(p) === 'bisque' && p.place !== 'carry');
  const el = open('cfGlaze', `<div class="cf-top"><h2>🎨 시유실 · 꾸미기와 유약</h2><button class="cf-x" data-a="x">나가기</button></div>
    <div class="cf-body"><div class="cf-col" style="flex:1"><div class="cf-card"><h3>초벌한 그릇 고르기</h3><div class="cf-list" id="gzList"></div>
    <div class="cf-note" style="margin-top:8px">그릇 순서: 물레로 빚기 → 🔪 굽깎기 → 30초 말리기 → 🔥 가마에서 초벌 → 여기서 꾸미기·유약 → 🔥 가마에서 재벌</div></div></div></div>`);
  $('#gzList', el).innerHTML = list.length ? list.map(p => `<button class="cf-item" data-id="${p.id}"><img data-pid="${p.id}" alt=""><b>${p.clayName || ''} ${p.name}</b><small>${p.decor ? '그림 있음' : '초벌 완료'}</small></button>`).join('') : '<div class="cf-note">초벌한 그릇이 없어요. 🔥 가마실에서 마른 그릇을 초벌해 오세요.</div>';
  fillThumbs(el);
  $('#gzList', el).querySelectorAll('.cf-item').forEach(b => b.onclick = () => decorate(+b.dataset.id, opts));
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
}
const STEP_BAR = s => `<div class="cf-steps">${['① 꾸미기', '② 굽 왁스', '③ 유약 담그기'].map((t, i) => `<span class="${i === s ? 'on' : ''}">${t}</span>`).join('')}</div>`;
/* ① 꾸미기: 돌림판 위 그릇에 색연필 · 크레파스 · 물감으로 직접 그리기 */
function decorate(id, opts) {
  const pc = loadPieces().find(p => p.id === id); if (!pc) return openGlaze(opts);
  const el = open('cfGlaze', `<div class="cf-top"><h2>🖍️ 꾸미기 · ${pc.clayName || ''} ${pc.name}</h2>${STEP_BAR(0)}<button class="cf-btn pri cf-go" data-go="#next">다 그렸어요 · 유약 바르기 →</button><button class="cf-x" data-a="x">나가기</button></div>
    <div class="cf-body" style="padding:0;gap:0;position:relative"><div style="flex:1;position:relative;min-height:320px" id="dcWrap"><canvas id="dcCv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas>
      <div style="position:absolute;left:12px;bottom:12px;display:flex;gap:6px;flex-wrap:wrap"><button class="cf-btn" data-r="-1">◀ 돌리기</button><button class="cf-btn" data-r="1">돌리기 ▶</button><button class="cf-btn" id="spin">🌀 돌림판 켜기</button><button class="cf-btn" id="tilt">🔄 위에서 보기</button></div></div>
    <div class="cf-col cf-side" style="width:min(330px,100%);padding:14px;overflow:auto;background:#2a2420">
      <div class="cf-card"><h3>도구 · 구워도 남는 도자기용</h3><div class="cf-steps" id="tools"><span data-t="pencil" class="on" style="cursor:pointer">✏️ 색연필</span><span data-t="crayon" style="cursor:pointer">🖍️ 크레파스</span><span data-t="paint" style="cursor:pointer">🖌️ 물감</span><span data-t="erase" style="cursor:pointer">🧽 지우개</span></div>
      <div class="cf-note" style="margin:8px 0 4px">굵기</div><input type="range" id="size" min="1" max="10" value="4" style="width:100%"></div>
      <div class="cf-card"><h3>색</h3><div id="pal" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px"></div></div>
      <div class="cf-card"><div class="cf-note">그릇을 문지르듯 그려요. 돌림판을 켜고 붓을 대고 있으면 한 바퀴 띠가 그려져요. 그림은 유약 아래에 남아서 투명유·청자유처럼 비치는 유약일수록 잘 보여요.</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="cf-btn" id="undo">↩ 되돌리기</button><button class="cf-btn" id="clear">처음부터</button></div></div>
      <button class="cf-btn pri" id="next" style="width:100%;padding:14px">다음 · 굽 왁스 →</button>
    </div></div>`);
  el.querySelector('[data-a="x"]').onclick = () => { stop3(); closeAll(); opts.onExit && opts.onExit(); };
  // 3D
  const cv = $('#dcCv', el), wrap = $('#dcWrap', el);
  const R3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); R3.outputColorSpace = THREE.SRGBColorSpace; R3.setPixelRatio(Math.min(2, devicePixelRatio));
  const S3 = new THREE.Scene(); S3.background = new THREE.Color('#2b2522'); S3.add(new THREE.HemisphereLight('#fff6e8', '#5a4a3a', 0.95)); const dl = new THREE.DirectionalLight('#ffffff', 1.15); dl.position.set(2, 4, 4); S3.add(dl);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const wheelM = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#8a8580', roughness: 0.5, metalness: 0.4 })); wheelM.position.y = -0.06; S3.add(wheelM);
  // 그림판 캔버스 (UV와 같은 공간)
  const DW = 1024, DH = 512, dc = document.createElement('canvas'); dc.width = DW; dc.height = DH; const dg = dc.getContext('2d');
  const baseC = document.createElement('canvas'); baseC.width = DW; baseC.height = DH;
  const view = document.createElement('canvas'); view.width = DW; view.height = DH; const vg = view.getContext('2d');
  const tex = new THREE.CanvasTexture(view); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const geo = geometryOf(pc, 96), mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide })); S3.add(mesh);
  compose({ ...pc, decor: null }, 'bisque').then(c => { baseC.getContext('2d').drawImage(c, 0, 0, DW, DH); refresh(); });
  if (pc.decor) loadImg(pc.decor).then(im => { if (im) { dg.drawImage(im, 0, 0, DW, DH); refresh(); } });
  function refresh() { vg.drawImage(baseC, 0, 0); vg.drawImage(dc, 0, 0); tex.needsUpdate = true; }
  const H = pc.H, Rm = Math.max(...pc.r); let ang = 0.6, top = false, spin = false;
  function size() { const w = wrap.clientWidth, h = wrap.clientHeight; R3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  // 도구 · 색
  let tool = 'pencil', color = DECOR_COLORS[0];
  $('#pal', el).innerHTML = DECOR_COLORS.map((c, i) => `<button data-c="${c}" style="aspect-ratio:1;border-radius:50%;border:3px solid ${i ? 'transparent' : '#e9c35a'};background:${c};box-shadow:inset 0 0 0 1px #ffffff40;cursor:pointer" aria-label="색 ${i + 1}"></button>`).join('');
  $('#pal', el).querySelectorAll('button').forEach(b => b.onclick = () => { color = b.dataset.c; $('#pal', el).querySelectorAll('button').forEach(x => x.style.borderColor = 'transparent'); b.style.borderColor = '#e9c35a'; if (tool === 'erase') setTool('pencil'); });
  const setTool = t => { tool = t; $('#tools', el).querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.t === t)); };
  $('#tools', el).querySelectorAll('span').forEach(s => s.onclick = () => setTool(s.dataset.t));
  el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { ang += +b.dataset.r * 0.6; });
  $('#spin', el).onclick = e => { spin = !spin; e.target.classList.toggle('on', spin); e.target.textContent = spin ? '🌀 돌림판 끄기' : '🌀 돌림판 켜기'; };
  $('#tilt', el).onclick = e => { top = !top; e.target.textContent = top ? '🔄 옆에서 보기' : '🔄 위에서 보기'; };
  const undoStack = []; const snap = () => { undoStack.push(dg.getImageData(0, 0, DW, DH)); if (undoStack.length > 20) undoStack.shift(); };
  $('#undo', el).onclick = () => { const s = undoStack.pop(); if (s) { dg.putImageData(s, 0, 0); refresh(); } };
  $('#clear', el).onclick = () => { snap(); dg.clearRect(0, 0, DW, DH); refresh(); };
  // 붓질
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let drawing = false, last = null, pointer = null;
  const hitUV = (cx, cy) => { const r = cv.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const h = ray.intersectObject(mesh)[0]; return h ? h.uv : null; };
  const prD = geo.userData.pr;
  function dab(u, v) { const x = u * DW; dab1(x, u, v); if (x < 60) dab1(x + DW, u, v); if (x > DW - 60) dab1(x - DW, u, v); }
  function dab1(x, u, v) {
    const y = (1 - v) * DH, s = +$('#size', el).value, loc = locate(prD, v);
    const kx = DW / (Math.PI * 2 * Math.max(0.06, loc.r)), ky = DH / prD.S, b = 0.006 + s * 0.006;   // 붓 크기 = 실제 그릇 위 크기
    dg.save(); dg.setTransform(kx, 0, 0, ky, x, y);
    if (tool === 'erase') { dg.globalCompositeOperation = 'destination-out'; dg.beginPath(); dg.arc(0, 0, b * 1.6, 0, 7); dg.fill(); dg.restore(); return; }
    dg.fillStyle = color;
    if (tool === 'pencil') { dg.globalAlpha = 0.85; dg.beginPath(); dg.arc(0, 0, b * 0.45, 0, 7); dg.fill(); for (let k = 0; k < 5; k++) { dg.globalAlpha = Math.random() * 0.5; const a = Math.random() * 7, r = b * (0.4 + Math.random() * 0.3); dg.fillRect(Math.cos(a) * r, Math.sin(a) * r, b * 0.25, b * 0.25); } }
    else if (tool === 'crayon') { for (let k = 0; k < 26; k++) { if (Math.random() < 0.25) continue; dg.globalAlpha = 0.8; const a = Math.random() * 7, r = Math.sqrt(Math.random()) * b * 1.3; dg.fillRect(Math.cos(a) * r, Math.sin(a) * r, b * 0.35, b * 0.22); } }
    else { const rr = b * 2.2, gr = dg.createRadialGradient(0, 0, 0, 0, 0, rr); gr.addColorStop(0, color + '40'); gr.addColorStop(0.7, color + '26'); gr.addColorStop(1, color + '00'); dg.fillStyle = gr; dg.beginPath(); dg.arc(0, 0, rr, 0, 7); dg.fill(); }
    dg.restore();
  }
  function strokeTo(uv) {
    if (!uv) { last = null; return; }
    if (last) { let du = uv.x - last.x; if (du > 0.5) du -= 1; if (du < -0.5) du += 1; const dv = uv.y - last.y, n = Math.ceil(Math.hypot(du * DW, dv * DH) / 2.5);
      if (n < 200) for (let i = 1; i <= n; i++) { let u = last.x + du * i / n; u = (u + 1) % 1; dab(u, last.y + dv * i / n); } }
    else dab(uv.x, uv.y);
    last = uv.clone(); refresh();
  }
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); drawing = true; snap(); last = null; pointer = [e.clientX, e.clientY]; strokeTo(hitUV(e.clientX, e.clientY)); };
  cv.onpointermove = e => { pointer = [e.clientX, e.clientY]; if (drawing) strokeTo(hitUV(e.clientX, e.clientY)); };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; last = null; };
  let raf = 0, lastT = performance.now();
  function loop(t) { const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t; if (spin) { ang += dt * 1.6; if (drawing && pointer) strokeTo(hitUV(pointer[0], pointer[1])); }
    mesh.rotation.y = ang; wheelM.rotation.y = ang; const d = Math.max(H, Rm * 2) * 2.3 + 1.2;
    cam.position.set(0, top ? H + d * 0.95 : H * 0.6 + d * 0.28, top ? d * 0.35 : d); cam.lookAt(0, H * (top ? 0.3 : 0.45), 0);
    if (cv.width !== Math.floor(wrap.clientWidth * R3.getPixelRatio())) size(); R3.render(S3, cam); raf = requestAnimationFrame(loop); }
  function stop3() { cancelAnimationFrame(raf); R3.dispose(); }
  size(); raf = requestAnimationFrame(loop);
  $('#next', el).onclick = () => {
    const empty = !dg.getImageData(0, 0, DW, DH).data.some((v, i) => i % 4 === 3 && v > 0);
    const small = document.createElement('canvas'); small.width = TW; small.height = TH; small.getContext('2d').drawImage(dc, 0, 0, TW, TH);
    let data = empty ? null : small.toDataURL('image/webp', 0.85); if (data && data.length < 100) data = small.toDataURL('image/png');
    updatePiece(id, p => { p.decor = data; p.decorV = (p.decorV || 0) + 1; });
    stop3(); wax(id, opts);
  };
}
/* ② 굽 왁스: 돌리며 굽에 왁스를 발라 유약이 바닥에 묻지 않게 */
function wax(id, opts) {
  const pc = loadPieces().find(p => p.id === id);
  const el = open('cfGlaze', `<div class="cf-top"><h2>🕯️ 굽에 왁스 바르기</h2>${STEP_BAR(1)}<button class="cf-btn pri cf-go" data-go="#next" data-alt="#skip">다음 · 유약 담그기 →</button><button class="cf-x" data-a="x">나가기</button></div>
    <div class="cf-body" style="justify-content:center"><div class="cf-col" style="max-width:520px;width:100%;align-items:center">
      <canvas id="wxCv" width="420" height="300" style="width:100%;max-width:420px;border-radius:14px;background:#2b2522"></canvas>
      <div class="cf-note" style="text-align:center">그릇을 뒤집어 돌림판에 올렸어요. <b>바르기</b> 버튼을 누르고 있으면 돌아가며 굽(바닥)에 왁스가 발라져요. 한 바퀴 다 바르면 끝!</div>
      <button class="cf-btn pri" id="wxHold" style="padding:16px 28px;font-size:16px;touch-action:none">🕯️ 누르고 있기 · 바르기</button>
      <div style="display:flex;gap:8px"><button class="cf-btn" id="skip">건너뛰기 (나중에 스펀지로)</button><button class="cf-btn" id="next" disabled>다음 · 유약 담그기 →</button></div>
    </div></div>`);
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
  const g = $('#wxCv', el).getContext('2d'); let prog = pc.glaze && pc.glaze.wax ? 1 : 0, hold = false, a = 0, raf;
  const holdBtn = $('#wxHold', el);
  holdBtn.onpointerdown = e => { holdBtn.setPointerCapture(e.pointerId); hold = true; }; holdBtn.onpointerup = holdBtn.onpointercancel = () => hold = false;
  const R = Math.max(...pc.r), cl = CLAY[pc.clay] || CLAY.buff;
  function draw() {
    if (hold && prog < 1) prog = Math.min(1, prog + 0.012); if (hold) a += 0.08;
    g.fillStyle = '#2b2522'; g.fillRect(0, 0, 420, 300);
    g.fillStyle = '#8a8580'; g.beginPath(); g.ellipse(210, 250, 150, 32, 0, 0, 7); g.fill();
    // 뒤집힌 그릇 (위에서 비스듬히): 굽 동그라미
    const rx = 70 + R * 90, ry = rx * 0.32; g.fillStyle = cl.fired; g.beginPath(); g.moveTo(210 - rx, 230); g.quadraticCurveTo(210 - rx * 0.9, 120, 210 - rx * 0.55, 105); g.lineTo(210 + rx * 0.55, 105); g.quadraticCurveTo(210 + rx * 0.9, 120, 210 + rx, 230); g.closePath(); g.fill();
    g.fillStyle = '#e8dcc8'; g.beginPath(); g.ellipse(210, 105, rx * 0.55, ry * 0.55, 0, 0, 7); g.fill();
    g.strokeStyle = '#d8b25a'; g.lineWidth = 9; g.beginPath(); g.ellipse(210, 105, rx * 0.55, ry * 0.55, 0, -Math.PI / 2 + a, -Math.PI / 2 + a + prog * Math.PI * 2); g.stroke();
    if (hold && prog < 1) { const px = 210 + Math.cos(-Math.PI / 2 + a + prog * 6.28) * rx * 0.55, py = 105 + Math.sin(-Math.PI / 2 + a + prog * 6.28) * ry * 0.55; g.strokeStyle = '#6b4a33'; g.lineWidth = 6; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 40, py - 60); g.stroke(); g.fillStyle = '#d8b25a'; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill(); }
    g.fillStyle = '#f3ebdf'; g.font = '700 16px system-ui'; g.textAlign = 'center'; g.fillText(prog >= 1 ? '✅ 왁스 완료!' : `왁스 ${Math.round(prog * 100)}%`, 210, 40);
    if (prog >= 1) $('#next', el).disabled = false;
    raf = requestAnimationFrame(draw); if (active !== 'cfGlaze' || !$('#wxCv')) cancelAnimationFrame(raf);
  }
  draw();
  $('#next', el).onclick = () => { cancelAnimationFrame(raf); updatePiece(id, p => { p.glaze = p.glaze || { layers: [] }; p.glaze.wax = true; }); dip(id, opts); };
  $('#skip', el).onclick = () => { cancelAnimationFrame(raf); updatePiece(id, p => { p.glaze = p.glaze || { layers: [] }; p.glaze.wax = false; }); dip(id, opts); };
}
/* ③ 유약 담그기: 집게로 그릇을 잡고 유약통에 2~3초 담갔다 빼기 */
function dip(id, opts) {
  const pc0 = loadPieces().find(p => p.id === id);
  const el = open('cfGlaze', `<div class="cf-top"><h2>🪣 유약 담그기</h2>${STEP_BAR(2)}<button class="cf-btn pri cf-go" data-go="#done">완성 · 가마로 →</button><button class="cf-x" data-a="x">나가기</button></div>
    <div class="cf-body"><div class="cf-col" style="flex:1.3;align-items:center">
      <canvas id="dpCv" width="520" height="560" style="width:100%;max-width:440px;border-radius:14px;background:#2b2522;touch-action:none"></canvas>
      <div class="cf-note" style="text-align:center" id="dpMsg">유약을 고르고(목록), 집게 든 그릇을 <b>아래로 끌어</b> 통에 담가요. 2~3초 세고 손을 떼면 쏙 올라와요.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="cf-btn" id="thick">두께 보기</button><button class="cf-btn" id="wash">씻어내고 다시</button><button class="cf-btn pri" id="done" disabled>완성 · 재벌 대기로 →</button></div>
    </div>
    <div class="cf-col" style="flex:1;min-width:260px"><div class="cf-card"><h3>유약 ${GLAZES.length}색 · 위: 바른 색 / 아래: 구운 색(산화·환원)</h3><div id="gzPal" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;max-height:44vh;overflow:auto"></div></div>
      <div class="cf-card"><h3 id="gzName">유약을 골라 주세요</h3><div class="cf-note" id="gzNote"></div></div>
      <div class="cf-card"><div class="cf-note">💡 담근 시간 = 두께. <b>2~3초</b>가 알맞아요. 너무 길면 흘러내리고, 너무 짧으면 거칠어요. 끝까지 깊이 담그면 굽까지 묻어요(왁스를 안 발랐다면 선반에 붙어요). 다른 색에 한 번 더 담그면 겹친 부분이 섞여요 (최대 3번).</div></div></div></div>`);
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
  let sel = null; const layers = (pc0.glaze && pc0.glaze.layers) ? [...pc0.glaze.layers] : [];
  $('#gzPal', el).innerHTML = GLAZES.map(g => `<button data-g="${g.id}" style="border:2px solid transparent;border-radius:10px;background:#38312c;padding:4px;cursor:pointer;color:#e9dfd1;font:inherit;font-size:10.5px;line-height:1.25">
    <span style="display:block;height:20px;border-radius:6px 6px 0 0;background:${g.raw}"></span><span style="display:flex;height:14px"><span style="flex:1;background:${g.ox}"></span><span style="flex:1;background:${g.red}"></span></span>${g.name}</button>`).join('');
  const pal = $('#gzPal', el);
  pal.querySelectorAll('button').forEach(b => b.onclick = () => { sel = G[b.dataset.g]; pal.querySelectorAll('button').forEach(x => x.style.borderColor = 'transparent'); b.style.borderColor = '#e9c35a';
    $('#gzName', el).textContent = sel.name; $('#gzNote', el).innerHTML = `${sel.note ? sel.note + ' · ' : ''}${sel.op < 0.5 ? '비치는 유약 (그림·흙색이 보여요)' : '덮는 유약'} · 질감: ${({ gloss: '반짝', matte: '무광', crackle: '빙렬(가는 금)', speckle: '점박이', crystal: '결정', metal: '금속광', ash: '흘러내림 줄무늬' })[sel.fin]}`; });
  // 장면
  const cv = $('#dpCv', el), g = cv.getContext('2d'), W = 520, Hc = 560;
  const pr = profile(pc0), Hm = pc0.H, Rm = Math.max(...pc0.r), sc = Math.min(150 / Rm, 165 / Hm) * 0.95;
  const rest = 145 + Hm * sc, BUCKET_TOP = rest + 45; let y = rest, dragging = false, startY = 0, y0 = rest, inT = 0, maxDepth = 0, dipping = false, drips = [], showThick = false, lastT = performance.now();
  const cl = CLAY[pc0.clay] || CLAY.buff;
  // 그릇 옆모습(바깥 선) — 거꾸로 들고 담가요(입구가 아래)
  const outline = []; for (let k = 0; k < pc0.r.length; k++) outline.push([pc0.r[k] * sc, (Hm - Hm * k / (pc0.r.length - 1)) * sc]);
  function pieceY() { return y; }          // 그릇 입구(아래쪽) 위치
  function draw(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    if (!dragging) y = lerp(y, rest, 0.12);
    const rimY = pieceY(), topY = rimY - Hm * sc;                    // rimY: 입구(아래), topY: 굽(위)
    const sub = clamp((rimY - BUCKET_TOP) / (Hm * sc), 0, 1.05);      // 잠긴 비율 (입구부터)
    if (sub > 0.02) { inT += dt; maxDepth = Math.max(maxDepth, sub); dipping = true; }
    else if (dipping) { // 꺼냄 → 층 추가
      dipping = false; if (sel && inT > 0.15 && layers.length < 3) { layers.push({ g: sel.id, depth: +Math.min(1, maxDepth).toFixed(3), sec: +inT.toFixed(2) }); afterDip(); for (let k = 0; k < 14; k++) drips.push({ x: (Math.random() - 0.5) * Rm * sc * 1.6, y: 0, v: 40 + Math.random() * 80, c: sel.raw }); }
      inT = 0; maxDepth = 0; }
    g.clearRect(0, 0, W, Hc); g.fillStyle = '#2b2522'; g.fillRect(0, 0, W, Hc);
    // 통
    const bw = 210; g.fillStyle = '#e9e4dc'; g.beginPath(); g.moveTo(W / 2 - bw, BUCKET_TOP - 10); g.lineTo(W / 2 + bw, BUCKET_TOP - 10); g.lineTo(W / 2 + bw - 20, Hc - 20); g.lineTo(W / 2 - bw + 20, Hc - 20); g.closePath(); g.fill();
    g.fillStyle = sel ? sel.raw : '#cfc8bd'; g.fillRect(W / 2 - bw + 8, BUCKET_TOP, bw * 2 - 16, Hc - 40 - BUCKET_TOP);
    // 그릇 (거꾸로)
    const cx = W / 2; g.save(); g.beginPath(); g.moveTo(cx - outline[0][0], topY); for (const [r, hh] of outline) g.lineTo(cx - r, rimY - hh); for (let k = outline.length - 1; k >= 0; k--) g.lineTo(cx + outline[k][0], rimY - outline[k][1]); g.closePath();
    g.fillStyle = cl.fired; g.fill(); g.clip();
    const bodyShade = () => { const lg = g.createLinearGradient(cx - Rm * sc, 0, cx + Rm * sc, 0); lg.addColorStop(0, 'rgba(0,0,0,.28)'); lg.addColorStop(0.35, 'rgba(255,255,255,.12)'); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.32)'); g.fillStyle = lg; g.fillRect(cx - 300, topY - 10, 600, Hm * sc + 20); };
    // 묻은 유약 (입구부터 depth 만큼)
    layers.forEach(L => { const gg = G[L.g], d = L.depth * Hm * sc, th = thickOf(L.sec); g.fillStyle = showThick ? (th < 0.6 ? '#4f8ac8' : th <= 1.35 ? '#5fbf6a' : '#e2683f') : gg.raw; g.globalAlpha = showThick ? 0.85 : clamp(0.55 + th * 0.3, 0, 0.95); g.fillRect(cx - 200, rimY - d, 400, d + 2); g.globalAlpha = 1; });
    if (pc0.glaze && pc0.glaze.wax) { g.fillStyle = '#d8b25a88'; g.fillRect(cx - 200, topY - 2, 400, 6); }
    bodyShade(); g.restore();
    // 유약 (그릇 앞): 잠긴 부분은 유약에 가려져요
    g.fillStyle = (sel ? sel.raw : '#cfc8bd') + 'ee'; g.fillRect(W / 2 - bw + 8, BUCKET_TOP, bw * 2 - 16, Hc - 40 - BUCKET_TOP);
    g.fillStyle = '#ffffff30'; g.fillRect(W / 2 - bw + 8, BUCKET_TOP, bw * 2 - 16, 5);
    if (sub > 0.02) { g.strokeStyle = '#ffffff70'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, BUCKET_TOP + 2, outline[outline.length - 1][0] + 8 + Math.sin(t / 120) * 3, 5, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#d9d3ca'; g.fillRect(W / 2 - bw, BUCKET_TOP - 10, bw * 2, 10);
    // 집게
    g.strokeStyle = '#7a7570'; g.lineWidth = 7; g.lineCap = 'round'; const tw = outline[0][0] + 10;
    g.beginPath(); g.moveTo(cx - tw, topY + 18); g.lineTo(cx - tw - 6, topY - 30); g.lineTo(cx - 12, topY - 90); g.moveTo(cx + tw, topY + 18); g.lineTo(cx + tw + 6, topY - 30); g.lineTo(cx + 12, topY - 90); g.stroke();
    g.fillStyle = '#5f5e5b'; g.beginPath(); g.roundRect(cx - 18, topY - 130, 36, 44, 10); g.fill();
    // 떨어지는 방울
    drips = drips.filter(dp => (dp.y += dp.v * dt) < 200); drips.forEach(dp => { g.fillStyle = dp.c; g.beginPath(); g.ellipse(cx + dp.x, rimY + dp.y, 3, 6, 0, 0, 7); g.fill(); });
    // 초 세기
    if (dipping) { const s = inT, col = s < 2 ? '#e9c35a' : s <= 3.2 ? '#5fbf6a' : '#e2683f'; g.fillStyle = '#000a'; g.beginPath(); g.arc(W - 70, 70, 46, 0, 7); g.fill();
      g.strokeStyle = col; g.lineWidth = 8; g.beginPath(); g.arc(W - 70, 70, 40, -Math.PI / 2, -Math.PI / 2 + Math.min(1, s / 3) * 6.283); g.stroke();
      g.fillStyle = col; g.font = '800 22px system-ui'; g.textAlign = 'center'; g.fillText(s.toFixed(1) + '초', W - 70, 78); g.font = '12px system-ui'; g.fillStyle = '#e9dfd1'; g.fillText(s < 2 ? '조금 더' : s <= 3.2 ? '지금 빼요!' : '너무 길어요', W - 70, 132); }
    if (!sel) { g.fillStyle = '#f3ebdf'; g.font = '700 15px system-ui'; g.textAlign = 'center'; g.fillText(innerWidth < 760 ? '↓ 아래 목록에서 유약을 먼저 골라요' : '오른쪽에서 유약을 먼저 골라요 →', W / 2, 40); }
    else if (!dipping && layers.length < 3) { g.fillStyle = '#ffe2a6'; g.font = '700 15px system-ui'; g.textAlign = 'center'; g.fillText('그릇을 아래로 끌어 담가요 ↓', W / 2, 40); }
    raf = requestAnimationFrame(draw); if (active !== 'cfGlaze' || !$('#dpCv')) cancelAnimationFrame(raf);
  }
  let raf = requestAnimationFrame(draw);
  const toY = e => { const r = cv.getBoundingClientRect(); return (e.clientY - r.top) * Hc / r.height; };
  cv.onpointerdown = e => { if (!sel) return toast(el, '유약을 먼저 골라요'); if (layers.length >= 3) return toast(el, '3번까지 담글 수 있어요'); cv.setPointerCapture(e.pointerId); dragging = true; startY = toY(e); y0 = y; };
  cv.onpointermove = e => { if (dragging) y = clamp(y0 + (toY(e) - startY) * 1.6, rest, BUCKET_TOP + Hm * sc * 1.06); };
  cv.onpointerup = cv.onpointercancel = () => { dragging = false; };
  function afterDip() {
    const L = layers[layers.length - 1], th = thickOf(L.sec);
    $('#dpMsg', el).innerHTML = `${G[L.g].name} ${L.sec.toFixed(1)}초 · ${th < 0.45 ? '🪨 얇아요' : th <= 1.35 ? '✅ 알맞아요' : '🫠 두꺼워요'} · ${L.depth >= 0.995 ? (pc0.glaze && pc0.glaze.wax ? '굽까지 담갔지만 왁스가 막아줘요' : '⚠️ 굽까지 묻었어요') : Math.round(L.depth * 100) + '% 깊이'}`;
    $('#done', el).disabled = false; updatePiece(id, p => { p.glaze = p.glaze || { layers: [] }; p.glaze.layers = layers.slice(); });
  }
  $('#thick', el).onclick = e => { showThick = !showThick; e.target.classList.toggle('on', showThick); };
  $('#wash', el).onclick = () => { layers.length = 0; $('#done', el).disabled = true; $('#dpMsg', el).textContent = '깨끗이 씻었어요. 다시 담가 보세요.'; updatePiece(id, p => { if (p.glaze) p.glaze.layers = []; }); };
  if (layers.length) $('#done', el).disabled = false;
  $('#done', el).onclick = () => { cancelAnimationFrame(raf); updatePiece(id, p => { p.stage = 'glazed'; }); finishGlaze(id, opts); };
}
async function finishGlaze(id, opts) {
  const pc = loadPieces().find(p => p.id === id);
  const el = open('cfGlaze', `<div class="cf-top"><h2>✅ 유약 완성</h2><button class="cf-x" data-a="x">닫기</button></div>
    <div class="cf-body" style="justify-content:center"><div class="cf-col" style="align-items:center;max-width:520px">
      <img id="fin" alt="" style="width:200px;height:200px"><div class="cf-note" style="text-align:center">지금은 분칠한 것처럼 흐린 색이에요. 🔥 가마실에서 <b>재벌</b>하면 진짜 색이 나와요.<br>산화·환원에 따라 색이 달라져요.</div>
      <div style="display:flex;gap:8px"><button class="cf-btn" id="more">다른 그릇 꾸미기</button><button class="cf-btn pri" id="toKiln">🔥 가마실로 가기</button></div></div></div>`);
  $('#fin', el).src = await thumb(pc, 240);
  el.querySelector('[data-a="x"]').onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
  $('#more', el).onclick = () => openGlaze(opts);
  $('#toKiln', el).onclick = () => { closeAll(); opts.onExit && opts.onExit(); opts.goKiln && opts.goKiln(); };
}

/* =====================================================================
   건조실 · 굽깎기: 반건조 그릇을 뒤집어 물레에 올리고 ① 중심 ② 고정 ③ 바깥 깎기 ④ 굽 파기
   ===================================================================== */
const innerR = (pc, k) => { const y = pc.H * k / (pc.r.length - 1); return y < pc.floorT ? 0 : Math.max(0.02, pc.r[k] - pc.t[k]); };
function trimTarget(pc) {
  const n = pc.r.length, kf = Math.min(n - 1, Math.ceil(pc.floorT / pc.H * (n - 1))), inF = Math.max(0.02, pc.r[kf] - pc.t[kf]);
  const foot = clamp(inF * 0.85, 0.08, pc.r[0]);
  return pc.r.map((r, k) => { const y = pc.H * k / (n - 1); if (y > pc.H * 0.6) return r; if (y < pc.floorT) return Math.min(r, foot); return Math.min(r, innerR(pc, k) + 0.06); });
}
let trimTimer = null;
function openTrim(opts = {}) {
  const el = open('cfTrim', `<div class="cf-top"><h2>🔪 굽깎기 · 그릇 고르기</h2><button class="cf-x" data-a="x">나가기</button></div>
    <div class="cf-body"><div class="cf-col" style="flex:1"><div class="cf-card"><h3>깎을 그릇 · 물레에서 빚은 그릇</h3><div class="cf-list" id="trList"></div>
    <div class="cf-note" style="margin-top:10px">빚고 <b>15초 ~ 2분</b> 사이가 반건조(깎기 좋음)예요. 너무 젖었을 때 깎으면 찌그러지고, 너무 마르면 단단해서 잘 안 깎이고 금이 가기 쉬워요.<br>🔥 굽을 깎아야 가마에 넣을 수 있어요.</div></div></div></div>`);
  el.querySelector('[data-a="x"]').onclick = () => { clearInterval(trimTimer); closeAll(); opts.onExit && opts.onExit(); };
  const list = loadPieces().filter(p => stageOf(p) === 'raw' && p.place !== 'carry'), box = $('#trList', el);
  box.innerHTML = list.length ? list.map(p => `<button class="cf-item" data-id="${p.id}"><img data-pid="${p.id}" alt=""><b>${p.clayName || ''} ${p.name}</b><small data-w="${p.id}"></small></button>`).join('') : '<div class="cf-note">깎을 그릇이 없어요. 🏺 물레실에서 빚어 와요.</div>';
  fillThumbs(box);
  const tick = () => { if (active !== 'cfTrim' || !$('#trList')) return clearInterval(trimTimer);
    for (const p of list) { const sm = box.querySelector(`[data-w="${p.id}"]`); if (!sm) continue; const w = wetState(p), a = (Date.now() - (p.madeAt || 0)) / 1000;
      sm.innerHTML = w === 'wet' ? `💧 젖음 · ${Math.ceil(WET_MS / 1000 - a)}초 뒤 깎기 좋음` : w === 'leather' ? `✅ 깎기 좋음 · ${Math.ceil(HARD_MS / 1000 - a)}초 남음` : '🪨 단단해짐 · 깎기 힘듦'; } };
  tick(); clearInterval(trimTimer); trimTimer = setInterval(tick, 1000);
  box.querySelectorAll('.cf-item').forEach(b => b.onclick = () => { clearInterval(trimTimer); trimView(+b.dataset.id, opts); });
}
const TSTEP = s => `<div class="cf-steps">${['① 중심', '② 고정', '③ 바깥 깎기', '④ 굽 파기'].map((t, i) => `<span class="${i === s ? 'on' : i < s ? 'done' : ''}">${t}</span>`).join('')}</div>`;
function trimView(id, opts) {
  const pc = loadPieces().find(p => p.id === id); if (!pc) return openTrim(opts);
  const wet0 = wetState(pc), easy = pc.mode !== 'real', n = pc.r.length, H = pc.H, Rm = Math.max(...pc.r), cl = CLAY[pc.clay] || CLAY.buff;
  const el = open('cfTrim', `<div class="cf-top"><h2>🔪 굽깎기 · ${pc.clayName || ''} ${pc.name}</h2><span id="trSteps">${TSTEP(0)}</span><button class="cf-btn pri cf-go" data-go="#trNext">다음 →</button><button class="cf-x" data-a="x">나가기</button></div>
    <div class="cf-body" style="padding:0;gap:0"><div style="flex:1;position:relative;min-height:340px" id="trWrap"><canvas id="trCv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas>
      <div id="trTip" style="position:absolute;left:50%;top:12px;transform:translateX(-50%);background:#2b2420e8;border:1px solid #e9c35a66;color:#ffe2a6;padding:8px 16px;border-radius:999px;font-size:14px;font-weight:700;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;pointer-events:none"></div>
      <div id="trAct" style="position:absolute;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap"></div></div>
    <div class="cf-col cf-side" style="width:min(300px,100%);padding:14px;overflow:auto;background:#2a2420">
      <div class="cf-card"><h3>흙 상태</h3><div class="cf-note" id="trWet"></div></div>
      <div class="cf-card"><h3 id="trGT">흔들림</h3><div style="height:14px;border-radius:7px;background:#3a3430;overflow:hidden"><div id="trG" style="height:100%;width:100%;background:#e2683f"></div></div><div class="cf-note" id="trGN" style="margin-top:6px"></div></div>
      <div class="cf-card"><div class="cf-note" id="trHelp"></div></div>
      <button class="cf-btn pri" id="trNext" style="width:100%;padding:14px" disabled>다음 →</button>
    </div></div>`);
  const quit = () => { stop(); closeAll(); opts.onExit && opts.onExit(); };
  el.querySelector('[data-a="x"]').onclick = quit;
  $('#trWet', el).innerHTML = wet0 === 'wet' ? '💧 <b>아직 젖었어요.</b> 지금 깎으면 칼에 흙이 끌려 찌그러지기 쉬워요. 조금 기다렸다 깎는 게 좋아요.' : wet0 === 'leather' ? '✅ <b>반건조 · 깎기 딱 좋아요.</b> 흙이 리본처럼 깎여요.' : '🪨 <b>많이 말라 단단해요.</b> 잘 안 깎이고 금이 가기 쉬워요. 다음엔 빚고 2분 안에 깎아요.';
  // --- 3D
  const cv = $('#trCv', el), wrap = $('#trWrap', el);
  const R3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); R3.outputColorSpace = THREE.SRGBColorSpace; R3.setPixelRatio(Math.min(2, devicePixelRatio));
  const S3 = new THREE.Scene(); S3.background = new THREE.Color('#2b2522'); S3.add(new THREE.HemisphereLight('#fff6e8', '#5a4a3a', 1.0)); const dl = new THREE.DirectionalLight('#ffffff', 1.3); dl.position.set(2, 5, 4); S3.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(Rm + 0.45, Rm + 0.5, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#8a8580', roughness: 0.5, metalness: 0.4 })); wheel.position.y = -0.06; S3.add(wheel);
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18 + i * 0.18, 0.004, 4, 64), new THREE.MeshBasicMaterial({ color: '#6f6a65' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.002; wheel.add(ring); ring.position.y = 0.062; }
  const spin = new THREE.Group(); S3.add(spin); const off = new THREE.Group(); spin.add(off);
  // 물레 자국 질감 (돌아가는 게 보이게)
  const tc = document.createElement('canvas'); tc.width = 256; tc.height = 128; const tg = tc.getContext('2d'); tg.fillStyle = '#fff'; tg.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 3) { tg.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`; tg.fillRect(0, y, 256, 1); }
  for (let k = 0; k < 6; k++) { tg.fillStyle = 'rgba(0,0,0,.07)'; tg.fillRect(k * 43 + Math.random() * 10, 0, 6 + Math.random() * 8, 128); }
  const ttex = new THREE.CanvasTexture(tc); ttex.colorSpace = THREE.SRGBColorSpace;
  const baseCol = new THREE.Color(pc.color || cl.dry); if (wet0 === 'wet') baseCol.multiplyScalar(0.8); if (wet0 === 'hard') baseCol.lerp(new THREE.Color('#ffffff'), 0.12);
  const pmat = new THREE.MeshStandardMaterial({ color: baseCol, map: ttex, roughness: wet0 === 'wet' ? 0.45 : 0.9, side: THREE.DoubleSide });
  const ro = pc.r.slice(), target = trimTarget(pc); let d = 0, fi = 0;
  const piece = new THREE.Mesh(geometryOf(pc), pmat); piece.rotation.x = Math.PI; piece.position.y = H; off.add(piece);
  const rebuild = () => { piece.geometry.dispose(); piece.geometry = geometryOf({ ...pc, trim: { ro, d, fi } }, 48); };
  // 목표 점선
  const dashMat = new THREE.LineDashedMaterial({ color: '#ff8a5a', dashSize: 0.03, gapSize: 0.02, depthTest: false, transparent: true });
  const guide = new THREE.Group(); guide.renderOrder = 10; S3.add(guide);
  function drawGuide(kind) { guide.clear();
    if (kind === 'outer') for (const sg of [-1, 1]) { const pts = []; for (let k = 0; k < n; k++) { const y = H * k / (n - 1); if (y > H * 0.6) break; pts.push(V(sg * target[k], H - y, 0.001)); }
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dashMat); ln.computeLineDistances(); ln.renderOrder = 10; guide.add(ln); }
    if (kind === 'foot') { const yy = H - (pc.floorT - 0.05); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-fi, yy, 0.001), V(fi, yy, 0.001)]), dashMat); ln.computeLineDistances(); ln.renderOrder = 10; guide.add(ln);
      for (const sg of [-1, 1]) { const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(sg * fi, H, 0.001), V(sg * fi, yy, 0.001)]), dashMat); l2.computeLineDistances(); l2.renderOrder = 10; guide.add(l2); } } }
  // 빨간 점 (튀어나온 쪽 표시)
  const bump = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff5a3a', depthTest: false })); bump.renderOrder = 11; off.add(bump);
  // 굽칼
  const tool = new THREE.Group(); const tmat = new THREE.MeshStandardMaterial({ color: '#c9c4bc', metalness: 0.7, roughness: 0.3, depthTest: false }); const hmat = new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 0.7, depthTest: false });
  const loopM = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 16, Math.PI), tmat); loopM.rotation.z = Math.PI / 2; tool.add(loopM);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 6), tmat); stem.position.set(0.06, 0, 0); stem.rotation.z = Math.PI / 2; tool.add(stem);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.36, 10), hmat); handle.position.set(0.3, 0, 0); handle.rotation.z = Math.PI / 2; tool.add(handle);
  tool.traverse(o => o.renderOrder = 12); tool.visible = false; S3.add(tool);
  // 흙 리본
  const shav = []; const shavMat = new THREE.LineBasicMaterial({ color: baseCol.clone().multiplyScalar(0.92) });
  function spawnShaving(p, sg) { if (shav.length > 70) { const o = shav.shift(); S3.remove(o.m); o.m.geometry.dispose(); }
    const pts = []; const r0 = 0.012 + Math.random() * 0.012; for (let i = 0; i < 14; i++) { const a = i * 0.7; pts.push(V(Math.cos(a) * r0 * (1 + i * 0.08), i * 0.004, Math.sin(a) * r0 * (1 + i * 0.08))); }
    const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), shavMat); m.position.copy(p); S3.add(m);
    shav.push({ m, v: V(sg * (0.3 + Math.random() * 0.5), 0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.4), life: 1.4, rs: (Math.random() - 0.5) * 8 }); }
  // 흙덩이 (고정)
  const lumps = []; const lumpMat = new THREE.MeshStandardMaterial({ color: cl.dry, roughness: 0.95 });
  // --- 상태
  let autoH = false, sweep = 0, curH = 0, overCut = 0, step = 0, ang = 0, o0 = 0.05 + Math.random() * 0.03, o = o0, removed = 0, dent = 0, crack = 0, hole = null, finished = false, down = false, tp = null, lastShav = 0;
  const excess0 = ro.reduce((s, r, k) => s + Math.max(0, r - target[k]), 0);
  const rate = { wet: 0.9, leather: 0.7, hard: 0.35 }[wet0];
  const tip = t => $('#trTip', el).textContent = t, help = h => $('#trHelp', el).innerHTML = h;
  const gauge = (title, frac, col, note) => { $('#trGT', el).textContent = title; const g = $('#trG', el); g.style.width = Math.round(clamp(frac, 0, 1) * 100) + '%'; g.style.background = col; $('#trGN', el).innerHTML = note || ''; };
  const nextBtn = $('#trNext', el), act = $('#trAct', el);
  const setNext = (on, label) => { nextBtn.disabled = !on; if (label) { nextBtn.textContent = label; el.querySelector('.cf-go').textContent = label; } };
  function enter(s) {
    step = s; $('#trSteps', el).innerHTML = TSTEP(s); act.innerHTML = ''; setNext(false, s === 3 ? '깎기 완성 ✓' : '다음 →'); drawGuide(s === 2 ? 'outer' : s === 3 ? 'foot' : '');
    if (s === 0) { tip('그릇을 톡톡 눌러 가운데로 밀어요 (3번)');
      help('그릇을 뒤집어 물레에 올렸어요. 가운데에서 살짝 벗어나 흔들려요. <b>그릇이나 버튼을 톡톡 3번</b> 누르면 가운데로 밀려요.');
      act.innerHTML = '<button class="cf-btn pri" id="trPush" style="padding:13px 24px">👆 툭 밀기</button>'; $('#trPush', el).onclick = push; }
    if (s === 1) { bump.visible = false; tip('그릇 둘레를 3번 눌러 흙덩이로 고정해요'); help('깎는 동안 그릇이 날아가지 않게 둘레에 흙덩이 3개를 꾹 붙여요.');
      act.innerHTML = '<button class="cf-btn pri" id="trLump" style="padding:13px 24px">🟤 흙덩이 붙이기 (0/3)</button>'; $('#trLump', el).onclick = addLump; }
    if (s === 2) { tip('✋ 꾹 누르고 있으면 굽칼이 알아서 깎아요');
      help(`<b>아래 버튼을 꾹 누르고 있거나</b>, 화면을 누른 채 위아래로 움직여요. 굽칼이 그릇 겉면을 따라가며 주황 점선까지 깎아요. 게이지가 초록이 되면 다음으로! ${easy ? '' : '<br>실전 모드: 다 깎은 뒤에도 계속 누르면 조금 더 얇아져서 점수가 내려가요.'}`);
      act.innerHTML = '<button class="cf-btn pri" id="trHold" style="padding:15px 30px;font-size:16px;touch-action:none">✋ 꾹 누르고 있기 · 깎기</button>'; holdBtn(); }
    if (s === 3) { fi = Math.max(0.04, ro[0] - 0.035); rebuild(); drawGuide('foot'); tip('✋ 꾹 누르고 있으면 굽 안쪽이 파여요');
      help(`<b>아래 버튼이나 화면 아무 데나 꾹 누르고 있으면</b> 굽 안쪽이 파여요. 바닥 두께 게이지가 <b>초록(4~6mm)</b>이 되면 손을 떼요. ${easy ? '쉬움 모드라 알맞은 두께에서 저절로 멈춰요.' : '<br>실전 모드: 너무 오래 누르면 바닥이 얇아져 점수가 내려가요.'}`);
      act.innerHTML = '<button class="cf-btn pri" id="trHold" style="padding:15px 30px;font-size:16px;touch-action:none">✋ 꾹 누르고 있기 · 굽 파기</button>'; holdBtn(); }
  }
  function holdBtn() { const b = $('#trHold', el); b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); down = true; autoH = true; tool.visible = true; b.classList.add('on'); };
    b.onpointerup = b.onpointercancel = () => { down = false; autoH = false; b.classList.remove('on'); }; }
  function push() { if (step !== 0) return; o *= 0.35; toast(el, '👍 쏙!', 600);
    if (o < o0 * 0.1) { o = 0; tip('✅ 중심이 딱 맞았어요!'); setNext(true); setTimeout(() => step === 0 && enter(1), 700); } }
  function addLump() { if (step !== 1 || lumps.length >= 3) return; const a = lumps.length * Math.PI * 2 / 3 + 0.4, rr = pc.r[n - 1] + 0.05;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), lumpMat); m.scale.set(1, 0.6, 1.2); m.position.set(Math.cos(a) * rr, 0.03, Math.sin(a) * rr); m.rotation.y = -a; spin.add(m); lumps.push(m);
    const b = $('#trLump', el); if (b) b.textContent = `🟤 흙덩이 붙이기 (${lumps.length}/3)`; if (lumps.length >= 3) { tip('✅ 단단히 고정했어요!'); setNext(true); setTimeout(() => step === 1 && enter(2), 700); } }
  nextBtn.onclick = () => { if (step < 3) { if (step === 2 && progress() < 0.5) return toast(el, '아직 흙이 많이 남았어요. 점선까지 깎아요'); if (step === 0) o = 0; if (step === 1) while (lumps.length < 3) addLump(); enter(step + 1); } else finish(); };
  const progress = () => excess0 < 0.01 ? 1 : 1 - ro.reduce((s, r, k) => s + Math.max(0, r - target[k]), 0) / excess0;
  // --- 포인터 → 그릇 좌표
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V(0, 0, 1), 0), hp = V();
  const toWorld = e => { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.ray.intersectPlane(plane, hp) ? hp.clone() : null; };
  cv.onpointerdown = e => { e.preventDefault(); if (step === 0) return push(); if (step === 1) return addLump(); cv.setPointerCapture(e.pointerId); down = true; autoH = false; tool.visible = true; tp = toWorld(e); };
  cv.onpointermove = e => { const w = toWorld(e); if (w && step >= 2) { tp = w; tool.visible = true; } };
  cv.onpointerup = cv.onpointercancel = () => { down = false; };
  cv.oncontextmenu = e => e.preventDefault();
  const surfX = h => { const k = clamp(Math.round(h / H * (n - 1)), 0, n - 1); return ro[k]; };
  function cut(dt) {
    let changed = false, wallAt = null;
    if (step === 2) { const h = curH;
      for (let k = 0; k < n; k++) { const y = H * k / (n - 1); if (y > H * 0.6 || Math.abs(y - h) > 0.08) continue;
        if (y >= pc.floorT) wallAt = ro[k] - innerR(pc, k);
        const minR = easy ? target[k] : Math.max(y < pc.floorT ? 0.05 : innerR(pc, k) + 0.025, target[k] - 0.018);
        if (ro[k] <= minR + 0.0003) continue; const over = ro[k] <= target[k] + 0.0005; if (over) overCut = 0.5;
        const nr = Math.max(minR, ro[k] - rate * (over ? 0.08 : 1) * dt); if (!over) { const lim = target[k]; if (nr < lim && ro[k] > lim) { ro[k] = lim; changed = true; continue; } }
        removed += ro[k] - nr; ro[k] = nr; changed = true; } }
    if (step === 3) { const maxD = easy ? pc.floorT - 0.05 : pc.floorT - 0.015; const nd = Math.min(maxD, d + rate * 0.04 * dt); if (nd > d + 0.00005) { removed += (nd - d) * 0.5; d = nd; changed = true; } }
    if (changed) { rebuild(); if (wet0 === 'wet') dent += dt * 0.5; if (wet0 === 'hard') crack += dt * 0.03;
      lastShav += dt; if (lastShav > 0.05) { lastShav = 0; spawnShaving(tool.position.clone(), 1); } }
    return { changed, wallAt };
  }
  function size() { const w = wrap.clientWidth, h = wrap.clientHeight; R3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  let raf = 0, lastT = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    ang += dt * (step === 0 ? 1.4 : step === 1 ? 0.6 : 3.2); spin.rotation.y = ang; wheel.rotation.y = ang;
    off.position.x = o; bump.position.set(Math.max(...pc.r) + 0.03, H * 0.5, 0); bump.visible = step === 0 && o > 0;
    piece.scale.x = 1 + Math.min(0.07, dent * 0.03); piece.scale.z = 1 - Math.min(0.04, dent * 0.015);
    const dist = Math.max(H, Rm * 2) * 2.2 + 1.1;
    if (step === 3) { cam.position.set(0, H + dist * 0.62, dist * 0.78); cam.lookAt(0, H * 0.72, 0); } else { cam.position.set(0, H * 0.7 + dist * 0.22, dist); cam.lookAt(0, H * 0.5, 0); }
    if (step === 0) gauge('흔들림', o / o0, o / o0 > 0.5 ? '#e2683f' : o / o0 > 0.15 ? '#e9c35a' : '#5fbf6a', o ? `흔들림 ${Math.round(o / o0 * 100)}% · 0%가 되면 중심!` : '✅ 중심 맞춤');
    if (step === 1) gauge('고정', lumps.length / 3, '#5fbf6a', `흙덩이 ${lumps.length}/3`);
    if (step === 2) { if (autoH || !tp) { sweep += dt * 2.2; curH = (0.5 - 0.5 * Math.cos(sweep)) * H * 0.6; } else curH = clamp(H - tp.y, 0, H * 0.6);
      tool.position.set(surfX(curH) + 0.012, H - curH, 0.06); tool.rotation.set(0, 0, 0); }
    if (step === 3) { tool.position.set(0, H - d + 0.012, 0.03); tool.rotation.set(0, 0, -Math.PI / 2.4); }
    if (step >= 2 && wet0 === 'hard' && down) tool.position.x += (Math.random() - 0.5) * 0.008;
    overCut = Math.max(0, overCut - dt);
    if (step >= 2 && down && !finished) { const r = cut(dt);
      if (step === 2) { const p = progress(); gauge('남은 흙 깎기', p, p > 0.9 ? '#5fbf6a' : '#e9c35a', `${Math.round(p * 100)}% 깎음${r && r.wallAt != null ? ` · 닿은 곳 벽 두께 ${Math.round(r.wallAt * 100)}mm` : ''}`); setNext(p >= 0.5); if (overCut > 0 && !easy) { tip('⚠️ 다 깎았어요! 더 깎으면 얇아져요'); } else if (p > 0.97) tip('✅ 바깥을 다 깎았어요! 다음 →'); }
    }
    if (step === 3) { const rem = pc.floorT - d, mm = Math.max(0, Math.round(rem * 100)), ok = rem >= 0.035 && rem <= 0.065;
      gauge('바닥 두께', 1 - rem / pc.floorT, rem < 0.025 ? '#e2683f' : ok ? '#5fbf6a' : '#e9c35a', `${mm}mm · ${rem < 0.025 ? '⚠️ 너무 얇아요! 그만 파요' : rem < 0.035 ? '조금 얇아요' : ok ? '✅ 알맞아요 (통통 소리)' : '아직 두꺼워요 (둔탁한 소리)'}`); setNext(rem <= 0.065, '깎기 완성 ✓'); if (ok) tip(easy && rem <= pc.floorT - (pc.floorT - 0.05) + 0.001 ? '✅ 굽이 생겼어요! 깎기 완성을 눌러요' : '✅ 알맞아요! 손을 떼고 깎기 완성'); else if (rem < 0.035) tip('⚠️ 너무 얇아져요! 손을 떼요'); }
    for (const s of shav) { s.v.y -= 2.2 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.y += s.rs * dt; if (s.m.position.y < 0.01) { s.m.position.y = 0.01; s.v.multiplyScalar(0.3); } s.life -= dt; }
    for (let i = shav.length - 1; i >= 0; i--) if (shav[i].life < 0) { S3.remove(shav[i].m); shav[i].m.geometry.dispose(); shav.splice(i, 1); }
    if (cv.width !== Math.floor(wrap.clientWidth * R3.getPixelRatio())) size();
    R3.render(S3, cam); if (active === 'cfTrim' && $('#trCv')) raf = requestAnimationFrame(loop);
  }
  function stop() { cancelAnimationFrame(raf); R3.dispose(); }
  function scoreOf() {
    let e1 = 0, c1 = 0, e2 = 0, c2 = 0; for (let k = 0; k < n; k++) { const y = H * k / (n - 1); if (y > H * 0.6) break; const err = Math.abs(ro[k] - target[k]); if (y < pc.floorT) { e2 += err; c2++; } else { e1 += err; c1++; } }
    const s1 = clamp(1 - (c1 ? e1 / c1 : 0) / 0.04, 0, 1), s2 = clamp(1 - (c2 ? e2 / c2 : 0) / 0.05, 0, 1), s3 = clamp(1 - Math.abs(pc.floorT - d - 0.05) / 0.04, 0, 1);
    return Math.round(clamp(100 * (0.15 + 0.35 * s1 + 0.2 * s2 + 0.3 * s3) - Math.min(25, dent * 12), 0, 100));
  }
  async function fail() { finished = true; down = false;
    updatePiece(id, p => { p.trim = { ro: ro.map(v => +v.toFixed(3)), d: +d.toFixed(3), fi: +fi.toFixed(3), score: 0, at: Date.now(), wet: wet0, hole }; p.stage = 'broken'; });
    stop(); result(['💥 ' + hole + '이 뚫렸어요. 이 그릇은 깨져서 쓸 수 없어요.', '다음엔 두께 표시가 초록일 때 멈춰요.'], 0); }
  async function finish() { if (finished) return; finished = true; const sc = scoreOf();
    const msgs = [sc >= 85 ? '✨ 굽을 아주 예쁘게 깎았어요!' : sc >= 65 ? '✅ 굽깎기 완료!' : '🙂 굽을 깎았지만 두께가 조금 고르지 않아요'];
    if (dent > 0.3) msgs.push('💧 젖었을 때 깎아서 살짝 찌그러졌어요'); if (wet0 === 'hard') msgs.push('🪨 단단할 때 깎아서 초벌 때 금이 갈 수 있어요');
    if (pc.floorT - d > 0.065) msgs.push('바닥이 아직 두꺼워요 (무거워요)');
    msgs.push('이제 30초 말린 뒤 🔥 가마실에서 초벌해요');
    updatePiece(id, p => { p.trim = { ro: ro.map(v => +v.toFixed(3)), d: +d.toFixed(3), fi: +fi.toFixed(3), score: sc, at: Date.now(), wet: wet0, crack: +crack.toFixed(3), dent: +dent.toFixed(2) }; });
    stop(); result(msgs, sc); }
  async function result(msgs, sc) {
    const el2 = open('cfTrim', `<div class="cf-top"><h2>🔪 굽깎기 결과</h2><button class="cf-x" data-a="x">닫기</button></div>
      <div class="cf-body" style="justify-content:center"><div class="cf-col" style="align-items:center;max-width:520px;width:100%">
      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center"><img id="trR1" alt="" style="width:170px;height:170px"><img id="trR2" alt="" style="width:170px;height:170px"></div>
      <div class="cf-note" style="text-align:center">왼쪽: 바로 놓은 모습 · 오른쪽: 뒤집어 본 굽</div>
      ${sc ? `<div style="font-size:30px;font-weight:800">${sc}점</div>` : ''}<div class="cf-note" style="text-align:center;font-size:14px">${msgs.join('<br>')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="cf-btn" id="trMore">다른 그릇 깎기</button><button class="cf-btn pri" id="trOk">확인</button></div></div></div>`);
    const p2 = loadPieces().find(p => p.id === id); if (p2) { $('#trR1', el2).src = await thumb(p2, 220); $('#trR2', el2).src = await thumbBottom(p2, 220); }
    el2.querySelector('[data-a="x"]').onclick = $('#trOk', el2).onclick = () => { closeAll(); opts.onExit && opts.onExit(); };
    $('#trMore', el2).onclick = () => openTrim(opts);
  }
  window.__trimDbg = { target, cam, cv, get step() { return step; }, get d() { return d; }, get prog() { return progress(); }, H, floorT: pc.floorT };
  enter(0); size(); raf = requestAnimationFrame(loop);
}
async function thumbBottom(pc, size) {          // 굽이 보이게 아래에서 본 썸네일
  await thumb(pc, size); const m = makeMesh(pc); m.rotation.x = Math.PI; m.position.y = pc.H; thumbS.add(m); thumbR.setSize(size, size, false);
  const D = Math.max(pc.H, Math.max(...pc.r) * 2) * 2.4 + 1; thumbC.position.set(0, pc.H + D * 0.7, D * 0.75); thumbC.lookAt(0, pc.H * 0.6, 0);
  thumbR.render(thumbS, thumbC); const url = thumbR.domElement.toDataURL(); thumbS.remove(m); m.geometry.dispose(); m.material.dispose(); return url;
}

window.HeukCraft = { get active() { return !!active; }, openKiln, openGlaze, openTrim, wetState, makeMesh, stageOf, STAGE_NAME, kilnInfo, dryLeft, GLAZES, compose, thumb, _kiln: kilnState, _save: savePieces, _load: loadPieces, _judge: judge, _openResult: openResult };
})();
