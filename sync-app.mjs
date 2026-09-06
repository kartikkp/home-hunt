import {buildProfile,MEMBERS,REASONS} from './taste-engine.mjs';
const HOMES=window.homeHuntCatalog;
const API='https://kartikkp.synology.me/home-hunt-api';
const CACHE='home-hunt-sync-v1',TOKEN='home-hunt-connection',MEMBER_KEY='home-hunt-member';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'Unknown':'$'+Math.round(v).toLocaleString();
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
let saved=read(CACHE,{}),preferredMember=read(MEMBER_KEY,saved.member), member=MEMBERS.includes(preferredMember)?preferredMember:'Kartik';
let records=Array.isArray(saved.records)?saved.records:[],pending=Array.isArray(saved.pending)?saved.pending:[],token=read(TOKEN,'');
let filter='all',tasteView='household',syncing=false,lastSync=null,notice='',storageWarning=false,connectionInvalid=false;
let legacy=read('home-hunt-liked',[]);if(!Array.isArray(legacy))legacy=[];legacy=legacy.filter(id=>HOMES.some(h=>h.id===id));
let importedLegacy=!!saved.importedLegacy;
const openDetails=new Set();
const key=r=>r.member+':'+r.homeId;
function persist(){try{localStorage.setItem(CACHE,JSON.stringify({records,pending,importedLegacy}));return true;}catch{storageWarning=true;return false;}}
function effective(){const map=new Map(records.map(r=>[key(r),r]));for(const r of pending)map.set(key(r),{...map.get(key(r)),...r});return [...map.values()];}
function current(id){return effective().find(r=>r.homeId===id&&r.member===member)||{homeId:id,member,liked:false,reasons:[],note:'',version:0};}
function queue(update){const old=pending.find(r=>key(r)===key(update));const base=records.find(r=>key(r)===key(update));const change={...update,baseVersion:old?.baseVersion??base?.version??0,operationId:crypto.randomUUID()};pending=pending.filter(r=>key(r)!==key(change));pending.push(change);persist();}
function status(){
  $('#syncStatus').textContent=storageWarning?'Browser storage is unavailable. Keep this page open until changes sync.':connectionInvalid?'Connection code expired or incorrect. Reconnect this device.':!token?'This device is not connected yet.':syncing?'Syncing…':pending.length?pending.length+' change'+(pending.length===1?'':'s')+' waiting to sync':lastSync?'Saved to your shared list · '+lastSync.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Connecting…';
  $('#syncNotice').textContent=notice;
  $('#connectionForm').hidden=!!token&&!connectionInvalid;
  $('#pairDevice').hidden=!token||connectionInvalid;
  $('#importLegacy').hidden=importedLegacy||!legacy.length;
  $('#importLegacy').textContent='Import '+legacy.length+' earlier likes as '+member;
}
async function request(path,options={}){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  try{return await fetch(API+path,{...options,headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}
}
function merge(record){if(!record)return;records=records.filter(r=>key(r)!==key(record));records.push(record);}
async function sync(){
  if(!token||syncing||connectionInvalid)return;
  syncing=true;status();let changed=false;
  try{
    const response=await request('/state');
    if(response.status===401){connectionInvalid=true;throw Error('Use your private household code to reconnect.');}
    if(!response.ok)throw Error('Sync is unavailable. Changes are kept here and will retry.');
    const remote=await response.json();if(!Array.isArray(remote.records))throw Error('Unexpected sync response');
    changed=JSON.stringify(records)!==JSON.stringify(remote.records);records=remote.records;
    let sent=0;
    while(pending.length&&sent++<100){
      const operation={...pending[0]};
      const result=await request('/likes/'+operation.homeId,{method:'PUT',body:JSON.stringify(operation)});
      if(result.status===401){connectionInvalid=true;throw Error('Use your private household code to reconnect.');}
      if(result.status===409){const body=await result.json();merge(body.record);pending=pending.filter(r=>r.operationId!==operation.operationId);notice='A like changed on another device. The shared version was kept; check it before editing again.';persist();changed=true;continue;}
      if(!result.ok)throw Error('Changes are kept on this device and will retry when sync returns.');
      const body=await result.json();merge(body.record);
      // A newer edit made while this request was in flight must remain queued.
      pending=pending.filter(r=>r.operationId!==operation.operationId).map(r=>key(r)===key(operation)?{...r,baseVersion:body.record.version}:r);
      persist();changed=true;
    }
    lastSync=new Date();if(/unavailable|timed out|will retry/.test(notice))notice='';persist();
  }catch(e){notice=e.name==='AbortError'?'Connection timed out. Your changes will retry automatically.':e.message;}
  finally{syncing=false;status();if(changed&&!document.activeElement?.matches('textarea,input'))render();}
}
function pass(h,rs){const likes=rs.filter(r=>r.homeId===h.id&&r.liked);if(filter==='all')return true;if(filter==='newer')return h.year>=2000;if(filter==='schools')return h.school>=4;if(filter==='liked')return likes.length>0;if(filter==='both')return MEMBERS.every(m=>likes.some(r=>r.member===m));return h.category===filter;}
function card(h,rank,rs){
  const mine=rs.find(r=>r.homeId===h.id&&r.member===member),fans=rs.filter(r=>r.homeId===h.id&&r.liked).map(r=>r.member);
  return `<article class="home" id="${h.id}"><div class="rank">${rank}</div>${h.year>=2000?'<div class="newer">2000+</div>':''}<div class="top"><div><h3>${esc(h.name)}</h3><p>${esc(h.area)}</p></div><div class="score">${h.score}<span>/100</span></div></div><div class="price">${money(h.price)}<span>${h.sqft?h.sqft.toLocaleString()+' sf':'Size unknown'}</span></div><div class="facts"><div><b>${h.beds} / ${h.baths}</b><span>beds / baths</span></div><div><b>${h.year||'Verify'}</b><span>built</span></div><div><b>${h.hoa==null?'N/A':money(h.hoa)}</b><span>HOA / mo</span></div><div><b>${money(h.tax)}</b><span>tax / mo</span></div></div><div class="commute"><div><small>🚉 nearest rail</small><b>${esc(h.station)}</b><span>≈ ${h.station_mi.toFixed(2)} mi</span></div><div><small>🏙 city</small><b>${esc(h.city)}</b><span>≈ ${h.city_min} min rail</span></div></div><div class="quality">✨ ${esc(h.quality)}</div><div class="school">🎓 School fit ${h.school.toFixed(1)}/5</div><div class="fans">${fans.length?fans.map(m=>'<span>♥ '+m+'</span>').join(' '):'No shared likes yet'}</div><div class="actions"><button class="${mine?.liked?'liked':''}" data-like="${h.id}" aria-pressed="${!!mine?.liked}">${mine?.liked?'♥ Liked':'♡ Like'} as ${member}</button><a href="${esc(h.url)}" target="_blank" rel="noopener noreferrer">Open listing</a></div>${mine?.liked?`<details data-detail="${h.id}" ${openDetails.has(h.id)?'open':''}><summary>What do you like about it?</summary><div class="reasonGrid">${REASONS.map(r=>`<label><input type="checkbox" data-reason="${h.id}" value="${esc(r)}" ${mine.reasons?.includes(r)?'checked':''}>${esc(r)}</label>`).join('')}</div><label class="noteLabel" for="note-${h.id}">What caught your eye?</label><textarea id="note-${h.id}" data-note="${h.id}" maxlength="1000" placeholder="e.g. the bright living room, floor plan, or backyard">${esc(mine.note)}</textarea><small>Notes save as you type. They help future searches understand your style.</small></details>`:''}</article>`;
}
function render(){
  const rs=effective();let html='';
  for(const [cat,title]of [['Condo','Condos'],['Single-family','Single-family homes'],['Townhouse / attached','Townhouses / attached homes']]){
    const all=HOMES.filter(h=>h.category===cat),xs=all.filter(h=>pass(h,rs));
    if(xs.length)html+=`<section class="section"><h2>${title}</h2><p>${xs.length} of ${all.length} shown</p><div class="cards">${xs.map(h=>card(h,all.indexOf(h)+1,rs)).join('')}</div></section>`;
  }
  $('#content').innerHTML=html||'<div class="empty">No homes match this view yet. Like a few homes or choose Everything.</div>';
  $('#content').querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>d.open?openDetails.add(d.dataset.detail):openDetails.delete(d.dataset.detail)));
  $('#member').value=member;
  $('#filters').querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',b.dataset.f===filter));
  renderTaste(rs);status();
}
function renderTaste(rs){
  const p=buildProfile(HOMES,rs,tasteView),s=p.stats;
  $('#likedCount').textContent=p.count;
  $('#hint').textContent=p.count<2?'Like at least two homes to start finding patterns.':p.confidence+' · '+p.count+' liked homes'+(p.bothLiked.length?' · '+p.bothLiked.length+' liked by both of you':'');
  $('#traits').innerHTML=p.count?[['Type',s.category],['Typical price',money(s.price)],['Typical size',s.sqft?Math.round(s.sqft).toLocaleString()+' sf':'Unknown'],['Typical build year',s.year?Math.round(s.year):'Unknown'],['School fit',s.school?.toFixed(1)+'/5'],['Rail commute','~'+s.city+' min']].map(([k,v])=>`<div class="trait"><b>${esc(v)}</b><span>${k}</span></div>`).join(''):'';
  $('#threads').innerHTML=p.threads.length?'<h3>What your liked homes have in common</h3>'+p.threads.map(t=>`<div class="thread"><b>${esc(t.label)}</b><span>${t.count} of ${t.total} liked homes${t.source==='your feedback'?' · from your feedback':''}</span><small>${t.examples.map(h=>esc(h.name)).join(' · ')}</small></div>`).join(''):p.count?'<p>More likes will help distinguish a preference from a coincidence.</p>':'';
  $('#similar').innerHTML=p.recommendations.map(r=>`<div class="sim"><b>${esc(r.name)}</b><span>${esc(r.area)}</span><strong>${r.score}/100 similarity</strong><ul>${r.reasons.map(why=>'<li>'+esc(why)+'</li>').join('')}</ul><a href="#${r.id}">Jump to home</a></div>`).join('');
  $('#recommendationTitle').hidden=!p.recommendations.length;
}
$('#content').addEventListener('click',e=>{const b=e.target.closest('[data-like]');if(!b)return;const r=current(b.dataset.like);queue({...r,liked:!r.liked});notice='';render();sync();});
let noteTimer;
$('#content').addEventListener('input',e=>{
  const id=e.target.dataset.note;if(!id)return;
  queue({...current(id),note:e.target.value});openDetails.add(id);notice='';renderTaste(effective());status();
  clearTimeout(noteTimer);noteTimer=setTimeout(()=>sync(),500);
});
$('#content').addEventListener('change',e=>{
  const id=e.target.dataset.reason||e.target.dataset.note;if(!id)return;const r=current(id);openDetails.add(id);
  if(e.target.dataset.note)queue({...r,note:e.target.value});
  else {const reasons=new Set(r.reasons);e.target.checked?reasons.add(e.target.value):reasons.delete(e.target.value);queue({...r,reasons:[...reasons]});}
  notice='';renderTaste(effective());status();sync();
});
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;render();});
$('#member').addEventListener('change',e=>{member=e.target.value;try{localStorage.setItem(MEMBER_KEY,JSON.stringify(member));}catch{storageWarning=true;}render();});
$('#tasteView').addEventListener('change',e=>{tasteView=e.target.value;renderTaste(effective());});
$('#similar').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const id=a.getAttribute('href').slice(1);e.preventDefault();if(!document.getElementById(id)){filter='all';render();}history.replaceState(null,'','#'+id);document.getElementById(id)?.scrollIntoView({block:'center'});});
$('#syncNow').addEventListener('click',()=>{notice='';sync();});
$('#connectionForm').addEventListener('submit',async e=>{
  e.preventDefault();const entered=$('#connectionCode').value.trim();
  let candidate=entered;try{if(entered.startsWith('https://'))candidate=new URLSearchParams(new URL(entered).hash.slice(1)).get('join')||'';}catch{}
  if(!/^[A-Za-z0-9_-]{32,80}$/.test(candidate)){notice='Paste the household code or connection link from your setup file.';status();return;}
  const old=token;token=candidate;connectionInvalid=false;
  try{const r=await request('/state');if(!r.ok)throw Error('Connection failed. Check your code and try again.');try{localStorage.setItem(TOKEN,JSON.stringify(token));}catch{storageWarning=true;}notice='Device connected. Choose whose likes you are saving above.';$('#connectionCode').value='';await sync();}catch(err){token=old;notice=err.message;status();}
});
$('#pairDevice').addEventListener('click',async()=>{
  const link=location.origin+location.pathname+'#join='+token;
  $('#pairLink').value=link;$('#pairPanel').hidden=false;
  try{await navigator.clipboard.writeText(link);notice='Private connection link copied. Open it on your other device and choose Kartik or Minoli.';}catch{notice='Copy the private link below and open it on your other device.';}status();
});
$('#closePair').addEventListener('click',()=>{$('#pairPanel').hidden=true;$('#pairLink').value='';});
$('#importLegacy').addEventListener('click',()=>{
  let count=0;for(const id of legacy){const r=current(id);if(r.version>0||pending.some(p=>key(p)===key(r)))continue;queue({...r,liked:true});count++;}
  importedLegacy=true;persist();notice=count+' earlier likes imported as '+member+'.';render();sync();
});
$('#exportProfile').addEventListener('click',()=>{
  const rs=effective(),data={generatedAt:new Date().toISOString(),profile:buildProfile(HOMES,rs),records:rs,likedHomes:HOMES.filter(h=>rs.some(r=>r.homeId===h.id&&r.liked))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='home-hunt-taste-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const join=new URLSearchParams(location.hash.slice(1)).get('join');if(join){$('#connectionCode').value=join;history.replaceState(null,'',location.pathname+location.search);token='';notice='Choose whose likes this device saves, then connect.';}
render();sync();
setInterval(()=>{if(document.visibilityState==='visible')sync();},10000);
window.addEventListener('online',()=>sync());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
window.addEventListener('storage',e=>{if(e.key===CACHE&&!syncing){const next=read(CACHE,{});records=next.records||records;pending=next.pending||pending;importedLegacy=!!next.importedLegacy;if(!document.activeElement?.matches('textarea,input'))render();if(pending.length)sync();}});
