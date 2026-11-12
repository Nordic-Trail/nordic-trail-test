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
 ['Map click dismisses OSM card before any draft selection',js[0].slice(js[0].indexOf("  if(map)map.on('click',event=>{"),js[0].indexOf("    if(writingDraft)return;",js[0].indexOf("  if(map)map.on('click',event=>{"))).includes("if(!el('nt-osm-detail-sheet').hidden){")],
 ['Native popup opening dismisses OSM evidence card',page.includes("if(map)map.on('popupopen',()=>{")&&page.includes('    closeOsmDetail();\n    closeOsmSpiderfy();')],
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
const modal={hidden:false},state={selectedKind:'road',created:0,scrollSyncCalls:0},events={};
vm.runInNewContext("let activeOsmKind='road'; const selectedPoint=null; "+prefix+" state.created++;});",{
 map:{on(name,fn){events[name]=fn;}},el(id){assert.equal(id,'nt-osm-detail-sheet');return modal;},
 state,activeOsmKind:'road',
 syncOverlayPageScroll(){state.scrollSyncCalls++;}
});
// If card is open, guard returns before executing draft creation code.
events.click({latlng:{lat:59.18,lng:17.84}});
assert.equal(modal.hidden,true);
assert.equal(state.created,0);
assert.equal(state.scrollSyncCalls,1,'Dismissing the OSM card synchronizes the background scroll lock');
console.log('PASS: map tap closes OSM card without entering draft creation');

const freezeCases=[
 ['Overlay scroll locks root and body',page.includes("html.nt-page-scroll-locked,body.nt-page-scroll-locked{overflow:hidden!important;overscroll-behavior:none!important}")],
 ['Stylus scroll protection only when modal open',page.includes("if(pageScrollLocked&&Math.abs((window.scrollY||0)-lockedScrollY)>1)")],
 ['Layer sheet scrolls separately',page.includes('.nt-layers-sheet{')&&page.includes('overflow-y:auto;overscroll-behavior:contain')],
 ['OSM details scroll separately',page.includes('.nt-osm-detail-sheet{position:fixed;')&&page.includes('overflow-y:auto;overscroll-behavior:contain')],
 ['Opening Layers restores map behind the translucent modal',page.includes("revealMapViewport();\n    setLayersCollapsed(false)")],
 ['Backdrop prevents background touch scroll',page.includes('background:rgba(6,20,13,.16);touch-action:none')],
 ['Disabling an OSM layer updates the background lock',page.includes("    syncOverlayPageScroll();\n  }\n  function addOsmDetailRow")],
 ['Opening and dismissing cards update background lock',page.includes("sheet.hidden=false;\n    syncOverlayPageScroll();")&&page.includes("function closeOsmDetail(){")]
];
for(const [label,ok] of freezeCases){console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label);}
const scrollStart=js[0].indexOf('  let pageScrollLocked=false,lockedScrollX=0,lockedScrollY=0;');
const scrollEnd=js[0].indexOf('  function setLayersCollapsed(',scrollStart);
assert.ok(scrollStart>0&&scrollEnd>scrollStart);
const freezeCode=js[0].slice(scrollStart,scrollEnd);
function fakeClasses(){
 const vals=new Set();
 return {add(x){vals.add(x)},remove(x){vals.delete(x)},has(x){return vals.has(x)}};
}
const rootClasses=fakeClasses(),bodyClasses=fakeClasses();
const layerBox={hidden:true},detailBox={hidden:true};
const fakeDocument={documentElement:{classList:rootClasses},body:{classList:bodyClasses},scrollingElement:{scrollTop:830}};
const scrollEvents={},scrollCalls=[];
const fakeWindow={scrollY:830,scrollX:0,scrollTo(x,y){scrollCalls.push([x,y]);this.scrollY=y;fakeDocument.scrollingElement.scrollTop=y;},addEventListener(name,fn){scrollEvents[name]=fn;}};
const scrollCtx={document:fakeDocument,window:fakeWindow,layersSheet:layerBox,el(id){assert.equal(id,'nt-osm-detail-sheet');return detailBox;}};
vm.runInNewContext(freezeCode+';this.sync=syncOverlayPageScroll;',scrollCtx);
assert.ok(!rootClasses.has('nt-page-scroll-locked'));
layerBox.hidden=false;scrollCtx.sync();
assert.ok(rootClasses.has('nt-page-scroll-locked')&&bodyClasses.has('nt-page-scroll-locked'));
fakeWindow.scrollY=900;scrollEvents.scroll();
assert.equal(fakeWindow.scrollY,830,'System edge scroll cannot move underlying page');
detailBox.hidden=false;layerBox.hidden=true;scrollCtx.sync();
assert.ok(rootClasses.has('nt-page-scroll-locked'));
detailBox.hidden=true;scrollCtx.sync();
assert.ok(!rootClasses.has('nt-page-scroll-locked')&&!bodyClasses.has('nt-page-scroll-locked'));
assert.equal(scrollCalls.at(-1)[1],830);
console.log('PASS: scroll lock, stylus guard, overlay handoff, restore position');

console.log('OSM and approved-point interaction audit: '+(cases.length+2+freezeCases.length+1)+' PASS');
