// Enrich from already retrieved OneKey listing pages, never from owner/contact fields.
// Usage: node scripts/enrich-card-details.mjs /absolute/path/to/refresh-cache
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=new URL('../',import.meta.url),cache=process.argv[2];
if(!cache)throw Error('Provide the existing listing-page cache directory');
function detail(html){
  const stream=[...html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)].map(x=>JSON.parse(x[1])).filter(x=>x[0]===1).map(x=>x[1]).join('');
  let found;function walk(v){if(!v||typeof v!=='object')return;if(v.Geo&&v.Structure&&v.Listing)found=v;for(const x of Object.values(v))walk(x);}
  for(const m of stream.matchAll(/[0-9a-f]+:(\[[^\n]*|\{[^\n]*)/g)){try{walk(JSON.parse(m[1]));}catch{}}
  return found;
}
const photoURL=v=>{try{const u=new URL(v);return u.protocol==='https:'&&['brokerdata-b.b-cdn.net','bpp.mlsgrid.com'].includes(u.hostname)?u.href:null;}catch{return null;}};
const clean=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&!/^(other|unknown|\$undefined|contact agent)$/i.test(x)).join(', '):typeof v==='boolean'?(v?'Yes':'No'):Number.isFinite(v)?String(v):typeof v==='string'&&!/^(other|unknown|\$undefined|contact agent)$/i.test(v)?v:null;
const homes=JSON.parse(readFileSync(new URL('server/homes.json',root),'utf8'));let enriched=0,images=0;
for(const h of homes){
  if(!h.refreshedAt)continue;
  const p=detail(readFileSync(resolve(cache,createHash('sha256').update(h.url).digest('hex')+'.html'),'utf8'));
  if(!p||p.Listing.ListingId!==h.source.listingId)throw Error('Identity mismatch: '+h.id);
  h.photos=[...new Set([p.ImagesHero,...(p.Images||[])].map(photoURL).filter(Boolean))].slice(0,6);
  h.photoCount=(p.Photos||p.Images||[]).length;h.detailsAsOf=h.refreshedAt;
  if(h.photos.length)images++;
  const s=p.Structure||{},c=p.Characteristics||{},u=p.Utilities||{},ho=p.HOA||{},e=p.Equipment||{};
  const rows=[['Architecture',s.ArchitecturalStyle],['Construction',s.ConstructionMaterials],['Interior features',s.InteriorFeatures],['Flooring',s.Flooring],['Heating',s.Heating],['Cooling',s.Cooling],['Appliances',e.Appliances],['Laundry',c.LaundryFeatures||s.LaundryFeatures],['Parking',s.ParkingFeatures],['Garage',s.GarageYN],['Garage spaces',s.GarageSpaces],['Basement',s.Basement||s.BasementYN],['Levels',s.Levels],['Entry level',s.EntryLevel],['Outdoor features',c.ExteriorFeatures||s.ExteriorFeatures],['Patio / porch',c.PatioAndPorchFeatures||s.PatioAndPorchFeatures],['Lot features',c.LotFeatures],['Fencing',c.Fencing],['Lot size (sq ft; may be shared for condos)',c.LotSizeSquareFeet],['Lot size (acres; may be shared for condos)',c.LotSizeAcres],['Pets policy',c.PetsAllowed||ho.PetsAllowed],['HOA covers',ho.AssociationFeeIncludes],['Association amenities',ho.AssociationAmenities],['Community amenities',c.CommunityFeatures],['Pool',c.PoolFeatures||c.PoolPrivateYN],['Waterfront',c.WaterfrontYN],['View',c.View],['Water',u.WaterSource],['Sewer',u.Sewer],['Utilities',u.Utilities],['Accessibility',c.AccessibilityFeatures||s.AccessibilityFeatures],['Living-area source',s.LivingAreaSource],['Listed since',p.Listing.Dates?.OnMarketDate],['Days on market (at snapshot)',p.Listing.Dates?.DaysOnMarket]];
  h.details=Object.fromEntries(rows.map(([k,v])=>[k,clean(v)]).filter(([k,v])=>v!=null&&v!==''));
  enriched++;
}
writeFileSync(new URL('server/homes.json',root),JSON.stringify(homes,null,2)+'\n');
const index=readFileSync(new URL('index.html',root),'utf8');
writeFileSync(new URL('index.html',root),index.replace(/const HOMES=\[.*?\];\nwindow.homeHuntCatalog=HOMES;/s,'const HOMES='+JSON.stringify(homes).replace(/</g,'\\u003c')+';\nwindow.homeHuntCatalog=HOMES;'));
console.log(JSON.stringify({enriched,withPhotos:images,withoutPhotos:homes.length-images,detailFields:homes.reduce((n,h)=>n+Object.keys(h.details||{}).length,0)}));
