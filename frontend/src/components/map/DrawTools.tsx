// Draw Tools Component - GeoJSON Import + Click-to-Draw
import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '../../constants/map';
import type { GeoJSONPolygon } from '../../types/geometry';
import './DrawTools.css';

interface DrawToolsProps {
  onDrawComplete: (geometry: GeoJSONPolygon) => void;
  onCancel: () => void;
}

type Mode = 'draw' | 'import';

export const DrawTools = ({ onDrawComplete, onCancel }: DrawToolsProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const [mode, setMode] = useState<Mode>('draw');
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [geoJsonText, setGeoJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedGeometry, setParsedGeometry] = useState<GeoJSONPolygon | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Strict Mode: Check if map is already initialized on this container
    // This happens because React 18 mounts, unmounts, and remounts components in Strict Mode
    // and sometimes the cleanup from the first mount hasn't fully cleared the internal Leaflet state
    // attached to the DOM element before the second mount happens.
    const container = mapRef.current as HTMLDivElement & { _leaflet_id?: string | null };
    if (container._leaflet_id) {
      // If container already has an ID, we need to clean it up manually or return if valid instance exists
      // Here we assume if _leaflet_id exists but mapInstanceRef is null, it's a "zombie" map
      container._leaflet_id = null;
    }

    // Double check we don't already have an instance
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer(MAP_CONFIG.BASE_LAYERS.OPENSTREETMAP.url, {
      attribution: MAP_CONFIG.BASE_LAYERS.OPENSTREETMAP.attribution,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size after a short delay to ensure correct rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Add ResizeObserver for container resizing
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    // Debounced window resize for viewport changes
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

    // Listen for breakpoint transitions
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleBreakpointChange = () => {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      }, 300);
    };
    mediaQuery.addEventListener('change', handleBreakpointChange);

    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      mediaQuery.removeEventListener('change', handleBreakpointChange);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle map clicks for drawing mode
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (mode !== 'draw') return;

    const newPoints = [...points, e.latlng];
    setPoints(newPoints);
    setError(null);
  }, [mode, points]);

  // Setup click handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mode === 'draw') {
      map.on('click', handleMapClick);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [mode, handleMapClick]);

  // Close the drawn ring and convert it to a GeoJSON polygon
  const finishDrawing = useCallback(() => {
    if (points.length < 3) {
      setError('Mindestens 3 Punkte benötigt');
      return;
    }

    const coordinates: [number, number][] = points.map(p => [p.lng, p.lat]);
    coordinates.push(coordinates[0]); // Close polygon

    const geometry: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [coordinates],
    };

    setParsedGeometry(geometry);
  }, [points]);

  // Update map with drawn points
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mode !== 'draw') return;

    // Clear old markers and polygon
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    // Add markers for each point
    points.forEach((point, index) => {
      const marker = L.circleMarker(point, {
        radius: 8,
        fillColor: index === 0 ? '#f59e0b' : '#22c55e',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      if (index === 0 && points.length >= 3) {
        marker.bindTooltip('Klicken zum Schließen', { permanent: false });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          // Close polygon
          finishDrawing();
        });
      }

      markersRef.current.push(marker);
    });

    // Draw polygon if 3+ points
    if (points.length >= 3) {
      const polygon = L.polygon(points, {
        color: '#22c55e',
        weight: 2,
        fillOpacity: 0.2,
        dashArray: '5, 5',
      }).addTo(map);
      polygonLayerRef.current = polygon;
    }
  }, [points, mode, finishDrawing]);

  // Update map for import mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mode !== 'import') return;

    // Clear drawing layers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    // Show imported polygon
    if (parsedGeometry) {
      const geoJsonLayer = L.geoJSON(parsedGeometry as GeoJSON.GeoJsonObject, {
        style: {
          color: '#22c55e',
          weight: 3,
          fillOpacity: 0.3,
        },
      }).addTo(map);

      polygonLayerRef.current = geoJsonLayer as unknown as L.Polygon;

      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [parsedGeometry, mode]);

  const clearDrawing = () => {
    setPoints([]);
    setParsedGeometry(null);
    setError(null);
  };

  const undoLastPoint = () => {
    if (points.length > 0) {
      setPoints(points.slice(0, -1));
      setParsedGeometry(null);
    }
  };

  const parseGeoJson = (text: string) => {
    setError(null);
    setParsedGeometry(null);

    if (!text.trim()) return;

    try {
      const parsed = JSON.parse(text);
      let geometry: GeoJSONPolygon | null = null;

      if (parsed.type === 'Polygon') {
        geometry = parsed;
      } else if (parsed.type === 'Feature' && parsed.geometry?.type === 'Polygon') {
        geometry = parsed.geometry;
      } else if (parsed.type === 'FeatureCollection' && parsed.features?.length > 0) {
        const firstPolygon = parsed.features.find(
          (f: { geometry?: { type?: string } }) => f.geometry?.type === 'Polygon'
        );
        if (firstPolygon) geometry = firstPolygon.geometry;
      }

      if (!geometry) {
        setError('Kein Polygon gefunden');
        return;
      }

      if (!geometry.coordinates?.[0] || geometry.coordinates[0].length < 4) {
        setError('Polygon muss mindestens 3 Punkte haben');
        return;
      }

      setParsedGeometry(geometry);
    } catch {
      setError('Ungültiges JSON-Format');
    }
  };

  const handleSave = () => {
    if (parsedGeometry) {
      onDrawComplete(parsedGeometry);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setPoints([]);
    setParsedGeometry(null);
    setError(null);
    setGeoJsonText('');
  };

  return (
    <div className="draw-tools-container">
      <div className="draw-header">
        <h3>📍 Region erstellen</h3>
        <div className="mode-switcher">
          <button
            className={`mode-btn ${mode === 'draw' ? 'active' : ''}`}
            onClick={() => switchMode('draw')}
          >
            ✏️ Auf Karte zeichnen
          </button>
          <button
            className={`mode-btn ${mode === 'import' ? 'active' : ''}`}
            onClick={() => switchMode('import')}
          >
            📄 GeoJSON importieren
          </button>
        </div>
      </div>

      <div className="draw-content">
        <div className="draw-sidebar">
          {mode === 'draw' ? (
            <div className="draw-mode-panel">
              <div className="draw-status-box">
                <span className="status-count">{points.length}</span>
                <span className="status-label">Punkte gesetzt</span>
              </div>

              <div className="draw-instructions-mini">
                <p>1. Klicke auf die Karte</p>
                <p>2. Setze mind. 3 Punkte</p>
                <p>3. Klicke auf den <strong style={{ color: '#f59e0b' }}>ersten Punkt</strong> zum Schließen</p>
              </div>

              <div className="draw-mode-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={undoLastPoint}
                  disabled={points.length === 0}
                >
                  ↩ Rückgängig
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={clearDrawing}
                  disabled={points.length === 0}
                >
                  🗑️ Löschen
                </button>
              </div>

              {points.length >= 3 && !parsedGeometry && (
                <button
                  className="btn btn-primary w-full"
                  onClick={finishDrawing}
                >
                  ✓ Polygon abschließen
                </button>
              )}
            </div>
          ) : (
            <div className="import-mode-panel">
              <div className="input-section">
                <label className="input-label">GeoJSON Datei:</label>
                <input
                  type="file"
                  accept=".json,.geojson"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target?.result as string;
                        setGeoJsonText(text);
                        parseGeoJson(text);
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="file-input"
                />
              </div>

              <div className="input-section">
                <label className="input-label">Oder GeoJSON einfügen:</label>
                <textarea
                  className="geojson-textarea"
                  value={geoJsonText}
                  onChange={(e) => {
                    setGeoJsonText(e.target.value);
                    parseGeoJson(e.target.value);
                  }}
                  placeholder='{"type": "Polygon", ...}'
                  spellCheck={false}
                />
              </div>

              <p className="help-link">
                💡 <a href="https://geojson.io" target="_blank" rel="noopener noreferrer">geojson.io</a> zum Erstellen
              </p>
            </div>
          )}

          {error && (
            <div className="geojson-error">⚠️ {error}</div>
          )}

          {parsedGeometry && (
            <div className="success-message">✅ Polygon bereit!</div>
          )}
        </div>

        <div className="draw-map-container">
          <div ref={mapRef} className="draw-map" />
        </div>
      </div>

      <div className="draw-controls">
        <button className="btn btn-secondary" onClick={onCancel}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!parsedGeometry}
        >
          Speichern
        </button>
      </div>
    </div>
  );
};
