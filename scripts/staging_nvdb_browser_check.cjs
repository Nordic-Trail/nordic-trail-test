'use strict';
// Headless browser regression: no credentials or Supabase writes.
// All assets come from the current checkout; Chrome uses local Leaflet via interception.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const puppeteer=require('puppeteer-core');
const root=path.resolve(__dirname,'..');
const browserExe=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const leafletJs=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'));
const leafletCss=fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'));
const contentTypes={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
let server,browser;
(async()=>{
  server=http.createServer((req,res)=>{
    let loc=new URL(req.url,'http://127.0.0.1').pathname;
    let target=path.resolve(root,'.'+decodeURIComponent(loc));
    if(loc.endsWith('/'))target=path.join(target,'index.html');
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(target,(err,bytes)=>{
      if(err){res.writeHead(404);res.end('Missing fixture');return;}
      res.setHeader('Content-Type',contentTypes[path.extname(target)]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(bytes);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  browser=await puppeteer.launch({executablePath:browserExe,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-features=TranslateUI']});
  const page=await browser.newPage();
  await page.setViewport({width:412,height:860,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.setDefaultTimeout(25000);
  const errors=[],network=[];
  page.on('pageerror',e=>errors.push('JS: '+e.message));
  page.on('request',r=>network.push({url:r.url(),method:r.method()}));
  await page.setRequestInterception(true);
  page.on('request',req=>{
    const url=req.url();
    if(url==='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'){
      return req.respond({status:200,contentType:'application/javascript',body:leafletJs});
    }
    if(url==='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'){
      return req.respond({status:200,contentType:'text/css',body:leafletCss});
    }
    if(url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/') || url.startsWith('https://tile.openstreetmap.org/')){
      return req.abort();
    }
    if(url.startsWith('http://127.0.0.1:'+port+'/'))return req.continue();
    return req.abort();
  });
  await page.goto('http://127.0.0.1:'+port+'/staging-app/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.L&&document.querySelector('#map')?.classList.contains('leaflet-container'));
  console.log('PASS: Leaflet map started in mobile Chrome');
  assert.equal(network.filter(x=>x.url.includes('gnesta-nvdb-v45.json')).length,0,'NVDB must not load before opting in');
  assert.equal(await page.$eval('#nt-nvdb-toggle',el=>el.checked),false);
  const layerOrder=await page.evaluate(()=>[...document.querySelectorAll('#nt-layer-body .nt-osm-group')].map(group=>group.querySelector('input')?.id).filter(Boolean));
  assert.deepEqual(layerOrder,['nt-nvdb-toggle','nt-osm-barriers-layer'],'NVDB must be discoverable before the OSM pilot');
  console.log('PASS: NVDB is visible before OSM pilot in the layers panel');
  console.log('PASS: NVDB disabled and no eager fetch');
  await page.click('#open-layers-btn');
  await page.waitForFunction(()=>!document.querySelector('#map-layers-sheet').hidden);
  await page.click('#nt-nvdb-toggle');
  await page.waitForFunction(()=>document.querySelector('#nt-nvdb-status')?.textContent.includes('765 dróg'));
  assert.equal(network.filter(x=>x.url.includes('gnesta-nvdb-v45.json')).length,1);
  console.log('PASS: opt-in fetched and validated 765-road snapshot once');
  await page.click('#nt-nvdb-goto');
  await page.waitForFunction(()=>document.querySelector('#map-layers-sheet').hidden);
  const rendering=await page.evaluate(()=>{
    const paneNames=[...document.querySelectorAll('.leaflet-pane')].map(e=>({className:e.className,svg:e.querySelectorAll('svg').length,canvas:e.querySelectorAll('canvas').length,paths:e.querySelectorAll('path').length}));
    return {paneNames,svgPaths:document.querySelectorAll('svg path').length,canvases:document.querySelectorAll('canvas').length,nvdbStatus:document.querySelector('#nt-nvdb-status')?.textContent};
  });
  console.log('DIAGNOSTIC Leaflet rendering '+JSON.stringify(rendering));
  await page.waitForFunction(()=>document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive').length>0,{timeout:5000});
  const hitArea=await page.evaluate(()=>{
    const pane=document.querySelector('.leaflet-ntNvdb-pane');
    const paths=[...pane.querySelectorAll('path')];
    const visible=paths.filter(p=>p.getAttribute('stroke-width')==='3');
    const hits=paths.filter(p=>p.getAttribute('stroke-width')==='26');
    return {all:paths.length,visible:visible.length,hits:hits.length,
      hitStyle:hits[0]?.style.pointerEvents,visibleInteractive:visible[0]?.classList.contains('leaflet-interactive')};
  });
  assert.equal(hitArea.visible,765,'Visible roads retain a 3px line');
  assert.equal(hitArea.hits,765,'All roads get a 26px finger target');
  assert.equal(hitArea.hitStyle,'stroke','Wide hit stroke must receive pointer events');
  assert.equal(hitArea.visibleInteractive,false,'Thin visual road must not block the hit area');
  console.log('PASS: all roads retain 3px appearance and expose a separate 26px finger target');
  const selected=await page.evaluate(()=>{
    const paths=[...document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive')];
    for(const p of paths){
      p.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      if(!document.getElementById('nt-nvdb-road-card').hidden)return {paths:paths.length,opened:true};
    }
    return {paths:paths.length,opened:false};
  });
  assert.ok(selected.opened,'Road click should open integrated bottom card');
  assert.ok(await page.$eval('#nt-nvdb-road-fields',e=>e.textContent.includes('Żwirowa (grus)')));
  assert.ok(await page.$eval('#nt-nvdb-road-fields',e=>e.textContent.includes('Niezweryfikowana')));
  assert.equal(await page.$eval('#point-sheet',e=>e.hidden),true,'Road selection must not open NT draft editor');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'nt-nvdb-road-close','Keyboard focus moves to the card close button');
  const headingBg=await page.$eval('#nt-nvdb-road-card .nt-osm-detail-heading',e=>getComputedStyle(e).backgroundColor);
  assert.match(headingBg,/rgba\(18,\s*42,\s*29,\s*0\.4\)/,'NVDB heading must use agreed 40% opacity');
  const nvdbPack=JSON.parse(fs.readFileSync(path.join(root,'staging-app/data/gnesta-nvdb-v45.json'),'utf8'));
  const widthIndex=nvdbPack.features.findIndex(f=>Number.isFinite(f.properties?.szerokosc));
  assert.ok(widthIndex>=0,'Fixture must include an unverified road width');
  const widthRowVisible=await page.evaluate(i=>{
    const roads=[...document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive')];
    roads[i].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    return [...document.querySelectorAll('#nt-nvdb-road-fields>div')].some(row=>row.firstElementChild?.textContent==='Szerokość');
  },widthIndex);
  assert.equal(widthRowVisible,false,'Unverified widths must stay hidden even where the source contains a number');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'nt-nvdb-road-close','Focus remains available after switching roads');
  const noRestrictionIndex=nvdbPack.features.findIndex(f=>!f.properties?.powiazany_wpis_nvdb);
  assert.ok(noRestrictionIndex>=0,'Fixture must include a road without an NVDB restriction association');
  await page.evaluate(i=>{
    const roads=[...document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive')];
    roads[i].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  },noRestrictionIndex);
  assert.ok(await page.$eval('#nt-nvdb-road-fields',el=>el.textContent.includes('Brak powiązanego wpisu NVDB — nie potwierdza prawa przejazdu')));
  console.log('PASS: unlinked restrictions are not presented as permission to drive');
  console.log('PASS: unverified widths hidden, 40% heading and accessible card focus');
  console.log('PASS: tapping a rendered road opens NVDB card without starting draft; SVG roads '+selected.paths);
  await page.click('#nt-nvdb-road-close');
  assert.equal(await page.$eval('#nt-nvdb-road-card',e=>e.hidden),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'map','Closing the card restores map focus');
  const others=await page.evaluate(()=>{
    const p=[...document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive')];
    if(p.length<2)return false;
    p[1].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    return !document.getElementById('nt-nvdb-road-card').hidden;
  });
  assert.ok(others,'Other road should be selectable');
  assert.equal(await page.$eval('#point-sheet',e=>e.hidden),true);
  console.log('PASS: close and select another road without draft');
  await page.click('#nt-nvdb-road-close');
  await page.click('#open-layers-btn');
  await page.click('#nt-nvdb-toggle');
  assert.equal(await page.$eval('#nt-nvdb-toggle',e=>e.checked),false);
  const remaining=await page.evaluate(()=>[...document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive')].filter(e=>e.getClientRects().length).length);
  assert.equal(remaining,0,'Removing NVDB layer should remove rendered road paths');
  assert.equal(await page.$eval('#point-sheet',e=>e.hidden),true);
  console.log('PASS: switching road layer off removes road paths');
  assert.equal(network.filter(x=>x.url.includes('bairmdubhnodwplioxld.supabase.co')).length,0,'No Supabase requests without connection');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: no unexpected JavaScript errors or Supabase requests');
  console.log('PASS: browser smoke test complete');
})().catch(err=>{console.error('FAIL:',err?.stack||String(err));process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close().catch(()=>{});
  if(server)await new Promise(resolve=>server.close(resolve));
});