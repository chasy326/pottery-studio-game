/* 흙마루 · 3D 캐릭터 (점토 인형) — 선영 시안 v2
   A = 남자: 짧은 웨이브 머리 · 크림 셔츠(소매 접음) · 갈색 앞치마(주머니 1) · 갈색 바지 · 짙은 갈색 신발
   B = 여자: 가운데 가르마 긴 웨이브 머리 · 같은 셔츠·앞치마 · 크림 바지
   HeukChar3D.make('A'|'B') → { root, set(pose), update(dt, moving), holdPt }  키 약 1.1 */
(() => {
const mats = {};
const M = (c, r = 0.85, extra = {}) => { const k = c + r + JSON.stringify(extra); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, ...extra })); };
function mesh(geo, mat, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); m.castShadow = true; m.receiveShadow = true; return m; }
const sph = (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);
const arc = (r, h, len, start) => new THREE.CylinderGeometry(r, r * 1.04, h, 28, 1, true, start, len);

const LOOK = {
  A: { skin: '#efc6ad', blush: '#eeb3a6', hair: '#6a4d42', hairDk: '#5c4238', shirt: '#d6c3b0', apron: '#775749', apronDk: '#6a4c40', pants: '#6a4c40', shoe: '#5a3f33' },
  B: { skin: '#efc6ad', blush: '#eeb3a6', hair: '#6c4e43', hairDk: '#5e4339', shirt: '#d6c3b0', apron: '#775749', apronDk: '#6a4c40', pants: '#ddcfbe', shoe: '#5a3f33' }
};
const LOCK = sph(0.07, 18, 12);
let _groove = null;
function grooveTex() { if (_groove) return _groove; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 64); for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(x, 0, 3, 64); g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x + 4, 0, 2, 64); }
  _groove = new THREE.CanvasTexture(c); _groove.wrapS = _groove.wrapT = THREE.RepeatWrapping; _groove.colorSpace = THREE.SRGBColorSpace; return _groove; }

function make(kind = 'A') {
  const L = LOOK[kind] || LOOK.A, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.27; body.add(hips);
  // --- 몸통 · 엉덩이
  const torso = mesh(cap(0.15, 0.085), M(L.shirt), [0, 0.15, 0], [1.12, 1, 0.86]); hips.add(torso);
  hips.add(mesh(sph(0.15), M(L.pants), [0, 0.0, 0], [1.12, 0.62, 0.86]));
  hips.add(mesh(new THREE.ConeGeometry(0.045, 0.05, 3), M(L.skin, 0.6), [0, 0.282, 0.085], [1, 1, 0.4], [Math.PI, 0, 0]));   // V넥
  // --- 앞치마: 가슴판 + 치마 (몸을 감싸게 휜 판)
  const AP = M(L.apron, 0.9, { side: THREE.DoubleSide }), APD = M(L.apronDk, 0.9);
  hips.add(mesh(arc(0.155, 0.17, 2.0, -1.0), AP, [0, 0.205, 0], [1.1, 1, 0.86]));
  hips.add(mesh(arc(0.168, 0.27, 2.3, -1.15), AP, [0, -0.005, 0], [1.08, 1, 0.9]));
  hips.add(mesh(arc(0.17, 0.22, 1.9, Math.PI - 0.95), AP, [0, -0.005, 0], [1.08, 1, 0.9]));          // 뒤쪽 감싸는 부분
  hips.add(mesh(new THREE.TorusGeometry(0.168, 0.009, 6, 30), APD, [0, 0.13, 0], [1.1, 0.9, 1], [Math.PI / 2, 0, 0]));   // 허리 이음선
  // 주머니
  const pk = new THREE.Group(); pk.position.set(0, kind === 'A' ? 0.05 : 0.035, 0.157); hips.add(pk);
  pk.add(mesh(new THREE.BoxGeometry(0.12, 0.085, 0.014), M(L.apron, 0.9)));
  pk.add(mesh(new THREE.BoxGeometry(0.12, 0.006, 0.016), APD, [0, 0.041, 0.001]));
  // 어깨끈: 앞 → 뒤 일자
  for (const s of [-1, 1]) {
    hips.add(mesh(new THREE.BoxGeometry(0.03, 0.08, 0.012), AP, [s * 0.075, 0.31, 0.085], [1, 1, 1], [-0.6, 0, 0]));
    hips.add(mesh(new THREE.BoxGeometry(0.032, 0.03, 0.17), AP, [s * 0.078, 0.338, -0.005]));
    hips.add(mesh(new THREE.BoxGeometry(0.032, 0.21, 0.012), AP, [s * 0.068, 0.22, -0.128], [1, 1, 1], [0.1, 0, 0]));
  }
  // --- 목 · 머리
  hips.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.06, 14), M(L.skin, 0.6), [0, 0.33, 0]));
  const head = new THREE.Group(); head.position.set(0, 0.55, 0); hips.add(head);
  head.add(mesh(sph(0.235, 36, 26), M(L.skin, 0.6), [0, 0, 0], [1.1, 0.95, 0.97]));
  for (const s of [-1, 1]) head.add(mesh(sph(0.07, 18, 12), M(L.skin, 0.6), [s * (kind === 'B' ? 0.29 : 0.268), -0.05, 0.02], [0.48, 0.95, 0.76]));
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(sph(0.02, 14, 10), M('#3a2620', 0.45), [s * 0.098, -0.052, 0.218], [1, 1.1, 0.45]); head.add(e); eyes.push(e);
    head.add(mesh(sph(0.04, 14, 10), M(L.blush, 0.9, { transparent: true, opacity: 0.0 }), [s * 0.14, -0.085, 0.195], [1.2, 0.7, 0.3]));
  }
  // --- 머리카락: 바가지머리(A) · 단발 보브(B) · 일자 앞머리 · 세로 결
  const hair = new THREE.Group(); head.add(hair);
  const HM = new THREE.MeshStandardMaterial({ color: L.hair, roughness: 0.92, map: grooveTex(), side: THREE.DoubleSide });
  // 돔 + 일자 앞머리: 둥근 버섯 모양 (가장 넓은 곳 아래에서 살짝 안으로 말리며 수평으로 잘림)
  const R = 0.31, HS = 0.275, cut = 0.0, A1 = Math.PI / 2 + 0.36, C0 = cut + HS * Math.sin(0.36);
  const dome = [];
  for (let k = 0; k <= 28; k++) { const a = k / 28 * A1; dome.push(new THREE.Vector2(Math.max(0.001, R * Math.sin(a)), C0 + HS * Math.cos(a))); }
  const rc = R * Math.sin(A1); dome.push(new THREE.Vector2(rc - 0.02, cut - 0.006), new THREE.Vector2(rc - 0.07, cut - 0.002));
  hair.add(mesh(new THREE.LatheGeometry(dome, 72), HM, [0, 0, -0.012], [1.04, 1, 1.0]));
  // 뒷머리: 같은 타원의 적도에서 이어져 목덜미(A) / 턱선(B)까지
  const backProf = (yEnd, rEnd) => { const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14; const y = C0 + (yEnd - C0) * t; const r = R + (rEnd - R) * Math.pow(t, 1.7); pts.push(new THREE.Vector2(r, y)); }
    pts.push(new THREE.Vector2(rEnd - 0.015, yEnd - 0.008), new THREE.Vector2(rEnd - 0.07, yEnd - 0.002)); return pts; };
  if (kind === 'A') {
    hair.add(mesh(new THREE.LatheGeometry(backProf(-0.125, 0.258), 48, Math.PI * 0.5 + 0.7, Math.PI - 1.4), HM, [0, 0, -0.012], [1.04, 1, 1.0]));
    for (const s of [-1, 1]) hair.add(mesh(sph(0.045, 14, 10), HM, [s * 0.232, -0.028, 0.055], [0.45, 1.0, 0.8]));    // 구레나룻
  } else {
    const open = 3.45;   // 얼굴 쪽만 열린 단발
    hair.add(mesh(new THREE.LatheGeometry(backProf(-0.2, R * 1.0), 64, open / 2, Math.PI * 2 - open), HM, [0, 0, -0.012], [1.04, 1, 1.0]));
  }
  // --- 팔: 어깨 · 팔꿈치 (소매 접음 · 둥근 손)
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.17, 0.25, 0); hips.add(sh);
    sh.add(mesh(cap(0.064, 0.09), M(L.shirt), [s * 0.008, -0.07, 0]));
    sh.add(mesh(new THREE.TorusGeometry(0.06, 0.02, 10, 24), M(L.shirt, 0.9), [s * 0.01, -0.15, 0], [1, 1, 1.4], [Math.PI / 2, 0, 0]));
    const el = new THREE.Group(); el.position.set(s * 0.01, -0.16, 0); sh.add(el);
    el.add(mesh(cap(0.052, 0.03), M(L.skin, 0.6), [0, -0.03, 0]));
    el.add(mesh(sph(0.068, 20, 14), M(L.skin, 0.6), [0, -0.088, 0.004], [0.92, 1.05, 0.88]));
    arms.push({ sh, el, s });
  }
  // --- 다리: 엉덩이 · 무릎 · 둥근 신발
  const legs = [];
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(s * 0.068, -0.02, 0); hips.add(hp);
    hp.add(mesh(cap(0.078, 0.045), M(L.pants), [0, -0.055, 0]));
    const kn = new THREE.Group(); kn.position.set(0, -0.105, 0); hp.add(kn);
    kn.add(mesh(new THREE.CylinderGeometry(0.078, 0.08, 0.07, 20), M(L.pants), [0, -0.03, 0]));
    const foot = new THREE.Group(); foot.position.set(0, -0.1, 0.018); kn.add(foot);
    foot.add(mesh(sph(0.084, 22, 16), M(L.shoe, 0.75), [0, -0.005, 0.014], [1.02, 0.66, 1.32]));
    foot.add(mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.014, 22), M(L.shoe, 0.8), [0, -0.04, 0.014], [1.02, 1, 1.32]));
    legs.push({ hp, kn, s });
  }
  hips.scale.set(1.3, 1.04, 1.26); head.scale.set(1.1 / 1.3, 1.1 / 1.04, 1.1 / 1.26); head.position.y += 0.02;
  const holdPt = new THREE.Group(); holdPt.position.set(0, 0.1, 0.21); hips.add(holdPt);

  // --- 동작
  let pose = 'idle', t = Math.random() * 10, phase = 0, blinkT = 2 + Math.random() * 3, waveT = 0, spd = 0;
  const lerp = (a, b, k) => a + (b - a) * k;
  function update(dt, moving = false, speed = 1) {
    t += dt; spd = lerp(spd, moving ? 1 : 0, Math.min(1, dt * 8));
    if (moving) phase += dt * 10 * speed;
    const sw = Math.sin(phase) * spd, k = Math.min(1, dt * 12);
    const sit = pose === 'sit', carry = pose === 'carry', wave = waveT > 0, bowP = pose === 'bow';
    const bob = Math.abs(Math.sin(phase)) * 0.024 * spd;
    hips.position.y = lerp(hips.position.y, sit ? 0.17 : 0.27 + bob, k);
    hips.rotation.y = Math.sin(phase) * 0.1 * spd; hips.rotation.z = Math.cos(phase) * 0.035 * spd;
    hips.rotation.x = lerp(hips.rotation.x, bowP ? 0.42 : sit ? -0.04 : 0.05 * spd, k * 0.6);
    torso.scale.y = 1 + Math.sin(t * 2.2) * 0.012;
    head.rotation.y = lerp(head.rotation.y, -hips.rotation.y * 0.8 + (pose === 'idle' && !moving ? Math.sin(t * 0.5) * 0.18 : 0), k * 0.5);
    head.rotation.x = lerp(head.rotation.x, bowP ? 0.25 : carry ? 0.12 : Math.sin(t * 0.7) * 0.03, k * 0.5);
    head.rotation.z = lerp(head.rotation.z, Math.cos(phase) * 0.04 * spd, k * 0.5);
    legs.forEach(({ hp, kn, s }) => {
      const a = sit ? -1.45 : sw * s * 0.6, kb = sit ? 1.5 : Math.max(0, -Math.sin(phase + (s > 0 ? 0 : Math.PI)) * 0.7 * spd);
      hp.rotation.x = lerp(hp.rotation.x, a, k); kn.rotation.x = lerp(kn.rotation.x, kb, k); hp.rotation.z = lerp(hp.rotation.z, sit ? s * 0.12 : 0, k);
    });
    if (waveT > 0) waveT -= dt;
    arms.forEach(({ sh, el, s }) => {
      let ax = -sw * s * 0.55, az = s * 0.14, ex = -0.2 - spd * 0.2;
      if (carry) { ax = -1.15; az = s * -0.2; ex = -0.5; }
      if (sit) { ax = -0.95; az = s * -0.12; ex = -0.7; }
      if (bowP) { ax = 0.2; az = s * 0.05; ex = -0.1; }
      if (wave && s > 0) { ax = -0.2; az = 2.5; ex = -0.4 + Math.sin(t * 12) * 0.45; }
      sh.rotation.x = lerp(sh.rotation.x, ax, k); sh.rotation.z = lerp(sh.rotation.z, az, k); el.rotation.x = lerp(el.rotation.x, ex, k);
    });
    blinkT -= dt; const bl = blinkT < 0.12 && blinkT > 0 ? 0.12 : 1.15; if (blinkT < 0) blinkT = 2.5 + Math.random() * 3.5;
    eyes.forEach(e => e.scale.y = lerp(e.scale.y, bl, 0.6));
  }
  function set(p) { if (p === 'wave') { waveT = 1.8; return; } pose = p; }
  update(0.016);
  return { root, set, update, holdPt, get pose() { return pose; }, kind };
}
window.HeukChar3D = { make, LOOK };
})();
