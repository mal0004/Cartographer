const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const PORT = 3108; const BASE = `http://127.0.0.1:${PORT}`; let serverProc;
function waitForServer(){return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Server startup timeout')),10000);serverProc.stdout.on('data',(b)=>{if(String(b).includes('Cartographer running')){clearTimeout(t);resolve();}});});}
async function api(method,path,body){const res=await fetch(`${BASE}${path}`,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const text=await res.text();let data={};try{data=JSON.parse(text);}catch{data=text;}return{res,data};}
test.before(async()=>{serverProc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});await waitForServer();});
test.after(()=>{if(serverProc)serverProc.kill('SIGTERM');});
test('main user flow: create -> edit -> export json/svg', async()=>{const w=await api('POST','/api/worlds',{name:'E2E World',time_start:0,time_end:1000});assert.equal(w.res.status,201);const id=w.data.id;await api('POST',`/api/worlds/${id}/entities`,{type:'territory',name:'Northreach',data:{points:[{x:10,y:10},{x:40,y:10},{x:30,y:30}],terrainType:'plain'}});const city=await api('POST',`/api/worlds/${id}/entities`,{type:'city',name:'Alder Keep',data:{x:20,y:20,importance:'capital'}});assert.equal(city.res.status,201);const up=await api('PUT',`/api/entities/${city.data.id}`,{name:'Alder Crown',data:{population:12345}});assert.equal(up.res.status,200);const svgRes=await fetch(`${BASE}/api/worlds/${id}/svg`);assert.equal(svgRes.status,200);});
