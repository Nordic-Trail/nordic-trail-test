'use strict';
// Fully simulated browser regression. No real credentials, Supabase calls or data writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const puppeteer=require('puppeteer-core');
const root=path.resolve(__dirname,'..');
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const leafletJs=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'));
const leafletCss=fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'));
let server,browser;
function injectFakeSupabase(){
  const state={user:null,reads:[],rpc:[],forbidden:[]};
  window.__ntMock=state;
  function query(table){
    const filters={};
    const value=()=>{
      const personal=table==='map_points'&&Object.prototype.hasOwnProperty.call(filters,'user_id');
      const points=personal&&state.user?[{
        id:201,kind:'gate',status:'Nieznany',note:'Mock fixture',
        lat:59.1,lon:17.28,review_status:'draft',
        visibility:'private',user_id:state.user.id
      }]:[];
      return {data:points,error:null};
    };
    const q={
      select(){return q},
      eq(k,v){filters[k]=v;return q},
      in(){return q},
      order(){return q},
      limit(){return q},
      single(){return Promise.resolve({data:null,error:{code:'PGRST116'}})},
      then(a,b){state.reads.push({table,filters:{...filters}});return Promise.resolve(value()).then(a,b)}
    };
    for(const method of ['insert','update','upsert','delete']){
      q[method]=()=>{state.forbidden.push(table+'.'+method);throw Error('WRITE FORBIDDEN')};
    }
    return q;
  }
  const client={
    auth:{
      getUser:async()=>({data:{user:state.user},error:null}),
      signInWithPassword:async({email})=>{
        state.user={
          id:email==='admin@example.invalid'?'admin-a':'user-b',
          email
        };
        return {data:{user:state.user},error:null};
      },
      signOut:async()=>{state.user=null;return {error:null}},
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
    },
    from:table=>query(table),
    rpc:async(name)=>{
      state.rpc.push(name);
      if(name==='admin_pending_map_points'){
        return state.user?.id==='admin-a'
          ?{data:[{id:301,kind:'gate',status:'Nieznany',note:'Mock pending point',
             lat:59.1,lon:17.28}],error:null}
          :{data:null,error:{code:'42501',message:'Brak uprawnień administratora'}};
      }
      state.forbidden.push('rpc:'+name);
      throw Error('WRITE/UNKNOWN RPC FORBIDDEN');
    }
  };
  window.supabase={createClient:()=>client};
}
(async()=>{
  server=http.createServer((req,res)=>{
    let loc;
    try{loc=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}
    catch(_){res.writeHead(400);res.end();return}
    let target=path.resolve(root,'.'+loc);
    if(loc.endsWith('/'))target=path.join(target,'index.html');
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
    fs.readFile(target,(err,bytes)=>{
      if(err){res.writeHead(404);res.end('Missing fixture');return}
      const ext=path.extname(target);
      res.setHeader('Content-Type',ext==='.html'?'text/html; charset=utf-8':
        ext==='.json'?'application/json':ext==='.mjs'||ext==='.js'?'application/javascript':'application/octet-stream');
      res.setHeader('Cache-Control','no-store');
      res.end(bytes);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  browser=await puppeteer.launch({executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking']});
  const page=await browser.newPage();
  await page.setViewport({width:412,height:860,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.setDefaultTimeout(25000);
  const errors=[],realSupabaseRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request',req=>{
    const url=req.url();
    if(url==='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js')
      return req.respond({status:200,contentType:'application/javascript',body:leafletJs});
    if(url==='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css')
      return req.respond({status:200,contentType:'text/css',body:leafletCss});
    if(url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js'))
      return req.respond({status:200,contentType:'application/javascript',
        body:'('+injectFakeSupabase.toString()+')();'});
    if(url.includes('.supabase.co')){
      realSupabaseRequests.push(url);return req.abort();
    }
    if(url.startsWith('https://tile.openstreetmap.org/'))return req.abort();
    if(url.startsWith('http://127.0.0.1:'+port+'/'))return req.continue();
    return req.abort();
  });
  await page.goto('http://127.0.0.1:'+port+'/staging-app/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__ntMock&&document.querySelector('#map')?.classList.contains('leaflet-container'));
  assert.equal(await page.$eval('#setup-card',e=>e.hidden),false,'Setup visible without session');
  await page.type('#public-key','sb_publishable_mock_key_for_test_only_123');
  await page.click('#setup-btn');
  await page.waitForFunction(()=>!document.querySelector('#login-card').hidden);
  assert.equal(await page.$eval('#draft-card',e=>e.hidden),true,'Draft UI hidden before login');
  console.log('PASS: unauthenticated state hides private drafts and moderator queue');
  await page.type('#email','normal@example.invalid');
  await page.type('#password','not-a-real-password');
  await page.click('#login-btn');
  await page.waitForFunction(()=>document.querySelector('#role-status')?.textContent.includes('Zwykły użytkownik'));
  assert.equal(await page.$eval('#draft-card',e=>e.hidden),false);
  assert.equal(await page.$eval('#admin-queue-card',e=>e.hidden),true);
  assert.ok(await page.$eval('#my-points',e=>e.textContent.includes('Szkic prywatny')));
  assert.ok(await page.evaluate(()=>window.__ntMock.reads.some(q=>q.table==='map_points'&&q.filters.user_id==='user-b')));
  assert.ok(await page.evaluate(()=>window.__ntMock.rpc.includes('admin_pending_map_points')));
  console.log('PASS: ordinary user reads own mock draft; admin RPC returns 42501 and queue stays hidden');
  await page.click('#open-layers-btn');
  await page.$eval('#nt-nvdb-toggle',e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('#nt-nvdb-status')?.textContent.includes('764 drogi'));
  await page.$eval('#nt-nvdb-goto',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#map-layers-sheet').hidden);
  const opened=await page.evaluate(()=>{
    const paths=document.querySelectorAll('.leaflet-ntNvdb-pane path.leaflet-interactive');
    for(const road of paths){
      road.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      if(!document.querySelector('#nt-nvdb-road-card').hidden)return true;
    }
    return false;
  });
  assert.ok(opened,'Road card must open while a normal user is signed in');
  assert.equal(await page.$eval('#draft-card',e=>e.hidden),false);
  assert.equal(await page.$eval('#admin-queue-card',e=>e.hidden),true);
  assert.ok(await page.$eval('#role-status',e=>e.textContent.includes('Zwykły użytkownik')));
  await page.click('#nt-nvdb-road-close');
  console.log('PASS: NVDB interaction does not alter mock login, own draft access or moderator permissions');
  await page.click('#logout-btn');
  await page.waitForFunction(()=>document.querySelector('#login-card')?.hidden===false&&document.querySelector('#draft-card')?.hidden===true);
  assert.equal(await page.$eval('#admin-queue-card',e=>e.hidden),true);
  console.log('PASS: logout hides private mock data and moderation UI');
  await page.$eval('#email',e=>{e.value='';});
  await page.type('#email','admin@example.invalid');
  await page.type('#password','not-a-real-password');
  await page.click('#login-btn');
  await page.waitForFunction(()=>document.querySelector('#role-status')?.textContent.includes('Administrator — potwierdzony'));
  assert.equal(await page.$eval('#admin-queue-card',e=>e.hidden),false);
  assert.ok(await page.$eval('#admin-queue-list',e=>e.textContent.includes('Punkt #301')));
  assert.ok(await page.$eval('#admin-queue-list',e=>e.textContent.includes('Zatwierdź punkt')));
  console.log('PASS: mock administrator sees read-only pending-point queue, without decisions');
  const result=await page.evaluate(()=>({forbidden:window.__ntMock.forbidden,reads:window.__ntMock.reads.length}));
  assert.deepEqual(result.forbidden,[],'No write methods or decision RPC invoked');
  assert.equal(realSupabaseRequests.length,0,'No real Supabase network requests allowed');
  assert.equal(errors.length,0,'Unexpected browser errors: '+errors.join('; '));
  console.log('PASS: zero writes, zero real Supabase requests, zero browser exceptions');
})().catch(error=>{console.error('FAIL:',error?.stack||String(error));process.exitCode=1;})
  .finally(async()=>{
    if(browser)await browser.close().catch(()=>{});
    if(server)await new Promise(resolve=>server.close(resolve));
  });
