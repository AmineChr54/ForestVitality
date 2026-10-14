// Map View Component - Main map with Leaflet
import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '../../constants/map';
import { VegetationIndex } from '../../types/vitality';
import { useMapStore } from '../../state/mapStore';
import type { Region } from '../../types/geometry';
import type { AnalysisResult } from '../../types/vitality';
import { MapLayerSelector } from './MapLayerSelector';
import './MapView.css';

// Band math expressions for Sentinel-2 (TiTiler)
// COG Band Order: B02=b1 (Blue), B03=b2 (Green), B04=b3 (Red), B8A=b4 (NIR), B11=b5 (SWIR)
// Band math expressions now imported from constants
import { BAND_EXPRESSIONS } from '../../constants/map';

const EXPRESSIONS = BAND_EXPRESSIONS;

// Per-index colormaps matching the frontend legend color scales
const COLORMAPS: Record<string, string> = {
  [VegetationIndex.NDVI]: "rdylgn",
  [VegetationIndex.EVI]: "rdylgn",
  [VegetationIndex.NDWI]: "blues",
  [VegetationIndex.NDMI]: "rdbu",
};

interface MapViewProps {
  /** Legacy regions from useRegions (optional) */
  regions?: Region[];
  selectedRegionId?: string | null;
  onRegionClick?: (regionId: string) => void;
  analysisOverlay?: AnalysisResult | null;
  /** New: Multiple overlays for split regions */
  analysisOverlays?: AnalysisResult[];
  /** New: BBox to zoom to [minLon, minLat, maxLon, maxLat] */
  selectedBbox?: [number, number, number, number] | null;
  /** New: Geometry to display (Polygon, MultiPolygon, or GeometryCollection) */
  selectedGeometry?: GeoJSON.Geometry | GeoJSON.GeometryCollection | null;
  /** New: Name for tooltip */
  selectedRegionName?: string;
  /** Overlay opacity 0-1, default 0.9 */
  overlayOpacity?: number;
  /** Change this value to force a re-zoom to selectedBbox (e.g. increment a counter) */
  zoomTrigger?: number;
}

export const MapView = ({
  regions = [],
  selectedRegionId,
  onRegionClick,
  analysisOverlay,
  analysisOverlays = [],
  selectedBbox,
  selectedGeometry,
  selectedRegionName,
  overlayOpacity = 0.9,
  zoomTrigger,
}: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // Latest selectedBbox for async callbacks inside the one-time map setup
  const selectedBboxRef = useRef(selectedBbox);
  useEffect(() => {
    selectedBboxRef.current = selectedBbox;
  }, [selectedBbox]);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const regionsLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedLayerRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null); // For Raster Tiles
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);

  // State for base layer selection
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<keyof typeof MAP_CONFIG.BASE_LAYERS>('ESRI_WORLD_IMAGERY');

  // Get the setBounds action from the map store
  const setBounds = useMapStore((state) => state.setBounds);

  // Handler to update map bounds in global store (for AI geo-context)
  const updateMapBounds = useCallback((map: L.Map) => {
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();

    setBounds({
      bbox: [
        bounds.getWest(),  // min longitude
        bounds.getSouth(), // min latitude  
        bounds.getEast(),  // max longitude
        bounds.getNorth(), // max latitude
      ],
      center: [center.lng, center.lat],
      zoom,
    });
  }, [setBounds]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default center (Germany)
    const map = L.map(mapRef.current, {
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: 6, // Force zoom 6
      minZoom: 6, // Prevent zooming out further than Germany
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      zoomControl: true,
      worldCopyJump: false,
    });

    // Create layer groups
    regionsLayerRef.current = L.layerGroup().addTo(map);
    selectedLayerRef.current = L.layerGroup().addTo(map);
    // Overlay layer always on top of regions but below UI
    overlayLayerRef.current = L.layerGroup().addTo(map);

    // Create strict bounds (Germany)
    const southWest = L.latLng(47.0, 5.5);
    const northEast = L.latLng(55.5, 15.5);
    const bounds = L.latLngBounds(southWest, northEast);

    // Apply strict bounds immediately
    map.setMaxBounds(bounds);
    map.options.maxBoundsViscosity = 1.0;

    // Increase minZoom to restrict zoom-out further
    map.setMinZoom(6);

    // Load Germany GeoJSON for inverse mask (Visual Focus)
    // Re-added with opacity 0.5 per user request
    fetch('/data/germany.geo.json')
      .then((res) => res.json())
      .then((data) => {
        if (!map) return;

        // Assuming FeatureCollection with one feature or just Feature
        const feature = data.features ? data.features[0] : data;
        const geometry = feature.geometry;

        // Each polygon is a list of rings; each ring a list of [lng, lat] positions
        let polygons: number[][][][] = [];
        if (geometry.type === 'MultiPolygon') {
          polygons = geometry.coordinates;
        } else if (geometry.type === 'Polygon') {
          polygons = [geometry.coordinates];
        }

        // Prepare holes (Germany bounds)
        // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
        const holes = polygons.map((poly) =>
          // poly[0] is the outer ring
          poly[0].map(([lng, lat]) => [lat, lng] as L.LatLngTuple)
        );

        // World polygon (Clockwise)
        const worldCoords: L.LatLngTuple[] = [
          [90, -180],
          [90, 180],
          [-90, 180],
          [-90, -180]
        ];

        // Combine: [World, Hole1, Hole2, ...]
        const maskCoords = [worldCoords, ...holes];

        L.polygon(maskCoords, {
          color: 'transparent',
          fillColor: '#000000', // Black
          fillOpacity: 0.5,     // Subtle darkening
          stroke: false,
          interactive: false
        }).addTo(map);

      })
      .catch((err) => console.error('Failed to load Germany mask:', err));

    // Force refresh size after mount to handle layout issues
    setTimeout(() => {
      // Safety check: ensure map and container still exist
      if (mapInstanceRef.current && mapRef.current) {
        try {
          map.invalidateSize();
          // Only fit to default bounds if NO specific bbox is selected
          if (bounds.isValid() && !selectedBboxRef.current) {
            map.fitBounds(bounds);
          }
        } catch (e) {
          console.warn('Map fitBounds failed:', e);
        }
      }
    }, 200);

    mapInstanceRef.current = map;

    // Emit initial bounds
    updateMapBounds(map);

    // Listen for map movement and zoom events to update geo-context
    map.on('moveend', () => updateMapBounds(map));
    map.on('zoomend', () => updateMapBounds(map));

    // Add ResizeObserver to handle container resizing (e.g. sidebar collapse)
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    // Also listen for window resize (catches DevTools device toolbar, orientation changes)
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleWindowResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      }, 150);
    };
    window.addEventListener('resize', handleWindowResize);

    // Listen for CSS breakpoint changes (mobile ↔ tablet ↔ desktop transitions)
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleBreakpointChange = () => {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      }, 300); // Delay to let CSS transitions complete
    };
    mediaQuery.addEventListener('change', handleBreakpointChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      mediaQuery.removeEventListener('change', handleBreakpointChange);
      clearTimeout(resizeTimeout);
      map.off('moveend');
      map.off('zoomend');
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [updateMapBounds]);

  // Handle Base Layer Changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old layers
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
    if (labelLayerRef.current) map.removeLayer(labelLayerRef.current);

    const config = MAP_CONFIG.BASE_LAYERS[selectedBaseLayer];

    // Add new base layer
    baseLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
    }).addTo(map);
    baseLayerRef.current.bringToBack(); // Ensure it stays at the bottom

    // Add labels if needed (e.g. for Satellite) AND if a label layer is defined
    if (!config.hasLabels && MAP_CONFIG.LABEL_LAYER) {
      labelLayerRef.current = L.tileLayer(MAP_CONFIG.LABEL_LAYER, {
        pane: 'overlayPane',
        opacity: 0.85,
        zIndex: 100 // Labels on top
      }).addTo(map);
    }

  }, [selectedBaseLayer]);

  // Update legacy regions on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const regionsLayer = regionsLayerRef.current;
    if (!map || !regionsLayer) return;

    regionsLayer.clearLayers();

    regions.forEach((region) => {
      const isSelected = region.id === selectedRegionId;

      // Convert coordinates to Leaflet format (swap lng/lat to lat/lng)
      const coords = region.geometry.coordinates[0] as [number, number][];
      const coordinates = coords.map(
        (coord) => [coord[1], coord[0]] as L.LatLngTuple
      );

      const polygon = L.polygon(coordinates, {
        color: isSelected ? '#22c55e' : '#3b82f6',
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? '#22c55e' : '#3b82f6',
        fillOpacity: isSelected ? 0.3 : 0.15,
      });

      polygon.on('click', () => {
        onRegionClick?.(region.id);
      });

      polygon.bindTooltip(region.name, {
        permanent: false,
        direction: 'center',
      });

      polygon.addTo(regionsLayer);
    });
  }, [regions, selectedRegionId, onRegionClick]);

  // Fit bounds to selected legacy region
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRegionId || selectedBbox) return; // Skip if using new bbox system

    const region = regions.find((r) => r.id === selectedRegionId);
    if (!region) return;

    const coords = region.geometry.coordinates[0] as [number, number][];
    const coordinates = coords.map(
      (coord) => [coord[1], coord[0]] as L.LatLngTuple
    );

    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [selectedRegionId, regions, selectedBbox]);

  // Handle new bbox-based zoom (also re-zoom when zoomTrigger changes)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedBbox) return;

    const [minLon, minLat, maxLon, maxLat] = selectedBbox;
    const bounds = L.latLngBounds(
      [minLat, minLon], // Southwest
      [maxLat, maxLon]  // Northeast
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [selectedBbox, zoomTrigger]);

  // Display selected geometry (new system)
  useEffect(() => {
    const selectedLayer = selectedLayerRef.current;
    if (!selectedLayer) return;

    selectedLayer.clearLayers();

    if (!selectedGeometry) return;

    const style: L.PathOptions = {
      color: '#22c55e',
      weight: 3,
      fillColor: '#22c55e',
      fillOpacity: 0.15,
    };

    try {
      // Handle different geometry types
      if (selectedGeometry.type === 'GeometryCollection') {
        // Render each geometry in the collection
        selectedGeometry.geometries.forEach((geom) => {
          if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
            const geoJsonLayer = L.geoJSON(geom as GeoJSON.Geometry, { style });
            geoJsonLayer.addTo(selectedLayer);
          }
        });
      } else if (selectedGeometry.type === 'Polygon' || selectedGeometry.type === 'MultiPolygon') {
        const geoJsonLayer = L.geoJSON(selectedGeometry as GeoJSON.Geometry, { style });

        if (selectedRegionName) {
          geoJsonLayer.bindTooltip(selectedRegionName, {
            permanent: false,
            direction: 'center',
          });
        }

        geoJsonLayer.addTo(selectedLayer);
      }
    } catch (err) {
      console.error('Error rendering geometry:', err);
    }
  }, [selectedGeometry, selectedRegionName]);

  // Render Vegetation Index Overlays (TiTiler) - Canvas-based polygon clipping
  useEffect(() => {
    const overlayLayer = overlayLayerRef.current;
    const map = mapInstanceRef.current;
    if (!overlayLayer || !map) return;

    overlayLayer.clearLayers();

    // Collect all overlays to render: single 'analysisOverlay' + array 'analysisOverlays'
    const overlaysToRender = [
      ...(analysisOverlay ? [analysisOverlay] : []),
      ...(analysisOverlays || [])
    ];

    if (overlaysToRender.length === 0) return;

    // Factory function to create a ClippedTileLayer with proper closure binding
    const createClippedLayer = (tileUrl: string, polygons: [number, number][][]) => {
      // ... (Keep existing factory function code exactly as is)
      return L.GridLayer.extend({
        createTile: function (coords: L.Coords, done: L.DoneCallback) {
          const tile = document.createElement('canvas');
          const tileSize = this.getTileSize();
          const renderSize = 512; // @2x resolution
          tile.width = renderSize;
          tile.height = renderSize;

          const ctx = tile.getContext('2d');
          if (!ctx) {
            done(new Error('No canvas context'), tile);
            return tile;
          }

          // Enable smoothing for better visual quality
          ctx.imageSmoothingEnabled = true;
          // tile.style.imageRendering = 'pixelated'; // Removed for smoother look

          const scale = renderSize / tileSize.x;
          const nwPoint = L.point(coords.x * tileSize.x, coords.y * tileSize.y);

          // Project every polygon vertex into this tile's pixel space for clipping
          const clipPoints: Array<{ x: number, y: number, polygon: number }> = [];

          for (let pIdx = 0; pIdx < polygons.length; pIdx++) {
            const polygon = polygons[pIdx];
            for (const [lng, lat] of polygon) {
              const point = map.project([lat, lng], coords.z);
              const x = (point.x - nwPoint.x) * scale;
              const y = (point.y - nwPoint.y) * scale;
              clipPoints.push({ x, y, polygon: pIdx });
            }
          }

          const img = new Image();
          img.crossOrigin = 'anonymous';

          const actualTileUrl = tileUrl
            .replace('{z}', String(coords.z))
            .replace('{x}', String(coords.x))
            .replace('{y}', String(coords.y));

          img.onload = () => {
            // 1. Draw image first
            ctx.globalAlpha = 0.9;
            ctx.drawImage(img, 0, 0, renderSize, renderSize);
            ctx.globalAlpha = 1.0;

            // 2. Set composite mode
            ctx.globalCompositeOperation = 'destination-in';

            // 3. Draw clipping mask
            ctx.beginPath();
            let currentPolygon = -1;

            for (const pt of clipPoints) {
              if (pt.polygon !== currentPolygon) {
                if (currentPolygon !== -1) {
                  ctx.closePath();
                }
                ctx.moveTo(pt.x, pt.y);
                currentPolygon = pt.polygon;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            }
            if (currentPolygon !== -1) {
              ctx.closePath();
            }

            // Fill the polygon to create the mask
            ctx.fillStyle = '#000000';
            ctx.fill();

            done(undefined, tile);
          };

          img.onerror = (e) => {
            console.error('[TiTiler Error] Tile failed to load:', actualTileUrl, e);
            done(undefined, tile);
          };

          img.src = actualTileUrl;
          return tile;
        }
      });
    };

    // Iterate through EACH result (sub-region or main) and render its layers
    overlaysToRender.forEach((overlay) => {
      const scenePaths = overlay.scenePaths || (overlay.scenePath ? [overlay.scenePath] : []);
      const expression = EXPRESSIONS[overlay.indexType];

      if (scenePaths.length === 0 || !expression) {
        console.warn('[MapView] Skipping overlay - no scenes or expression');
        return;
      }

      if (scenePaths.length === 0 || !expression) return;

      // Determine clipping geometry for THIS specific overlay
      // If the overlay Result has a specific regionId that matches a sub-region, we could look it up.
      // BUT: For now, we rely on the parent component passing `selectedGeometry`.
      // CRITICAL: If we are splitting regions, efficient rendering depends on using the CORRECT sub-polygon.
      // Currently, `selectedGeometry` is global. 
      // We need a way to pass the *specific* geometry for *this* overlay if available?
      // Actually, the request was to "split and load sequentially".
      // UseAnalysis handles the logic. The Map just renders what it gets.
      // If we want to clip TILE A to POLYGON A, MapView needs to know "Overlay A corresponds to Polygon A".

      // HACK/FIX: For Global Geometry (MultiPolygon), we clip EVERYTHING to the Global Geometry.
      // The "Iterative Loading" creates separate layers.
      // The "Intersection Check" inside createClippedLayer will AUTOMATICALLY skip tiles 
      // that belong to SubRegion A but are checked against SubRegion B's bounds? 
      // NO, if we pass the GLOBAL geometry, it checks against ALL sub-polygons.

      // HOWEVER, the user said: "Nicht clippen, sondern die subregions raussuchen und diese einfach nach und nach laden".
      // This implies we should treat them as separate visual entities.

      let clipPolygons: [number, number][][] = [];

      // Check if overlay has embedded geometry (future proofing) or fallback to global selectedGeometry
      // Logic: Prefer specific overlay geometry (Sub-Region) -> Fallback to global
      if (overlay.geometry) {
        if (overlay.geometry.type === 'Polygon') {
          clipPolygons = [(overlay.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][]];
        } else if (overlay.geometry.type === 'MultiPolygon') {
          clipPolygons = ((overlay.geometry as GeoJSON.MultiPolygon).coordinates as [number, number][][][]).map(p => p[0]);
        }
      } else if (selectedGeometry) {
        if (selectedGeometry.type === 'Polygon') {
          clipPolygons = [selectedGeometry.coordinates[0] as [number, number][]];
        } else if (selectedGeometry.type === 'MultiPolygon') {
          clipPolygons = (selectedGeometry.coordinates as [number, number][][][]).map(p => p[0]);
        }
      }

      const encodedExpr = encodeURIComponent(expression);

      for (const scenePath of scenePaths) {
        const encodedPath = encodeURIComponent(scenePath);
        const tileUrlTemplate = `/titiler/cog/tiles/WebMercatorQuad/{z}/{x}/{y}@2x.png` +
          `?url=${encodedPath}` +
          `&expression=${encodedExpr}` +
          `&rescale=-1,1` +
          `&colormap_name=${COLORMAPS[overlay.indexType] || 'rdylgn'}`;

        if (clipPolygons.length === 0) {
          L.tileLayer(tileUrlTemplate, { opacity: 0.9, maxZoom: 24 }).addTo(overlayLayer);
          continue;
        }

        const ClippedTileLayerClass = createClippedLayer(tileUrlTemplate, clipPolygons);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clippedLayer = new (ClippedTileLayerClass as any)({
          maxZoom: 24,
          tileSize: 256,
          updateWhenZooming: false, // Prevent "blubber" artifacts during zoom
          updateWhenIdle: true,     // Only render when zoom/pan finishes
          keepBuffer: 2             // Keep a bit more buffer to avoid white edges during small pans
        });
        clippedLayer.addTo(overlayLayer);
      }
    });

  }, [analysisOverlay, analysisOverlays, selectedGeometry]);

  // Update overlay opacity dynamically (only tile layers, not region borders)
  useEffect(() => {
    const overlayLayer = overlayLayerRef.current;
    if (!overlayLayer) return;

    overlayLayer.eachLayer((layer) => {
      if (layer instanceof L.GridLayer) {
        // TileLayer and the custom canvas ClippedTileLayer both extend GridLayer
        layer.setOpacity(overlayOpacity);
      }
    });
  }, [overlayOpacity]);

  return (
    <div className="map-view-container">
      <div ref={mapRef} className="map-view" />

      {/* Map Layer Selection Control */}
      <MapLayerSelector
        selectedLayer={selectedBaseLayer}
        onSelectLayer={setSelectedBaseLayer}
      />

      {analysisOverlay && (
        <div className="overlay-indicator">
          <span className="overlay-badge">{analysisOverlay.indexType}</span>
          <span className="overlay-text">Overlay aktiv</span>
          {!analysisOverlay.scenePath && <span className="overlay-warning"> (Mock Data)</span>}
        </div>
      )}
    </div>
  );
};
