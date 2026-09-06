import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {createApp} from '../server.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const homes=JSON.parse(await readFile(new URL('../homes.json',import.meta.url),'utf8'));
const data=new Map();const store={all:async()=>[...data.values()],get:async(m,id)=>data.get(m+id)||null,put:async(r,base)=>{if((data.get(r.member+r.homeId)?.version||0)!==base)return false;data.set(r.member+r.homeId,r);return true;}};
const port=Number(process.env.PREVIEW_PORT||8765),origin='http://127.0.0.1:'+port;
const api=createApp({store,homes,token:'test-only-home-hunt-connection-code-12345678',origins:[origin]});
http.createServer(async(req,res)=>{
  if(req.url.startsWith('/home-hunt-api/')){req.url=req.url.replace('/home-hunt-api','');return api.emit('request',req,res);}
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root)||pathname.includes('server/')){res.writeHead(404);return res.end();}
  try{let content=await readFile(path);if(path.endsWith('/sync-app.mjs'))content=content.toString().replace('https://kartikkp.synology.me/home-hunt-api',origin+'/home-hunt-api');res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log('Disposable preview ready on '+origin));
