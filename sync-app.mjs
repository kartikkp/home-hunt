import {buildProfile,MEMBERS,REASONS,DISLIKE_REASONS} from './taste-engine.mjs';
import {selectHomes,isActive,localCrime} from './catalog-view.mjs';
import {photoMarkup,photoURLs,extraDetailsMarkup,feedbackMarkup} from './card-details.mjs';
import {normalizeFinancing,paymentMarkup} from './payment-estimate.mjs';
const HOMES=window.homeHuntCatalog;
const API='https://kartikkp.synology.me/home-hunt-api';
const CACHE='home-hunt-sync-v1',TOKEN='home-hunt-connection',MEMBER_KEY='home-hunt-member';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'Unknown':'$'+Math.round(v).toLocaleString();
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const FINANCING_KEY='home-hunt-financing-v1';
let financing=normalizeFinancing(read(FINANCING_KEY,null));
let saved=read(CACHE,{}),preferredMember=read(MEMBER_KEY,saved.member), member=MEMBERS.includes(preferredMember)?preferredMember:'Kartik';
let records=Array.isArray(saved.records)?saved.records:[],pending=Array.isArray(saved.pending)?saved.pending:[],token=read(TOKEN,'');
let filter='all',tasteView='household',syncing=false,lastSync=null,notice='',storageWarning=false,connectionInvalid=false;
let visibleLimit=60,query='',availability='all',sort='rail',bike=false,crime=false;
let legacy=read('home-hunt-liked',[]);if(!Array.isArray(legacy))legacy=[];legacy=legacy.filter(id=>HOMES.some(h=>h.id===id));
let importedLegacy=!!saved.importedLegacy;
const openDetails=new Set();
const photoIndexes=new Map();
const key=r=>r.member+':'+r.homeId;
function persist(){try{localStorage.setItem(CACHE,JSON.stringify({records,pending,importedLegacy}));return true;}catch{storageWarning=true;return false;}}
function effective(){const map=new Map(records.map(r=>[key(r),r]));for(const r of pending)map.set(key(r),{...map.get(key(r)),...r});return [...map.values()];}
function current(id){return effective().find(r=>r.homeId===id&&r.member===member)||{homeId:id,member,liked:false,disliked:false,reasons:[],dislikeReasons:[],note:'',version:0};}
function queue(update){const old=pending.find(r=>key(r)===key(update));const base=records.find(r=>key(r)===key(update));const change={...update,baseVersion:old?.baseVersion??base?.version??0,operationId:crypto.randomUUID()};pending=pending.filter(r=>key(r)!==key(change));pending.push(change);persist();}
function status(){
  $('#syncStatus').textContent=storageWarning?'Browser storage is unavailable. Keep this page open until changes sync.':connectionInvalid?'Please sign in again. Your unsynced changes are kept here.':!token?'Browse freely. Sign in to save shared likes and dislikes.':syncing?'Syncing…':pending.length?pending.length+' change'+(pending.length===1?'':'s')+' waiting to sync':lastSync?'Saved to your shared list · '+lastSync.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Connecting…';
  $('#syncNotice').textContent=notice;
  $('#loginForm').hidden=!!token&&!connectionInvalid;
  $('#forgetDevice').hidden=!token;
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
    if(response.status===401){connectionInvalid=true;throw Error('Sign in with your shared password to reconnect.');}
    if(!response.ok)throw Error('Sync is unavailable. Changes are kept here and will retry.');
    const remote=await response.json();if(!Array.isArray(remote.records))throw Error('Unexpected sync response');
    changed=JSON.stringify(records)!==JSON.stringify(remote.records);records=remote.records;
    let sent=0;
    while(pending.length&&sent++<100){
      const operation={...pending[0]};
      const result=await request('/likes/'+operation.homeId,{method:'PUT',body:JSON.stringify(operation)});
      if(result.status===401){connectionInvalid=true;throw Error('Sign in with your shared password to reconnect.');}
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
const selected=rs=>selectHomes(HOMES,rs,{filter,query,availability,sort,bike,crime,financing});
function indicators(h){
  const c=h.crime,b=h.bike;
  const crimeText=localCrime(h)?`${c.total} geocoded major-felony reports within 500 m` : c?.scope==='Nassau County'?`${c.total.toLocaleString()} index crimes · county-wide`:'Local crime data not verified';
  const crimeDetail=localCrime(h)?`${c.violent} violent / ${c.property} property · ${c.period}. Not a per-capita risk or safety score.`:c?.scope==='Nassau County'?`${c.period} Nassau County context only; not this neighborhood. Not comparable to NYC radius counts.`:'No verified address-level indicator; absence of data does not imply safety.';
  const bikeText=Number.isFinite(b?.protectedMiles)?`Protected bike infrastructure ≈ ${b.protectedMiles.toFixed(2)} mi`:Number.isFinite(b?.mappedPathMiles)?`Mapped cycleway / path ≈ ${b.mappedPathMiles.toFixed(2)} mi (OSM)`:'Bikeability not yet verified';
  const bikeDetail=Number.isFinite(b?.protectedMiles)?`${b.protectedStreet} · straight-line distance, not a riding route. Network snapshot ${b.asOf}.`:Number.isFinite(b?.mappedPathMiles)?`${b.mappedPath} · © OpenStreetMap contributors, ${b.asOf}. Straight-line proximity; surface, access and crossings need checking.`:'Regional data is not comparable to NYC’s protected-lane network. Check the route, crossings and traffic in person.';
  return `<div class="indicators"><div><b>Crime &amp; safety context</b><span>${esc(crimeText)}</span><small>${esc(crimeDetail)}</small><a href="${esc(c?.source||'https://www.nyc.gov/site/nypd/stats/crime-statistics/compstat.page')}" target="_blank" rel="noopener noreferrer">Crime source</a></div><div><b>Bikeability indicator</b><span>${esc(bikeText)}</span><small>${esc(bikeDetail)}</small><a href="${esc(b?.source||'https://www.dot.ny.gov/bicycle')}" target="_blank" rel="noopener noreferrer">Bike source / map</a></div></div>`;
}
function listingFacts(h){
  const district=h.schools?.ElementarySchoolDistrict||h.schools?.HighSchoolDistrict;
  return `<div class="listingStatus ${isActive(h)?'fresh':'unverified'}">${esc(isActive(h)?'Active · checked '+h.refreshedAt:h.status||'Original · not reverified')}${h.legacy?' · original home':''}</div>
  <div class="price">${money(h.price)}<span>${h.sqft?h.sqft.toLocaleString()+' sf':'Size unknown'}</span></div>
  <div class="facts"><div><b>${h.beds??'?' } / ${h.baths??'?'}</b><span>beds / baths</span></div><div><b>${h.year||'Unknown'}</b><span>built</span></div><div><b>${money(h.hoa)}</b><span>HOA / mo</span></div><div><b>${money(h.tax)}</b><span>tax / mo${h.taxYear?' · '+h.taxYear:''}</span></div></div>
  ${paymentMarkup(h,financing)}
  <div class="commute"><div><small>Nearest rail</small><b>${esc(h.station||'Not verified')}</b><span>${Number.isFinite(h.station_mi)?'≈ '+h.station_mi.toFixed(2)+' mi':'Distance unknown'} · ${h.stationMethod==='straight-line'?'straight-line':'prior estimate'}</span></div><div><small>City commute</small><b>${esc(h.city||'Midtown')}</b><span>${Number.isFinite(h.city_min)?'≈ '+h.city_min+' min rail · prior estimate':'Rail time not verified'}</span></div></div>
  <div class="quality">Condition: ${esc(h.quality||'Not verified')}</div><div class="school">${district?'School district: '+esc(district):'School assignment: verify'}${Number.isFinite(h.school)?'<br><small>Prior school fit '+h.school.toFixed(1)+'/5 · unverified estimate</small>':''}</div>
  ${indicators(h)}<details class="sourceDetails"><summary>Listing sources &amp; checks still needed</summary><p>${esc(h.source?.name||'Original imported snapshot')} ${h.source?.listingId?'· MLS '+esc(h.source.listingId):''}${h.source?.broker?'<br>Listing brokerage: '+esc(h.source.broker):''}</p><ul>${(h.reviewNotes||['Original snapshot; price, availability, type, costs, schools and commute need verification.']).map(n=>'<li>'+esc(n)+'</li>').join('')}</ul>${Object.keys(h.schools||{}).length?'<p>'+Object.entries(h.schools).filter(([k])=>!k.endsWith('District')).map(([k,v])=>esc(k.replace(/([A-Z])/g,' $1').trim())+': '+esc(v)).join('<br>')+'</p>':''}${h.stationSource?'<a href="'+esc(h.stationSource)+'" target="_blank" rel="noopener noreferrer">MTA station source</a>':''}</details>`;
}
function card(h,rank,rs){
  const mine=rs.find(r=>r.homeId===h.id&&r.member===member),fans=rs.filter(r=>r.homeId===h.id&&r.liked).map(r=>r.member);
  return `<article class="home" id="${h.id}"><div class="rank">${rank}</div>${h.year>=2000?'<div class="newer">2000+</div>':''}<div class="top"><div><h3>${esc(h.name)}</h3><p>${esc(h.area)}</p></div>${Number.isFinite(h.score)?`<div class="score">${h.score}<span>prior fit</span></div>`:''}</div>${photoMarkup(h,photoIndexes.get(h.id)||0)}${listingFacts(h)}${extraDetailsMarkup(h)}<div class="fans">${fans.length?fans.map(m=>'<span>♥ '+m+'</span>').join(' '):'No shared likes yet'} ${rs.filter(r=>r.homeId===h.id&&r.disliked&&!r.liked).map(r=>'<span class="negativeFan">✕ '+esc(r.member)+'</span>').join(' ')}</div><div class="actions"><button class="${mine?.liked?'liked':''}" data-like="${h.id}" aria-pressed="${!!mine?.liked}">${mine?.liked?'♥ Liked':'♡ Like'} as ${member}</button><button class="${mine?.disliked?'disliked':''}" data-dislike="${h.id}" aria-pressed="${!!mine?.disliked}">${mine?.disliked?'✕ Disliked':'✕ Dislike'} as ${member}</button><a href="${esc(h.url)}" target="_blank" rel="noopener noreferrer">Open listing</a></div>${feedbackMarkup(h,mine,member,openDetails.has(h.id))}</article>`;
}
function render(){
  const rs=effective(),matches=selected(rs),shown=matches.slice(0,visibleLimit);let html='';
  for(const [cat,title]of [['Condo','Condos'],['Single-family','Single-family homes'],['Townhouse / attached','Townhouses / attached homes']]){
    const all=matches.filter(h=>h.category===cat),xs=shown.filter(h=>h.category===cat);
    if(xs.length)html+=`<section class="section"><h2>${title}</h2><p>${xs.length} of ${all.length} matching homes shown</p><div class="cards">${xs.map(h=>card(h,all.indexOf(h)+1,rs)).join('')}</div></section>`;
  }
  $('#content').innerHTML=html||'<div class="empty">No homes match this view yet. Like a few homes or choose Everything.</div>';
  $('#content').querySelectorAll('details[data-detail]').forEach(d=>d.addEventListener('toggle',()=>d.open?openDetails.add(d.dataset.detail):openDetails.delete(d.dataset.detail)));
  $('#catalogSummary').textContent=`Showing ${shown.length} of ${matches.length} matching homes · ${HOMES.filter(isActive).length} refreshed active candidates · ${HOMES.length} total retained.`+(filter==='schools'?' Best schools uses the original, unverified 4/5+ fit estimates; unrated new homes are not judged worse.':'');
  $('#showMore').hidden=shown.length>=matches.length;$('#showMore').textContent='Show next '+Math.min(60,matches.length-shown.length)+' homes';
  $('#member').value=member;
  $('#filters').querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',b.dataset.f===filter));
  renderTaste(rs);status();
}
function renderTaste(rs){
  const p=buildProfile(HOMES,rs,tasteView),s=p.stats;
  $('#likedCount').textContent=p.count;
  $('#dislikedCount').textContent=p.dislikedCount+' disliked';
  $('#avoidThreads').innerHTML=p.avoidThreads.length?'<h3>What to avoid · your feedback</h3>'+p.avoidThreads.slice(0,8).map(t=>'<div class="thread avoidThread"><b>'+esc(t.label)+'</b><span>'+t.count+' rejected home'+(t.count===1?'':'s')+'</span><small>'+t.examples.map(h=>esc(h.name)).join(' · ')+'</small></div>').join(''):p.dislikedCount?'<p>Add reasons to your dislikes so future searches know what to avoid.</p>':'';
  $('#hint').textContent=p.count<2?'Like at least two homes to start finding patterns.':p.confidence+' · '+p.count+' liked homes'+(p.bothLiked.length?' · '+p.bothLiked.length+' liked by both of you':'');
  $('#traits').innerHTML=p.count?[['Type',s.category],['Typical price',money(s.price)],['Typical size',s.sqft?Math.round(s.sqft).toLocaleString()+' sf':'Unknown'],['Typical build year',s.year?Math.round(s.year):'Unknown'],['Prior school fit',Number.isFinite(s.school)?s.school.toFixed(1)+'/5':'Unknown'],['Rail commute',Number.isFinite(s.city)?'~'+s.city+' min':'Unknown']].map(([k,v])=>`<div class="trait"><b>${esc(v)}</b><span>${k}</span></div>`).join(''):'';
  $('#threads').innerHTML=p.threads.length?'<h3>What your liked homes have in common</h3>'+p.threads.map(t=>`<div class="thread"><b>${esc(t.label)}</b><span>${t.count} of ${t.total} liked homes${t.source==='your feedback'?' · from your feedback':''}</span><small>${t.examples.map(h=>esc(h.name)).join(' · ')}</small></div>`).join(''):p.count?'<p>More likes will help distinguish a preference from a coincidence.</p>':'';
  $('#similar').innerHTML=p.recommendations.map(r=>`<div class="sim"><b>${esc(r.name)}</b><span>${esc(r.area)}</span><strong>${r.score}/100 similarity</strong><ul>${r.reasons.map(why=>'<li>'+esc(why)+'</li>').join('')}</ul>${r.cautions.length?'<p class="recommendationCaution">'+r.cautions.map(esc).join('; ')+'. Score reduced based on your feedback.</p>':''}<a href="#${r.id}">Jump to home</a></div>`).join('');
  $('#recommendationTitle').hidden=!p.recommendations.length;
}
$('#content').addEventListener('click',e=>{
  const photo=e.target.closest('[data-photo]');if(photo){const h=HOMES.find(h=>h.id===photo.dataset.photo),xs=photoURLs(h);photoIndexes.set(h.id,((photoIndexes.get(h.id)||0)+Number(photo.dataset.step)+xs.length)%xs.length);const figure=photo.closest('figure');figure.outerHTML=photoMarkup(h,photoIndexes.get(h.id));return;}
  const remove=e.target.closest('[data-remove-dislike]');if(remove){const r=current(remove.dataset.removeDislike);queue({...r,dislikeReasons:(r.dislikeReasons||[]).filter(x=>x!==remove.dataset.reasonValue)});render();sync();return;}
  const b=e.target.closest('[data-like],[data-dislike]');if(!b)return;
  if(!token||connectionInvalid){notice='Sign in once, then choose Kartik or Minoli to save your feedback.';status();$('#loginPassword').focus();return;}
  const id=b.dataset.like||b.dataset.dislike,r=current(id);
  if(b.dataset.like)queue({...r,liked:!r.liked,disliked:false});
  else {queue({...r,liked:false,disliked:!r.disliked});openDetails.add(id);}
  notice='';render();sync();
});
$('#content').addEventListener('error',e=>{if(e.target.matches('.homePhotos img')){e.target.hidden=true;e.target.closest('figure').querySelector('.photoFailure').hidden=false;}},true);
let noteTimer;
$('#content').addEventListener('input',e=>{
  const id=e.target.dataset.note;if(!id)return;
  queue({...current(id),note:e.target.value});openDetails.add(id);notice='';renderTaste(effective());status();
  clearTimeout(noteTimer);noteTimer=setTimeout(()=>sync(),500);
});
$('#content').addEventListener('change',e=>{
  const id=e.target.dataset.reason||e.target.dataset.note||e.target.dataset.dislikeReason;if(!id)return;const r=current(id);openDetails.add(id);
  if(e.target.dataset.dislikeReason){if(!e.target.value)return;queue({...r,dislikeReasons:[...new Set([...(r.dislikeReasons||[]),e.target.value])]});render();sync();return;}
  if(e.target.dataset.note)queue({...r,note:e.target.value});
  else {const reasons=new Set(r.reasons);e.target.checked?reasons.add(e.target.value):reasons.delete(e.target.value);queue({...r,reasons:[...reasons]});}
  notice='';renderTaste(effective());status();sync();
});
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;visibleLimit=60;render();});
$('#homeSearch').addEventListener('input',e=>{query=e.target.value;visibleLimit=60;render();});
$('#availability').addEventListener('change',e=>{availability=e.target.value;visibleLimit=60;render();});
$('#sortHomes').addEventListener('change',e=>{sort=e.target.value;visibleLimit=60;render();});
function showFinancing(){for(const [id,key] of [['downPayment','downPercent'],['mortgageRate','ratePercent'],['loanYears','years']])$('#'+id).value=financing[key];}
showFinancing();
$('#financingForm').addEventListener('submit',e=>{
  e.preventDefault();if(!e.currentTarget.reportValidity())return;
  financing=normalizeFinancing({downPercent:$('#downPayment').valueAsNumber,ratePercent:$('#mortgageRate').valueAsNumber,years:$('#loanYears').valueAsNumber});
  try{localStorage.setItem(FINANCING_KEY,JSON.stringify(financing));$('#financingStatus').textContent='Updated every card. Assumptions saved on this device.';}catch{$('#financingStatus').textContent='Updated every card. Browser storage is unavailable; assumptions will reset on reload.';}
  render();
});
$('#latestSearch').addEventListener('click',()=>{availability='new-search';filter='all';query='';bike=false;crime=false;visibleLimit=60;$('#availability').value=availability;$('#homeSearch').value='';$('#bikeNearby').checked=false;$('#crimeData').checked=false;render();$('#content').scrollIntoView({block:'start'});});
$('#bikeNearby').addEventListener('change',e=>{bike=e.target.checked;visibleLimit=60;render();});
$('#crimeData').addEventListener('change',e=>{crime=e.target.checked;visibleLimit=60;render();});
$('#showMore').addEventListener('click',()=>{visibleLimit+=60;render();});
$('#member').addEventListener('change',e=>{member=e.target.value;try{localStorage.setItem(MEMBER_KEY,JSON.stringify(member));}catch{storageWarning=true;}render();});
$('#tasteView').addEventListener('change',e=>{tasteView=e.target.value;renderTaste(effective());});
$('#similar').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const id=a.getAttribute('href').slice(1);e.preventDefault();if(!document.getElementById(id)){filter='all';query='';availability='all';bike=false;crime=false;$('#homeSearch').value='';$('#availability').value='all';$('#bikeNearby').checked=false;$('#crimeData').checked=false;visibleLimit=Math.max(60,selected(effective()).findIndex(h=>h.id===id)+1);render();}history.replaceState(null,'','#'+id);document.getElementById(id)?.scrollIntoView({block:'center'});});
$('#syncNow').addEventListener('click',()=>{notice='';sync();});
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const password=$('#loginPassword').value;$('#loginButton').disabled=true;
  try{
    const response=await request('/login',{method:'POST',body:JSON.stringify({password})});
    const body=await response.json();if(!response.ok)throw Error(body.error||'Sign in failed. Please try again.');
    if(typeof body.session!=='string'||!body.expiresAt)throw Error('Unexpected login response.');
    token=body.session;connectionInvalid=false;
    try{localStorage.setItem(TOKEN,JSON.stringify(token));}catch{storageWarning=true;}
    $('#loginPassword').value='';notice='Signed in. Choose Kartik or Minoli above; this device will remember you.';
    await sync();
  }catch(err){notice=err.name==='AbortError'?'Sign in timed out. Please try again.':err.message;status();}
  finally{$('#loginButton').disabled=false;}
});
$('#forgetDevice').addEventListener('click',()=>{
  if(pending.length||syncing){notice='Wait for your pending changes to sync before signing out.';status();return;}
  token='';records=[];connectionInvalid=false;lastSync=null;
  try{localStorage.removeItem(TOKEN);localStorage.removeItem(CACHE);}catch{storageWarning=true;}
  notice='Signed out on this device.';render();
});
$('#importLegacy').addEventListener('click',()=>{
  if(!token||connectionInvalid){notice='Sign in to import your earlier likes.';status();$('#loginPassword').focus();return;}
  let count=0;for(const id of legacy){const r=current(id);if(r.version>0||pending.some(p=>key(p)===key(r)))continue;queue({...r,liked:true});count++;}
  importedLegacy=true;persist();notice=count+' earlier likes imported as '+member+'.';render();sync();
});
$('#exportProfile').addEventListener('click',()=>{
  const rs=effective(),data={generatedAt:new Date().toISOString(),profile:buildProfile(HOMES,rs),records:rs,likedHomes:HOMES.filter(h=>rs.some(r=>r.homeId===h.id&&r.liked)),dislikedHomes:HOMES.filter(h=>rs.some(r=>r.homeId===h.id&&r.disliked&&!r.liked))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='home-hunt-taste-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
// Retire private pairing links without persisting or displaying their credentials.
if(new URLSearchParams(location.hash.slice(1)).has('join')){history.replaceState(null,'',location.pathname+location.search);notice='Use the shared password to sign in. No connection code is needed.';}
$('#catalogStats').innerHTML=[[HOMES.filter(isActive).length,'refreshed active'],...['Condo','Single-family','Townhouse / attached'].map(cat=>[HOMES.filter(h=>isActive(h)&&h.category===cat).length,'active · '+cat])].map(([n,label])=>'<div><b>'+n+'</b><span>'+esc(label)+'</span></div>').join('');
render();sync();
setInterval(()=>{if(document.visibilityState==='visible')sync();},10000);
window.addEventListener('online',()=>sync());
window.addEventListener('storage',e=>{if(e.key===TOKEN){token=read(TOKEN,'');connectionInvalid=false;lastSync=null;if(!token){records=[];pending=[];notice='Signed out on this device.';}render();if(token)sync();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
window.addEventListener('storage',e=>{if(e.key===CACHE&&!syncing){const next=read(CACHE,{});records=next.records||records;pending=next.pending||pending;importedLegacy=!!next.importedLegacy;if(!document.activeElement?.matches('textarea,input'))render();if(pending.length)sync();}});
