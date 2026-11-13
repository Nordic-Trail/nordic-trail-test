'use strict';
// Offline-only extractor: run manually, not from a browser or on page load.
const fs=require('node:fs');
const path=require('node:path');
const BBOX=[59.155,17.81,59.203,17.885]; // south,west,north,east
const TYPES=['service','track','residential','living_street','unclassified','tertiary','secondary','primary','road'];
const STRONG=new Set(['gravel','fine_gravel','compacted','pebblestone','crushed_stone']);
const SOFT=new Set(['ground','dirt','earth','clay','sand','mud','grass','woodchips']);
const PAVED=new Set(['asphalt','paved','concrete','paving_stones','sett','cobblestone','chipseal']);
function surfaceGroup(value){
 if(STRONG.has(value))return 'gravel';
 if(SOFT.has(value))return 'ground';
 if(PAVED.has(value))return 'paved';
 return 'other';
}
function convert(source,asOf=new Date().toISOString()){
 if(!source||!Array.isArray(source.elements))throw Error('Invalid Overpass response');
 const features=[],seen=new Set();
 for(const item of source.elements){
  if(item.type!=='way'||!Number.isSafeInteger(item.id)||item.id<=0||seen.has(item.id))continue;
  const tags=item.tags||{};
  if(!TYPES.includes(tags.highway)||typeof tags.surface!=='string'||!tags.surface||!Array.isArray(item.geometry))continue;
  if(item.geometry.length<2||item.geometry.length>15000)continue;
  const coordinates=item.geometry.map(p=>[p.lon,p.lat]);
  if(!coordinates.every(p=>p.every(Number.isFinite)&&p[0]>=-180&&p[0]<=180&&p[1]>=-90&&p[1]<=90))continue;
  if(!coordinates.some(p=>p[1]>=BBOX[0]&&p[1]<=BBOX[2]&&p[0]>=BBOX[1]&&p[0]<=BBOX[3]))continue;
  const properties={osm_id:item.id,highway:tags.highway,surface:tags.surface.slice(0,80),
   category:surfaceGroup(tags.surface),tracktype:String(tags.tracktype||'').slice(0,40),
   access:String(tags.access||'').slice(0,40),motor_vehicle:String(tags.motor_vehicle||'').slice(0,40),
   name:String(tags.name||'').slice(0,100)};
  seen.add(item.id);
  features.push({type:'Feature',properties,geometry:{type:'LineString',coordinates}});
 }
 if(features.length>4500)throw Error('Too many roads for a mobile preview');
 const total=features.reduce((n,f)=>n+f.geometry.coordinates.length,0);
 if(total>160000)throw Error('Too many coordinates for a mobile preview');
 features.sort((a,b)=>a.properties.osm_id-b.properties.osm_id);
 return {type:'FeatureCollection',metadata:{schema_version:1,source:'OpenStreetMap',licence:'ODbL',
  bbox:BBOX,source_checked_at:asOf,selection:'road ways with explicitly tagged surface only',
  legal_access:'unverified'},features};
}
async function run(){
 const south=BBOX[0],west=BBOX[1],north=BBOX[2],east=BBOX[3];
 const query='[out:json][timeout:40];way["highway"~"^('+TYPES.join('|')+')$"]["surface"]('+[south,west,north,east].join(',')+');out geom;';
 const endpoint=process.env.OVERPASS_URL||'https://overpass.kumi.systems/api/interpreter';
 const url=new URL(endpoint);
 if(url.protocol!=='https:')throw Error('HTTPS Overpass endpoint required');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
 try{
  const response=await fetch(url,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',
   'User-Agent':'NordicTrailSurfacePrototype/1.0 (offline experimental OSM data selection)'},body:new URLSearchParams({data:query})});
  if(!response.ok)throw Error('Overpass HTTP '+response.status);
  const len=Number(response.headers.get('content-length')||0);
  if(len>11000000)throw Error('Overpass response too large');
  const text=await response.text();
  if(text.length>11000000)throw Error('Overpass response too large');
  const result=convert(JSON.parse(text));
  if(result.features.length===0)throw Error('No tagged roads returned; keep existing data untouched');
  const serialized=JSON.stringify(result);
  if(Buffer.byteLength(serialized)>3500000)throw Error('Generated GeoJSON too large');
  const dest=path.join(__dirname,'..','staging-surfaces','data','tumba-lida-surface.geojson');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,serialized+'\n','utf8');
  const totals={};for(const f of result.features)totals[f.properties.category]=(totals[f.properties.category]||0)+1;
  console.log('Created '+result.features.length+' real OSM ways, '+serialized.length+' bytes: '+JSON.stringify(totals));
  console.log('Review the dataset and its ODbL notice before committing it.');
 }finally{clearTimeout(timer);}
}
module.exports={BBOX,TYPES,surfaceGroup,convert};
if(require.main===module)run().catch(error=>{console.error('FAILED:',error.message);process.exitCode=1});
