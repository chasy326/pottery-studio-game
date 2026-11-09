W = '/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s = open(W + '소소도예_v3_최종2.html', encoding='utf-8').read()

def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

# 3. lean side: keep the same side until it is pressed, rest 1.2-2s after each success
rep("else{window.__sosoLeanSide=Math.random()<.5?'left':'right';window.__sosoCenterSide=window.__sosoLeanSide;window.__sosoNextLeanAt=performance.now()+300;placeHUD();}",
    "else{window.__sosoLeanSide=null;window.__sosoCenterSide=null;window.__sosoRestUntil=performance.now()+1200+Math.random()*800;placeHUD();}")
rep("if(!window.__sosoLeanSide){window.__sosoLeanSide=Math.random()<.5?'left':'right';window.__sosoNextLeanAt=t+500+Math.random()*650;}if(!sosoHoldFinal&&t>=window.__sosoNextLeanAt){window.__sosoLeanSide=Math.random()<.5?'left':'right';window.__sosoNextLeanAt=t+500+Math.random()*850;}",
    "if(!window.__sosoLeanSide&&t>=(window.__sosoRestUntil||0)){window.__sosoLeanSide=Math.random()<.5?'left':'right';}")
rep("var amp=.23*(1-Math.min(.58,centerScore*.105))", "var amp=(window.__sosoLeanSide?1:.12)*.23*(1-Math.min(.58,centerScore*.105))")

# 4. opening guide: re-show every time 가운데 열기 is chosen, hide the moment the user presses
rep("var _move=craftMoveSub3;craftMoveSub3=function(dx,dy,e){if(tool()==='open'&&(dx||dy))openTouched=true;return _move.apply(this,arguments);};",
    "var _move=craftMoveSub3;craftMoveSub3=function(dx,dy,e){if(tool()==='open'&&(dx||dy))openTouched=true;return _move.apply(this,arguments);};"
    "var _sel=craftSelect3;craftSelect3=function(n){var r=_sel.apply(this,arguments);if(n===2&&window.cs3&&cs3.step===2)openTouched=false;return r;};"
    "document.addEventListener('pointerdown',function(e){if(!window.cs3||cs3.step!==2||cs3.freeMode)return;var c=renderer3&&renderer3.domElement;if(c&&e.target===c&&hitPot(e))openTouched=true;},true);")
rep("var on=mode.classList.contains('show')&&cs3.step===2&&!cs3.freeMode&&!cs3.isTrim&&!cs3.cut&&!openTouched&&!dragging&&(cs3.view||'front')==='front';if(cs3.step!==lastStep){if(cs3.step===2)openTouched=false;lastStep=cs3.step;}",
    "if(cs3.step!==lastStep){if(cs3.step===2)openTouched=false;lastStep=cs3.step;}var on=mode.classList.contains('show')&&cs3.step===2&&!cs3.freeMode&&!cs3.isTrim&&!cs3.cut&&!openTouched&&!dragging&&(cs3.view||'front')==='front';")

extra = """<style id="soso-v5-style">
/* 1. smaller, softer centering circle */
.soso-center-disc{inset:12px!important;border:2px solid #fff!important;background:radial-gradient(circle at 34% 28%,#fffef6 0 22%,#fff4c4 50%,#ffe9a0 80%,#fff8e0 100%)!important;box-shadow:0 0 5px 2px rgba(255,236,160,.55)!important;opacity:.9}
.soso-holding .soso-center-disc{box-shadow:0 0 8px 4px rgba(255,230,140,.6)!important}
.soso-hold-gauge{inset:9px!important}
/* 2. small click! */
.soso-click-label{font-size:11px!important;font-weight:400!important;left:calc(100% - 8px)!important;opacity:.95}
/* 5. 굽 깎기 button readable */
.finish-actions .next-foot,.next-foot.soso-candy,button.next-foot{background:linear-gradient(180deg,#f29a4a,#c9661f)!important;color:#fff!important;text-shadow:-1.5px 0 #6b3510,1.5px 0 #6b3510,0 -1.5px #6b3510,0 1.5px #6b3510,0 2px 2px rgba(0,0,0,.25)!important;border-color:#8a4416!important}
/* 6. no restart button */
#sosoUndoRedo .soso-restart{display:none!important}
</style>
<script id="soso-v5">
(function(){function fix(){document.querySelectorAll('.soso-click-label').forEach(function(l){if(l.style.fontSize!=='11px')l.style.setProperty('font-size','11px','important');});requestAnimationFrame(fix);}requestAnimationFrame(fix);})();
</script>
"""
i = s.rfind('</body>')
s = s[:i] + extra + s[i:]
open(W + '소소도예_v3_최종3.html', 'w', encoding='utf-8').write(s)
print('ok')
