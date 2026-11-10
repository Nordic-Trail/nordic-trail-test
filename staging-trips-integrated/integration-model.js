/* NORDIC TRAIL integration model — isolated from legacy localStorage v1. */
(function(root,factory){
'use strict';
const api=factory(
 typeof module==='object'&&module.exports?require('../staging-trips/route-model.js'):root.NordicTripModel,
 typeof module==='object'&&module.exports?require('../staging-trips/routing-core.js'):root.NordicRoutingCore
);
if(typeof module==='object'&&module.exports)module.exports=api;
else root.NordicIntegratedTrip=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(M,R){
'use strict';
const VERSION=2, KEY='nt-staging-integrated-trip-v2', LEGACY_KEY='nt-staging-trip-planner-v1';
const MAX_ROUTE_POINTS=30000,MAX_ROUTES=100;
function esc(value){
 return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function routesFor(trip,routes){
 const result=Object.create(null),sections=R.displaySegments(trip,{});
 if(!routes||typeof routes!=='object'||Array.isArray(routes))return result;
 let count=0;
 for(const s of sections){
  if(count++>=MAX_ROUTES)break;
  const data=routes[s.key];
  if(!data||data.key!==s.key||data.mode!==s.mode||data.status!=='routed'||data.legalAccess!=='unverified'||
   !Array.isArray(data.points)||data.points.length<2||data.points.length>MAX_ROUTE_POINTS||
   typeof data.km!=='number'||!Number.isFinite(data.km)||data.km<=0||data.km>20000)continue;
  try{
   const points=data.points.map(R.coord);
   const start=R.coord(s.from),finish=R.coord(s.to);
   // Validate every cached line against its own segment endpoints.
   const haversine=(a,b)=>{
    const rad=Math.PI/180,x=(a.lat-b.lat)*rad,y=(a.lon-b.lon)*rad;
    const h=Math.sin(x/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(y/2)**2;
    return 6371.0088*2*Math.atan2(Math.sqrt(Math.max(0,h)),Math.sqrt(Math.max(0,1-h)));
   };
   if(haversine(points[0],start)>1||haversine(points[points.length-1],finish)>1)continue;
   result[s.key]={key:s.key,mode:s.mode,status:'routed',legalAccess:'unverified',
     points,km:data.km};
  }catch(_){}
 }
 return result;
}
function pack(trip,routes){
 const normalized=M.normalize(trip);
 return {version:VERSION,trip:normalized,routes:routesFor(normalized,routes)};
}
function unpack(input){
 if(!input||typeof input!=='object'||input.version!==VERSION)throw Error('Nieprawidłowa wersja zapisu.');
 return pack(input.trip,input.routes);
}
function load(storage){
 const raw=storage.getItem(KEY);
 if(raw){const data=unpack(JSON.parse(raw));return {...data,from:'v2'};}
 const old=storage.getItem(LEGACY_KEY);
 if(old){const trip=M.normalize(JSON.parse(old));return {...pack(trip,{}),from:'v1'};}
 return {...pack(M.emptyTrip(),{}),from:'new'};
}
function save(storage,trip,routes){
 const data=pack(trip,routes);
 storage.setItem(KEY,JSON.stringify(data));
 return data;
}
function gpx(trip,routes,{draftsAllowed=true}={}){
 const t=M.normalize(trip),segments=R.displaySegments(t,routesFor(t,routes));
 if(!t.waypoints.length)throw Error('Najpierw dodaj punkt.');
 if(!draftsAllowed&&segments.some(s=>s.status!=='routed'))throw Error('Nie wszystkie odcinki są obliczone po OSM.');
 const pointAttrs=p=>'lat="'+p.lat.toFixed(6)+'" lon="'+p.lon.toFixed(6)+'"';
 const wpt=t.waypoints.map((p,i)=>'<wpt '+pointAttrs(p)+'><name>'+esc(p.name)+'</name><type>'+esc(M.KIND_LABELS[p.kind])+'</type><desc>Punkt '+(i+1)+'</desc></wpt>').join('');
 const tracks=segments.map((s,i)=>{
  const draft=s.status!=='routed';
  const name=(s.mode==='drive'?'Samochód':'Pieszo')+' — '+(i+1)+(draft?' — SZKIC':' — OSM');
  const desc=draft?'SZKIC PO LINII PROSTEJ — NIE UŻYWAĆ DO NAWIGACJI.':
   'Geometria z routingu OSM. Dostępność i legalność przejazdu niezweryfikowane.';
  const type=draft?'draft-'+s.mode:'osm-'+s.mode;
  return '<trk><name>'+esc(name)+'</name><desc>'+esc(desc)+'</desc><type>'+type+'</type><trkseg>'+
   s.points.map(p=>'<trkpt '+pointAttrs(p)+'></trkpt>').join('')+'</trkseg></trk>';
 }).join('');
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<gpx version="1.1" creator="NORDIC TRAIL — trasy testowe" xmlns="http://www.topografix.com/GPX/1/1">'+
 '<metadata><name>'+esc(t.name)+'</name><desc>Nie służy do nawigacji. Odcinki nieobliczone to szkice po prostej. Legalność dostępu niezweryfikowana.</desc></metadata>'+
 wpt+tracks+'</gpx>\n';
}
return Object.freeze({KEY,LEGACY_KEY,pack,unpack,load,save,routesFor,gpx});
});