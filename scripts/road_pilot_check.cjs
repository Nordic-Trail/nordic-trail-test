'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {validate}=require('./road_evidence_validate.cjs');
function within(g,box){
 if(!g||!Array.isArray(box)||box.length!==4)return false;
 let count=0;
 function scan(a){
  if(!Array.isArray(a)||!a.length)return false;
  if(a.length===2&&a.every(Number.isFinite)){
   const [x,y]=a;count++;
   return x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3];
  }
  return a.every(scan);
 }
 return scan(g.coordinates)&&count>0;
}
function checkPilot(manifest,features,today=new Date().toISOString().slice(0,10)){
 const errors=[];
 if(manifest?.schema_version!==1||manifest?.pilot_id!=='tumba-lida-botkyrka')
  errors.push('unexpected manifest');
 const box=manifest?.bbox_wgs84;
 if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)
    ||box[0]>=box[2]||box[1]>=box[3])errors.push('invalid bounding box');
 if(manifest?.legal_access_default!=='unverified')errors.push('no permission claims');
 const base=validate(features,today);
 if(!base.ok)errors.push(...base.errors);
 if(base.ok)features.features.forEach((f,i)=>{
  if(!within(f.geometry,box))errors.push('feature '+i+' outside pilot boundary');
 });
 if(manifest?.imported_source_records!==features?.features?.length)
  errors.push('record count must match reviewed evidence');
 return {ok:errors.length===0,errors,features:base.features};
}
if(require.main===module){
 try{
  const m=JSON.parse(fs.readFileSync('road-data/pilots/tumba-lida/manifest.json','utf8'));
  const data=JSON.parse(fs.readFileSync('road-data/reviewed-evidence.geojson','utf8'));
  const result=checkPilot(m,data);
  for(const e of result.errors)console.error('FAIL:',e);
  assert.ok(result.ok,'pilot source gate');
  const today=new Date().toISOString().slice(0,10);
  const demo=structuredClone(data);
  demo.features=[{
   type:'Feature',geometry:{type:'Point',coordinates:[17.85,59.19]},
   properties:{source:'NVDB',category:'maintainer',source_record_id:'SYNTHETIC-TEST-ONLY',
    description:'Synthetic point, not evidence for a real road.',
    source_url:'https://www.nvdb.se/sv/kund/hamta-aktuella-data/',
    source_checked_on:today,data_as_of:today,legal_access:'unverified',review_state:'source_checked'}
  }];
  const m1=structuredClone(m);m1.imported_source_records=1;
  assert.ok(checkPilot(m1,demo,today).ok,'synthetic inside the area');
  demo.features[0].geometry.coordinates=[18.3,59.19];
  assert.ok(!checkPilot(m1,demo,today).ok,'reject outside records');
  demo.features[0].geometry.coordinates=[17.85,59.19];
  demo.features[0].properties.legal_access='allowed';
  assert.ok(!checkPilot(m1,demo,today).ok,'reject false legal access');
  console.log('PASS: pilot contains '+result.features+' real records; spatial and legal safety gates passed');
 }catch(err){console.error('FAIL:',err.message);process.exitCode=1;}
}
module.exports={checkPilot,within};
