import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)), pub=path.join(root,'public'), port=Number(process.env.PORT||65400);
// 작품·채팅 저장 위치 (배포 시 DATA_DIR에 영구 디스크 경로를 지정)
const dataDir=process.env.DATA_DIR||path.join(root,'data'), dataFile=path.join(dataDir,'rooms.json');
const rooms=new Map(), clients=new Map();
const safe=(s,n=120)=>String(s??'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,n);
// 한글 방 코드 허용: 글자·숫자·_·- 만 남김
const roomKeyOf=s=>safe(s,24).toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}_-]/gu,'')||'open-studio';
function getRoom(key){if(!rooms.has(key))rooms.set(key,{users:new Map(),chat:[],works:[]});return rooms.get(key)}

// ---- 저장/불러오기 ----
try{const saved=JSON.parse(fs.readFileSync(dataFile,'utf8'));for(const [key,v] of Object.entries(saved)){const r=getRoom(key);r.chat=Array.isArray(v.chat)?v.chat.slice(-60):[];r.works=Array.isArray(v.works)?v.works.slice(0,80):[]}console.log(`저장된 방 ${rooms.size}개를 불러왔어요`)}catch(e){if(e.code!=='ENOENT')console.error('저장 파일을 읽지 못했어요:',e.message)}
let saveTimer=null;
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,800)}
function saveNow(){const out={};for(const [key,r] of rooms)if(r.chat.length||r.works.length)out[key]={chat:r.chat,works:r.works};try{fs.mkdirSync(dataDir,{recursive:true});const tmp=dataFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(out));fs.renameSync(tmp,dataFile)}catch(e){console.error('저장 실패:',e.message)}}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{saveNow();process.exit(0)});

const publicWork=w=>{const {likedBy,...rest}=w;return rest};
function state(r){return{people:[...r.users.values()].map(({id,name,color,x,y,zone,status,working,carrying,piece})=>({id,name,color,x,y,zone,status,working,carrying,piece})),chat:r.chat.slice(-40),works:r.works.slice(0,80).map(publicWork)}}
function send(r,type,obj){const msg=`event: ${type}\ndata: ${JSON.stringify(obj)}\n\n`;for(const u of r.users.values())try{u.res.write(msg)}catch{}}
function reply(res,code,data){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data))}
const hex=v=>/^#[0-9a-fA-F]{6}$/.test(String(v||''))?String(v):null;
const cleanProfile=p=>Array.isArray(p)?p.slice(0,30).map(v=>Math.max(.045,Math.min(.48,Number(v)||.12))):[];
function cleanPiece(d){if(!d||typeof d!=='object')return null;return{profile:cleanProfile(d.profile),height:Math.max(.4,Math.min(1.1,Number(d.height)||.55)),clay:safe(d.clay,12),glazeColor:hex(d.glazeColor)}}

const srv=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/events'){
   const roomKey=roomKeyOf(u.searchParams.get('room')),r=getRoom(roomKey),id=crypto.randomBytes(9).toString('hex');
   const uid=safe(u.searchParams.get('uid'),40)||id;
   const colors=['#bd795f','#628a79','#8b79a8','#ce9a56','#6c8ea8','#b26e78'];const user={id,uid,name:safe(u.searchParams.get('name')||'도예가',14),color:colors[Math.floor(Math.random()*colors.length)],x:50+Math.random()*8-4,y:73+Math.random()*8-4,zone:'studio',status:'공방에 들어왔어요',working:false,carrying:false,piece:null,res};
   res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform','connection':'keep-alive','x-accel-buffering':'no'});res.write('retry: 2000\n');r.users.set(id,user);clients.set(id,{roomKey,user});res.write(`event: welcome\ndata: ${JSON.stringify({id,room:roomKey,color:user.color})}\n\n`);send(r,'state',state(r));const beat=setInterval(()=>{try{res.write(': ping\n\n')}catch{}},18000);
   req.on('close',()=>{clearInterval(beat);r.users.delete(id);clients.delete(id);send(r,'state',state(r))});return;
 }
 if(u.pathname==='/api/action'&&req.method==='POST'){
   let raw='';req.on('data',c=>{raw+=c;if(raw.length>140000)req.destroy()});req.on('end',()=>{try{const d=JSON.parse(raw||'{}'),cl=clients.get(String(d.id||''));if(!cl)return reply(res,401,{error:'작업실 연결이 끊겼어요.'});const r=getRoom(cl.roomKey),p=cl.user;let changed=false;
     if(d.type==='move'){p.x=Math.max(6,Math.min(94,Number(d.x)||50));p.y=Math.max(43,Math.min(92,Number(d.y)||72));const validZones=['studio','glaze','kiln','gallery'];p.zone=validZones.includes(d.zone)?d.zone:'studio';p.status=safe(d.status||'공방을 둘러보는 중',32);p.working=!!d.working;p.carrying=!!d.carrying;if(!p.carrying)p.piece=null;else if(d.piece)p.piece=cleanPiece(d.piece)}
     else if(d.type==='chat'){const text=safe(d.text,100);if(text){r.chat.push({id:crypto.randomBytes(5).toString('hex'),name:p.name,text,at:Date.now()});r.chat=r.chat.slice(-60);changed=true}}
     else if(d.type==='exhibit'){const title=safe(d.title||'오늘의 그릇',24)||'오늘의 그릇',note=safe(d.note||'흙을 만지며 천천히 만들었어요.',80);const clay=safe(d.clay,12)||'stoneware';const profile=cleanProfile(d.profile);const height=Math.max(.4,Math.min(1.1,Number(d.height)||.55));const glaze=safe(d.glaze||'',20),stage=['wet','dry','bisque','glazed','fired'].includes(d.stage)?d.stage:'wet';const glazeColor=hex(d.glazeColor)||'#bc8e64';r.works.unshift({id:crypto.randomBytes(7).toString('hex'),name:p.name,uid:p.uid,title,note,clay,color:glazeColor,glaze,glazeColor,stage,profile,height,hearts:0,likedBy:[],notes:[],at:Date.now()});r.works=r.works.slice(0,80);changed=true}
     else if(d.type==='like'){const w=r.works.find(w=>w.id===d.workId);if(w){w.likedBy=w.likedBy||[];const i=w.likedBy.indexOf(p.uid);if(i>=0)w.likedBy.splice(i,1);else w.likedBy.push(p.uid);w.hearts=w.likedBy.length;changed=true}}
     else if(d.type==='note'){const w=r.works.find(w=>w.id===d.workId),text=safe(d.text,120);if(w&&text){w.notes.unshift({id:crypto.randomBytes(5).toString('hex'),name:p.name,text,at:Date.now()});w.notes=w.notes.slice(0,30);changed=true}}
     else return reply(res,400,{error:'요청을 확인할 수 없어요.'});
     if(changed)scheduleSave();send(r,'state',state(r));reply(res,200,{ok:true});
   }catch{return reply(res,400,{error:'요청을 읽지 못했어요.'})}});return;
 }
 if(u.pathname==='/api/mine'){const uid=safe(u.searchParams.get('uid'),40);const out=[];if(uid)for(const [key,r] of rooms)for(const w of r.works)if(w.uid===uid)out.push({...publicWork(w),room:key});out.sort((a,b)=>b.at-a.at);return reply(res,200,{works:out.slice(0,60)})}
 let target;try{target=path.resolve(pub,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname))}catch{return reply(res,400,{error:'bad path'})}if(!target.startsWith(pub+path.sep))return reply(res,403,{error:'forbidden'});
 fs.readFile(target,(err,buf)=>{if(err)return reply(res,404,{error:'not found'});const ext=path.extname(target);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':'no-store'});res.end(buf)});
});
srv.listen(port,'0.0.0.0',()=>console.log(`흙마루 온라인 공방: http://127.0.0.1:${srv.address().port}`));
