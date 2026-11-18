import {evaluateTrafficWarning} from './traffic-warning-policy.mjs';
// Testy przypadków, wraz z dziewięcioma rekordami rzeczywistej próbki NVDB.
const tests=[
  {
    "name": "brak danych nie potwierdza dostepu",
    "input": {},
    "title": "Dostępność drogi niezweryfikowana",
    "flags": []
  },
  {
    "name": "access yes nie gwarantuje dostepu",
    "input": {
      "osmWays": [
        {
          "tags": {
            "access": "yes"
          }
        }
      ]
    },
    "title": "Dostępność drogi niezweryfikowana",
    "flags": [
      "osm_geometry_not_verified"
    ]
  },
  {
    "name": "motor_vehicle private jest wazniejsze niz access yes",
    "input": {
      "osmWays": [
        {
          "id": 42,
          "tags": {
            "access": "yes",
            "motor_vehicle": "private"
          }
        }
      ]
    },
    "title": "Możliwe ograniczenie dostępu samochodów (OSM)",
    "flags": [
      "osm_possible_restriction"
    ]
  },
  {
    "name": "motorcar ma priorytet nad motor_vehicle",
    "input": {
      "osmWays": [
        {
          "tags": {
            "motorcar": "yes",
            "motor_vehicle": "private"
          }
        }
      ]
    },
    "effective": "motorcar",
    "flags": []
  },
  {
    "name": "permissive nie oznacza pewnej dostepnosci",
    "input": {
      "osmWays": [
        {
          "tags": {
            "access": "permissive"
          }
        }
      ]
    },
    "title": "Dostępność drogi niezweryfikowana",
    "flags": [
      "osm_permissive"
    ]
  },
  {
    "name": "tag warunkowy musi trafic do kontroli",
    "input": {
      "osmWays": [
        {
          "tags": {
            "motor_vehicle:conditional": "no @ (winter)"
          }
        }
      ]
    },
    "title": "Możliwe ograniczenie dostępu samochodów (OSM)",
    "flags": [
      "osm_conditional_uninterpreted"
    ]
  },
  {
    "name": "rozne fragmenty oznaczaja niepewnosc",
    "input": {
      "osmWays": [
        {
          "id": 1,
          "tags": {
            "access": "permissive"
          }
        },
        {
          "id": 2,
          "tags": {
            "access": "yes",
            "motor_vehicle": "private"
          }
        }
      ]
    },
    "flags": [
      "osm_mixed_segments",
      "osm_possible_restriction"
    ]
  },
  {
    "name": "samo surface gravel nie otwiera drogi",
    "input": {
      "osmWays": [
        {
          "tags": {
            "surface": "gravel"
          }
        }
      ]
    },
    "title": "Dostępność drogi niezweryfikowana",
    "flags": []
  },
  {
    "name": "NVDB bez OSM nadal ostrzega",
    "input": {
      "nvdb": {
        "rekord": "17",
        "element_id": "3:303827",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "NVDB dla ciezarowek ma osobna kategorie",
    "input": {
      "nvdb": {
        "pojazdy": "lastbil",
        "tranzyt": "sant",
        "kierunek": "Med och mot"
      }
    },
    "title": "Możliwe ograniczenie tranzytu — pojazdów ciężarowych",
    "flags": [
      "nvdb_transit"
    ]
  },
  {
    "name": "NVDB bez tranzytu nie jest automatycznie zakazem tranzytu",
    "input": {
      "nvdb": {
        "pojazdy": "fordon",
        "tranzyt": "falskt"
      }
    },
    "title": "Możliwe ograniczenie ruchu — pojazdów",
    "flags": [
      "nvdb_traffic_rule"
    ]
  },
  {
    "name": "pelna geometria nie daje prawa przejazdu",
    "input": {
      "geometryMatch": "verified",
      "osmWays": [
        {
          "tags": {
            "motor_vehicle": "yes"
          }
        }
      ]
    },
    "title": "Dostępność drogi niezweryfikowana",
    "flags": []
  },
  {
    "name": "foot=no nie określa dostepu samochodow",
    "input": {
      "osmWays": [
        {
          "tags": {
            "foot": "no"
          }
        }
      ]
    },
    "title": "Dostępność drogi niezweryfikowana",
    "flags": []
  },
  {
    "name": "NVDB i OSM kolizje pozostaja ostrzezeniem",
    "input": {
      "nvdb": {
        "rekord": "19",
        "element_id": "3:304355",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      },
      "osmWays": [
        {
          "id": 277456663,
          "tags": {
            "access": "permissive"
          }
        },
        {
          "id": 277456671,
          "tags": {
            "access": "permissive"
          }
        },
        {
          "id": 175117397,
          "tags": {
            "access": "yes",
            "motor_vehicle": "private"
          }
        }
      ]
    },
    "flags": [
      "nvdb_transit",
      "osm_mixed_segments",
      "osm_possible_restriction"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 0 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "17",
        "element_id": "3:303827",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 1 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "203",
        "element_id": "3:303829",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 2 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "18",
        "element_id": "3:303933",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 3 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "19",
        "element_id": "3:304355",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 4 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "20",
        "element_id": "3:304512",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 5 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "21",
        "element_id": "3:304709",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 6 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "22",
        "element_id": "3:305050",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 7 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "23",
        "element_id": "3:305147",
        "pojazdy": "fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  },
  {
    "name": "źródłowy wpis NVDB 8 sygnalizuje tranzyt",
    "input": {
      "nvdb": {
        "rekord": "182",
        "element_id": "3:309403",
        "pojazdy": "motordrivna fordon",
        "tranzyt": "sant",
        "kierunek": "Med och mot",
        "zakres": "0.0–1.0"
      }
    },
    "flags": [
      "nvdb_transit",
      "stfs_text_not_verified"
    ]
  }
];
let passed=0;
for(const c of tests){
 const result=evaluateTrafficWarning(c.input);
 const fail=[];
 if(result.legalStatus!=='unverified'||result.accessGranted||result.roadClosedConfirmed)fail.push('Nieuprawnione potwierdzenie dostępności/zamknięcia');
 if(c.title&&result.title!==c.title)fail.push('Błędny tytuł');
 if(c.flags)for(const flag of c.flags)if(!result.flags.includes(flag))fail.push('Brak flagi '+flag);
 if(c.effective&&result.segmentAccess[0]?.accessKey!==c.effective)fail.push('Błędny priorytet tagu');
 if(fail.length)throw new Error(c.name+': '+fail.join('; '));
 passed++;
}
console.log('PASS '+passed+'/'+tests.length+' — NORDIC TRAIL traffic warning policy');
