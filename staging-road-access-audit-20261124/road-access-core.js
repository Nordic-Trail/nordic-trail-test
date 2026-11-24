/* Experimental classification gate. Not connected to route calculation.
Inputs are normalized source evidence, not raw Valhalla/NVDB responses.
No positive result constitutes legal or physical clearance. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NTRoadAudit=api;})(globalThis,function(){
'use strict';
const restricted=new Set(['no','private','agricultural','forestry','delivery','customers','permit','emergency','official','military','bus']);
const allowed=new Set(['yes','designated','permissive']);
const paths=new Set(['footway','cycleway','path','steps','bridleway','pedestrian','corridor']);
const roads=new Set(['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link','track']);
function assess(e={}){
 const tags=e.osm||{},h=String(tags.highway||'');
 const result=(status,reason)=>({status,reason,legalAccess:'unverified',surface:tags.surface||null,width:tags.width??null});
 if(e.restriction==='confirmed_for_context')return result('exclude','Zgłoszony zakaz dla badanego rodzaju ruchu i kontekstu.');
 if(e.conflict===true||e.match!=='exact'||e.restriction==='unknown_conflict')return result('review','Niepewne dopasowanie lub sprzeczne źródła.');
 const keys=['motorcar','motor_vehicle','vehicle','access'];
 const access=keys.map(k=>tags[k]).find(v=>v!==undefined&&v!==null&&v!=='');
 const specific=keys.slice(0,3).map(k=>tags[k]).find(v=>v!==undefined&&v!==null&&v!=='');
 if(Object.keys(tags).some(k=>keys.some(a=>k.startsWith(a+':')))||tags.oneway==='-1'||tags.oneway==='yes'||tags.oneway==='1'||tags.oneway==='reversible'||tags.oneway==='alternating')return result('review','Warunkowe lub kierunkowe ograniczenia wymagają osobnej kontroli.');
 if(restricted.has(access))return result('exclude','Ograniczenie dostępu w OSM; nie kwalifikujemy do zwykłego przejazdu.');
 if(access!==undefined&&access!=='destination'&&!allowed.has(access))return result('review','Nieznana wartość dostępu.');
 if(tags.barrier||e.barrier===true)return result('review','Przeszkoda lub szlaban wymagają sprawdzenia.');
 if(paths.has(h)||tags.footway==='sidewalk'){
  if(allowed.has(specific)||e.nvdbNetwork==='motor')return result('review','Ścieżka z niespójną informacją o dostępie samochodowym.');
  return result('exclude','Odcinek pieszy, rowerowy lub inny nieprzeznaczony do zwykłej trasy samochodowej.');
 }
 if(e.nvdbNetwork==='walk'||e.nvdbNetwork==='cycle')return result(roads.has(h)?'review':'exclude','Sieć NVDB nie jest samochodowa.');
 if(!roads.has(h))return result('review','Brak rozpoznanej klasy drogi samochodowej.');
 if(access==='destination'||e.restriction==='destination_only'){
  const c=e.localAccess;
  if(c?.purpose==='through')return result('exclude','Ograniczenie tranzytu — nie stosuj jako skrótu.');
  if(!c||!['arrival','departure'].includes(c.purpose)||c.endpointMatch!=='confirmed'||c.exceptionEvidence!=='confirmed_for_context'||typeof c.zoneId!=='string'||!c.zoneId.trim())return result('review','Ograniczenie tranzytu — sprawdź warunki dojazdu lokalnego.');
  return result('candidate','Dojazd lub wyjazd lokalny — przejazd nadal niezweryfikowany.');
 }
 if(h==='track'&&!allowed.has(specific)&&e.nvdbNetwork!=='motor')return result('review','Droga gruntowa bez niezależnego wskazania dostępu samochodowego.');
 return result('candidate','Klasyfikacja nie wyklucza odcinka; przejazd i ograniczenia nadal niezweryfikowane.');
}
function assessRoute(edges){
 if(!Array.isArray(edges)||!edges.length)return {status:'review',edges:[],legalAccess:'unverified'};
 const isLocal=e=>['motorcar','motor_vehicle','vehicle','access'].map(k=>e?.osm?.[k]).find(v=>v!==undefined&&v!==null&&v!=='')==='destination'||e?.restriction==='destination_only';
 const results=edges.map((e,i)=>{
  const r=assess(e);
  if(r.status!=='candidate'||!isLocal(e))return r;
  const c=e.localAccess;
  const same=x=>isLocal(x)&&x.localAccess?.zoneId===c.zoneId&&x.localAccess?.purpose===c.purpose&&assess(x).status==='candidate';
  const terminal=c.purpose==='arrival'?edges.slice(i).every(same):edges.slice(0,i+1).every(same);
  return terminal?r:{...r,status:'review',reason:'Odcinek lokalny nie prowadzi bezpośrednio do właściwego końca trasy.'};
 });
 return {status:results.some(x=>x.status==='exclude')?'exclude':results.some(x=>x.status==='review')?'review':'candidate',edges:results,legalAccess:'unverified'};
}
return Object.freeze({assess,assessRoute});
});