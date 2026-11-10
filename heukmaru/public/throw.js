/* 흙마루 — 물레 성형 모드
   앉으면 물레 클로즈업 화면으로 바뀌고, 드래그로 실제 순서대로 흙을 빚는다.
   순서: 흙 붙이기 → 중심 잡기 → 구멍 내기 → 바닥 넓히기 → 벽 올리기 → 모양 잡기 → 다듬기 → 떼어내기
   난이도: easy(쉬움: 실패 없음, 속도 자동) / real(실전: 속도·물·중심이 결과를 좌우, 실패 있음) */
(() => {
'use strict';
const THREE = window.THREE, V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;

/* ---------- 기물 목표 형태 (높이 0~1에 대한 바깥 반지름) ---------- */
/* ---------- 흙 4종 (색 · 다루는 느낌) ---------- */
const CLAYS = {
  white: { name: '백자토', level: '어려움', desc: '하얗고 매끈해요. 얇게 빚을 수 있지만 중심 잡기가 어렵고 물에 약해요', wet: '#cfc8bd', dry: '#ebe6dd', fired: '#f4f1ea', center: 0.62, soak: 0.42, thin: 0.036, dry_rate: 1.25 },
  buff:  { name: '분청토', level: '보통', desc: '연한 회갈색의 무난한 흙이에요. 처음이라면 이걸로!', wet: '#a99a86', dry: '#cbbfae', fired: '#d9cfc0', center: 0.5, soak: 0.55, thin: 0.042, dry_rate: 1.0 },
  red:   { name: '적토', level: '쉬움', desc: '붉고 거칠어요. 중심이 잘 잡히고 튼튼하지만 얇게 빚긴 어려워요', wet: '#9a5a3d', dry: '#c08060', fired: '#b5654a', center: 0.38, soak: 0.72, thin: 0.052, dry_rate: 0.8 },
  black: { name: '흑토', level: '보통', desc: '짙은 회흑색이에요. 구우면 깊은 검은빛이 나요', wet: '#4a4440', dry: '#6e6761', fired: '#3a3532', center: 0.48, soak: 0.55, thin: 0.044, dry_rate: 1.05 }
};
const VESSELS = {
  cup:    { name: '컵', H: 1.0, floorR: 0.3, pulls: 3, prof: t => 0.42 - 0.03 * t + 0.02 * Math.sin(t * Math.PI) },
  bowl:   { name: '사발', H: 0.62, floorR: 0.34, pulls: 2, prof: t => 0.36 + 0.5 * Math.pow(t, 0.8) },
  bottle: { name: '병', H: 1.3, floorR: 0.3, pulls: 3, prof: t => t < 0.62 ? 0.4 + 0.12 * Math.sin(t / 0.62 * Math.PI * 0.9) : lerp(0.36, 0.15, clamp((t - 0.62) / 0.22, 0, 1)) + (t > 0.94 ? (t - 0.94) * 1.2 : 0) },
  jar:    { name: '항아리', H: 1.1, floorR: 0.32, pulls: 3, prof: t => t < 0.85 ? 0.38 + 0.28 * Math.sin(t / 0.85 * Math.PI) * (t < 0.45 ? 1 : 1) - (t > 0.6 ? (t - 0.6) * 0.5 : 0) : 0.3 + (t - 0.85) * 0.4 },
  goblet: { name: '고블렛잔', H: 1.2, floorR: 0.22, pulls: 3, prof: t => t < 0.12 ? 0.36 - t * 1.0 : t < 0.42 ? 0.14 : 0.14 + 0.32 * Math.sin(clamp((t - 0.42) / 0.58, 0, 1) * Math.PI * 0.5) }
};
const STEPS = [
  { key: 'attach', label: '흙 붙이기', speed: [0, 0.15] },
  { key: 'center', label: '중심 잡기', speed: [0.82, 1.0] },
  { key: 'open',   label: '구멍 내기', speed: [0.6, 0.85] },
  { key: 'widen',  label: '바닥 넓히기', speed: [0.55, 0.8] },
  { key: 'pull',   label: '벽 올리기', speed: [0.38, 0.62] },
  { key: 'shape',  label: '모양 잡기', speed: [0.28, 0.55] },
  { key: 'finish', label: '다듬기', speed: [0.18, 0.45] },
  { key: 'wire',   label: '떼어내기', speed: [0, 0.12] }
];
const N = 44;                     // 세로 단면 샘플 수

/* ---------- 화면 (별도 캔버스) ---------- */
const host = document.createElement('div'); host.id = 'throwMode'; host.hidden = true;
document.body.appendChild(host);
const css = document.createElement('style'); css.textContent = `
#throwMode{position:fixed;inset:0;z-index:30;background:#2a2521;font-family:inherit;color:#f4ece0;touch-action:none;user-select:none;-webkit-user-select:none}
#throwMode[hidden]{display:none}
#throwMode canvas.tw{position:absolute;inset:0;width:100%;height:100%}
#throwMode canvas.guide{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.tw-top{position:absolute;top:12px;left:12px;right:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;pointer-events:none}
.tw-chip{font-size:11px;padding:6px 10px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff1f;color:#cfc4b6;white-space:nowrap}
.tw-chip.on{background:#f3ece2;color:#2f2925;font-weight:700}
.tw-chip.done{color:#9fc39b;border-color:#9fc39b55}
.tw-badge{margin-left:auto;font-size:11px;padding:6px 10px;border-radius:999px;background:#c9583f;color:#fff;font-weight:700}
.tw-badge.easy{background:#5f8f6a}
.tw-tip{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);max-width:92vw;text-align:center;font-size:15px;line-height:1.35;padding:12px 20px;border-radius:999px;background:#1f1b18d9;border:1px solid #ffffff2b;pointer-events:none}
.tw-warn{position:absolute;left:50%;top:64px;transform:translateX(-50%);font-size:14px;padding:9px 16px;border-radius:999px;background:#b5442f;color:#fff;font-weight:700;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap}
.tw-warn.show{opacity:1}
.tw-gauges{position:absolute;left:14px;top:64px;display:flex;flex-direction:column;gap:10px;pointer-events:none;width:132px}
.tw-g{background:#1f1b18cc;border:1px solid #ffffff1f;border-radius:12px;padding:8px 10px}
.tw-g b{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:#e9dfd1;margin-bottom:6px}
.tw-bar{position:relative;height:8px;border-radius:99px;background:#ffffff1c;overflow:hidden}
.tw-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:#8fb6d6}
.tw-bar em{position:absolute;top:0;bottom:0;background:#9fc39b55;border-left:1px solid #9fc39b;border-right:1px solid #9fc39b}
.tw-pedal{position:absolute;right:16px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;background:#1f1b18cc;border:1px solid #ffffff1f;border-radius:16px;padding:12px 10px}
.tw-pedal span{font-size:11px;color:#e9dfd1}
.tw-track{position:relative;width:34px;height:220px;border-radius:12px;background:#ffffff14;touch-action:none;cursor:ns-resize}
.tw-track em{position:absolute;left:0;right:0;background:#9fc39b40;border-top:1px solid #9fc39b;border-bottom:1px solid #9fc39b}
.tw-track i{position:absolute;left:3px;right:3px;height:22px;border-radius:8px;background:#f3ece2;box-shadow:0 2px 8px #0006}
.tw-pedal.auto{opacity:.55}
.tw-pedal .kbd,.tw-dock .kbd{font-size:10px;color:#a99b8b;font-weight:600}
.tw-dock .kbd{margin-left:6px;padding:1px 5px;border:1px solid #ffffff33;border-radius:5px}
.tw-pedal.drift{box-shadow:0 0 0 2px #e2683f}
.tw-sec-view{position:absolute;left:14px;top:262px;width:132px;background:#1f1b18cc;border:1px solid #ffffff1f;border-radius:12px;padding:6px 6px 4px;pointer-events:none}
.tw-sec-view[hidden]{display:none}
.tw-sec-view b{display:block;font-size:11px;color:#e9dfd1;margin:0 0 2px 4px}
.tw-sec-view canvas{width:120px;height:136px;display:block}
.tw-coning{letter-spacing:2px}
.tw-dock{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:8px;padding:8px;border-radius:999px;background:#1f1c1acc;border:1px solid #ffffff1c}
.tw-dock button,.tw-card button{font-family:inherit;font-size:14px;font-weight:700;padding:12px 18px;border-radius:999px;border:1px solid #ffffff38;background:#3a3430;color:#f6efe4;cursor:pointer;white-space:nowrap}
.tw-dock button.pri{background:#f3ece2;color:#2f2925;border-color:#f3ece2}
.tw-card button{background:#efe6d8;color:#3a2f27;border-color:#d9cbb6}
.tw-card button.pri{background:#3a2f27;color:#fff;border-color:#3a2f27}
.tw-dock button:disabled{opacity:.35;cursor:default}
.tw-tools{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);display:flex;gap:8px}
.tw-tools[hidden]{display:none}
.tw-tools button{font-family:inherit;width:74px;padding:9px 0 7px;border-radius:16px;border:1px solid #ffffff2b;background:#1f1b18d9;color:#efe6d8;font-size:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.tw-tools button svg{width:26px;height:26px}
.tw-tools button.on{background:#f3ece2;color:#2f2925}
.tw-tools button.need::after{content:"";position:absolute;margin:-6px 0 0 30px;width:8px;height:8px;border-radius:50%;background:#e2683f}
.tw-veil{position:absolute;inset:0;display:grid;place-items:center;background:#1c1916d9;z-index:5}
.tw-veil[hidden]{display:none}
.tw-card{background:#f6f1e8;color:#2f2925;border-radius:24px;padding:22px;max-width:94vw;width:560px;max-height:94vh;overflow:auto;text-align:center;box-shadow:0 20px 60px #0008}
.tw-card h2{margin:0 0 4px;font-size:21px}.tw-card p{margin:0 0 14px;font-size:13px;color:#7a6d60}
.tw-ves{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}
.tw-ves button{background:#fff;border:2px solid #e3d8c8;border-radius:16px;padding:8px 2px 6px;font-size:12px;font-weight:700;color:#3a322b;display:flex;flex-direction:column;align-items:center;gap:4px}
.tw-ves button.on{border-color:#a8875f;background:#fbf5ea}
.tw-ves canvas{width:52px;height:62px}
.tw-mode{display:flex;gap:8px;justify-content:center;margin-bottom:16px}
.tw-mode button{flex:1;max-width:240px;text-align:left;white-space:normal;line-height:1.35;font-weight:500;background:#fff;border:2px solid #e3d8c8;border-radius:14px;padding:10px 12px;color:#3a322b;font-size:13px}
.tw-mode button b{display:block;font-size:14px;margin-bottom:2px}
.tw-mode button.on{border-color:#a8875f;background:#fbf5ea}
.tw-sec{text-align:left;font-size:12px;font-weight:700;color:#8a7a68;margin:2px 0 6px}
.tw-clays{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:6px}
.tw-clays button{background:#fff;border:2px solid #e3d8c8;border-radius:14px;padding:8px 4px;font-family:inherit;font-size:13px;font-weight:700;color:#3a322b;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}
.tw-clays button i{width:34px;height:34px;border-radius:50%;box-shadow:inset 0 -5px 8px #0003, inset 0 3px 5px #fff6}
.tw-clays button small{font-size:10px;font-weight:600;color:#9a8b7a}
.tw-clays button.on{border-color:#a8875f;background:#fbf5ea}
.tw-clay-desc{font-size:12px;color:#6d6052;text-align:left;margin:0 0 12px;min-height:16px}
.tw-stars{font-size:34px;letter-spacing:4px;color:#d9a441;margin:4px 0 6px}
.tw-scores{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;text-align:left;font-size:13px;margin:10px 0 14px}
.tw-scores div{display:flex;justify-content:space-between;border-bottom:1px dashed #d9cdbb;padding-bottom:3px}
.tw-say{background:#efe5d6;border-radius:14px;padding:10px 12px;font-size:13px;margin-bottom:14px;text-align:left}
.tw-fail{font-size:40px;margin-bottom:4px}
@media (max-width:700px), (pointer:coarse){ .tw-pedal .kbd,.tw-dock .kbd{display:none} }
@media (max-width:700px){
 .tw-sec-view{top:96px;left:auto;right:8px;width:92px;padding:4px}.tw-sec-view canvas{width:84px;height:96px}.tw-sec-view b{font-size:10px}
 .tw-gauges{width:104px;top:96px;bottom:auto;left:8px;gap:6px}.tw-g{padding:6px 8px}
 .tw-pedal{right:8px;padding:8px 6px}.tw-track{height:160px;width:28px}
 .tw-tip{bottom:150px;font-size:13px;border-radius:16px}
 .tw-dock{bottom:14px;flex-wrap:wrap;justify-content:center;border-radius:22px;width:calc(100vw - 20px)}
 .tw-dock button{padding:10px 13px;font-size:13px}
 .tw-tools{bottom:236px}.tw-tools button{width:62px}
 .tw-ves{grid-template-columns:repeat(3,1fr)}.tw-clays{grid-template-columns:repeat(2,1fr)}.tw-card{max-height:92vh;overflow:auto}
 .tw-chip{font-size:10px;padding:4px 7px}
}`;
document.head.appendChild(css);

host.innerHTML = `
<canvas class="tw"></canvas><canvas class="guide"></canvas>
<div class="tw-top"></div>
<div class="tw-warn"></div>
<div class="tw-gauges">
  <div class="tw-g" data-g="water"><b>물기 <span></span></b><div class="tw-bar"><em style="left:35%;width:45%"></em><i></i></div></div>
  <div class="tw-g" data-g="wobble"><b>흔들림 <span></span></b><div class="tw-bar"><em style="left:0;width:15%"></em><i style="background:#e2a35f"></i></div></div>
  <div class="tw-g" data-g="extra"><b><span class="lbl">바닥 두께</span> <span class="val"></span></b><div class="tw-bar"><em></em><i style="background:#c9a27a"></i></div></div>
</div>
<div class="tw-pedal"><span>페달</span><div class="tw-track"><em></em><i></i></div><span class="spd">0%</span><small class="kbd">↑↓ 키</small></div>
<div class="tw-sec-view"><b>단면</b><canvas width="150" height="170"></canvas></div>
<div class="tw-tools" hidden></div>
<div class="tw-tip"></div>
<div class="tw-dock">
  <button data-a="water">💧 물 묻히기<small class="kbd">Space</small></button>
  <button data-a="next" class="pri">다음 단계</button>
  <button data-a="redo">다시 빚기</button>
  <button data-a="leave">일어서기</button>
</div>
<div class="tw-veil" data-v="setup"><div class="tw-card">
  <h2>무엇을 빚을까요?</h2><p>흙 → 기물 → 난이도 순서로 골라요</p>
  <div class="tw-sec">① 흙</div><div class="tw-clays"></div><div class="tw-clay-desc"></div>
  <div class="tw-sec">② 기물</div>
  <div class="tw-ves"></div>
  <div class="tw-sec">③ 난이도</div>
  <div class="tw-mode">
    <button data-m="easy"><b>🌱 쉬움</b>실패 없이 순서만 따라가요. 속도는 자동이에요.</button>
    <button data-m="real" class="on"><b>🔥 실전</b>속도·물·중심이 결과를 좌우해요. 주저앉을 수도 있어요.</button>
  </div>
  <button class="pri" data-a="start" style="min-width:200px">물레 돌리기</button>
  <div style="height:8px"></div><button data-a="leave">그만두기</button>
</div></div>
<div class="tw-veil" data-v="result" hidden><div class="tw-card"></div></div>`;
const $ = s => host.querySelector(s);
const cv = $('canvas.tw'), guide = $('canvas.guide'), gctx = guide.getContext('2d');

/* ---------- 3D 장면 ---------- */
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
const S = new THREE.Scene(); S.background = new THREE.Color('#2a2521');
S.fog = new THREE.Fog('#2a2521', 7, 14);
const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
const CAM_POS = V(0, 3.3, 4.7), CAM_LOOK = V(0, 0.4, 0);
S.add(new THREE.HemisphereLight('#fff1dc', '#4a3d33', 0.9));
const key = new THREE.DirectionalLight('#ffe7c8', 2.2); key.position.set(2.5, 5, 3); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); S.add(key);
const rim = new THREE.DirectionalLight('#cfe0ff', 0.8); rim.position.set(-3, 3, -3); S.add(rim);
const M = (c, r = 0.8, m = 0, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...x });
function mesh(g, m, x = 0, y = 0, z = 0, p = S) { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; p.add(k); return k; }
// 바닥·작업대
mesh(new THREE.CircleGeometry(9, 48), M('#5b4d42', 0.95), 0, -0.62, 0).rotation.x = -Math.PI / 2;
// 물레 몸통 + 물받이 + 회전판
mesh(new THREE.BoxGeometry(2.3, 0.5, 2.3), M('#7d7c79', 0.7, 0.2), 0, -0.4, 0);
const panPts = [[0, 0], [1.55, 0], [1.62, 0.04], [1.66, 0.42], [1.58, 0.44], [1.53, 0.06], [0, 0.06]].map(([a, b]) => new THREE.Vector2(a, b));
mesh(new THREE.LatheGeometry(panPts, 64), M('#f1ede6', 0.45, 0, { side: THREE.DoubleSide }), 0, -0.16, 0);
const slip = mesh(new THREE.RingGeometry(1.08, 1.5, 64), M('#a98a6c', 0.25, 0, { transparent: true, opacity: 0.0 }), 0, -0.095, 0); slip.rotation.x = -Math.PI / 2;
const head = mesh(new THREE.CylinderGeometry(1.05, 1.02, 0.1, 64), M('#5f5e5b', 0.45, 0.45), 0, -0.05, 0);
const headMark = mesh(new THREE.BoxGeometry(0.06, 0.012, 0.9), M('#8d8b86', 0.4, 0.5), 0, 0.002, 0.0, head); headMark.position.set(0, 0.051, 0.5);
// 흙 표면 텍스처 (회전이 보이도록 자국·물레선)
const clayTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#ece6de'; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 6) { g.fillStyle = `rgba(80,50,30,${0.05 + Math.random() * 0.07})`; g.fillRect(0, y, 512, 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,235,210' : '70,40,25'},${Math.random() * 0.18})`; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 256, 2 + Math.random() * 10, 1 + Math.random() * 3, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })();
const clayMat = new THREE.MeshPhysicalMaterial({ color: '#c49c78', map: clayTex, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
const clayGroup = new THREE.Group(); clayGroup.position.y = 0.0; S.add(clayGroup);
const clay = new THREE.Mesh(new THREE.BufferGeometry(), clayMat); clay.castShadow = clay.receiveShadow = true; clayGroup.add(clay);
// 와이어 선
const wireLine = mesh(new THREE.CylinderGeometry(0.008, 0.008, 3, 6), M('#d9d9d9', 0.3, 0.8), 0, 0.02, 0); wireLine.rotation.z = Math.PI / 2; wireLine.visible = false;

/* ---------- 손과 도구 ---------- */
/* 손: 원점 = 가운데 손가락 끝(흙에 닿는 점). 손가락은 로컬 +X 방향, 손목·팔은 -X 쪽.
   pose 그룹을 X축으로 굴려(roll) 손가락이 세로로 쌓이거나(0) 앞뒤로 쌓이게(π/2) 한다. */
const FR = 0.032;                                     // 손가락 반지름 = 흙에서 띄우는 거리
function makeHand(skin) {
  const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose);
  const sk = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62, transparent: true, opacity: 1 });
  const sleeve = new THREE.MeshStandardMaterial({ color: '#e9e1d3', roughness: 0.9, transparent: true, opacity: 1 });
  const cap = (r, len, x, y, z, rz = 0, mat = sk) => { const m = mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat, x, y, z, pose); m.rotation.z = Math.PI / 2 + rz; return m; };
  // 손가락 4개 (끝이 x=0 근처, 약간 둥글게 휘도록 길이 차이)
  [[0.052, 0.15, -0.004], [0.017, 0.17, 0], [-0.018, 0.16, -0.006], [-0.052, 0.13, -0.02]].forEach(([y, len, dx]) => cap(FR * (y < -0.04 ? 0.85 : 1), len, -len / 2 - FR + dx, y, 0));
  const palm = mesh(new THREE.SphereGeometry(1, 24, 16), sk, -0.29, 0, 0, pose); palm.scale.set(0.13, 0.095, 0.05);
  const thumb = cap(FR * 1.1, 0.11, -0.2, 0.1, 0.03, -0.75);
  const wrist = cap(0.075, 0.12, -0.44, 0, 0);
  const arm = cap(0.1, 0.5, -0.82, 0, 0, 0, sleeve);
  g.userData = { pose, mats: [sk, sleeve], arm, skin: sk };
  S.add(g); return g;
}
/* 손 놓기: tip = 닿는 점(월드), dir = 손가락이 향하는 방향 각도(XY 화면 평면, 0=오른쪽, -90=아래), roll = 손가락 쌓임(0 세로 / 1 앞뒤) */
function poseHand(h, tip, dirDeg, roll = 0, alpha = 1, yaw = 0) {
  h.visible = true; h.position.copy(tip); h.scale.setScalar(0.85);
  h.rotation.set(0, yaw, dirDeg * Math.PI / 180);
  h.userData.pose.rotation.x = roll * Math.PI / 2;
  h.userData.mats.forEach(m => { m.opacity = alpha; m.depthWrite = alpha > 0.9; });
}
let handL, handR;
const tools = (() => {
  const t = {};
  t.sponge = new THREE.Group(); mesh(new THREE.BoxGeometry(0.22, 0.1, 0.16), M('#e6c35c', 1), 0, 0, 0, t.sponge);
  t.needle = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 12), M('#b07d4f', 0.7), 0, 0.25, 0, t.needle); mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.32, 6), M('#ddd', 0.3, 0.9), 0, -0.1, 0, t.needle);
  t.rib = new THREE.Group(); { const sh = new THREE.Shape(); sh.moveTo(-0.125, 0.11); sh.quadraticCurveTo(-0.14, 0, -0.125, -0.11); sh.lineTo(0.12, -0.08); sh.quadraticCurveTo(0.16, 0, 0.12, 0.08); sh.closePath(); mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }), M('#c8955c', 0.7), 0, 0, -0.012, t.rib); }
  t.chamois = new THREE.Group(); mesh(new THREE.BoxGeometry(0.2, 0.025, 0.2), M('#e7d6b4', 1), 0, 0, 0, t.chamois);
  t.wireL = new THREE.Group(); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), M('#7a5434', 0.7), 0, 0, 0, t.wireL);
  t.wireR = t.wireL.clone();
  Object.values(t).forEach(o => { o.visible = false; o.traverse(m => { if (m.isMesh) m.castShadow = true; }); S.add(o); });
  return t;
})();

/* ---------- 상태 ---------- */
const st = {
  active: false, mode: 'real', vessel: 'cup', clay: 'buff', step: 0, speed: 0, rot: 0,
  wet: 0.7, soak: 0, pool: 0, wobble: 0.6, dryHits: 0, speedMiss: 0,
  // 덩어리
  lumpR: 0.72, lumpH: 0.62, vol: 0, cone: 0, coneCycles: 0, coneDir: 0, attachX: 0.32, attachZ: -0.12, attached: false,
  depth: 0, floorT: 0.62, floorR: 0.08,
  // 열린 뒤
  H: 0.6, r: new Float32Array(N), t: new Float32Array(N), pulls: 0, uneven: 0, rimRough: 0, failed: null,
  finish: { sponge: false, needle: false, rib: false, chamois: false }, tool: null, wireCut: 0, shapeScore: 0,
  drag: null, warnUntil: 0, onExit: null, say: null, opened: false, demoT0: 0, lastInput: 0, demoOn: false, shapeMode: 'out', drift: 0
};
const VOL0 = Math.PI * 0.72 * 0.72 * 0.62 * 0.78;

/* ---------- 흙 형상 만들기 ---------- */
function lumpRadius(y) {                 // 열기 전 덩어리 단면
  const h = st.lumpH, R0 = st.lumpR, u = clamp(y / h, 0, 1);
  return R0 * Math.pow(1 - Math.pow(u, 3.2), 0.42) * (1 - st.cone * 0.38 * u) + 0.002;
}
function rebuildLumpFromVolume() { st.lumpR = Math.sqrt(VOL0 / (Math.PI * st.lumpH * 0.78 * (1 - st.cone * 0.25))); }
function buildClay() {
  const pts = [];
  if (!st.opened) {
    const h = st.lumpH, top = st.step >= 2 ? h : h;
    pts.push(new THREE.Vector2(0.001, 0));
    for (let i = 0; i <= 26; i++) { const y = h * i / 26; pts.push(new THREE.Vector2(lumpRadius(y), y)); }
    if (st.depth > 0.01) {                // 구멍 내는 중: 위에서 아래로 파인 홈
      const d = st.depth, hr = 0.09 + st.floorR * 0.6;
      pts.push(new THREE.Vector2(hr + 0.06, h + 0.015)); pts.push(new THREE.Vector2(hr, h - 0.02));
      pts.push(new THREE.Vector2(hr * 0.8, h - d)); pts.push(new THREE.Vector2(0.001, h - d - 0.01));
    } else pts.push(new THREE.Vector2(0.001, h));
  } else {
    const H = st.H, ft = st.floorT;
    pts.push(new THREE.Vector2(0.001, 0));
    pts.push(new THREE.Vector2(st.r[0] * 0.97, 0));
    for (let i = 0; i < N; i++) pts.push(new THREE.Vector2(st.r[i], H * i / (N - 1)));
    const tt = st.t[N - 1];
    pts.push(new THREE.Vector2(st.r[N - 1] - tt * 0.15, H + tt * 0.3));
    pts.push(new THREE.Vector2(st.r[N - 1] - tt * 0.85, H + tt * 0.25));
    for (let i = N - 1; i >= 0; i--) { const y = H * i / (N - 1); if (y < ft) break; pts.push(new THREE.Vector2(Math.max(0.02, st.r[i] - st.t[i]), y)); }
    pts.push(new THREE.Vector2(Math.max(0.02, st.r[0] - st.t[0]) * 0.92, ft));
    pts.push(new THREE.Vector2(0.001, ft));
  }
  const g = new THREE.LatheGeometry(pts, 72); g.computeVertexNormals();
  clay.geometry.dispose(); clay.geometry = g;
}
function rAt(y) { const i = clamp(y / st.H * (N - 1), 0, N - 1), a = Math.floor(i), b = Math.min(N - 1, a + 1); return lerp(st.r[a], st.r[b], i - a); }
function tAt(y) { const i = clamp(y / st.H * (N - 1), 0, N - 1), a = Math.floor(i), b = Math.min(N - 1, a + 1); return lerp(st.t[a], st.t[b], i - a); }

/* ---------- HUD ---------- */
const chips = $('.tw-top');
function renderChips() {
  chips.innerHTML = STEPS.map((s, i) => `<span class="tw-chip ${i === st.step ? 'on' : i < st.step ? 'done' : ''}">${i < st.step ? '✓ ' : ''}${s.label}${s.key === 'pull' && i === st.step ? ` ${Math.min(st.pulls, VESSELS[st.vessel].pulls)}/${VESSELS[st.vessel].pulls}${st.pulls > VESSELS[st.vessel].pulls ? ' +' + (st.pulls - VESSELS[st.vessel].pulls) : ''}` : ''}</span>`).join('') +
    `<span class="tw-badge ${st.mode === 'easy' ? 'easy' : ''}">${CLAYS[st.clay].name} ${VESSELS[st.vessel].name} · ${st.mode === 'easy' ? '쉬움' : '실전'}</span>`;
}
const tipEl = $('.tw-tip'), warnEl = $('.tw-warn');
function tip(t) { tipEl.textContent = t; }
function warn(t, ms = 1800) { warnEl.textContent = t; warnEl.classList.add('show'); st.warnUntil = performance.now() + ms; }
function gauge(name, v, label, band, valTxt) {
  const g = host.querySelector(`[data-g="${name}"]`); if (!g) return;
  g.querySelector('i').style.width = (clamp(v, 0, 1) * 100) + '%';
  if (band) { const em = g.querySelector('em'); em.style.left = band[0] * 100 + '%'; em.style.width = (band[1] - band[0]) * 100 + '%'; }
  if (label) g.querySelector('.lbl') && (g.querySelector('.lbl').textContent = label);
  const vs = g.querySelector('.val') || g.querySelector('b span'); if (vs && valTxt !== undefined) vs.textContent = valTxt;
}
const pedal = $('.tw-pedal'), track = $('.tw-track'), knob = track.querySelector('i'), band = track.querySelector('em');
function renderPedal() {
  const s = STEPS[st.step].speed, h = track.clientHeight || 220;
  band.style.bottom = s[0] * 100 + '%'; band.style.height = (s[1] - s[0]) * 100 + '%';
  knob.style.bottom = `calc(${st.speed * 100}% - ${st.speed * 22}px)`;
  pedal.querySelector('.spd').textContent = Math.round(st.speed * 100) + '%';
  pedal.classList.toggle('auto', st.mode === 'easy');
}
let pedalDrag = false;
function pedalFromEvent(e) { const r = track.getBoundingClientRect(); st.speed = clamp(1 - (e.clientY - r.top) / r.height, 0, 1); }
track.addEventListener('pointerdown', e => { if (st.mode === 'easy') return warn('쉬움 모드는 속도가 자동이에요', 1200); pedalDrag = true; st.autoPedal = false; track.setPointerCapture(e.pointerId); pedalFromEvent(e); e.stopPropagation(); });
track.addEventListener('pointermove', e => { if (pedalDrag) pedalFromEvent(e); });
track.addEventListener('pointerup', () => { pedalDrag = false; });
function speedOK() { const s = STEPS[st.step].speed; return st.speed >= s[0] - 0.02 && st.speed <= s[1] + 0.02; }

const toolBar = $('.tw-tools');
const ICON = {
  sponge: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="3" fill="#e6c35c"/><circle cx="8" cy="11" r="1.2" fill="#b8902f"/><circle cx="14" cy="13" r="1.2" fill="#b8902f"/><circle cx="17" cy="10" r="1" fill="#b8902f"/></svg>',
  needle: '<svg viewBox="0 0 24 24"><rect x="10" y="2" width="4" height="10" rx="2" fill="#b07d4f"/><path d="M12 12v10" stroke="#888" stroke-width="1.6"/></svg>',
  rib: '<svg viewBox="0 0 24 24"><path d="M4 18 L20 18 L12 5 Z" fill="#c8955c"/></svg>',
  chamois: '<svg viewBox="0 0 24 24"><path d="M4 9c3-3 13-3 16 0v6c-3 3-13 3-16 0z" fill="#e7d6b4"/></svg>'
};
const SHAPE_ICON = {
  out: '<svg viewBox="0 0 24 24"><path d="M8 4c-4 4-4 12 0 16M16 4c4 4 4 12 0 16" stroke="#c9a27a" stroke-width="2.4" fill="none"/><path d="M3 12h4M17 12h4M5 10l-2 2 2 2M19 10l2 2-2 2" stroke="#e9c35a" stroke-width="1.8" fill="none"/></svg>',
  in: '<svg viewBox="0 0 24 24"><path d="M6 4c4 4 4 12 0 16M18 4c-4 4-4 12 0 16" stroke="#c9a27a" stroke-width="2.4" fill="none"/><path d="M1 12h5M18 12h5M4 10l2 2-2 2M20 10l-2 2 2 2" stroke="#e9c35a" stroke-width="1.8" fill="none"/></svg>'
};
const TOOL_INFO = {
  sponge: ['스펀지', '안쪽 바닥을 눌러 고인 물을 빨아내요'],
  needle: ['니들', '윗단을 옆으로 그어 들쭉날쭉한 입술을 잘라내요'],
  rib: ['나무칼', '바깥 아랫부분을 위로 쓸어 군살을 정리해요'],
  chamois: ['가죽', '입술(윗단)을 따라 옆으로 문질러 매끈하게 해요']
};
function renderTools() {
  const sk = STEPS[st.step].key;
  if (sk === 'shape') {
    toolBar.hidden = false;
    toolBar.innerHTML = `<button data-s="out" class="${st.shapeMode === 'out' ? 'on' : ''}" style="width:110px">${SHAPE_ICON.out}부풀리기</button><button data-s="in" class="${st.shapeMode === 'in' ? 'on' : ''}" style="width:110px">${SHAPE_ICON.in}조이기</button>`;
    toolBar.querySelectorAll('button').forEach(b => b.onclick = () => { st.shapeMode = b.dataset.s; st.demoT0 = performance.now(); tip(STEP_TIP.shape()); renderTools(); });
    return;
  }
  toolBar.hidden = sk !== 'finish';
  toolBar.innerHTML = Object.keys(TOOL_INFO).map(k => `<button data-t="${k}" class="${st.tool === k ? 'on' : ''}">${ICON[k]}${TOOL_INFO[k][0]}${st.finish[k] ? ' ✓' : ''}</button>`).join('');
  toolBar.querySelectorAll('button').forEach(b => b.onclick = () => { st.tool = b.dataset.t; tip(TOOL_INFO[st.tool][1]); renderTools(); });
}

/* ---------- 단계 진행 ---------- */
const STEP_TIP = {
  attach: () => '흙을 물레 가운데로 끌어다 놓아요. 가운데에 가까울수록 흔들림이 적어요',
  center: () => '흙을 아래에서 위로 끌어올려 기둥을 만들고, 다시 위에서 눌러 내려요 (코닝). ' + (st.mode === 'easy' ? '1번이면 통과!' : '2번 이상, 흔들림이 초록 칸에 오면 통과!'),
  open: () => '흙 가운데를 꾹 누르고 있어요. 바닥 두께가 초록 칸에 오면 손을 떼요',
  widen: () => '구멍 안쪽을 바깥으로 끌어 바닥을 넓혀요. 초록 칸까지!',
  pull: () => st.pulls >= VESSELS[st.vessel].pulls ? '벽 높이가 충분해요. 다음 단계로 가요 (한 번 더 올려도 돼요)' : `흙 아래쪽을 눌러 위로 천천히 끌어 올려요 (1~2초). ${st.pulls}/${VESSELS[st.vessel].pulls}번`,
  shape: () => st.shapeMode === 'in' ? '조이기: 점선보다 넓은 높이를 문지르면 안으로 들어가요' : '부풀리기: 점선보다 좁은 높이를 문지르면 바깥으로 나와요',
  finish: () => '아래 도구로 마무리해요. 빨간 점이 있는 도구는 꼭 필요한 작업이에요',
  wire: () => '페달을 멈추고, 와이어를 바닥을 따라 옆으로 끝까지 그어 떼어내요'
};
function enterStep(i) {
  st.step = i; st.drag = null; st.tool = null;
  const k = STEPS[i].key;
  st.demoT0 = st.lastInput = performance.now();
  st.speedTarget = (STEPS[i].speed[0] + STEPS[i].speed[1]) / 2; st.autoPedal = true;   // 단계 시작: 페달 자동으로 적정 속도
  st.drift = 0;
  if (k === 'finish') {
    st.tool = 'sponge'; tip(TOOL_INFO.sponge[1]);
  } else tip(STEP_TIP[k]());
  renderChips(); renderPedal(); renderTools(); updateNext();
  wireLine.visible = k === 'wire';
  if (k === 'center') say('물 묻히고, 팔꿈치는 허벅지에 고정!');
  if (k === 'pull') say('안쪽 손과 바깥 손 사이 간격을 일정하게요');
  if (k === 'shape') { say('조금씩, 여러 번 나눠서 밀어요'); computeShapeScore(); st.shapeMode = (() => { let o = 0; for (let i = 0; i < N; i++) o += VESSELS[st.vessel].prof(i / (N - 1)) - st.r[i]; return o > 0 ? 'out' : 'in'; })(); tip(STEP_TIP.shape()); renderTools(); }
}
function canNext() {
  const k = STEPS[st.step].key, v = VESSELS[st.vessel];
  if (st.failed) return false;
  if (k === 'attach') return st.attached;
  if (k === 'center') return st.mode === 'easy' ? st.coneCycles >= 1 && st.wobble < 0.35 : st.coneCycles >= 2 && st.wobble < 0.14;
  if (k === 'open') return st.mode === 'easy' ? st.depth > 0.25 : st.floorT >= 0.09 && st.floorT <= 0.2;
  if (k === 'widen') return st.floorR >= v.floorR * (st.mode === 'easy' ? 0.75 : 0.88);
  if (k === 'pull') return st.pulls >= (st.mode === 'easy' ? 1 : 2) && st.H >= v.H * (st.mode === 'easy' ? 0.6 : 0.82);
  if (k === 'shape') return st.mode === 'easy' || st.shapeScore >= 0.55;
  if (k === 'finish') return st.mode === 'easy' || (st.finish.sponge || st.pool < 0.15) && (st.finish.needle || st.rimRough < 0.12);
  if (k === 'wire') return st.wireCut >= 1;
  return true;
}
const nextBtn = $('[data-a="next"]');
function updateNext() { nextBtn.disabled = !canNext(); nextBtn.textContent = STEPS[st.step].key === 'wire' ? '완성!' : '다음 단계'; }
function next() {
  if (!canNext()) return;
  const k = STEPS[st.step].key;
  if (k === 'open' && st.mode === 'easy' && st.floorT > 0.2) { st.depth = st.lumpH - 0.15; st.floorT = 0.15; }
  if (k === 'open') openUp();
  if (k === 'wire') return finishPiece();
  enterStep(st.step + 1);
}
function openUp() {                       // 덩어리 → 열린 형태로 전환
  st.opened = true; st.H = st.lumpH;
  for (let i = 0; i < N; i++) { const y = st.H * i / (N - 1); st.r[i] = Math.max(lumpRadius(Math.min(y, st.H * 0.85)), 0.3); st.t[i] = Math.max(0.12, st.r[i] - (0.12 + st.floorR * 0.5)); }
  st.floorR = 0.12; st.depth = 0; buildClay();
}

/* ---------- 입력: 화면 → 흙 단면 좌표 ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const plane = new THREE.Plane(), hit = V();
function frontR() { return st.opened ? rAt(st.H * 0.5) * 0.85 : lumpRadius(st.lumpH * 0.5) * 0.85; }
function toClay(e) {
  const r = cv.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const n = V(cam.position.x, 0, cam.position.z).normalize();
  plane.setFromNormalAndCoplanarPoint(n, n.clone().multiplyScalar(frontR()));   // 보이는 앞면 높이로 읽기
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  const right = V(n.z, 0, -n.x);
  return { x: hit.dot(right), y: hit.y, gx: hit.x, gz: hit.z };
}
function groundHit(e) {
  const r = cv.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam); const p = V(); return ray.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), 0), p) ? p : null;
}
cv.addEventListener('pointerdown', e => {
  if (!st.active || st.failed) return; cv.setPointerCapture(e.pointerId);
  const c = toClay(e); if (!c) return;
  st.drag = { x0: c.x, y0: c.y, x: c.x, y: c.y, t0: performance.now(), lastX: c.x, lastY: c.y, minY: c.y, maxY: c.y, g: groundHit(e), sx: e.clientX - cv.getBoundingClientRect().left, sy: e.clientY - cv.getBoundingClientRect().top }; st.lastInput = performance.now(); st.drift = (Math.random() < 0.5 ? -1 : 1) * 0.02;
  onDragStart(c);
});
cv.addEventListener('pointermove', e => { if (!st.drag) return; const c = toClay(e); if (!c) return; const d = st.drag; d.dx = c.x - d.lastX; d.dy = c.y - d.lastY; d.lastX = d.x; d.lastY = d.y; d.x = c.x; d.y = c.y; d.minY = Math.min(d.minY, c.y); d.maxY = Math.max(d.maxY, c.y); d.g = groundHit(e); d.sx = e.clientX - cv.getBoundingClientRect().left; d.sy = e.clientY - cv.getBoundingClientRect().top; onDragMove(c, d); d.lastX = c.x; d.lastY = c.y; });
const endDrag = () => { if (!st.drag) return; st.lastInput = performance.now(); onDragEnd(st.drag); st.drag = null; };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

/* ---------- 단계별 조작 규칙 ---------- */
function frictionCheck(dt, strength = 1) {      // 물기가 부족하면 흙이 손에 걸림
  if (st.wet < 0.18) {
    if (st.mode === 'real') { st.wobble = Math.min(1, st.wobble + 0.25 * dt * strength); st.dryHits += dt; }
    if (performance.now() > st.warnUntil) warn('흙이 말랐어요. 물을 묻혀요 💧');
    return false;
  }
  return true;
}
function speedCheck() {
  if (st.mode === 'easy' || speedOK()) return true;
  const s = STEPS[st.step].speed; st.speedMiss += 0.016;
  if (performance.now() > st.warnUntil) warn(st.speed < s[0] ? '페달을 더 밟아 속도를 올려요' : '너무 빨라요. 페달을 살살!');
  return false;
}
function onDragStart(c) {
  const k = STEPS[st.step].key;
  if (k === 'pull') { st.drag.pullStartOK = c.y < st.H * 0.3; if (!st.drag.pullStartOK) tip('벽 올리기는 맨 아래(바닥 쪽)에서 시작해요'); }
  if (k === 'finish' && st.tool === 'sponge') { if (st.pool > 0.01) { st.pool = 0; st.finish.sponge = true; warn('고인 물을 빨아냈어요 ✓', 1200); } else { st.finish.sponge = true; warn('안쪽이 깨끗해요 ✓', 1000); } renderTools(); updateNext(); }
}
function onDragMove(c, d) {
  const k = STEPS[st.step].key, dt = 0.016;
  if (k === 'attach') {
    if (d.g) { st.attachX = clamp(d.g.x, -0.9, 0.9); st.attachZ = clamp(d.g.z, -0.9, 0.9); }
    return;
  }
  if (k === 'center') {
    if (!speedCheck()) return;
    const wetOK = frictionCheck(dt, 1);
    if (d.dy > 0) { st.cone = clamp(st.cone + d.dy * 1.6, 0, 1); st.lumpH = clamp(st.lumpH + d.dy * 0.9, 0.5, 1.05); if (st.cone > 0.85 && st.coneDir !== 1) st.coneDir = 1; }
    else if (d.dy < 0) { st.cone = clamp(st.cone + d.dy * 1.6, 0, 1); st.lumpH = clamp(st.lumpH + d.dy * 0.9, 0.5, 1.05);
      if (st.coneDir === 1 && st.cone < 0.12) { st.coneDir = 0; st.coneCycles++; st.wobble *= wetOK ? (st.mode === 'easy' ? 0.35 : CLAYS[st.clay].center) : 0.92; warn(`코닝 ${st.coneCycles}번 ✓`, 900); } }
    const fast = Math.abs(d.dy) / dt;
    if (st.mode === 'real' && fast > 4.5) { st.wobble = Math.min(1, st.wobble + 0.02); if (performance.now() > st.warnUntil) warn('너무 빨리 움직여요. 천천히!'); }
    else if (wetOK) st.wobble = Math.max(0.02, st.wobble - 0.03 * dt);
    st.wet = Math.max(0, st.wet - 0.06 * dt); rebuildLumpFromVolume(); buildClay();
  }
  if (k === 'widen') {
    if (!speedCheck()) return;
    if (!frictionCheck(dt, 0.5)) return;
    const want = Math.abs(c.x); const v = VESSELS[st.vessel];
    if (want > st.floorR) st.floorR = clamp(lerp(st.floorR, want, 0.12), 0.08, Math.min(v.floorR * 1.25, rAt(0.05) - 0.1));
    for (let i = 0; i < N; i++) st.t[i] = Math.max(0.1, Math.min(st.t[i], st.r[i] - st.floorR));
    st.wet = Math.max(0, st.wet - 0.04 * dt); buildClay();
  }
  if (k === 'pull' && d.pullStartOK) { st.wet = Math.max(0, st.wet - 0.08 * dt); frictionCheck(dt, 1.2); }
  if (k === 'shape') {
    if (!speedCheck()) return;
    if (!frictionCheck(dt, 0.8)) return;
    const y0 = clamp(c.y, 0.02, st.H), push = (st.shapeMode === 'in' ? -1 : 1) * Math.hypot(d.dx || 0, (d.dy || 0) * 0.5) * 0.6, sig = st.H * 0.13;
    if (Math.abs(push) < 1e-4) return;
    for (let i = 0; i < N; i++) {
      const y = st.H * i / (N - 1), w = Math.exp(-((y - y0) ** 2) / (2 * sig * sig));
      const dr = push * 0.75 * w; st.r[i] = clamp(st.r[i] + dr, st.t[i] + 0.05, 1.15);
      st.t[i] = clamp(st.t[i] * (1 - dr * 0.25), 0.045, 0.4);
    }
    // 바닥 근처는 기물 바닥 크기에 맞춰 너무 줄지 않게
    st.r[0] = Math.max(st.r[0], st.floorR + st.t[0]);
    st.wet = Math.max(0, st.wet - 0.05 * dt);
    if (st.mode === 'real') collapseCheck();
    computeShapeScore(); buildClay(); updateNext();
  }
  if (k === 'finish') {
    const top = st.H;
    if (st.tool === 'needle' && Math.abs(c.y - top) < 0.18 && Math.abs(d.x - d.x0) > 0.4 && !st.finish.needle) {
      st.H = Math.max(0.3, st.H - 0.05); st.rimRough = 0; st.finish.needle = true; warn('윗단을 가지런히 잘랐어요 ✓', 1200); renderTools(); buildClay(); updateNext();
    }
    if (st.tool === 'chamois' && Math.abs(c.y - top) < 0.2 && Math.abs(d.x - d.x0) > 0.35 && !st.finish.chamois) { st.finish.chamois = true; st.rimRough *= 0.5; warn('입술이 매끈해졌어요 ✓', 1200); renderTools(); }
    if (st.tool === 'rib' && c.y < st.H * 0.4 && d.maxY - d.minY > 0.2 && !st.finish.rib) {
      for (let i = 0; i < 6; i++) st.r[i] = Math.max(st.floorR + st.t[i], st.r[i] - 0.04 * (1 - i / 6));
      st.finish.rib = true; warn('아랫부분 군살을 정리했어요 ✓', 1200); renderTools(); buildClay();
    }
  }
  if (k === 'wire') {
    if (st.mode === 'real' && st.speed > 0.15) { if (performance.now() > st.warnUntil) warn('물레를 멈추고 그어요 (페달을 내려요)'); return; }
    if (c.y < 0.25) { st.wireCut = clamp(Math.abs(d.x - d.x0) / 1.6, 0, 1); wireLine.position.x = lerp(-1.4, 0.3, st.wireCut); updateNext(); if (st.wireCut >= 1) { warn('쓱— 떼어냈어요!', 1200); } }
  }
}
function onDragEnd(d) {
  const k = STEPS[st.step].key, dur = (performance.now() - d.t0) / 1000;
  if (k === 'attach') {
    const off = Math.hypot(st.attachX, st.attachZ);
    st.attached = true; st.wobble = clamp(0.35 + off * 0.9, 0.35, 0.95); if (st.mode === 'easy') st.wobble = Math.min(st.wobble, 0.5);
    warn(off < 0.12 ? '쿵! 가운데에 잘 붙었어요' : off < 0.35 ? '쿵! 살짝 비켜났어요. 중심 잡기에서 맞춰요' : '쿵! 많이 비켜났어요. 흔들림이 커요', 1600);
    updateNext(); return;
  }
  if (k === 'center') { updateNext(); return; }
  if (k === 'open') { updateNext(); return; }
  if (k === 'widen') { updateNext(); return; }
  if (k === 'pull' && d.pullStartOK) {
    const span = d.maxY - d.minY;
    if (span < st.H * 0.55 || d.y < st.H * 0.7) { tip('끝(윗단)까지 한 번에 끌어 올려요'); return; }
    if (st.mode === 'real' && !speedOK()) { warn('속도가 맞지 않아 벽이 잘 안 올라갔어요'); }
    const v = VESSELS[st.vessel];
    if (st.pulls >= v.pulls + 1) { warn('벽은 충분히 올렸어요. 다음 단계로!'); return; }
    let k2 = 0.73, quality = 1;
    if (st.mode === 'real') {
      if (dur < 0.5) { quality = 0.5; k2 = 0.88; st.uneven += 0.06; warn('너무 빨리 올렸어요. 벽이 고르지 않아요'); if (st.wobble > 0.18 || st.H > 0.9) return fail('tear'); }
      else if (dur > 4) { quality = 0.8; k2 = 0.82; st.wet = Math.max(0, st.wet - 0.2); warn('너무 오래 걸려 흙이 지쳤어요'); }
      if (!speedOK()) { k2 = Math.min(0.9, k2 + 0.08); st.uneven += 0.03; }
      if (st.wet < 0.18) { st.uneven += 0.05; st.wobble = Math.min(1, st.wobble + 0.08); }
    }
    st.uneven += st.wobble * 0.35;
    const Hold = st.H, tNew = [];
    let maxH = Math.min(v.H * 1.45, 1.75);
    for (let i = 0; i < N; i++) tNew.push(Math.max(0.05, st.t[i] * k2));
    const avgOld = st.t.reduce((a, b) => a + b, 0) / N, avgNew = tNew.reduce((a, b) => a + b, 0) / N;
    st.H = clamp(Hold * (avgOld / avgNew) * 0.96, Hold, maxH);
    // 높이 늘리면서 약간 좁아지는 실제 경향
    for (let i = 0; i < N; i++) { st.t[i] = tNew[i]; const tgt = st.floorR + st.t[i] + 0.05; if (st.vessel !== 'bowl' && st.r[i] > tgt) st.r[i] = lerp(st.r[i], tgt, 0.35); st.r[i] = Math.max(st.floorR + st.t[i] + 0.02, st.r[i]); }
    if (st.vessel === 'bowl') for (let i = 0; i < N; i++) st.r[i] += 0.07 * Math.pow(i / (N - 1), 1.2);
    st.rimRough = clamp(st.rimRough + st.wobble * 0.3 + (quality < 1 ? 0.05 : 0), 0, 0.5);
    st.pulls++; st.wet = Math.max(0, st.wet - 0.22);
    buildClay(); renderChips(); tip(STEP_TIP.pull());
    if (st.mode === 'real') { if (st.t[Math.floor(N * 0.7)] < CLAYS[st.clay].thin + 0.015) return fail('thin'); if (st.soak > CLAYS[st.clay].soak && st.H > 0.85) return fail('soak'); }
    warn(quality === 1 ? `벽 올리기 ${st.pulls}번 ✓` : `벽 올리기 ${st.pulls}번`, 900);
    updateNext();
  }
}
function collapseCheck() {
  for (let i = 2; i < N; i++) {
    const dy = st.H / (N - 1), slope = (st.r[i] - st.r[i - 2]) / (2 * dy);
    if (slope > 2.3 && st.t[i] < 0.085) return fail('slump');
    if (st.t[i] < CLAYS[st.clay].thin) return fail('thin');
  }
  if (st.soak > CLAYS[st.clay].soak + 0.05 && st.H > 0.8) fail('soak');
}
function computeShapeScore() {
  const v = VESSELS[st.vessel]; let err = 0;
  for (let i = 0; i < N; i++) { const u = i / (N - 1); err += Math.abs(st.r[i] - v.prof(u)); }
  err /= N; const hErr = Math.abs(st.H - v.H) / v.H;
  st.shapeScore = clamp(1 - err * 3.2 - hErr * 0.8, 0, 1);
}

/* ---------- 실패 ---------- */
const FAIL = {
  hole:  ['🕳️', '바닥이 뚫렸어요', '구멍을 너무 깊이 냈어요. 바닥 두께 게이지가 초록 칸일 때 손을 떼요.'],
  tear:  ['💥', '벽이 찢어졌어요', '중심이 덜 잡힌 채로 너무 빨리 끌어올렸어요. 1~2초 동안 천천히 올려요.'],
  thin:  ['🫠', '벽이 너무 얇아졌어요', '한 번에 너무 많이 얇혔어요. 벽 올리기 횟수를 줄이거나 살살 눌러요.'],
  slump: ['🫠', '모양이 주저앉았어요', '얇은 벽을 바깥으로 너무 세게 밀었어요. 조금씩 여러 번 나눠 밀어요.'],
  soak:  ['💧', '물을 너무 먹어 주저앉았어요', '물은 손이 미끄러울 만큼만! 너무 자주 묻히면 벽이 약해져요.']
};
function fail(kind) {
  if (st.failed || st.mode === 'easy') return;
  st.failed = kind; st.drag = null;
  // 주저앉는 연출
  const t0 = performance.now(), H0 = st.H;
  const sag = () => { const p = clamp((performance.now() - t0) / 700, 0, 1); st.H = H0 * (1 - 0.45 * p); for (let i = Math.floor(N * 0.5); i < N; i++) st.r[i] += 0.006 * p * (i / N); buildClay(); if (p < 1) requestAnimationFrame(sag); };
  if (kind !== 'hole') requestAnimationFrame(sag);
  const [ico, ttl, why] = FAIL[kind];
  setTimeout(() => showResult(`<div class="tw-fail">${ico}</div><h2>${ttl}</h2><p>${why}</p><div class="tw-say">🧑‍🏫 선생님: 괜찮아요, 처음엔 다 그래요. 흙 다시 반죽해 줄게요!</div><button class="pri" data-a="redo">다시 빚기</button> <button data-a="setup">기물 바꾸기</button> <button data-a="leave">일어서기</button>`), 800);
  updateNext();
}

/* ---------- 완성 · 점수 ---------- */
function finishPiece() {
  computeShapeScore();
  const sc = {
    중심: clamp(1 - st.wobble / 0.35, 0, 1),
    바닥: st.mode === 'easy' ? 1 : clamp(1 - Math.abs(st.floorT - 0.14) / 0.12, 0, 1),
    벽: clamp(1 - st.uneven * 1.6, 0, 1),
    모양: st.shapeScore,
    다듬기: (['sponge', 'needle', 'rib', 'chamois'].filter(k => st.finish[k]).length + (st.pool < 0.15 ? 0.5 : 0)) / 4.5,
    물: clamp(1 - st.dryHits * 0.25 - st.soak * 0.8, 0, 1)
  };
  const w = { 중심: 0.18, 바닥: 0.12, 벽: 0.2, 모양: 0.28, 다듬기: 0.1, 물: 0.12 };
  const total = Object.keys(sc).reduce((a, k) => a + sc[k] * w[k], 0);
  const stars = total >= 0.82 ? 3 : total >= 0.6 ? 2 : 1;
  const worst = Object.keys(sc).sort((a, b) => sc[a] - sc[b])[0];
  const COMMENT = {
    중심: '중심이 조금 흔들렸어요. 코닝을 한 번 더 하면 벽이 훨씬 고르게 올라와요.',
    바닥: '바닥 두께를 1~2cm로 맞추면 마르면서 갈라지지 않아요.',
    벽: '벽 두께가 들쭉날쭉해요. 일정한 속도로 천천히 끌어올려 봐요.',
    모양: `목표 ${VESSELS[st.vessel].name} 모양과 조금 달라요. 점선을 따라 조금씩 밀어봐요.`,
    다듬기: '다듬기를 꼼꼼히 하면 굽깎기가 훨씬 쉬워져요.',
    물: '물을 너무 적게 혹은 많이 썼어요. 손이 미끄러울 만큼만!'
  };
  const say = stars === 3 ? '와, 이건 그대로 가마에 넣어도 되겠어요!' : COMMENT[worst];
  const piece = { id: Date.now(), vessel: st.vessel, clay: st.clay, clayName: CLAYS[st.clay].name, color: CLAYS[st.clay].dry, name: VESSELS[st.vessel].name, mode: st.mode, stars, score: Math.round(total * 100), H: +st.H.toFixed(3), r: Array.from(st.r, v => +v.toFixed(3)), t: Array.from(st.t, v => +v.toFixed(3)), floorT: +st.floorT.toFixed(3), at: new Date().toISOString() };
  st.lastPiece = piece;
  showResult(`<h2>${VESSELS[st.vessel].name} 완성!</h2><div class="tw-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p>${CLAYS[st.clay].name} · ${st.mode === 'easy' ? '쉬움' : '실전'} 모드 · ${Math.round(total * 100)}점</p>
    <div class="tw-scores">${Object.keys(sc).map(k => `<div><span>${k}</span><b>${Math.round(sc[k] * 100)}</b></div>`).join('')}</div>
    <div class="tw-say">🧑‍🏫 선생님: ${say}</div>
    <button class="pri" data-a="carry">🖼 전시관에 들고 가기</button> <button data-a="save">작업대에 올려두기</button> <button data-a="redo">하나 더 빚기</button>`);
}
function showResult(html) { const v = $('[data-v="result"]'); v.querySelector('.tw-card').innerHTML = html; v.hidden = false; v.querySelectorAll('button').forEach(b => b.onclick = () => act(b.dataset.a)); }

/* ---------- 버튼 ---------- */
// 전시된 작품은 지우지 않고, 나머지는 최근 30개까지만 보관
function trimPieces(list) { let k = 0; return list.filter(pc => pc.place === 'gallery' || pc.place === 'carry' || k++ < 30); }
function act(a) {
  if (a === 'water') {
    if (STEPS[st.step].key === 'attach' || STEPS[st.step].key === 'wire') return warn('지금은 물이 필요 없어요', 1000);
    if (st.wet > 0.85) { st.soak = clamp(st.soak + (st.mode === 'real' ? 0.09 : 0.02), 0, 1); st.pool = clamp(st.pool + 0.1, 0, 1); warn(st.soak > CLAYS[st.clay].soak * 0.6 ? '물이 너무 많아요! 흙이 약해지고 있어요' : '이미 충분히 젖어 있어요', 1400); }
    else warn('촉촉 💧', 700);
    st.wet = 1; if (st.opened) st.pool = clamp(st.pool + 0.05, 0, 1);
    splashT = 0.6; if (st.mode === 'real' && st.opened) collapseCheck();
  }
  if (a === 'next') next();
  if (a === 'redo') { $('[data-v="result"]').hidden = true; reset(); }
  if (a === 'setup') { $('[data-v="result"]').hidden = true; reset(); $('[data-v="setup"]').hidden = false; }
  if (a === 'start') { $('[data-v="setup"]').hidden = true; reset(); }
  if (a === 'save') {
    try { const list = JSON.parse(localStorage.getItem('heukmaru-pieces') || '[]'); list.unshift({ ...st.lastPiece, place: 'table' }); localStorage.setItem('heukmaru-pieces', JSON.stringify(trimPieces(list))); } catch {}
    window.dispatchEvent(new CustomEvent('heukmaru-pieces'));
    $('[data-v="result"]').hidden = true; reset(); warn('공방 긴 작업대에 올려뒀어요 ✓', 1600);
  }
  if (a === 'carry') {
    const pc = { ...st.lastPiece, place: 'carry' };
    try { const list = JSON.parse(localStorage.getItem('heukmaru-pieces') || '[]'); list.unshift(pc); localStorage.setItem('heukmaru-pieces', JSON.stringify(trimPieces(list))); } catch {}
    $('[data-v="result"]').hidden = true; reset(); const cb = st.onCarry; close(); if (cb) cb(pc); return;
  }
  if (a === 'leave') close();
}
host.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
host.querySelectorAll('.tw-mode button').forEach(b => b.onclick = () => { st.mode = b.dataset.m; host.querySelectorAll('.tw-mode button').forEach(x => x.classList.toggle('on', x === b)); });
// 기물 고르기 카드 (실루엣 미리보기)
const vesBox = $('.tw-ves');
vesBox.innerHTML = Object.keys(VESSELS).map(k => `<button data-v="${k}" class="${k === st.vessel ? 'on' : ''}"><canvas width="104" height="124"></canvas>${VESSELS[k].name}</button>`).join('');
function paintVessels() { vesBox.querySelectorAll('button').forEach(b => {
  const v = VESSELS[b.dataset.v], c = b.querySelector('canvas'), g = c.getContext('2d'), sc = 44, base = 116;
  g.clearRect(0, 0, c.width, c.height); g.fillStyle = CLAYS[st.clay].dry; g.beginPath(); g.moveTo(52, base);
  for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(52 + v.prof(u) * sc * 1.05, base - u * v.H * sc * 1.25); }
  for (let i = 40; i >= 0; i--) { const u = i / 40; g.lineTo(52 - v.prof(u) * sc * 1.05, base - u * v.H * sc * 1.25); }
  g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,60,45,.45)'; g.lineWidth = 2; g.stroke();
  b.onclick = () => { st.vessel = b.dataset.v; vesBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
}); }
paintVessels();

const clayBox = $('.tw-clays'), clayDesc = $('.tw-clay-desc');
clayBox.innerHTML = Object.keys(CLAYS).map(k => `<button data-c="${k}" class="${k === st.clay ? 'on' : ''}"><i style="background:${CLAYS[k].dry}"></i>${CLAYS[k].name}<small>${CLAYS[k].level}</small></button>`).join('');
clayDesc.textContent = CLAYS[st.clay].desc;
clayBox.querySelectorAll('button').forEach(b => b.onclick = () => { st.clay = b.dataset.c; clayBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); clayDesc.textContent = CLAYS[st.clay].desc; paintVessels(); });
/* ---------- 초기화 · 열기 · 닫기 ---------- */
function reset() {
  Object.assign(st, { step: 0, speed: 0, wet: 0.7, soak: 0, pool: 0, wobble: 0.6, dryHits: 0, speedMiss: 0, lumpR: 0.72, lumpH: 0.62, cone: 0, coneCycles: 0, coneDir: 0,
    attachX: 0.55, attachZ: 0.35, attached: false, depth: 0, floorT: 0.62, floorR: 0.08, H: 0.6, pulls: 0, uneven: 0, rimRough: 0.04, failed: null,
    finish: { sponge: false, needle: false, rib: false, chamois: false }, tool: null, wireCut: 0, shapeScore: 0, drag: null, opened: false });
  rebuildLumpFromVolume(); buildClay(); wireLine.position.x = -1.4; enterStep(0);
}
function open(opts = {}) {
  st.active = true; host.hidden = false; st.onExit = opts.onExit; st.say = opts.say; st.onCarry = opts.onCarry;
  const skin = opts.skin || '#f2b9a0';
  if (!handL) { handL = makeHand(skin); handR = makeHand(skin); }
  [handL, handR].forEach(h => h.userData.skin.color.set(skin));
  resize(); reset(); $('[data-v="setup"]').hidden = false; $('[data-v="result"]').hidden = true;
  if (!looping) { looping = true; requestAnimationFrame(loop); }
}
function close() { st.active = false; host.hidden = true; if (st.onExit) st.onExit(); }
function say(t) { if (st.say) st.say(t); }

/* ---------- 손 위치 (단계·드래그에 따라) ----------
   흙 오른쪽 옆선(화면에서 보이는 단면)에 손가락 끝이 닿게 놓는다. 손가락 두께(FR)만큼 띄워 흙을 뚫지 않게.
   드래그 중이면 누르는 높이를 따라오고, 쉬는 동안엔 반투명 손이 시범 동작을 보여준다. */
const DEMO_MS = 1800;
const PHI = 20 * Math.PI / 180, CP = Math.cos(PHI), SP = Math.sin(PHI);   // 손이 닿는 자리: 오른쪽 옆선에서 카메라 쪽으로 20°
const bandRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.011, 6, 72), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthTest: true }));
bandRing.rotation.x = Math.PI / 2; bandRing.visible = false; S.add(bandRing);
function showBand(y, r) { bandRing.visible = true; bandRing.position.set(clayGroup.position.x, y, clayGroup.position.z); bandRing.scale.set(r + 0.006, r + 0.006, 1); }
function demoPhase(now) {
  if (st.drag || st.failed) return -1;
  if (now - st.lastInput > 9000) { st.demoT0 = now; st.lastInput = now; }
  const t = now - st.demoT0; return t < DEMO_MS * 2 ? (t % DEMO_MS) / DEMO_MS : -1;
}
const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
function maxRAround(y, span = 0.07) { let m = 0; for (let k = -3; k <= 3; k++) m = Math.max(m, st.opened ? rAt(clamp(y + span * k / 3, 0, st.H)) : lumpRadius(clamp(y + span * k / 3, 0, st.lumpH))); return m; }
function placeHands(now) {
  const k = STEPS[st.step].key, d = st.drag, ox = clayGroup.position.x, oz = clayGroup.position.z;
  Object.values(tools).forEach(t => t.visible = false);
  handL.visible = handR.visible = false; bandRing.visible = false;
  const ph = demoPhase(now), demo = ph >= 0, A = demo ? 0.5 : 1;
  const P = (x, y, z = 0) => V(x + ox, y, z + oz);
  const v = VESSELS[st.vessel];
  st.demoOn = demo;
  if (k === 'attach') {
    if (st.attached) return;
    const cy = 0.35 + 0.28, r = st.lumpR * 0.9;
    poseHand(handL, V(st.attachX - r - FR, cy, st.attachZ), 8, 0, 1); poseHand(handR, V(st.attachX + r + FR, cy, st.attachZ), 172, 0, 1); return;
  }
  if (k === 'center') {
    const h = st.lumpH;
    let down, y;
    if (d) { down = st.coneDir === 1 && d.dy <= 0; y = clamp(d.y, 0.08, h * 0.9); }
    else if (demo) { down = st.coneDir === 1 ? true : ph > 0.55; y = down ? h : lerp(0.1, h * 0.85, ease(clamp(ph / 0.55, 0, 1))); }
    else { down = st.coneDir === 1; y = h * 0.45; }
    if (!down) { const r = maxRAround(y) + FR; poseHand(handL, P(-r * CP, y, r * SP), 12, 0, A, PHI); poseHand(handR, P(r * CP, y, r * SP), 168, 0, A, -PHI); if (d || demo) showBand(y, lumpRadius(y)); }
    else { poseHand(handR, P(0.06, h + FR + (demo ? (1 - ease(clamp((ph - 0.55) / 0.45, 0, 1))) * 0.25 : 0)), -78, 1, A); const yl = h * 0.45; poseHand(handL, P(-(maxRAround(yl) + FR), yl), 10, 0, A); }
    return;
  }
  if (k === 'open' && !st.opened) {
    const h = st.lumpH, yl = h * 0.45;
    const tipY = d ? h - st.depth + FR : demo ? h + 0.3 - 0.3 * ease(Math.min(1, ph * 1.6)) + FR : h + 0.18;
    poseHand(handR, P(0.0, tipY), -84, 1, A); poseHand(handL, P(-(maxRAround(yl) + FR), yl), 10, 0, A); return;
  }
  if (!st.opened) return;
  if (k === 'widen') {
    const x = d ? clamp(Math.abs(d.x), 0.04, st.floorR + 0.02) : demo ? lerp(0.04, v.floorR, ease(ph)) : st.floorR * 0.7;
    poseHand(handR, P(x, st.floorT + FR), -62, 1, A);
    const yl = st.H * 0.45; poseHand(handL, P(-(maxRAround(yl) + FR), yl), 8, 0, A); return;
  }
  if (k === 'pull' || k === 'shape') {
    let y;
    if (d) y = clamp(d.y, 0.04, st.H - 0.02);
    else if (demo) y = k === 'pull' ? lerp(0.04, st.H - 0.03, ease(clamp(ph / 0.8, 0, 1))) : st.H * 0.55 + Math.sin(ph * Math.PI * 4) * 0.04;
    else y = k === 'pull' ? 0.06 : st.H * 0.55;
    const ro = maxRAround(y), ri = rAt(y) - tAt(y);
    const outA = k === 'shape' && st.shapeMode === 'out' && !demo ? 0.35 : A, inA = k === 'shape' && st.shapeMode === 'in' && !demo ? 0.35 : A;
    const ro2 = ro + FR, ri2 = Math.max(0.03, ri - FR);
    poseHand(handR, P(ro2 * CP, y, ro2 * SP), 186, 0, outA, -PHI);            // 바깥 손: 흙 쪽을 향해
    poseHand(handL, P(ri2 * CP, y, ri2 * SP), -68, 1, inA, -PHI);             // 안쪽 손: 위에서 내려와 안쪽 벽에
    if (d || demo) showBand(y, rAt(y));
    return;
  }
  if (k === 'finish') {
    const yl = st.H * 0.4; poseHand(handL, P(-(maxRAround(yl) + FR), yl), 8, 0, 1);
    const tl = tools[st.tool || 'sponge'], rH = rAt(st.H), tH = tAt(st.H);
    tl.rotation.set(0, 0, 0);
    if (!st.tool || st.tool === 'sponge') tl.position.copy(P(0, st.floorT + 0.06 + (d ? 0 : 0.05)));
    else if (st.tool === 'needle') { tl.position.copy(P(rH - tH * 0.5 + 0.06, st.H + 0.24)); tl.rotation.z = 0.25; }
    else if (st.tool === 'chamois') { tl.position.copy(P(rH - tH * 0.5, st.H + tH * 0.3 + 0.012)); tl.rotation.z = 0; }
    else if (st.tool === 'rib') { const yy = d ? clamp(d.y, 0.06, st.H * 0.45) : 0.14; tl.position.copy(P(maxRAround(yy, 0.08) + 0.125, yy)); }
    tl.visible = true;
    // 오른손이 도구를 쥔다 (손가락이 도구 쪽)
    const tp = tl.position.clone(); poseHand(handR, V(tp.x + 0.1, tp.y + (st.tool === 'needle' ? 0.2 : 0.05), tp.z), 200, 0, 1);
    return;
  }
  if (k === 'wire') { const x = wireLine.position.x; tools.wireL.visible = tools.wireR.visible = true; tools.wireL.position.set(x - 1.5, 0.05, 0.25); tools.wireR.position.set(x + 1.5, 0.05, 0.25); }
}

/* ---------- 화면 가이드: 목표 점선 · 동작 화살표 · 누르는 점 · 시간 링 ---------- */
const proj = p => { const q = p.clone().project(cam); return [(q.x + 1) / 2 * guide.width, (1 - q.y) / 2 * guide.height]; };
function arrow(pts, label, now, opts = {}) {
  const dpr = guide.width / guide.clientWidth, sp = pts.map(proj);
  gctx.save(); gctx.lineCap = 'round'; gctx.lineJoin = 'round';
  gctx.strokeStyle = opts.color || 'rgba(255,214,120,.95)'; gctx.lineWidth = 4 * dpr; gctx.setLineDash([10 * dpr, 8 * dpr]); gctx.lineDashOffset = -(now / 30) * dpr;
  gctx.shadowColor = '#0008'; gctx.shadowBlur = 6 * dpr;
  gctx.beginPath(); sp.forEach(([x, y], i) => i ? gctx.lineTo(x, y) : gctx.moveTo(x, y)); gctx.stroke(); gctx.setLineDash([]);
  const heads = opts.both ? [[sp.length - 1, sp.length - 2], [0, 1]] : [[sp.length - 1, sp.length - 2]];
  gctx.fillStyle = gctx.strokeStyle;
  for (const [a, b] of heads) { const [x1, y1] = sp[a], [x0, y0] = sp[b], ang = Math.atan2(y1 - y0, x1 - x0), L = 16 * dpr;
    gctx.beginPath(); gctx.moveTo(x1 + Math.cos(ang) * 4 * dpr, y1 + Math.sin(ang) * 4 * dpr); gctx.lineTo(x1 - Math.cos(ang - 0.5) * L, y1 - Math.sin(ang - 0.5) * L); gctx.lineTo(x1 - Math.cos(ang + 0.5) * L, y1 - Math.sin(ang + 0.5) * L); gctx.closePath(); gctx.fill(); }
  if (label) {
    const [lx, ly] = sp[opts.labelAt ?? sp.length - 1]; gctx.shadowBlur = 0;
    gctx.font = `700 ${13 * dpr}px system-ui, sans-serif`; const w = gctx.measureText(label).width + 18 * dpr, hh = 26 * dpr;
    const bx = clamp(opts.left ? lx - w - 14 * dpr : lx + (opts.dx ?? 14) * dpr, 4, guide.width - w - 4), by = ly + (opts.dy ?? -13) * dpr;
    gctx.fillStyle = '#2b2420e6'; gctx.beginPath(); gctx.roundRect(bx, by, w, hh, hh / 2); gctx.fill();
    gctx.fillStyle = '#ffe2a6'; gctx.textBaseline = 'middle'; gctx.fillText(label, bx + 9 * dpr, by + hh / 2);
  }
  gctx.restore();
}
function drawGuide(now) {
  gctx.clearRect(0, 0, guide.width, guide.height);
  if (!st.active || st.failed || !$('[data-v="setup"]').hidden || !$('[data-v="result"]').hidden) return;
  const k = STEPS[st.step].key, v = VESSELS[st.vessel], dpr = guide.width / guide.clientWidth, d = st.drag;
  // 목표 점선
  if (st.opened && ['pull', 'shape', 'finish'].includes(k)) {
    gctx.setLineDash([7 * dpr, 6 * dpr]); gctx.lineWidth = 2 * dpr; gctx.strokeStyle = 'rgba(255,240,215,0.75)';
    for (const side of [-1, 1]) { gctx.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, [x, y] = proj(V(side * v.prof(u), u * v.H, 0)); i ? gctx.lineTo(x, y) : gctx.moveTo(x, y); } gctx.stroke(); }
    gctx.setLineDash([]);
  }
  // 동작 화살표 (누르고 있지 않을 때)
  if (!d) {
    const h = st.lumpH, H = st.H;
    if (k === 'attach' && !st.attached) arrow([V(st.attachX, 0.62, st.attachZ), V(0, 0.32, 0)], '가운데로 끌어다 놓기', now, { dy: 10 });
    if (k === 'attach' && st.attached) arrow([V(0, h + 0.5, 0), V(0, h + 0.15, 0)], '잘 붙었어요! 다음 단계', now, {});
    if (k === 'center') {
      const x = lumpRadius(h * 0.4) + 0.32;
      if (st.coneDir === 1) arrow([V(0.05, h + 0.55, 0), V(0.05, h + 0.08, 0)], '② 위에서 꾹 눌러 내리기', now, { labelAt: 0, dy: -30 });
      else arrow([V(x, 0.1, 0), V(x, h + 0.2, 0)], '① 양손으로 감싸 위로 끌어올리기', now, { left: true, dy: -40 });
    }
    if (k === 'open') arrow([V(0, h + 0.55, 0), V(0, h + 0.05, 0)], '가운데를 꾹 누르고 기다리기', now, { labelAt: 0, dy: -30 });
    if (k === 'widen') arrow([V(0.02, st.floorT + 0.04, 0.0), V(v.floorR + 0.04, st.floorT + 0.04, 0)], '바닥을 바깥으로 쓸기', now, { dy: -42 });
    if (k === 'pull') { const x = maxRAround(H * 0.5, H * 0.5) + 0.26; arrow([V(x, 0.03, 0), V(x, H + 0.15, 0)], st.pulls >= v.pulls ? '충분해요 → 다음 단계' : '아래에서 위로 1~2초', now, { left: true, dy: -30 }); }
    if (k === 'shape') { const y = H * 0.55, x = rAt(y) + 0.12; arrow(st.shapeMode === 'in' ? [V(x + 0.28, y, 0), V(x, y, 0)] : [V(x, y, 0), V(x + 0.28, y, 0)], st.shapeMode === 'in' ? '원하는 높이를 문질러 조이기' : '원하는 높이를 문질러 부풀리기', now, { labelAt: 0, dx: -60, dy: -44 }); }
    if (k === 'finish') {
      const t = st.tool || 'sponge', rH = rAt(H);
      if (t === 'sponge') arrow([V(0, st.floorT + 0.45, 0), V(0, st.floorT + 0.12, 0)], '안쪽 바닥을 톡 누르기', now, { labelAt: 0, dy: -30 });
      if (t === 'needle' || t === 'chamois') arrow([V(-rH, H + 0.12, 0), V(rH, H + 0.12, 0)], t === 'needle' ? '윗단을 따라 옆으로 긋기' : '입술을 따라 옆으로 문지르기', now, { labelAt: 0, dx: -40, dy: -40 });
      if (t === 'rib') { const x = maxRAround(H * 0.2, H * 0.2) + 0.3; arrow([V(x, 0.04, 0), V(x, H * 0.45, 0)], '아랫부분을 위로 쓸기', now, { left: true, dy: -30 }); }
    }
    if (k === 'wire') arrow([V(-1.0, 0.03, 0.2), V(1.0, 0.03, 0.2)], '페달 멈추고 바닥을 따라 쭉 긋기', now, { labelAt: 0, dx: 0, dy: 16 });
  }
  // 누르는 점 + 시간 링
  if (d && d.sx !== undefined) {
    const x = d.sx * dpr, y = d.sy * dpr;
    gctx.strokeStyle = '#fff6e4'; gctx.lineWidth = 2.5 * dpr; gctx.beginPath(); gctx.arc(x, y, 13 * dpr, 0, 7); gctx.stroke();
    gctx.fillStyle = '#fff6e455'; gctx.beginPath(); gctx.arc(x, y, 6 * dpr, 0, 7); gctx.fill();
    if (k === 'pull' && d.pullStartOK) {
      const dur = (now - d.t0) / 1000, col = dur < 0.9 ? '#e9c35a' : dur <= 2.6 ? '#8fd18a' : dur <= 4 ? '#e9c35a' : '#e2683f';
      gctx.strokeStyle = '#0006'; gctx.lineWidth = 6 * dpr; gctx.beginPath(); gctx.arc(x, y, 24 * dpr, 0, 7); gctx.stroke();
      gctx.strokeStyle = col; gctx.lineWidth = 5 * dpr; gctx.beginPath(); gctx.arc(x, y, 24 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.min(1, dur / 2) * Math.PI * 2); gctx.stroke();
      gctx.font = `700 ${12 * dpr}px system-ui, sans-serif`; gctx.fillStyle = col; gctx.textAlign = 'center'; gctx.fillText(dur.toFixed(1) + '초', x, y - 34 * dpr); gctx.textAlign = 'left';
    }
  }
}

/* ---------- 단면 미니 창: 벽 두께와 손가락 위치를 옆에서 자른 모습으로 ---------- */
const secCv = $('.tw-sec-view canvas'), sctx = secCv.getContext('2d');
function drawSection() {
  const k = STEPS[st.step].key, box = $('.tw-sec-view');
  box.hidden = k === 'attach' || k === 'wire'; if (box.hidden) return;
  const W = secCv.width, Hc = secCv.height, sc = Math.min((W - 24) / 1.05, (Hc - 22) / 1.6), x0 = 12, y0 = Hc - 12;
  const X = r => x0 + r * sc, Y = y => y0 - y * sc;
  sctx.clearRect(0, 0, W, Hc);
  sctx.strokeStyle = '#ffffff30'; sctx.setLineDash([3, 3]); sctx.beginPath(); sctx.moveTo(x0, 4); sctx.lineTo(x0, y0); sctx.stroke(); sctx.setLineDash([]);
  sctx.fillStyle = '#5f5e5b'; sctx.fillRect(x0 - 4, y0, W, 5);
  sctx.fillStyle = clayMat.color.getStyle();
  sctx.beginPath(); sctx.moveTo(X(0), Y(0));
  if (!st.opened) {
    for (let i = 0; i <= 26; i++) { const y = st.lumpH * i / 26; sctx.lineTo(X(lumpRadius(y)), Y(y)); }
    if (st.depth > 0.01) { const hr = 0.09 + st.floorR * 0.6; sctx.lineTo(X(hr), Y(st.lumpH)); sctx.lineTo(X(hr * 0.8), Y(st.lumpH - st.depth)); sctx.lineTo(X(0), Y(st.lumpH - st.depth)); }
    else sctx.lineTo(X(0), Y(st.lumpH));
  } else {
    for (let i = 0; i < N; i++) sctx.lineTo(X(st.r[i]), Y(st.H * i / (N - 1)));
    for (let i = N - 1; i >= 0; i--) { const y = st.H * i / (N - 1); if (y < st.floorT) break; sctx.lineTo(X(Math.max(0.02, st.r[i] - st.t[i])), Y(y)); }
    sctx.lineTo(X(0), Y(st.floorT));
  }
  sctx.closePath(); sctx.fill();
  if (st.opened && ['pull', 'shape', 'finish'].includes(k)) {
    const v = VESSELS[st.vessel]; sctx.strokeStyle = '#ffe2a6aa'; sctx.setLineDash([4, 3]); sctx.lineWidth = 1.5; sctx.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30; i ? sctx.lineTo(X(v.prof(u)), Y(u * v.H)) : sctx.moveTo(X(v.prof(u)), Y(u * v.H)); } sctx.stroke(); sctx.setLineDash([]);
  }
  // 손가락 (분홍 점) — 손 모델과 같은 자리
  sctx.fillStyle = '#f2b9a0';
  const dot = (r, y) => { sctx.beginPath(); sctx.arc(X(r), Y(y), 4.5, 0, 7); sctx.fill(); sctx.strokeStyle = '#0005'; sctx.lineWidth = 1; sctx.stroke(); };
  const rad = p => Math.hypot(p.x - clayGroup.position.x, p.z - clayGroup.position.z);
  if (handR.visible && k !== 'finish') dot(rad(handR.position), handR.position.y);
  if (handL.visible && (k === 'pull' || k === 'shape')) dot(rad(handL.position), handL.position.y);
}

/* ---------- 루프 ---------- */
let looping = false, last = performance.now(), splashT = 0, camK = 1;
function resize() { const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.8 ? 46 : 34; camK = w / h < 0.8 ? 1.45 : 1; cam.updateProjectionMatrix(); guide.width = w * Math.min(devicePixelRatio, 2); guide.height = h * Math.min(devicePixelRatio, 2); renderPedal(); }
addEventListener('resize', () => { if (st.active) resize(); });
addEventListener('keydown', e => {
  if (!st.active) return;
  if (e.key === 'ArrowUp' && st.mode !== 'easy') { st.autoPedal = false; st.speed = clamp(st.speed + 0.1, 0, 1); e.preventDefault(); }
  if (e.key === 'ArrowDown' && st.mode !== 'easy') { st.autoPedal = false; st.speed = clamp(st.speed - 0.1, 0, 1); e.preventDefault(); }
  if (e.key === ' ') { act('water'); e.preventDefault(); }
  if (e.key === 'Enter') next();
}, true);
function loop(now) {
  if (!st.active) { looping = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const k = STEPS[st.step].key;
  // 구멍 내기: 누르고 있는 동안 아래로
  if (k === 'open' && st.drag && !st.failed) {
    if (speedCheck() && frictionCheck(dt, 0.6)) {
      st.depth = clamp(st.depth + dt * (st.mode === 'easy' ? 0.32 : 0.26), 0, st.lumpH - (st.mode === 'easy' ? 0.15 : 0));
      st.floorT = st.lumpH - st.depth; st.floorR = 0.08; st.wet = Math.max(0, st.wet - 0.05 * dt);
      if (st.mode === 'real' && st.speed > 0.9) st.wobble = Math.min(1, st.wobble + 0.04 * dt);
      if (st.mode === 'real' && st.floorT < 0.05) fail('hole');
      buildClay(); updateNext();
    }
  }
  // 회전·흔들림 연출
  st.rot += st.speed * dt * 14;
  clay.rotation.y = st.rot; head.rotation.y = st.rot;
  const wob = (st.attached || k !== 'attach') ? st.wobble : 0;
  const ox = k === 'attach' ? st.attachX : Math.cos(st.rot) * wob * 0.07, oz = k === 'attach' ? st.attachZ : Math.sin(st.rot) * wob * 0.07;
  clayGroup.position.set(ox, k === 'attach' && !st.attached ? 0.35 : 0, oz);
  clayMat.roughness = lerp(0.85, 0.28, st.wet); clayMat.clearcoat = lerp(0.05, 0.6, st.wet);
  clayMat.color.set(st.wet > 0.4 ? CLAYS[st.clay].wet : CLAYS[st.clay].dry);
  if (st.speed > 0.05 && st.active && st.step > 0 && st.step < 7) st.wet = Math.max(0, st.wet - dt * 0.012 * CLAYS[st.clay].dry_rate);
  slip.material.opacity = clamp(0.15 + st.soak * 0.5 + st.step * 0.05, 0, 0.6) * (st.step > 0 ? 1 : 0);
  if (splashT > 0) splashT -= dt;
  st.soak = Math.max(0, st.soak - dt * 0.012);
  if (st.mode === 'easy' || st.autoPedal) { st.speed += (st.speedTarget - st.speed) * Math.min(1, dt * 3); if (Math.abs(st.speedTarget - st.speed) < 0.01) st.autoPedal = false; }
  else if (st.mode === 'real' && st.drag && !pedalDrag && st.step > 0 && st.step < 7) st.speed = clamp(st.speed + st.drift * dt, 0, 1);   // 실전: 누르는 동안 속도가 조금씩 흔들림
  pedal.classList.toggle('drift', st.mode === 'real' && !speedOK());
  placeHands(now);
  // 게이지
  gauge('water', st.wet, null, [0.3, 0.85], st.wet < 0.18 ? '말랐어요' : st.wet > 0.85 ? (st.soak > 0.3 ? '흥건해요' : '촉촉') : '좋아요');
  gauge('wobble', st.wobble, null, [0, 0.14], Math.round(st.wobble * 100) + '%');
  const eg = host.querySelector('[data-g="extra"]');
  if (k === 'center') { eg.hidden = false; const need = st.mode === 'easy' ? 1 : 2; gauge('extra', st.cone, st.coneDir === 1 ? '코닝 ↓ 눌러요' : '코닝 ↑ 올려요', [0.85, 1], '●'.repeat(Math.min(st.coneCycles, need)) + '○'.repeat(Math.max(0, need - st.coneCycles))); }
  else if (k === 'open') { eg.hidden = false; gauge('extra', clamp(st.floorT / 0.6, 0, 1), '바닥 두께', [0.09 / 0.6, 0.2 / 0.6], (st.floorT * 10).toFixed(1) + 'cm'); }
  else if (k === 'widen') { eg.hidden = false; const v = VESSELS[st.vessel]; gauge('extra', clamp(st.floorR / (v.floorR * 1.3), 0, 1), '바닥 넓이', [0.88 / 1.3, 1], (st.floorR * 20).toFixed(1) + 'cm'); }
  else if (k === 'pull') { eg.hidden = false; const v = VESSELS[st.vessel]; gauge('extra', clamp(st.H / (v.H * 1.3), 0, 1), '높이', [0.82 / 1.3, 1.12 / 1.3], (st.H * 10).toFixed(1) + 'cm'); }
  else if (k === 'shape') { eg.hidden = false; gauge('extra', st.shapeScore, '모양 일치', [0.55, 1], Math.round(st.shapeScore * 100) + '%'); }
  else eg.hidden = true;
  if (now > st.warnUntil) warnEl.classList.remove('show');
  renderPedal();
  if (k !== 'open') updateNext();
  // 카메라: 높이에 따라 살짝 위로
  const topY = st.opened ? st.H : st.lumpH;
  cam.position.lerp(V(CAM_POS.x, (CAM_POS.y + topY * 0.25) * camK, (CAM_POS.z + topY * 0.15) * camK), 0.08);
  cam.lookAt(CAM_LOOK.x, CAM_LOOK.y + topY * 0.18, CAM_LOOK.z);
  R.render(S, cam); drawGuide(now); drawSection();
  requestAnimationFrame(loop);
}

window.HeukThrow = { open, close, get active() { return st.active; }, _st: st, _act: act, _VESSELS: VESSELS, _cam: cam, _frontR: () => frontR() };
})();
