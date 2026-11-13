'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'..','staging-routing');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const M=require('../staging-trips/route-model.js');
const R=require('../staging-trips/routing-core.js');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1);
assert.doesNotThrow(()=>new vm.Script(scripts[0]));
const script=scripts[0];
let pass=0;
function test(name,fn){fn();pass++;console.log('PASS: '+name);}
test('Standalone demo uses independent path and existing read-only core',()=>{
 assert.ok(html.includes('../staging-trips/routing-core.js'));
 assert.ok(html.includes('../staging-trips/route-model.js'));
 assert.ok(html.includes('STAGING — routing po OSM'));
});
test('Explicit consent before network call',()=>{
 assert.ok(html.includes('id="consent" type="checkbox"'));
 assert.ok(script.includes("if(!el('consent').checked)"));
 assert.ok(script.includes("el('calculate').addEventListener('click',calculate)"));
 const startup=script.slice(script.indexOf('try{\n  if(!M||!R'),script.indexOf('}catch(error){\n  message'));
 assert.ok(!startup.includes('calculate();'));
});
test('POST requests identify client, omit credentials, and do not retry automatically',()=>{
 assert.ok(script.includes('X-Client-Id'));
 assert.ok(script.includes("method:'POST'"));
 assert.ok(script.includes("credentials:'omit'"));
 assert.ok(script.includes("MAX_CALLS=6,MAX_SEGMENTS=4,MIN_INTERVAL=1650"));
 assert.ok(!/while\s*\(true\)/.test(script));
});
test('Local trip is only read; never overwritten',()=>{
 assert.ok(script.includes('localStorage.getItem(KEY)'));
 assert.ok(!/localStorage\.(setItem|removeItem|clear)\s*\(/.test(script));
 assert.ok(!/supabase|\.rpc\(|navigator\.geolocation/i.test(script));
});
test('Public sample uses a car and pedestrian section',()=>{
 let t=M.emptyTrip();
 t=M.add(t,{lat:59.19965,lon:17.83708,name:'Tumba',kind:'start',mode:'none'});
 t=M.add(t,{lat:59.1625,lon:17.88028,name:'Lida',kind:'parking',mode:'drive'});
 t=M.add(t,{lat:59.1636,lon:17.8622,name:'Walk',kind:'view',mode:'walk'});
 assert.deepEqual(R.displaySegments(t,{}).map(s=>s.mode),['drive','walk']);
});

test('Single unoutlined 6 px strokes with navy car and dashed dark green hiking',()=>{
 assert.ok(script.includes("const routeColors={drive:'#174A8B',walk:'#17683E'}"));
 assert.ok(!script.includes('routeOutline'),'Removed old dark border stroke');
 assert.ok(!script.includes("['#FFFFFF',10]"),'Removed white border stroke');
 assert.ok(script.includes("color:routeColors[s.mode],"));
 assert.ok(script.includes('weight:6,opacity:routed?1:0.78,dashArray'));
 assert.ok(script.includes("s.mode==='walk'?'20 15':null"));
 assert.ok(script.includes(":'5 23'"),'Draft remains dotted');
 assert.ok(script.includes("interactive:false"));
 assert.ok(html.includes('Kolory tras'));
 assert.ok(html.includes('Hiking — ciemnozielona, przerywana'));
 assert.ok(html.includes('Samochód — ciemnoniebieska'));
 assert.ok(html.includes('stroke="#17683E" stroke-width="6" stroke-dasharray="20 15"'));
 assert.ok(html.includes('stroke="#174A8B" stroke-width="6" stroke-linecap="round"'));
});
test('Unrouted geometry is visibly labelled as draft',()=>{
 assert.ok(script.includes("s.status==='routed'"));
 assert.ok(script.includes("'tylko szkic po prostej'"));
 assert.ok(html.includes('dostępność drogi niezweryfikowana'));
});
test('Provider error and rate limit do not imply computed route',()=>{
 assert.ok(script.includes('Limit serwera demonstracyjnego (HTTP 429)'));
 assert.ok(script.includes("if(failed)message("));
 assert.ok(script.includes("s.status!=='routed'"));
});
test('No automatic storage writes or hidden background queries',()=>{
 assert.ok(!script.includes('setInterval('));
 assert.ok(!script.includes('serviceWorker'));
 assert.ok(!script.includes('localStorage.setItem'));
});
test('Map and mobile controls have accessible targets',()=>{
 for(const id of ['map','fit-map','example','load-local','calculate','reset-lines','consent','points','segments','message','total'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('aria-live="polite"'));
});
console.log('STAGING Routing demo checks: '+pass+' PASS');
