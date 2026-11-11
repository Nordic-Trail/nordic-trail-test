'use strict';
/**
 * One-off GitHub Actions acquisition of a small OSM snapshot, never from a user phone.
 * No API keys, no repeated requests, no DB access, no automatic deployment.
 */
const fs=require('node:fs'),path=require('node:path');
const {convert,validate}=require('./osm_static_pack.cjs');
const ENDPOINT='https://overpass-api.de/api/interpreter';
const PILOT=[59.155,17.810,59.203,17.875];
const QUERY='[out:json][timeout:40][maxsize:53687091];(node["barrier"~"^(gate|lift_gate|swing_gate|bollard)$"]('+
 PILOT.join(',')+');way["highway"]["motor_vehicle"~"^(no|private)$"]('+PILOT.join(',')+
 ');way["highway"]["access"~"^(no|private)$"]('+PILOT.join(',')+'););out center;';
const MAX_BYTES=2_000_000;
async function acquire(fetcher=fetch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),75000);
 try{
  const response=await fetcher(ENDPOINT,{
   method:'POST',body:new URLSearchParams({data:QUERY}),signal:controller.signal,
   headers:{'User-Agent':'NORDIC-TRAIL-road-evidence-pilot/1.0 (https://github.com/Nordic-Trail/nordic-trail-test; single request)'}
  });
  if(!response.ok)throw Error('Overpass HTTP '+response.status);
  const declared=Number(response.headers?.get('content-length'));
  if(Number.isFinite(declared)&&declared>MAX_BYTES)throw Error('Overpass response too large');
  const body=await response.text();
  if(Buffer.byteLength(body,'utf8')>MAX_BYTES)throw Error('Overpass response exceeded size limit');
  const decoded=JSON.parse(body);
  const pack=convert(decoded,new Date().toISOString());
  if(!validate(pack))throw Error('Candidate pack failed contract validation');
  return pack;
 }finally{clearTimeout(timer);}
}
if(require.main===module){
 const out=process.argv[2]||'out/osm-tumba-lida-candidate.json';
 acquire().then(pack=>{
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(pack,null,2)+'\n','utf8');
  console.log('Candidate pack created outside the published site.');
  console.log('OSM barrier observations:',pack.objects.filter(x=>x.kind==='barrier').length);
  console.log('OSM tagged-way observations:',pack.objects.filter(x=>x.kind==='restriction').length);
  console.log('Acquired at:',pack.source_checked_at);
  console.log('Source timestamp:',pack.source_as_of||'not supplied');
  console.log('Legal access: unverified; upload artifact only, no deployment.');
 }).catch(err=>{console.error('OSM candidate acquisition unsuccessful:',err.name+': '+err.message);process.exitCode=1;});
}
module.exports={ENDPOINT,PILOT,QUERY,acquire};
