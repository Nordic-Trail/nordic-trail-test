'use strict';
// Run from repository root: node qa/shared-map-20261123/stylus-panel-smoke.cjs
// Does not use network, database, devices, external packages, or credentials.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const host=fs.readFileSync(path.join(root,'staging-shared-map-20261123/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'staging-shared-map-20261123/shared-planner.js'),'utf8');
assert.ok(host.includes('body.nt-planner-on{position:fixed!important;'));
assert.ok(host.includes('body.nt-planner-on #workspace{visibility:hidden!important;pointer-events:none!important}'));
const literal=js.match(/root\.innerHTML=("(?:\\.|[^"\\])*");/);
assert.ok(literal,'Planner Shadow DOM markup must exist');
const ui=JSON.parse(literal[1]);
assert.ok(ui.includes('id="nt-panel-tab"'));
assert.ok(ui.includes(':host([data-sheet="closed"]) #nt-panel-tab{display:flex}'));
assert.ok(ui.includes('aria-label="Rozwiń narzędzia planowania trasy"'));
assert.ok(js.includes("el('nt-panel-tab').addEventListener('click',"));
const from=js.indexOf('(function initSheetHandle(){');
const end=js.indexOf("})();\nel('cancel-pick')",from);
assert.ok(from>=0&&end>from);
const expression=js.slice(from,end+4);
const handlers={},captures=new Set();
const handle={
 parentElement:{getBoundingClientRect:()=>({height:144})},
 addEventListener:(name,fn)=>handlers[name]=fn,
 setPointerCapture:id=>captures.add(id),
 hasPointerCapture:id=>captures.has(id),
 releasePointerCapture:id=>captures.delete(id)
};
const style={values:{},setProperty(k,v){this.values[k]=v},removeProperty(k){delete this.values[k]}};
const sheet={dataset:{sheet:'compact'},style,getBoundingClientRect:()=>({height:170})};
const actions=[];
new Function('el','setSheet','getComputedStyle','window',expression)(
 id=>id==='sheet-handle'?handle:sheet,
 (value,preserve)=>{sheet.dataset.sheet=value;actions.push(value)},
 ()=>({paddingBottom:'0px'}),
 {innerHeight:900});
function fire(kind,opts={}){
 handlers[kind]({
  pointerType:opts.pointerType||'touch',
  pointerId:opts.pointerId||1,
  clientY:opts.clientY??300,
  button:opts.button??0,
  buttons:opts.buttons??1,
  isPrimary:opts.isPrimary??true
 });
}
fire('pointerdown',{pointerType:'pen',buttons:0});
fire('pointermove',{pointerType:'pen',buttons:0,clientY:120});
assert.equal(captures.size,0,'S Pen hover must not capture gesture');
assert.equal(sheet.dataset.sheet,'compact','S Pen hover must not open the panel');
assert.deepEqual(actions,[]);
fire('pointerdown',{pointerType:'touch'});
fire('pointermove',{pointerType:'touch',clientY:230});
assert.equal(sheet.dataset.sheet,'expanded','Active finger drag should still expand sheet');
assert.ok(style.values['--nt-sheet-height'],'Active finger drag should set height');
fire('pointerup',{pointerType:'touch',clientY:230});
assert.equal(captures.size,0,'Finger drag capture must be released');
assert.equal(sheet.dataset.dragging,undefined,'No dragging state after finger release');
new Function(js);
console.log('PASS: small closed-sheet tab, touch drag enabled, S Pen hover rejected and background scrolling locked');
