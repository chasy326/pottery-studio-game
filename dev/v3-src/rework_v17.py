W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
IW,IH=941,1672
def pc(pts):return 'polygon('+','.join('%.2f%% %.2f%%'%(x*100/IW,y*100/IH) for x,y in pts)+')'
POT=[(452,1282),(446,1215),(452,1170),(474,1138),(482,1118),(538,1112),(552,1132),(572,1170),(578,1215),(570,1282)]
HEAD=[(205,770),(530,770),(530,1095),(470,1110),(440,1120),(300,1120),(215,1095)]
LH=[(380,1160),(452,1160),(452,1246),(380,1246)]
RH=[(546,1140),(586,1140),(586,1200),(546,1200)]
potd='M'+' L'.join('%d %d'%p for p in POT)+' Z'
css=r'''<style id="soso-v17-style">
#sosoHomeFx{position:absolute!important;inset:0;pointer-events:none;z-index:1;overflow:hidden;display:block!important;visibility:visible!important;opacity:1!important}
#sosoHomeFx .lay{display:block!important}
#sosoHomeFx .lay{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat;will-change:transform}
#sosoHomeFx .head{clip-path:__HEAD__;animation:soso-hf-breath 3.2s ease-in-out infinite}
#sosoHomeFx .lh{clip-path:__LH__;animation:soso-hf-pull 2.4s ease-in-out infinite}
#sosoHomeFx .rh{clip-path:__RH__;animation:soso-hf-pull 2.4s ease-in-out infinite .15s}
#sosoHomeFx svg{position:absolute;inset:0;width:100%;height:100%}
@keyframes soso-hf-breath{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6px)}}
@keyframes soso-hf-pull{0%,100%{transform:translateY(1.2px)}50%{transform:translateY(-2.2px)}}
#sosoHomeFx .spin{animation:soso-hf-spin 1.1s linear infinite}
#sosoHomeFx .spin.b{animation-duration:1.6s}
#sosoHomeFx .spin.c{animation-duration:.85s}
@keyframes soso-hf-spin{to{stroke-dashoffset:-760}}
#sosoHomeFx .sheen{animation:soso-hf-sheen 1.25s linear infinite}
@keyframes soso-hf-sheen{from{transform:translateX(-150px)}to{transform:translateX(150px)}}
#sosoHomeFx .rim{animation:soso-hf-rim 2.2s linear infinite}
@keyframes soso-hf-rim{to{stroke-dashoffset:-1100}}
#sosoHomeFx .fire{animation:soso-hf-fire 1.7s ease-in-out infinite;transform-origin:802px 1010px}
@keyframes soso-hf-fire{0%,100%{opacity:.35;transform:scale(1)}30%{opacity:.6;transform:scale(1.06)}60%{opacity:.4;transform:scale(.97)}80%{opacity:.65;transform:scale(1.04)}}
#sosoHomeFx .drop{animation:soso-hf-drop 3.6s ease-out infinite;opacity:0}
@keyframes soso-hf-drop{0%,62%{opacity:0;transform:translate(0,0)}66%{opacity:.9}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
#sosoHomeFx .dust{animation:soso-hf-dust 9s ease-in-out infinite}
@keyframes soso-hf-dust{0%{opacity:0;transform:translate(0,0)}20%{opacity:.8}80%{opacity:.6}100%{opacity:0;transform:translate(40px,-90px)}}
@media (prefers-reduced-motion:reduce){#sosoHomeFx *{animation:none!important}}
#sosoHomeFx.paused *{animation-play-state:paused!important}
</style>'''.replace('__HEAD__',pc(HEAD)).replace('__LH__',pc(LH)).replace('__RH__',pc(RH))
drops=''.join('<circle class="drop" cx="%d" cy="%d" r="%d" fill="#e9e1ee" style="--dx:%dpx;--dy:%dpx;animation-delay:%.1fs"/>'%(cx,cy,r,dx,dy,dl) for cx,cy,r,dx,dy,dl in [(395,1285,5,-60,-30,0),(628,1278,4,55,-40,1.2),(600,1300,5,70,10,2.3),(420,1300,4,-70,15,.6)])
dust=''.join('<circle class="dust" cx="%d" cy="%d" r="%.1f" fill="#fff8e0" style="animation-delay:%.1fs"/>'%(x,y,r,d) for x,y,r,d in [(90,820,3,0),(170,700,2.5,1.5),(260,900,3.2,3),(120,1000,2.4,4.5),(300,760,2,6),(210,1060,2.8,7.2)])
svg='''<svg viewBox="0 0 941 1672" preserveAspectRatio="none" aria-hidden="true">
<defs>
<mask id="sosoHfWheel"><rect width="941" height="1672" fill="black"/><ellipse cx="510" cy="1272" rx="122" ry="40" fill="white"/><path d="__POT__" fill="black"/></mask>
<clipPath id="sosoHfPot"><path d="__POT__"/></clipPath>
<linearGradient id="sosoHfSheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="sosoHfFire"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset=".6" stop-color="#ff9a3c" stop-opacity=".35"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
</defs>
<g mask="url(#sosoHfWheel)">
<ellipse class="spin" cx="510" cy="1272" rx="104" ry="34" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-dasharray="70 120" stroke-linecap="round"/>
<ellipse class="spin b" cx="510" cy="1272" rx="78" ry="25" fill="none" stroke="#6d5a8a" stroke-opacity=".35" stroke-width="4" stroke-dasharray="40 90" stroke-linecap="round"/>
<ellipse class="spin c" cx="510" cy="1272" rx="116" ry="38" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-dasharray="25 160" stroke-linecap="round"/>
</g>
<ellipse class="rim" cx="512" cy="1250" rx="178" ry="58" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="5" stroke-dasharray="60 1040" stroke-linecap="round"/>
<g clip-path="url(#sosoHfPot)"><rect class="sheen" x="480" y="1100" width="60" height="200" fill="url(#sosoHfSheen)"/><rect class="sheen" x="480" y="1100" width="28" height="200" fill="url(#sosoHfSheen)" style="animation-delay:-.6s;opacity:.6"/></g>
<ellipse class="fire" cx="802" cy="1005" rx="62" ry="52" fill="url(#sosoHfFire)"/>
__DROPS__
__DUST__
</svg>'''.replace('__POT__',potd).replace('__DROPS__',drops).replace('__DUST__',dust)
js=r'''<script id="soso-v17">
(function(){
function init(){var sc=document.querySelector('.scene');if(!sc){setTimeout(init,300);return;}if(document.getElementById('sosoHomeFx'))return;
  var bg=getComputedStyle(sc).backgroundImage;var fx=document.createElement('div');fx.id='sosoHomeFx';
  fx.innerHTML='<div class="lay head"></div><div class="lay lh"></div><div class="lay rh"></div>'+__SVG__;
  fx.querySelectorAll('.lay').forEach(function(l){l.style.backgroundImage=bg;});
  sc.appendChild(fx);
  setInterval(function(){var m=document.getElementById('makeMode'),busy=(m&&m.classList.contains('show'))||document.hidden;fx.classList.toggle('paused',!!busy);},500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>'''.replace('__SVG__',repr(svg.replace('\n','')))
extra=css+js
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
