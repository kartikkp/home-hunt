import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createApp} from '../server.mjs';
import {buildProfile} from '../../taste-engine.mjs';
const homes=JSON.parse(await readFile(new URL('../homes.json',import.meta.url),'utf8'));
const token='test-only-token-that-is-at-least-32-characters';
function fixture(){const data=new Map();return {all:async()=>[...data.values()],get:async(m,id)=>data.get(m+id)||null,put:async(r,base)=>{if((data.get(r.member+r.homeId)?.version||0)!==base)return false;data.set(r.member+r.homeId,r);return true;}};}
test('auth, isolated members, durable state interface, conflict protection, retries and validation',async t=>{
  const store=fixture(),server=createApp({store,homes,token});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,body,headers={})=>fetch(base+path,{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  assert.equal((await req('/state',null,{Authorization:'Bearer wrong'})).status,401);
  assert.equal((await req('/state',null,{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await req('/state',null,{Origin:'https://kartikkp.github.io'})).headers.get('Access-Control-Allow-Origin'),'https://kartikkp.github.io');
  const op={member:'Kartik',liked:true,reasons:['Schools'],note:'Liked the bright kitchen',baseVersion:0,operationId:randomUUID()};
  assert.equal((await req('/likes/c01',op)).status,200);
  assert.equal((await req('/likes/c01',op)).status,200,'Retry is idempotent');
  assert.equal((await req('/likes/c01',{...op,liked:false,operationId:randomUUID()})).status,409,'Stale devices cannot overwrite a newer like');
  assert.equal((await req('/likes/c01',{...op,member:'Minoli',operationId:randomUUID()})).status,200,'Separate members never overwrite each other');
  const state=await (await req('/state')).json();assert.equal(state.records.length,2);assert.equal(state.records[0].version,1);
  const profile=await (await req('/profile')).json();assert.equal(profile.profile.count,1);assert.equal(profile.profile.bothLiked.length,1);assert.equal(profile.profile.searchBrief.notes.length,2);
  assert.equal((await req('/likes/c01',{...op,baseVersion:1,liked:false,operationId:randomUUID()})).status,200);
  assert.equal((await req('/state')).status,200);
  assert.equal((await req('/likes/c99',op)).status,400);
  assert.equal((await req('/likes/c02',{...op,note:'x'.repeat(1001)})).status,400);
  assert.equal((await req('/likes/c02',{...op,reasons:['invented']})).status,400);
  assert.equal((await req('/likes/c02',{...op,baseVersion:-1})).status,400);
  const snapshot=await store.all();assert.equal(snapshot.find(r=>r.member==='Kartik').liked,false);assert.equal(snapshot.find(r=>r.member==='Minoli').liked,true);
});
test('catalog preservation, common threads, both likes, unknown values, explained recommendations',()=>{
  assert.equal(homes.filter(h=>h.legacy).length,45);assert.equal(new Set(homes.map(h=>h.id)).size,homes.length);
  const likes=[{member:'Kartik',homeId:'c01',liked:true,reasons:['Natural light'],note:'Large windows'},{member:'Minoli',homeId:'c01',liked:true,reasons:['Layout']},{member:'Kartik',homeId:'c05',liked:true,reasons:['Natural light']}];
  const p=buildProfile(homes,likes);assert.equal(p.count,2);assert.equal(p.bothLiked.length,1);assert.equal(p.recommendations.length,6);assert.ok(p.threads.some(t=>t.label==='Woodside, Queens'));assert.ok(p.threads.some(t=>t.label==='Natural light'&&t.source==='your feedback'));assert.equal(p.searchBrief.notes.length,1);
  assert.ok(p.recommendations.every(r=>!['c01','c05'].includes(r.id)&&Number.isFinite(r.score)&&r.reasons.length>0));
  assert.equal(buildProfile(homes,likes,'Minoli').count,1);
  assert.equal(buildProfile(homes,[]).recommendations.length,0);
  const unknown=homes.map(h=>({...h,sqft:null,year:null}));const u=buildProfile(unknown,likes);assert.equal(u.stats.sqft,null);assert.equal(u.stats.year,null);assert.ok(u.recommendations.every(r=>Number.isFinite(r.score)));
});
test('explicit reasons change recommendation weighting only for supported attributes',()=>{
  const base={category:'Condo',area:'A',price:800000,sqft:1000,year:2007,school:4,city_min:30,station_mi:.5,quality:'Updated'};
  const sample=[{...base,id:'a'},{...base,id:'b'},{...base,id:'near',city_min:15},{...base,id:'far',city_min:50}];
  const likes=['a','b'].map(homeId=>({homeId,member:'Kartik',liked:true,reasons:[]}));
  const plain=buildProfile(sample,likes),tagged=buildProfile(sample,likes.map(r=>({...r,reasons:['Commute']})));
  assert.notDeepEqual(plain.recommendations.map(r=>r.score),tagged.recommendations.map(r=>r.score));
});
