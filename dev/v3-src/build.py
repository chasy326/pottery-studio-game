W='/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/'
s=open(W+'work/소소도예_v3_최종3.html',encoding='utf-8').read()
js=open(W+'trim/trim.js',encoding='utf-8').read().replace('__ICONS__',open(W+'trim/icons.json').read())
css=open(W+'trim/trim.css',encoding='utf-8').read()
extra='<style id="soso-trim-style">\n'+css+'</style>\n<script id="soso-trim">\n'+js+'</script>\n'
i=s.rfind('</body>');s=s[:i]+extra+s[i:]
open(W+'work/소소도예_v3_굽깎기.html','w',encoding='utf-8').write(s);print('ok',len(s))
