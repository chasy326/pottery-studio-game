(function(){
'use strict';
/* ===== 소소도예 굽 깎기 (trimming) ===== */
var ICONS=__ICONS__;
var TOOLS={
  gupkal:{name:'굽칼',w:.05,rate:.0036,shape:'flat',ico:ICONS.gupkal},
  loop:{name:'고리칼',w:.045,rate:.0047,shape:'round',ico:ICONS.loop},
  tri:{name:'삼각칼',w:.016,rate:.006,shape:'v',ico:ICONS.tri}
};
var FOOTS={
  flat:{name:'평굽',desc:'바닥은 평평하게, 모서리만 둥글게 다듬어요'},
  inner:{name:'안굽',desc:'바닥 안쪽을 오목하게 파서 굽 링을 남겨요'},
  outer:{name:'바깥굽',desc:'가장자리에 높은 굽을 세우고 아래를 파요'}
};
var WHEEL_TOP=-.71, LIMIT_SEC=180, TMIN=.02, DS=.0045;
var TR={active:false,phase:'',t0:0,tool:'gupkal',foot:'flat',spin:0,carveSec:0,locked:false,guideOn:true};
window.__sosoTrim=TR;

function $(id){return document.getElementById(id);}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function ease(q){return q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;}
function now(){return performance.now();}
function soundOn(){try{return sosoPrefsFinal.sound!==false;}catch(e){return true;}}
function speedVal(){var s=$('wheelSpeed');return s?(+s.value||3):3;}

/* ---------- audio ---------- */
var AC=null,scrape=null;
function ac(){if(!soundOn())return null;try{if(!AC){var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;AC=new A();}if(AC.state==='suspended')AC.resume();return AC;}catch(e){return null;}}
function noiseBuf(c,sec){var b=c.createBuffer(1,Math.floor(c.sampleRate*sec),c.sampleRate),d=b.getChannelData(0),last=0;for(var i=0;i<d.length;i++){var w=Math.random()*2-1;last=last*.6+w*.4;d[i]=last;}return b;}
function scrapeStart(){var c=ac();if(!c||scrape)return;try{var s=c.createBufferSource();s.buffer=noiseBuf(c,1.2);s.loop=true;var f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1500;f.Q.value=.9;var g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(c.destination);s.start();scrape={s:s,f:f,g:g};}catch(e){}}
function scrapeSet(level){if(!scrape||!AC)return;var t=AC.currentTime;scrape.g.gain.setTargetAtTime(clamp(level,0,1)*.16,t,.04);scrape.f.frequency.setTargetAtTime(1100+speedVal()*220+level*500,t,.08);}
function scrapeStop(){if(!scrape||!AC)return;var sc=scrape;scrape=null;try{sc.g.gain.setTargetAtTime(0,AC.currentTime,.05);setTimeout(function(){try{sc.s.stop();}catch(e){}},300);}catch(e){}}
function blip(freq,dur,vol,type,delay){var c=ac();if(!c)return;try{var t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.7,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.02);}catch(e){}}
function sndTok(){blip(180,.16,.4,'sine',0);blip(150,.18,.36,'sine',.17);}
function sndSnap(){var c=ac();if(!c)return;try{var s=c.createBufferSource();s.buffer=noiseBuf(c,.05);var f=c.createBiquadFilter();f.type='highpass';f.frequency.value=2200;var g=c.createGain();g.gain.value=.35;s.connect(f);f.connect(g);g.connect(c.destination);s.start();}catch(e){}blip(950,.09,.25,'triangle',0);}
function sndChime(){blip(880,.35,.12,'sine',0);blip(1320,.45,.12,'sine',.12);}

/* ---------- profile model ---------- */
var M=null; // {pts:[{r,y,nx,ny,lim,d,dT}], inner:[[r,y]], H, r0}
function interpR(r,t){try{return cInterp(r,t);}catch(e){var x=clamp(t,0,1)*(r.length-1),i=Math.floor(x),k=x-i;return r[i]+(r[Math.min(r.length-1,i+1)]-r[i])*k;}}
function hollow(H,f){try{return cHollow(H,f);}catch(e){return f<H-.02;}}
function buildModel(){
  var v=cs3.renderState||craftTargetState3(),r=v.r.slice(),H=v.H,f=v.f,w=v.w,CNn=r.length-1;
  var raw=[[0,0],[Math.max(.01,r[0]),0]];
  for(var i=1;i<=CNn;i++)raw.push([Math.max(.012,r[i]),H*i/CNn]);
  // resample to uniform arc length
  var pts=[],acc=0,seg=0,cur=raw[0].slice(),sTot=0;
  for(i=1;i<raw.length;i++)sTot+=Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]);
  var n=Math.max(60,Math.round(sTot/DS));
  var cum=[0];for(i=1;i<raw.length;i++)cum.push(cum[i-1]+Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]));
  for(var j=0;j<=n;j++){var s=sTot*j/n;while(seg<raw.length-2&&cum[seg+1]<s)seg++;var L=cum[seg+1]-cum[seg]||1,k=clamp((s-cum[seg])/L,0,1);pts.push({r:raw[seg][0]+(raw[seg+1][0]-raw[seg][0])*k,y:raw[seg][1]+(raw[seg+1][1]-raw[seg][1])*k,s:s,d:0});}
  // normals (into the clay)
  for(j=0;j<pts.length;j++){var a=pts[Math.max(0,j-2)],b=pts[Math.min(pts.length-1,j+2)],tx=b.r-a.r,ty=b.y-a.y,l=Math.hypot(tx,ty)||1;pts[j].nx=-ty/l;pts[j].ny=tx/l;}
  pts[0].nx=0;pts[0].ny=1;
  var inner=[];
  var isH=hollow(H,f);if(isH){var FT=clamp(H*.3,.08,.15);f=Math.max(f,Math.min(FT,H-.06));}
  if(isH){inner.push([Math.max(.02,r[CNn]-w),H]);for(i=1;i<=36;i++){var y=H-(H-f)*i/36;inner.push([Math.max(.02,interpR(r,y/H)-w),y]);}inner.push([0,f]);}
  function segDist(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1e-9,t=clamp(((px-ax)*dx+(py-ay)*dy)/L2,0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t);}
  pts.forEach(function(p){var m=1e9;if(isH){for(var q=1;q<inner.length;q++)m=Math.min(m,segDist(p.r,p.y,inner[q-1][0],inner[q-1][1],inner[q][0],inner[q][1]));}else m=Math.min(H,p.r+.2)*.5+TMIN;
    var lim=Math.max(0,m-TMIN);
    if(p.nx<-.2)lim=Math.min(lim,Math.max(0,(p.r-.03)/(-p.nx)));
    p.lim=lim;});
  M={pts:pts,inner:inner,H:H,f:f,w:w,r:r,r0:Math.max(.05,r[0]),hollow:isH,sTot:sTot,ds:sTot/n};
  // only the lower part is carvable comfortably: fade the limit above 55% height
  pts.forEach(function(p){if(p.y>H*.55)p.lim*=clamp(1-(p.y-H*.55)/(H*.2),0,1);});
}
function profilePoints(){var V=function(x,y){return new THREE.Vector2(x,y);},out=[];
  M.pts.forEach(function(p){out.push(V(Math.max(.006,p.r+p.nx*p.d),Math.max(-.001,p.y+p.ny*p.d)));});
  // keep the first point on the axis
  out[0].x=0;
  M.inner.forEach(function(q){out.push(V(q[0],q[1]));});
  if(!M.hollow)out.push(V(0,M.H));
  return out;}
var clayMat=null,origMat=null,lastBuild=0,dirty=false;
function clayBase(){var h;try{h=clay==='흑토'?0x51483f:clay==='분청토'?0xb9a587:0xc6a07b;}catch(e){h=0xc6a07b;}var c=new THREE.Color(h),l=c.clone().convertSRGBToLinear();return c.lerp(l,1).getHex();}
function rebuild(force){if(!M||!potMesh3)return;var t=now();if(!force&&t-lastBuild<45){dirty=true;return;}lastBuild=t;dirty=false;
  var g=new THREE.LatheGeometry(profilePoints(),96),np=M.pts.length+M.inner.length+(M.hollow?0:1),cnt=g.attributes.position.count,col=new Float32Array(cnt*3);
  var base=new THREE.Color(TR.dryColor||clayBase()),fresh=base.clone().lerp(new THREE.Color(0xf6e2c6),.38),edge=base.clone().multiplyScalar(.55).lerp(new THREE.Color(0x5a3418),.25),c=new THREE.Color(),NP=M.pts.length,slope=new Float32Array(NP);for(var q=1;q<NP-1;q++)slope[q]=Math.abs(M.pts[q+1].d-M.pts[q-1].d)/(2*M.ds);
  for(var v=0;v<cnt;v++){var j=v%np,d=j<M.pts.length?M.pts[j].d:0,k=clamp(d/.004,0,1),stripe=j<NP?(Math.sin(j*1.9)*.5+.5)*.13*k:0,eg=j<NP?clamp(slope[j]*1.4,0,.75):0;c.copy(base).lerp(fresh,k*.9);c.multiplyScalar(1-stripe);c.lerp(edge,eg);col[v*3]=c.r;col[v*3+1]=c.g;col[v*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  var old=potMesh3.geometry;potMesh3.geometry=g;if(old)old.dispose();}

/* ---------- scene helpers ---------- */
var wheelMats=[],hidden=[],grp=null,guideGrp=null,lumps=null,tool3=null,pieces=[],pile=[],ringGuide=null;
function hideOthers(){if(!scene3)return;var keep=[potGroup3,wheelGroup3,grp,guideGrp];
  scene3.children.forEach(function(o){if(o.isLight||keep.indexOf(o)>=0||!o.visible)return;o.visible=false;hidden.push(o);});
  potGroup3.children.forEach(function(o){if(o===potMesh3||!o.visible)return;o.visible=false;hidden.push(o);});}
function restoreOthers(){hidden.forEach(function(o){o.visible=true;});hidden=[];}
function mat(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8},o||{}));}
function makeLumps(){var g=new THREE.Group(),R=(M.r[M.r.length-1]||.4)+.035;for(var i=0;i<4;i++){var m=new THREE.Mesh(new THREE.SphereGeometry(.05,18,12),mat(TR.dryColor||clayBase(),{roughness:.95}));m.scale.set(1.1,.55,.8);var a=i*Math.PI/2+Math.PI/4;m.position.set(Math.cos(a)*R,.022,Math.sin(a)*R);m.rotation.y=-a;m.userData.s=0;g.add(m);}g.position.y=.06;return g;}
function dashedRing(R,color){var g=new THREE.Group(),N=28;for(var i=0;i<N;i++){var a0=i/N*Math.PI*2,m=new THREE.Mesh(new THREE.TorusGeometry(R,.007,6,8,Math.PI*2/N*.55),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:.9,depthTest:false}));m.rotation.x=Math.PI/2;m.rotation.z=a0;m.renderOrder=5;g.add(m);}return g;}

/* tool models (same build as the reference renders) */
function canvasTex(w,h,draw){var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return new THREE.CanvasTexture(c);}
var steel,steelDark,brass,tapeMat,woodMat,knurlMat;
function toolMats(){if(steel)return;steel=new THREE.MeshStandardMaterial({color:0x8d98a2,metalness:.55,roughness:.25});steelDark=new THREE.MeshStandardMaterial({color:0xc4ccd2,metalness:.4,roughness:.3});brass=new THREE.MeshStandardMaterial({color:0xf0c35c,metalness:.45,roughness:.28});
  tapeMat=new THREE.MeshStandardMaterial({map:canvasTex(256,64,function(g,w,h){g.fillStyle='#f5c443';g.fillRect(0,0,w,h);g.strokeStyle='rgba(176,118,20,.55)';g.lineWidth=3;for(var x=-h;x<w;x+=18){g.beginPath();g.moveTo(x,0);g.lineTo(x+h*.6,h);g.stroke();}}),roughness:.55});
  woodMat=new THREE.MeshStandardMaterial({map:canvasTex(512,128,function(g,w,h){g.fillStyle='#c98b55';g.fillRect(0,0,w,h);for(var i=0;i<22;i++){g.strokeStyle='rgba('+(120+Math.random()*30|0)+','+(70+Math.random()*20|0)+',30,'+(.25+Math.random()*.3)+')';g.lineWidth=1+Math.random()*3;g.beginPath();var y=Math.random()*h;g.moveTo(0,y);for(var x=0;x<=w;x+=32){y+=(Math.random()-.5)*6;g.lineTo(x,y);}g.stroke();}}),roughness:.6});
  knurlMat=new THREE.MeshStandardMaterial({map:canvasTex(256,32,function(g,w,h){g.fillStyle='#c9d1d7';g.fillRect(0,0,w,h);g.strokeStyle='rgba(90,100,110,.6)';g.lineWidth=2;for(var x=0;x<w;x+=6){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}}),metalness:.35,roughness:.35});}
function buildTool(kind){toolMats();var g=new THREE.Group(),M_=THREE.Mesh,tip;
  if(kind==='gupkal'){var sh=new M_(new THREE.BoxGeometry(3.2,.05,.3),steel);sh.position.x=.1;g.add(sh);var tp=new M_(new THREE.BoxGeometry(.05,.55,.3),steel);tp.position.set(-1.53,.3,0);g.add(tp);var t=new M_(new THREE.BoxGeometry(1.7,.11,.36),tapeMat);t.position.x=.65;g.add(t);tip=new THREE.Vector3(-1.53,.58,0);}
  else if(kind==='loop'){var pts=[[0,0],[.13,.02],[.17,.3],[.2,.9],[.19,1.5],[.15,1.95],[.09,2.15],[0,2.2]].map(function(p){return new THREE.Vector2(p[0],p[1]);});var h=new M_(new THREE.LatheGeometry(pts,24),woodMat);h.rotation.z=Math.PI/2;h.position.x=2.3;g.add(h);var f=new M_(new THREE.CylinderGeometry(.13,.13,.32,20),brass);f.rotation.z=Math.PI/2;g.add(f);var ring=new M_(new THREE.TorusGeometry(.42,.045,10,40),steel);ring.position.set(-.85,0,0);ring.rotation.x=-.5;g.add(ring);var a=new M_(new THREE.CylinderGeometry(.04,.04,.5,8),steelDark);a.rotation.z=Math.PI/2;a.position.set(-.3,0,.06);g.add(a);var b=a.clone();b.position.z=-.06;g.add(b);tip=new THREE.Vector3(-1.27,0,0);}
  else{var rod=new M_(new THREE.CylinderGeometry(.075,.075,3.1,16),knurlMat);rod.rotation.z=Math.PI/2;rod.position.x=.75;g.add(rod);var cap=new M_(new THREE.CylinderGeometry(.09,.09,.2,16),steel);cap.rotation.z=Math.PI/2;cap.position.x=-.8;g.add(cap);var path=new THREE.CatmullRomCurve3([new THREE.Vector3(-.86,.05,0),new THREE.Vector3(-1,.3,-.05),new THREE.Vector3(-1.55,.02,-.1),new THREE.Vector3(-1,-.26,-.05),new THREE.Vector3(-.86,-.05,0)]);g.add(new M_(new THREE.TubeGeometry(path,50,.035,8,false),steel));tip=new THREE.Vector3(-1.55,.02,-.1);}
  g.children.forEach(function(c){c.position.sub(tip);});
  var w=new THREE.Group();w.add(g);w.scale.setScalar(.26);w.userData.inner=g;w.visible=false;return w;}
var toolModels={};
function showTool(kind,pos,side,onBottom,press){Object.keys(toolModels).forEach(function(k){toolModels[k].visible=false;});if(!pos)return;var m=toolModels[kind]||(toolModels[kind]=buildTool(kind));if(m.parent!==grp)grp.add(m);m.visible=true;m.position.copy(pos);
  var inner=m.userData.inner;inner.rotation.set(0,0,0);
  // handle points away from the pot; tilt depends on surface
  m.rotation.set(0,side>0?Math.PI:0,0);
  inner.rotation.z=-(onBottom?.95:.38);inner.rotation.x=.25;
  m.scale.setScalar(.26*(1-.05*press));}

/* ribbons (apple-peel curls) */
var ribGeos=null,ribMat=null;
function ribbonGeos(){if(ribGeos)return ribGeos;ribGeos=[];for(var v=0;v<3;v++){var pts=[],turns=1.3+v*.5,R=.012+v*.004;for(var i=0;i<=40;i++){var a=i/40*Math.PI*2*turns;pts.push(new THREE.Vector3(Math.cos(a)*R*(1-i/90),i/40*.018*(1+v*.4),Math.sin(a)*R*(1-i/90)));}var g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.0036,5,false);g.scale(1,1,1);ribGeos.push(g);}return ribGeos;}
function spawnRibbon(pos,side,amt){if(!ribMat)ribMat=new THREE.MeshStandardMaterial({color:new THREE.Color(TR.dryColor||clayBase()).multiplyScalar(.82),roughness:.9});var gs=ribbonGeos(),m=new THREE.Mesh(gs[(Math.random()*3)|0],ribMat);m.position.copy(pos);var s=.7+Math.min(1.2,amt*2.2)+Math.random()*.3;m.scale.set(s,s*.8,s);m.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);m.userData={vx:side*(.006+Math.random()*.006),vy:.004+Math.random()*.004,vz:(Math.random()-.2)*.008,spin:(Math.random()-.5)*.3,life:0};grp.add(m);pieces.push(m);if(pieces.length>40){var o=pieces.shift();grp.remove(o);}}
function updateRibbons(dt){var top=WHEEL_TOP+.006;for(var i=pieces.length-1;i>=0;i--){var p=pieces[i],u=p.userData;u.vy-=.00042*dt;p.position.x+=u.vx*dt;p.position.y+=u.vy*dt;p.position.z+=u.vz*dt;p.rotation.x+=u.spin*dt;p.rotation.y+=u.spin*.7*dt;u.vx*=.985;u.vz*=.985;
  if(p.position.y<=top){pieces.splice(i,1);grp.remove(p);var R=Math.hypot(p.position.x,p.position.z);if(R>1.02){continue;}// lands on the wheel and spins with it
    var local=wheelGroup3.worldToLocal(p.position.clone());local.y=.066+Math.random()*.01*pile.length/40;p.position.copy(local);p.rotation.set(Math.random()*.4,Math.random()*6,Math.PI/2+Math.random()*.4);p.userData.born=now();wheelGroup3.add(p);pile.push(p);if(pile.length>26){var o=pile.shift();wheelGroup3.remove(o);}}}
  var tn=now();for(var j=pile.length-1;j>=0;j--){var q=pile[j],age=(tn-(q.userData.born||tn))/1000;if(age>7){if(!q.userData.s0)q.userData.s0=q.scale.clone();var f=Math.max(0,1-(age-7)/2);q.scale.copy(q.userData.s0).multiplyScalar(f);if(f<=0){wheelGroup3.remove(q);pile.splice(j,1);}}}}
function clearPile(){pile.forEach(function(p){wheelGroup3.remove(p);});pile=[];pieces.forEach(function(p){if(p.parent)p.parent.remove(p);});pieces=[];}

/* foot guides (transparent white lines) */
function footProfile(kind){var r0=M.r0,H=M.H,dep=Math.min(.07,(M.f-TMIN)*.8),wallAt=function(y){return interpR(M.r,y/H);},out=[];
  if(kind==='flat'){out=[[0,.004],[r0-.04,.004],[r0-.012,.012],[wallAt(.05)-.014,.05],[wallAt(.11)-.004,.11]];}
  else if(kind==='inner'){var Ro=r0*.84,Ri=Ro-Math.min(.075,r0*.25);out=[[0,dep],[Ri-.012,dep],[Ri,.004],[Ro,.004],[Ro+.014,.07],[wallAt(.08)-.035,.08],[wallAt(.16)-.006,.16]];}
  else{var Ro2=r0*.97,Ri2=Ro2-Math.min(.06,r0*.2);out=[[0,dep],[Ri2-.012,dep],[Ri2,.004],[Ro2,.004],[Ro2+.004,.085],[wallAt(.11)-.04,.11],[wallAt(.2)-.006,.2]];}
  return out;}
function tubeAlong(points,rad){var path=new THREE.CurvePath();for(var i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));return new THREE.TubeGeometry(path,points.length*6,rad,5,false);}
function buildGuide(){if(guideGrp){scene3.remove(guideGrp);guideGrp=null;}guideGrp=new THREE.Group();var prof=footProfile(TR.foot),m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,depthTest:false});
  var cut=0;prof.forEach(function(p,i){if(p[1]<=.005)cut=i;});prof=prof.slice(cut);
  [1,-1].forEach(function(sd){var pts=prof.map(function(p){return new THREE.Vector3(sd*p[0],p[1],.0);});var t=new THREE.Mesh(tubeAlong(pts,.0032),m);t.renderOrder=6;guideGrp.add(t);});
  // rings on the bottom face
  var rr=TR.foot==='flat'?[M.r0-.04]:TR.foot==='inner'?[M.r0*.84-Math.min(.075,M.r0*.25),M.r0*.84]:[M.r0*.97-Math.min(.06,M.r0*.2),M.r0*.97];
  rr.forEach(function(R){var ring=new THREE.Mesh(new THREE.TorusGeometry(R,.003,5,90),m);ring.rotation.x=Math.PI/2;ring.position.y=.003;ring.renderOrder=6;guideGrp.add(ring);});
  guideGrp.rotation.x=Math.PI;scene3.add(guideGrp);}

/* ---------- camera ---------- */
var camFrom=null;
function potPos(){return potGroup3.position;}
function camPose(zoomed){var R=Math.max(M.r0,cMaxRsafe())*1.0,c=renderer3.domElement,W=c.clientWidth||390,Hh=c.clientHeight||844,aspect=W/Hh,tanH=Math.tan(THREE.MathUtils.degToRad(camera3.fov/2));
  var want=zoomed?2.0*R*1.55:2.0*R*2.6;// visible width
  var D=want/(2*tanH*aspect),el=zoomed?.6:.5;
  var tgtY=(TR.phase==='upright'||TR.phase==='result')?WHEEL_TOP+M.H*.45:potPos().y-(zoomed?.1:.25)*M.H/.7;
  return {pos:new THREE.Vector3(0,tgtY+D*Math.sin(el),D*Math.cos(el)),tgt:new THREE.Vector3(0,tgtY,0)};}
function cMaxRsafe(){var m=0;M.r.forEach(function(x){if(x>m)m=x;});return Math.min(m,M.r0*1.7);}
var curTgt=new THREE.Vector3();
function placeCamera(dt){var pose=camPose(TR.zoom>.5),k=1-Math.exp(-dt/14);
  camera3.position.lerp(pose.pos,k);curTgt.lerp(pose.tgt,k);camera3.up.set(0,1,0);camera3.lookAt(curTgt);
  // keep the pot clear of the bottom panel: shift the frame up
  var c=renderer3.domElement,W=c.clientWidth||390,Hh=c.clientHeight||844,off=TR.phase==='carve'||TR.phase==='pick'?Math.round(Hh*.07):Math.round(Hh*.04);
  camera3.setViewOffset(W,Hh,0,off,W,Hh);camera3.zoom=1;camera3.updateProjectionMatrix();camera3.updateMatrixWorld(true);}

/* ---------- UI ---------- */
function el(tag,id,cls,html){var e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
var ui={};
function buildUI(){var mode=$('makeMode');if(!mode)return;
  if(!ui.panel){ui.panel=el('div','sosoTrimPanel','',
    '<div class="tp-hint" id="sosoTrimHint">칼을 대고 문지르면 얇게, 꾸욱 누르면 깊게 깎여요</div>'+
    '<div class="tp-tools">'+Object.keys(TOOLS).map(function(k){return '<button type="button" class="tp-tool" data-tool="'+k+'"><img alt="" src="'+TOOLS[k].ico+'"><span>'+TOOLS[k].name+'</span></button>';}).join('')+'</div>'+
    '<div class="tp-row"><label class="tp-speed"><span>물레 속도</span><input type="range" min="1" max="5" step="1" id="sosoTrimSpeed"><b id="sosoTrimSpeedName">보통</b></label><button type="button" class="tp-done" id="sosoTrimDone">완성</button></div>');
    mode.appendChild(ui.panel);
    ui.panel.querySelectorAll('.tp-tool').forEach(function(b){b.addEventListener('click',function(){if(TR.locked){bubble();return;}TR.tool=b.dataset.tool;syncUI();blip(700,.06,.08,'triangle');});});
    $('sosoTrimSpeed').addEventListener('input',function(e){var s=$('wheelSpeed');if(s){s.value=e.target.value;s.dispatchEvent(new Event('input',{bubbles:true}));}syncUI();});
    $('sosoTrimDone').addEventListener('click',finishTrim);}
  if(!ui.cap){ui.cap=el('div','sosoTrimCaption','');mode.appendChild(ui.cap);}
  if(!ui.bub){ui.bub=el('div','sosoTrimBubble','','더 이상 깎을 수 없어요!');mode.appendChild(ui.bub);}
  if(!ui.guideBtn){ui.guideBtn=el('button','sosoTrimGuideBtn','','가이드');ui.guideBtn.type='button';ui.guideBtn.addEventListener('click',function(){TR.guideOn=!TR.guideOn;syncUI();});}
  var top=$('sosoCraftTopbar'),gt=$('guideToggle');if(top&&ui.guideBtn.parentNode!==top){if(gt&&gt.parentNode===top)top.insertBefore(ui.guideBtn,gt.nextSibling);else top.appendChild(ui.guideBtn);}
  if(!ui.pick){ui.pick=el('div','sosoFootPick','',
    '<div class="fp-card"><h3>어떤 굽으로 깎을까요?</h3><p class="fp-sub">고른 굽은 투명한 가이드 선으로만 보여요.<br>선은 참고만 하고 마음대로 깎아도 돼요!</p><div class="fp-list">'+
    Object.keys(FOOTS).map(function(k){return '<button type="button" class="fp-opt" data-foot="'+k+'">'+footSvg(k)+'<span class="fp-txt"><b>'+FOOTS[k].name+(k==='flat'?' <em>추천</em>':'')+'</b><small>'+FOOTS[k].desc+'</small></span></button>';}).join('')+
    '</div><button type="button" class="fp-go" id="sosoFootGo">이 굽으로 깎기</button></div>');mode.appendChild(ui.pick);
    ui.pick.querySelectorAll('.fp-opt').forEach(function(b){b.addEventListener('click',function(){TR.foot=b.dataset.foot;syncUI();});});
    $('sosoFootGo').addEventListener('click',function(){ui.pick.classList.remove('show');buildGuide();TR.phase='carve';TR.zoom=1;caption('');syncUI();});}
  if(!ui.res){ui.res=el('div','sosoTrimResult','');mode.appendChild(ui.res);}
}
function footSvg(k){var clayC='#d9b38c',st='#7a5434';var body='M14 6 h52 v6 h-5 v18';var p;
  if(k==='flat')p='M10 8 H70 V14 Q70 36 64 40 H16 Q10 36 10 14 Z M18 14 H62 V30 Q62 34 58 34 H22 Q18 34 18 30 Z';
  else if(k==='inner')p='M10 8 H70 V14 Q70 32 62 34 V42 H54 V38 H26 V42 H18 V34 Q10 32 10 14 Z M18 14 H62 V28 Q62 31 58 31 H22 Q18 31 18 28 Z';
  else p='M10 8 H70 V14 Q70 30 66 32 V44 H58 V36 H22 V44 H14 V32 Q10 30 10 14 Z M18 14 H62 V26 Q62 29 58 29 H22 Q18 29 18 26 Z';
  return '<svg class="fp-ico" viewBox="0 0 80 50" aria-hidden="true"><path d="'+p+'" fill="'+clayC+'" fill-rule="evenodd" stroke="'+st+'" stroke-width="1.6" stroke-linejoin="round"/></svg>';}
var capTimer=0;
function caption(t,ms){if(!ui.cap)return;ui.cap.textContent=t||'';ui.cap.classList.toggle('show',!!t);clearTimeout(capTimer);if(t&&ms)capTimer=setTimeout(function(){ui.cap.classList.remove('show');},ms);}
var bubT=0;
function bubble(){if(!ui.bub)return;var t=now();if(t-bubT<3200)return;bubT=t;ui.bub.classList.remove('show');void ui.bub.offsetWidth;ui.bub.classList.add('show');clearTimeout(bubble.t);bubble.t=setTimeout(function(){ui.bub.classList.remove('show');},3100);}
var SPEEDN=['','느리게','천천히','보통','빠르게','아주 빠르게'];
function unskin(){['sosoTrimPanel','sosoFootPick','sosoTrimResult'].forEach(function(id){var r=$(id);if(r)r.querySelectorAll('button.soso-candy').forEach(strip);});if(ui.guideBtn&&ui.guideBtn.classList.contains('soso-candy'))strip(ui.guideBtn);function strip(b){b.className=b.className.split(/\s+/).filter(function(c){return c.indexOf('soso-candy')!==0&&c!=='soso-round';}).join(' ');}}
function syncUI(){var mode=$('makeMode');if(!mode)return;mode.classList.toggle('soso-trim',TR.active);unskin();var gt=$('guideToggle');if(gt){if(TR.active)gt.style.setProperty('display','none','important');else gt.style.removeProperty('display');}
  if(ui.panel){ui.panel.classList.toggle('show',TR.active&&(TR.phase==='carve'));ui.panel.classList.toggle('locked',TR.locked);
    ui.panel.querySelectorAll('.tp-tool').forEach(function(b){b.classList.toggle('on',b.dataset.tool===TR.tool);b.setAttribute('aria-pressed',String(b.dataset.tool===TR.tool));});
    var v=speedVal(),s=$('sosoTrimSpeed');if(s&&+s.value!==v)s.value=v;var sn=$('sosoTrimSpeedName');if(sn)sn.textContent=SPEEDN[v]||'보통';
    var d=$('sosoTrimDone');if(d)d.classList.toggle('pulse',TR.locked);}
  if(ui.pick)ui.pick.querySelectorAll('.fp-opt').forEach(function(b){b.classList.toggle('on',b.dataset.foot===TR.foot);});
  if(ui.guideBtn){ui.guideBtn.hidden=!(TR.active&&TR.phase==='carve');ui.guideBtn.classList.toggle('off',!TR.guideOn);ui.guideBtn.textContent=TR.guideOn?'가이드 켬':'가이드 끔';}
  if(guideGrp){guideGrp.visible=TR.active&&TR.guideOn&&(TR.phase==='carve');if(potGroup3)guideGrp.position.copy(potGroup3.position);}
}
var titleEl=null,titleHTML=null;
function setTitle(on){var t=$('makeTitle');if(on){if(!t)return;if(!titleEl){titleEl=t;titleHTML=t.innerHTML;}var want='굽 깎기 · '+((window.vesselNames&&vesselNames[vessel])||(function(){try{return vesselNames[vessel];}catch(e){return '';}})());if(t.textContent!==want)t.textContent=want;}else if(titleEl){titleEl.innerHTML=titleHTML;titleEl=null;titleHTML=null;}}

/* ---------- lifecycle ---------- */
var _rig=null,_rebuild=null,_render=null,_close=null;
function hookOnce(){if(_render||!renderer3)return;
  _render=renderer3.render.bind(renderer3);
  renderer3.render=function(sc,cam){if(TR.active){try{frame();}catch(e){console.error(e);}}return _render(sc,cam);};}
function start(){if(TR.active||!window.cs3||!potGroup3||!potMesh3)return;
  hookOnce();TR.active=true;TR.phase='dry';TR.t0=now();TR.zoom=0;TR.carveSec=0;TR.locked=false;TR.offset=new THREE.Vector3(.3,0,0);TR.centered=false;TR.spin=0;TR.speed=0;TR.shake=0;TR.everDragged=false;TR.guideOn=true;
  try{guideVisible=false;}catch(e){}
  cs3.finishReady=false;cs3.finishStart=0;cs3.flipStart=0;cs3.activePointer=null;try{dragging=false;currentTool='trimx';}catch(e){}
  buildModel();
  origMat=potMesh3.material;clayMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.86,metalness:0});potMesh3.material=clayMat;
  TR.wetColor=new THREE.Color(clayBase());TR.dryTarget=TR.wetColor.clone().lerp(new THREE.Color(0xd9c3a3),.3);TR.dryColor=TR.wetColor.getHex();
  grp=new THREE.Group();scene3.add(grp);
  potGroup3.scale.setScalar(1);potGroup3.rotation.set(0,0,0);potGroup3.position.set(0,WHEEL_TOP,0);
  wheelGroup3.visible=true;wheelGroup3.position.y=-.77;wheelMats=[];wheelGroup3.traverse(function(o){if(o.material&&o.material.color&&wheelMats.indexOf(o.material)<0){wheelMats.push(o.material);o.material.userData.trimHex=o.material.color.getHex();o.material.color.convertSRGBToLinear();}});
  hideOthers();rebuild(true);TR.lights=[];scene3.children.forEach(function(o){if(!o.isLight)return;TR.lights.push([o,o.intensity]);if(o.isHemisphereLight)o.intensity=.62;else if(o.intensity>.8)o.intensity=1.35;});
  curTgt.set(0,WHEEL_TOP+.3,0);
  buildUI();caption('살짝 꾸덕하게 말리는 중…');syncUI();
  try{craftRefresh3();}catch(e){}
}
function frame(){var t=now(),dt=Math.min(3,Math.max(.2,(t-(TR.last||t))/16.67));TR.last=t;
  setTitle(true);syncHUD();if(((t/250)|0)!==TR.lastSync){TR.lastSync=(t/250)|0;syncUI();}
  // keep foreign UI and objects hidden
  potGroup3.children.forEach(function(o){if(o!==potMesh3&&o.visible){o.visible=false;hidden.push(o);}});
  scene3.children.forEach(function(o){if(o.isLight||o===potGroup3||o===wheelGroup3||o===grp||o===guideGrp||!o.visible)return;o.visible=false;hidden.push(o);});
  wheelGroup3.visible=true;
  var ph=TR.phase,e=t-TR.t0;
  // wheel spin
  var target=(ph==='carve'||ph==='pick'||ph==='upright'||ph==='result')?.007*Math.pow(5,(speedVal()-1)/4):0;
  if(ph==='carve'&&TR.locked)target*=.6;
  TR.speed+=(target-TR.speed)*(1-Math.exp(-dt/10));TR.spin+=TR.speed*dt;wheelGroup3.rotation.y=TR.spin;
  if(ph==='dry'){var q=clamp(e/2000,0,1);var c=TR.wetColor.clone().lerp(TR.dryTarget,ease(q));TR.dryColor=c.getHex();if(((t/120)|0)!==TR.lastTint){TR.lastTint=(t/120)|0;rebuild(true);}potGroup3.position.set(0,WHEEL_TOP,0);potGroup3.rotation.set(0,TR.spin,0);
    if(q>=1){TR.phase='flip';TR.t0=t;caption('뒤집어서 물레에 올려요');blip(520,.12,.08,'triangle');}}
  else if(ph==='flip'){var q2=ease(clamp(e/950,0,1)),lift=Math.sin(q2*Math.PI)*.35;potGroup3.rotation.set(Math.PI*q2,0,0);
    var yUp=WHEEL_TOP,yDn=WHEEL_TOP+M.H;potGroup3.position.set(TR.offset.x*q2,yUp+(yDn-yUp)*q2+lift,TR.offset.z*q2);
    if(q2>=1){TR.phase='center';TR.t0=t;caption('도자기를 끌어서 초록 자리에 놓아요');ensureCenterRing();}}
  else if(ph==='center'){potGroup3.rotation.set(Math.PI,0,0);potGroup3.position.set(TR.offset.x,WHEEL_TOP+M.H,TR.offset.z);
    var d=Math.abs(TR.offset.x);
    if(ringGuide){ringGuide.visible=true;ringGuide.rotation.y+=.004*dt;ringGuide.children.forEach(function(m){m.material.color.setHex(d<.12?0x6fe08a:0x3fbf5f);});}
    if(ghost){ghost.visible=true;ghost.position.set(0,WHEEL_TOP+M.H,0);ghost.material.opacity=.22+.12*Math.sin(t/260);}
    centerHint(!TR.drag&&!TR.everDragged);
    if(d<.07)snap();}
  else if(ph==='lumps'){potGroup3.rotation.set(Math.PI,TR.spin,0);potGroup3.position.set(0,WHEEL_TOP+M.H,0);var q3=clamp(e/700,0,1);if(lumps)lumps.children.forEach(function(m,i){var k=clamp(q3*1.6-i*.15,0,1);m.scale.set(1.1*k,.55*k,.8*k);});if(q3>=1){TR.phase='pick';TR.t0=t;caption('');if(ui.pick)ui.pick.classList.add('show');syncUI();}}
  else if(ph==='pick'||ph==='carve'){potGroup3.rotation.set(Math.PI,TR.spin,0);potGroup3.position.set(0,WHEEL_TOP+M.H+TR.shake,0);TR.shake*=.8;carveStep(dt);}
  else if(ph==='upright'){var q4=ease(clamp(e/1000,0,1)),lift2=Math.sin(q4*Math.PI)*.35;potGroup3.rotation.set(Math.PI*(1-q4),TR.spin,0);potGroup3.position.set(0,WHEEL_TOP+M.H*(1-q4)+lift2,0);if(lumps)lumps.children.forEach(function(m){m.scale.multiplyScalar(.85);});
    if(q4>=1){TR.phase='result';TR.t0=t;if(lumps){wheelGroup3.remove(lumps);lumps=null;}showResult();}}
  else if(ph==='result'){potGroup3.rotation.set(0,TR.spin,0);potGroup3.position.set(0,WHEEL_TOP,0);}
  if(dirty)rebuild(false);if(guideGrp)guideGrp.position.copy(potGroup3.position);
  updateRibbons(dt);
  placeCamera(dt);
}
function syncHUD(){['sosoBottomPanel','sosoUndoRedo','sosoViewToggle','finishActions','finishBanner','trimHeader','sosoTouchRing','sosoOpenHelp','sosoFeedbackHud'].forEach(function(id){var e=$(id);if(e&&e.style.display!=='none'){e.dataset.trimHid='1';e.style.setProperty('display','none','important');}});}
function unhideHUD(){document.querySelectorAll('[data-trim-hid]').forEach(function(e){e.style.removeProperty('display');delete e.dataset.trimHid;});}
var ghost=null,hintEl=null;
function centerHint(on){var mode=$('makeMode');if(!mode)return;if(!hintEl){hintEl=el('div','sosoTrimDragHint','','<i class="fg"></i><b class="ar">⟵</b>');mode.appendChild(hintEl);}hintEl.classList.toggle('show',!!on&&TR.phase==='center');if(!on)return;
  var a=project(new THREE.Vector3(TR.offset.x,WHEEL_TOP+M.H*.5,0)),b=project(new THREE.Vector3(0,WHEEL_TOP+M.H*.5,0)),r=mode.getBoundingClientRect();hintEl.style.left=(a.x-r.left)+'px';hintEl.style.top=(a.y-r.top)+'px';hintEl.style.setProperty('--dx',(b.x-a.x)+'px');}
function ensureCenterRing(){if(!ghost){ghost=new THREE.Mesh(potMesh3.geometry,new THREE.MeshBasicMaterial({color:0x6fe08a,transparent:true,opacity:.28,depthWrite:false}));ghost.rotation.x=Math.PI;ghost.renderOrder=4;grp.add(ghost);}if(ringGuide)return;ringGuide=dashedRing((M.r[M.r.length-1]||.4)+.012,0x3fbf5f);ringGuide.position.y=.068;wheelGroup3.add(ringGuide);}
function snap(){centerHint(false);if(ghost){grp.remove(ghost);ghost.material.dispose();ghost=null;}TR.phase='lumps';TR.t0=now();TR.offset.set(0,0,0);sndSnap();caption('딱! 가운데에 맞았어요',1400);if(ringGuide){wheelGroup3.remove(ringGuide);ringGuide=null;}lumps=makeLumps();lumps.children.forEach(function(m){m.scale.set(.001,.001,.001);});wheelGroup3.add(lumps);setTimeout(function(){blip(300,.08,.15,'sine');},250);setTimeout(function(){blip(260,.08,.15,'sine');},420);}

/* ---------- input ---------- */
var P={id:null,x:0,y:0,lx:0,ly:0,still:0,moved:0,down:false,contact:null,lastHit:0};
function canvasEl(){return renderer3&&renderer3.domElement;}
function onDown(e){if(!TR.active)return;var c=canvasEl();if(!c||e.target!==c)return;e.stopImmediatePropagation();e.preventDefault();ac();
  if(P.id!==null)return;P.id=e.pointerId;P.x=P.lx=e.clientX;P.y=P.ly=e.clientY;P.still=0;P.down=true;P.t=now();
  try{c.setPointerCapture(e.pointerId);}catch(err){}
  if(TR.phase==='center'){TR.drag=true;TR.p0=planePoint(e.clientX,e.clientY);TR.o0=TR.offset.clone();}
  if(TR.phase==='carve'){if(TR.locked){bubble();return;}scrapeStart();}}
function onMove(e){if(!TR.active||P.id===null||e.pointerId!==P.id)return;e.stopImmediatePropagation();var dx=e.clientX-P.x,dy=e.clientY-P.y;P.x=e.clientX;P.y=e.clientY;
  if(TR.phase==='center'&&TR.drag&&TR.p0){var q=planePoint(e.clientX,e.clientY);if(q){TR.everDragged=true;TR.offset.x=clamp(TR.o0.x+q.x-TR.p0.x,-.55,.55);TR.offset.z=0;}}}
function planePoint(x,y){var c=canvasEl(),r=c.getBoundingClientRect();if(!ray)ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height)*2+1),camera3);var pl=new THREE.Plane(new THREE.Vector3(0,1,0),-WHEEL_TOP),out=new THREE.Vector3();return ray.ray.intersectPlane(pl,out)?out:null;}
function onUp(e){if(P.id===null||e.pointerId!==P.id)return;if(TR.active)e.stopImmediatePropagation();P.id=null;P.down=false;P.contact=null;TR.drag=false;scrapeStop();showTool(null);}
function pxToWorld(){var c=canvasEl(),Hh=c.clientHeight||844,D=camera3.position.distanceTo(curTgt),vis=2*D*Math.tan(THREE.MathUtils.degToRad(camera3.fov/2));return vis/Hh;}
['pointerdown'].forEach(function(n){window.addEventListener(n,onDown,true);});
window.addEventListener('pointermove',onMove,true);window.addEventListener('pointerup',onUp,true);window.addEventListener('pointercancel',onUp,true);
['touchstart','touchmove','mousedown'].forEach(function(n){window.addEventListener(n,function(e){if(TR.active&&e.target===canvasEl()){e.stopImmediatePropagation();}},true);});

var ray=null;
function hitPotRay(x,y){var c=canvasEl(),r=c.getBoundingClientRect();if(!ray)ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height)*2+1),camera3);potGroup3.updateMatrixWorld(true);return ray.intersectObject(potMesh3,false)[0]||null;}
function project(v){var c=canvasEl(),r=c.getBoundingClientRect(),q=v.clone().project(camera3);return {x:r.left+(q.x+1)/2*r.width,y:r.top+(1-q.y)/2*r.height};}
function worldOf(r,y,side){/* pot is flipped: local y -> world down */var p=potGroup3.position;return new THREE.Vector3(side*r,p.y-y,0);}
function findContact(x,y){var h=hitPotRay(x,y),best=-1,bd=1e9,side=1,world=null,j;
  if(h){var L=potMesh3.worldToLocal(h.point.clone()),lr=Math.hypot(L.x,L.z),ly=L.y;for(j=0;j<M.pts.length;j++){var p=M.pts[j],pr=p.r+p.nx*p.d,py=p.y+p.ny*p.d,d=Math.hypot(pr-lr,py-ly);if(d<bd){bd=d;best=j;}}if(bd>.03)best=-1;else{side=h.point.x>=0?1:-1;world=h.point.clone();}}
  if(best<0){// forgiving: nearest silhouette point on screen
    var pc=project(potGroup3.position);side=x>=pc.x?1:-1;bd=1e9;
    for(j=0;j<M.pts.length;j+=2){var p2=M.pts[j];if(p2.lim<=0&&p2.y>M.H*.6)continue;var w=worldOf(p2.r+p2.nx*p2.d,p2.y+p2.ny*p2.d,side),s=project(w),dd=Math.hypot(s.x-x,s.y-y);if(dd<bd){bd=dd;best=j;world=w;}}
    if(bd>46)best=-1;}
  if(best<0)return null;var pt=M.pts[best];return {j:best,side:side,world:world,bottom:pt.ny>.7};}
function shapeF(kind,u){u=Math.abs(u);if(u>=1)return 0;if(kind==='flat')return u<.7?1:.5+.5*Math.cos((u-.7)/.3*Math.PI);if(kind==='round')return Math.sqrt(1-u*u);return Math.pow(1-u,1.4);}
var thinT=0,ribAcc=0;
function carveStep(dt){if(TR.phase!=='carve'||!P.down||P.id===null){if(scrape)scrapeSet(0);return;}
  var tl=TOOLS[TR.tool],sec=dt/60;
  var mv=Math.hypot(P.x-P.lx,P.y-P.ly);P.lx=P.x;P.ly=P.y;if(mv<1.5*dt)P.still+=sec;else P.still=Math.max(0,P.still-sec*3);
  var ct=findContact(P.x,P.y-44);P.contact=ct;
  if(!ct){showTool(null);scrapeSet(0);return;}
  var press=clamp(P.still/.7,0,1);// long-press digs deeper
  showTool(TR.tool,ct.world,ct.side,ct.bottom,press);
  if(TR.locked){bubble();scrapeSet(0);return;}
  var spd=.35+.65*(TR.speed/.0157),mult=(mv>1.5*dt?.75:1)*(1+1.2*press)*spd,removed=0,hitLim=false,j0=ct.j,s0=M.pts[j0].s,halfN=Math.ceil(tl.w/M.ds)+1;
  for(var j=Math.max(0,j0-halfN);j<=Math.min(M.pts.length-1,j0+halfN);j++){var p=M.pts[j],f=shapeF(tl.shape,(p.s-s0)/tl.w);if(f<=0)continue;var add=tl.rate*sec*mult*f;var nd=Math.min(p.lim,p.d+add);removed+=nd-p.d;p.d=nd;if(p.lim>0&&p.d>=p.lim*.94&&f>.6)hitLim=true;}
  if(removed>0){TR.carveSec+=sec;dirty=true;ribAcc+=removed;if(ribAcc>.0018){spawnRibbon(ct.world,ct.side,ribAcc*130);ribAcc=0;}}
  scrapeSet(removed>0?clamp(.35+press*.4+mv*.02,0,1):.08);
  if(hitLim&&now()-thinT>1200){thinT=now();sndTok();TR.shake=.004;if(now()-(TR.capT||0)>5000){TR.capT=now();caption('통통! 여기는 충분히 얇아졌어요',1500);}}
  if(TR.carveSec>=LIMIT_SEC&&!TR.locked){TR.locked=true;scrapeStop();bubble();syncUI();}
}

/* ---------- finish ---------- */
function finishTrim(){if(TR.phase!=='carve')return;P.id=null;P.down=false;scrapeStop();showTool(null);TR.phase='upright';TR.t0=now();TR.zoom=0;caption('');syncUI();sndChime();}
function smoothPts(a,n){var o=a.map(function(p){return {x:p.x,y:p.y};});for(var it=0;it<n;it++){var q=o.map(function(p){return {x:p.x,y:p.y};});for(var i=2;i<o.length-2;i++){q[i].x=(o[i-2].x+o[i-1].x*2+o[i].x*3+o[i+1].x*2+o[i+2].x)/9;q[i].y=(o[i-2].y+o[i-1].y*2+o[i].y*3+o[i+1].y*2+o[i+2].y)/9;}o=q;}return o;}
function sectionSvg(){var raw=profilePoints(),no=M.pts.length,outer=smoothPts(raw.slice(1,no),3),inner=smoothPts(raw.slice(no),2),pts=[raw[0]].concat(outer,inner);var mr=0;pts.forEach(function(p){if(p.x>mr)mr=p.x;});var W=260,H=170,cx=W/2,by=H-20,k=Math.min(128/M.H,(W/2-12)/Math.max(.05,mr));
  function P2(x,y,sd){return (cx+sd*x*k).toFixed(1)+','+(by-y*k).toFixed(1);}
  var right=pts.map(function(p){return P2(p.x,p.y,1);}),left=pts.slice().reverse().map(function(p){return P2(p.x,p.y,-1);});
  var cl=new THREE.Color(TR.dryColor||clayBase());
  return '<svg viewBox="0 0 '+W+' '+H+'" class="tr-sec"><line x1="10" y1="'+(by+.5)+'" x2="'+(W-10)+'" y2="'+(by+.5)+'" stroke="#c9b08a" stroke-width="2" stroke-dasharray="5 5"/><polygon points="'+right.join(' ')+' '+left.join(' ')+'" fill="#'+cl.getHexString()+'" stroke="#6b4425" stroke-width="2" stroke-linejoin="round"/></svg>';}
function showResult(){if(!ui.res)return;var min=Math.floor(TR.carveSec/60),sec=Math.round(TR.carveSec%60);
  ui.res.innerHTML='<div class="tr-card"><h3>굽 깎기 완성!</h3><p class="tr-sub">'+FOOTS[TR.foot].name+' 가이드로 깎았어요 · 깎은 시간 '+(min?min+'분 ':'')+sec+'초</p><div class="tr-label">단면 보기</div>'+sectionSvg()+'<button type="button" class="tr-save" id="sosoTrimSave">작품 저장하기</button></div>';
  ui.res.classList.add('show');$('sosoTrimSave').addEventListener('click',function(){ui.res.classList.remove('show');try{cs3.trimmed=true;}catch(e){}var pp=profilePoints(),no=M.pts.length;window.__sosoLastTrim={foot:TR.foot,outer:smoothPts(pp.slice(0,no),2).map(function(p){return [+p.x.toFixed(4),+p.y.toFixed(4)];}),inner:pp.slice(no).map(function(p){return [+p.x.toFixed(4),+p.y.toFixed(4)];})};var keep=potMesh3.geometry.clone();cleanup(true);try{finishPot();}catch(e){console.error(e);}});}
function cleanup(keepShape){if(!TR.active)return;TR.active=false;TR.phase='';scrapeStop();showTool(null);
  if(grp){scene3.remove(grp);grp=null;}if(guideGrp){scene3.remove(guideGrp);guideGrp=null;}centerHint(false);if(ghost){ghost=null;}if(lumps){wheelGroup3.remove(lumps);lumps=null;}if(ringGuide){wheelGroup3.remove(ringGuide);ringGuide=null;}clearPile();toolModels={};
  if(potMesh3&&origMat){potMesh3.material=origMat;}origMat=null;
  restoreOthers();unhideHUD();(TR.lights||[]).forEach(function(a){a[0].intensity=a[1];});TR.lights=[];setTitle(false);wheelMats.forEach(function(m){if(m.userData.trimHex!=null){m.color.setHex(m.userData.trimHex);delete m.userData.trimHex;}});wheelMats=[];
  try{camera3.clearViewOffset();camera3.updateProjectionMatrix();}catch(e){}
  try{potGroup3.rotation.set(0,0,0);}catch(e){}
  if(ui.bub)ui.bub.classList.remove('show');['pick','res'].forEach(function(k){if(ui[k])ui[k].classList.remove('show');});caption('');syncUI();
  try{craftRebuildMesh3();craftApplyRig3();}catch(e){}}

/* ---------- hooks into the game ---------- */
function install(){if(typeof craftEnterTrim3!=='function'||typeof craftApplyRig3!=='function'){setTimeout(install,200);return;}
  craftEnterTrim3=function(){if(!window.cs3||cs3.isTrim||TR.active)return;if(!cs3.cut&&!cs3.finishReady)return;start();};
  _rig=craftApplyRig3;craftApplyRig3=function(){if(TR.active)return;return _rig.apply(this,arguments);};
  _rebuild=craftRebuildMesh3;craftRebuildMesh3=function(){if(TR.active)return;return _rebuild.apply(this,arguments);};
  var _prim=craftPrimaryAction3;craftPrimaryAction3=function(){if(TR.active)return;return _prim.apply(this,arguments);};
  var _ang=window.angle;if(typeof angle==='function'){var a0=angle;angle=function(){if(TR.active)return;return a0.apply(this,arguments);};}
  _close=closeMake;closeMake=function(){if(TR.active)cleanup(false);return _close.apply(this,arguments);};
  var _sm=window.startMake;if(typeof startMake==='function'){var s0=startMake;startMake=function(){if(TR.active)cleanup(false);return s0.apply(this,arguments);};window.startMake=startMake;}
}
install();
/* ---------- 작품 저장 + 내 전시 ---------- */
var WKEY='soso-works-v1';
function loadWorks(){try{return JSON.parse(localStorage.getItem(WKEY)||'[]')||[];}catch(e){return [];}}
function saveWork(){try{var rec={vessel:vessel,clay:clay,at:Date.now()};var lt=window.__sosoLastTrim;
  if(lt){rec.foot=lt.foot;rec.outer=lt.outer;rec.inner=lt.inner;}
  else{var v=cs3.renderState||craftTargetState3(),pr=craftProfile3(v.r,v.H,v.f,v.w,null),mx=0,cut=pr.length-1;pr.forEach(function(p,i){if(p.y>mx+1e-6){mx=p.y;cut=i;}});rec.outer=pr.slice(0,cut+1).map(function(p){return [+p.x.toFixed(4),+p.y.toFixed(4)];});rec.inner=pr.slice(cut+1).map(function(p){return [+p.x.toFixed(4),+p.y.toFixed(4)];});}
  var a=loadWorks();a.unshift(rec);if(a.length>30)a.length=30;localStorage.setItem(WKEY,JSON.stringify(a));}catch(e){}window.__sosoLastTrim=null;}
function clayHex(c){return c==='흑토'?'#5d554c':c==='분청토'?'#b9a587':'#d4ad86';}
function workSvg(w){var o=w.outer||[],inn=w.inner||[],mr=.05,mh=.05;o.concat(inn).forEach(function(p){mr=Math.max(mr,p[0]);mh=Math.max(mh,p[1]);});var W=120,H=110,k=Math.min((W/2-8)/mr,(H-16)/mh),cx=W/2,by=H-8;
  function P(x,y,sd){return (cx+sd*x*k).toFixed(1)+','+(by-y*k).toFixed(1);}
  var right=o.map(function(p){return P(p[0],p[1],1);}),left=o.slice().reverse().map(function(p){return P(p[0],p[1],-1);});
  var rimR=o.length?o[o.length-1][0]:0,rimY=o.length?o[o.length-1][1]:0,inR=inn.length?inn[0][0]:rimR*.8;
  return '<svg viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><ellipse cx="'+cx+'" cy="'+(by+1)+'" rx="'+(mr*k*.9).toFixed(1)+'" ry="4" fill="rgba(80,50,25,.15)"/><polygon points="'+right.join(' ')+' '+left.join(' ')+'" fill="'+clayHex(w.clay)+'" stroke="#6b4425" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="'+cx+'" cy="'+(by-rimY*k).toFixed(1)+'" rx="'+(rimR*k).toFixed(1)+'" ry="'+Math.max(2,rimR*k*.18).toFixed(1)+'" fill="#00000022" stroke="#6b4425" stroke-width="1.2"/><ellipse cx="'+cx+'" cy="'+(by-rimY*k).toFixed(1)+'" rx="'+(inR*k).toFixed(1)+'" ry="'+Math.max(1.5,inR*k*.18).toFixed(1)+'" fill="#4a2f1a44"/></svg>';}
function openGallery(){var a=loadWorks(),g=$('sosoGallery');if(!g){g=el('div','sosoGallery','');document.body.appendChild(g);g.addEventListener('click',function(e){if(e.target===g||e.target.closest('[data-close]'))g.classList.remove('show');});}
  var FN={flat:'평굽',inner:'안굽',outer:'바깥굽'};
  g.innerHTML='<div class="gl-card"><div class="gl-head"><h3>내 전시</h3><button type="button" data-close aria-label="닫기">✕</button></div>'+(a.length?'<div class="gl-grid">'+a.map(function(w){var d=new Date(w.at);return '<div class="gl-item">'+workSvg(w)+'<b>'+(((window.vesselNames||{})[w.vessel])||(function(){try{return vesselNames[w.vessel]}catch(e){return w.vessel}})())+'</b><small>'+(w.foot?FN[w.foot]+' 굽':'굽 없음')+' · '+(d.getMonth()+1)+'/'+d.getDate()+'</small></div>';}).join('')+'</div>':'<p class="gl-empty">아직 완성한 작품이 없어요.<br>도자기를 빚고 저장하면 여기에 전시돼요!</p>')+'</div>';
  g.querySelectorAll('button').forEach(function(b){b.className=b.className.split(/\s+/).filter(function(c){return c.indexOf('soso-candy')!==0;}).join(' ');});
  g.classList.add('show');}
window.__sosoOpenGallery=openGallery;
function hookGallery(){document.querySelectorAll('.side .iconbtn').forEach(function(b){if((b.textContent||'').indexOf('내 전시')>-1&&!b.dataset.gal){b.dataset.gal='1';b.onclick=function(e){e.preventDefault();openGallery();};}});}
setInterval(hookGallery,800);hookGallery();
(function wrapFinish(){if(typeof finishPot!=='function'){setTimeout(wrapFinish,300);return;}var f0=finishPot;finishPot=function(){saveWork();return f0.apply(this,arguments);};try{window.finishPot=finishPot;}catch(e){}})();
window.__sosoTrimDebug={start:start,cleanup:cleanup,model:function(){return M;},finish:finishTrim,snap:function(){snap();}};
})();
