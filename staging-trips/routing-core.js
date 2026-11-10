/* NORDIC TRAIL — provider-independent route geometry and safety labels.
 * No network calls, keys, location access, or browser storage in this module.
 * Routed geometry is NOT proof of legal access, open roads, or safe passage.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NordicRoutingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_POLYLINE_BYTES=500000,MAX_POINTS=30000;
 function coord(p){
  if(!p||typeof p!=='object'||typeof p.lat!=='number'||typeof p.lon!=='number'||
   !Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180){
   throw Error('Nieprawidłowe współrzędne trasy.');
  }
  return {lat:Math.round(p.lat*1e6)/1e6,lon:Math.round(p.lon*1e6)/1e6};
 }
 function profile(mode){
  if(mode==='drive')return 'auto';
  if(mode==='walk')return 'pedestrian';
  throw Error('Nieobsługiwany sposób podróży.');
 }
 function routeKey(from,to,mode){
  const a=coord(from),b=coord(to);
  profile(mode);
  return mode+':'+a.lat.toFixed(6)+','+a.lon.toFixed(6)+':'+b.lat.toFixed(6)+','+b.lon.toFixed(6);
 }
 function request(from,to,mode){
  const a=coord(from),b=coord(to);
  return {locations:[a,b],costing:profile(mode),units:'kilometers',directions_options:{units:'kilometers'}};
 }
 function decodePolyline6(encoded){
  if(typeof encoded!=='string'||!encoded.length||encoded.length>MAX_POLYLINE_BYTES)throw Error('Nieprawidłowa geometria trasy.');
  let cursor=0,lat=0,lon=0;
  const points=[];
  function delta(){
   let value=0,shift=0,byte;
   do{
    if(cursor>=encoded.length||shift>35)throw Error('Uszkodzona geometria trasy.');
    byte=encoded.charCodeAt(cursor++)-63;
    if(byte<0||byte>63)throw Error('Uszkodzona geometria trasy.');
    value+=(byte&31)*Math.pow(2,shift);
    shift+=5;
   }while(byte>=32);
   return value%2===1?-(Math.floor(value/2)+1):Math.floor(value/2);
  }
  while(cursor<encoded.length){
   if(points.length>=MAX_POINTS)throw Error('Trasa zawiera zbyt wiele punktów.');
   lat+=delta();lon+=delta();
   points.push(coord({lat:lat/1e6,lon:lon/1e6}));
  }
  if(points.length<2)throw Error('Geometria trasy jest zbyt krótka.');
  return points;
 }
 function kmBetween(a,b){
  const x=coord(a),y=coord(b),k=Math.PI/180;
  const h=Math.sin((y.lat-x.lat)*k/2)**2+
   Math.cos(x.lat*k)*Math.cos(y.lat*k)*Math.sin((y.lon-x.lon)*k/2)**2;
  return 6371.0088*2*Math.atan2(Math.sqrt(Math.max(0,h)),Math.sqrt(Math.max(0,1-h)));
 }
 function parseValhallaResponse(response,from,to,mode){
  const key=routeKey(from,to,mode);
  const trip=response&&response.trip;
  if(!trip||!Array.isArray(trip.legs)||trip.legs.length!==1||!trip.summary){
   throw Error('Brak kompletnej trasy z silnika trasowania.');
  }
  const km=trip.summary.length;
  if(typeof km!=='number'||!Number.isFinite(km)||km<=0||km>20000){
   throw Error('Nieprawidłowa długość trasy.');
  }
  const points=decodePolyline6(trip.legs[0].shape);
  if(kmBetween(points[0],from)>1||kmBetween(points[points.length-1],to)>1){
   throw Error('Trasa nie łączy wskazanych miejsc.');
  }
  return {
   key,mode,source:'osm-routing',status:'routed',legalAccess:'unverified',
   points,km,timeSeconds:Number.isFinite(trip.summary.time)&&trip.summary.time>=0?trip.summary.time:null
  };
 }
 function displaySegments(trip,routeCache){
  if(!trip||!Array.isArray(trip.waypoints)||trip.waypoints.length>100)throw Error('Nieprawidłowy plan wyprawy.');
  const list=[];
  for(let i=1;i<trip.waypoints.length;i++){
   const from=coord(trip.waypoints[i-1]),to=coord(trip.waypoints[i]);
   const mode=trip.waypoints[i].mode,key=routeKey(from,to,mode);
   const routed=routeCache&&Object.prototype.hasOwnProperty.call(routeCache,key)?routeCache[key]:null;
   const valid=!!routed&&routed.key===key&&routed.mode===mode&&routed.status==='routed'&&
    routed.legalAccess==='unverified'&&Array.isArray(routed.points)&&routed.points.length>=2&&
    routed.points.length<=MAX_POINTS&&routed.points.every(p=>{try{coord(p);return true;}catch(_){return false;}})&&
    kmBetween(routed.points[0],from)<=1&&kmBetween(routed.points[routed.points.length-1],to)<=1&&
    Number.isFinite(routed.km)&&routed.km>0;
   list.push(valid?{from,to,mode,key,status:'routed',legalAccess:'unverified',points:routed.points,km:routed.km}:
    {from,to,mode,key,status:'draft',legalAccess:'unverified',points:[from,to],km:kmBetween(from,to)});
  }
  return list;
 }
 return Object.freeze({coord,profile,routeKey,request,decodePolyline6,parseValhallaResponse,displaySegments});
});
