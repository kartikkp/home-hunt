// Fixed-rate principal + interest; tax and HOA in the catalogue are already monthly.
// Benchmark only, not an individual loan quote. Keep unknown costs explicit.
export const DEFAULT_FINANCING=Object.freeze({downPercent:20,ratePercent:6.71,years:30});
export function normalizeFinancing(value){
  const v=value&&typeof value==='object'?value:{};
  const valid=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  return {downPercent:valid(v.downPercent,0,100)?v.downPercent:20,ratePercent:valid(v.ratePercent,0,25)?v.ratePercent:6.71,years:valid(v.years,1,40)&&Number.isInteger(v.years)?v.years:30};
}
export function estimatePayment(home,financing){
  const f=normalizeFinancing(financing),known=v=>Number.isFinite(v)&&v>=0;
  const price=Number.isFinite(home.price)&&home.price>0?home.price:null;
  const downPayment=price===null?null:price*f.downPercent/100,loan=price===null?null:price-downPayment;
  const r=f.ratePercent/1200,n=f.years*12;
  const mortgage=loan===null?null:loan===0?0:r===0?loan/n:loan*r/(-Math.expm1(-n*Math.log1p(r)));
  const suspectTax=price!==null&&known(home.tax)&&home.tax*12>price*.04;
  const tax=known(home.tax)&&!suspectTax?home.tax:null,hoa=known(home.hoa)?home.hoa:null;
  const missing=[...(mortgage===null?['mortgage']:[]),...(tax===null?[suspectTax?'tax needs verification':'tax']:[]),...(hoa===null?['HOA']:[])];
  const subtotal=[mortgage,tax,hoa].filter(known).reduce((a,b)=>a+b,0);
  return {financing:f,loan,downPayment,mortgage,tax,hoa,subtotal,total:missing.length?null:subtotal,missing,suspectTax,lowTax:price!==null&&tax!==null&&tax*12<price*.002};
}
const money=v=>v===null?'Unknown':'$'+Math.round(v).toLocaleString('en-US');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function paymentMarkup(home,financing){
  const p=estimatePayment(home,financing),f=p.financing;
  const assessment=Number.isFinite(home.reportedAssessment)&&home.reportedAssessment>0?home.reportedAssessment:null;
  return `<section class="paymentEstimate" aria-label="Estimated monthly payment"><span>${p.total===null?'Known subtotal · incomplete':'Est. mortgage + tax + HOA'}</span><strong>${money(p.total??p.subtotal)}<small>/month</small></strong><dl><dt>Mortgage · principal + interest</dt><dd>${money(p.mortgage)}</dd><dt>Property tax${home.taxYear?' · '+Number(home.taxYear):''}</dt><dd>${p.suspectTax?'Verify source':money(p.tax)}</dd><dt>HOA / common charges</dt><dd>${money(p.hoa)}</dd></dl>${p.missing.length?'<p class="paymentWarning">'+p.missing.map(x=>x==='tax needs verification'?x:x+' unknown').join(' · ')+'. Not a complete total.</p>':''}${assessment?'<p class="paymentWarning">Additional reported assessment: '+money(assessment)+'/month'+(p.total!==null?' → '+money(p.total+assessment)+'/month including this assessment':'')+'. '+esc(home.assessmentNote)+'</p>':''}<small>${f.downPercent}% down (${money(p.downPayment)}) · ${f.ratePercent}% interest · ${f.years} years. Change assumptions above.</small><small>Excludes insurance, PMI, maintenance, utilities, closing costs and special assessments.${f.downPercent<20?' PMI may be required with less than 20% down.':''}</small>${p.lowTax?'<small class="paymentWarning">Low reported taxes may reflect an abatement or incomplete assessment. Verify the post-purchase bill and expiration date.</small>':''}${p.suspectTax?'<small class="paymentWarning">Source tax exceeds 4% of asking price annually; excluded until verified, not silently corrected.</small>':''}</section>`;
}
