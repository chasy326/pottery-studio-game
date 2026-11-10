W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:60]
    s=s.replace(a,b)
# 가운데 열기: 옆으로 넓힐 때만 높이가 낮아짐 (흙 부피 유지)
rep("function spread(q){var a=cCopy(base);for(var i=0;i<=CN;i++){var t=i/CN;a.r[i]+=desired*q*(.2+.8*Math.pow(t,.9));}return cFitWallState(a,wall);}",
    "function spread(q){var a=cCopy(base);for(var i=0;i<=CN;i++){var t=i/CN;a.r[i]+=desired*q*(.55+.45*Math.pow(t,.9));}a.w=wall;if(cMaxR(a.r)>CCFG.capR)return null;if(cVol(a.r,a.H,a.f,wall)<=clayV0)return cFitWallState(a,wall);var lo=Math.max(CCFG.Hmin,a.f+.06),hi=a.H;if(cVol(a.r,lo,a.f,wall)>clayV0)return null;for(var k=0;k<30;k++){var m=(lo+hi)/2;if(cVol(a.r,m,a.f,wall)>clayV0)hi=m;else lo=m;}a.H=(lo+hi)/2;return a;}")
rep("cs3.freeMode=true;currentTool='free';guideVisible=false;if(guideMesh3)guideMesh3.visible=false;}else","cs3.freeMode=true;currentTool='free';if(vessel==='free'||!CSPECS[vessel]){guideVisible=false;if(guideMesh3)guideMesh3.visible=false;}}else")
rep("cs3.pickedT=.55;cs3.band=.55*CN;","cs3.pickedT=window.__sosoTFromY?__sosoTFromY(e.clientY):.55;cs3.band=cs3.pickedT*CN;")
extra=r'''<style id="soso-v8-style">
#sosoFitPill{position:absolute;z-index:30;left:50%;top:146px;transform:translateX(-50%);display:none;align-items:center;gap:6px;padding:4px 10px 4px 8px;border-radius:16px;background:#fffaf0ee;border:2px solid #e2c99a;color:#5b3a1f;font-size:17px;white-space:nowrap;box-shadow:0 3px 0 rgba(91,58,31,.16);pointer-events:none}
#sosoFitPill.show{display:flex}
#sosoFitPill .bar{width:64px;height:9px;border-radius:5px;background:#eadbc0;overflow:hidden}
#sosoFitPill .bar i{display:block;height:100%;width:0;border-radius:5px;background:#e98a3a;transition:width .25s,background .25s}
#sosoFitPill.good .bar i{background:#4cb86a}
#sosoFitPill.mid .bar i{background:#e8b93a}
#sosoFitPill b{font-weight:400;min-width:2.6em;text-align:right}
</style>
<script id="soso-v8">
(function(){
function tool(){try{return currentTool}catch(e){return null}}
function pg(){try{return potGroup3}catch(e){return null}}function gm(){try{return guideMesh3}catch(e){return null}}
function gOn(){try{return !!guideVisible&&!!CSPECS[vessel];}catch(e){return false}}
var tCache={};function tgt(){var k=vessel;if(!tCache[k])tCache[k]=cSpecState(k);return tCache[k];}
/* --- 조작감: 벽 올리기 / 자유 성형 / 가운데 열기 --- */
function assist(k){var st=craftTargetState3(),T=tgt();if(!cHollow(st.H,st.f))return;var r2=st.r.map(function(x,i){var t=i/CN;return x+(cInterp(T.r,t)-x)*k*(.35+.65*t);});var sol=cSolveW(r2,st.H,st.f);if(sol&&sol.ok&&!sol.deficit&&sol.w>=CCFG.wmin&&sol.w<.3)craftSet3({r:r2,H:st.H,f:st.f,w:sol.w});}
window.__sosoTFromY=function(y){try{var c=renderer3.domElement.getBoundingClientRect(),P=potGroup3.position,k=potGroup3.scale.x,pr=function(v){var q=v.project(camera3);return c.top+(1-q.y)/2*c.height;};var b=pr(new THREE.Vector3(P.x,P.y,P.z)),t=pr(new THREE.Vector3(P.x,P.y+heightScale*k,P.z));return cClamp((b-y)/Math.max(1,b-t),0,1);}catch(e){return .55;}};
var _cFree=cFree;
cFree=function(st0,index,delta){if(!cHollow(st0.H,st0.f))return _cFree.apply(this,arguments);var idx=cClamp(index,0,CN),sig=4.2,r=st0.r.slice();
  for(var i=0;i<=CN;i++)r[i]=cClamp(r[i]+delta*Math.exp(-Math.pow((i-idx)/sig,2)),.03,CCFG.capR);
  var sol=cSolveW(r,st0.H,st0.f);if(sol&&sol.ok&&!sol.deficit&&sol.w>=CCFG.wmin&&sol.w<=.3)return{ok:true,st:{r:r,H:st0.H,f:st0.f,w:sol.w},applied:1};
  var w=cClamp(st0.w,CCFG.wmin+.004,.3),lo=Math.max(CCFG.Hmin,st0.f+.03),hi=CCFG.Hmax;if((cVol(r,lo,st0.f,w)-clayV0)*(cVol(r,hi,st0.f,w)-clayV0)>0)return _cFree.apply(this,arguments);
  for(var k=0;k<32;k++){var m=(lo+hi)/2;if(cVol(r,m,st0.f,w)>clayV0)hi=m;else lo=m;}return{ok:true,st:{r:r,H:(lo+hi)/2,f:st0.f,w:w},applied:1};};
var _mv=craftMoveSub3;
var mvDist=0,mvPid=null;
document.addEventListener('pointerdown',function(){try{mvPid='__new';mvDist=0;if(window.cs3){cs3.__lockPid='__new';cs3.__lockBand=null;}}catch(e){}},true);
function markStage(dx,dy){try{if(cs3.activePointer!==mvPid){mvPid=cs3.activePointer;mvDist=0;}mvDist+=Math.abs(dx)+Math.abs(dy);if(mvDist<18)return;var sd=window.__sosoStageDone;if(!sd)return;var n=cs3.freeMode?3:cs3.step;if((n===2||n===3)&&!sd[n]){sd[n]=true;setTimeout(function(){try{craftRefresh3();}catch(e){}},0);}}catch(e){}}
craftMoveSub3=function(dx,dy,e){var t=tool();if(t==='open'||t==='pull'||t==='free')markStage(dx,dy);
  if(t==='open'&&cs3.view!=='top'){if(Math.abs(dx)>Math.abs(dy)*1.3)return _mv.call(this,dx*.6,0,e);return _mv.call(this,0,dy,e);}
  if(t==='pull'){var st=craftTargetState3(),T=tgt(),dH=-dy*.0019;
    if(gOn()&&dH>0&&st.H>T.H-.005)dH*=Math.max(.06,.3*(1-(st.H-T.H)/.2));
    var lean=dx*cs3.side*.0022;
    if(gOn()){var rimGap=cInterp(T.r,1)-st.r[CN];if(lean*rimGap<0)lean*=.05;else if(Math.abs(lean)>Math.abs(rimGap))lean=rimGap;
      if(dH>0&&st.H>T.H+.01)dH=0;if(Math.abs(dx)>Math.abs(dy)*.8&&st.H>T.H+.008)dH=Math.min(dH,-Math.min(st.H-T.H,Math.abs(dx)*.0035));}
    var ok=craftCommit3(cPull(st,dH,lean));if(ok&&gOn())assist(Math.min(.3,Math.abs(dH)*3.4+Math.abs(lean)*1.5));return;}
  if(t==='free'){if(cs3.__lockPid!==cs3.activePointer||cs3.__lockPid==null){cs3.__lockPid=cs3.activePointer;cs3.__lockBand=cs3.band;}if(cs3.__lockBand!=null)cs3.band=cs3.__lockBand;var s2=craftTargetState3(),delta=dx*cs3.side*.0013;if(gOn()){var T2=tgt(),bt=cs3.band/CN,yAbs=bt*s2.H,tr=yAbs<=T2.H?cInterp(T2.r,yAbs/T2.H):null,cr=cInterp(s2.r,bt);if(tr!=null){var gap=tr-cr;if(gap*delta<0)delta*=.4;else if(Math.abs(delta)>Math.abs(gap))delta=gap+(delta-gap)*.35;}}if(craftCommit3(cFree(s2,cs3.band,delta))&&gOn())assist(Math.min(.12,Math.abs(delta)*5));return;}
  return _mv.apply(this,arguments);};
/* --- 가이드: 맞는 곳은 초록, 다른 곳은 주황 + 일치율 --- */
var N=18,fit=null,lastV=null,lastUp=0,pill=null;
function buildFit(){if(!pg())return;if(fit){potGroup3.remove(fit);fit=null;}var T=tgt();fit=new THREE.Group();fit.name='soso_fit';fit.userData.segs=[];
  for(var sd=-1;sd<=1;sd+=2){for(var k=0;k<N;k++){var t0=k/N,t1=(k+1)/N,a=new THREE.Vector3(sd*cInterp(T.r,t0),T.H*t0,0),b=new THREE.Vector3(sd*cInterp(T.r,t1),T.H*t1,0);var m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthTest:false,depthWrite:false});var g=new THREE.TubeGeometry(new THREE.LineCurve3(a,b),1,.011,6,false);var me=new THREE.Mesh(g,m);me.renderOrder=6;me.userData.t=(t0+t1)/2;fit.add(me);fit.userData.segs.push(me);}}
  var rim=new THREE.Mesh(new THREE.TorusGeometry(cInterp(T.r,1),.009,6,64),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,depthTest:false,depthWrite:false}));rim.rotation.x=Math.PI/2;rim.position.y=T.H;rim.renderOrder=6;fit.add(rim);fit.userData.rim=rim;
  potGroup3.add(fit);lastV=vessel;}
function score(){var st=cs3.renderState||craftTargetState3(),T=tgt(),sum=0,errs=[];for(var k=0;k<N;k++){var tt=(k+.5)/N,y=T.H*tt,e;if(y>st.H+.004)e=.12;else{var cr=cInterp(st.r,y/Math.max(.01,st.H));e=Math.abs(cr-cInterp(T.r,tt));}errs.push(e);sum+=Math.max(0,1-e/.09);}var he=Math.abs(st.H-T.H),hs=Math.max(0,1-he/.3);return {pct:Math.round(100*(.75*sum/N+.25*hs)),errs:errs,he:he};}
function ensurePill(){if(pill)return pill;var m=document.getElementById('makeMode');if(!m)return null;pill=document.createElement('div');pill.id='sosoFitPill';pill.innerHTML='<span>모양 일치</span><span class="bar"><i></i></span><b>0%</b>';m.appendChild(pill);return pill;}
function col(e){return e<.025?0x5fd47e:e<.055?0xf2c94c:0xf08a3c;}
function loop(t){requestAnimationFrame(loop);try{
  var mode=document.getElementById('makeMode'),open=mode&&mode.classList.contains('show')&&window.cs3&&pg(),trim=window.__sosoTrim&&__sosoTrim.active;
  var on=open&&!trim&&gOn()&&!cs3.isTrim&&!cs3.cut&&!cs3.finishReady&&cs3.centered;
  if(on&&(!fit||lastV!==vessel||fit.parent!==potGroup3))buildFit();
  if(fit)fit.visible=!!on;
  if(gm())gm().children.forEach(function(c){if(c.isLine||c.isLineLoop)c.visible=false;});
  var p=ensurePill();if(p)p.classList.toggle('show',!!on&&cs3.step>=3);
  if(!on||t-lastUp<120)return;lastUp=t;var sc=score();
  fit.userData.segs.forEach(function(me,i){me.material.color.setHex(col(sc.errs[i%N]));});
  fit.userData.rim.material.color.setHex(sc.he<.03?0x5fd47e:sc.he<.08?0xf2c94c:0xf08a3c);
  if(p){p.querySelector('i').style.width=sc.pct+'%';p.querySelector('b').textContent=sc.pct+'%';p.classList.toggle('good',sc.pct>=85);p.classList.toggle('mid',sc.pct>=65&&sc.pct<85);}
  window.__sosoFit=sc;
}catch(e){}}
requestAnimationFrame(loop);
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
