'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..','staging-trips-integrated');
const I=require(path.join(dir,'integration-model.js'));
const M=require('../staging-trips/route-model.js');
const R=require('../staging-trips/routing-core.js');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let count=0;function check(name,fn){fn();count++;console.log('PASS: '+name);}
const a={lat:42.225139,lon:-8.670911},b={lat:42.225224,lon:-8.670718};
let t=M.emptyTrip();t=M.renameTrip(t,'Test & <route>');
t=M.add(t,{...a,name:'Start & <1>',kind:'start',mode:'none'});
t=M.add(t,{...b,name:'Parking',kind:'parking',mode:'drive'});
const routed=R.parseValhallaResponse({trip:{legs:[{shape:'e~epoA|jfpOiDaK'}],summary:{length:.025,time:10}}},a,b,'drive');
const cache={[routed.key]:routed};
check('v2 envelope restores exact routed geometry',()=>{
 const p=I.pack(t,cache);
 assert.equal(p.version,2);
 assert.deepEqual(I.unpack(JSON.parse(JSON.stringify(p))),p);
});
check('GPX contains routed section and escaped waypoint names',()=>{
 const xml=I.gpx(t,cache);
 assert.ok(xml.includes('osm-drive')&&xml.includes('Start &amp; &lt;1&gt;'));
 assert.equal((xml.match(/<trkpt /g)||[]).length,2);
});
check('Draft GPX is explicitly marked as non-navigation',()=>{
 const xml=I.gpx(t,{});
 assert.ok(xml.includes('draft-drive')&&xml.includes('SZKIC PO LINII PROSTEJ'));
 assert.throws(()=>I.gpx(t,{}, {draftsAllowed:false}));
});
check('Mixed GPX preserves both actual and draft legs',()=>{
 const mixed=M.add(t,{lat:42.23,lon:-8.68,name:'Szlak',kind:'stop',mode:'walk'});
 const xml=I.gpx(mixed,cache);
 assert.ok(xml.includes('osm-drive')&&xml.includes('draft-walk'));
 assert.equal((xml.match(/<trkpt /g)||[]).length,4);
});
check('Changing mode or coordinates invalidates route cache',()=>{
 assert.equal(Object.keys(I.pack(M.change(t,'p2',{mode:'walk'}),cache).routes).length,0);
 assert.equal(Object.keys(I.pack(M.remove(t,'p2'),cache).routes).length,0);
});
check('Cache rejects geometry outside specified endpoints',()=>{
 const invalid={...routed,points:[{lat:10,lon:12},{lat:11,lon:13}]};
 assert.equal(Object.keys(I.pack(t,{[routed.key]:invalid}).routes).length,0);
});
check('v2 writes never overwrite v1 storage',()=>{
 assert.notEqual(I.KEY,I.LEGACY_KEY);
 const old=JSON.stringify(t),data=new Map([[I.LEGACY_KEY,old]]);
 const store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(I.load(store).from,'v1');
 assert.equal(data.size,1);
 I.save(store,t,cache);
 assert.equal(data.get(I.LEGACY_KEY),old);
 assert.equal(I.load(store).from,'v2');
});
check('Bad v2 save cannot silently delete legacy',()=>{
 const old=JSON.stringify(t),data=new Map([[I.KEY,'{invalid'],[I.LEGACY_KEY,old]]);
 assert.throws(()=>I.load({getItem:k=>data.get(k)||null}));
 assert.equal(data.get(I.LEGACY_KEY),old);
});
check('Model has no requests or access to Supabase',()=>{
 const src=fs.readFileSync(path.join(dir,'integration-model.js'),'utf8');
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|navigator\.geolocation|\.rpc\s*\(/.test(src));
});
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
check('Integrated page has valid JavaScript',()=>{
 assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0]));
});
check('Manual routing consent is required',()=>{
 const src=scripts[0];
 assert.ok(html.includes('id="route-consent" type="checkbox"'));
 assert.ok(src.includes("if(!el('route-consent').checked)"));
 assert.ok(src.includes("credentials:'omit'")&&src.includes("MAX_CALLS=6,MAX_SEGMENTS=4,MIN_INTERVAL=1650"));
});
check('Integrated page only persists via v2 and asks before mixed export',()=>{
 const src=scripts[0];
 assert.ok(src.includes('I.save(localStorage,trip,routes)'));
 assert.ok(!/localStorage\.setItem\s*\(/.test(src));
 assert.ok(src.includes("if(draft&&!confirm(")&&src.includes("I.gpx(trip,routes)"));
});
check('UI provides edit, save, layers, routing, status',()=>{
 for(const id of ['map','fit-trip','points','save-local','export-gpx','route-consent','compute-routes','clear-routes','routing-status','action-status','visible-drive','visible-walk'])
  assert.ok(html.includes('id="'+id+'"'));
});
check('Overlapping points form a stable group without moving coordinates',()=>{
 const G=require('../staging-trips-integrated/marker-groups.js');
 const points=[
  {id:'p1',lat:59.19832,lon:17.85862},
  {id:'p2',lat:59.155,lon:17.8198},
  {id:'p3',lat:59.16255,lon:17.87723},
  {id:'p4',lat:59.16210,lon:17.8818}
 ];
 const xy=[{x:0,y:0},{x:100,y:110},{x:300,y:300},{x:326,y:310}];
 const original=JSON.stringify(points);
 const grouped=G.group(points,p=>xy[points.indexOf(p)],46);
 assert.equal(grouped.length,3);
 assert.deepEqual(grouped[2].ids,['p3','p4']);
 assert.equal(JSON.stringify(points),original);
});
check('Expanded zoom separates points and exact coordinates remain',()=>{
 const G=require('../staging-trips-integrated/marker-groups.js');
 const points=[{id:'p3',lat:59.16255,lon:17.87723},{id:'p4',lat:59.16210,lon:17.8818}];
 const close=G.group(points,p=>({x:points.indexOf(p)*20,y:0}));
 const far=G.group(points,p=>({x:points.indexOf(p)*100,y:0}));
 assert.equal(close.length,1);
 assert.equal(far.length,2);
 assert.equal(far[1].lat,59.16210);
});
check('Map group popup allows selecting exact point safely',()=>{
 const source=html.match(/<script>\n('use strict';[\s\S]*?)<\/script>/)[1];
 assert.ok(html.includes('src="marker-groups.js"'));
 assert.ok(source.includes('G.group(trip.waypoints'));
 assert.ok(source.includes('document.createElement'));
 assert.ok(source.includes("item.textContent=(i+1)+'. '+p.name"));
 assert.ok(source.includes('edit(p.id)'));
 assert.ok(source.includes("map.on('zoomend moveend',drawMarkers)"));
 assert.ok(!source.includes('innerHTML='));
});
check('Restoring v2 route produces accurate route status',()=>{
 const source=html.match(/<script>\n('use strict';[\s\S]*?)<\/script>/)[1];
 assert.ok(source.includes("if(loaded.from==='v2'){"));
 assert.ok(source.includes('Przywrócono '+ "'+saved+'" +' obliczonych odcinków OSM'));
 assert.ok(source.includes('Nie trzeba ponownie wysyłać współrzędnych'));
});

console.log('Integrated planner: '+count+' PASS');
