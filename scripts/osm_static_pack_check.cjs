'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {BOX,convert,validate}=require('./osm_static_pack.cjs');
const file='preview/osm-road-observations/data/tumba-lida.json';
const uncollected=JSON.parse(fs.readFileSync(file,'utf8'));
const sample={osm3s:{timestamp_osm_base:'2026-11-11T14:00:00Z'},elements:[
 {type:'node',id:12001,lat:59.180,lon:17.835,tags:{barrier:'gate',name:'TEST fictional marker'}},
 {type:'way',id:22001,center:{lat:59.185,lon:17.845},tags:{highway:'service',motor_vehicle:'private',name:'TEST fictional road'}},
 {type:'way',id:22002,center:{lat:59.186,lon:17.845},tags:{highway:'service',motor_vehicle:'yes'}},
 {type:'node',id:12004,lat:59.19,lon:18.3,tags:{barrier:'gate'}},
 {type:'node',id:12001,lat:59.180,lon:17.835,tags:{barrier:'gate'}}
]};
const generated=convert(sample,'2026-11-11T14:02:00Z');
const cases=[
 ['Officially sourced collected pack is valid',validate(uncollected)&&uncollected.objects.length===66],
 ['Source acquisition dates are preserved',uncollected.coverage==='collected'&&uncollected.source_as_of==='2026-11-11T17:34:24Z'],
 ['Synthetic observations transform correctly',generated.objects.length===2&&validate(generated)],
 ['Acquisition and source timestamps carried separately',generated.source_as_of===sample.osm3s.timestamp_osm_base],
 ['No legal permission claim',generated.objects.every(x=>x.legal_access==='unverified')],
 ['Barriers remain node points',generated.objects[0].location_precision==='mapped_point'&&generated.objects[0].osm_type==='node'],
 ['Restricted ways use approximate centers',generated.objects[1].location_precision==='approximate_way_center'],
 ['No restriction inferred from motor_vehicle=yes',!generated.objects.some(x=>x.osm_id===22002)],
 ['Outside region eliminated',!generated.objects.some(x=>x.osm_id===12004)],
 ['Duplicate raw OSM ID removed',generated.objects.filter(x=>x.osm_id===12001).length===1],
 ['Positive driving permission rejected',()=>{const p=structuredClone(generated);p.objects[0].legal_access='allowed';return !validate(p)}],
 ['Forbidden tag keys rejected',()=>{const p=structuredClone(generated);p.objects[0].tags.uid='1';return !validate(p)}],
 ['Invalid OSM origin rejected',()=>{const p=structuredClone(generated);p.source='ThirdParty';return !validate(p)}],
 ['Invalid metadata coverage rejected',()=>{const p=structuredClone(generated);p.coverage='approved';return !validate(p)}],
 ['Cannot forge uncollected state with data',()=>{const p=structuredClone(generated);p.coverage='not_collected';p.source_checked_at=null;p.source_as_of=null;return !validate(p)}],
 ['Reject runtime error in Overpass response',()=>{try{convert({elements:[],remark:'timeout'});return false}catch{return true}}],
 ['Reject outside bbox pack',()=>{const p=structuredClone(generated);p.objects[0].lon=18.4;return !validate(p)}],
 ['Reject unsafe embedded HTML',()=>{const p=structuredClone(generated);p.objects[0].tags.name='<img>';return !validate(p)}],
 ['Reject more than 3000 raw elements',()=>{try{convert({elements:Array(3001).fill(null)});return false}catch{return true}}],
 ['No network requests in pack builder',!fs.readFileSync('scripts/osm_static_pack.cjs','utf8').includes('fetch(')],
 ['No synthetic fixture IDs in shipped pack',!uncollected.objects.some(x=>x.osm_id===12001||x.osm_id===22001)],
 ['Bbox remains fixed to pilot',JSON.stringify(BOX)===JSON.stringify([59.155,17.81,59.203,17.875])]
];
for(const [label,item] of cases){
 const ok=typeof item==='function'?item():item;
 console.log((ok?'PASS':'FAIL')+': '+label);
 assert.ok(ok,label);
}
const categories={barrier:0,road:0,path:0};
for(const o of uncollected.objects){
 if(o.kind==='barrier')categories.barrier++;
 else if(['path','footway','cycleway'].includes(o.tags.highway))categories.path++;
 else categories.road++;
}
assert.deepEqual(categories,{barrier:29,road:26,path:11});
console.log('PASS: categories = 29 barriers, 26 roads, 11 paths');
console.log('Static OSM pack builder: '+cases.length+' PASS');
