import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {dynamoStore} from './store.mjs';
import {buildProfile} from '../taste-engine.mjs';

export const MEMBERS=['Kartik','Minoli'];
export const REASONS=['Layout','Natural light','Outdoor space','Updated interiors','Architecture','Location','Space','Price','Schools','Commute','Newer build'];
const digest=s=>createHash('sha256').update(s).digest();
const publicRecord=r=>r;

export function createApp({store,homes,token,origins=['https://kartikkp.github.io']}) {
  if(!token||token.length<32)throw Error('A private household token of at least 32 characters is required.');
  const validIds=new Set(homes.map(h=>h.id)); const rates=new Map();
  function respond(res,status,body) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
  return http.createServer(async(req,res)=>{
    try {
      const origin=req.headers.origin;
      if(origin && !origins.includes(origin))return respond(res,403,{error:'Origin not allowed'});
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      res.setHeader('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
      if(req.method==='OPTIONS')return respond(res,204,{});
      const path=new URL(req.url,'http://localhost').pathname;
      if(path==='/health'&&req.method==='GET'){await store.all();return respond(res,200,{ok:true,version:1});}
      const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',').at(-1).trim();
      const now=Date.now(); let rate=rates.get(ip); if(!rate||rate.until<now){rate={count:0,until:now+60000};rates.set(ip,rate);}
      if(++rate.count>240)return respond(res,429,{error:'Please wait a minute and retry'});
      if(rates.size>10000)for(const [k,v]of rates)if(v.until<now)rates.delete(k);
      const supplied=(req.headers.authorization||'').replace(/^Bearer /,'');
      if(!timingSafeEqual(digest(supplied),digest(token)))return respond(res,401,{error:'Enter your household connection code'});
      if(path==='/state'&&req.method==='GET')return respond(res,200,{schemaVersion:1,members:MEMBERS,records:(await store.all()).map(publicRecord),serverTime:new Date().toISOString()});
      if(path==='/profile'&&req.method==='GET') {
        const records=await store.all();return respond(res,200,{schemaVersion:1,generatedAt:new Date().toISOString(),catalogDate:'2026-09-05',records,profile:buildProfile(homes,records),homes:homes.filter(h=>records.some(r=>r.homeId===h.id&&r.liked))});
      }
      const match=path.match(/^\/likes\/([a-z0-9]+)$/);
      if(match&&req.method==='PUT') {
        if(!req.headers['content-type']?.startsWith('application/json'))return respond(res,415,{error:'JSON required'});
        let raw='',length=0;for await(const part of req){length+=part.length;if(length>16384)return respond(res,413,{error:'Request too large'});raw+=part;}
        let body;try{body=JSON.parse(raw);}catch{return respond(res,400,{error:'Invalid JSON'});}
        const {member,liked,reasons=[],note='',baseVersion,operationId}=body||{};
        if(!validIds.has(match[1])||!MEMBERS.includes(member)||typeof liked!=='boolean'||!Array.isArray(reasons)||reasons.length>REASONS.length||reasons.some(r=>!REASONS.includes(r))||typeof note!=='string'||note.length>1000||!Number.isSafeInteger(baseVersion)||baseVersion<0||typeof operationId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(operationId))return respond(res,400,{error:'Invalid like update'});
        const existing=await store.get(member,match[1]);
        if(existing?.operationId===operationId)return respond(res,200,{record:existing});
        if((existing?.version||0)!==baseVersion)return respond(res,409,{error:'Changed on another device. Your latest shared version was kept.',record:existing});
        const record={member,homeId:match[1],liked,reasons:[...new Set(reasons)],note:note.trim(),version:baseVersion+1,operationId,updatedAt:new Date().toISOString()};
        if(!await store.put(record,baseVersion)) {
          const current=await store.get(member,match[1]);
          if(current?.operationId===operationId)return respond(res,200,{record:current});
          return respond(res,409,{error:'Changed on another device. Your latest shared version was kept.',record:current});
        }
        return respond(res,200,{record});
      }
      return respond(res,404,{error:'Not found'});
    }catch(error){console.error('Request failed:',error.name);if(!res.headersSent)respond(res,503,{error:'Sync is temporarily unavailable. Your changes remain on this device.'});else res.end();}
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const homes=JSON.parse(await readFile(new URL('./homes.json',import.meta.url),'utf8'));
  const store=dynamoStore();await store.init();
  const server=createApp({store,homes,token:process.env.HOUSEHOLD_TOKEN,origins:(process.env.ALLOWED_ORIGINS||'https://kartikkp.github.io').split(',')});
  server.requestTimeout=20000;server.headersTimeout=10000;
  server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Home Hunt sync ready'));
}
