import {estimatePayment} from './payment-estimate.mjs?v=20260907-search';
export const CATEGORIES=['Condo','Single-family','Townhouse / attached'];
export function isActive(h){return h.eligible===true&&h.status==='Active';}
export const bikeMiles=h=>h.bike?.protectedMiles??h.bike?.mappedPathMiles??null;
export function bikeNearby(h){return Number.isFinite(bikeMiles(h))&&bikeMiles(h)<=0.25;}
export function localCrime(h){return h.crime?.scope==='500m radius'&&Number.isFinite(h.crime.total);}
export function selectHomes(homes,records,{filter='all',query='',availability='all',bike=false,crime=false,sort='rail',financing}={}){
  const likes=new Map();for(const r of records)if(r.liked){if(!likes.has(r.homeId))likes.set(r.homeId,new Set());likes.get(r.homeId).add(r.member);}
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const xs=homes.filter(h=>{
    const fans=likes.get(h.id)||new Set();
    const special=filter==='liked'||filter==='both'||filter==='disliked';
    // Liked views always retain saved homes, even if no longer active.
    if(!special&&availability==='active'&&!isActive(h))return false;
    if(availability==='original'&&!h.legacy)return false;
    if(availability==='new-search'&&(!h.searchBatch||!isActive(h)))return false;
    if(filter==='newer'&&!(h.year>=2000))return false;
    if(filter==='schools'&&!(h.school>=4))return false;
    if(filter==='liked'&&!fans.size)return false;
    if(filter==='disliked'&&!records.some(r=>r.homeId===h.id&&r.disliked&&!r.liked))return false;
    if(filter==='both'&&!(fans.has('Kartik')&&fans.has('Minoli')))return false;
    if(CATEGORIES.includes(filter)&&h.category!==filter)return false;
    if(bike&&!bikeNearby(h)||crime&&!localCrime(h))return false;
    const text=[h.name,h.area,h.station,...Object.values(h.schools||{})].join(' ').toLowerCase();
    return terms.every(t=>text.includes(t));
  });
  const [metric,order]=sort.split('-');
  // Preserve old callers: space meant largest first; other bare keys meant lowest first.
  const direction=order==='desc'||(!order&&metric==='space')?-1:1;
  const value=h=>metric==='payment'?estimatePayment(h,financing).total
    :metric==='price'?h.price:metric==='space'?h.sqft:metric==='bike'?bikeMiles(h)
    :metric==='carrying'?(Number.isFinite(h.hoa)&&Number.isFinite(h.tax)?h.hoa+h.tax:null):h.station_mi;
  const values=new Map(xs.map(h=>[h,value(h)]));
  return xs.sort((a,b)=>{
    const av=values.get(a),bv=values.get(b),aKnown=Number.isFinite(av),bKnown=Number.isFinite(bv);
    // Do not reverse unknowns to the top when reversing the numeric order.
    if(aKnown!==bKnown)return aKnown?-1:1;
    return (aKnown?direction*(av-bv):0)||a.id.localeCompare(b.id);
  });
}
