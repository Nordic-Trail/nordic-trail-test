/* NORDIC TRAIL v3 — independent vehicle / walking legs. Pure JS, no I/O. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NordicTripV3=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_LEGS=40,MAX_POINTS=100,MODES=['drive','walk'],ROLES=['start','via','finish'];
function fail(msg){throw Error(msg);}
function clean(s,max=100){return typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';}
function coord(input){
 if(!input||!Number.isFinite(input.lat)||!Number.isFinite(input.lon)||Math.abs(input.lat)>90||Math.abs(input.lon)>180)fail('Nieprawidłowe współrzędne.');
 return {lat:Math.round(input.lat*1e6)/1e6,lon:Math.round(input.lon*1e6)/1e6};
}
function place(input,id,role){
 const c=coord(input);return {id,role,name:clean(input.name,80)||role,lat:c.lat,lon:c.lon};
}
function initial(name='Nowa wyprawa'){
 return {version:3,name:clean(name)||'Nowa wyprawa',nextId:1,legs:{},itinerary:[],links:[],visible:{drive:true,walk:true}};
}
function clone(input){return JSON.parse(JSON.stringify(input));}
function check(input){
 if(!input||input.version!==3||typeof input.legs!=='object'||!input.legs||Array.isArray(input.legs)||!Array.isArray(input.itinerary)||!Array.isArray(input.links)||input.itinerary.length>MAX_LEGS)fail('Nieprawidłowy model wyprawy v3.');
 const t=clone(input),ids=Object.keys(t.legs),pointIds=new Set();
 if(ids.length!==t.itinerary.length||new Set(t.itinerary).size!==ids.length||!ids.every(id=>t.itinerary.includes(id)))fail('Nieprawidłowa kolejność etapów.');
 if(!Number.isSafeInteger(t.nextId)||t.nextId<1||t.nextId>1e9||typeof t.name!=='string'||t.name.length>100)fail('Nieprawidłowe metadane.');
 if(!t.visible||typeof t.visible.drive!=='boolean'||typeof t.visible.walk!=='boolean')fail('Nieprawidłowe warstwy.');
 for(const id of ids){
  const leg=t.legs[id];
  if(!/^l[1-9]\d*$/.test(id)||!leg||leg.id!==id||!MODES.includes(leg.mode)||!Array.isArray(leg.points)||leg.points.length<2||leg.points.length>MAX_POINTS)fail('Nieprawidłowy etap.');
  leg.points.forEach((p,i)=>{
   if(!p||typeof p.id!=='string'||pointIds.has(p.id)||typeof p.name!=='string'||p.name.length>80||p.role!==(i===0?'start':i===leg.points.length-1?'finish':'via'))fail('Nieprawidłowy punkt.');
   const c=coord(p);p.lat=c.lat;p.lon=c.lon;pointIds.add(p.id);
  });
  if(!leg.geometry||!['draft','routed'].includes(leg.geometry.status)||!Array.isArray(leg.geometry.points)||leg.geometry.points.length>30000)fail('Nieprawidłowa geometria.');
  if(leg.geometry.status==='routed'){
   if(leg.geometry.points.length<2||!Number.isFinite(leg.geometry.km)||leg.geometry.km<=0)fail('Nieprawidłowa wyznaczona trasa.');
   for(const p of leg.geometry.points)coord(p);
   if(distance(leg.geometry.points[0],leg.points[0])>0.1||distance(leg.geometry.points.at(-1),leg.points.at(-1))>0.1)fail('Geometria nie pasuje do końców etapu.');
  }else if(leg.geometry.points.length)fail('Szkic nie może udawać gotowej geometrii.');
 }
 if(t.links.length>MAX_LEGS*2)fail('Zbyt wiele łączników.');
 const linkIds=new Set();
 for(const link of t.links){
  if(!link||typeof link.id!=='string'||linkIds.has(link.id)||!['transfer','return-to-car'].includes(link.kind)||!pointIds.has(link.fromPointId)||!pointIds.has(link.toPointId)||link.fromPointId===link.toPointId)fail('Nieprawidłowy łącznik.');
  linkIds.add(link.id);
 }
 return t;
}
function distance(a,b){
 const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lon-a.lon)*r;
 const h=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;
 return 6371008.8*2*Math.atan2(Math.sqrt(Math.max(0,h)),Math.sqrt(Math.max(0,1-h)));
}
function edit(trip,callback){
 const t=check(trip);callback(t);return check(t);
}
function addLeg(trip,mode,start,finish,index){
 if(!MODES.includes(mode))fail('Nieprawidłowy tryb.');
 return edit(trip,t=>{
  if(t.itinerary.length===MAX_LEGS)fail('Limit etapów.');
  const id='l'+t.nextId++,a=place(start,id+'-start','start'),b=place(finish,id+'-finish','finish');
  t.legs[id]={id,mode,points:[a,b],geometry:{status:'draft',points:[]}};
  t.itinerary.splice(index===undefined?t.itinerary.length:Math.max(0,Math.min(t.itinerary.length,index)),0,id);
 });
}
function addVia(trip,legId,input,index){
 return edit(trip,t=>{
  const leg=t.legs[legId];if(!leg)fail('Nie znaleziono etapu.');
  if(leg.points.length===MAX_POINTS)fail('Limit punktów.');
  const next=leg.points.filter(p=>p.role==='via').length+1;
  const via=place(input,legId+'-via-'+t.nextId++,'via');
  const position=index===undefined?leg.points.length-1:Math.max(1,Math.min(leg.points.length-1,index));
  leg.points.splice(position,0,via);leg.geometry={status:'draft',points:[]};
 });
}
function movePoint(trip,legId,pointId,changes){
 return edit(trip,t=>{
  const leg=t.legs[legId];if(!leg)fail('Nie znaleziono etapu.');
  const p=leg.points.find(x=>x.id===pointId);if(!p)fail('Punkt nie należy do tej warstwy.');
  if(changes.lat!==undefined||changes.lon!==undefined){
   const next=coord({lat:changes.lat===undefined?p.lat:changes.lat,lon:changes.lon===undefined?p.lon:changes.lon});
   p.lat=next.lat;p.lon=next.lon;
   leg.geometry={status:'draft',points:[]};
  }
  if(changes.name!==undefined)p.name=clean(changes.name,80)||p.name;
 });
}
function removeVia(trip,legId,pointId){
 return edit(trip,t=>{
  const leg=t.legs[legId];if(!leg)fail('Nie znaleziono etapu.');
  const index=leg.points.findIndex(p=>p.id===pointId);
  if(index<1||index>=leg.points.length-1)fail('Można usuwać tylko punkt pośredni.');
  leg.points.splice(index,1);leg.geometry={status:'draft',points:[]};
  t.links=t.links.filter(l=>l.fromPointId!==pointId&&l.toPointId!==pointId);
 });
}
function removeLeg(trip,id){
 return edit(trip,t=>{
  if(!t.legs[id])fail('Nie znaleziono etapu.');
  const removed=new Set(t.legs[id].points.map(p=>p.id));
  delete t.legs[id];t.itinerary=t.itinerary.filter(x=>x!==id);
  t.links=t.links.filter(l=>!removed.has(l.fromPointId)&&!removed.has(l.toPointId));
 });
}
function reorder(trip,newOrder){
 return edit(trip,t=>{if(!Array.isArray(newOrder))fail('Nieprawidłowa kolejność.');t.itinerary=[...newOrder];});
}
function link(trip,fromPointId,toPointId,kind='transfer'){
 return edit(trip,t=>{
  if(!['transfer','return-to-car'].includes(kind))fail('Nieprawidłowy typ łącznika.');
  const id='x'+t.nextId++;
  t.links.push({id,fromPointId,toPointId,kind});
 });
}
function toggle(trip,mode,visible){
 return edit(trip,t=>{if(!MODES.includes(mode)||typeof visible!=='boolean')fail('Nieprawidłowy filtr.');t.visible[mode]=visible;});
}
function pointById(t,id){for(const leg of Object.values(t.legs)){const p=leg.points.find(x=>x.id===id);if(p)return {point:p,leg};}return null;}
function diagnostics(trip,{thresholdMeters=25}={}){
 const t=check(trip),issues=[],threshold=Math.max(1,Math.min(1000,thresholdMeters));
 for(let i=1;i<t.itinerary.length;i++){
  const a=t.legs[t.itinerary[i-1]],b=t.legs[t.itinerary[i]],end=a.points.at(-1),start=b.points[0],meters=distance(end,start);
  if(meters>threshold)issues.push({code:'TRANSFER_GAP',fromLeg:a.id,toLeg:b.id,meters:Math.round(meters),severity:'review'});
  if(a.mode==='walk'&&b.mode==='drive'&&meters>threshold)issues.push({code:'CAR_NOT_AT_WALK_END',fromLeg:a.id,toLeg:b.id,severity:'review'});
 }
 for(const x of t.links){
  const a=pointById(t,x.fromPointId),b=pointById(t,x.toPointId),meters=distance(a.point,b.point);
  if(meters>threshold)issues.push({code:'LINK_MOVED',linkId:x.id,meters:Math.round(meters),severity:'review'});
 }
 return issues;
}
function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function gpx(trip){
 const t=check(trip);let out='<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="NORDIC TRAIL v3" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>'+esc(t.name)+'</name></metadata>';
 t.itinerary.forEach((id,i)=>{
  const leg=t.legs[id],draft=leg.geometry.status!=='routed',pts=draft?leg.points:leg.geometry.points,mode=leg.mode==='drive'?'Samochód':'Pieszo';
  out+='<trk><name>'+esc((i+1)+'. '+mode+(draft?' — SZKIC':' — OSM'))+'</name><desc>'+esc(draft?'Szkic po prostej. Nie używać do nawigacji.':'Dostępność i legalność przejazdu niezweryfikowana.')+'</desc><type>'+esc((draft?'draft-':'osm-')+leg.mode)+'</type><trkseg>';
  for(const p of pts)out+='<trkpt lat="'+p.lat.toFixed(6)+'" lon="'+p.lon.toFixed(6)+'"></trkpt>';
  out+='</trkseg></trk>';
 });
 return out+'</gpx>\n';
}
return Object.freeze({initial,check,addLeg,addVia,movePoint,removeVia,removeLeg,reorder,link,toggle,diagnostics,gpx,distance});
});