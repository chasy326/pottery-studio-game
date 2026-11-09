W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s=open(W+'소소도예_v3_굽깎기.html',encoding='utf-8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,a[:60]
    s=s.replace(a,b)
# 가운데 열기: 바닥만 내려가고 벽 높이는 그대로
rep('base.H=Math.max(CCFG.Hmin,base.H-d*.34)','base.H=base.H')
rep('a.H=Math.max(CCFG.Hmin,a.H-d*q*.34)','a.H=a.H')
# 도우미: 아래로만
rep('가운데를 꾹 누르고 아래로, 옆으로!','가운데를 꾹 누르고 아래로!')
rep('입구 안쪽을 누르고 아래·옆으로 쓸어 열어요.','입구 안쪽을 누르고 아래로 쓸어 열어요.')
rep('M0 0v30h34','M0 0v38')
rep('M28 22l8 8-8 8','M-8 32l8 8 8-8')
i=s.find('@keyframes soso-open-finger');j=s.find('}}',i)+2
s=s[:i]+'@keyframes soso-open-finger{0%{transform:translate(0,-16px) scale(1);opacity:0}12%{transform:translate(0,0) scale(1);opacity:1}22%{transform:translate(0,0) scale(.8)}80%{transform:translate(0,40px) scale(.8);opacity:1}100%{transform:translate(0,40px) scale(1);opacity:0}}'+s[j:]
extra='''<style id="soso-v6-style">
/* 길게 눌러도 복사/선택/미리보기 안 뜨게 */
html,body,body *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent}
input,textarea{-webkit-user-select:auto!important;user-select:auto!important}
#makeMode,#pottery3D,#makeMode canvas{touch-action:none!important}
img,svg{-webkit-user-drag:none}
/* 홈: 목표 박스·말풍선 삭제, 작업 시작 버튼 아래로 */
.goal,#tutorial,.tutorial{display:none!important}
.actioncard{bottom:calc(16px + env(safe-area-inset-bottom))!important}
</style>
<script id="soso-v6">
(function(){
function inGame(e){return !(e.target&&e.target.closest&&e.target.closest('input,textarea'));}
['contextmenu','selectstart','dragstart'].forEach(function(n){document.addEventListener(n,function(e){if(inGame(e))e.preventDefault();},{capture:true});});
document.addEventListener('touchstart',function(e){var t=e.target;if(t&&t.tagName==='CANVAS')e.preventDefault();},{capture:true,passive:false});
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
})();
</script>
'''
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok')
