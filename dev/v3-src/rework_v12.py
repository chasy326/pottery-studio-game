W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a))
    s=s.replace(a,b)
# free shaping: the chosen button decides the direction; the touched height decides where
rep("""var bt=cClamp(f.y/Math.max(.01,s2.H),0,1),cr=cInterp(s2.r,bt),gap=f.r-cr,mv=Math.hypot(dx,dy),delta=cClamp(gap*Math.min(1,mv*.035)*(gap<0?.55:.35),-.02,.02);if(Math.abs(f.r-cr)<.004)return;cs3.band=bt*CN;""",
"""var bt=cClamp(f.y/Math.max(.01,s2.H),0,1),mv=Math.min(30,Math.hypot(dx,dy)),delta=(window.__sosoFreeDir===-1?-1:1)*mv*.00026*cClamp(.45/Math.max(.05,s2.H),1,4);if(mv<.5)return;cs3.band=bt*CN;window.__sosoFreeT=bt;window.__sosoFreeAt=performance.now();""")
rep("if(f.y<0||f.y>s2.H*1.02)return;","if(f.y<-.15||f.y>s2.H+.15)return;")
extra=r'''<style id="soso-v12-style">
#sosoFreeBtns{position:absolute;z-index:18;left:50%;bottom:190px;transform:translateX(-50%);display:none;flex-direction:row;gap:34px;align-items:flex-end}
#sosoFreeBtns.show{display:flex}
#sosoFreeBtns .fb{all:unset;position:relative;display:block;width:52px;cursor:pointer;-webkit-tap-highlight-color:transparent;text-align:center}
#sosoFreeBtns .fb .cb{position:relative;display:block;width:50px;height:52px;margin:0 auto}
#sosoFreeBtns .fb .base{position:absolute;left:0;right:0;bottom:0;height:42px;border-radius:50%;background:linear-gradient(#f3cf9f,#d9a877);border:2.5px solid #5a2e16;box-sizing:border-box}
#sosoFreeBtns .fb .top{position:absolute;left:3px;right:3px;top:0;height:40px;border-radius:50%;border:2.5px solid #5a2e16;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -6px 0 rgba(0,0,0,.16);transition:top .1s}
#sosoFreeBtns .fb .top svg{width:22px;height:22px}
#sosoFreeBtns .fb .top::after{content:'';position:absolute;right:7px;top:5px;width:9px;height:6px;border-top:2.5px solid #fff;border-radius:50%;transform:rotate(30deg)}
#sosoFreeBtns .fb.plus .top{background:linear-gradient(#93ea5d,#5fc63a)}
#sosoFreeBtns .fb.minus .top{background:linear-gradient(#ff7383,#ef4359)}
#sosoFreeBtns .fb .lb{display:inline-block;margin-top:3px;font-size:13px;line-height:1.3;color:#5b3a1f;background:#fffaf0e6;border-radius:8px;padding:0 6px}
#sosoFreeBtns .fb:not(.on){opacity:.82}
#sosoFreeBtns .fb:not(.on) .top{filter:saturate(.75)}
#sosoFreeBtns .fb.on .top{top:6px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.16)}
#sosoFreeBtns .fb.on .cb::before{content:'';position:absolute;left:-5px;right:-5px;top:-1px;bottom:-5px;border-radius:50%;box-shadow:0 0 0 3px #ffd84d,0 0 10px #ffd84daa}
#sosoFreeBtns .fb.on .lb{background:#5b3a1f;color:#fff}
</style>
<script id="soso-v12">
(function(){
function trimOn(){return window.__sosoTrim&&__sosoTrim.active;}
function vis(){var m=document.getElementById('makeMode');return m&&m.classList.contains('show')&&window.cs3&&!trimOn()&&!cs3.isTrim;}
/* ---- 1) 가운데 열기 / 벽 올리기: 원래 화면 그대로 확대 (카메라는 그대로) ---- */
var Z=1,own=false;
function zoomWant(){try{if(!vis()||cs3.view!=='front'||cs3.cut||cs3.freeMode||cs3.finishReady)return 1;if(cs3.step===1||cs3.step===2)return 1.8;if(cs3.step===3||cs3.step===4)return 1.5;return 1;}catch(e){return 1}}
function applyZoom(){try{var want=zoomWant();Z+=(want-Z)*.12;if(Math.abs(want-Z)<.002)Z=want;
  var mode=document.getElementById('makeMode');
  if(Z<=1.001){if(own){own=false;camera3.clearViewOffset();camera3.updateProjectionMatrix();}if(mode&&mode.style.backgroundSize){mode.style.removeProperty('background-size');mode.style.removeProperty('background-position');}return;}
  if(cs3.view!=='front'){own=false;return;}
  var el=renderer3.domElement,W=el.clientWidth||390,H=el.clientHeight||844;camera3.clearViewOffset();camera3.updateMatrixWorld(true);
  var P=potGroup3.position,k=potGroup3.scale.x,q=new THREE.Vector3(P.x,P.y+heightScale*k*.5,P.z).project(camera3),px=Math.min(W,Math.max(0,(q.x+1)/2*W)),py=Math.min(H,Math.max(0,(1-q.y)/2*H));
  var ty=py;try{var tb=document.querySelector('#makeMode .soso-top-exit'),hp=document.getElementById('makeHint'),top=tb?tb.getBoundingClientRect().bottom+70:140,bot=hp&&hp.getBoundingClientRect().height?hp.getBoundingClientRect().top-10:H*.8;ty=(top+bot)/2-el.getBoundingClientRect().top;}catch(e){}
  var k2=Math.min(1,(Z-1)/.4),dy=(ty-py)*k2,ox=Math.min(W-W/Z,Math.max(0,px*(1-1/Z))),oy=Math.min(H-H/Z,Math.max(0,py-(py+dy)/Z));
  camera3.setViewOffset(W,H,ox,oy,W/Z,H/Z);camera3.updateProjectionMatrix();own=true;
  if(mode){var mr=mode.getBoundingClientRect(),cr=el.getBoundingClientRect(),cl=cr.left-mr.left,ct=cr.top-mr.top,Ox=cl+ox-cl/Z,Oy=ct+oy-ct/Z;mode.style.setProperty('background-size',(mr.width*Z).toFixed(1)+'px '+(mr.height*Z).toFixed(1)+'px','important');mode.style.setProperty('background-position',(-Ox*Z).toFixed(1)+'px '+(-Oy*Z).toFixed(1)+'px','important');}}catch(e){}}
window.__sosoZoom=function(){return Z;};
/* ---- 2) 자유 성형: 늘리기 / 줄이기 ---- */
window.__sosoFreeDir=1;
var box=null,ring=null,wasFree=false;
var ICO={plus:'<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><path d="M12 4v16M4 12h16" stroke="#5a2e16" stroke-width="1.2" stroke-linecap="round" opacity=".25"/></svg>',minus:'<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>'};
function setDir(d){window.__sosoFreeDir=d;if(!box)return;box.querySelector('.plus').classList.toggle('on',d===1);box.querySelector('.minus').classList.toggle('on',d===-1);try{if(navigator.vibrate)navigator.vibrate(8);}catch(e){}}
function ensure(){var m=document.getElementById('makeMode');if(!m)return;if(!box){box=document.createElement('div');box.id='sosoFreeBtns';
  box.innerHTML='<button type="button" class="fb plus on" aria-label="늘리기"><span class="cb"><span class="base"></span><span class="top">'+ICO.plus+'</span></span><span class="lb">늘리기</span></button><button type="button" class="fb minus" aria-label="줄이기"><span class="cb"><span class="base"></span><span class="top">'+ICO.minus+'</span></span><span class="lb">줄이기</span></button>';
  m.appendChild(box);['pointerdown','pointermove','pointerup','touchstart','touchmove','mousedown'].forEach(function(ev){box.addEventListener(ev,function(e){e.stopPropagation();},{passive:true});});
  box.querySelector('.plus').addEventListener('click',function(e){e.stopPropagation();setDir(1);});box.querySelector('.minus').addEventListener('click',function(e){e.stopPropagation();setDir(-1);});}
  box.querySelectorAll('button').forEach(function(b){if(/soso-candy/.test(b.className))b.className=b.className.split(/\s+/).filter(function(c){return c.indexOf('soso-candy')!==0;}).join(' ');});}
function ringUpdate(free){try{if(!ring){ring=new THREE.Mesh(new THREE.TorusGeometry(1,.022,8,72),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.renderOrder=9;}
  if(ring.parent!==potGroup3)potGroup3.add(ring);var age=performance.now()-(window.__sosoFreeAt||0),on=free&&age<260&&dragging;ring.visible=on;if(!on)return;
  var st=cs3.renderState||craftTargetState3(),t=window.__sosoFreeT||.5,r=cInterp(st.r,t)+.012;ring.position.y=st.H*t;ring.scale.set(r,r,r);ring.material.color.setHex(window.__sosoFreeDir===-1?0xffd0d6:0xffffff);}catch(e){}}
var hintEl=null;
function loop(){requestAnimationFrame(loop);try{ensure();if(!box)return;var free=vis()&&cs3.freeMode&&!cs3.cut&&cs3.centered;
  if(free&&!wasFree)setDir(1);wasFree=free;box.classList.toggle('show',!!free);if(free){var mh=document.getElementById('makeHint'),mm=document.getElementById('makeMode');if(mh&&mm){var hr=mh.getBoundingClientRect();if(hr.height>0){var bb=Math.round(mm.getBoundingClientRect().bottom-hr.top+20)+'px';if(box.style.bottom!==bb)box.style.bottom=bb;}}}ringUpdate(free);
  if(free){hintEl=hintEl||document.getElementById('makeHint');var tx=window.__sosoFreeDir===-1?'벽을 위아래로 문지르면 안으로 들어가요':'벽을 위아래로 문지르면 바깥으로 늘어나요';if(hintEl&&hintEl.textContent!==tx)hintEl.textContent=tx;}
}catch(e){}}
requestAnimationFrame(loop);
var wrapped=null;function wrap(){try{if(!renderer3||wrapped===renderer3)return;wrapped=renderer3;var _rend=renderer3.render;renderer3.render=function(){applyZoom();return _rend.apply(this,arguments);};}catch(e){}}setInterval(wrap,200);
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
