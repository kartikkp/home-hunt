import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {hashPassword,passwordAuth} from '../password-auth.mjs';
import {createApp} from '../server.mjs';
const password='test-password-only',secret='test-existing-household-secret-123456789',passwordHash=await hashPassword(password);
test('password sessions validate, expire and cannot be forged; password change revokes sessions',async()=>{
  let time=Date.now();const a=passwordAuth({passwordHash,secret,now:()=>time});
  const r=await a.login(password,'test');assert.equal(r.status,200);assert.ok(a.valid(r.session));assert.ok(!r.session.includes(password));assert.notEqual(r.session,secret);
  assert.equal(a.valid(r.session+'x'),false);assert.equal(a.valid('bad'),false);
  assert.equal(passwordAuth({passwordHash:await hashPassword('changed'),secret}).valid(r.session),false);
  time+=181*86400000;assert.equal(a.valid(r.session),false);
});
test('failed password attempts are rate limited without locking out another IP',async()=>{
  const a=passwordAuth({passwordHash,secret});for(let i=0;i<10;i++)assert.equal((await a.login('wrong','one')).status,401);
  assert.equal((await a.login(password,'one')).status,429);assert.equal((await a.login(password,'two')).status,200);
});
test('login endpoint permits trusted origin, remembers session, preserves legacy access and protects feedback',async t=>{
  const store={all:async()=>[],get:async()=>null,put:async()=>true},server=createApp({store,homes:[],token:secret,passwordHash});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
  const login=(body,origin='https://kartikkp.github.io')=>fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  assert.equal((await fetch(base+'/state')).status,401);assert.equal((await login({password},'https://wrong.example')).status,403);
  assert.equal((await login({password:'wrong'})).status,401);assert.equal((await login({password:'x'.repeat(2000)})).status,413);
  const r=await login({password});assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://kartikkp.github.io');
  const body=await r.json();assert.ok(body.session);assert.ok(body.expiresAt);assert.equal(Object.hasOwn(body,'password'),false);
  for(const token of [body.session,secret])assert.equal((await fetch(base+'/state',{headers:{Authorization:'Bearer '+token}})).status,200);
});
