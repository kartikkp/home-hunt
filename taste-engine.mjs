export const MEMBERS=['Kartik','Minoli'];
export const DISLIKE_REASONS=['Too expensive','Too small','High monthly costs','Commute too long','Too far from rail','Layout','Needs renovation','Style / appearance','Not enough light','No outdoor space','Parking','School fit','Bike access','Safety concerns','Location','Other'];
export const REASONS=['Layout','Natural light','Outdoor space','Updated interiors','Architecture','Location','Space','Price','Schools','Commute','Newer build','Bikeability','Crime safety'];
const bikeMiles=h=>h.bike?.protectedMiles??h.bike?.mappedPathMiles??null;
export const mean=values=>{const xs=values.filter(x=>Number.isFinite(x));return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;};
export const median=values=>{const xs=values.filter(Number.isFinite).sort((a,b)=>a-b);return xs.length?(xs[Math.floor((xs.length-1)/2)]+xs[Math.ceil((xs.length-1)/2)])/2:null;};
const mode=xs=>Object.entries(xs.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{})).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
export function era(h){return h.year==null?null:h.year>=2000?'Built 2000+':h.year>=1980?'Built 1980–1999':h.year>=1940?'Built 1940–1979':'Built before 1940';}
export function condition(h){if(/new development|brand-new|new construction/i.test(h.quality))return 'New construction';if(/updated|renovated|remodeled|move-in/i.test(h.quality))return 'Updated / move-in ready';if(/maintained|well-kept|modern/i.test(h.quality))return 'Well-maintained / modern';return null;}
const money=v=>'$'+Math.round(v/1000).toLocaleString()+'k';
export function buildProfile(homes,records,member='household'){
  const positive=records.filter(r=>r.liked&&(member==='household'||r.member===member));
  const negative=records.filter(r=>r.disliked&&!r.liked&&(member==='household'||r.member===member));
  const negativeIds=new Set(negative.map(r=>r.homeId)),dislikedHomes=homes.filter(h=>negativeIds.has(h.id));
  const avoidThreads=DISLIKE_REASONS.map(label=>{const ids=new Set(negative.filter(r=>r.dislikeReasons?.includes(label)).map(r=>r.homeId));return {label,count:ids.size,examples:homes.filter(h=>ids.has(h.id)).slice(0,3).map(h=>({id:h.id,name:h.name}))};}).filter(t=>t.count).sort((a,b)=>b.count-a.count);
  const ids=new Set(positive.map(r=>r.homeId));const likedHomes=homes.filter(h=>ids.has(h.id));
  const both=homes.filter(h=>MEMBERS.every(m=>records.some(r=>r.member===m&&r.homeId===h.id&&r.liked)));
  const stats={category:mode(likedHomes.map(h=>h.category)),area:mode(likedHomes.map(h=>h.area)),price:median(likedHomes.map(h=>h.price)),sqft:median(likedHomes.map(h=>h.sqft)),year:median(likedHomes.map(h=>h.year)),school:mean(likedHomes.map(h=>h.school)),city:median(likedHomes.map(h=>h.city_min)),station:median(likedHomes.map(h=>h.station_mi)),condition:mode(likedHomes.map(condition).filter(Boolean))};
  stats.bikeMiles=median(likedHomes.map(bikeMiles));
  const threads=[];
  function thread(label,predicate,source='listing data'){
    const matching=likedHomes.filter(predicate),base=homes.filter(predicate);if(matching.length<2||matching.length/likedHomes.length<0.6)return;
    threads.push({label,count:matching.length,total:likedHomes.length,baseline:base.length/homes.length,source,examples:matching.slice(0,3).map(h=>({id:h.id,name:h.name})),strength:matching.length/likedHomes.length-base.length/homes.length});
  }
  for(const category of new Set(likedHomes.map(h=>h.category)))thread(category,h=>h.category===category);
  for(const area of new Set(likedHomes.map(h=>h.area)))thread(area,h=>h.area===area);
  for(const e of new Set(likedHomes.map(era).filter(Boolean)))thread(e,h=>era(h)===e);
  for(const c of new Set(likedHomes.map(condition).filter(Boolean)))thread(c,h=>condition(h)===c);
  thread('Rail commute of 30 minutes or less',h=>h.city_min!=null&&h.city_min<=30);
  thread('Within half a mile of a station',h=>h.station_mi!=null&&h.station_mi<=0.5);
  thread('Prior school-fit estimate of at least 4/5 (unverified)',h=>h.school>=4);
  thread('Mapped bike infrastructure within a quarter mile',h=>bikeMiles(h)!=null&&bikeMiles(h)<=0.25);
  thread('At least 1,200 square feet',h=>h.sqft>=1200);
  for(const reason of REASONS){const selected=new Set(positive.filter(r=>r.reasons?.includes(reason)).map(r=>r.homeId));thread(reason,h=>selected.has(h.id),'your feedback');}
  threads.sort((a,b)=>(b.source==='your feedback')-(a.source==='your feedback')||b.strength-a.strength||b.count-a.count);
  const boost=(reason,weight)=>weight*(1+new Set(positive.filter(r=>r.reasons?.includes(reason)).map(r=>r.homeId)).size/Math.max(1,likedHomes.length));
  const recommendations=likedHomes.length<2?[]:homes.filter(h=>!ids.has(h.id)&&!negativeIds.has(h.id)&&h.eligible!==false).map(h=>{
    let earned=0,possible=0,total=0;const explanations=[];
    function numeric(value,target,weight,scale,why){if(target==null)return;total+=weight;if(!Number.isFinite(value))return;possible+=weight;const similarity=Math.max(0,1-Math.abs(value-target)/scale);earned+=weight*similarity;if(similarity>=0.7)explanations.push({weight:weight*similarity,text:why});}
    function categorical(value,target,weight,why){if(!target)return;total+=weight;if(value==null)return;possible+=weight;if(value===target){earned+=weight;explanations.push({weight,text:why});}}
    categorical(h.category,stats.category,18,'Same property type: '+h.category);
    categorical(h.area,stats.area,boost('Location',12),'Same area: '+h.area);
    numeric(h.price,stats.price,boost('Price',16),Math.max(stats.price*0.4,200000),money(h.price)+' vs your typical '+money(stats.price));
    numeric(h.sqft,stats.sqft,boost('Space',16),Math.max(stats.sqft*0.6,600),(h.sqft||0).toLocaleString()+' sf, near your preferred size');
    numeric(h.year,stats.year,boost('Newer build',8),50,'Similar build era: '+h.year);
    numeric(h.school,stats.school,boost('Schools',8),2,'Prior school-fit estimate '+h.school+'/5 (unverified)');
    numeric(h.city_min,stats.city,boost('Commute',10),30,'~'+h.city_min+' minutes by rail');
    numeric(h.station_mi,stats.station,5,1,'~'+h.station_mi+' miles to rail');
    categorical(condition(h),stats.condition,boost('Updated interiors',7),'Similar condition: '+condition(h));
    // Source-reported evidence only; never infer appearance or light from size/year.
    for(const reason of ['Updated interiors','Natural light'])if(positive.some(r=>r.reasons?.includes(reason))){
      total+=5;
      const supported=h.researchSignals?.includes(reason)||(reason==='Updated interiors'&&['New construction','Updated / move-in ready'].includes(condition(h)));
      if(supported){possible+=5;earned+=5;explanations.push({weight:5,feedback:true,text:'Listing reports '+reason.toLowerCase()+'; matches your feedback (verify in person)'});}
    }
    if(positive.some(r=>r.reasons?.includes('Bikeability')))numeric(bikeMiles(h),stats.bikeMiles,12,1,'Mapped bike infrastructure ~'+bikeMiles(h)+' mi away; proximity, not route quality');
    const cautions=new Set();
    const comparable=(a,b)=>Number.isFinite(a)&&Number.isFinite(b);
    for(const r of negative){const rejected=homes.find(x=>x.id===r.homeId);if(!rejected)continue;
      for(const reason of r.dislikeReasons||[]){
        if(reason==='Too expensive'&&comparable(h.price,rejected.price)&&h.price>=rejected.price)cautions.add('Priced at least as high as a home you rejected for price');
        if(reason==='Too small'&&h.category===rejected.category&&comparable(h.sqft,rejected.sqft)&&h.sqft<=rejected.sqft)cautions.add('No larger than a home of the same type you rejected for size; compare layouts');
        if(reason==='High monthly costs'&&[h.hoa,h.tax,rejected.hoa,rejected.tax].every(Number.isFinite)&&h.hoa+h.tax>=rejected.hoa+rejected.tax)cautions.add('Known HOA + tax is at least as high as a home you rejected for costs');
        if(reason==='Too far from rail'&&h.stationMethod===rejected.stationMethod&&comparable(h.station_mi,rejected.station_mi)&&h.station_mi>=Math.max(.5,rejected.station_mi))cautions.add('At least half a mile from rail and no closer than a home you rejected; verify the walking route');
        if(reason==='Bike access'&&comparable(bikeMiles(h),bikeMiles(rejected))&&bikeMiles(h)>=bikeMiles(rejected))cautions.add('Mapped bike infrastructure is at least as far away as for a rejected home');
      }
    }
    return {id:h.id,name:h.name,area:h.area,score:total?Math.max(0,Math.round(earned/total*100)-Math.min(18,cautions.size*6)):0,coverage:total?Math.round(possible/total*100):0,reasons:explanations.sort((a,b)=>Number(!!b.feedback)-Number(!!a.feedback)||b.weight-a.weight).slice(0,3).map(x=>x.text),cautions:[...cautions]};
  }).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.id.localeCompare(b.id)).slice(0,6);
  return {member,count:likedHomes.length,dislikedCount:dislikedHomes.length,avoidThreads,confidence:likedHomes.length<2?'Getting started':likedHomes.length<5?'Early pattern':likedHomes.length<10?'Emerging pattern':'More evidence',stats,threads:threads.slice(0,8),bothLiked:both.map(h=>({id:h.id,name:h.name})),recommendations,searchBrief:likedHomes.length||dislikedHomes.length?{preferredType:stats.category,preferredArea:stats.area,typicalPrice:stats.price,typicalSqft:stats.sqft,typicalYear:stats.year,typicalCommuteMinutes:stats.city,typicalStationMiles:stats.station,typicalSchoolFit:stats.school,condition:stats.condition,explicitReasons:[...new Set(positive.flatMap(r=>r.reasons||[]))],notes:positive.filter(r=>r.note).map(r=>({member:r.member,homeId:r.homeId,note:r.note})),bothLiked:both.map(h=>h.name),dislikes:negative.map(r=>({member:r.member,homeId:r.homeId,name:homes.find(h=>h.id===r.homeId)?.name,reasons:r.dislikeReasons||[],note:r.note||''})),guidance:'Explicit dislikes are exclusions for the selected profile. Objective negative feedback can reduce similarity scores; subjective reasons require listing research, not inferred visual attributes. Observed preferences, not hard requirements. Verify live listings, school assignments and commutes. Reason tags and notes are user feedback, not verified attributes of candidate homes.'}:null};
}
