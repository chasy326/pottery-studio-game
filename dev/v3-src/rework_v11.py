W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a))
    s=s.replace(a,b)
rep("'높이선을 맞춰요. 가장자리나 빈 공간에서 시작해도 돼요.'","'흙을 위아래로 끌어 점선 높이에 맞춰요.'")
rep("cs3.freeMode?'자유롭게 만들기 · '+name:","cs3.freeMode?'자유 성형 · '+name:")
rep("banner.textContent='1차 완성!';","banner.textContent='모양 완성!';")
rep("craftMsg3('1차 완성!',2500);if(typeof toast==='function')toast('짠! 1차 완성!');","craftMsg3('모양 완성!',2500);if(typeof toast==='function')toast('짠! 모양 완성!');")
rep(">모양 다시 보기</button>",">한 바퀴 보기</button>")
rep("<i class=\"icon3d-clay white\" aria-hidden=\"true\"></i>백자토</button>","<i class=\"icon3d-clay white\" aria-hidden=\"true\"></i>백자토<small class=\"clay-desc\">하얗고 매끈해요</small></button>")
rep("<i class=\"icon3d-clay black\" aria-hidden=\"true\"></i>흑토</button>","<i class=\"icon3d-clay black\" aria-hidden=\"true\"></i>흑토<small class=\"clay-desc\">검고 묵직해요</small></button>")
rep("<i class=\"icon3d-clay buncheong\" aria-hidden=\"true\"></i>분청토</button>","<i class=\"icon3d-clay buncheong\" aria-hidden=\"true\"></i>분청토<small class=\"clay-desc\">회백색 소박한 느낌</small></button>")
extra=r'''<style id="soso-v11-style">
.choice button .clay-desc{display:block;font-size:13px!important;font-weight:400;color:#8a6a48;margin-top:2px;line-height:1.2;word-break:keep-all}
/* selected vessel: keep the card light, mark it with an outline */
.vessel-card.selected.soso-candy,.vessel-card.selected{--face-top:#fffaf0!important;--face-mid:#fff1dc!important;--edge:#e97c31!important;--outline:#e97c31!important;background:#fff4e4!important;box-shadow:0 0 0 3px #e97c31 inset,0 4px 0 #c9662a!important}
.vessel-card.selected strong,.vessel-card.selected small{color:#5b3a1f!important;text-shadow:none!important}
#makeMode.soso-sideview{background:radial-gradient(120% 70% at 50% 38%,#fbf1de 0%,#efdcbc 55%,#d3ad7f 100%)!important}
#makeMode.soso-sideview .focus-stage{visibility:hidden!important}
#sosoHeightHelp,#sosoCutHelp{position:absolute;z-index:16;pointer-events:none;display:none}
#sosoHeightHelp.show,#sosoCutHelp.show{display:block}
#sosoHeightHelp{width:0;height:0}
#sosoHeightHelp .arr{position:absolute;left:-18px;top:-46px;width:36px;height:92px;animation:soso-hh 1.6s ease-in-out infinite}
@keyframes soso-hh{0%,100%{transform:translateY(-8px)}50%{transform:translateY(8px)}}
#sosoCutHelp{left:0;right:0;height:0}
#sosoCutHelp .ln{position:absolute;left:8%;right:8%;top:-3px;border-top:5px dashed #fff3c9;filter:drop-shadow(0 1px 1px rgba(90,50,20,.5))}
#sosoCutHelp .fg{position:absolute;top:-22px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.92);border:3px solid #e97c31;animation:soso-cut 2s ease-in-out infinite}
#sosoCutHelp .fg::after{content:'';position:absolute;inset:11px;border-radius:50%;background:#e97c31}
@keyframes soso-cut{0%{left:6%;opacity:0}12%{opacity:1}85%{left:80%;opacity:1}100%{left:84%;opacity:0}}
#sosoExitAsk{position:absolute;z-index:120;inset:0;display:none;align-items:center;justify-content:center;background:rgba(60,40,20,.35);padding:20px}
#sosoExitAsk.show{display:flex}
#sosoExitAsk .card{width:100%;max-width:330px;background:#fffaf0;border:2px solid #e2c99a;border-radius:22px;padding:18px 16px 16px;text-align:center;color:#5b3a1f;box-shadow:0 6px 0 rgba(91,58,31,.25)}
#sosoExitAsk h3{margin:0 0 6px;font-size:23px;font-weight:400}
#sosoExitAsk p{margin:0 0 14px;font-size:16px;color:#8a6a48}
#sosoExitAsk .row{display:flex;gap:8px}
#sosoExitAsk button{flex:1;height:50px;border-radius:16px;font:inherit;font-size:19px;cursor:pointer}
#sosoExitAsk .stay{border:2px solid #8a4416;background:linear-gradient(180deg,#f29a4a,#c9661f);color:#fff;text-shadow:-1px 0 #6b3510,1px 0 #6b3510,0 -1px #6b3510,0 1px #6b3510}
#sosoExitAsk .leave{border:2px solid #e2c99a;background:#fff;color:#8a6a48}
</style>
<script id="soso-v11">
(function(){
function pg(){try{return potGroup3}catch(e){return null}}
function trimOn(){return window.__sosoTrim&&__sosoTrim.active;}
/* ---- 옆면 시점 = 가까이서 보는 시점 (물레 3D, 단계별 각도) ---- */
var camT=null,camP=null;
function sideCam(snap){if(!window.cs3||cs3.view!=='side'||trimOn()||cs3.isTrim)return;try{var P=potGroup3.position,k=potGroup3.scale.x,R=Math.max(.2,Math.max.apply(null,radiusProfile))*k,h=Math.max(.2,heightScale)*k,el=renderer3.domElement,W=el.clientWidth||390,H=el.clientHeight||844,aspect=W/H,tanH=Math.tan(THREE.MathUtils.degToRad(camera3.fov/2));
  var ELV=THREE.MathUtils.degToRad(cs3.step===2&&!cs3.freeMode?38:16),D=Math.max((R*2*2.5)/(2*tanH*aspect),(h*2.3)/(2*tanH)),tgt=new THREE.Vector3(P.x,P.y+h*.5,P.z),pos=new THREE.Vector3(tgt.x,tgt.y+D*Math.sin(ELV),tgt.z+D*Math.cos(ELV));
  if(snap||!camT){camT=tgt.clone();camP=pos.clone();}else{camT.lerp(tgt,.08);camP.lerp(pos,.08);}
  try{wheelGroup3.visible=true;}catch(e){}camera3.position.copy(camP);camera3.up.set(0,1,0);camera3.lookAt(camT);camera3.zoom=1;camera3.setViewOffset(W,H,0,Math.round(H*.07),W,H);camera3.updateProjectionMatrix();camera3.updateMatrixWorld(true);}catch(e){}}
function clearOff(){try{if(camera3.view&&camera3.view.enabled&&!trimOn()){camera3.clearViewOffset();camera3.updateProjectionMatrix();}}catch(e){}}
var _ang=angle;angle=function(){if(cs3.view==='side')clearOff();var r=_ang.apply(this,arguments);if(cs3.view==='side')sideCam(true);else camT=null;return r;};
var _rig=craftApplyRig3;craftApplyRig3=function(){if(window.cs3&&cs3.view==='side')clearOff();var r=_rig.apply(this,arguments);if(window.cs3&&cs3.view==='side')sideCam(true);return r;};
/* auto: opening / pulling / free shaping → close side view, once per stage */
var autoKey='';
function stageKey(){return cs3.freeMode?'free':(cs3.step===2||cs3.step===3)?'s'+cs3.step:'';}
/* ---- helpers on screen ---- */
var hh=null,ch=null;
function ensure(){var m=document.getElementById('makeMode');if(!m)return;if(!hh){hh=document.createElement('div');hh.id='sosoHeightHelp';hh.innerHTML='<svg class="arr" viewBox="0 0 36 92"><path d="M18 6v80" stroke="#e97c31" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 7"/><path d="M6 18L18 5l12 13M6 74l12 13 12-13" fill="none" stroke="#e97c31" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';m.appendChild(hh);}if(!ch){ch=document.createElement('div');ch.id='sosoCutHelp';ch.innerHTML='<div class="ln"></div><div class="fg"></div>';m.appendChild(ch);}}
var cutTouched=false,hTouched=false;
document.addEventListener('pointerdown',function(e){try{if(!window.cs3)return;var c=renderer3.domElement;if(e.target!==c)return;if(cs3.step===4&&!cs3.cut)cutTouched=true;if(cs3.heightMode)hTouched=true;}catch(err){}},true);
var lastStep=0;
function loop(){requestAnimationFrame(loop);try{var mode=document.getElementById('makeMode');if(!mode||!window.cs3)return;ensure();var show=mode.classList.contains('show')&&!trimOn()&&!cs3.isTrim;
  if(cs3.step!==lastStep){lastStep=cs3.step;cutTouched=false;}
  if(!show){autoKey='';}
  var k=show?stageKey():'';if(k&&k!==autoKey&&cs3.centered&&!cs3.cut&&!dragging&&cs3.activePointer==null){autoKey=k;if(cs3.view!=='side')angle('옆면');else sideCam(true);}
  if(k==='')autoKey=autoKey&&show?autoKey:'';
  var side=show&&cs3.view==='side';mode.classList.toggle('soso-sideview',side);if(side)sideCam(false);
  /* height helper */
  var hOn=show&&cs3.step===1&&cs3.centered&&cs3.heightMode&&!hTouched&&!dragging;hh.classList.toggle('show',hOn);
  if(hOn){var P=potGroup3.position,kk=potGroup3.scale.x,q=new THREE.Vector3(P.x,P.y+heightScale*kk*.6,P.z).project(camera3),r=renderer3.domElement.getBoundingClientRect(),mr=mode.getBoundingClientRect();hh.style.left=(r.left+(q.x+1)/2*r.width-mr.left+70)+'px';hh.style.top=(r.top+(1-q.y)/2*r.height-mr.top)+'px';}
  if(!cs3.heightMode)hTouched=false;
  /* cut helper */
  var cOn=show&&cs3.step===4&&!cs3.cut&&!cutTouched&&(cs3.cutProg||0)<.05;ch.classList.toggle('show',cOn);
  if(cOn){var b=craftBaseScreen3(),mr2=mode.getBoundingClientRect();ch.style.top=(b.y-mr2.top)+'px';}
}catch(e){}}
requestAnimationFrame(loop);
/* ---- 나가기 확인 ---- */
function ask(onLeave){var m=document.getElementById('makeMode');var a=document.getElementById('sosoExitAsk');if(!a){a=document.createElement('div');a.id='sosoExitAsk';a.innerHTML='<div class="card"><h3>작업을 멈추고 나갈까요?</h3><p>나중에 이어서 만들 수 있어요.</p><div class="row"><button type="button" class="leave">나가기</button><button type="button" class="stay">계속 만들기</button></div></div>';m.appendChild(a);}
  a.querySelectorAll('button').forEach(function(b){b.className=b.className.split(/\s+/).filter(function(c){return c.indexOf('soso-candy')!==0;}).join(' ');});
  a.querySelector('.stay').onclick=function(){a.classList.remove('show');};a.querySelector('.leave').onclick=function(){a.classList.remove('show');onLeave();};a.classList.add('show');}
document.addEventListener('click',function(e){try{var b=e.target.closest&&e.target.closest('button');if(!b)return;var top=document.getElementById('sosoCraftTopbar');var isBack=(top&&top.contains(b)&&b===top.querySelector('button'))||/나가기/.test(b.textContent||'')&&b.closest('.make-top');if(!isBack)return;var mode=document.getElementById('makeMode');if(!mode||!mode.classList.contains('show'))return;var started=window.cs3&&(cs3.centered||trimOn());if(!started)return;if(b.dataset.sosoAsked==='1'){b.dataset.sosoAsked='';return;}
  e.preventDefault();e.stopImmediatePropagation();ask(function(){b.dataset.sosoAsked='1';b.click();});}catch(err){}},true);
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
