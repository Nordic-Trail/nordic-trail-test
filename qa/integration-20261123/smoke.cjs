'use strict';
// Run from repository root: node qa/integration-20261123/smoke.cjs
// No external dependencies, real credentials, network calls, or database mutations.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const original=read('staging-app/index.html');
const host=read('staging-integration-20261123/index.html');
const planner=read('staging-integration-20261123/planner.html');
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const duplicateIds=s=>ids(s).filter((x,i,a)=>a.indexOf(x)!==i);
assert.deepEqual(duplicateIds(host),[],'Host must have unique id attributes');
assert.deepEqual(duplicateIds(planner),[],'Planner must have unique id attributes');
for(const id of ids(original)){
 assert.ok(ids(host).includes(id),'Existing map UI element missing: '+id);
}
for(const id of ['map-layers-sheet','point-sheet','login-card','admin-queue-card','draft-card']){
 assert.ok(host.includes('id="'+id+'"'),id+' should remain available');
}
assert.ok(host.includes("frame-src 'self'"),'Frame must be restricted to same origin');
assert.ok(host.includes('data-src="./planner.html"'),'Embedded planner must load lazily');
assert.ok(host.includes("e.origin!==window.location.origin||e.source!==frame.contentWindow"),
 'Cross-frame message must verify origin and source');
assert.ok(host.includes("SESSION_KEY='nt-integration-map-auth-session-20261123-v1'"),
 'Integration must not write into the existing STAGING session key');
assert.ok(original.includes("SESSION_KEY='nt-staging-map-auth-session-v1'"),
 'Do not change original STAGING app');
assert.ok(planner.includes("ARCHIVE_KEY='nt-integrated-preview-named-trips-20261123-v1'"),
 'Integration saves in its own namespace');
assert.ok(!planner.includes('localStorage.setItem(PRE_INTEGRATION_ARCHIVE_KEY'),
 'Pre-integration archive must be read-only');
assert.ok(planner.includes('function safeRoutedGpx'),'Validated GPX exporter must be present');
assert.ok(!planner.includes('I.gpx(trip,routes)'),'Disallow legacy draft GPX in integration preview');
assert.ok(planner.includes("restoreManualGapDrafts(active.manualGaps)"),
 'Manual sketches must restore');
assert.ok(!planner.includes(".from('map_points')"),
 'Planner must not bypass RLS or access STAGING Supabase points');
assert.ok(host.includes('id="nt-open-planner-btn"'));
assert.ok(host.includes('id="nt-close-planner-btn"'));
for(const page of [host,planner]){
 const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).filter(Boolean);
 scripts.forEach(code=>new Function(code));
}
const scripts=[...host.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).filter(Boolean);
const bridge=scripts.at(-1);
const nodes={};
const document={
 activeElement:null,body:{style:{overflow:'scroll'}},listeners:{},
 getElementById(id){return nodes[id]||null;},
 addEventListener(name,fn){this.listeners[name]=fn}
};
for(const id of ['nt-open-planner-btn','nt-close-planner-btn','nt-integrated-route-overlay','nt-integrated-route-iframe']){
 nodes[id]={
  hidden:id==='nt-integrated-route-overlay',src:'',dataset:{src:'./planner.html'},
  attributes:{},listeners:{},contentWindow:{},
  addEventListener(name,fn){this.listeners[name]=fn},
  setAttribute(name,value){this.attributes[name]=value},
  focus(){document.activeElement=this}
 };
}
const window={
 location:{origin:'https://nordic-trail.github.io'},listeners:{},
 addEventListener(name,fn){this.listeners[name]=fn}
};
new Function('document','window',bridge)(document,window);
document.activeElement=nodes['nt-open-planner-btn'];
nodes['nt-open-planner-btn'].listeners.click();
assert.equal(nodes['nt-integrated-route-overlay'].hidden,false);
assert.equal(nodes['nt-integrated-route-iframe'].src,'./planner.html');
assert.equal(document.body.style.overflow,'hidden');
window.listeners.message({
 origin:window.location.origin,source:{},data:{kind:'nt:planner:close',version:1}
});
assert.equal(nodes['nt-integrated-route-overlay'].hidden,false,'Wrong iframe must not close planner');
window.listeners.message({
 origin:window.location.origin,source:nodes['nt-integrated-route-iframe'].contentWindow,
 data:{kind:'nt:planner:close',version:1}
});
assert.equal(nodes['nt-integrated-route-overlay'].hidden,true);
assert.equal(document.body.style.overflow,'scroll');
assert.equal(document.activeElement,nodes['nt-open-planner-btn']);
console.log('PASS: STAGING integration shell static and open/return tests');
