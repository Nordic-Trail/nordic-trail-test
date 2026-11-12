'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('staging-app/index.html','utf8');
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(js.length,1);
new vm.Script(js[0]);
const checks=[
 ['Clusters keep approved translucent glass style',html.includes('background:rgba(18,42,29,.42)')&&html.includes('border:2px solid rgba(241,249,228,.94)')&&html.includes('backdrop-filter:blur(3px)')],
 ['Pins are tapered and tip anchored',html.includes('.nt-osm-pin::before')&&html.includes('iconSize:[42,44],iconAnchor:[21,37]')],
 ['Original visual classes remain separate',...['barrier','road','path'].map(k=>html.includes('.nt-osm-pin.'+k))],
 ['Approved hiker icon is used for footway only',html.includes("highway==='footway'?'walk'")&&html.includes('const osmIconHiker=')&&html.includes("style==='walk'?osmIconHiker")],
 ['Cycleway gets bicycle rather than parking letter',html.includes("highway==='cycleway'?'bike'")&&html.includes('const osmIconBike=')&&!html.includes("kind==='road'?'?':'P'")],
 ['Unspecified paths use neutral path symbol',html.includes('const osmIconTrail=')&&html.includes("highway==='cycleway'?'bike':'trail'")],
 ['Spiderfy reuses same source-based icon as normal marker',html.includes('const icon=osmIconForEntry(entry);')&&html.includes('osmMarkers.push({...entry,marker})')],
 ['Clusters are isolated below STAGING markers',html.includes("pane:'ntOsmEvidencePane'")&&html.includes("osmPane.style.zIndex='350'")],
 ['Clustering is based on zoom and enabled OSM layers',html.includes('if(zoom>=16){')&&html.includes('osmChecks[entry.kind].checked')],
 ['Overlapping high zoom pins become selectable via spiderfy',html.includes('function showOsmSpiderfy(entries,clusterMarker,lat,lon)')&&html.includes('if(map.getZoom()>=16)showOsmSpiderfy(entries,clusterMarker,lat,lon)')],
 ['Spiderfy shows true location connector lines',html.includes('L.polyline([[entry.p.lat,entry.p.lon],location]')&&html.includes('L.circleMarker([entry.p.lat,entry.p.lon]')],
 ['Spiderfy is cleared on map pan and on layer changes',html.includes("map.on('dragstart',closeOsmSpiderfy)")&&html.includes('    closeOsmSpiderfy();\n    for(const layer of Object.values(osmLayers))')],
 ['Map tap dismisses spider without creating draft',html.includes('if(activeSpiderMarker){\n      closeOsmSpiderfy();\n      return;')],
 ['Clustering updates on zoom and layer toggle',html.includes("map.on('zoomend',renderOsmClusters)")&&html.includes('    renderOsmClusters();')],
 ['Clusters do not allow underlying draft clicks',html.includes("if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);")&&html.includes('if(map.getZoom()>=16)showOsmSpiderfy(entries,clusterMarker,lat,lon)')],
 ['Cluster click zooms in but does not create points',html.includes('map.setView([lat,lon],Math.min(map.getZoom()+2,16),{animate:false})')],
 ['Markers retain original OSM lat/lon',html.includes('const marker=L.marker([p.lat,p.lon]')],
 ['Approximate road centers remain warned',html.includes('Dla dróg i ścieżek są to jedynie przybliżone środki odcinków.')],
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
assert.equal(tests[1].length,2,'Close observations remain grouped at zoom 16');
assert.equal(tests[1].filter(group=>group.length===2).length,1,'Close pair remains selectable as cluster');
const isolated=[{p:{lat:59.17,lon:17.82},kind:'barrier'},{p:{lat:59.20,lon:17.87},kind:'road'}];
const far=vm.runInNewContext(fragment+';clusterOsmEntries(isolated,16)',{...sandbox,isolated});
assert.equal(far.length,2,'Far-apart observations stay separate');
assert.ok(far.every(group=>group.length===1));
const overlapSource=fs.readFileSync('staging-app/data/tumba-lida.json','utf8');
const pack=JSON.parse(overlapSource);
const near=pack.objects.filter(p=>[972124384,83485812].includes(p.osm_id)).map(p=>({p,kind:p.kind==='barrier'?'barrier':'road'}));
assert.equal(near.length,2,'Known overlapping source pair');
const clustered=vm.runInNewContext(fragment+';clusterOsmEntries(near,16)',{map:{project:([lat,lon],zoom)=>{const scale=256*Math.pow(2,zoom);const sine=Math.sin(lat*Math.PI/180);return {x:(lon+180)/360*scale,y:(.5-Math.log((1+sine)/(1-sine))/(4*Math.PI))*scale};}},near});
assert.equal(clustered.length,1,'Known OSM pair is grouped at 16');
assert.equal(clustered[0].length,2);
console.log('PASS: dense markers remain grouped at zoom 16, distant markers stay separate');
console.log('OSM pin and clustering audit: '+(checks.length+1)+' PASS');
