/* node staging-trips-v3/test-model-v3.js */
const assert=require('node:assert/strict');
const M=require('./trip-model-v3.js');
const p=(lat,lon,name)=>({lat,lon,name});
const start=p(59,17,'Dom'),parking=p(59.1,17.1,'Parking'),lake=p(59.11,17.11,'Jezioro');
let count=0;
function test(name,fn){try{fn();console.log('PASS',name);count++;}catch(e){console.error('FAIL',name);throw e;}}
function example(){
 let t=M.initial('Wyprawa testowa');
 t=M.addLeg(t,'drive',start,parking);
 t=M.addLeg(t,'walk',parking,lake);
 t=M.addLeg(t,'drive',parking,start);
 return t;
}
test('three independently named legs and ordered itinerary',()=>{
 const t=example();assert.equal(t.itinerary.length,3);
 assert.deepEqual(t.itinerary.map(id=>t.legs[id].mode),['drive','walk','drive']);
});
test('walking edit never mutates driving leg',()=>{
 let t=example(),ids=t.itinerary,before=JSON.stringify(t.legs[ids[0]]);
 t=M.movePoint(t,ids[1],t.legs[ids[1]].points[0].id,{lat:59.2,lon:17.2});
 assert.equal(JSON.stringify(t.legs[ids[0]]),before);
});
test('driving edit never mutates walking leg',()=>{
 let t=example(),ids=t.itinerary,before=JSON.stringify(t.legs[ids[1]]);
 t=M.movePoint(t,ids[0],t.legs[ids[0]].points[1].id,{lat:59.2,lon:17.2});
 assert.equal(JSON.stringify(t.legs[ids[1]]),before);
});
test('toggle visibility never changes leg data',()=>{
 let t=example(),before=JSON.stringify(t.legs);
 t=M.toggle(M.toggle(t,'walk',false),'drive',false);
 assert.equal(JSON.stringify(t.legs),before);assert.deepEqual(t.visible,{drive:false,walk:false});
});
test('return-to-car inconsistency detected',()=>{
 const t=example();assert(M.diagnostics(t).some(x=>x.code==='CAR_NOT_AT_WALK_END'));
});
test('matching adjoining ends have no transfer gap',()=>{
 let t=M.initial();t=M.addLeg(t,'drive',start,parking);t=M.addLeg(t,'walk',parking,parking);
 assert(!M.diagnostics(t).some(x=>x.code==='TRANSFER_GAP'));
});
test('moving linked endpoint flags a stale link',()=>{
 let t=example(),ids=t.itinerary;
 t=M.link(t,t.legs[ids[0]].points[1].id,t.legs[ids[1]].points[0].id);
 t=M.movePoint(t,ids[1],t.legs[ids[1]].points[0].id,{lat:59.2});
 assert(M.diagnostics(t).some(x=>x.code==='LINK_MOVED'));
});
test('foreign point cannot be edited',()=>{
 let t=example(),ids=t.itinerary;
 assert.throws(()=>M.movePoint(t,ids[0],t.legs[ids[1]].points[0].id,{lat:59.3}));
});
test('adding intermediate point only affects its leg',()=>{
 let t=example(),ids=t.itinerary,before=JSON.stringify(t.legs[ids[1]]);
 t=M.addVia(t,ids[0],p(59.05,17.05,'Postój'));assert.equal(t.legs[ids[0]].points.length,3);
 assert.equal(JSON.stringify(t.legs[ids[1]]),before);
});
test('removing intermediate point does not affect other legs',()=>{
 let t=example(),ids=t.itinerary,before=JSON.stringify(t.legs[ids[1]]);
 t=M.addVia(t,ids[0],p(59.05,17.05,'Postój'));
 t=M.removeVia(t,ids[0],t.legs[ids[0]].points[1].id);
 assert.equal(JSON.stringify(t.legs[ids[1]]),before);
});
test('cannot remove start or finish by removeVia',()=>{
 let t=example(),id=t.itinerary[0];assert.throws(()=>M.removeVia(t,id,t.legs[id].points[0].id));
});
test('reordering does not change leg geometry',()=>{
 let t=example(),before=JSON.stringify(t.legs);
 t=M.reorder(t,[...t.itinerary].reverse());
 assert.equal(JSON.stringify(t.legs),before);
});
test('reject duplicate and unknown IDs in itinerary',()=>{
 const t=example(),ids=t.itinerary;
 assert.throws(()=>M.reorder(t,[ids[0],ids[0],ids[2]]));
 assert.throws(()=>M.reorder(t,[ids[0],ids[1],'unknown']));
});
test('GPX has distinct numbered tracks and labels drafts',()=>{
 const s=M.gpx(example());
 assert.equal((s.match(/<trk>/g)||[]).length,3);
 assert(s.includes('1. Samochód'));assert(s.includes('2. Pieszo'));assert(s.includes('SZKIC'));
});
test('GPX escapes untrusted trip names',()=>{
 let t=M.initial('<Wyprawa & test>');t=M.addLeg(t,'walk',start,lake);
 const g=M.gpx(t);assert(g.includes('&lt;Wyprawa &amp; test&gt;'));
});
test('malformed coordinates are rejected',()=>{
 const t=M.initial();assert.throws(()=>M.addLeg(t,'drive',p(91,17),parking));
});
test('deleting a linked leg removes its links',()=>{
 let t=example(),ids=t.itinerary;
 t=M.link(t,t.legs[ids[0]].points[1].id,t.legs[ids[1]].points[0].id);
 t=M.removeLeg(t,ids[1]);assert.equal(t.links.length,0);
});
test('roundtrip serialization yields valid model',()=>{
 const t=example();assert.deepEqual(M.check(JSON.parse(JSON.stringify(t))),t);
});
console.log('ALL TESTS PASSED:',count);
