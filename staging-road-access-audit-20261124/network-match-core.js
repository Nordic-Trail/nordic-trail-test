/* Experimental geometry comparison, synthetic metric coordinates only.
Never confers access rights, never promotes a geometric candidate to exact match. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NTNetworkMatch=api;})(globalThis,function(){
'use strict';
const validLine=l=>Array.isArray(l)&&l.length>=2&&l.length<=1000&&l.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
const length=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function sample(line){
 if(!validLine(line))return null;
 const out=[];let total=0;
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],len=length(a,b);if(!len)continue;total+=len;if(total>2000)return null;
  const n=Math.ceil(len/4),ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;
  for(let j=0;j<n;j++){const t=(j+.5)/n;out.push({x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,ux,uy,w:len/n});}
 }
 return total>=20?{out,total}:null;
}
function close(p,line){
 let best=Infinity;
 for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;
  if(Math.abs((p.ux*dx+p.uy*dy)/len)<Math.cos(Math.PI/6))continue;
  const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(len*len)));
  best=Math.min(best,Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy));
 }
 return best;
}
function compare(line,records){
 const src=sample(line);
 const result=(status,reason,candidates=[])=>({status,reason,candidates,match:'unconfirmed',legalAccess:'unverified'});
 if(!src||!Array.isArray(records)||records.length>500)return result('review','Dane wejściowe niekompletne lub poza zakresem prototypu.');
 if(records.some(r=>!r||!validLine(r.line)||!['motor','cycle','walk'].includes(r.network)||typeof r.elementId!=='string'||!r.elementId||typeof r.featureOid!=='string'||!r.featureOid))return result('review','Brak prawidłowej geometrii, klasy lub identyfikatorów NVDB.');
 const scores=records.map(r=>{
  const ds=src.out.map(p=>({d:close(p,r.line),w:p.w}));
  const share=limit=>ds.reduce((s,p)=>s+(p.d<=limit?p.w:0),0)/src.total;
  return {elementId:r.elementId,featureOid:r.featureOid,network:r.network,coverage:share(6),nearby:share(12)};
 }).sort((a,b)=>b.coverage-a.coverage||b.nearby-a.nearby);
 const near=scores.filter(r=>r.nearby>=.20);
 if(!near.length)return result('review','Nie znaleziono odpowiednika o zgodnym kierunku.');
 if(near.length!==1)return result('review','Wiele pobliskich odcinków lub podzielony przebieg — nie przypisujemy typu sieci.',near);
 if(near[0].coverage<.99)return result('review','Niepełne pokrycie geometrii.',near);
 return result('candidate','Jeden kandydat geometryczny. Konieczna niezależna weryfikacja tożsamości odcinka.',near);
}
return Object.freeze({compare});
});