'use strict';
/* Road source audit, not permission to drive. No network access, API key or write operation. */
const fs=require('node:fs');
const CATEGORIES={
 NVDB:new Set(['maintainer','road_width','surface','physical_obstacle','traffic_restriction','direction_restriction','state_subsidy']),
 STFS:new Set(['regulation_record'])
};
const HOSTS={
 NVDB:new Set(['nvdb.se','www.nvdb.se','nvdbpakarta.trafikverket.se','www.trafikverket.se','trafikverket.se','bransch.trafikverket.se']),
 STFS:new Set(['www.transportstyrelsen.se','transportstyrelsen.se','rdt.transportstyrelsen.se','stfs.se','www.stfs.se'])
};
function dateOK(d,today){
 if(typeof d!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(d)||d>today)return false;
 const parsed=new Date(d+'T00:00:00Z');
 return Number.isFinite(+parsed)&&parsed.toISOString().slice(0,10)===d;
}
function textOK(s,max){
 return typeof s==='string'&&s.length>0&&s.length<=max&&s.trim()===s&& !/[<>\u0000-\u001f]/.test(s);
}
function urlOK(s,source){
 try{
  const u=new URL(s);
  return s.length<=600&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&HOSTS[source]?.has(u.hostname)===true;
 }catch{return false;}
}
function geometryOK(g){
 const depths={Point:0,MultiPoint:1,LineString:1,MultiLineString:2,Polygon:2,MultiPolygon:3};
 if(!g||typeof g!=='object'||!Object.hasOwn(depths,g.type))return false;
 let count=0;
 function walk(a,depth){
  if(depth===0){
   if(!Array.isArray(a)||a.length!==2||!a.every(Number.isFinite))return false;
   const [lon,lat]=a;
   count++;
   return lon>=10&&lon<=25.5&&lat>=54.5&&lat<=69.8&&count<=50000;
  }
  return Array.isArray(a)&&a.length>0&&a.every(b=>walk(b,depth-1));
 }
 if(!walk(g.coordinates,depths[g.type]))return false;
 if(g.type==='LineString'&&g.coordinates.length<2)return false;
 if(g.type==='MultiLineString'&&g.coordinates.some(line=>line.length<2))return false;
 if(g.type==='Polygon'&&g.coordinates.some(ring=>ring.length<4))return false;
 if(g.type==='MultiPolygon'&&g.coordinates.some(poly=>poly.some(ring=>ring.length<4)))return false;
 return true;
}
function validate(doc,today=new Date().toISOString().slice(0,10)){
 const errors=[],warnings=[];
 if(!doc||doc.type!=='FeatureCollection'||doc.schema_version!==1||!Array.isArray(doc.features))
  return {ok:false,errors:['Expected FeatureCollection with schema_version 1'],warnings,features:0};
 if(doc.features.length>5000)return {ok:false,errors:['Too many features; split verified area packs'],warnings,features:doc.features.length};
 const ids=new Set();
 doc.features.forEach((f,i)=>{
  const label='feature['+i+']';
  if(!f||f.type!=='Feature'||!f.properties||typeof f.properties!=='object'){
   errors.push(label+': invalid GeoJSON Feature');return;
  }
  const p=f.properties;
  if(!geometryOK(f.geometry))errors.push(label+': invalid WGS84 geometry or coordinates');
  if(!CATEGORIES[p.source]?.has(p.category))errors.push(label+': unrecognized source and category');
  if(!textOK(p.source_record_id,160))errors.push(label+': source_record_id required');
  if(!textOK(p.description,250))errors.push(label+': source description required');
  if(!urlOK(p.source_url,p.source))errors.push(label+': official HTTPS source URL required');
  if(!dateOK(p.source_checked_on,today))errors.push(label+': source_checked_on must be a real nonfuture date');
  if(!dateOK(p.data_as_of,today))errors.push(label+': data_as_of must be a real nonfuture date');
  if(p.source_checked_on<p.data_as_of)errors.push(label+': source checked before source data date');
  if(p.legal_access!=='unverified')errors.push(label+': must not claim legal access');
  if(p.review_state!=='source_checked')errors.push(label+': not source-checked');
  const id=p.source+':'+p.source_record_id;
  if(ids.has(id))errors.push(label+': duplicate source ID');
  ids.add(id);
  if(dateOK(p.source_checked_on,today)){
   const days=(Date.parse(today+'T00:00:00Z')-Date.parse(p.source_checked_on+'T00:00:00Z'))/86400000;
   if(days>90)warnings.push(label+': source checked over 90 days ago; recheck');
  }
 });
 return {ok:errors.length===0,errors,warnings,features:doc.features.length};
}
if(require.main===module){
 const path=process.argv[2]||'road-data/reviewed-evidence.geojson';
 try{
  const result=validate(JSON.parse(fs.readFileSync(path,'utf8')));
  result.errors.forEach(x=>console.error('FAIL:',x));
  result.warnings.forEach(x=>console.warn('WARN:',x));
  console.log((result.ok?'PASS':'FAIL')+': '+result.features+' official-source features');
  process.exitCode=result.ok?0:1;
 }catch(err){console.error('FAIL:',err.message);process.exitCode=1;}
}
module.exports={validate};
