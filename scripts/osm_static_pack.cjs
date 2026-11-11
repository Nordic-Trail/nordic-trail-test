'use strict';
/**
 * NORDIC TRAIL — offline OSM observation pack builder.
 * Imports manually acquired Overpass JSON, never downloads or publishes itself.
 * OSM observations do NOT determine legal vehicle access.
 */
const fs=require('node:fs'),path=require('node:path');
const BOX=[59.155,17.810,59.203,17.875]; // south, west, north, east
const MAX_ELEMENTS=3000,MAX_KIND=150;
const BARRIERS=new Set(['gate','lift_gate','swing_gate','bollard']);
const RESTRICTIONS=new Set(['no','private']);
const TAGS=['barrier','highway','motor_vehicle','motorcar','access','locked','name','surface'];
function inBox(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=BOX[0]&&lat<=BOX[2]&&lon>=BOX[1]&&lon<=BOX[3];}
function validISO(s){return typeof s==='string'&&!Number.isNaN(Date.parse(s))&&/^\d{4}-\d{2}-\d{2}T/.test(s);}
function cleanTags(raw){
 const tags={};
 for(const key of TAGS){
  const value=raw?.[key];
  if(typeof value==='string'&&value.length<=120&&!/[\x00-\x1f<>]/.test(value))tags[key]=value;
 }
 return tags;
}
function validate(pack){
 if(!pack||pack.schema_version!==1||pack.area!=='tumba-lida'||pack.source!=='OpenStreetMap'||
  pack.licence!=='ODbL'||JSON.stringify(pack.bbox)!==JSON.stringify(BOX)||
  !['not_collected','collected'].includes(pack.coverage)||!Array.isArray(pack.objects)||
  pack.objects.length>2*MAX_KIND)return false;
 if(pack.coverage==='not_collected')return pack.objects.length===0&&pack.source_checked_at===null&&pack.source_as_of===null;
 if(!validISO(pack.source_checked_at)||!(pack.source_as_of===null||validISO(pack.source_as_of)))return false;
 const seen=new Set(),counts={barrier:0,restriction:0};
 for(const e of pack.objects){
  if(!e||!['barrier','restriction'].includes(e.kind)||!['node','way'].includes(e.osm_type)||
   !Number.isSafeInteger(e.osm_id)||e.osm_id<=0||!inBox(e.lat,e.lon)||
   e.legal_access!=='unverified'||e.location_precision!==(e.kind==='barrier'?'mapped_point':'approximate_way_center')||
   e.osm_type!==(e.kind==='barrier'?'node':'way')||
   !e.tags||typeof e.tags!=='object'||Array.isArray(e.tags))return false;
  if(Object.keys(e.tags).some(k=>!TAGS.includes(k)||typeof e.tags[k]!=='string'||e.tags[k].length>120||/[\x00-\x1f<>]/.test(e.tags[k])))return false;
  if(e.kind==='barrier'&&!BARRIERS.has(e.tags.barrier))return false;
  if(e.kind==='restriction'&&(!e.tags.highway||!(RESTRICTIONS.has(e.tags.motor_vehicle)||RESTRICTIONS.has(e.tags.access))))return false;
  const key=e.osm_type+'/'+e.osm_id;
  if(seen.has(key))return false;
  seen.add(key);
  if(++counts[e.kind]>MAX_KIND)return false;
 }
 return true;
}
function convert(raw,checkedAt=new Date().toISOString()){
 if(!raw||!Array.isArray(raw.elements)||raw.elements.length>MAX_ELEMENTS||
  (typeof raw.remark==='string'&&raw.remark.trim()))throw Error('Overpass data invalid, too large, or contains an error');
 if(!validISO(checkedAt))throw Error('Invalid acquisition time');
 const objects=[],counts={barrier:0,restriction:0},seen=new Set();
 for(const e of raw.elements){
  if(!e||!Number.isSafeInteger(e.id)||e.id<=0)continue;
  const tags=cleanTags(e.tags);
  let kind,lat,lon;
  if(e.type==='node'&&BARRIERS.has(tags.barrier)){kind='barrier';lat=e.lat;lon=e.lon;}
  else if(e.type==='way'&&tags.highway&&(RESTRICTIONS.has(tags.motor_vehicle)||RESTRICTIONS.has(tags.access))){
   kind='restriction';lat=e.center?.lat;lon=e.center?.lon;
  }else continue;
  if(!inBox(lat,lon)||counts[kind]>=MAX_KIND)continue;
  const key=e.type+'/'+e.id;
  if(seen.has(key))continue;
  seen.add(key);counts[kind]++;
  objects.push({kind,osm_type:e.type,osm_id:e.id,lat,lon,tags,
   legal_access:'unverified',location_precision:kind==='barrier'?'mapped_point':'approximate_way_center'});
 }
 const timestamp=raw.osm3s?.timestamp_osm_base;
 const pack={
  schema_version:1,area:'tumba-lida',coverage:'collected',bbox:BOX,
  source:'OpenStreetMap',licence:'ODbL',source_checked_at:checkedAt,
  source_as_of:validISO(timestamp)?timestamp:null,
  geometry_note:'Way locations are approximate centers, not exact legal extents',
  objects
 };
 if(!validate(pack))throw Error('Generated pack failed validation');
 return pack;
}
if(require.main===module){
 const input=process.argv[2],output=process.argv[3];
 if(!input||!output){console.error('Usage: node scripts/osm_static_pack.cjs INPUT_OVERPASS_JSON OUTPUT_PACK_JSON');process.exitCode=2;}
 else try{
  const inputBytes=fs.statSync(input).size;
  if(inputBytes>2_000_000)throw Error('Raw input larger than 2 MB');
  const pack=convert(JSON.parse(fs.readFileSync(input,'utf8')));
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(pack,null,2)+'\n');
  console.log('PASS: '+pack.objects.length+' observations exported; legal access unverified');
 }catch(error){console.error('FAIL:',error.message);process.exitCode=1;}
}
module.exports={BOX,convert,validate};
