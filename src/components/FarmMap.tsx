import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ActiveLayer, FarmAnalysis, GridCell500m } from '../types/agro';
import { Check, Pencil, Trash2 } from 'lucide-react';

interface FarmMapProps {
  center: [number, number];
  zoom: number;
  analysis: FarmAnalysis | null;
  activeLayer: ActiveLayer;
  showGibsOverlay: boolean;
  isDrawing: boolean;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onPolygonComplete: (coords: [number, number][]) => void;
  onClearPolygon: () => void;
}

function getCellColor(cell: GridCell500m, layer: ActiveLayer): string {
  if (layer === 'moisture') {
    const m = cell.moisturePct;
    if (m < 14) return '#d97706'; // dry amber
    if (m < 20) return '#eab308'; // moderate-low yellow
    if (m < 27) return '#0ea5e9'; // adequate sky blue
    return '#1d4ed8'; // humid deep blue
  }
  if (layer === 'ndvi') {
    const n = cell.ndvi;
    if (n < 0.32) return '#b45309'; // bare/stressed
    if (n < 0.48) return '#eab308'; // sparse
    if (n < 0.65) return '#65a30d'; // healthy
    return '#15803d'; // dense vigor
  }
  if (layer === 'erosion') {
    const e = cell.erosionRisk;
    if (e >= 65) return '#dc2626'; // high risk red
    if (e >= 42) return '#ea580c'; // moderate orange
    if (e >= 25) return '#eab308'; // low-mod yellow
    return '#16a34a'; // safe green
  }
  // temperature (ECOSTRESS LST)
  const t = cell.surfaceTempC;
  if (t >= 35) return '#b91c1c';
  if (t >= 31) return '#ea580c';
  if (t >= 26) return '#f59e0b';
  return '#0d9488';
}

const LAYER_LEGENDS: Record<
  ActiveLayer,
  { title: string; unit: string; stops: { color: string; label: string }[] }
> = {
  moisture: {
    title: 'Umidade do Solo (SMAP 500m)',
    unit: '% vol.',
    stops: [
      { color: '#d97706', label: '< 14% Seco' },
      { color: '#eab308', label: '14–20%' },
      { color: '#0ea5e9', label: '20–27%' },
      { color: '#1d4ed8', label: '> 27% Úmido' },
    ],
  },
  ndvi: {
    title: 'Vigor Vegetativo (MODIS NDVI)',
    unit: '0–1',
    stops: [
      { color: '#b45309', label: '< 0.32 Exposto' },
      { color: '#eab308', label: '0.32–0.48' },
      { color: '#65a30d', label: '0.48–0.65' },
      { color: '#15803d', label: '> 0.65 Denso' },
    ],
  },
  erosion: {
    title: 'Risco de Erosão (SRTM + GPM + NDVI)',
    unit: '0–100',
    stops: [
      { color: '#16a34a', label: '< 25 Baixo' },
      { color: '#eab308', label: '25–42' },
      { color: '#ea580c', label: '42–65' },
      { color: '#dc2626', label: '> 65 Alto' },
    ],
  },
  temperature: {
    title: 'Temp. Superfície (ECOSTRESS LST)',
    unit: '°C',
    stops: [
      { color: '#0d9488', label: '< 26 °C' },
      { color: '#f59e0b', label: '26–31 °C' },
      { color: '#ea580c', label: '31–35 °C' },
      { color: '#b91c1c', label: '> 35 °C' },
    ],
  },
};

export function FarmMap({
  center,
  zoom,
  analysis,
  activeLayer,
  showGibsOverlay,
  isDrawing,
  onStartDrawing,
  onCancelDrawing,
  onPolygonComplete,
  onClearPolygon,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const gibsLayerRef = useRef<L.TileLayer | null>(null);

  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const draftPointsRef = useRef<[number, number][]>([]);
  draftPointsRef.current = draftPoints;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Satellite Basemap (Esri World Imagery)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri World Imagery | NASA Earth Observations',
        maxZoom: 18,
      }
    ).addTo(map);

    // Subtle labels overlay
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.75,
      }
    ).addTo(map);

    gridLayerRef.current = L.layerGroup().addTo(map);
    drawLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to preset region when center changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(center, zoom, { duration: 0.9 });
  }, [center, zoom]);

  // Toggle NASA GIBS MODIS NDVI WMTS overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showGibsOverlay) {
      if (!gibsLayerRef.current) {
        gibsLayerRef.current = L.tileLayer(
          'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2026-09-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
          {
            opacity: 0.55,
            maxNativeZoom: 9,
            maxZoom: 18,
            attribution: 'NASA GIBS MODIS NDVI',
          }
        );
      }
      gibsLayerRef.current.addTo(map);
    } else if (gibsLayerRef.current) {
      map.removeLayer(gibsLayerRef.current);
    }
  }, [showGibsOverlay]);

  // Handle drawing mode clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isDrawing) {
      setDraftPoints([]);
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const handleClick = (e: L.LeafletMouseEvent) => {
      setDraftPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (draftPointsRef.current.length >= 3) {
        onPolygonComplete(draftPointsRef.current);
        setDraftPoints([]);
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
      map.getContainer().style.cursor = '';
    };
  }, [isDrawing, onPolygonComplete]);

  // Render draft polygon vertices while drawing
  useEffect(() => {
    const layer = drawLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (draftPoints.length === 0) return;

    if (draftPoints.length >= 2) {
      L.polyline(draftPoints, {
        color: '#34d399',
        weight: 2.5,
        dashArray: '6, 6',
      }).addTo(layer);
    }

    if (draftPoints.length >= 3) {
      L.polygon(draftPoints, {
        color: '#34d399',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 0.2,
      }).addTo(layer);
    }

    draftPoints.forEach((pt, idx) => {
      L.circleMarker(pt, {
        radius: idx === 0 ? 7 : 5,
        color: '#ffffff',
        weight: 2,
        fillColor: idx === 0 ? '#10b981' : '#34d399',
        fillOpacity: 1,
      }).addTo(layer);
    });
  }, [draftPoints]);

  // Render harmonized 500m grid + farm boundary
  useEffect(() => {
    const layer = gridLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!analysis) return;

    // 500m cells
    analysis.gridCells.forEach((cell) => {
      const coords = cell.geometry.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      const color = getCellColor(cell, activeLayer);

      const poly = L.polygon(coords, {
        color: 'rgba(255,255,255,0.35)',
        weight: 0.8,
        fillColor: color,
        fillOpacity: 0.62,
      });

      poly.bindTooltip(
        `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.45;">
          <strong>Célula ~500m (${cell.id})</strong><br/>
          Umidade SMAP: <b>${cell.moisturePct}%</b><br/>
          MODIS NDVI: <b>${cell.ndvi}</b><br/>
          Risco Erosão: <b>${cell.erosionRisk}/100</b><br/>
          ECOSTRESS LST: <b>${cell.surfaceTempC} °C</b>
        </div>`,
        { sticky: true }
      );

      poly.addTo(layer);
    });

    // Outer Farm Boundary
    const boundaryCoords = analysis.polygonGeoJson.geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
    L.polygon(boundaryCoords, {
      color: '#ffffff',
      weight: 2.5,
      fill: false,
    }).addTo(layer);
  }, [analysis, activeLayer]);

  const legend = LAYER_LEGENDS[activeLayer];

  return (
    <div className="map-wrapper">
      <div ref={containerRef} id="farm-leaflet-map" className="leaflet-container-root" />

      {/* Drawing Toolbar Overlay */}
      <div className="map-draw-toolbar">
        {!isDrawing ? (
          <>
            <button
              type="button"
              id="btn-draw-polygon"
              className="map-tool-btn primary"
              onClick={onStartDrawing}
            >
              <Pencil size={15} />
              <span>Desenhar Limite da Fazenda</span>
            </button>
            {analysis && (
              <button
                type="button"
                id="btn-clear-polygon"
                className="map-tool-btn"
                onClick={onClearPolygon}
                title="Limpar polígono"
              >
                <Trash2 size={15} />
              </button>
            )}
          </>
        ) : (
          <div className="draw-active-pill">
            <span>Clique no mapa para marcar os vértices ({draftPoints.length} pontos)</span>
            {draftPoints.length >= 3 && (
              <button
                type="button"
                id="btn-finish-polygon"
                className="map-tool-btn confirm"
                onClick={() => {
                  onPolygonComplete(draftPoints);
                  setDraftPoints([]);
                }}
              >
                <Check size={15} />
                <span>Concluir Polígono</span>
              </button>
            )}
            <button
              type="button"
              id="btn-cancel-drawing"
              className="map-tool-btn"
              onClick={() => {
                setDraftPoints([]);
                onCancelDrawing();
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Layer Legend */}
      <div className="map-legend-card">
        <div className="legend-title">{legend.title}</div>
        <div className="legend-stops">
          {legend.stops.map((stop) => (
            <div key={stop.label} className="legend-stop">
              <span className="legend-swatch" style={{ backgroundColor: stop.color }} />
              <span>{stop.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
