'use strict';
const assert=require('node:assert/strict');
const {validate}=require('./road_evidence_validate.cjs');
const today='2026-11-11';
const empty={type:'FeatureCollection',schema_version:1,features:[]};
function example(){
 return {type:'FeatureCollection',schema_version:1,features:[{
  type:'Feature',geometry:{type:'LineString',coordinates:[[17.85,59.19],[17.86,59.18]]},
  properties:{source:'NVDB',category:'maintainer',source_record_id:'SYNTHETIC-NOT-REAL',
   description:'Synthetic record for tests only.',
   source_url:'https://www.nvdb.se/sv/kund/hamta-aktuella-data/',
   source_checked_on:today,data_as_of:today,legal_access:'unverified',review_state:'source_checked'}
 }]};
}
const cases=[
 ['Empty source package is valid',()=>validate(empty,today).ok],
 ['Synthetic factual record is structurally valid',()=>validate(example(),today).ok],
 ['Positive driving access is forbidden',()=>{const d=example();d.features[0].properties.legal_access='allowed';return !validate(d,today).ok;}],
 ['Third-party source URL rejected',()=>{const d=example();d.features[0].properties.source_url='https://example.com';return !validate(d,today).ok;}],
 ['Lookalike official host rejected',()=>{const d=example();d.features[0].properties.source_url='https://www.nvdb.se.evil.example';return !validate(d,today).ok;}],
 ['Invalid source/category pairing rejected',()=>{const d=example();d.features[0].properties.source='STFS';return !validate(d,today).ok;}],
 ['Official STFS record link allowed',()=>{const d=example();Object.assign(d.features[0].properties,{source:'STFS',category:'regulation_record',source_url:'https://rdt.transportstyrelsen.se/rdt/Default.aspx?UseStfs=1'});return validate(d,today).ok;}],
 ['Wrong coordinate order rejected',()=>{const d=example();d.features[0].geometry.coordinates=[[59.19,17.85],[59.18,17.86]];return !validate(d,today).ok;}],
 ['Future check rejected',()=>{const d=example();d.features[0].properties.source_checked_on='2099-01-01';return !validate(d,today).ok;}],
 ['Invalid calendar day rejected',()=>{const d=example();d.features[0].properties.data_as_of='2026-02-31';return !validate(d,today).ok;}],
 ['Duplicate source IDs rejected',()=>{const d=example();d.features.push(structuredClone(d.features[0]));return !validate(d,today).ok;}],
 ['Stale sources warned',()=>{const d=example();d.features[0].properties.source_checked_on='2026-01-01';d.features[0].properties.data_as_of='2026-01-01';const r=validate(d,today);return r.ok&&r.warnings.length===1;}],
 ['Unsafe HTML in descriptions rejected',()=>{const d=example();d.features[0].properties.description='<script>alert(1)</script>';return !validate(d,today).ok;}],
 ['Missing geometry rejected',()=>{const d=example();d.features[0].geometry=null;return !validate(d,today).ok;}],
 ['Review bypass rejected',()=>{const d=example();d.features[0].properties.review_state='approved';return !validate(d,today).ok;}]
];
for(const [label,run] of cases){const ok=run();console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label);}
console.log('Road evidence checks: '+cases.length+' PASS');
