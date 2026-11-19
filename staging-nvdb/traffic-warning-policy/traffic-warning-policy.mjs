/**
 * NORDIC TRAIL — testowa polityka komunikatów drogowych.
 * Źródła: NVDB (wyciąg) oraz OSM (tagi z geometrii wstępnie dopasowanej).
 * Nie interpretuje STFS, godzin, wyjątków, oznakowania ani prawa przejazdu.
 * Nie używać wyniku jako pozwolenia lub zakazu ruchu.
 * Brak odczytu Supabase; nie zmienia danych źródłowych.
 */
export function evaluateTrafficWarning({nvdb=null, osmWays=[], geometryMatch="unverified"}={}) {
  const src = nvdb && typeof nvdb==="object" ? nvdb : null;
  const sourceRoads = Array.isArray(osmWays) ? osmWays : [];
  const accessKeys=["motorcar","motor_vehicle","vehicle","access"];
  const conditionalKeys=["motorcar:conditional","motor_vehicle:conditional","vehicle:conditional","access:conditional"];
  const restrictedValues=new Set(["private","no","destination","customers","delivery","agricultural","forestry","permit","emergency","restricted"]);
  const osmSegments=sourceRoads.map((way,i)=>{
    const raw=way&&typeof way==="object"?way:{};
    const tags=raw.tags&&typeof raw.tags==="object"?raw.tags:raw;
    const key=accessKeys.find(k=>typeof tags[k]==="string"&&tags[k].trim()!=="")||null;
    const value=key?tags[key].trim().toLowerCase():null;
    const conditional=conditionalKeys.filter(k=>typeof tags[k]==="string"&&tags[k].trim()!=="");
    return {
      id:raw.id==null?null:String(raw.id),
      accessKey:key,
      accessValue:value,
      possibleRestriction:restrictedValues.has(value),
      isPermissive:value==="permissive",
      conditionalTags:conditional,
      explanation:!key?"OSM nie zawiera jednoznacznego tagu dostępu samochodów":
        value==="private"?"OSM wskazuje dostęp prywatny lub wymagający upoważnienia":
        value==="no"?"OSM wskazuje ograniczenie dostępu":
        value==="permissive"?"OSM odnotowuje zgodę właściciela, którą można cofnąć":
        restrictedValues.has(value)?"OSM wskazuje dostęp ograniczony do określonego celu lub grupy":
        value==="yes"?"Ten tag OSM nie wskazuje zakazu, lecz nie potwierdza prawa przejazdu":
        "Wartość tagu OSM wymaga osobnej interpretacji"
    };
  });
  const flags=[];
  const hasNvdb=Boolean(src);
  const isTransit=hasNvdb&&src.tranzyt==="sant";
  const hasRestrictedOsm=osmSegments.some(x=>x.possibleRestriction);
  const conditional=osmSegments.some(x=>x.conditionalTags.length>0);
  const valueVariants=new Set(osmSegments.map(x=>(x.accessKey||"?")+"="+(x.accessValue||"?")+(x.conditionalTags.length?":conditional":"")));
  const mixed=osmSegments.length>1&&valueVariants.size>1;
  const roadCategory=src?.pojazdy==="lastbil"?"pojazdów ciężarowych":
    src?.pojazdy==="tung lastbil"?"ciężkich pojazdów ciężarowych":
    src?.pojazdy==="motordrivna fordon"?"pojazdów silnikowych":
    src?.pojazdy==="fordon"?"pojazdów":null;
  if(isTransit)flags.push("nvdb_transit");
  else if(hasNvdb)flags.push("nvdb_traffic_rule");
  if(hasRestrictedOsm)flags.push("osm_possible_restriction");
  if(osmSegments.some(x=>x.isPermissive))flags.push("osm_permissive");
  if(conditional)flags.push("osm_conditional_uninterpreted");
  if(mixed)flags.push("osm_mixed_segments");
  if(geometryMatch!=="verified"&&osmSegments.length)flags.push("osm_geometry_not_verified");
  if(hasNvdb)flags.push("stfs_text_not_verified");
  let title="Dostępność drogi niezweryfikowana";
  if(isTransit)title="Zakaz przejazdu tranzytowego";
  else if(hasNvdb)title="Możliwe ograniczenie ruchu"+(roadCategory?" — "+roadCategory:"");
  else if(hasRestrictedOsm||conditional)title="Możliwe ograniczenie dostępu samochodów (OSM)";
  let explanation="Nie ma wystarczających podstaw do potwierdzenia prawa przejazdu.";
  if(isTransit)explanation="Wskazanie NVDB. Dokładny zasięg, aktualność przepisu i wyjątki wymagają potwierdzenia w STFS.";
  else if(hasNvdb)explanation="Wpis NVDB wymaga sprawdzenia pełnego przepisu, wyjątków i oznakowania.";
  else if(hasRestrictedOsm||conditional)explanation="Tagi OSM wskazują możliwe ograniczenia, ale nie zastępują przepisów ani znaków.";
  return {
    title,explanation,legalStatus:"unverified",accessGranted:false,roadClosedConfirmed:false,
    nvdbSummary:hasNvdb?{
      vehicleCategory:src.pojazdy||"nieustalona",
      transit:src.tranzyt==="sant"?"zaznaczony":src.tranzyt==="falskt"?"niezaznaczony":"nieustalony",
      direction:src.kierunek||"nieustalony",
      recordId:src.rekord||null,elementId:src.element_id||null,
      timeAndExceptions:"niezweryfikowane",stfsDesignation:"niezweryfikowane"
    }:null,
    segmentAccess:osmSegments,
    mixedOsmAccess:mixed,
    notes:mixed?["Różne oznaczenia na sąsiednich fragmentach OSM — nie przypisuj jednej reguły całej drodze."]:[],
    flags
  };
}
