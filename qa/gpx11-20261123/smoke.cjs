'use strict';
// Run from the repository root: node qa/gpx11-20261123/smoke.cjs
// No dependencies or network requests. Semantic tests complement GPX 1.1 XSD validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.resolve(__dirname, '../../staging-gpx-safe-export-20261123/index.html'),'utf8');
const begin=html.indexOf('function xmlGpxSafe(value){');
const end=html.indexOf('function download(filename,data){',begin);
assert.ok(begin>=0&&end>begin,'Safe GPX exporter must exist');
const methods=html.slice(begin,end);
const M={normalize:x=>x,KIND_LABELS:{start:'Start',stop:'Postój',finish:'Meta'}};
const savedManual={'1|start':{via:[{lat:59.0004,lon:17.0001}]}};
const audit=segs=>segs.map((s,i)=>s.status==='routed'?({status:'routed',index:i+1,start:327,end:64,warning:true}):({status:'draft',index:i+1}));
const exporter=new Function('M','endpointAudit','manualGapDrafts','GAP_WARNING_METERS',methods+'; return safeRoutedGpx;')(M,audit,savedManual,50);
const points=[
  {id:'p1',lat:59,lon:17,name:'Start <&>',kind:'start',mode:'none'},
  {id:'p2',lat:59.005,lon:17.005,name:'Postój',kind:'stop',mode:'walk'},
  {id:'p3',lat:59.009,lon:17.009,name:'Meta',kind:'finish',mode:'walk'}];
const segment1={key:'1',status:'routed',mode:'walk',from:points[0],to:points[1],points:[{lat:59.0027,lon:17},{lat:59.0043,lon:17.0042}]};
const segment2={key:'2',status:'routed',mode:'walk',from:points[1],to:points[2],points:[{lat:59.00435,lon:17.0043},{lat:59.0085,lon:17.009}]};
const draft={...segment2,status:'draft',points:[points[1],points[2]]};
const trip={version:1,name:'GPX <test> & próba',waypoints:points};
const first=exporter(trip,[segment1,segment2]);
assert.equal(first.tracks,2);
assert.equal(first.waypoints,3);
assert.equal(first.withGaps,2);
assert.equal(first.manualCount,1);
assert.equal((first.xml.match(/<wpt /g)||[]).length,3);
assert.equal((first.xml.match(/<trk>/g)||[]).length,2);
assert.equal((first.xml.match(/<trkseg>/g)||[]).length,2);
assert.ok(first.xml.includes('GPX &lt;test&gt; &amp; próba'));
assert.ok(first.xml.includes('UWAGA:'));
assert.ok(!first.xml.includes('59.000400'),'Hand-drawn manual points must never enter GPX');
const partial=exporter(trip,[segment1,draft]);
assert.equal(partial.tracks,1);
assert.equal(partial.missing,1);
assert.equal((partial.xml.match(/<trk>/g)||[]).length,1);
assert.ok(!partial.xml.includes('draft-walk'));
assert.throws(()=>exporter(trip,[{...segment1,status:'draft'},draft]),/Nie ma wyznaczonych/);
const antimeridianPoints=points.map((p,i)=>({...p,lon:i===0?180:p.lon}));
const antim=exporter({...trip,waypoints:antimeridianPoints},[segment1,segment2]);
assert.ok(antim.xml.includes('lon="-180.000000"'),'GPX 1.1 must not emit +180 longitude');
assert.ok(!antim.xml.includes('lon="180.000000"'));
console.log('PASS: GPX export semantic regression checks (2 tracks, gap warnings, draft separation, XML escaping, +180 boundary).');
