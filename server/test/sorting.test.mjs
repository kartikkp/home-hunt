import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectHomes} from '../../catalog-view.mjs';

const homes=[
  {id:'unknown',price:null,sqft:null,station_mi:null,hoa:null,tax:null},
  {id:'high',price:1000000,sqft:2000,station_mi:2,hoa:800,tax:1000,bike:{protectedMiles:2}},
  {id:'low',price:500000,sqft:1000,station_mi:0,hoa:0,tax:0,bike:{mappedPathMiles:0}},
  {id:'bad',price:NaN,sqft:Infinity,station_mi:NaN,hoa:Infinity,tax:1,bike:{protectedMiles:NaN}},
];
test('all six metrics sort both ways with unknowns last and zero values intact',()=>{
  for(const metric of ['price','payment','space','rail','carrying','bike']){
    assert.deepEqual(selectHomes(homes,[],{sort:metric+'-asc'}).map(h=>h.id),['low','high','bad','unknown'],metric+' ascending');
    assert.deepEqual(selectHomes(homes,[],{sort:metric+'-desc'}).map(h=>h.id),['high','low','bad','unknown'],metric+' descending');
  }
  assert.equal(homes[0].id,'unknown','Input remains unmodified');
});
test('legacy sort names keep their original direction; ties remain deterministic',()=>{
  for(const metric of ['price','payment','rail','carrying','bike'])assert.equal(selectHomes(homes,[],{sort:metric})[0].id,'low');
  assert.equal(selectHomes(homes,[],{sort:'space'})[0].id,'high');
  for(const sort of ['price-asc','price-desc'])assert.deepEqual(selectHomes([{id:'b',price:1},{id:'a',price:1}],[],{sort}).map(h=>h.id),['a','b']);
});
test('directions compose with property categories, liked views and financing changes',()=>{
  const xs=homes.map(h=>({...h,category:h.id==='high'?'Single-family':'Condo'}));
  assert.deepEqual(selectHomes(xs,[],{filter:'Condo',sort:'price-desc'}).map(h=>h.id),['low','bad','unknown']);
  assert.deepEqual(selectHomes(xs,[{homeId:'high',member:'Kartik',liked:true}],{filter:'liked',sort:'price-asc'}).map(h=>h.id),['high']);
  const costs=[{id:'a',price:1000000,tax:100,hoa:0},{id:'b',price:500000,tax:1000,hoa:0},{id:'unknown',price:500000,tax:null,hoa:0}];
  assert.deepEqual(selectHomes(costs,[],{sort:'payment-desc'}).map(h=>h.id),['a','b','unknown']);
  assert.deepEqual(selectHomes(costs,[],{sort:'payment-desc',financing:{downPercent:100,ratePercent:6,years:30}}).map(h=>h.id),['b','a','unknown']);
});
test('sort menu exposes both directions of every supported metric',async()=>{
  const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
  const menu=html.match(/<select id="sortHomes">([\s\S]*?)<\/select>/)[1];
  const options=[...menu.matchAll(/<option value="([^"]+)">/g)].map(m=>m[1]);
  assert.equal(options.length,12);
  for(const metric of ['price','payment','space','rail','carrying','bike'])for(const dir of ['asc','desc'])assert.ok(options.includes(metric+'-'+dir));
});
