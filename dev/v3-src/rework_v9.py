W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:60]
    s=s.replace(a,b)
# guide group must not spin with the wheel: keep it in the scene and follow the pot's position/scale only
rep("  potGroup3.add(fit);lastV=vessel;}","  scene3.add(fit);lastV=vessel;}")
rep("if(on&&(!fit||lastV!==vessel||fit.parent!==potGroup3))buildFit();","if(on&&(!fit||lastV!==vessel||fit.parent!==scene3))buildFit();if(fit){var P3=pg();fit.position.copy(P3.position);fit.scale.copy(P3.scale);fit.rotation.set(P3.rotation.x,0,P3.rotation.z);}")
rep("if(!pg())return;if(fit){potGroup3.remove(fit);fit=null;}","if(!pg())return;if(fit){if(fit.parent)fit.parent.remove(fit);fit=null;}")
# rings at a few heights (visible from above) + hide side lines in top view
rep("  var rim=new THREE.Mesh(","  fit.userData.rings=[];[.35,.7].forEach(function(tt){var rg=new THREE.Mesh(new THREE.TorusGeometry(cInterp(T.r,tt),.006,6,72),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthTest:false,depthWrite:false}));rg.rotation.x=Math.PI/2;rg.position.y=T.H*tt;rg.renderOrder=6;rg.userData.t=tt;fit.add(rg);fit.userData.rings.push(rg);});\n  var rim=new THREE.Mesh(")
rep("  fit.userData.rim.material.color.setHex(","  var top=cs3.view==='top';fit.userData.segs.forEach(function(me){me.visible=!top;});fit.userData.rings.forEach(function(rg){rg.visible=top;rg.material.color.setHex(col(sc.errs[Math.min(N-1,Math.floor(rg.userData.t*N))]));});\n  fit.userData.rim.material.color.setHex(")
extra=r'''<style id="soso-v9-style">#makeMode.soso-topview{background:radial-gradient(120% 70% at 50% 38%,#fbf1de 0%,#efdcbc 55%,#d3ad7f 100%)!important}#makeMode.soso-topview .focus-stage{visibility:hidden!important}#sosoFitPill,#sosoFitPill.show{display:none!important}</style>
<script id="soso-v9">
(function(){
function pg(){try{return potGroup3}catch(e){return null}}
function tool(){try{return currentTool}catch(e){return null}}
/* ---- 위쪽 시점: 살짝 기울여서 입체감 + 옆에서 비추는 빛 ---- */
var EL=THREE.MathUtils.degToRad(74);
function topCam(){if(!window.cs3||cs3.view!=='top'||(window.__sosoTrim&&__sosoTrim.active))return;try{potGroup3.updateMatrixWorld(true);var b=new THREE.Box3().setFromObject(potMesh3),c=b.getCenter(new THREE.Vector3()),R=Math.max(b.max.x-b.min.x,b.max.z-b.min.z)/2,h=b.max.y-b.min.y,el=renderer3.domElement,W=el.clientWidth||390,H=el.clientHeight||844,aspect=W/H,tanH=Math.tan(THREE.MathUtils.degToRad(camera3.fov/2));
  var D=(R*2*1.45)/(2*tanH*aspect),tgt=new THREE.Vector3(c.x,c.y,c.z);try{wheelGroup3.visible=true;}catch(e){}
  camera3.position.set(tgt.x,tgt.y+D*Math.sin(EL),tgt.z+D*Math.cos(EL));camera3.up.set(0,1,0);camera3.lookAt(tgt);camera3.zoom=1;camera3.setViewOffset(W,H,0,Math.round(H*.09),W,H);camera3.updateProjectionMatrix();camera3.updateMatrixWorld(true);}catch(e){}}
function clearOffset(){try{if(camera3.view&&camera3.view.enabled&&!(window.__sosoTrim&&__sosoTrim.active)){camera3.clearViewOffset();camera3.updateProjectionMatrix();}}catch(e){}}
var _ang=angle;angle=function(){var r=_ang.apply(this,arguments);if(cs3.view==='top')topCam();else clearOffset();return r;};
var _rig=craftApplyRig3;craftApplyRig3=function(){var r=_rig.apply(this,arguments);if(window.cs3&&cs3.view==='top')topCam();else clearOffset();return r;};
var L0=null,lightMode='';
function lights(top){try{if(!L0){L0=[];scene3.children.forEach(function(o){if(o.isLight)L0.push({o:o,i:o.intensity,p:o.position.clone()});});}var want=top?'top':'base';if(!top&&lightMode===want)return;lightMode=want;
  L0.forEach(function(l){l.o.intensity=l.i;l.o.position.copy(l.p);if(!top)return;if(l.o.isHemisphereLight)l.o.intensity=.34;else if(l.i>.8){l.o.intensity=1.75;l.o.position.set(-5,1.7,2.4);}else{l.o.intensity=.3;l.o.position.set(4,2.5,-2);}});
  try{var m=potMesh3.material;if(top){if(m.userData.c0==null||m.color.getHex()!==m.userData.cset)m.userData.c0=m.color.getHex();m.color.setHex(m.userData.c0).multiplyScalar(.84);m.userData.cset=m.color.getHex();}else if(m.userData.c0!=null){m.color.setHex(m.userData.c0);delete m.userData.c0;delete m.userData.cset;}}catch(e){}}catch(e){}}
/* ---- 위쪽 시점에서 다듬기: 손가락 반지름 = 벽 반지름 ---- */
var _mv=craftMoveSub3;
craftMoveSub3=function(dx,dy,e){var t=tool();
  if(cs3.view==='top'&&(t==='free'||t==='pull')){var st=craftTargetState3(),bt=cClamp(cs3.band/CN,0,1),ly=st.H*bt,a=craftPlanePoint3(lastPX,lastPY,ly),b=craftPlanePoint3(lastPX+dx,lastPY+dy,ly);if(!a||!b)return;var d=(b.radius-a.radius)*.9;if(t==='pull'){if(cs3.__lockPid!==cs3.activePointer){cs3.__lockPid=cs3.activePointer;cs3.__lockBand=cs3.band;}}
    var was=currentTool;try{currentTool='free';}catch(err){}var save=cs3.side;cs3.side=1;var px=d/.0013;var r=_mv.call(this,px,0,e);cs3.side=save;try{currentTool=was;}catch(err){}
    try{if(guideVisible&&CSPECS[vessel]){var T=cSpecState(vessel),s3=craftTargetState3();if(s3.H>T.H+.004){var nH=s3.H-(s3.H-T.H)*Math.min(.3,Math.abs(d)*5),sol=cSolveW(s3.r,nH,s3.f);if(sol&&sol.ok&&!sol.deficit&&sol.w>=CCFG.wmin&&sol.w<=.32)craftSet3({r:s3.r,H:nH,f:s3.f,w:sol.w});}}}catch(err){}
    return r;}
  return _mv.apply(this,arguments);};
/* ---- 접시: 다듬기 단계에서 자동으로 위쪽 시점 ---- */
var autoKey='';
function loop(){requestAnimationFrame(loop);try{var mode=document.getElementById('makeMode');if(!mode||!mode.classList.contains('show')||!window.cs3)return;var trim=window.__sosoTrim&&__sosoTrim.active;
  if(!window.__sosoV9R&&window.renderer3!==undefined||(function(){try{return renderer3&&!renderer3.__v9}catch(e){return false}})()){try{if(!renderer3.__v9){var R0=renderer3.render.bind(renderer3);renderer3.render=function(a,b){try{var on=document.getElementById('makeMode').classList.contains('soso-topview');lights(on);}catch(e){}return R0(a,b);};renderer3.__v9=true;}}catch(e){}}
  mode.classList.toggle('soso-topview',cs3.view==='top'&&!trim);if(cs3.view==='top'&&!trim)topCam();
  if(cs3.view==='top'&&!trim&&!cs3.isTrim&&(dragging||cs3.activePointer!=null)){/* camera stays fixed while touching */}
  var k=vessel+':'+(cs3.freeMode?'f':cs3.step);
  if(vessel==='plate'&&cs3.centered&&!cs3.cut&&!trim&&(cs3.step===3||cs3.freeMode)&&cs3.view!=='top'&&!autoKey&&!dragging){autoKey=k;angle('위쪽');}
  if(!(vessel==='plate'))autoKey='';
}catch(e){}}
requestAnimationFrame(loop);
var _sm=window.startMake;if(_sm){window.startMake=function(){autoKey='';return _sm.apply(this,arguments);};try{startMake=window.startMake;}catch(e){}}
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
