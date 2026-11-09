W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:60]
    s=s.replace(a,b)
# 중심잡기: 0.5초 꾹, 다음 방향까지 0.5초
rep('sosoHoldFinal.progress=Math.min(1,(t-sosoHoldFinal.start)/1000)','sosoHoldFinal.progress=Math.min(1,(t-sosoHoldFinal.start)/500)')
rep('window.__sosoRestUntil=performance.now()+1200+Math.random()*800','window.__sosoRestUntil=performance.now()+500')
rep("기운 쪽을 1초간 눌러 바로 세우기","기운 쪽을 0.5초간 눌러 바로 세우기")
rep("기운 쪽의 빛나는 원을 1초간 눌러요.","기운 쪽의 빛나는 원을 0.5초간 눌러요.")
rep("① 기운 쪽의 빛나는 원을 1초간 누르세요.","① 기운 쪽의 빛나는 원을 0.5초간 누르세요.")
rep('cs3.cutProg=resume.cutProg||0;cs3.cut=!!resume.cut;cs3.isTrim=!!resume.isTrim;','cs3.cutProg=resume.cut?0:(resume.cutProg||0);cs3.cut=false;cs3.isTrim=false;')
extra='''<style id="soso-v7-style">
/* 중심잡기 원: 작고 연하게 (누르는 영역은 그대로) */
#sosoFeedbackHud .soso-center-disc{inset:20px!important;border:1.5px solid #ffffffd0!important;background:radial-gradient(circle at 36% 30%,#fffef8 0 30%,#fff7da 65%,#fff1c4 100%)!important;box-shadow:0 0 4px 1px rgba(255,240,190,.45)!important;opacity:.72!important;animation:none!important}
#sosoFeedbackHud .soso-holding .soso-center-disc{opacity:.9!important;box-shadow:0 0 6px 2px rgba(255,236,170,.55)!important}
#sosoFeedbackHud .soso-hold-gauge{inset:17px!important}
#sosoFeedbackHud .soso-click-label{left:calc(100% - 14px)!important}
</style>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
