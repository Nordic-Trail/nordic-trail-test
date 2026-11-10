'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'..','staging-trips');
const M=require(path.join(dir,'route-model.js'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS: '+name);}
let trip=M.emptyTrip();
check('Empty trip',()=>assert.equal(trip.waypoints.length,0));
trip=M.add(trip,{lat:59.3,lon:18.1,name:'Dom & <start>',kind:'start',mode:'none'});
trip=M.add(trip,{lat:59.4,lon:18.2,name:'Parking',kind:'parking',mode:'drive'});
trip=M.add(trip,{lat:59.5,lon:18.3,name:'Biwak',kind:'camp',mode:'walk'});
check('Car plus foot',()=>assert.deepEqual(M.segments(trip).map(s=>s.mode),['drive','walk']));
check('Track GPX and XML escaping',()=>{
 const xml=M.gpx(trip);
 assert.equal((xml.match(/<trk>/g)||[]).length,2);
 assert.equal((xml.match(/<wpt /g)||[]).length,3);
 assert.ok(xml.includes('Dom &amp; &lt;start&gt;'));
});
check('Coordinates validation',()=>assert.throws(()=>M.add(trip,{lat:100,lon:18,kind:'camp',mode:'walk'})));
check('Reordering repairs first waypoint',()=>{
 const moved=M.move(trip,'p2',-1);assert.equal(moved.waypoints[0].mode,'none');
});
check('Point edit',()=>{
 const updated=M.change(trip,'p3',{mode:'drive',name:'Meta',kind:'finish'});
 assert.equal(updated.waypoints[2].name,'Meta');assert.equal(updated.waypoints[2].mode,'drive');
});
check('Removing point',()=>assert.equal(M.remove(trip,'p2').waypoints.length,2));
check('Persist JSON round-trip',()=>assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(trip))),trip));
check('JS syntax',()=>{
 const snippets=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
 assert.equal(snippets.length,1);assert.doesNotThrow(()=>new vm.Script(snippets[0]));
});
check('No app network data submission',()=>{
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|navigator\.geolocation|\.rpc\s*\(/.test(html));
 assert.ok(html.includes('localStorage.setItem'));
});
check('Start marker and map fitting controls exist',()=>{
 assert.ok(html.includes('id="fit-trip"'));
 assert.ok(html.includes("button('Pokaż na mapie',()=>showPointOnMap(p.id))"));
 assert.ok(html.includes("i===0?' start':''"));
 assert.ok(html.includes('fitAllPoints();'));
});
check('Save feedback is located directly below the action buttons',()=>{
 const section=html.indexOf('<section class="card"><h2>Zapis i eksport</h2>');
 const save=html.indexOf('id="save-local"',section);
 const feedback=html.indexOf('id="action-status"',save);
 const hint=html.indexOf('Plan zapisujemy wyłącznie',feedback);
 assert.ok(section>=0&&save>section&&feedback>save&&hint>feedback);
 assert.ok(html.slice(save,feedback).includes('id="export-gpx"'));
 assert.ok(html.slice(feedback,hint).includes('aria-live="polite"'));
});
check('Save and export use the nearby status field',()=>{
 assert.ok(html.includes("actionStatus('✓ Wyprawa zapisana lokalnie.')"));
 assert.ok(html.includes("actionStatus('Nie udało się zapisać wyprawy w tej przeglądarce.',true)"));
 assert.ok(html.includes("actionStatus('✓ Utworzono szkic GPX."));
 assert.ok(html.includes("clearActionStatus();refresh()"));
});
check('UI includes all controls',()=>{
 for(const id of ['start-pick','cancel-pick','point-name','point-kind','point-mode','visible-drive','visible-walk','save-local','export-gpx','points'])assert.ok(html.includes('id="'+id+'"'));
});
// Exercise fitAllPoints with mock Leaflet geometry: the original start must remain in bounds.
check('Fit map includes original start and the new point',()=>{
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean)[0];
 const begin=inline.indexOf('function fitAllPoints(){');
 const end=inline.indexOf('function showPointOnMap(id){',begin);
 assert.ok(begin>=0&&end>begin);
 const bounds=[];
 const ctx={trip:{waypoints:[{lat:59.30801,lon:18.08823},{lat:59.4,lon:18.2}]},map:{
  fitBounds:(b,opts)=>bounds.push({b,opts}),setView:()=>{throw Error('Unexpected setView')}},
  L:{latLngBounds:points=>points}};
 vm.runInNewContext(inline.slice(begin,end)+';this.didFit=fitAllPoints();',ctx);
 assert.equal(ctx.didFit,true);
 assert.equal(bounds.length,1);
 assert.deepEqual(Array.from(bounds[0].b[0]),[59.30801,18.08823]);
 assert.deepEqual(Array.from(bounds[0].b[1]),[59.4,18.2]);
});
check('Feedback helper works for success, failure and reset',()=>{
 const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean)[0];
 const start=source.indexOf('function actionStatus(');
 const end=source.indexOf('function km(',start);
 assert.ok(start>=0&&end>start);
 const classes=new Set();
 const status={textContent:'',hidden:true,classList:{
   toggle(name,active){if(active)classes.add(name);else classes.delete(name)},
   remove(name){classes.delete(name)}
 }};
 const ctx={el:id=>{assert.equal(id,'action-status');return status}};
 vm.runInNewContext(source.slice(start,end)+';this.show=actionStatus;this.clear=clearActionStatus;',ctx);
 ctx.show('✓ Wyprawa zapisana lokalnie.');
 assert.equal(status.hidden,false);
 assert.equal(status.textContent,'✓ Wyprawa zapisana lokalnie.');
 ctx.show('Błąd zapisu',true);
 assert.ok(classes.has('error'));
 ctx.clear();
 assert.equal(status.hidden,true);
 assert.equal(status.textContent,'');
 assert.ok(!classes.has('error'));
});

const R=require(path.join(dir,'routing-core.js'));
check('Routing profiles distinguish car and pedestrian',()=>{
 assert.equal(R.profile('drive'),'auto');
 assert.equal(R.profile('walk'),'pedestrian');
 assert.throws(()=>R.profile('offroad'));
});
check('Provider neutral routing requests',()=>{
 assert.equal(R.request({lat:42.225139,lon:-8.670911},{lat:42.225224,lon:-8.670718},'walk').costing,'pedestrian');
});
check('Valhalla polyline6 official test shape',()=>{
 assert.deepEqual(R.decodePolyline6('e~epoA|jfpOiDaK'),[{lat:42.225139,lon:-8.670911},{lat:42.225224,lon:-8.670718}]);
});
check('Malformed geometry and invalid coordinates rejected',()=>{
 assert.throws(()=>R.decodePolyline6('?'));
 assert.throws(()=>R.decodePolyline6('???'));
 assert.throws(()=>R.coord({lat:92,lon:18}));
});
check('Read routing response but never claim legal access',()=>{
 const a={lat:42.225139,lon:-8.670911},b={lat:42.225224,lon:-8.670718};
 const response={trip:{legs:[{shape:'e~epoA|jfpOiDaK'}],summary:{length:0.025,time:22}}};
 const s=R.parseValhallaResponse(response,a,b,'walk');
 assert.equal(s.status,'routed');
 assert.equal(s.legalAccess,'unverified');
 assert.equal(s.km,0.025);
});
check('Reject unrelated route geometry',()=>{
 const b={lat:42.225224,lon:-8.670718};
 assert.throws(()=>R.parseValhallaResponse({trip:{legs:[{shape:'e~epoA|jfpOiDaK'}],summary:{length:0.025}}},{lat:59,lon:18},b,'drive'));
});
check('No routing data keeps local straight-line draft',()=>{
 const t={waypoints:[{lat:59.19832,lon:17.85862,mode:'none'},{lat:59.15649,lon:17.8198,mode:'drive'}]};
 assert.equal(R.displaySegments(t,{})[0].status,'draft');
 assert.equal(R.displaySegments(t,{})[0].legalAccess,'unverified');
});
check('Changed route coordinates invalidate cached geometry',()=>{
 const a={lat:42.225139,lon:-8.670911},b={lat:42.225224,lon:-8.670718};
 const route=R.parseValhallaResponse({trip:{legs:[{shape:'e~epoA|jfpOiDaK'}],summary:{length:0.025}}},a,b,'walk');
 assert.equal(R.displaySegments({waypoints:[{...a,mode:'none'},{...b,mode:'walk'}]},{[route.key]:route})[0].status,'routed');
 assert.equal(R.displaySegments({waypoints:[{...a,mode:'none'},{lat:42.24,lon:-8.66,mode:'walk'}]},{[route.key]:route})[0].status,'draft');
});
check('Routing core uses no external requests, keys or storage',()=>{
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|localStorage|api[-_]?key|https?:\/\//i.test(fs.readFileSync(path.join(dir,'routing-core.js'),'utf8')));
});

console.log('STAGING Trips checks: '+passed+' PASS');
