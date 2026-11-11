'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('preview/osm-road-observations/index.html','utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(inline.length,1);
assert.doesNotThrow(()=>new vm.Script(inline[0]));
const cases=[
 ['Static pack fetched only on user action',html.includes("el('load-osm').addEventListener('click',async()=>")&&html.includes("fetch(STATIC_DATA,{method:'GET'")],
 ['Uses same-origin pack, no Overpass in browser CSP',html.includes("connect-src 'self' https://tile.openstreetmap.org")&&!html.includes('https://overpass-api.de/api/interpreter')],
 ['Explicit non-collected state',html.includes("pack.coverage==='not_collected'")&&html.includes('Nie przygotowano jeszcze paczki')],
 ['Rejects false legal-access claims',html.includes("e.legal_access!=='unverified'")],
 ['Rejects duplicate OSM objects',html.includes("if(seen.has(id))throw Error")],
 ['Bounded and capped data',html.includes('pack.objects.length>300')&&html.includes('points.length>150||lines.length+paths.length>150')],
 ['Uses fixed BBOX and static pack area',html.includes('const QUERY_BOX=[59.155,17.81,59.203,17.875]')],
 ['Checks ODbL source',html.includes("pack.licence!=='ODbL'")&&html.includes('© OpenStreetMap contributors')],
 ['Displays legal caution for approximate way centers',html.includes('nie jako pełny zasięg zakazu')],
 ['No Supabase/auth/persistence',!html.toLowerCase().includes('supabase')&&!html.includes('localStorage')&&!html.includes('sessionStorage')],
 ['Full approved glass style intact',html.includes('--glass:rgba(18,42,29,.28)')],
 ['Map layer and swipe behavior intact',html.includes("handle.addEventListener('pointerdown'")&&html.includes('show-restrictions')],
 ['No live Overpass access even on retry',!html.includes('overpass-api.de/api/interpreter')&&!html.includes('ovp.dresel.systems/api/interpreter')],
 ['Bounded static payload size',html.includes('raw.length>250000')],
 ['No false zero if no data collected',html.includes('Stan: niepobrane. Nie oznacza to braku szlabanów.')],
 ['Empty collected pack is distinct from not collected',html.includes("return {coverage:'collected',points,lines,paths,asOf:")],
 ['Safe text rendering for OSM tags',html.includes('value.textContent=tags[key]')],
 ['Static preview does not send passwords',html.includes("credentials:'omit'")&&!html.includes('Authorization')]
];
for(const [label,pass] of cases){console.log((pass?'PASS':'FAIL')+': '+label);assert.ok(pass,label);}
const layerChecks=[
 ['Three switch IDs',html.includes('id="show-barriers"')&&html.includes('id="show-restrictions"')&&html.includes('id="show-paths"')],
 ['Paths are classified separately from roads',html.includes("(['footway','path','cycleway'].includes(e.tags.highway)?paths:lines)")],
 ['Map has three independent layer groups',html.includes("['show-paths',paths]")&&html.includes("el('show-paths').addEventListener('change',toggleMap)")],
 ['No path draw as automotive restriction',html.includes('class="pin path"')&&html.includes('paths.clearLayers()')]
];
for(const [name,passed] of layerChecks){console.log((passed?'PASS':'FAIL')+': '+name);assert.ok(passed,name)}

const infoCases=[
 ['Three source-aware detail views',html.includes("info('node',e.id,e.tags,'barrier')")&&html.includes("info('way',e.id,e.tags,'road')")&&html.includes("info('way',e.id,e.tags,'path')")],
 ['Way centers are labeled approximate not legal extent',html.includes('nie zasięg ograniczenia.')&&html.includes('nie ograniczenie na drodze dla samochodów.')],
 ['Recorded OSM snapshot and pack acquisition times separated',html.includes('id="info-source-asof"')&&html.includes('id="info-source-checked"')&&html.includes('sourceMeta={asOf:parsed.asOf,checkedAt:parsed.checkedAt}')],
 ['Native original OSM record link stays validated',html.includes("Number.isSafeInteger(safeId)")&&html.includes("!['node','way'].includes(type)")],
 ['Labels and source tags rendered via textContent only',html.includes("label.textContent=key;value.textContent=tags[key]")&&html.includes("el('info-heading').textContent=title")],
 ['Legal caution and field verification remain explicit',html.includes('Dostępność prawna: niezweryfikowana.')&&html.includes('Weryfikacja w terenie')]
];
for(const [label,ok] of infoCases){console.log((ok?'PASS':'FAIL')+': '+label);assert.ok(ok,label);}
const clarityCases=[
 ['Way labels do not call pedestrian segments a road',html.includes("type==='node'?'Węzeł ':'Odcinek OSM '")],
 ['Persistent source notice shrinks after loading data',html.includes('id="source-notice" class="preview-notice" role="note"')&&html.includes("panel.classList.add('is-compact')")],
 ['Compact banner keeps explicit unverified status',html.includes("compactNotice('OSM · 66 obserwacji niezweryfikowanych')")],
 ['Caution remains in detail sheet',html.includes('Dostępność prawna: niezweryfikowana.')]
];
for(const [label,passed] of clarityCases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}

console.log('Static OSM browser preview: '+(cases.length+layerChecks.length+infoCases.length+clarityCases.length)+' PASS');
