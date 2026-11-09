W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a))
    s=s.replace(a,b)
EYE='<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M3 16C9 7 16 3 24 3s15 4 21 13c-6 9-13 13-21 13S9 25 3 16z" fill="#fff" stroke="#6b4425" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="16" r="8.5" fill="#8a5a36"/><circle cx="24" cy="16" r="4.2" fill="#3d2414"/><circle cx="27" cy="12.6" r="2.2" fill="#fff"/></svg>'
rep("var d=VIEW[cur]||VIEW.front;v.innerHTML=d[1]+'<span>'+d[0]+'</span>';",
    "var d=VIEW[cur]||VIEW.front;v.innerHTML='"+EYE+"<span>'+d[0]+'</span>';")
# 중심잡기 높이: 기물마다 '중심잡기용' 높이 (접시도 너무 낮지 않게)
rep("var target=(CSPECS[vessel]||CSPECS.cup).H,pt=screenPoint(target,0)","var target=window.sosoCenterH?sosoCenterH():(CSPECS[vessel]||CSPECS.cup).H,pt=screenPoint(target,0)")
rep("cs3.heightTouched=true;var target=(CSPECS[vessel]||CSPECS.cup).H,matched","cs3.heightTouched=true;var target=window.sosoCenterH?sosoCenterH():(CSPECS[vessel]||CSPECS.cup).H,matched")
rep("if(moveFinalBase)moveFinalBase(dx,dy*.68,e);var target=(CSPECS[vessel]||CSPECS.cup).H;","if(moveFinalBase)moveFinalBase(dx,dy*.68,e);var target=window.sosoCenterH?sosoCenterH():(CSPECS[vessel]||CSPECS.cup).H;")
# forming guide a bit more transparent
rep("var m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthTest:false,depthWrite:false});","var m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5,depthTest:false,depthWrite:false});")
extra=r'''<style id="soso-v10-style">#sosoViewToggle svg{width:34px!important;height:24px!important}</style>
<script id="soso-v10">
(function(){
var CH={cup:.62,bowl:.5,plate:.34,jar:.7,vase:.74};
window.sosoCenterH=function(){try{return CH[vessel]||(CSPECS[vessel]||CSPECS.cup).H;}catch(e){return .5;}};
/* 중심만 잡히면 점선 높이를 안 맞춰도 가운데 열기로 넘어갈 수 있게 */
function loop(){requestAnimationFrame(loop);try{if(!window.cs3||!cs3.centered||cs3.step!==1)return;var sd=window.__sosoStageDone;var ch=false;if(!cs3.heightTouched){cs3.heightTouched=true;ch=true;}if(sd&&!sd[1]){sd[1]=true;ch=true;}if(ch){try{craftRefresh3();}catch(e){}try{applyFinalStageUI();}catch(e){}}}catch(e){}}
requestAnimationFrame(loop);
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
