'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('preview/osm-road-observations/index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1,'One offline-checkable inline JS script');
assert.doesNotThrow(()=>new vm.Script(scripts[0]),'JavaScript syntax');
const cases=[
 ['Official pilot bbox fixed',html.includes('const BBOX=[59.145,17.775,59.225,17.920]')],
 ['Only public Overpass data on explicit button',html.includes("el('load-osm').addEventListener('click',async()=>")&&html.includes('https://overpass-api.de/api/interpreter')],
 ['No automatic fetch, auto refresh or geolocation',!html.includes('navigator.geolocation')&&!html.includes('setInterval(')],
 ['No Supabase or persistent storage',!html.toLowerCase().includes('supabase')&&!html.includes('localStorage')&&!html.includes('sessionStorage')],
 ['No OSM editing API',!html.includes('api.openstreetmap.org')&&!html.includes('method:"POST"')],
 ['Bbox and max response guards',html.includes('if(data.elements.length>3000)')&&html.includes('raw.length>2000000')&&html.includes('bounded(c.lat,c.lon)')],
 ['Maximum 150 displayed per type',html.includes('points.slice(0,150)')&&html.includes('lines.slice(0,150)')],
 ['Only potentially restricted ways',html.includes("['no','private'].some(v=>e.tags.motor_vehicle===v||e.tags.access===v)")],
 ['Map info text set without injecting HTML tags',html.includes('value.textContent=tags[key]')&&html.includes('rows.replaceChildren()')],
 ['OSM object URL limited to validated numeric ID',html.includes('Number.isSafeInteger(safeId)')&&html.includes("el('osm-object-link').href='https://www.openstreetmap.org/'+type+'/'+safeId")],
 ['Attribution and ODbL',html.includes('https://www.openstreetmap.org/copyright')&&html.includes('ODbL')],
 ['No driving permission claims',html.includes('nie oznacza')&&html.includes('niezweryfikowana')],
 ['Approved translucent layers button preserved',html.includes('--glass:rgba(18,42,29,.28)')&&html.includes('width:48px;height:48px')],
 ['Gesture panel present',html.includes("handle.addEventListener('pointerdown'")&&html.includes("handle.addEventListener('pointerup'")],
 ['Respects public Overpass via cooldown',html.includes('now-lastLoadedAt<60000')&&html.includes('requested=true')],
 ['Abort on slow response',html.includes('AbortController()')&&html.includes('abort.abort(),25000')]
];
for(const [label,passed] of cases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label)}
console.log('Open OSM pilot preview: '+cases.length+' PASS');
