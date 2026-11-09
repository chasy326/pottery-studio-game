import base64, json
W = '/tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work/'
s = open(W + 'sosodoyeo-v3-free.html', encoding='utf-8').read()

# keep the original handwritten font everywhere (embedded, CDN as fallback)
font = base64.b64encode(open(W + 'ryu-sub3.woff2', 'rb').read()).decode()
old = "url('https://cdn.jsdelivr.net/gh/projectnoonnu/2405-2@1.0/Ownglyph_ryurue-Rg.woff2')"
assert s.count(old) == 1
s = s.replace(old, "url(data:font/woff2;base64," + font + ") format('woff2'),url('https://cdn.jsdelivr.net/gh/projectnoonnu/2405-2@1.0/Ownglyph_ryurue-Rg.woff2')", 1)

# coloured icons that match their names (same soft 3D look as the rest of v3)
D = '<defs><linearGradient id="g{n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs>'
ICONS = {
 'book': '<svg viewBox="0 0 64 64">' + D.format(n='bk', a='#e0894f', b='#b05a2c') + '<path d="M12 12c0-3 2-5 5-5h31v44H17c-3 0-5 2-5 5z" fill="url(#gbk)"/><path d="M12 56c0-3 2-5 5-5h31v6H17c-3 0-5 0-5-1z" fill="#fff6e3"/><path d="M20 7v44" stroke="#8f4520" stroke-width="2"/><rect x="25" y="17" width="16" height="8" rx="2" fill="#fff1d2"/><path d="M16 9c3-1 6-1 8 0" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/></svg>',
 'mail': '<svg viewBox="0 0 64 64">' + D.format(n='ml', a='#fff7e6', b='#ead3a8') + '<rect x="6" y="15" width="52" height="36" rx="7" fill="url(#gml)" stroke="#b98a52" stroke-width="2.5"/><path d="M9 19l23 17 23-17" fill="none" stroke="#b98a52" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="36" r="6" fill="#e2553f"/><path d="M29.5 35.5c1-2 4-2 5 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
 'plant': '<svg viewBox="0 0 64 64">' + D.format(n='pt', a='#e48a55', b='#b8592d') + '<path d="M32 36V20" stroke="#4f9a4c" stroke-width="3.5" stroke-linecap="round"/><path d="M32 26c-2-9-9-13-17-11 1 9 8 13 17 11z" fill="#6cc066"/><path d="M32 22c2-9 9-13 17-11-1 9-8 13-17 11z" fill="#4fae57"/><path d="M18 36h28l-4 20H22z" fill="url(#gpt)"/><rect x="15" y="33" width="34" height="7" rx="3.5" fill="#cf7240"/><path d="M50 40l8-14 3 2-7 14z" fill="#f2c14e"/><path d="M48 44l2-4 4 2-2 3z" fill="#8a5a3a"/></svg>',
 'frame': '<svg viewBox="0 0 64 64">' + D.format(n='fr', a='#d9a35c', b='#a8713a') + '<rect x="6" y="6" width="52" height="52" rx="8" fill="url(#gfr)"/><rect x="13" y="13" width="38" height="38" rx="4" fill="#fdf3dc"/><path d="M27 19h10v4c4 3 7 7 7 12 0 7-5 11-12 11s-12-4-12-11c0-5 3-9 7-12z" fill="#7fa8d6"/><path d="M22 34h20" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M10 10c4-2 8-2 11-1" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/></svg>',
 'house': '<svg viewBox="0 0 64 64">' + D.format(n='hs', a='#fff4dc', b='#e6caa0') + '<path d="M10 30L32 11l22 19" fill="#d9663f"/><path d="M15 29v23c0 2 1 3 3 3h28c2 0 3-1 3-3V29L32 15z" fill="url(#ghs)" stroke="#b98a52" stroke-width="2"/><rect x="27" y="38" width="10" height="17" rx="2" fill="#9a6337"/><path d="M8 31L32 10l24 21" fill="none" stroke="#b64a2a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'palette': '<svg viewBox="0 0 64 64">' + D.format(n='pl', a='#f8e6c4', b='#d9b47d') + '<path d="M32 8C18 8 7 18 7 31s10 25 24 25c4 0 5-3 4-6s0-6 4-6h6c8 0 13-5 13-13C58 18 46 8 32 8z" fill="url(#gpl)" stroke="#b98a52" stroke-width="2"/><circle cx="19" cy="28" r="4.5" fill="#e2553f"/><circle cx="27" cy="18" r="4.5" fill="#f2c14e"/><circle cx="39" cy="18" r="4.5" fill="#5fbf6a"/><circle cx="47" cy="28" r="4.5" fill="#4c8fd6"/></svg>',
 'vase': '<svg viewBox="0 0 64 64">' + D.format(n='vs', a='#f0a36d', b='#c06b39') + '<path d="M24 7h16v5c-2 1-3 3-3 5 8 4 13 11 13 20 0 10-8 18-18 18s-18-8-18-18c0-9 5-16 13-20 0-2-1-4-3-5z" fill="url(#gvs)"/><path d="M17 33h30" stroke="#fff4dc" stroke-width="3.5" stroke-linecap="round"/><path d="M21 41h22" stroke="#fff4dc" stroke-width="2.5" stroke-linecap="round" stroke-opacity=".8"/><path d="M22 22c2-3 4-4 6-5" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/></svg>',
}
extra = """<style id="soso-icon-fix-style">
.soso-ico2{background:none!important;filter:drop-shadow(0 2px 1px rgba(80,50,25,.28))!important}
.soso-ico2::before,.soso-ico2::after{display:none!important;content:none!important}
.soso-ico2 svg{display:block;width:100%;height:100%;position:relative;z-index:2}
</style>
<script id="soso-icon-fix">
(function(){var ICONS=""" + json.dumps(ICONS, ensure_ascii=False) + """;
function put(btn,key){var sp=btn.querySelector('[class*="icon3d-"]');if(!sp||sp.dataset.sosoIco===key)return;sp.dataset.sosoIco=key;sp.classList.add('soso-ico2');sp.innerHTML=ICONS[key];}
function run(){document.querySelectorAll('.side .iconbtn').forEach(function(b){var t=(b.textContent||'').trim();if(t.indexOf('도감')>-1)put(b,'book');else if(t.indexOf('의뢰')>-1)put(b,'mail');else if(t.indexOf('꾸미기')>-1)put(b,'plant');else if(t.indexOf('전시')>-1)put(b,'frame');});
document.querySelectorAll('.nav button').forEach(function(b){var t=(b.textContent||'').trim();if(t==='공방')put(b,'house');else if(t==='꾸미기')put(b,'palette');else if(t==='작품')put(b,'vase');});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();setTimeout(run,500);setTimeout(run,1500);
})();
</script>
"""
i = s.rfind('</body>')
s = s[:i] + extra + s[i:]
open(W + '소소도예_v3_최종.html', 'w', encoding='utf-8').write(s)
print('ok', len(s))
