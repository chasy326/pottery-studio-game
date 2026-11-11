import base64
W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
HAND='data:image/png;base64,'+base64.b64encode(open(W+'../hand/hand.png','rb').read()).decode()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a))
    s=s.replace(a,b)
# guide caches follow the chosen shape; looser "range" scoring
rep("function tgt(){var k=vessel;if(!tCache[k])tCache[k]=cSpecState(k);return tCache[k];}","function tgt(){var k=vessel+(window.__sosoStyleKey||'');if(!tCache[k])tCache[k]=cSpecState(vessel);return tCache[k];}")
rep("lastV=vessel;","lastV=vessel+(window.__sosoStyleKey||'');")
rep("if(on&&(!fit||lastV!==vessel||fit.parent!==scene3))buildFit();","if(on&&(!fit||lastV!==vessel+(window.__sosoStyleKey||'')||fit.parent!==scene3))buildFit();")
rep("errs.push(e);sum+=Math.max(0,1-e/.09);}var he=Math.abs(st.H-T.H),hs=Math.max(0,1-he/.3);","errs.push(e);sum+=Math.max(0,1-e/.12);}var he=Math.abs(st.H-T.H),hs=Math.max(0,1-he/.35);")
rep("function col(e){return e<.025?0x5fd47e:e<.055?0xf2c94c:0xf08a3c;}","function col(e){return e<.035?0x5fd47e:e<.07?0xf2c94c:0xf08a3c;}")
extra=r'''<style id="soso-v16-style">
#sosoStyle{margin:12px 0 2px;text-align:left}
#sosoStyle[hidden]{display:none!important}
#sosoStyle h4{margin:0 0 6px;font-size:15px;font-weight:800;color:#6b5a48}
#sosoStyle .row{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
#sosoStyle .row::-webkit-scrollbar{display:none}
#sosoStyle .st{all:unset;box-sizing:border-box;flex:0 0 auto;width:78px;padding:6px 4px 5px;border-radius:14px;border:2px solid #e8ddc6;background:#fffef8;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
#sosoStyle .st svg{display:block;width:60px;height:40px;margin:0 auto 2px}
#sosoStyle .st span{display:block;font-size:12px;font-weight:800;color:#51483d;line-height:1.2;word-break:keep-all}
#sosoStyle .st.on{border-color:#e97c31;background:#fff2e2;box-shadow:0 0 0 2px #ffd7a8}
#sosoFreeHand{position:absolute;z-index:47;left:0;top:0;width:60px;height:auto;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px rgba(60,30,60,.3));transform-origin:9px 1px}
</style>
<script id="soso-v16">
(function(){
var HAND='__HAND__';
function $(id){return document.getElementById(id);}
/* ---------- shape styles per vessel ---------- */
var STY={
 cup:[{k:'straight',n:'곧은 컵',H:.80,pts:[[0,.29],[.06,.325],[.18,.34],[.5,.345],[.85,.355],[1,.36]]},
      {k:'belly',n:'배 불룩한 컵',H:.78,pts:[[0,.27],[.12,.34],[.35,.41],[.6,.415],[.85,.37],[1,.345]]},
      {k:'flare',n:'입구 벌어진 컵',H:.76,pts:[[0,.26],[.2,.29],[.5,.32],[.8,.38],[1,.44]]}],
 bowl:[{k:'round',n:'둥근 밥그릇',H:.50,pts:[[0,.25],[.08,.33],[.22,.42],[.42,.5],[.65,.55],[.85,.575],[1,.585]]},
       {k:'tall',n:'굽 높은 공기',H:.56,pts:[[0,.2],[.12,.25],[.3,.36],[.55,.46],[.8,.52],[1,.55]]},
       {k:'wide',n:'넓은 사발',H:.40,pts:[[0,.26],[.15,.38],[.4,.52],[.7,.62],[1,.68]]},
       {k:'closed',n:'입구 오므린 그릇',H:.50,pts:[[0,.25],[.15,.38],[.4,.5],[.65,.545],[.85,.53],[1,.49]]}],
 plate:[{k:'flat',n:'평접시',H:.14,pts:[[0,.44],[.2,.56],[.45,.67],[.7,.75],[1,.81]]},
        {k:'deep',n:'오목 접시',H:.20,pts:[[0,.36],[.25,.5],[.5,.6],[.75,.67],[1,.72]]},
        {k:'rim',n:'넓은 테 접시',H:.12,pts:[[0,.4],[.4,.5],[.6,.56],[.75,.72],[1,.88]]}]};
var DEF={};
var pick={};try{pick=JSON.parse(localStorage.getItem('soso-style-v1')||'{}')||{};}catch(e){}
function cur(v){var L=STY[v];if(!L)return null;var k=pick[v];for(var i=0;i<L.length;i++)if(L[i].k===k)return L[i];return L[0];}
function svgOf(st){var H=st.H,sc=24/.9,pts=st.pts,top=36-H*sc*1.0;var path='M'+(30-pts[0][1]*sc).toFixed(1)+' 36';
  pts.forEach(function(p){path+=' L'+(30-p[1]*sc).toFixed(1)+' '+(36-p[0]*H*sc*1.6).toFixed(1);});
  for(var i=pts.length-1;i>=0;i--){var p=pts[i];path+=' L'+(30+p[1]*sc).toFixed(1)+' '+(36-p[0]*H*sc*1.6).toFixed(1);}path+=' Z';
  return '<svg viewBox="0 0 60 40" aria-hidden="true"><path d="'+path+'" fill="#d9b38c" stroke="#7a5434" stroke-width="1.5" stroke-linejoin="round"/></svg>';}
function render(){var box=$('sosoStyle');if(!box){var grid=document.querySelector('#vesselModal .vessel-grid');if(!grid)return;box=document.createElement('div');box.id='sosoStyle';grid.parentElement.insertBefore(box,grid.nextSibling);}
  var L=STY[vessel];if(!L){box.hidden=true;return;}box.hidden=false;var c=cur(vessel);
  box.innerHTML='<h4>모양 고르기</h4><div class="row">'+L.map(function(st){return '<button type="button" class="st'+(st===c?' on':'')+'" data-k="'+st.k+'">'+svgOf(st)+'<span>'+st.n+'</span></button>';}).join('')+'</div>';
  box.querySelectorAll('.st').forEach(function(b){b.addEventListener('click',function(){pick[vessel]=b.dataset.k;try{localStorage.setItem('soso-style-v1',JSON.stringify(pick));}catch(e){}render();});});}
function apply(){var s=CSPECS[vessel];if(!s)return;if(!DEF[vessel])DEF[vessel]={H:s.H,pts:s.pts,r:s.r};var c=cur(vessel);
  if(c){s.H=c.H;s.pts=c.pts.map(function(p){return p.slice();});delete s.r;window.__sosoStyleKey=c.k;window.__sosoStyleName=c.n;}else{window.__sosoStyleKey='';window.__sosoStyleName='';}}
var _cv=chooseVessel;chooseVessel=function(){var r=_cv.apply(this,arguments);try{render();}catch(e){}return r;};
var _ovc=window.openVesselChoice;if(_ovc){openVesselChoice=function(){var r=_ovc.apply(this,arguments);try{render();}catch(e){}return r;};}
var _sm=startMake;startMake=function(){try{apply();}catch(e){}return _sm.apply(this,arguments);};
setTimeout(function(){try{render();}catch(e){}},300);
/* ---------- free shaping: dashed target outline + tolerance band, facing the camera ---------- */
var fg=null,fgKey='';
function buildFG(){if(fg){scene3.remove(fg);}fg=new THREE.Group();fg.name='soso_freeguide';var T=cSpecState(vessel),N=30,BW=.035;
  var dm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthTest:false,depthWrite:false});
  var bm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.1,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
  for(var sd=-1;sd<=1;sd+=2){
    for(var k=0;k<N;k+=2){var t0=k/N,t1=(k+1)/N,a=new THREE.Vector3(sd*cInterp(T.r,t0),T.H*t0,0),b=new THREE.Vector3(sd*cInterp(T.r,t1),T.H*t1,0),len=a.distanceTo(b);
      var m=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,len,6),dm);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());m.renderOrder=8;fg.add(m);}
    var pos=[],idx=[];for(var j=0;j<=N;j++){var t=j/N,r=cInterp(T.r,t),y=T.H*t;pos.push(sd*(r-BW),y,0,sd*(r+BW),y,0);if(j<N){var q=j*2;idx.push(q,q+1,q+2,q+1,q+3,q+2);}}
    var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);var band=new THREE.Mesh(g,bm);band.renderOrder=7;fg.add(band);}
  scene3.add(fg);fgKey=vessel+(window.__sosoStyleKey||'');}
/* ---------- glove that follows the finger while shaping ---------- */
var fh=null,hidG=false;
function loop(){requestAnimationFrame(loop);try{var m=$('makeMode');if(!m||!window.cs3||typeof scene3==='undefined'||!scene3)return;
  var open=m.classList.contains('show'),trim=window.__sosoTrim&&__sosoTrim.active,free=open&&!trim&&!cs3.isTrim&&cs3.freeMode&&!cs3.cut&&cs3.centered;
  var gOn=true;try{gOn=!!guideVisible;}catch(e){}
  if(free&&gOn&&CSPECS[vessel]){if(!fg||fgKey!==vessel+(window.__sosoStyleKey||''))buildFG();fg.visible=true;fg.position.copy(potGroup3.position);fg.scale.setScalar(potGroup3.scale.x);
    var cp=camera3.position,pp=potGroup3.position;fg.rotation.set(0,Math.atan2(cp.x-pp.x,cp.z-pp.z),0);
    var fit=scene3.getObjectByName('soso_fit');if(fit)fit.visible=false;}
  else if(fg)fg.visible=false;
  try{if(typeof guideMesh3!=='undefined'&&guideMesh3){if(free){guideMesh3.visible=false;hidG=true;}else if(hidG){hidG=false;guideMesh3.visible=true;}}}catch(e){}
  if(!fh){fh=document.createElement('img');fh.id='sosoFreeHand';fh.src=HAND;fh.alt='';m.appendChild(fh);}
  var age=performance.now()-(window.__sosoFreeAt||0);
  if(!free||age>450){fh.style.display='none';return;}
  var t=window.__sosoFreeT||.5,st=cs3.renderState||craftTargetState3(),r=cInterp(st.r,t),w=st.w||.07,grow=window.__sosoFreeDir!==-1;
  var c=renderer3.domElement.getBoundingClientRect(),mr=m.getBoundingClientRect(),P=potGroup3.position,k=potGroup3.scale.x;
  var cp2=camera3.position,az=Math.atan2(cp2.x-P.x,cp2.z-P.z),rx=Math.cos(az),rz=-Math.sin(az);
  var rr=grow?Math.max(.03,r-w-.01):r+.012,q=new THREE.Vector3(P.x+rx*rr*k,P.y+st.H*t*k,P.z+rz*rr*k).project(camera3),x=c.left-mr.left+(q.x+1)/2*c.width,y=c.top-mr.top+(1-q.y)/2*c.height;
  var wob=Math.sin(performance.now()/90)*3;
  fh.style.display='block';fh.style.left=(x-9+(grow?wob:-wob))+'px';fh.style.top=(y-1)+'px';
  fh.style.transform=grow?'scaleX(-1) rotate(-61deg)':'rotate(-61deg)';
}catch(e){}}
requestAnimationFrame(loop);
})();
</script>
'''.replace('__HAND__',HAND)
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
