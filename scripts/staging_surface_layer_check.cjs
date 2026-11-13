'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {convert,surfaceGroup,BBOX}=require('./build_tumba_lida_surfaces.cjs');
const sample=(id,highway,surface)=>({type:'way',id,tags:{highway,surface},
 geometry:[{lat:59.16,lon:17.85},{lat:59.17,lon:17.86}]});
assert.deepEqual(BBOX,[59.155,17.81,59.203,17.885]);
for(const [tag,group] of [['gravel','gravel'],['fine_gravel','gravel'],['compacted','gravel'],
 ['earth','ground'],['clay','ground'],['sand','ground'],['asphalt','paved'],['concrete','paved'],
 ['roots','other']])assert.equal(surfaceGroup(tag),group);
const data=convert({elements:[sample(1,'track','gravel'),sample(2,'service','asphalt'),
 sample(3,'footway','clay'),sample(4,'service',''),sample(1,'track','gravel'),
 {...sample(5,'track','clay'),geometry:[{lat:0,lon:0},{lat:0.1,lon:0.1}]}]});
assert.equal(data.type,'FeatureCollection');
assert.equal(data.metadata.legal_access,'unverified');
assert.equal(data.features.length,2,'No footway, absent tag, duplicate or outside bbox');
assert.equal(data.features[0].properties.osm_id,1);
assert.deepEqual(data.features[0].geometry.coordinates,[[17.85,59.16],[17.86,59.17]]);
const html=fs.readFileSync('staging-surfaces/index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0]));
assert.ok(html.includes("fetch('data/tumba-lida-surface.geojson',{cache:'no-store',credentials:'omit'})"));
assert.ok(html.includes('Nie wyświetlam danych zastępczych.'));
assert.ok(html.includes('p.surface')&&html.includes("el('detail').textContent="));
assert.ok(!html.includes('supabase')&&!html.includes('localStorage.'));
assert.ok(!html.includes('valhalla1.openstreetmap.de'));
assert.ok(html.includes('weight:3'));
console.log('PASS: STAGING surface-prototype safety, classifier, input and UI checks');
