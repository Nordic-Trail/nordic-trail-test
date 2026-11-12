'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('staging-app/index.html','utf8');
const js=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(js.length,1);
new vm.Script(js[0]);
const checks=[
 ['Pins are tapered and tip anchored',html.includes('.nt-osm-pin::before')&&html.includes('iconSize:[42,44],iconAnchor:[21,37]')],
 ['Original visual classes remain separate',...['barrier','road','path'].map(k=>html.includes('.nt-osm-pin.'+k))],
 ['Clusters are isolated below STAGING markers',html.includes("pane:'ntOsmEvidencePane'")&&html.includes("osmPane.style.zIndex='350'")],
 ['Clustering is based on zoom and enabled OSM layers',html.includes("if(zoom>=16)return entries.map(entry=>[entry])")&&html.includes('osmChecks[entry.kind].checked')],
 ['Clustering updates on zoom and layer toggle',html.includes("map.on('zoomend',renderOsmClusters)")&&html.includes('    renderOsmClusters();')],
 ['Clusters do not allow underlying draft clicks',html.includes('L.DomEvent.stopPropagation(event.originalEvent);\n          closeOsmDetail();')],
 ['Cluster click zooms in but does not create points',html.includes('map.setView([lat,lon],Math.min(map.getZoom()+2,16),{animate:false})')],
 ['Markers retain original OSM lat/lon',html.includes('const marker=L.marker([p.lat,p.lon]')],
 ['Approximate road centers remain warned',html.includes('dla dróg i ścieżek to jedynie przybliżony środek odcinka')],
 ['Unchanged read-only pack',html.includes("fetch('data/tumba-lida.json',{method:'GET',credentials:'omit'")],
 ['No dependency for clustering',!html.includes('leaflet.markercluster')&&!html.includes('MarkerClusterGroup')]
];
for(const [label,...parts] of checks){const ok=parts.every(Boolean);console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label);}
const script=js[0],start=script.indexOf('  function clusterOsmEntries('),end=script.indexOf('  function renderOsmClusters(',start);
assert.ok(start>=0&&end>start);
const fragment=script.slice(start,end);
const project=([lat,lon],zoom)=>({x:lon*100*Math.pow(2,zoom-10),y:lat*100*Math.pow(2,zoom-10)});
const entries=[
 {p:{lat:59.18,lon:17.84},kind:'barrier'},
 {p:{lat:59.18001,lon:17.84001},kind:'road'},
 {p:{lat:59.19,lon:17.85},kind:'path'}
];
const sandbox={map:{project}};
const tests=vm.runInNewContext(fragment+';[clusterOsmEntries(entries,10),clusterOsmEntries(entries,16)]',{...sandbox,entries});
assert.equal(tests[0].length,1,'Near observations share group at low zoom');
assert.equal(tests[0][0].length,3);
assert.equal(tests[1].length,3,'All observations separate at zoom 16');
for(const group of tests[1])assert.equal(group.length,1);
console.log('PASS: grouped at zoom 10, separate at zoom 16');
console.log('OSM pin and clustering audit: '+(checks.length+1)+' PASS');
