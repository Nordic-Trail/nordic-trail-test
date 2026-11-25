/* Read-only OSM diagnostic. No routing, storage, or access authorization. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NTPlannerRoadAudit=api;})(globalThis,function(){
'use strict';
function traceIds(trace,points,R){
 if(!trace||typeof trace.shape!=='string'||!Array.isArray(trace.edges)||!trace.edges.length||trace.edges.length>4000)throw Error('Brak pełnych atrybutów przebiegu.');
 const decoded=R.decodePolyline6(trace.shape);
 if(decoded.length!==points.length||decoded.some((p,i)=>p.lat!==points[i].lat||p.lon!==points[i].lon))throw Error('Geometria odpowiedzi różni się od wyznaczonej trasy.');
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
return Object.freeze({traceIds,evaluate});
});