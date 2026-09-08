import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePayment,normalizeFinancing,paymentMarkup} from '../../payment-estimate.mjs';
import {selectHomes} from '../../catalog-view.mjs';
test('fixed-rate amortization, monthly taxes and HOA are summed without annualizing twice',()=>{
  const p=estimatePayment({price:1000000,tax:1000,hoa:500},{downPercent:20,ratePercent:6,years:30});
  assert.equal(p.loan,800000);assert.equal(p.downPayment,200000);
  assert.ok(Math.abs(p.mortgage-4796.4042)<.001);
  assert.ok(Math.abs(p.total-6296.4042)<.001);assert.deepEqual(p.missing,[]);
});
test('zero interest, cash purchases and missing costs stay distinct from zero',()=>{
  assert.equal(estimatePayment({price:120000,tax:0,hoa:0},{downPercent:0,ratePercent:0,years:10}).total,1000);
  assert.equal(estimatePayment({price:120000,tax:100,hoa:0},{downPercent:100,ratePercent:6,years:30}).total,100);
  const p=estimatePayment({price:1000000,tax:1000,hoa:null});assert.equal(p.total,null);assert.ok(p.subtotal>1000);assert.deepEqual(p.missing,['HOA']);
  assert.equal(estimatePayment({price:null,tax:100,hoa:0}).total,null);
  assert.equal(estimatePayment({price:100000,tax:-1,hoa:0}).total,null);
  assert.match(paymentMarkup({price:1000000,tax:1000,hoa:null}),/Known subtotal/);
  assert.match(paymentMarkup({price:1000000,tax:1000,hoa:null}),/HOA unknown/);
});
test('invalid saved financing falls back, and tax outliers cannot masquerade as a complete estimate',()=>{
  const defaults=normalizeFinancing();
  for(const v of [null,[],{downPercent:-1,ratePercent:Infinity,years:0},{downPercent:'20',ratePercent:'6',years:'30'}])assert.deepEqual(normalizeFinancing(v),defaults);
  assert.equal(estimatePayment({price:1080000,tax:47770,hoa:0}).total,null);
  assert.match(paymentMarkup({price:1080000,tax:47770,hoa:0}),/tax needs verification/);
  assert.match(paymentMarkup({price:1000000,tax:40,hoa:400}),/abatement/);
});
test('monthly-payment sort respects financing and puts incomplete estimates last',()=>{
  const homes=[{id:'unknown',price:500000,tax:null,hoa:0},{id:'a',price:1000000,tax:100,hoa:0},{id:'b',price:500000,tax:1000,hoa:0}];
  assert.deepEqual(selectHomes(homes,[],{sort:'payment'}).map(h=>h.id),['b','a','unknown']);
  assert.deepEqual(selectHomes(homes,[],{sort:'payment',financing:{downPercent:100,ratePercent:6,years:30}}).map(h=>h.id),['a','b','unknown']);
});
