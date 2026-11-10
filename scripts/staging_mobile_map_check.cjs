'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','staging-app','index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1,'Exactly one inline JS application script');
assert.doesNotThrow(()=>new vm.Script(scripts[0]),'JavaScript syntax');
const cases=[
 ['Sheet responds to visual keyboard inset',html.includes('bottom:var(--nt-visual-bottom,0px)')],
 ['Visible viewport constrains sheet height',html.includes('var(--nt-visible-height,100dvh)')],
 ['VisualViewport resize and scroll observed',html.includes("window.visualViewport.addEventListener('resize',syncVisualViewport)")&&html.includes("window.visualViewport.addEventListener('scroll',syncVisualViewport)")],
 ['Sheet ResizeObserver maintains point visibility',html.includes('new ResizeObserver(()=>adjustMapToPanel())')],
 ['Sheet animation completion triggers alignment',html.includes("addEventListener('animationend',adjustMapToPanel)")],
 ['No hardcoded 260/650ms alignment timers',!html.includes('window.setTimeout(realign,260)')&&!html.includes('window.setTimeout(realign,650)')],
 ['Incidental map taps do not dismiss an open form',html.includes("message('point-sheet-status','Aby zmienić lokalizację")&&!html.includes("if(!el('point-sheet').hidden){\n      movingPoint=true")],
 ['Relocation uses explicit button and one next map click',html.includes("el('change-location-btn').addEventListener('click'")&&html.includes("if(!hadPoint&&!movingPoint)")],
 ['Return-to-form action present',html.includes("movingPoint?'↩ Wróć do formularza'")],
 ['Draft edit and save RPC preserved',html.includes("db.rpc('update_private_map_point'")&&html.includes("db.rpc('submit_map_point_for_review'")],
];
for(const [label,passed] of cases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}
function extract(name){
 const src=scripts[0],start=src.indexOf('  function '+name+'(');
 assert.ok(start>=0,'Missing '+name);
 const open=src.indexOf('{',start);let depth=0;
 for(let i=open;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'&&--depth===0)return src.slice(start,i+1);}
 throw Error('Unterminated '+name);
}
const fn=extract('keepSelectionVisible');
function recenter(pointY,hidden=false){
 const out=[];
 const map={latLngToContainerPoint:()=>({x:150,y:pointY}),panBy:o=>out.push(Array.from(o))};
 const context={
  map, selectedPoint:{lat:59,lon:18},
  el:id=>id==='point-sheet'?{hidden,getBoundingClientRect:()=>({top:450})}:{getBoundingClientRect:()=>({top:0,bottom:820,width:700})},
  document:{querySelector:()=>({getBoundingClientRect:()=>({bottom:80})})},
  window:{innerHeight:820,visualViewport:{offsetTop:0,height:820}}
 };
 vm.runInNewContext(fn+'; keepSelectionVisible();',context);
 return out.length?out[0]:null;
}
assert.deepEqual(recenter(370),[-200,88],'Must center in the exposed map area');
assert.equal(recenter(370,true),null,'Must not pan with sheet hidden');
console.log('PASS: Geometry checks and hidden-sheet guard');
console.log('Mobile map checks: '+(cases.length+1)+' PASS');
