/* NORDIC TRAIL — isolated ORS adapter experiment, 2026-11-27.
 * Synthetic offline fixtures only; no fetch, credentials, or storage.
 * POST request descriptors are for a future authenticated server-side proxy.
 * Never mix provider profiles in the existing route cache without a provider-aware key.
 * Do not enable live requests or GPX export until terms and attribution are verified.
 * Run locally: node ors-adapter.test.js
 * API documentation: https://playground.heigit.org/
 */
"use strict";
function createOrsAdapter(){
 const base="https://api.heigit.org/openrouteservice/v2/directions/";
 function coord(p){
  if(!p||typeof p.lat!=="number"||typeof p.lon!=="number"||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)throw Error("Nieprawidłowe współrzędne.");
  return {lat:Math.round(p.lat*1e6)/1e6,lon:Math.round(p.lon*1e6)/1e6};
 }
 function profile(mode,hiking=false){if(mode==="drive"&&!hiking)return "driving-car";if(mode==="walk")return hiking?"foot-hiking":"foot-walking";throw Error("Nieobsługiwany tryb.");}
 function routeKey(a,b,mode){a=coord(a);b=coord(b);profile(mode);return mode+":"+a.lat.toFixed(6)+","+a.lon.toFixed(6)+":"+b.lat.toFixed(6)+","+b.lon.toFixed(6);}
 function kmBetween(a,b){const k=Math.PI/180;const h=Math.sin((b.lat-a.lat)*k/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin((b.lon-a.lon)*k/2)**2;return 6371.0088*2*Math.atan2(Math.sqrt(Math.max(0,h)),Math.sqrt(Math.max(0,1-h)));}
 function request(from,to,mode,{hiking=false}={}){
  const a=coord(from),b=coord(to);
  if(a.lat===b.lat&&a.lon===b.lon)throw Error("Punkty są identyczne.");
  const p=profile(mode,hiking);
  return {url:base+p+"/geojson",profile:p,method:"POST",body:{coordinates:[[a.lon,a.lat],[b.lon,b.lat]],units:"m",instructions:false}};
 }
 function parse(response,from,to,mode,{hiking=false}={}){
  const a=coord(from),b=coord(to),p=profile(mode,hiking);
  if(!response||response.type!=="FeatureCollection"||!Array.isArray(response.features)||response.features.length!==1)throw Error("Brak pojedynczej trasy ORS.");
  const f=response.features[0],g=f?.geometry,s=f?.properties?.summary;
  if(f?.type!=="Feature"||g?.type!=="LineString"||!Array.isArray(g.coordinates)||g.coordinates.length<2||g.coordinates.length>30000)throw Error("Nieprawidłowa geometria ORS.");
  if(typeof s?.distance!=="number"||!Number.isFinite(s.distance)||s.distance<=0||s.distance>20000000||typeof s?.duration!=="number"||!Number.isFinite(s.duration)||s.duration<0)throw Error("Nieprawidłowe podsumowanie ORS.");
  const points=g.coordinates.map(c=>{if(!Array.isArray(c)||c.length<2)throw Error("Nieprawidłowy punkt GeoJSON.");return coord({lon:c[0],lat:c[1]});});
  const gapStartM=kmBetween(a,points[0])*1000,gapEndM=kmBetween(b,points.at(-1))*1000;
  if(gapStartM>1000||gapEndM>1000)throw Error("Trasa ORS jest zbyt daleko od wskazanych punktów.");
  return {key:routeKey(a,b,mode),mode,source:"ors-routing",providerProfile:p,status:"routed",legalAccess:"unverified",points,km:s.distance/1000,timeSeconds:s.duration,gapStartM,gapEndM,warning:gapStartM>50||gapEndM>50};
 }
 return Object.freeze({request,parse,profile,routeKey});
}
function runOfflineTests(A){
 const from={lat:59.2,lon:17.9},to={lat:59.202,lon:17.9};
 const fixture={type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"LineString",coordinates:[[17.9,59.2],[17.9002,59.2005],[17.9,59.2011]]},properties:{summary:{distance:135,duration:100}}}]};
 const result=[];
 function test(name,fn){try{if(!fn())throw Error("assertion failed");result.push({name,pass:true});}catch(e){result.push({name,pass:false,error:String(e.message||e)});}}
 function rejects(fn){try{fn();return false;}catch(_){return true;}}
 const clone=()=>JSON.parse(JSON.stringify(fixture));
 test("car profile and endpoint",()=>A.request(from,to,"drive").url==="https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson");
 test("walking profile",()=>A.request(from,to,"walk").profile==="foot-walking");
 test("hiking profile",()=>A.request(from,to,"walk",{hiking:true}).profile==="foot-hiking");
 test("longitude first",()=>JSON.stringify(A.request(from,to,"walk").body.coordinates)==="[[17.9,59.2],[17.9,59.202]]");
 test("distance m to km and time",()=>{const r=A.parse(fixture,from,to,"walk");return r.km===0.135&&r.timeSeconds===100;});
 test("gap kept and marked, no artificial connector",()=>{const r=A.parse(fixture,from,to,"walk");return r.warning&&r.gapEndM>95&&r.gapEndM<105&&r.points.at(-1).lat===59.2011&&r.points.length===3&&r.legalAccess==="unverified";});
 test("compatible directional key",()=>A.routeKey(from,to,"walk")==="walk:59.200000,17.900000:59.202000,17.900000"&&A.routeKey(from,to,"walk")!==A.routeKey(to,from,"walk"));
 test("reject invalid profile and coordinates",()=>rejects(()=>A.request(from,to,"bike"))&&rejects(()=>A.request({lat:100,lon:17},to,"drive")));
 test("reject no route / invalid geometry",()=>rejects(()=>A.parse({features:[]},from,to,"walk"))&&rejects(()=>{const f=clone();f.features[0].geometry.coordinates[1]=[17,91];A.parse(f,from,to,"walk");}));
 test("reject distant or invalid summary",()=>rejects(()=>{const f=clone();f.features[0].geometry.coordinates[2]=[17.9,59.25];A.parse(f,from,to,"walk");})&&rejects(()=>{const f=clone();f.features[0].properties.summary.distance=-1;A.parse(f,from,to,"walk");}));
 test("no API key or personal fields in request",()=>{const r=A.request(from,to,"drive");return Object.keys(r.body).sort().join(",")==="coordinates,instructions,units"&&!JSON.stringify(r).includes("api_key");});
 return result;
}
const adapter=createOrsAdapter();
module.exports=adapter;
if(require.main===module){const results=runOfflineTests(adapter);for(const r of results)console.log((r.pass?"PASS ":"FAIL ")+r.name+(r.error?": "+r.error:""));if(results.some(r=>!r.pass))process.exitCode=1;}
