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
 ['Map notices configured for five seconds',html.includes('},5000);')&&html.includes("if(id==='map-action-status'&&!isError)")],
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

const noticeSnippetStart=scripts[0].indexOf('  let mapNoticeTimer=null;');
const noticeSnippetEnd=scripts[0].indexOf('  const validKey=',noticeSnippetStart);
assert.ok(noticeSnippetStart>=0&&noticeSnippetEnd>noticeSnippetStart,'Notification helper exists');
const noticeElement={textContent:'',hidden:true,classList:{
  errors:new Set(),
  toggle(key,on){if(on)this.errors.add(key);else this.errors.delete(key)},
  contains(key){return this.errors.has(key)}
}};
const timers=new Map();let nextTimerId=1;
const noticeContext={
  el:id=>{assert.equal(id,'map-action-status');return noticeElement},
  window:{
    setTimeout(callback,ms){assert.equal(ms,5000);const id=nextTimerId++;timers.set(id,callback);return id;},
    clearTimeout(id){timers.delete(id)}
  }
};
vm.runInNewContext(scripts[0].slice(noticeSnippetStart,noticeSnippetEnd)+
  ';this.showNotice=message;this.closeNotice=dismissMapNotice;',noticeContext);
noticeContext.showNotice('map-action-status','Dotknij miejsca na mapie.');
assert.equal(noticeElement.hidden,false);
assert.equal(timers.size,1);
for(const callback of timers.values())callback();
timers.clear();
assert.equal(noticeElement.hidden,true,'Normal hint hides after five seconds');
console.log('PASS: Map hint dismisses automatically');
noticeContext.showNotice('map-action-status','First hint');
const staleCallback=[...timers.values()][0];
noticeContext.showNotice('map-action-status','Updated hint');
staleCallback();
assert.equal(noticeElement.hidden,false,'Stale callback must not hide replacement notice');
assert.equal(timers.size,1,'Old timer cancelled');
noticeContext.closeNotice();
assert.equal(noticeElement.hidden,true);
assert.equal(timers.size,0);
console.log('PASS: New map hint cancels prior timer; close clears timer');
noticeContext.showNotice('map-action-status','Important error',true);
assert.equal(noticeElement.hidden,false);
assert.equal(timers.size,0,'Error stays visible');
console.log('PASS: Important map errors remain visible');


const layerCases=[
 ['Map layers icon is accessible, not a text-heavy tile',html.includes('id="open-layers-btn" aria-label="Warstwy mapy"')&&html.includes('<svg viewBox="0 0 24 24"')],
 ['Glass design matches accepted prototype',html.includes('--nt-glass-icon:rgba(18,42,29,.28)')&&html.includes('--nt-glass:rgba(20,42,30,.80)')],
 ['Layer sheet is responsive and does not replace point editor',html.includes('id="map-layers-sheet"')&&html.includes('z-index:1180')&&html.includes('.point-sheet{position:fixed;')],
 ['Only real public markers are toggleable',html.includes('id="nt-public-points-layer" checked')&&html.includes('if(!visible&&map.hasLayer(markers))map.removeLayer(markers)')],
 ['Public marker display cannot mutate Supabase data',html.includes("map.removeLayer(markers)")&&html.includes("db.rpc('moderate_map_point'")&&html.includes("db.rpc('update_private_map_point'")],
 ['Panel closes by X, backdrop, Escape and second downward drag',html.includes("el('nt-layer-close').addEventListener('click',closeLayers)")&&html.includes("layersBackdrop.addEventListener('click',closeLayers)")&&html.includes("if(event.key==='Escape')")&&html.includes("d>125&&layersSheet.classList.contains('is-collapsed')")],
 ['Handle supports tap, up/down gestures and pointer cancellation',html.includes("layerHandle.addEventListener('pointerdown'")&&html.includes("layerHandle.addEventListener('pointermove'")&&html.includes("layerHandle.addEventListener('pointercancel'")&&html.includes("layerHandle.addEventListener('click'")],
 ['Panel is not opened over the existing point editor',html.includes("if(!el('point-sheet').hidden){")&&html.includes('Najpierw zamknij edytor punktu.')],
 ['Keyboard focus is kept inside modal sheet',html.includes("if(event.key!=='Tab')return")&&html.includes("const els=[...layersSheet.querySelectorAll")],
 ['No unverified NVDB or STFS status layer is presented',html.includes('Warstwy NVDB i STFS dodamy po sprawdzeniu źródeł')&&!html.includes('id="nt-nvdb-layer"')]
];
for(const [label,passed] of layerCases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}


const glassCases=[
 ['Approved Layers icon alpha remains 28%',html.includes('--nt-glass-icon:rgba(18,42,29,.28)')],
 ['Main and layer point sheets use the shared transparent surface',html.includes('.point-sheet,.nt-layers-sheet{')&&html.includes('background:var(--nt-glass-icon)')],
 ['Top and bottom map controls use a shared transparent surface',html.includes('.map-top-actions button:not(#open-layers-btn)')&&html.includes('.map-toolbar #add-point-btn,')],
 ['Workspace cards and controls participate in unified styling',html.includes('.workspace .card,')&&html.includes('.workspace input:not([type="checkbox"])')],
 ['Readable error messages remain differentiated',html.includes('background:rgba(105,32,28,.65)')&&html.includes('color:#fff0e7')],
 ['Approved map and moderation functions remain intact',html.includes("db.rpc('update_private_map_point'")&&html.includes("db.rpc('moderate_map_point'")],
];
for(const [label,passed] of glassCases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}

const polishCases=[
 ['Map return button is rightmost even if My points is visible',html.indexOf('id="jump-mine-btn"')<html.indexOf('id="back-to-map-btn"')&&html.includes('.workspace-nav #back-to-map-btn{margin-left:auto')],
 ['Workspace navigation is right aligned',html.includes('.workspace-nav{justify-content:flex-end;background:rgba(18,42,29,.20)')],
 ['Tiny helper labels use bright high-contrast text',html.includes('.nt-layer-intro,.nt-layer-option small,.nt-layer-note,')&&html.includes('color:#f1f6e9;text-shadow:0 1px 2px rgba(4,18,10,.90)')],
 ['Workspace cards remain translucent with 22 percent opacity',html.includes('.workspace .card,#my-points li{background:rgba(18,42,29,.22)')],
];
for(const [label,passed] of polishCases){console.log((passed?'PASS':'FAIL')+': '+label);assert.ok(passed,label);}

console.log('Mobile map checks: '+(cases.length+4+layerCases.length+glassCases.length+polishCases.length)+' PASS');
