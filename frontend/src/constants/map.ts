// Map Constants - Placeholder
// TODO: Define map configuration constants

export const MAP_CONFIG = {
  DEFAULT_CENTER: [51.1657, 10.4515] as [number, number], // Germany center
  DEFAULT_ZOOM: 6,
  MIN_ZOOM: 5, // Restrict zoom out
  MAX_ZOOM: 18,
  // Approximate bounds for Germany with some padding [[South, West], [North, East]]
  MAX_BOUNDS: [[47.0, 5.5], [55.5, 15.5]] as [[number, number], [number, number]],
  // Base Layers Configuration
  BASE_LAYERS: {
    ESRI_WORLD_IMAGERY: {
      name: 'Realistische Satellitenbilder', // Was: Satellit (Esri)
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      hasLabels: false // Needs separate label layer
    },
    CARTODB_DARK: {
      name: 'Hoher Kontrast (Daten)', // Was: Dark Matter (CartoDB)
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      hasLabels: true
    },
    OPENTOPOMAP: {
      name: 'Topografisches Gelände', // Was: OpenTopoMap
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      hasLabels: true
    },
    OPENSTREETMAP: {
      name: 'Straßennetz & Details', // Was: OpenStreetMap
      url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', // Using German OSM style
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      hasLabels: true
    }
  },
  // Overlay for labels (Cities, Borders, etc.) - Only used when hasLabels is false (e.g. Satellite)
  LABEL_LAYER: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  TITILER_ENDPOINT: import.meta.env.VITE_TITILER_URL || 'http://localhost:8082',
} as const;

export const INDEX_COLORS = {
  NDVI: {
    LOW: '#d73027',
    MEDIUM: '#fee08b',
    HIGH: '#1a9850',
  },
} as const;

export const BAND_EXPRESSIONS: Record<string, string> = {
  // NDVI = (NIR - Red) / (NIR + Red)
  NDVI: "(b4-b3)/(b4+b3)",
  // NDWI = (Green - NIR) / (Green + NIR)
  NDWI: "(b2-b4)/(b2+b4)",
  // EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
  EVI: "2.5*(b4-b3)/(b4+6*b3-7.5*b1+1)",
  // NDMI = (NIR - SWIR) / (NIR + SWIR)
  NDMI: "(b4-b5)/(b4+b5)",
};
