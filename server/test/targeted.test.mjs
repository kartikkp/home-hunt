import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectHomes} from '../../catalog-view.mjs';
import {buildProfile} from '../../taste-engine.mjs';
import {estimatePayment,paymentMarkup} from '../../payment-estimate.mjs';
import {extraDetailsMarkup} from '../../card-details.mjs';
const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const homes=await load('../homes.json'),audit=await load('../../data/search-2026-09-07.json'),prior=await load('../../data/catalogue-ids-2026-09-06.json');
test('new search is a verified, deduplicated batch, not a redated full catalogue',()=>{
  assert.equal(homes.length,541);assert.equal(homes.filter(h=>!prior.includes(h.id)).length,8);
  const selected=selectHomes(homes,[],{availability:'new-search'});assert.equal(selected.length,14);
  assert.deepEqual(new Set(selected.map(h=>h.id)),new Set(audit.shortlistIds));
  assert.equal(homes.filter(h=>h.refreshedAt==='2026-09-07').length,38);
  for(const h of selected){assert.equal(h.status,'Active');assert.equal(h.refreshedAt,'2026-09-07');assert.ok(h.photos.length);assert.ok(h.searchHighlights.length);assert.equal(h.detailsAsOf,h.refreshedAt);assert.ok(h.source.accessedAt.startsWith('2026-09-08'));assert.ok(h.station_mi<.6);assert.ok(h.crime?.source&&h.bike?.source);}
  assert.equal(audit.screened,663);assert.equal(audit.pages.length,28);
  for(const h of homes)for(const forbidden of ['records','liked','disliked','note','PrivateRemarks','PublicRemarks','AgentOffice','householdToken'])assert.ok(!Object.hasOwn(h,forbidden),'No private or raw field '+forbidden);
});
test('listing caveats and verified source facts survive rendering and calculations',()=>{
  const assessment=homes.find(h=>h.id==='ok850dc29d1b1422');assert.equal(assessment.reportedAssessment,119.38);
  assert.match(paymentMarkup(assessment),/including this assessment/);
  assert.match(paymentMarkup({...assessment,assessmentNote:'<img onerror=bad>'}),/&lt;img/);
  const parking=homes.find(h=>h.id==='okcb6899caa24533');assert.ok(Math.abs(parking.hoa-1247.54)<.001);assert.ok(Math.abs(parking.tax-(7200.72+1924.88)/12)<.001);
  const staged=homes.find(h=>h.id==='ok805d2a1715763d');assert.equal(staged.hoa,null);assert.equal(estimatePayment(staged).total,null);assert.match(extraDetailsMarkup(staged),/virtually staged/);
  assert.match(extraDetailsMarkup({searchHighlights:['<script>bad</script>'],researchCautions:['<img>']}),/&lt;script&gt;/);
});
test('size feedback compares the same home type and sub-half-mile rail distances are not hard exclusions',()=>{
  const hs=[{id:'a',category:'Condo',sqft:900,station_mi:.1},{id:'b',category:'Condo',sqft:950,station_mi:.15},{id:'rejected',category:'Single-family',sqft:1900,station_mi:.15},{id:'condo',category:'Condo',sqft:950,station_mi:.2},{id:'house',category:'Single-family',sqft:1800,station_mi:.8}].map(h=>({...h,price:900000,eligible:true,stationMethod:'straight-line'}));
  const rs=[...['a','b'].map(homeId=>({homeId,member:'Kartik',liked:true})),{homeId:'rejected',member:'Kartik',disliked:true,dislikeReasons:['Too small','Too far from rail']}];
  const p=buildProfile(hs,rs);assert.equal(p.recommendations.find(r=>r.id==='condo').cautions.length,0);assert.equal(p.recommendations.find(r=>r.id==='house').cautions.length,2);
});
test('explicit interior/light preferences reward source-supported evidence, never invented visuals',()=>{
  const base={category:'Condo',price:900000,sqft:950,eligible:true};
  const hs=['a','b','verified','unknown'].map(id=>({...base,id,...(id==='verified'?{researchSignals:['Updated interiors','Natural light']}:{} )}));
  const rs=['a','b'].map(homeId=>({homeId,member:'Minoli',liked:true,reasons:['Natural light','Updated interiors']}));
  const p=buildProfile(hs,rs);assert.ok(p.recommendations.find(r=>r.id==='verified').score>p.recommendations.find(r=>r.id==='unknown').score);
  assert.ok(p.recommendations.find(r=>r.id==='verified').reasons.some(r=>r.includes('Listing reports')));
});
