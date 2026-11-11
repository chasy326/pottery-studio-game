import base64
W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
HAND='data:image/png;base64,'+base64.b64encode(open(W+'../hand/hand.png','rb').read()).decode()
extra=r'''<style id="soso-v14-style">
#makeMode.soso-easy #sosoOpenHelp,#makeMode.soso-easy #sosoCutHelp .fg,#makeMode.soso-easy #sosoBottomPanel .tooltray,#makeMode.soso-easy #sosoBottomPanel .speed-control{display:none!important}
#sosoProg{position:absolute;z-index:30;left:50%;top:84px;transform:translateX(-50%);display:none;align-items:center;gap:3px;padding:4px 8px;border-radius:18px;background:#fffaf0e8;border:2px solid #e2c99a;box-shadow:0 3px 0 rgba(91,58,31,.15)}
#makeMode.soso-easy.soso-forming #sosoProg{display:flex}
#sosoProg .d{width:21px;height:21px;border-radius:50%;background:#efe3cc;color:#9a7b58;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1}
#sosoProg .d.done{background:#5fa86a;color:#fff}
#sosoProg .d.on{background:#e97c31;color:#fff;box-shadow:0 0 0 3px #ffd7a8}
#sosoProg .l{width:8px;height:3px;border-radius:2px;background:#e2c99a}
#sosoProg .l.done{background:#5fa86a}
#sosoGauge{display:none;height:10px;margin:2px 14px 4px;border-radius:6px;background:#eadbc0;overflow:hidden}
#makeMode.soso-easy.soso-forming #sosoGauge.on{display:block}
#sosoGauge i{display:block;height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,#f2a55a,#e97c31);transition:width .25s}
#sosoGauge.full i{background:#5fa86a}
#sosoHand{position:absolute;z-index:48;left:0;top:0;width:64px;height:auto;pointer-events:none;display:none;filter:drop-shadow(0 4px 4px rgba(60,30,60,.3));transform-origin:12px 2px;will-change:transform,left,top}
#sosoHandRip{position:absolute;z-index:47;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #fff;pointer-events:none;display:none;opacity:0}
#sosoGood{position:absolute;z-index:52;left:50%;top:36%;transform:translate(-50%,-50%) scale(.8);padding:10px 22px;border-radius:22px;background:#fff;border:3px solid #5fa86a;color:#2f7a3e;font-size:24px;white-space:nowrap;box-shadow:0 5px 0 rgba(47,122,62,.25);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}
#sosoGood.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
#sosoHelpHand{position:absolute;z-index:31;right:12px;top:126px;width:40px;height:40px;border-radius:50%;border:2px solid #e2c99a;background:#fffaf0;color:#8a5a2c;font:inherit;font-size:22px;line-height:1;display:none;align-items:center;justify-content:center;box-shadow:0 3px 0 rgba(91,58,31,.18);padding:0;cursor:pointer}
#makeMode.soso-easy.soso-forming #sosoHelpHand{display:flex}
#sosoFreeAsk{position:absolute;z-index:55;left:0;right:0;bottom:0;display:none;padding:14px 14px calc(16px + env(safe-area-inset-bottom));background:#fffaf0;border-top:2px solid #e2c99a;border-radius:22px 22px 0 0;box-shadow:0 -6px 16px rgba(60,40,20,.18);color:#5b3a1f;text-align:center}
#sosoFreeAsk.show{display:block;animation:soso-ask-up .25s ease}
@keyframes soso-ask-up{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
#sosoFreeAsk h3{margin:0 0 4px;font-size:22px;font-weight:400}
#sosoFreeAsk p{margin:0 0 12px;font-size:15px;color:#8a6a48}
#sosoFreeAsk .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#sosoFreeAsk button,#sosoFreeDone{all:unset;box-sizing:border-box;text-align:center;cursor:pointer;border-radius:18px;font-size:19px;padding:13px 6px;-webkit-tap-highlight-color:transparent}
#sosoFreeAsk .a{border:2px solid #e2c99a;background:#fff;color:#5b3a1f;box-shadow:0 3px 0 #d9c3a0}
#sosoFreeAsk .b{border:2px solid #8a4416;background:linear-gradient(180deg,#f29a4a,#c9661f);color:#fff;box-shadow:0 4px 0 #8a4416}
#sosoFreeDone{position:absolute;z-index:19;right:12px;bottom:200px;display:none;padding:9px 14px;font-size:17px;border:2px solid #2f6b3a;background:linear-gradient(180deg,#7cc480,#4c9a57);color:#fff;box-shadow:0 3px 0 #2f6b3a}
#makeMode.soso-easy.soso-free #sosoFreeDone{display:block}
#sosoEasyRow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;padding:10px 12px;border-radius:16px;background:#fff;border:2px solid #ecdcbc;font-size:18px;text-align:left}
#sosoEasyRow small{display:block;font-size:13px;color:#8a6a48}
#sosoEasyRow .sw{all:unset;flex:0 0 auto;width:54px;height:30px;border-radius:16px;background:#d8cbb3;position:relative;cursor:pointer}
#sosoEasyRow .sw::after{content:'';position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:left .15s}
#sosoEasyRow .sw.on{background:#5fa86a}
#sosoEasyRow .sw.on::after{left:27px}
#sosoSettingsOverlay .speed-control{display:flex!important;margin:6px 0;padding:8px 10px;border-radius:16px;background:#fff;border:2px solid #ecdcbc}
#sosoPinchHint .stage{width:170px;height:84px}
#sosoPinchHint .hd{position:absolute;top:10px;left:58px;width:52px;height:auto}
#sosoPinchHint .hd.a{transform:scaleX(-1);animation:soso-ph-ha 1.3s ease-in-out infinite}
#sosoPinchHint .hd.b{animation:soso-ph-hb 1.3s ease-in-out infinite}
@keyframes soso-ph-ha{0%,15%{transform:translate(-4px,4px) scaleX(-1)}70%,100%{transform:translate(-48px,-6px) scaleX(-1)}}
@keyframes soso-ph-hb{0%,15%{transform:translate(4px,-4px)}70%,100%{transform:translate(48px,6px)}}
</style>
<script id="soso-v14">
(function(){
var HAND='__HAND__';window.__sosoHandSrc=HAND;
var KEY='soso-easy-v1',easy=true;try{easy=localStorage.getItem(KEY)!=='0';}catch(e){}
window.__sosoEasy=function(){return easy;};
function $(id){return document.getElementById(id);}
function trimOn(){return window.__sosoTrim&&__sosoTrim.active;}
var mode=null,hand=null,rip=null,prog=null,gauge=null,good=null,ask=null,done=null,help=null;
var stageKey='',stageAt=0,touched=false,lastUp=0,down=false,goodUntil=0,advancing=false,r0start=null,showReq=0;
function ensure(){mode=$('makeMode');if(!mode)return false;if(hand)return true;
  hand=document.createElement('img');hand.id='sosoHand';hand.src=HAND;hand.alt='';mode.appendChild(hand);
  rip=document.createElement('i');rip.id='sosoHandRip';mode.appendChild(rip);
  prog=document.createElement('div');prog.id='sosoProg';prog.innerHTML='<span class="d" data-k="1">1</span><span class="l" data-k="1"></span><span class="d" data-k="2">2</span><span class="l" data-k="2"></span><span class="d" data-k="3">3</span><span class="l" data-k="3"></span><span class="d" data-k="4">4</span>';mode.appendChild(prog);
  gauge=document.createElement('div');gauge.id='sosoGauge';gauge.innerHTML='<i></i>';var hint=$('makeHint');if(hint&&hint.parentElement)hint.parentElement.insertBefore(gauge,hint.nextSibling);
  good=document.createElement('div');good.id='sosoGood';good.textContent='잘했어요! 👍';mode.appendChild(good);
  help=document.createElement('button');help.type='button';help.id='sosoHelpHand';help.setAttribute('aria-label','동작 다시 보기');help.textContent='?';mode.appendChild(help);
  help.addEventListener('click',function(e){e.stopPropagation();touched=false;stageAt=performance.now();showReq=performance.now();});
  ask=document.createElement('div');ask.id='sosoFreeAsk';ask.innerHTML='<h3>모양 더 다듬어 볼래요?</h3><p>벽을 문질러 볼록하게, 오목하게 바꿀 수 있어요.</p><div class="row"><button type="button" class="a" data-free>✋ 다듬기</button><button type="button" class="b" data-cut>자르러 가기 →</button></div>';mode.appendChild(ask);
  ask.querySelector('[data-free]').addEventListener('click',function(e){e.stopPropagation();ask.classList.remove('show');try{if(!cs3.freeMode)craftToggleFree3();}catch(err){}});
  ask.querySelector('[data-cut]').addEventListener('click',function(e){e.stopPropagation();ask.classList.remove('show');goCut();});
  done=document.createElement('button');done.type='button';done.id='sosoFreeDone';done.textContent='다 됐어요 ✓';mode.appendChild(done);
  done.addEventListener('click',function(e){e.stopPropagation();goCut();});
  [help,ask,done].forEach(function(el){['pointerdown','touchstart','mousedown'].forEach(function(ev){el.addEventListener(ev,function(e){e.stopPropagation();},{passive:true});});});
  document.addEventListener('pointerdown',function(e){if(e.target&&e.target.closest&&e.target.closest('#sosoHelpHand,#sosoFreeAsk,#sosoFreeDone'))return;down=true;touched=true;},true);
  document.addEventListener('pointerup',function(){down=false;lastUp=performance.now();},true);
  document.addEventListener('pointercancel',function(){down=false;lastUp=performance.now();},true);
  return true;}
function goCut(){try{if(cs3.freeMode)craftToggleFree3();var sd=window.__sosoStageDone;if(sd){sd[1]=sd[2]=sd[3]=true;}craftSelect3(4);craftRefresh3();}catch(e){}}
function sel(n){try{var sd=window.__sosoStageDone;if(sd)sd[n-1]=true;if(n===2){cs3.heightMode=false;cs3.heightTouched=true;}craftRefresh3();craftSelect3(n);craftRefresh3();}catch(e){}}
function st(){return cs3.renderState||craftTargetState3();}
var tC={};function T(){var kk=vessel+(window.__sosoStyleKey||'');if(!tC[kk])tC[kk]=cSpecState(vessel);return tC[kk];}
function p2(){var s=st(),t=T();var dp=s.f>=s.H-.002?0:Math.max(0,Math.min(1,(s.H-s.f)/Math.max(.02,s.H-t.f*1.5)));if(r0start==null)r0start=s.r[0];var need=t.r[0]-r0start,wp=need<.03?1:Math.max(0,Math.min(1,(s.r[0]-r0start)/(need*.85)));return {dp:dp,wp:wp,v:dp*.55+wp*.45};}
function fitPct(){try{var s=st(),t=T(),N=18,sum=0;for(var k=0;k<N;k++){var tt=(k+.5)/N,y=t.H*tt,e;if(y>s.H+.004)e=.12;else{e=Math.abs(cInterp(s.r,y/Math.max(.01,s.H))-cInterp(t.r,tt));}sum+=Math.max(0,1-e/.12);}var hs=Math.max(0,1-Math.abs(s.H-t.H)/.35);return Math.round(100*(.75*sum/N+.25*hs));}catch(e){return 0;}}
function key(){if(!mode.classList.contains('show')||trimOn()||cs3.isTrim||cs3.finishReady)return '';if(cs3.freeMode)return 'free';if(cs3.cut)return '';if(cs3.step===1)return cs3.centered?'s1done':'s1';if(cs3.step===2)return 's2';if(cs3.step===3)return 's3';if(cs3.step===4)return 's4';return '';}
function scr(r,t){try{var c=renderer3.domElement.getBoundingClientRect(),m=mode.getBoundingClientRect(),P=potGroup3.position,k=potGroup3.scale.x,q=new THREE.Vector3(P.x+r*k,P.y+heightScale*k*t,P.z).project(camera3);return {x:c.left-m.left+(q.x+1)/2*c.width,y:c.top-m.top+(1-q.y)/2*c.height};}catch(e){return null;}}
function rAt(t){return cInterp(radiusProfile,t);}
function ease(x){return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;}
function place(x,y,press,alpha){hand.style.display='block';hand.style.left=(x-12)+'px';hand.style.top=(y-2)+'px';hand.style.opacity=alpha;hand.style.transform='scale('+(press?.92:1)+')';}
function ripple(x,y,ph){if(ph<0||ph>1){rip.style.display='none';return;}rip.style.display='block';rip.style.left=x+'px';rip.style.top=y+'px';var sc=1+ph*2.2;rip.style.transform='scale('+sc+')';rip.style.opacity=(1-ph)*.95;}
function hideHand(){if(hand){hand.style.display='none';rip.style.display='none';}}
function path(k,now){var per=1700,ph=((now-stageAt)%per)/per,a,b;
  if(k==='s1'){var el=$(window.__sosoCenterSide==='right'?'sosoTapRight':'sosoTapLeft');if(!el||!el.classList.contains('visible'))return null;var r=el.getBoundingClientRect(),m=mode.getBoundingClientRect(),x=r.left-m.left+r.width/2,y=r.top-m.top+r.height/2;var bp=((now-stageAt)%1300)/1300;if(bp<.15)return {x:x,y:y-14*(1-bp/.15),press:false,rip:-1,alpha:1};if(bp<.7)return {x:x,y:y,press:true,rip:(bp-.15)/.55,alpha:1};return {x:x,y:y-14*Math.min(1,(bp-.7)/.15),press:false,rip:-1,alpha:1};}
  if(k==='s2'){var pp=p2(),H=heightScale;if(pp.dp<1){a=scr(0,1.0);b=scr(0,Math.max(.15,1-.6));}else{var ri=Math.max(.02,rAt(.95)-.1);a=scr(ri*.3,1);b=scr(ri+.06,1);if(a&&b){a.y-=4;b.y-=4;}}}
  else if(k==='s3'){a=scr(rAt(.08)+.05,.08);b=scr(rAt(.95)+.05,.98);}
  else if(k==='free'){var p=ph<.5?ph*2:2-ph*2;a=scr(rAt(.3)+.04,.3);b=scr(rAt(.72)+.04,.72);if(!a||!b)return null;return {x:a.x+(b.x-a.x)*ease(p),y:a.y+(b.y-a.y)*ease(p),press:true,rip:-1,alpha:1};}
  else if(k==='s4'){var rb=rAt(0);a=scr(-rb-.25,.02);b=scr(rb+.25,.02);}
  else return null;
  if(!a||!b)return null;
  if(ph<.15)return {x:a.x,y:a.y,press:true,rip:ph/.15,alpha:Math.min(1,ph/.06)};
  if(ph<.72){var u=ease((ph-.15)/.57);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,press:true,rip:-1,alpha:1};}
  if(ph<.86)return {x:b.x,y:b.y,press:false,rip:-1,alpha:1};
  return {x:b.x,y:b.y,press:false,rip:-1,alpha:Math.max(0,1-(ph-.86)/.14)};}
var HINT={s1:'빛나는 원을 꾹 눌렀다 떼요',s2a:'가운데를 누른 채 아래로 쭉 내려요',s2b:'안쪽을 옆으로 밀어 넓혀요',s3:'바깥 벽을 아래에서 위로 쓸어 올려요',s4:'도자기 밑을 옆으로 쭉 그어 잘라요'};
function setHint(t){var h=$('makeHint');if(h&&t&&h.textContent!==t)h.textContent=t;}
function setProg(n){prog.querySelectorAll('.d').forEach(function(d){var k=+d.dataset.k;d.classList.toggle('done',k<n);d.classList.toggle('on',k===n);d.textContent=k<n?'✓':k;});prog.querySelectorAll('.l').forEach(function(l){l.classList.toggle('done',+l.dataset.k<n);});}
function gaugeSet(v){if(v==null){gauge.classList.remove('on');return;}gauge.classList.add('on');v=Math.max(0,Math.min(1,v));gauge.querySelector('i').style.width=(v*100).toFixed(1)+'%';gauge.classList.toggle('full',v>=1);}
function celebrate(next){if(advancing)return;advancing=true;good.classList.add('show');try{if(navigator.vibrate)navigator.vibrate([20,40,20]);}catch(e){}goodUntil=performance.now()+1100;
  var go=function(){if(down||(typeof dragging!=='undefined'&&dragging)){setTimeout(go,200);return;}good.classList.remove('show');advancing=false;next();};setTimeout(go,1100);}
function loop(){requestAnimationFrame(loop);try{if(!ensure()||!window.cs3)return;
  var open=mode.classList.contains('show');mode.classList.toggle('soso-easy',easy&&open);
  var k=open&&easy?key():'';var forming=!!k||(easy&&open&&!trimOn()&&!cs3.isTrim&&!cs3.finishReady&&!cs3.cut);mode.classList.toggle('soso-forming',forming);
  if(!easy||!open){hideHand();if(ask)ask.classList.remove('show');return;}
  var now=performance.now();
  if(k!==stageKey){stageKey=k;stageAt=now;touched=false;if(k==='s2')r0start=null;if(k!=='s3')ask.classList.remove('show');}
  try{var ub=document.querySelectorAll('#makeMode .soso-undo-btn'),vt=$('sosoViewToggle'),mr=mode.getBoundingClientRect(),L=ub.length?ub[ub.length-1].getBoundingClientRect().right:140,R=vt&&vt.offsetWidth?vt.getBoundingClientRect().left:mr.right-12,ty=ub.length?ub[0].getBoundingClientRect():null;var cx=((L+R)/2-mr.left)+'px';if(prog.style.left!==cx)prog.style.left=cx;if(ty){var tt=(ty.top+ty.height/2-mr.top-16)+'px';if(prog.style.top!==tt)prog.style.top=tt;}}catch(e){}
  var n=cs3.step===1?1:cs3.step===2?2:(cs3.step===3||cs3.freeMode)?3:4;setProg(n);
  /* progress, hints, completion */
  var g=null;
  if(k==='s1'){g=(window.__sosoCenterScore||0)/5;setHint(HINT.s1);}
  else if(k==='s1done'){g=1;if(!advancing)celebrate(function(){sel(2);});}
  else if(k==='s2'){var pp=p2();g=pp.v;setHint(pp.dp<1?HINT.s2a:HINT.s2b);if(pp.dp>=1&&pp.wp>=1&&!advancing&&!down)celebrate(function(){sel(3);});}
  else if(k==='s3'){var pct=fitPct();g=pct/76;setHint(HINT.s3);if(pct>=76&&!advancing&&!down&&!ask.classList.contains('show')){celebrate(function(){var sd=window.__sosoStageDone;if(sd)sd[3]=true;try{craftRefresh3();}catch(e){}ask.classList.add('show');});}}
  else if(k==='s4'){g=cs3.cutProg||0;setHint(HINT.s4);}
  gaugeSet(k==='free'?null:g);
  /* hand */
  var idle=!touched||(now-lastUp>4000&&!down);if(showReq&&now-showReq<6000)idle=true;
  var hk=k==='s1done'?'':k;
  if(!hk||down||advancing||ask.classList.contains('show')||!idle||(k==='s4'&&cs3.cutProg>0&&now-lastUp<4000)){hideHand();return;}
  var pt=path(hk,now);if(!pt){hideHand();return;}place(pt.x,pt.y,pt.press,pt.alpha);ripple(pt.x,pt.y,pt.rip);
}catch(e){}}
requestAnimationFrame(loop);
/* settings: easy mode switch + wheel speed */
var spHome=null;
setInterval(function(){try{var ov=$('sosoSettingsOverlay'),sp=document.querySelector('.speed-control');if(!sp)return;if(!spHome&&sp.parentElement&&sp.parentElement.id==='sosoBottomPanel')spHome=sp.parentElement;
  if(ov&&ov.classList.contains('show')){var card=ov.querySelector('.soso-popup-card');if(card&&!card.querySelector('#sosoEasyRow')){var row=document.createElement('div');row.id='sosoEasyRow';row.innerHTML='<div>쉬운 모드<small>손 안내 · 자동으로 다음 단계</small></div><button type="button" class="sw" aria-label="쉬운 모드"></button>';var h2=card.querySelector('h2');card.insertBefore(row,h2?h2.nextSibling:card.firstChild);var sw=row.querySelector('.sw');sw.classList.toggle('on',easy);sw.onclick=function(){easy=!easy;sw.classList.toggle('on',easy);try{localStorage.setItem(KEY,easy?'1':'0');}catch(e){}};}
    var sw2=card&&card.querySelector('#sosoEasyRow .sw');if(sw2&&/soso-candy/.test(sw2.className))sw2.className='sw'+(easy?' on':'');
    if(easy&&card&&sp.parentElement!==card){card.insertBefore(sp,card.querySelector('#sosoEasyRow').nextSibling);}}
  else if(spHome&&sp.parentElement!==spHome){spHome.appendChild(sp);}}catch(e){}},250);
/* trim pinch hint: two gloves */
setInterval(function(){var ph=$('sosoPinchHint');if(ph&&!ph.dataset.hands){var stg=ph.querySelector('.stage');if(stg){ph.dataset.hands='1';stg.innerHTML='<img class="hd a" src="'+HAND+'" alt=""><img class="hd b" src="'+HAND+'" alt="">';}}},300);
})();
</script>
'''.replace('__HAND__',HAND)
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
