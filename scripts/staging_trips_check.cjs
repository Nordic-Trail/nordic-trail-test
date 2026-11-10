'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'..','staging-trips');
const M=require(path.join(dir,'route-model.js'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS: '+name);}
let trip=M.emptyTrip();
check('Empty trip',()=>assert.equal(trip.waypoints.length,0));
trip=M.add(trip,{lat:59.3,lon:18.1,name:'Dom & <start>',kind:'start',mode:'none'});
trip=M.add(trip,{lat:59.4,lon:18.2,name:'Parking',kind:'parking',mode:'drive'});
trip=M.add(trip,{lat:59.5,lon:18.3,name:'Biwak',kind:'camp',mode:'walk'});
check('Car plus foot',()=>assert.deepEqual(M.segments(trip).map(s=>s.mode),['drive','walk']));
check('Track GPX and XML escaping',()=>{
 const xml=M.gpx(trip);
 assert.equal((xml.match(/<trk>/g)||[]).length,2);
 assert.equal((xml.match(/<wpt /g)||[]).length,3);
 assert.ok(xml.includes('Dom &amp; &lt;start&gt;'));
});
check('Coordinates validation',()=>assert.throws(()=>M.add(trip,{lat:100,lon:18,kind:'camp',mode:'walk'})));
check('Reordering repairs first waypoint',()=>{
 const moved=M.move(trip,'p2',-1);assert.equal(moved.waypoints[0].mode,'none');
});
check('Point edit',()=>{
 const updated=M.change(trip,'p3',{mode:'drive',name:'Meta',kind:'finish'});
 assert.equal(updated.waypoints[2].name,'Meta');assert.equal(updated.waypoints[2].mode,'drive');
});
check('Removing point',()=>assert.equal(M.remove(trip,'p2').waypoints.length,2));
check('Persist JSON round-trip',()=>assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(trip))),trip));
check('JS syntax',()=>{
 const snippets=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
 assert.equal(snippets.length,1);assert.doesNotThrow(()=>new vm.Script(snippets[0]));
});
check('No app network data submission',()=>{
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|navigator\.geolocation|\.rpc\s*\(/.test(html));
 assert.ok(html.includes('localStorage.setItem'));
});
check('Start marker and map fitting controls exist',()=>{
 assert.ok(html.includes('id="fit-trip"'));
 assert.ok(html.includes("button('Pokaż na mapie',()=>showPointOnMap(p.id))"));
 assert.ok(html.includes("i===0?' start':''"));
 assert.ok(html.includes('fitAllPoints();'));
});
check('UI includes all controls',()=>{
 for(const id of ['start-pick','cancel-pick','point-name','point-kind','point-mode','visible-drive','visible-walk','save-local','export-gpx','points'])assert.ok(html.includes('id="'+id+'"'));
});
// Exercise fitAllPoints with mock Leaflet geometry: the original start must remain in bounds.
check('Fit map includes original start and the new point',()=>{
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean)[0];
 const begin=inline.indexOf('function fitAllPoints(){');
 const end=inline.indexOf('function showPointOnMap(id){',begin);
 assert.ok(begin>=0&&end>begin);
 const bounds=[];
 const ctx={trip:{waypoints:[{lat:59.30801,lon:18.08823},{lat:59.4,lon:18.2}]},map:{
  fitBounds:(b,opts)=>bounds.push({b,opts}),setView:()=>{throw Error('Unexpected setView')}},
  L:{latLngBounds:points=>points}};
 vm.runInNewContext(inline.slice(begin,end)+';this.didFit=fitAllPoints();',ctx);
 assert.equal(ctx.didFit,true);
 assert.equal(bounds.length,1);
 assert.deepEqual(Array.from(bounds[0].b[0]),[59.30801,18.08823]);
 assert.deepEqual(Array.from(bounds[0].b[1]),[59.4,18.2]);
});
console.log('STAGING Trips checks: '+passed+' PASS');
