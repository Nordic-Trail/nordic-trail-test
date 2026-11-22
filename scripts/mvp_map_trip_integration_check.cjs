'use strict';
// MVP integration regression: offline-only checks, no Supabase calls or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'staging-app/index.html'),'utf8');
const panel=fs.readFileSync(path.join(root,'staging-app/trip-panel.js'),'utf8');
const M=require(path.join(root,'staging-trips/route-model.js'));
const R=require(path.join(root,'staging-trips/routing-core.js'));
const I=require(path.join(root,'staging-trips-integrated/integration-model.js'));
let count=0;
function test(title,fn){fn();count++;console.log('PASS '+title);}
function occurrence(text,needle){return text.split(needle).length-1;}
test('single entry point and panel on staging map',()=>{
  for(const id of ['nt-open-trip','nt-trip-panel','nt-trip-pick','nt-trip-save','nt-trip-export','nt-trip-new','nt-trip-points','nt-trip-name','nt-trip-next-kind','nt-trip-next-mode','nt-trip-status'])assert.equal(occurrence(app,'id="'+id+'"'),1,id);
  assert.ok(app.includes('window.NordicTripPanel.mount('));
  assert.ok(app.includes("tripPanel&&tripPanel.handleMapClick(event)"));
  assert.ok(app.indexOf("tripPanel&&tripPanel.handleMapClick(event)")<app.indexOf('if(!activeUser||!db)'));
});
test('shared verified model and script ordering',()=>{
  const srcs=['../staging-trips/route-model.js','../staging-trips/routing-core.js','../staging-trips-integrated/integration-model.js','trip-panel.js'];
  let last=-1;for(const src of srcs){const next=app.indexOf('<script src="'+src+'"></script>');assert.ok(next>last,src);last=next;}
  assert.ok(app.includes('const STAGING_URL='));
  assert.ok(!panel.includes('createClient')&&!panel.includes('signInWithPassword')&&!panel.includes('.from('));
});
test('existing staging map keeps core features',()=>{
  for(const marker of ['id="add-point-btn"','id="point-sheet"','id="map-layers-sheet"','id="admin-queue-card"','id="nt-osm-detail-sheet"'])assert.ok(app.includes(marker),marker);
  assert.ok(app.includes('window.supabase.createClient(STAGING_URL'));
  assert.ok(app.includes("db.from('map_points')"));
});
test('trip editor stays locally stored and keeps GPX safety messaging',()=>{
  for(const marker of ['I.load(root.localStorage)','I.save(root.localStorage,trip,routes)','I.gpx(trip,routes)','handleMapClick(event)','active=true','active=false','e.originalEvent'])assert.ok(panel.includes(marker),marker);
  assert.ok(panel.includes('Nie wszystkie odcinki')&&panel.includes('GPX'));
  assert.ok(app.includes('bez zapisu w Supabase'));
});
test('save confirmation is visible without scrolling and failure is not a success',()=>{
  assert.ok(panel.includes("saveButton.textContent='✓ Zapisano'"));
  assert.ok(panel.includes("saveButton.textContent='Ponów zapis'"));
  assert.ok(panel.includes("saveFeedback('saved')"));
  assert.ok(panel.includes("saveFeedback('error')"));
  assert.ok(panel.includes("saveFeedback('dirty')"));
  assert.ok(panel.indexOf("saveFeedback('saved')")<panel.indexOf("}catch(_error){saveFeedback('error')"));
});
test('saved trips automatically fit within the unobscured map',()=>{
  assert.ok(app.includes('id="nt-trip-fit"'));
  assert.ok(panel.includes("el('nt-trip-fit').addEventListener('click',focusTrip)"));
  assert.ok(panel.includes('if(trip.waypoints.length)focusTrip()'));
  assert.ok(panel.includes('paddingBottomRight:[rightPadding,bottomPadding]'));
  assert.ok(panel.includes('map.fitBounds(bounds'));
  assert.ok(panel.includes("typeof options.onOpen==='function'"));
  assert.ok(app.includes('onOpen:()=>{revealMapViewport();'));
});
test('JavaScript scripts parse',()=>{
  new vm.Script(panel,{filename:'trip-panel.js'});
  const inline=[...app.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
  assert.ok(inline.length>0);
  for(const js of inline)new vm.Script(js,{filename:'staging-app inline'});
});
test('shared local trip format round trip and safety classifications',()=>{
  let t=M.emptyTrip();
  t=M.add(t,{lat:59.22,lon:17.83,name:'Start',kind:'start',mode:'none'});
  t=M.add(t,{lat:59.23,lon:17.84,name:'Parking',kind:'parking',mode:'drive'});
  t=M.add(t,{lat:59.24,lon:17.85,name:'Szlak',kind:'stop',mode:'walk'});
  const cache=Object.create(null),memory=new Map();
  const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
  I.save(storage,t,cache);
  const loaded=I.load(storage);
  assert.deepEqual(loaded.trip,t);
  const ss=R.displaySegments(loaded.trip,loaded.routes);
  assert.equal(ss.length,2);assert.deepEqual(ss.map(s=>s.mode),['drive','walk']);assert.ok(ss.every(s=>s.status==='draft'));
  const xml=I.gpx(loaded.trip,loaded.routes);
  assert.ok(xml.includes('SZKIC PO LINII PROSTEJ'));assert.ok(xml.includes('draft-drive')&&xml.includes('draft-walk'));
});
console.log('MVP integration checks completed: '+count);
