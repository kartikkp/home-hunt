import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {photoURLs,photoMarkup,extraDetailsMarkup,feedbackMarkup} from '../../card-details.mjs';
import {buildProfile} from '../../taste-engine.mjs';
const homes=JSON.parse(await readFile(new URL('../homes.json',import.meta.url),'utf8'));
test('source-linked image previews and detailed cards preserve unknowns and escape untrusted text',()=>{
  assert.equal(homes.filter(h=>photoURLs(h).length).length,500);
  assert.equal(homes.filter(h=>Object.keys(h.details||{}).length).length,501);
  assert.ok(homes.every(h=>photoURLs(h).length<=6));
  assert.equal(homes.reduce((n,h)=>n+Object.keys(h.details||{}).length,0),9882);
  const h={id:'test',name:'<script>bad</script>',url:'https://onekeymls.com/',photos:['javascript:alert(1)','https://evil.example/x','https://bpp.mlsgrid.com/images/test.jpeg'],details:{Heating:'<img onerror=bad>'},hoa:null,tax:50};
  assert.equal(photoURLs(h).length,1);const html=photoMarkup(h)+extraDetailsMarkup(h);
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('javascript:'));assert.ok(html.includes('Monthly HOA + tax total incomplete'));assert.ok(!html.includes('<img onerror=bad>'));
  assert.ok(photoMarkup({}).includes('No verified listing photo'));
});
test('negative dropdown keeps multiple reasons and note safely; a neutral home has no feedback editor',()=>{
  const h={id:'x'},r={liked:false,disliked:true,dislikeReasons:['Layout','Too small'],note:'</textarea><script>bad</script>'};
  const html=feedbackMarkup(h,r,'Minoli',true);assert.ok(html.includes('data-dislike-reason="x"'));assert.ok(html.includes('Remove reason: Layout'));assert.ok(html.includes('Remove reason: Too small'));assert.ok(html.includes('&lt;/textarea&gt;'));assert.ok(html.includes('Saved as Minoli'));
  assert.equal(feedbackMarkup(h,{liked:false},'Kartik',false),'');
});
test('explicit objective dislikes lower scores; unknown costs and subjective safety claims do not',()=>{
  const base={category:'Condo',price:800000,sqft:1000,eligible:true};
  const hs=['a','b','rejected','known','unknown'].map(id=>({...base,id,hoa:id==='unknown'?null:800,tax:200}));
  const positives=['a','b'].map(homeId=>({homeId,member:'Kartik',liked:true}));
  const rs=[...positives,{homeId:'rejected',member:'Kartik',liked:false,disliked:true,dislikeReasons:['High monthly costs']}];
  const p=buildProfile(hs,rs),known=p.recommendations.find(r=>r.id==='known'),unknown=p.recommendations.find(r=>r.id==='unknown');assert.ok(known.score<unknown.score);assert.ok(known.cautions.length);assert.equal(unknown.cautions.length,0);
  const safety=buildProfile(hs,[...positives,{...rs[2],dislikeReasons:['Safety concerns']}]);assert.equal(safety.recommendations.find(r=>r.id==='known').score,safety.recommendations.find(r=>r.id==='unknown').score);
});
