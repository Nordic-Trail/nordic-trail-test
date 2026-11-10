/* NORDIC TRAIL — deterministic display-only grouping for nearby waypoint markers.
 * Coordinates and waypoint IDs are never changed. No network and no storage.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NordicMarkerGroups=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function group(waypoints,project,threshold=46){
  if(!Array.isArray(waypoints)||waypoints.length>100||typeof project!=='function'||
   typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<=0||threshold>200)
   throw Error('Nieprawidłowe dane grupowania znaczników.');
  const position=waypoints.map(p=>{
   if(!p||typeof p.id!=='string'||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))
    throw Error('Nieprawidłowy punkt.');
   const xy=project(p);
   if(!xy||!Number.isFinite(xy.x)||!Number.isFinite(xy.y))
    throw Error('Nieprawidłowa pozycja znacznika.');
   return xy;
  });
  const parents=waypoints.map((_,i)=>i);
  function find(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;}
  function union(i,j){const a=find(i),b=find(j);if(a!==b)parents[b]=a;}
  const radius2=threshold*threshold;
  for(let i=0;i<position.length;i++){
   for(let j=i+1;j<position.length;j++){
    const dx=position[i].x-position[j].x,dy=position[i].y-position[j].y;
    if(dx*dx+dy*dy<=radius2)union(i,j);
   }
  }
  const groups=new Map();
  waypoints.forEach((_,i)=>{
   const root=find(i);
   if(!groups.has(root))groups.set(root,[]);
   groups.get(root).push(i);
  });
  return [...groups.values()].map(indices=>({
   indices,ids:indices.map(i=>waypoints[i].id),
   lat:indices.reduce((sum,i)=>sum+waypoints[i].lat,0)/indices.length,
   lon:indices.reduce((sum,i)=>sum+waypoints[i].lon,0)/indices.length
  }));
 }
 return Object.freeze({group});
});