/* NORDIC TRAIL MVP: local-only trip editor sharing the staging Leaflet map.
 * Existing Supabase points and auth remain outside this module.
 */
(function(root){
'use strict';
function mount(options){
  const map=options.map,L=options.Leaflet,button=options.button,notice=options.notice;
  const M=root.NordicTripModel,R=root.NordicRoutingCore,I=root.NordicIntegratedTrip;
  if(!map||!L||!M||!R||!I||!button)throw Error('Brak zależności planera.');
  const el=id=>root.document.getElementById(id);
  const panel=el('nt-trip-panel'),list=el('nt-trip-points'),status=el('nt-trip-status');
  const name=el('nt-trip-name'),mode=el('nt-trip-next-mode'),kind=el('nt-trip-next-kind');
  const saveButton=el('nt-trip-save');
  const mapContainer=map.getContainer(),layers=L.layerGroup();
  let active=false,picking=false,trip=M.emptyTrip(),routes=Object.create(null),dirty=false;
  let oldCursor='';
  try{
    const saved=I.load(root.localStorage);
    trip=saved.trip;routes=saved.routes;
  }catch(_error){status.textContent='Nie udało się odczytać wcześniejszego zapisu. Istniejące dane nie zostały zmienione.';}
  function tell(text,isError=false){
    status.textContent=text;status.classList.toggle('error',!!isError);
  }
  function syncButton(){
    button.setAttribute('aria-expanded',String(active));
    button.setAttribute('aria-label',active?'Zamknij planer wypraw':'Otwórz planer wypraw');
  }
  function resetCursor(){
    if(picking)mapContainer.style.cursor=oldCursor;
    picking=false;
  }
  function distanceLabel(v){return Number(v).toLocaleString('pl-PL',{maximumFractionDigits:1,minimumFractionDigits:1})+' km';}
  function saveFeedback(state){
    if(state==='saved'){
      saveButton.textContent='✓ Zapisano';
      saveButton.title='Wyprawa zapisana lokalnie w tej przeglądarce';
    }else if(state==='error'){
      saveButton.textContent='Ponów zapis';
      saveButton.title='Zapis nie powiódł się — spróbuj ponownie';
    }else{
      saveButton.textContent='Zapisz lokalnie';
      saveButton.removeAttribute('title');
    }
  }
  function focusTrip(){
    const points=trip.waypoints;
    if(!points.length){
      tell('Dodaj punkt, aby pokazać wyprawę na mapie.');
      return false;
    }
    try{
      map.invalidateSize({pan:false});
      const size=map.getSize(),mapRect=mapContainer.getBoundingClientRect();
      const visible=active&&!panel.hidden;
      let rightPadding=20,bottomPadding=20;
      if(visible){
        const rect=panel.getBoundingClientRect();
        if(root.innerWidth<=779){
          // Keep markers in the upper, uncovered part of the map on a phone.
          bottomPadding=Math.max(20,Math.min(
            Math.ceil(mapRect.bottom-rect.top+20),Math.floor(size.y*.57)));
        }else{
          // Keep the route to the left of the desktop drawer.
          rightPadding=Math.max(20,Math.min(
            Math.ceil(mapRect.right-rect.left+20),Math.floor(size.x*.55)));
        }
      }
      const bounds=L.latLngBounds(points.map(p=>[p.lat,p.lon]));
      map.fitBounds(bounds,{animate:false,maxZoom:15,paddingTopLeft:[20,20],
        paddingBottomRight:[rightPadding,bottomPadding]});
      return true;
    }catch(_error){
      tell('Nie udało się dopasować mapy do wyprawy.',true);
      return false;
    }
  }
  function invalidateRoutes(){routes=I.routesFor(trip,routes);dirty=true;saveFeedback('dirty');}
  function render(){
    name.value=trip.name;
    list.replaceChildren();layers.clearLayers();
    const points=trip.waypoints,segments=R.displaySegments(trip,routes);
    for(const s of segments){
      const isDraft=s.status!=='routed';
      const colour=s.mode==='drive'?'#183c79':'#216b41';
      L.polyline(s.points.map(p=>[p.lat,p.lon]),{
        color:colour,weight:4,opacity:.9,dashArray:isDraft?'6 7':null,
        interactive:false
      }).addTo(layers);
    }
    points.forEach((p,index)=>{
      const marker=L.circleMarker([p.lat,p.lon],{radius:8,color:'#fff2d2',weight:2,fillColor:'#315742',fillOpacity:.95,bubblingMouseEvents:false})
        .bindTooltip(String(index+1)+'. '+p.name).addTo(layers);
      marker.on('click',e=>{
        if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
        map.panTo([p.lat,p.lon]);
      });
      const item=root.document.createElement('li');
      const title=root.document.createElement('span');title.className='nt-trip-point-label';
      title.textContent=String(index+1)+'. '+p.name+(index===0?' · start':p.mode==='walk'?' · pieszo':' · samochód');
      item.appendChild(title);
      function action(label,desc,fn){
        const b=root.document.createElement('button');b.type='button';b.className='nt-trip-mini';
        b.textContent=label;b.setAttribute('aria-label',desc+' '+p.name);
        b.addEventListener('click',()=>{
          try{fn();invalidateRoutes();render();tell('Zmiany w szkicu nie są jeszcze zapisane.');}
          catch(_error){tell('Nie można wykonać tej operacji.',true);}
        });
        item.appendChild(b);
      }
      action('✎','Zmień nazwę',()=>{
        const entered=root.prompt('Nazwa punktu',p.name);
        if(entered!==null)trip=M.change(trip,p.id,{name:entered});
      });
      if(index>0)action('⇄','Zmień rodzaj odcinka',()=>{trip=M.change(trip,p.id,{mode:p.mode==='drive'?'walk':'drive'});});
      action('×','Usuń punkt',()=>{trip=M.remove(trip,p.id);});
      list.appendChild(item);
    });
    const drive=segments.filter(x=>x.mode==='drive').reduce((sum,x)=>sum+x.km,0);
    const walk=segments.filter(x=>x.mode==='walk').reduce((sum,x)=>sum+x.km,0);
    el('nt-trip-summary').textContent=points.length+' pkt · auto '+distanceLabel(drive)+' · pieszo '+distanceLabel(walk);
    el('nt-trip-draft-count').textContent=segments.filter(x=>x.status==='draft').length+
      ' odcinków szkicowych (linie proste). Nie używać do nawigacji.';
    kind.value=points.length===0?'start':'stop';
    if(active&&!map.hasLayer(layers))map.addLayer(layers);
  }
  function open(){
    if(active){if(picking){resetCursor();panel.hidden=false;}else close();return;}
    if(!el('point-sheet').hidden){
      notice('Najpierw zamknij edytor punktu, aby otworzyć planer.');return;
    }
    if(typeof options.onOpen==='function')options.onOpen();
    active=true;panel.hidden=false;map.addLayer(layers);syncButton();render();
    if(trip.waypoints.length)focusTrip();
    tell(dirty?'Niezapisane zmiany w wyprawie.':'Szkic lokalny. Plan nie trafia do Supabase.');
  }
  function close(){
    resetCursor();active=false;panel.hidden=true;
    if(map.hasLayer(layers))map.removeLayer(layers);
    syncButton();
    if(dirty)notice('Szkic wyprawy ma niezapisane zmiany. Możesz ponownie otworzyć planer.');
  }
  function startPick(){
    if(!active||picking)return;
    const value=name.value.trim();
    if(value)trip=M.renameTrip(trip,value);
    oldCursor=mapContainer.style.cursor;
    mapContainer.style.cursor='crosshair';
    picking=true;panel.hidden=true;
    notice('Tryb trasy: dotknij miejsca na mapie. Nie zostanie utworzony punkt w Supabase.');
  }
  function handleMapClick(event){
    if(!active)return false;
    if(!picking){
      tell('Aby dodać punkt wyprawy, użyj przycisku „Wskaż punkt trasy”.');
      return true;
    }
    const lat=Number(event.latlng.lat.toFixed(6)),lon=Number(event.latlng.lng.toFixed(6));
    const i=trip.waypoints.length;
    try{
      trip=M.add(trip,{lat,lon,name:'Punkt '+(i+1),kind:i===0?'start':kind.value,mode:i===0?'none':mode.value});
      invalidateRoutes();resetCursor();panel.hidden=false;render();
      tell('Dodano punkt '+(i+1)+'. Zapisz wyprawę, aby zachować zmiany.');
      return true;
    }catch(_error){
      resetCursor();panel.hidden=false;tell('Nie udało się dodać punktu wyprawy.',true);return true;
    }
  }
  function save(){
    try{
      trip=M.renameTrip(trip,name.value);
      I.save(root.localStorage,trip,routes);
      dirty=false;render();saveFeedback('saved');tell('Zapisano wyprawę lokalnie w tej przeglądarce.');
    }catch(_error){saveFeedback('error');tell('Zapis lokalny nie powiódł się. Sprawdź dostępność pamięci.',true);}
  }
  function exportGpx(){
    try{
      trip=M.renameTrip(trip,name.value);
      if(!trip.waypoints.length){tell('Najpierw dodaj punkt wyprawy.',true);return;}
      const segments=R.displaySegments(trip,routes);
      if(segments.some(s=>s.status!=='routed')&&!root.confirm(
        'Nie wszystkie odcinki mają obliczoną trasę OSM. GPX będzie zawierać szkice po linii prostej. Eksportować?'))return;
      const xml=I.gpx(trip,routes);
      const url=root.URL.createObjectURL(new root.Blob([xml],{type:'application/gpx+xml;charset=utf-8'}));
      const link=root.document.createElement('a');
      link.href=url;link.download='nordic-trail-wyprawa-test.gpx';link.style.display='none';
      root.document.body.appendChild(link);link.click();link.remove();
      root.setTimeout(()=>root.URL.revokeObjectURL(url),2000);
      tell('Wyeksportowano GPX. Szkic po prostej nie jest trasą do nawigacji.');
    }catch(_error){tell('Nie udało się przygotować GPX.',true);}
  }
  function newTrip(){
    if(trip.waypoints.length&&!root.confirm('Rozpocząć nowy szkic? Niezapisane zmiany zostaną utracone.'))return;
    trip=M.emptyTrip();routes=Object.create(null);dirty=true;saveFeedback('dirty');render();
    tell('Nowa wyprawa. Wcześniejszy zapis w przeglądarce pozostaje bez zmian do naciśnięcia „Zapisz lokalnie”.');
  }
  name.addEventListener('input',()=>{dirty=true;saveFeedback('dirty');});
  button.addEventListener('click',open);
  el('nt-trip-close').addEventListener('click',close);
  el('nt-trip-pick').addEventListener('click',startPick);
  el('nt-trip-save').addEventListener('click',save);
  el('nt-trip-fit').addEventListener('click',focusTrip);
  el('nt-trip-export').addEventListener('click',exportGpx);
  el('nt-trip-new').addEventListener('click',newTrip);
  root.document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&active){event.preventDefault();close();}
  });
  render();syncButton();
  return Object.freeze({open,close,handleMapClick,isActive:()=>active,isPicking:()=>picking});
}
root.NordicTripPanel=Object.freeze({mount});
})(typeof window!=='undefined'?window:this);
