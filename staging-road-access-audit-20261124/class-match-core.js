/* Diagnostic only: class agreement and shared OSM nodes, not road identity or access. */
(function(root,factory){const a=factory();if(typeof module==='object'&&module.exports)module.exports=a;else root.NTClassMatch=a;})(globalThis,function(){
'use strict';
const motor=new Set(['motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link','track']);
function type(t={}){if(t.highway==='cycleway')return 'cycle';if(['footway','steps','pedestrian','corridor'].includes(t.highway)||t.footway==='sidewalk')return 'walk';if(motor.has(t.highway))return 'motor';return 'unknown';}
function analyze(source,ways,network,nearest){
 const measure=(ds,limit)=>source.total>0?Math.min(1,ds.reduce((s,d,i)=>s+(d<=limit?source.out[i].w:0),0)/source.total):0;
 const scored=ways.map(w=>{const ds=source.out.map(p=>nearest(p,w.line));return {w,ds,type:type(w.tags),coverage:measure(ds,6),near:measure(ds,12)};}).filter(r=>r.near>0);
 const compatible=scored.filter(r=>r.type===network);
 const conflicts=scored.filter(r=>r.type!==network&&r.near>=.2).sort((a,b)=>b.near-a.near);
 const validNodes=w=>Array.isArray(w.nodes)&&w.nodes.length===w.line.length&&w.nodes.every(n=>Number.isSafeInteger(n)&&n>0);
 const groups=[],seen=new Set();
 for(const start of compatible){
  if(seen.has(start))continue;
  const group=[start];seen.add(start);
  for(let i=0;i<group.length;i++){const a=group[i].w;if(!validNodes(a))continue;const set=new Set(a.nodes);
   for(const r of compatible){if(seen.has(r)||!validNodes(r.w)||!r.w.nodes.some(n=>set.has(n)))continue;seen.add(r);group.push(r);}
  }
  const ds=source.out.map((_,i)=>Math.min(...group.map(r=>r.ds[i])));
  groups.push({ids:group.map(r=>r.w.id),coverage:measure(ds,6),near:measure(ds,12),nodesComplete:group.every(r=>validNodes(r.w))});
 }
 groups.sort((a,b)=>b.coverage-a.coverage||b.near-a.near);
 return {groups,conflicts:conflicts.map(r=>({id:r.w.id,type:r.type,coverage:r.coverage,near:r.near})),match:'unconfirmed',legalAccess:'unverified'};
}
return Object.freeze({type,analyze});
});