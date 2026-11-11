import base64, json, os, re, sys
P='/home/claude/v4/heukmaru-v4/public'; out=sys.argv[1]
r=lambda f: open(os.path.join(P,f),encoding='utf-8').read()
data={f[:-4]:'data:image/png;base64,'+base64.b64encode(open(f'{P}/chars/{f}','rb').read()).decode() for f in os.listdir(P+'/chars') if f.endswith('.png')}
html=r('index.html'); st=r('studio.js').replace("texLoader.load('/chars/' + name + '.png')","texLoader.load(CHAR_DATA[name])")
assert 'CHAR_DATA[name]' in st
# 3D 캐릭터를 쓰므로 예전 그림 캐릭터 이미지는 넣지 않아요 (용량 절약)
data={}
st=st.replace("texLoader.load(CHAR_DATA[name])","(CHAR_DATA[name] ? texLoader.load(CHAR_DATA[name]) : new THREE.Texture())")
html=re.sub(r'<link rel="stylesheet" href="/style.css[^"]*">',lambda m:'<style>'+r('style.css')+'</style>',html)
html=re.sub(r'<script src="/three.min.js"></script>',lambda m:'<script>'+r('three.min.js')+'</script>',html)
html=re.sub(r'<script src="/studio.js[^"]*"></script>',lambda m:'<script>const CHAR_DATA='+json.dumps(data)+';\n'+st+'</script>',html)
html=re.sub(r'<script src="/char3d.js[^"]*"></script>',lambda m:'<script>'+r('char3d.js')+'</script>',html)
html=re.sub(r'<script src="/craft.js[^"]*"></script>',lambda m:'<script>'+r('craft.js')+'</script>',html)
html=re.sub(r'<script src="/net-config.js[^"]*"></script>',lambda m:'<script>'+(open(os.environ['NETCFG']).read() if os.environ.get('NETCFG') else r('net-config.js'))+'</script>',html)
html=re.sub(r'<script src="/throw.js[^"]*"></script>',lambda m:'<script>'+r('throw.js')+'</script>',html)
assert 'src="/' not in html and 'href="/' not in html, re.findall(r'(?:src|href)="/[^"]*"',html)
open(out,'w',encoding='utf-8').write(html); print(out, len(html)//1024,'KB')
