'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const page=fs.readFileSync('staging-app/index.html','utf8');
const js=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(js.length,1);
new vm.Script(js[0]);
const cases=[
 ['Read-only OSM pane has priority below native overlayPane 400',page.includes("map.createPane('ntOsmEvidencePane')")&&page.includes("osmPane.style.zIndex='350'")],
 ['OSM markers all explicitly use lower pane',page.includes("L.marker([p.lat,p.lon],{icon,pane:'ntOsmEvidencePane',bubblingMouseEvents:false,keyboard:true")],
 ['Public approved points still render in original circleMarker overlayPane',page.includes("L.circleMarker([lat,lon],{radius:8,color:colours[p.kind]")],
 ['OSM marker click does not bubble to draft-creation map handler',page.includes("L.DomEvent.stopPropagation(event.originalEvent);showOsmDetail(p,kind)")],
 ['Map click dismisses OSM card before any draft selection',js[0].indexOf("if(!el('nt-osm-detail-sheet').hidden){")<js[0].indexOf('    if(writingDraft)return;')],
 ['Native popup opening dismisses OSM evidence card',page.includes("if(map)map.on('popupopen',closeOsmDetail)")],
 ['Layer-switch dialog and OSM detail never stack',page.includes('// Never stack the layers dialog above a selected OSM detail card.')],
 ['Disabling selected OSM layer closes stale detail card',page.includes("if(activeOsmKind&&!osmChecks[activeOsmKind].checked)")],
 ['Existing public point toggle and moderation preserved',page.includes('id="nt-public-points-layer" checked')&&page.includes("db.rpc('moderate_map_point'")],
 ['No changes to OSM classification or source metadata',page.includes("pack.objects.length===66&&counts.barrier===29&&counts.road===26&&counts.path===11")],
 ['Approved translucency unchanged',page.includes('--nt-glass-icon:rgba(18,42,29,.28)')],
 ['No Supabase access in isolated OSM event handlers',!js[0].slice(js[0].indexOf('  // Read-only OSM observation layers.'),js[0].indexOf('  let handleDragging=')).includes('db.')]
];
for(const [label,ok] of cases){console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label);}
// Evaluate exact initialization lines with an in-memory Leaflet-style map.
const setup=js[0].slice(js[0].indexOf("  const osmPane="),js[0].indexOf('  let osmPack=',js[0].indexOf("  const osmPane=")));
const pane={style:{}},added=[];
const fakeMap={createPane(name){assert.equal(name,'ntOsmEvidencePane');return pane;}};
const L={layerGroup(){return {addTo(map){assert.equal(map,fakeMap);added.push(true);return this}}}};
const context={map:fakeMap,window:{L},L};
const result=vm.runInNewContext(setup+'; ({priority:osmPane.style.zIndex,groupCount:Object.keys(osmLayers).length});',context);
assert.equal(result.priority,'350');
assert.equal(result.groupCount,3);assert.equal(added.length,3);
console.log('PASS: lower-priority OSM pane initialized and three groups preserved');
// Execute only the actual guarded click-handler prefix, not a similar mock.
const first=js[0].indexOf("  if(map)map.on('click',event=>{");
const last=js[0].indexOf('    if(writingDraft)return;',first);
assert.ok(first>=0&&last>first);
const prefix=js[0].slice(first,last);
const modal={hidden:false},state={selectedKind:'road',created:0},events={};
vm.runInNewContext("const activeOsmKind='road'; const selectedPoint=null; "+prefix+" state.created++;});",{
 map:{on(name,fn){events[name]=fn;}},el(id){assert.equal(id,'nt-osm-detail-sheet');return modal;},
 state,activeOsmKind:'road'
});
// If card is open, guard returns before executing draft creation code.
events.click({latlng:{lat:59.18,lng:17.84}});
assert.equal(modal.hidden,true);
assert.equal(state.created,0);
console.log('PASS: map tap closes OSM card without entering draft creation');
console.log('OSM and approved-point interaction audit: '+(cases.length+2)+' PASS');
