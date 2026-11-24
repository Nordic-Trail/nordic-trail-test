const assert=require('node:assert/strict');const R=require('./road-access-core.js');const fixtures=[
  {
    "name": "Asfalt — droga publiczna",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "residential",
        "surface": "asphalt"
      }
    },
    "expected": "candidate"
  },
  {
    "name": "Szuter — sieć samochodowa NVDB",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "track",
        "surface": "gravel"
      },
      "nvdbNetwork": "motor"
    },
    "expected": "candidate"
  },
  {
    "name": "Szutrowa ścieżka piesza bez szerokości",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "footway",
        "surface": "gravel"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Chodnik asfaltowy",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "footway",
        "footway": "sidewalk",
        "surface": "asphalt"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Ścieżka rowerowa",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "cycleway",
        "surface": "gravel"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Szuter, brak klasy drogi",
    "e": {
      "match": "exact",
      "osm": {
        "surface": "gravel"
      }
    },
    "expected": "review"
  },
  {
    "name": "Droga leśna, brak danych dostępu",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "track",
        "surface": "gravel"
      }
    },
    "expected": "review"
  },
  {
    "name": "Szuter, zakaz samochodów",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "track",
        "surface": "gravel",
        "motorcar": "no"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Sprzeczność OSM–NVDB",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "residential"
      },
      "nvdbNetwork": "walk"
    },
    "expected": "review"
  },
  {
    "name": "Ograniczenie warunkowe",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "residential",
        "motor_vehicle:conditional": "no @ (Nov-Mar)"
      }
    },
    "expected": "review"
  },
  {
    "name": "Ogólny dostęp nie zmienia ścieżki w drogę",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "path",
        "access": "yes"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Ścieżka ze szczególną zgodą dla samochodów",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "path",
        "motorcar": "yes"
      }
    },
    "expected": "review"
  },
  {
    "name": "Niepewne dopasowanie geometryczne",
    "e": {
      "match": "ambiguous",
      "osm": {
        "highway": "residential"
      }
    },
    "expected": "review"
  },
  {
    "name": "Szlaban",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "track",
        "motor_vehicle": "yes"
      },
      "barrier": true
    },
    "expected": "review"
  },
  {
    "name": "Droga z potwierdzonym ograniczeniem w kontekście",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "residential"
      },
      "restriction": "confirmed_for_context"
    },
    "expected": "exclude"
  },
  {
    "name": "Ograniczenie tranzytu",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "service",
        "motor_vehicle": "destination"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Dostęp ogólny i szczególny",
    "e": {
      "match": "exact",
      "osm": {
        "highway": "residential",
        "access": "yes",
        "motorcar": "no"
      }
    },
    "expected": "exclude"
  },
  {
    "name": "Brak danych źródłowych",
    "e": {
      "match": "exact",
      "osm": {}
    },
    "expected": "review"
  }
];for(const f of fixtures){const result=R.assess(f.e);assert.equal(result.status,f.expected,f.name);assert.equal(result.legalAccess,'unverified',f.name);}assert.equal(R.assessRoute([fixtures[0].e,fixtures[2].e]).status,'exclude');assert.equal(R.assessRoute([]).status,'review');console.log('20 cases passed');