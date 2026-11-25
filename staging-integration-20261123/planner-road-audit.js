/* Read-only OSM diagnostic. No routing, storage, or access authorization. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NTPlannerRoadAudit=api;})(globalThis,function(){
'use strict';
function encode(points,R){
 let out='',lat=0,lon=0;
 function delta(d){let v=d<0?-2*d-1:2*d;while(v>=32){out+=String.fromCharCode((v%32)+32+63);v=Math.floor(v/32);}out+=String.fromCharCode(v+63);}
 for(const raw of points){const p=R.coord(raw),a=Math.round(p.lat*1e6),b=Math.round(p.lon*1e6);delta(a-lat);delta(b-lon);lat=a;lon=b;}
 return out;
}
function traceIds(trace,points,R){
 if(!trace||typeof trace.shape!=='string'||!Array.isArray(trace.edges)||!trace.edges.length||trace.edges.length>4000)throw Error('Brak pełnych atrybutów przebiegu.');
 const decoded=R.decodePolyline6(trace.shape);
 if(decoded.length!==points.length||decoded.some((p,i)=>p.lat!==points[i].lat||p.lon!==points[i].lon)){
 const metres=(a,b)=>{const k=Math.PI/180,h=Math.sin((b.lat-a.lat)*k/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin((b.lon-a.lon)*k/2)**2;return Math.round(1274201760*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h)))))/100;};
 const first=metres(points[0],decoded[0]),last=metres(points.at(-1),decoded.at(-1));
 const mismatch=decoded.length===points.length?decoded.filter((p,i)=>p.lat!==points[i].lat||p.lon!==points[i].lon).length:null;
 throw Error('Niezgodność geometrii: wejście '+points.length+' punktów, odpowiedź '+decoded.length+'; odchylenie początku '+first+' m, końca '+last+' m'+(mismatch===null?'':'; różne punkty '+mismatch)+' — nie przypisano dróg');
 }
 let end=0;const ids=new Set();
 for(const e of trace.edges){if(!Number.isInteger(e.begin_shape_index)||!Number.isInteger(e.end_shape_index)||e.begin_shape_index!==end||e.end_shape_index<=end||e.end_shape_index>=decoded.length||!Number.isSafeInteger(e.way_id)||e.way_id<=0)throw Error('Niepełne pokrycie lub identyfikatory dróg.');end=e.end_shape_index;ids.add(e.way_id);}
 if(end!==decoded.length-1||ids.size>80)throw Error('Niepełne pokrycie lub limit 80 dróg.');
 return [...ids];
}
function evaluate(ids,data,A){
 if(!Array.isArray(data?.elements)||data.remark)throw Error('Niepełne dane OSM.');
 const byId=new Map(data.elements.filter(x=>x.type==='way'&&x.visible!==false).map(x=>[x.id,x]));
 return ids.map(id=>{const w=byId.get(id);if(!w||!w.tags||typeof w.tags.highway!=='string')return {id,status:'missing',reason:'Brak klasyfikacji źródłowej OSM.'};const r=A.assess({match:'exact',osm:w.tags});return {id,status:r.status,reason:r.reason};});
}
return Object.freeze({encode,traceIds,evaluate});
});