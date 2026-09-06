export const CATEGORIES=['Condo','Single-family','Townhouse / attached'];
export function isActive(h){return h.eligible===true&&h.status==='Active';}
export const bikeMiles=h=>h.bike?.protectedMiles??h.bike?.mappedPathMiles??null;
export function bikeNearby(h){return Number.isFinite(bikeMiles(h))&&bikeMiles(h)<=0.25;}
export function localCrime(h){return h.crime?.scope==='500m radius'&&Number.isFinite(h.crime.total);}
export function selectHomes(homes,records,{filter='all',query='',availability='all',bike=false,crime=false,sort='rail'}={}){
  const likes=new Map();for(const r of records)if(r.liked){if(!likes.has(r.homeId))likes.set(r.homeId,new Set());likes.get(r.homeId).add(r.member);}
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const xs=homes.filter(h=>{
    const fans=likes.get(h.id)||new Set();
    const special=filter==='liked'||filter==='both';
    // Liked views always retain saved homes, even if no longer active.
    if(!special&&availability==='active'&&!isActive(h))return false;
    if(availability==='original'&&!h.legacy)return false;
    if(filter==='newer'&&!(h.year>=2000))return false;
    if(filter==='schools'&&!(h.school>=4))return false;
    if(filter==='liked'&&!fans.size)return false;
    if(filter==='both'&&!(fans.has('Kartik')&&fans.has('Minoli')))return false;
    if(CATEGORIES.includes(filter)&&h.category!==filter)return false;
    if(bike&&!bikeNearby(h)||crime&&!localCrime(h))return false;
    const text=[h.name,h.area,h.station,...Object.values(h.schools||{})].join(' ').toLowerCase();
    return terms.every(t=>text.includes(t));
  });
  const val=(h,key)=>Number.isFinite(h[key])?h[key]:Infinity;
  return xs.sort((a,b)=>{
    let delta=0;
    if(sort==='price')delta=val(a,'price')-val(b,'price');
    else if(sort==='space')delta=(b.sqft??-1)-(a.sqft??-1);
    else if(sort==='bike')delta=(bikeMiles(a)??Infinity)-(bikeMiles(b)??Infinity);
    else if(sort==='carrying')delta=(Number.isFinite(a.hoa)&&Number.isFinite(a.tax)?a.hoa+a.tax:Infinity)-(Number.isFinite(b.hoa)&&Number.isFinite(b.tax)?b.hoa+b.tax:Infinity);
    else delta=val(a,'station_mi')-val(b,'station_mi');
    return delta||a.id.localeCompare(b.id);
  });
}
