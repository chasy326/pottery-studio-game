W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
extra=r'''<style id="soso-v13-style">
.tooltray .tool.selected,.tooltray .tool.selected *{text-shadow:none!important}
#sosoViewToggle{height:40px!important;min-height:40px!important;min-width:84px!important;padding:0 11px 0 7px!important;border-radius:20px!important;font-size:15px!important;gap:3px!important}
#sosoViewToggle svg{width:28px!important;height:22px!important}
#makeMode.soso-free #sosoViewToggle{display:none!important}
#sosoPinchHint{position:absolute;z-index:49;left:50%;top:40%;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;gap:6px;padding:14px 20px 12px;border-radius:22px;background:#fffaf0f0;border:2px solid #e2c99a;box-shadow:0 4px 0 rgba(91,58,31,.2);color:#5b3a1f;pointer-events:none}
#sosoPinchHint.show{display:flex;animation:soso-ph-in 3.2s ease forwards}
#sosoPinchHint b{font-weight:400;font-size:19px;white-space:nowrap}
#sosoPinchHint .stage{position:relative;width:150px;height:64px}
#sosoPinchHint .f{position:absolute;top:18px;left:63px;width:26px;height:26px;border-radius:50%;background:#fff;border:3px solid #e97c31;box-shadow:0 2px 4px rgba(90,50,20,.3)}
#sosoPinchHint .f::after{content:'';position:absolute;inset:6px;border-radius:50%;background:#e97c31}
#sosoPinchHint .f.a{animation:soso-ph-a 1.3s ease-in-out infinite}
#sosoPinchHint .f.b{animation:soso-ph-b 1.3s ease-in-out infinite}
#sosoPinchHint .ar{position:absolute;top:22px;font-size:20px;color:#e97c31;opacity:.8}
@keyframes soso-ph-a{0%,15%{transform:translate(-8px,6px)}70%,100%{transform:translate(-52px,-10px)}}
@keyframes soso-ph-b{0%,15%{transform:translate(8px,-6px)}70%,100%{transform:translate(52px,10px)}}
@keyframes soso-ph-in{0%{opacity:0}10%{opacity:1}85%{opacity:1}100%{opacity:0}}
</style>
<script id="soso-v13">
(function(){
var KEY='soso-pinch-hint-v1',seen=false;try{seen=localStorage.getItem(KEY)==='1';}catch(e){}
var el=null,armed=false;
function show(){var m=document.getElementById('makeMode');if(!m)return;if(!el){el=document.createElement('div');el.id='sosoPinchHint';el.innerHTML='<div class="stage"><span class="ar" style="left:4px">‹</span><span class="ar" style="right:4px">›</span><i class="f a"></i><i class="f b"></i></div><b>두 손가락으로 벌리면 커져요</b>';m.appendChild(el);}
  el.classList.remove('show');void el.offsetWidth;el.classList.add('show');setTimeout(function(){el.classList.remove('show');},3300);}
function loop(){requestAnimationFrame(loop);try{var m=document.getElementById('makeMode');if(!m||!window.cs3)return;var open=m.classList.contains('show'),trim=window.__sosoTrim&&__sosoTrim.active;
  m.classList.toggle('soso-free',!!(open&&!trim&&!cs3.isTrim&&cs3.freeMode&&!cs3.cut));
  if(!seen&&!armed&&open&&trim&&__sosoTrim.phase==='carve'){armed=true;seen=true;try{localStorage.setItem(KEY,'1');}catch(e){}setTimeout(show,700);}
}catch(e){}}
requestAnimationFrame(loop);
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
