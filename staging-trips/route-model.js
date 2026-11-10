/* NORDIC TRAIL — local-only manual trip prototype. No network, no accounts. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NordicTripModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_POINTS=100;
  const KINDS=['start','parking','stop','view','camp','finish'];
  const MODES=['drive','walk'];
  const KIND_LABELS={start:'Start',parking:'Parking',stop:'Postój',view:'Punkt widokowy',camp:'Biwak',finish:'Meta'};
  const MODE_LABELS={drive:'Samochód',walk:'Pieszo'};
  function checkCoord(n,min,max){
    if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Nieprawidłowe współrzędne.');
    return Math.round(n*1000000)/1000000;
  }
  function label(s,max=80){
    if(typeof s!=='string')return '';
    return s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  }
  function emptyTrip(){return {version:1,name:'Nowa wyprawa',nextId:1,waypoints:[]};}
  function normalize(input){
    if(!input||typeof input!=='object'||input.version!==1||!Array.isArray(input.waypoints)||input.waypoints.length>MAX_POINTS)throw Error('Nieprawidłowy zapis wyprawy.');
    const ids=new Set();
    const waypoints=input.waypoints.map((p,i)=>{
      if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^p[1-9]\d{0,7}$/.test(p.id)||ids.has(p.id))throw Error('Nieprawidłowy identyfikator punktu.');
      ids.add(p.id);
      if(!KINDS.includes(p.kind))throw Error('Nieznany rodzaj punktu.');
      if(i>0&&!MODES.includes(p.mode))throw Error('Nieznany rodzaj odcinka.');
      return {id:p.id,lat:checkCoord(p.lat,-90,90),lon:checkCoord(p.lon,-180,180),name:label(p.name)||'Punkt '+(i+1),kind:p.kind,mode:i===0?'none':p.mode};
    });
    const maxId=waypoints.reduce((m,p)=>Math.max(m,Number(p.id.slice(1))),0);
    const nextId=Math.max(Number.isSafeInteger(input.nextId)?input.nextId:1,maxId+1);
    if(nextId>99999999)throw Error('Limit identyfikatorów punktów.');
    return {version:1,name:label(input.name,100)||'Nowa wyprawa',nextId,waypoints};
  }
  function add(trip,values){
    const t=normalize(trip);
    if(t.waypoints.length>=MAX_POINTS)throw Error('Maksymalnie 100 punktów w wyprawie.');
    const i=t.waypoints.length;
    const p={id:'p'+t.nextId,lat:checkCoord(values.lat,-90,90),lon:checkCoord(values.lon,-180,180),
      name:label(values.name)||'Punkt '+(i+1),kind:values.kind,mode:i===0?'none':values.mode};
    if(!KINDS.includes(p.kind)||i>0&&!MODES.includes(p.mode))throw Error('Wybierz rodzaj punktu i odcinka.');
    t.waypoints.push(p);t.nextId++;
    return t;
  }
  function repairFirst(t){
    t.waypoints.forEach((p,i)=>{if(i===0)p.mode='none';else if(p.mode==='none')p.mode='drive';});
    return t;
  }
  function change(trip,id,fields){
    const t=normalize(trip);
    const p=t.waypoints.find(x=>x.id===id);
    if(!p)throw Error('Nie znaleziono punktu.');
    if(Object.prototype.hasOwnProperty.call(fields,'name'))p.name=label(fields.name)||p.name;
    if(Object.prototype.hasOwnProperty.call(fields,'kind')){
      if(!KINDS.includes(fields.kind))throw Error('Nieprawidłowy rodzaj punktu.');
      p.kind=fields.kind;
    }
    if(Object.prototype.hasOwnProperty.call(fields,'mode')){
      if(p===t.waypoints[0])throw Error('Punkt startowy nie ma odcinka dojazdu.');
      if(!MODES.includes(fields.mode))throw Error('Nieprawidłowy rodzaj odcinka.');
      p.mode=fields.mode;
    }
    return t;
  }
  function remove(trip,id){
    const t=normalize(trip),i=t.waypoints.findIndex(x=>x.id===id);
    if(i===-1)throw Error('Nie znaleziono punktu.');
    t.waypoints.splice(i,1);
    return repairFirst(t);
  }
  function move(trip,id,step){
    const t=normalize(trip),i=t.waypoints.findIndex(x=>x.id===id),j=i+step;
    if(i<0||![-1,1].includes(step)||j<0||j>=t.waypoints.length)throw Error('Nie można przesunąć punktu.');
    [t.waypoints[i],t.waypoints[j]]=[t.waypoints[j],t.waypoints[i]];
    return repairFirst(t);
  }
  function renameTrip(trip,name){const t=normalize(trip);t.name=label(name,100)||'Nowa wyprawa';return t;}
  function lengthKm(a,b){
    const rad=Math.PI/180;
    const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 6371.0088*2*Math.atan2(Math.sqrt(Math.max(0,h)),Math.sqrt(Math.max(0,1-h)));
  }
  function segments(trip){
    const t=normalize(trip),result=[];
    for(let i=1;i<t.waypoints.length;i++){
      const a=t.waypoints[i-1],b=t.waypoints[i];
      result.push({from:a,to:b,mode:b.mode,km:lengthKm(a,b)});
    }
    return result;
  }
  function summary(trip){
    const list=segments(trip);
    const drive=list.filter(x=>x.mode==='drive').reduce((sum,s)=>sum+s.km,0);
    const walk=list.filter(x=>x.mode==='walk').reduce((sum,s)=>sum+s.km,0);
    return {waypoints:normalize(trip).waypoints.length,driveKm:drive,walkKm:walk,totalKm:drive+walk};
  }
  function escapeXml(value){
    return String(value).replace(/[^\u0009\u000a\u000d\u0020-\uD7FF\uE000-\uFFFD]/g,'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }
  function gpx(trip){
    const t=normalize(trip);
    const fmt=n=>n.toFixed(6);
    const wpts=t.waypoints.map(p=>'<wpt lat="'+fmt(p.lat)+'" lon="'+fmt(p.lon)+'"><name>'+escapeXml(p.name)+'</name><type>'+escapeXml(KIND_LABELS[p.kind])+'</type></wpt>');
    const groups=[];
    for(const s of segments(t)){
      let g=groups[groups.length-1];
      if(!g||g.mode!==s.mode){g={mode:s.mode,points:[s.from]};groups.push(g);}
      g.points.push(s.to);
    }
    const trks=groups.map((g,i)=>'<trk><name>'+escapeXml(MODE_LABELS[g.mode]+' — odcinek '+(i+1))+'</name><desc>Szkic po linii prostej. Nie służy do nawigacji ani potwierdzania dostępności drogi.</desc><type>draft-'+g.mode+'</type><trkseg>'+
      g.points.map(p=>'<trkpt lat="'+fmt(p.lat)+'" lon="'+fmt(p.lon)+'"></trkpt>').join('')+'</trkseg></trk>');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="NORDIC TRAIL — szkic" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>'+
      escapeXml(t.name)+'</name><desc>Ręczny szkic prostych odcinków. Nie korzystaj jako z nawigacji.</desc></metadata>'+
      wpts.join('')+trks.join('')+'</gpx>\n';
  }
  return Object.freeze({MAX_POINTS,KINDS,MODES,KIND_LABELS,MODE_LABELS,emptyTrip,normalize,add,change,remove,move,renameTrip,lengthKm,segments,summary,gpx});
});
