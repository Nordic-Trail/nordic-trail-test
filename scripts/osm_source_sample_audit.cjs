'use strict';
/**
 * One-off OSM API source comparison of a small reviewed sample (9 public IDs).
 * Read-only, no user account, no OSM modification, and no app deployment.
 * Records are claims made by OSM editors, not verified legal driving access.
 */
const TARGETS=[
 {type:'node',id:226059380,tags:{barrier:'gate',access:'no'},location:[59.1679312,17.8233713]},
 {type:'node',id:972124384,tags:{barrier:'gate',access:'private'},location:[59.2017728,17.8253301]},
 {type:'node',id:2439158574,tags:{barrier:'gate',access:'private'},location:[59.2017018,17.8253015]},
 {type:'node',id:5274347045,tags:{barrier:'swing_gate',access:'yes',motor_vehicle:'no'},location:[59.1705021,17.8186104]},
 {type:'way',id:117607547,tags:{highway:'track',motor_vehicle:'no',surface:'gravel'}},
 {type:'way',id:123491155,tags:{highway:'residential',motor_vehicle:'private',name:'Finkmossvägen'}},
 {type:'way',id:5133882,tags:{highway:'residential',access:'no',name:'Grödingevägen'}},
 {type:'way',id:9664074,tags:{highway:'service',access:'no',name:'Tumba Torg'}},
 {type:'way',id:263614078,tags:{highway:'path',motor_vehicle:'no',surface:'roots'}}
];
const API='https://api.openstreetmap.org/api/0.6/';
function distanceM(a,b){
 const rad=Math.PI/180,dl=(b[0]-a[0])*rad,dlo=(b[1]-a[1])*rad;
 const h=Math.sin(dl/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dlo/2)**2;
 return 12742000*Math.asin(Math.sqrt(h));
}
async function examine(fetcher=fetch){
 const output=[],requestCounts=[];
 for(const type of ['node','way']){
  const targets=TARGETS.filter(x=>x.type===type);
  const plural=type==='node'?'nodes':'ways';
  const url=API+plural+'.json?'+plural+'='+targets.map(x=>x.id).join(',');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  let raw;
  try{
   const response=await fetcher(url,{
    method:'GET',signal:controller.signal,
    headers:{Accept:'application/json','User-Agent':'Nordic-Trail-OSM-source-review/1.0 (https://github.com/Nordic-Trail/nordic-trail-test; read only)'}
   });
   requestCounts.push({type,http:response.status});
   if(!response.ok)throw Error('OSM API '+type+' HTTP '+response.status);
   raw=await response.text();
   if(raw.length>350000)throw Error('OSM API response oversized');
  }finally{clearTimeout(timer);}
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed.elements))throw Error('Unexpected OSM API JSON');
  const originals=new Map(parsed.elements.filter(x=>x.type===type&&Number.isSafeInteger(x.id)).map(x=>[x.id,x]));
  for(const expected of targets){
   const actual=originals.get(expected.id);
   if(!actual){output.push({type,id:expected.id,check:'not_found'});continue;}
   const mismatched=Object.entries(expected.tags).filter(([k,v])=>actual.tags?.[k]!==v).map(([k,v])=>({tag:k,candidate:v,source:actual.tags?.[k]??null}));
   const distance=type==='node'&&Number.isFinite(actual.lat)&&Number.isFinite(actual.lon)?distanceM(expected.location,[actual.lat,actual.lon]):null;
   output.push({
    type,id:expected.id,check:mismatched.length===0&&!(distance!==null&&distance>5)?'same':'changed',
    mismatched_tags:mismatched,position_delta_m:distance===null?null:Math.round(distance*10)/10,
    osm_version:actual.version??null,osm_modified_at:actual.timestamp??null,
    osm_link:'https://www.openstreetmap.org/'+type+'/'+expected.id
   });
  }
 }
 return {source:'OSM API 0.6',checked_at:new Date().toISOString(),requestCounts,samples:output};
}
if(require.main===module){
 examine().then(result=>{
  console.log('OSM API sample review (OSM tags, not legal verification):');
  for(const r of result.samples)console.log(JSON.stringify(r));
  const counts=result.samples.reduce((a,x)=>(a[x.check]=(a[x.check]||0)+1,a),{});
  console.log('Result:',JSON.stringify(counts));
  console.log('Requests:',JSON.stringify(result.requestCounts));
  if(result.samples.length!==TARGETS.length)process.exitCode=1;
 }).catch(e=>{console.error('Source review unavailable:',e.message);process.exitCode=1;});
}
module.exports={TARGETS,examine};
