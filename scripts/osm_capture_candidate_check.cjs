'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {ENDPOINT,PILOT,QUERY,acquire}=require('./osm_capture_candidate.cjs');
const {validate}=require('./osm_static_pack.cjs');
const cases=[
 ['Only one known HTTPS Overpass endpoint',ENDPOINT==='https://overpass-api.de/api/interpreter'],
 ['Small fixed pilot area',JSON.stringify(PILOT)===JSON.stringify([59.155,17.81,59.203,17.875])],
 ['No full way geometries',QUERY.endsWith('out center;')&&!QUERY.includes('out geom;')],
 ['No positive driving permission query',!QUERY.includes('"motor_vehicle"="yes"')],
 ['No secrets or auth',!fs.readFileSync('scripts/osm_capture_candidate.cjs','utf8').includes('Authorization')],
 ['No external writes from capture script',!fs.readFileSync('scripts/osm_capture_candidate.cjs','utf8').includes('supabase')],
];
(async()=>{
 const requests=[];
 const mock=async(url,opts)=>{
  requests.push({url,method:opts.method,credentials:opts.credentials});
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({
   elements:[{type:'node',id:99113001,lat:59.18,lon:17.84,tags:{barrier:'gate',name:'synthetic test only'}}],
   osm3s:{timestamp_osm_base:'2026-11-11T14:00:00Z'}
  })};
 };
 const pack=await acquire(mock);
 cases.push(
  ['Mock acquisition makes exactly one request',requests.length===1&&requests[0].method==='POST'],
  ['Mock result converts to reviewed schema',validate(pack)&&pack.objects.length===1],
  ['No claims about road access',pack.objects.every(x=>x.legal_access==='unverified')]
 );
 for(const [label,passed] of cases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}
 console.log('OSM candidate capture checks: '+cases.length+' PASS (mock only, no real request)');
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1;});
