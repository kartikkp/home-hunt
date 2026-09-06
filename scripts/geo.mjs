const rad=d=>d*Math.PI/180;
export function meters(a,b){
  const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);
  const x=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
  return 6371000*2*Math.asin(Math.min(1,Math.sqrt(x)));
}
export function pointSegmentMeters(point,a,b){
  const scaleX=111195*Math.cos(rad(point.lat)),scaleY=111195;
  const ax=(a[0]-point.lon)*scaleX,ay=(a[1]-point.lat)*scaleY,bx=(b[0]-point.lon)*scaleX,by=(b[1]-point.lat)*scaleY;
  const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/len)):0;
  return Math.hypot(ax+t*dx,ay+t*dy);
}
export function nearestBike(point,routes,protectedOnly=false){
  let distance=Infinity,street=null,source=null;
  for(const route of routes){
    if(protectedOnly&&route.facilitycl!=='I')continue;
    for(const line of route.the_geom.coordinates){
      for(let i=1;i<line.length;i++){const d=pointSegmentMeters(point,line[i-1],line[i]);if(d<distance){distance=d;street=route.street;source=route.source;}}
    }
  }
  return Number.isFinite(distance)?{miles:Math.round(distance/1609.344*100)/100,street,source}:null;
}
export const validNYCPoint=p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&p.lat>40.45&&p.lat<40.95&&p.lon>-74.3&&p.lon<-73.65;
export function crimeWithin(point,rows,radius=500){
  let violent=0,property=0;
  for(const r of rows){const p={lat:+r.latitude,lon:+r.longitude};if(!validNYCPoint(p)||meters(point,p)>radius)continue;
    if(['101','104','105','106'].includes(r.ky_cd))violent++;else if(['107','109','110'].includes(r.ky_cd))property++;
  }
  return {violent,property,total:violent+property};
}
