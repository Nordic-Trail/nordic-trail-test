'use strict';
const assert=require('node:assert/strict');
const {TARGETS,examine}=require('./osm_source_sample_audit.cjs');
(async()=>{
 const requests=[];
 const mock=async(url,opts)=>{
  requests.push({url,method:opts.method});
  const isNodes=url.includes('/nodes.json?');
  const type=isNodes?'node':'way';
  const elements=TARGETS.filter(x=>x.type===type).map(x=>({
   type,id:x.id,tags:x.tags,version:1,timestamp:'2026-11-11T15:00:00Z',
   ...(x.location?{lat:x.location[0],lon:x.location[1]}:{})
  }));
  return {ok:true,status:200,text:async()=>JSON.stringify({elements})};
 };
 const report=await examine(mock);
 const checks=[
  ['Exactly 9 records checked',report.samples.length===9],
  ['Only two bounded multi-read API requests',requests.length===2],
  ['Only OSM GET calls',requests.every(x=>x.method==='GET'&&x.url.startsWith('https://api.openstreetmap.org/api/0.6/'))],
  ['All synthetic control records match',report.samples.every(x=>x.check==='same')],
  ['No contributor user IDs exposed',!JSON.stringify(report).includes('"user"')&&!JSON.stringify(report).includes('"uid"')],
  ['Source last-modified timestamps retained',report.samples.every(x=>x.osm_modified_at!==null)],
  ['All output links are original OSM object URLs',report.samples.every(x=>x.osm_link.startsWith('https://www.openstreetmap.org/'))]
 ];
 for(const [label,ok] of checks){console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label);}
})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1});
