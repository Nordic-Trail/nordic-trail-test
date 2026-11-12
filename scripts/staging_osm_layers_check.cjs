'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('staging-app/index.html','utf8');
const pack=JSON.parse(fs.readFileSync('staging-app/data/tumba-lida.json','utf8'));
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(js.length,1,'One inline app JavaScript');
assert.doesNotThrow(()=>new vm.Script(js[0]),'Staging app JS syntax');

const surfaceStart=js[0].indexOf('  const osmSurfaceLabels={');
const surfaceEnd=js[0].indexOf('  function showOsmDetail(p,kind){',surfaceStart);
assert.ok(surfaceStart>=0&&surfaceEnd>surfaceStart,'Surface translator exists');
const describeOsmSurface=vm.runInNewContext(js[0].slice(surfaceStart,surfaceEnd)+';describeOsmSurface');
for(const [tag,expectedName,expectedGroup] of [
 ['clay','Gliniasta','Nieutwardzona'],
 ['gravel','Żwirowa','Nieutwardzona'],
 ['fine_gravel','Drobnożwirowa','Nieutwardzona'],
 ['ground','Gruntowa','Nieutwardzona'],
 ['compacted','Zagęszczona (stabilizowana)','Nieutwardzona'],
 ['asphalt','Asfaltowa','Utwardzona'],
 [undefined,'Brak danych w OSM','Nieznana'],
 ['not_documented_tag','Nieopisany w słowniku — sprawdź tag surface','Nieustalona']
]){
 const translated=describeOsmSurface(tag);
 assert.equal(translated.name,expectedName,'OSM surface label for '+tag);
 assert.equal(translated.group,expectedGroup,'OSM surface category for '+tag);
}
assert.ok(html.includes('id="nt-osm-detail-surface"')&&html.includes("surfaceBox.hidden=!showSurface"),'Surface displayed only on relevant cards');

const accessStart=js[0].indexOf('  function isOsmPrivateAccess(tags){');
const accessEnd=js[0].indexOf('  function showOsmDetail(p,kind){',accessStart);
assert.ok(accessStart>=0&&accessEnd>accessStart,'OSM private access helper exists');
const isOsmPrivateAccess=vm.runInNewContext(js[0].slice(accessStart,accessEnd)+';isOsmPrivateAccess');
for(const [tags,expected] of [
 [{access:'private',highway:'path'},true],
 [{access:'yes'},false],
 [{access:'no'},false],
 [{motor_vehicle:'no'},false],
 [{surface:'clay'},false],
 [{},false]
])assert.equal(isOsmPrivateAccess(tags),expected,'Private warning matches access=private only');
assert.ok(html.includes('id="nt-osm-private-access"')&&
 html.includes("el('nt-osm-private-access').hidden=!isOsmPrivateAccess(p.tags);"),
 'Private warning visibility resets for every OSM card');
assert.ok(html.includes('Dostępność prawna: niezweryfikowana.'),'General legal warning retained');


const actual={barrier:0,road:0,path:0},seen=new Set();
assert.equal(pack.coverage,'collected');assert.equal(pack.source,'OpenStreetMap');assert.equal(pack.licence,'ODbL');
assert.deepEqual(pack.bbox,[59.155,17.81,59.203,17.875]);
assert.equal(pack.objects.length,66);
for(const p of pack.objects){
 assert.equal(p.legal_access,'unverified');
 assert.ok(Number.isSafeInteger(p.osm_id)&&p.osm_id>0);
 assert.ok(p.lat>=59.155&&p.lat<=59.203&&p.lon>=17.81&&p.lon<=17.875);
 const key=p.osm_type+'/'+p.osm_id;assert.ok(!seen.has(key),'Unique OSM ID: '+key);seen.add(key);
 if(p.kind==='barrier'){assert.equal(p.osm_type,'node');actual.barrier++;}
 else{assert.equal(p.osm_type,'way');if(['footway','path','cycleway'].includes(p.tags.highway))actual.path++;else actual.road++;}
}
assert.deepEqual(actual,{barrier:29,road:26,path:11});
const cases=[
 ['Map UI keeps approved 28 percent icon glass',html.includes('--nt-glass-icon:rgba(18,42,29,.28)')],
 ['Public approved points are still default on',html.includes('id="nt-public-points-layer" checked')],
 ['All OSM checkboxes off by default',...['barriers','roads','paths'].map(x=>html.includes('id="nt-osm-'+x+'-layer"></label>'))],
 ['OSM loaded only on first manual toggle',html.includes("input.addEventListener('change',async()=>")&&html.includes('await ensureOsmPack()')],
 ['OSM data come only from same-origin static file',html.includes("fetch('data/tumba-lida.json',{method:'GET',credentials:'omit'")],
 ['No browser Overpass API calls',!html.includes('https://overpass-api.de/api/interpreter')&&!html.includes('https://ovp.dresel.systems/api/interpreter')],
 ['Connect-src allows only same-origin and existing Supabase',html.includes("connect-src 'self' https://bairmdubhnodwplioxld.supabase.co;")],
 ['Separate Leaflet layer groups for all 3 classifications',html.includes('const osmLayers=map&&window.L?{')&&html.includes("barrier:L.layerGroup().addTo(map)")&&html.includes("road:L.layerGroup().addTo(map)")&&html.includes("path:L.layerGroup().addTo(map)")],
 ['No automatic zoom; explicit area button',html.includes("el('nt-osm-area-btn').addEventListener('click',()=>")&&html.includes("map.fitBounds([[osmBBox[0]")],
 ['OSM layer does not modify map_points in Supabase',!js[0].slice(js[0].indexOf('  // Read-only OSM observation layers.'),js[0].indexOf('  let handleDragging=')).includes('db.')],
 ['Supabase moderation and original RLS paths untouched',html.includes("db.rpc('moderate_map_point'")&&html.includes("db.rpc('update_private_map_point'")],
 ['All OSM warnings explicit and unverified',html.includes('Dostępność prawna: niezweryfikowana.')&&html.includes("p.legal_access!=='unverified'")],
 ['OSM tag content rendered via textContent not innerHTML',html.includes('text.textContent=String(value)')&&html.includes('name.textContent=label')],
 ['Source ID link constrained to validated types and numeric IDs',html.includes("p.osm_type+'/'+p.osm_id")&&html.includes('Number.isSafeInteger(p.osm_id)')],
 ['Read-only OSM does not create point-edit records',html.includes("L.marker([p.lat,p.lon],{icon,pane:'ntOsmEvidencePane',bubblingMouseEvents:false,keyboard:true")],
 ['Data pack size limit in app',html.includes('contents.length>120000')],
 ['Static JSON metadata includes source and acquisition timestamps',typeof pack.source_as_of==='string'&&typeof pack.source_checked_at==='string'],
 ['OSM labels do not classify footway as road',html.includes("['path','footway','cycleway'].includes(p.tags.highway)")],
 ['Existing map style and drag gesture present',html.includes("layerHandle.addEventListener('pointerdown'")&&html.includes('.nt-layers-sheet{')],
 ['No storage of OSM state in browser',!js[0].slice(js[0].indexOf('  // Read-only OSM observation layers.'),js[0].indexOf('  let handleDragging=')).includes('localStorage')]
];
for(const entry of cases){const label=entry[0];const ok=entry.slice(1).every(Boolean);console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label)}
console.log('STAGING OSM integration: '+cases.length+' PASS; data counts '+JSON.stringify(actual));
