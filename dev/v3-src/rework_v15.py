W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a))
    s=s.replace(a,b)
# 1) target shapes that read as the real thing
rep("cup:{label:'컵',H:.70,f:.07,hint:'곧게 선 몸통과 열린 입구',baseWall:.06,mass:1.15,lumpH:.52,r:function(t){return .35+.03*t;}},",
    "cup:{label:'컵',H:.80,f:.07,hint:'곧게 선 몸통과 열린 입구',baseWall:.06,mass:1.15,lumpH:.52,pts:[[0,.29],[.06,.325],[.18,.34],[.5,.345],[.85,.355],[1,.36]]},")
rep("bowl:{label:'그릇',H:.44,f:.07,hint:'둥근 몸통과 벌어진 입구',baseWall:.06,mass:1.35,lumpH:.50,r:function(t){return .30+.36*Math.pow(t,.8);}},",
    "bowl:{label:'그릇',H:.50,f:.07,hint:'둥근 몸통과 벌어진 입구',baseWall:.06,mass:1.35,lumpH:.50,pts:[[0,.25],[.08,.33],[.22,.42],[.42,.5],[.65,.55],[.85,.575],[1,.585]]},")
rep("plate:{label:'접시',H:.10,f:.055,hint:'낮고 넓게 눕힌 사선 벽',baseWall:.065,mass:1.00,lumpH:.48,r:function(t){return .55+.35*t;}},",
    "plate:{label:'접시',H:.14,f:.055,hint:'낮고 넓게 눕힌 사선 벽',baseWall:.06,mass:1.00,lumpH:.48,pts:[[0,.44],[.2,.56],[.45,.67],[.7,.75],[1,.81]]},")
extra=r'''<script id="soso-v15">
(function(){
function $(id){return document.getElementById(id);}
function trimOn(){return window.__sosoTrim&&__sosoTrim.active;}
/* clay streaks so the turning pot is visible */
var tex=null;
function mkTex(){var c=document.createElement('canvas');c.width=512;c.height=128;var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,512,128);
  var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
  for(var i=0;i<40;i++){var x=rnd()*512,w=1+rnd()*3,a=.02+rnd()*.045;g.fillStyle='rgba(95,62,35,'+a.toFixed(3)+')';g.fillRect(x,0,w,128);}
  for(var j=0;j<5;j++){var cx=60+j*100+rnd()*30,cy=20+rnd()*88,gr=g.createRadialGradient(cx,cy,0,cx,cy,26);gr.addColorStop(0,'rgba(90,58,32,.22)');gr.addColorStop(1,'rgba(90,58,32,0)');g.fillStyle=gr;g.fillRect(cx-30,cy-30,60,60);}
  for(var k=0;k<4;k++){var hx=30+k*128+rnd()*40,hy=16+rnd()*96,gh=g.createRadialGradient(hx,hy,0,hx,hy,16);gh.addColorStop(0,'rgba(255,255,255,.55)');gh.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gh;g.fillRect(hx-18,hy-18,36,36);}
  tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;}
/* slurry marks on the wheel head, turning with the wheel */
var marks=null;
function mkMarks(){marks=new THREE.Group();marks.name='soso_wheelmarks';
  var mw=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide}),md=new THREE.MeshBasicMaterial({color:0x6d5a72,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  for(var i=0;i<7;i++){var r0=.72+((i*37)%17)/100,len=.35+((i*53)%30)/100,a=new THREE.Mesh(new THREE.RingGeometry(r0,r0+.035,24,1,i*Math.PI*2/7,len),i%2?md:mw);a.rotation.x=-Math.PI/2;marks.add(a);}
  for(var j=0;j<4;j++){var b=new THREE.Mesh(new THREE.PlaneGeometry(.2,.03),md);b.rotation.x=-Math.PI/2;b.rotation.z=j*Math.PI/2+.4;var ang=j*Math.PI/2+.4;b.position.set(Math.cos(ang)*.88,0,-Math.sin(ang)*.88);marks.add(b);}
  marks.position.y=.004;marks.renderOrder=1;}
var NAMES={cup:'컵',bowl:'밥그릇',plate:'접시',jar:'항아리',vase:'꽃병'};
function loop(){requestAnimationFrame(loop);try{if(!window.cs3||!window.potGroup3&&typeof potGroup3==='undefined')return;var m=$('makeMode'),open=m&&m.classList.contains('show');
  if(!tex)mkTex();if(!marks)mkMarks();
  var trim=trimOn()||cs3.isTrim;
  if(typeof potMesh3!=='undefined'&&potMesh3&&potMesh3.material&&!trim){var mt=potMesh3.material;if(mt.map!==tex&&!mt.vertexColors){mt.map=tex;mt.needsUpdate=true;}}
  if(marks.parent!==potGroup3)potGroup3.add(marks);marks.visible=!!(open&&!trim&&!cs3.cut);
  /* finished: no more cut instructions on screen */
  if(open&&cs3.cut&&!trim){var t=$('makeTitle'),nm=(window.vesselNames&&vesselNames[vessel])||NAMES[vessel]||'도자기',tt='완성! · '+nm;if(t&&t.textContent!==tt)t.textContent=tt;var h=$('makeHint'),ht=cs3.finishReady?'굽 깎기로 넘어가거나, 한 바퀴 돌려 봐요':'짠! '+nm+' 모양 완성!';if(h&&h.textContent!==ht)h.textContent=ht;}
}catch(e){}}
requestAnimationFrame(loop);
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
