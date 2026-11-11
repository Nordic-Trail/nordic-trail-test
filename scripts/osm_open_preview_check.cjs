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
 ['POST restricted to allowlisted public Overpass endpoints, not OSM write API',!html.includes('api.openstreetmap.org')&&html.includes("method:'POST'")&&html.includes('OVERPASS_ENDPOINTS[selected]')],
 ['Bbox and max response guards',html.includes('if(data.elements.length>3000)')&&html.includes('raw.length>2000000')&&html.includes('bounded(e.center.lat,e.center.lon)')],
 ['Maximum 150 displayed per type',html.includes('points.slice(0,150)')&&html.includes('lines.slice(0,150)')],
 ['Only potentially restricted ways',html.includes("['no','private'].some(v=>e.tags.motor_vehicle===v||e.tags.access===v)")],
 ['Map info text set without injecting HTML tags',html.includes('value.textContent=tags[key]')&&html.includes('rows.replaceChildren()')],
 ['OSM object URL limited to validated numeric ID',html.includes('Number.isSafeInteger(safeId)')&&html.includes("el('osm-object-link').href='https://www.openstreetmap.org/'+type+'/'+safeId")],
 ['Attribution and ODbL',html.includes('https://www.openstreetmap.org/copyright')&&html.includes('ODbL')],
 ['No driving permission claims',html.includes('nie oznacza')&&html.includes('niezweryfikowana')],
 ['Approved translucent layers button preserved',html.includes('--glass:rgba(18,42,29,.28)')&&html.includes('width:48px;height:48px')],
 ['Gesture panel present',html.includes("handle.addEventListener('pointerdown'")&&html.includes("handle.addEventListener('pointerup'")],
 ['Respects public Overpass via per-attempt cooldown',html.includes('now-lastAttemptAt<60000')&&html.includes('lastAttemptAt=now')],
 ['Abort on slow response',html.includes('AbortController()')&&html.includes('abort.abort(),25000')]
];
for(const [label,passed] of cases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label)}

const diagnostics=[
 ['European server is selectable and free of login',html.includes('https://ovp.dresel.systems/api/interpreter')&&html.includes('id="overpass-server"')],
 ['Browser CSP allows both public official-known Overpass sources',html.includes('connect-src https://overpass-api.de https://ovp.dresel.systems')],
 ['Form-encoded POST matches Overpass documentation',html.includes("body:new URLSearchParams({data:query})")&&html.includes("method:'POST'")],
 ['No automatic retry or parallel query on failed fetch',!html.includes('Promise.any')&&!html.includes('Promise.race')&&html.includes('if(requested)return')],
 ['Rate limiter covers failed attempts',html.includes('lastAttemptAt=now')&&html.includes('now-lastAttemptAt<60000')],
 ['Diagnose HTTP overload and network/CORS separately',html.includes('HTTP (406|429|502|503|504)')&&html.includes("err?.name==='TypeError'")],
 ['No login tokens or user credentials sent to Overpass',html.includes("credentials:'omit'")&&!html.includes('Authorization')],
 ['On failed fetch previous observations are not cleared',html.indexOf('render(parsed);')<html.indexOf('}catch(err){',html.indexOf("el('load-osm').addEventListener('click'"))],
];
for(const [label,passed] of diagnostics){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}

const leanChecks=[
 ['Reduced query box smaller than full pilot envelope',html.includes('const QUERY_BOX=[59.155,17.81,59.203,17.875]')&&html.includes('const BBOX=[59.145,17.775,59.225,17.920]')],
 ['Lean query requests centers rather than full line geometries',html.includes(');out center;')&&!html.includes(');out geom;')],
 ['Visible road marks are approximate center points',html.includes('L.marker([e.center.lat,e.center.lon],{icon})')&&html.includes('nie jako pełny zasięg zakazu')],
 ['Overpass errors in HTTP 200 JSON are rejected',html.includes("typeof decoded.remark==='string'")],
 ['Short server timeout budget',html.includes('[timeout:18][maxsize:53687091]')]
];
for(const [label,passed] of leanChecks){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}

console.log('Open OSM pilot preview: '+(cases.length+diagnostics.length+leanChecks.length)+' PASS');
