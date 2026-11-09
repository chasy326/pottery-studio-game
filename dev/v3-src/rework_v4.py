import json
W = '/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s = open(W + '소소도예_v3_최종.html', encoding='utf-8').read()

UNDO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 11L8 21l11 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21h17c7 0 12 5 12 11s-5 10-12 10h-6" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>'
REDO = '<svg viewBox="0 0 48 48" aria-hidden="true" style="transform:scaleX(-1)"><path d="M19 11L8 21l11 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21h17c7 0 12 5 12 11s-5 10-12 10h-6" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>'
EYE = '<g><path d="M2 24c4-6 8-9 12-9s8 3 12 9c-4 6-8 9-12 9s-8-3-12-9z" fill="#fff" stroke="#6b4425" stroke-width="2.2"/><circle cx="14" cy="24" r="4" fill="#6b4425"/></g>'
POT = '<path d="M34 12h10v3c-1 1-2 2-2 3 5 3 8 7 8 13 0 7-5 11-11 11s-11-4-11-11c0-6 3-10 8-13 0-1-1-2-2-3z" fill="#d98b52" stroke="#6b4425" stroke-width="2"/>'
VIEW = {
 'front': ['정면', '<svg viewBox="0 0 56 48" aria-hidden="true">' + POT + EYE + '</svg>'],
 'side': ['옆면', '<svg viewBox="0 0 56 48" aria-hidden="true">' + POT + '<g transform="translate(2 -12) rotate(25 14 24)">' + EYE[3:-4] + '</g></svg>'],
 'top': ['위쪽', '<svg viewBox="0 0 56 48" aria-hidden="true"><ellipse cx="34" cy="33" rx="17" ry="11" fill="#d98b52" stroke="#6b4425" stroke-width="2"/><ellipse cx="34" cy="33" rx="8" ry="5" fill="#8a5530"/><g transform="translate(20 -14)">' + EYE[3:-4] + '</g></svg>'],
}
PALETTE = '<svg viewBox="0 0 64 64"><defs><linearGradient id="gpl2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8e6c4"/><stop offset="1" stop-color="#d9b47d"/></linearGradient></defs><path d="M32 8C18 8 7 18 7 31s10 25 24 25c4 0 5-3 4-6s0-6 4-6h6c8 0 13-5 13-13C58 18 46 8 32 8z" fill="url(#gpl2)" stroke="#b98a52" stroke-width="2"/><circle cx="19" cy="28" r="4.5" fill="#e2553f"/><circle cx="27" cy="18" r="4.5" fill="#f2c14e"/><circle cx="39" cy="18" r="4.5" fill="#5fbf6a"/><circle cx="47" cy="28" r="4.5" fill="#4c8fd6"/></svg>'

extra = """<style id="soso-v4-style">
/* 1. step buttons: name only */
#makeMode #sosoBottomPanel .tooltray .tool b,#makeMode .tooltray .tool b,.tooltray .tool b{display:none!important}
.tooltray .tool .soso-step-mark{display:none!important}
/* 6. no bottom GNB on home */
.nav{display:none!important}
/* 4. undo / redo icons */
#sosoUndoRedo .soso-undo-btn{font-size:0!important;display:grid!important;place-items:center!important}
#sosoUndoRedo .soso-undo-btn svg{width:54%;height:54%;filter:drop-shadow(0 2px 0 rgba(0,0,0,.25));position:relative;z-index:2}
#sosoUndoRedo .soso-undo-btn:disabled svg{opacity:.6}
/* 5. view toggle: icon + name */
#sosoViewToggle{width:auto!important;min-width:104px!important;height:56px!important;padding:0 12px 0 8px!important;border-radius:28px!important;display:flex!important;align-items:center!important;gap:4px!important;font-size:19px!important;color:#5b3a1f!important;white-space:nowrap}
#sosoViewToggle svg{width:40px;height:34px;flex:none;position:relative;z-index:2}
#sosoViewToggle span{position:relative;z-index:2}
/* 2. opening help animation */
#sosoOpenHelp{position:absolute;z-index:16;width:0;height:0;pointer-events:none;display:none}
#sosoOpenHelp.show{display:block}
#sosoOpenHelp .finger{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.92);border:3px solid #e97c31;box-shadow:0 3px 8px rgba(80,50,25,.35);animation:soso-open-finger 2.4s ease-in-out infinite}
#sosoOpenHelp .finger::after{content:'';position:absolute;inset:11px;border-radius:50%;background:#e97c31;opacity:.85}
#sosoOpenHelp .trail{position:absolute;left:0;top:0;width:70px;height:50px;overflow:visible;animation:soso-open-trail 2.4s ease-in-out infinite}
#sosoOpenHelp .bubble{position:absolute;left:50%;top:-78px;transform:translateX(-50%);white-space:nowrap;background:#fffaf0;border:2px solid #e2c99a;border-radius:14px;padding:4px 12px;font-size:19px;color:#5b3a1f;box-shadow:0 3px 0 rgba(91,58,31,.18)}
@keyframes soso-open-finger{0%{transform:translate(0,-16px) scale(1);opacity:0}12%{transform:translate(0,0) scale(1);opacity:1}22%{transform:translate(0,0) scale(.8)}55%{transform:translate(0,30px) scale(.8)}85%{transform:translate(34px,30px) scale(.8);opacity:1}100%{transform:translate(34px,30px) scale(1);opacity:0}}
@keyframes soso-open-trail{0%,20%{opacity:0}30%,85%{opacity:1}100%{opacity:0}}
</style>
<script id="soso-v4">
(function(){
var UNDO=""" + json.dumps(UNDO) + """,REDO=""" + json.dumps(REDO) + """,VIEW=""" + json.dumps(VIEW, ensure_ascii=False) + """,PALETTE=""" + json.dumps(PALETTE) + """;
function tool(){try{return currentTool}catch(e){return null}}
/* 7. 공방 꾸미기 -> palette icon */
function palette(){document.querySelectorAll('.side .iconbtn').forEach(function(b){if((b.textContent||'').indexOf('꾸미기')<0)return;var sp=b.querySelector('[class*="icon3d-"]');if(!sp||sp.dataset.sosoIco==='palette')return;sp.dataset.sosoIco='palette';sp.classList.add('soso-ico2');sp.innerHTML=PALETTE;});}
/* 4. undo/redo */
function undoIcons(){var box=document.getElementById('sosoUndoRedo');if(!box)return;var u=box.querySelector('[data-op="undo"]'),r=box.querySelector('[data-op="redo"]');if(u&&!u.querySelector('svg'))u.innerHTML=UNDO;if(r&&!r.querySelector('svg'))r.innerHTML=REDO;}
/* 5. view toggle */
function viewIcon(){var v=document.getElementById('sosoViewToggle');if(!v)return;var cur=(window.cs3&&cs3.view)||'front';if(v.dataset.v4===cur)return;v.dataset.v4=cur;var d=VIEW[cur]||VIEW.front;v.innerHTML=d[1]+'<span>'+d[0]+'</span>';v.setAttribute('aria-label','시점 전환, 지금 '+d[0]);
 v.onclick=function(){if(!window.cs3||cs3.isTrim)return;var c=cs3.view||'front',n=c==='front'?'side':c==='side'?'top':'front';angle(n==='front'?'정면':n==='side'?'옆면':'위쪽');viewIcon();};}
/* 3. wall pulling: accept touches on the wall edge / just outside it */
var _hit=hitPot;
function potRect(){try{var c=renderer3.domElement.getBoundingClientRect(),v=new THREE.Box3().setFromObject(potMesh3);var pr=function(x,y,z){var q=new THREE.Vector3(x,y,z).project(camera3);return{x:c.left+(q.x+1)/2*c.width,y:c.top+(1-q.y)/2*c.height};};var cx=(v.min.x+v.max.x)/2,cz=(v.min.z+v.max.z)/2,t=pr(cx,v.max.y,cz),b=pr(cx,v.min.y,cz),r=pr(v.max.x,(v.min.y+v.max.y)/2,cz),l=pr(v.min.x,(v.min.y+v.max.y)/2,cz);return{cx:(l.x+r.x)/2,half:Math.abs(r.x-l.x)/2,top:Math.min(t.y,b.y),bot:Math.max(t.y,b.y)};}catch(e){return null}}
hitPot=function(e){var h=_hit(e);if(h||!e||!window.cs3)return h;var t=tool();if(t!=='pull'&&t!=='free'&&t!=='open')return h;var R=potRect();if(!R)return h;var x=e.clientX,y=e.clientY;if(y<R.top-30||y>R.bot+24||Math.abs(x-R.cx)>R.half+64)return h;var yy=Math.max(R.top+3,Math.min(R.bot-3,y)),dir=x<R.cx?1:-1;for(var k=0;k<=R.half+70;k+=3){var hh=_hit({clientX:x+dir*k,clientY:yy});if(hh)return hh;}return h;};
/* 2. opening help */
var help=null,openTouched=false,lastStep=0;
function ensureHelp(){var mode=document.getElementById('makeMode');if(!mode)return null;if(!help){help=document.createElement('div');help.id='sosoOpenHelp';help.innerHTML='<div class="bubble">가운데를 꾹 누르고 아래로, 옆으로!</div><svg class="trail" viewBox="0 0 70 50"><path d="M0 0v30h34" fill="none" stroke="#e97c31" stroke-width="4" stroke-dasharray="6 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 22l8 8-8 8" fill="none" stroke="#e97c31" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="finger"></div>';mode.appendChild(help);}return help;}
var _move=craftMoveSub3;craftMoveSub3=function(dx,dy,e){if(tool()==='open'&&(dx||dy))openTouched=true;return _move.apply(this,arguments);};
function updateHelp(){var h=ensureHelp();if(!h||!window.cs3)return;var mode=document.getElementById('makeMode');var on=mode.classList.contains('show')&&cs3.step===2&&!cs3.freeMode&&!cs3.isTrim&&!cs3.cut&&!openTouched&&!dragging&&(cs3.view||'front')==='front';if(cs3.step!==lastStep){if(cs3.step===2)openTouched=false;lastStep=cs3.step;}h.classList.toggle('show',on);if(!on)return;var R=potRect();if(!R)return;var mr=mode.getBoundingClientRect();h.style.left=(R.cx-mr.left)+'px';h.style.top=(R.top-mr.top+6)+'px';}
function loop(){try{palette();undoIcons();viewIcon();updateHelp();}catch(e){}requestAnimationFrame(loop);}
requestAnimationFrame(loop);
})();
</script>
"""
i = s.rfind('</body>')
s = s[:i] + extra + s[i:]
open(W + '소소도예_v3_최종2.html', 'w', encoding='utf-8').write(s)
print('ok', len(s))
