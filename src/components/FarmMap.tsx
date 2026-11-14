import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { BacktestYearPoint, FarmAnalysis, GibsLayerId, NasaBasemapId } from '../types/agro';
import { ArrowRight, Check, MapPin, Pause, Pencil, Play, Trash2 } from 'lucide-react';

interface FarmMapProps {
  center: [number, number];
  zoom: number;
  analysis: FarmAnalysis | null;
  basemap: NasaBasemapId;
  gibsLayer: GibsLayerId;
  isDrawing: boolean;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onPolygonComplete: (coords: [number, number][]) => void;
  onClearPolygon: () => void;
  backtestSeries?: BacktestYearPoint[];
  onOpenCropDashboard?: () => void;
}

function getRecentGibsDate(): string {
  // 16 days ago ensures GIBS 8-day/L4 products are finalized and available
  const d = new Date(Date.now() - 16 * 86400000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addBasemapToGroup(group: L.LayerGroup, basemap: NasaBasemapId) {
  const dateStr = getRecentGibsDate();

  if (basemap === 'hybrid_hd') {
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'Esri World Imagery & Ruas | Dados NASA POWER & GIBS',
        zIndex: 1,
      }
    ).addTo(group);

    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.9,
        zIndex: 20,
      }
    ).addTo(group);

    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.9,
        zIndex: 21,
      }
    ).addTo(group);
    return;
  }

  if (basemap === 'osm_streets') {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap | Dados NASA POWER & GIBS',
      zIndex: 1,
    }).addTo(group);
    return;
  }

  // NASA GIBS regional basemaps (zoom 1–9 nativo)
  if (basemap === 'modis_truecolor') {
    L.tileLayer(
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      {
        maxNativeZoom: 9,
        maxZoom: 18,
        attribution: 'NASA GIBS (MODIS Terra True Color)',
        zIndex: 1,
      }
    ).addTo(group);
  } else if (basemap === 'bluemarble') {
    L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
      {
        maxNativeZoom: 8,
        maxZoom: 18,
        attribution: 'NASA GIBS (Blue Marble Next Generation)',
        zIndex: 1,
      }
    ).addTo(group);
  } else {
    L.tileLayer(
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      {
        maxNativeZoom: 9,
        maxZoom: 18,
        attribution: 'NASA GIBS (VIIRS SNPP True Color)',
        zIndex: 1,
      }
    ).addTo(group);
  }

  L.tileLayer(
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Reference_Features_15m/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
    { maxNativeZoom: 9, maxZoom: 18, opacity: 0.7, zIndex: 20 }
  ).addTo(group);

  L.tileLayer(
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Reference_Labels_15m/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
    { maxNativeZoom: 9, maxZoom: 18, opacity: 0.85, zIndex: 21 }
  ).addTo(group);
}

function getGibsTileUrl(layer: GibsLayerId): string | null {
  const dateStr = getRecentGibsDate();
  if (layer === 'modis_ndvi') {
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
  }
  if (layer === 'smap_l4') {
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/${dateStr}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
  }
  if (layer === 'gpm_imerg') {
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${dateStr}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
  }
  return null;
}

function getPolygonYearColor(pt: BacktestYearPoint | undefined): string {
  if (!pt) return '#004aad';
  if (pt.status === 'seca') return '#dc2626';
  if (pt.status === 'excesso') return '#004aad';
  return '#7ed957';
}

export function FarmMap({
  center,
  zoom,
  analysis,
  basemap,
  gibsLayer,
  isDrawing,
  onStartDrawing,
  onCancelDrawing,
  onPolygonComplete,
  onClearPolygon,
  backtestSeries = [],
  onOpenCropDashboard,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polyLayerRef = useRef<L.LayerGroup | null>(null);
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const basemapGroupRef = useRef<L.LayerGroup | null>(null);
  const gibsTileRef = useRef<L.TileLayer | null>(null);

  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const draftPointsRef = useRef<[number, number][]>([]);
  draftPointsRef.current = draftPoints;

  const [yearIdx, setYearIdx] = useState<number>(Math.max(0, backtestSeries.length - 3));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isQuickPin, setIsQuickPin] = useState<boolean>(false);

  useEffect(() => {
    if (backtestSeries.length > 0 && yearIdx >= backtestSeries.length) {
      setYearIdx(backtestSeries.length - 1);
    }
  }, [backtestSeries.length, yearIdx]);

  useEffect(() => {
    if (!isPlaying || backtestSeries.length === 0) return;
    const timer = setInterval(() => {
      setYearIdx((prev) => (prev + 1) % backtestSeries.length);
    }, 650);
    return () => clearInterval(timer);
  }, [isPlaying, backtestSeries.length]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      maxZoom: 18,
      zoomControl: false,
    });

    map.attributionControl.setPrefix('NASA POWER & GIBS');
    L.control.zoom({ position: 'topright' }).addTo(map);

    basemapGroupRef.current = L.layerGroup().addTo(map);
    polyLayerRef.current = L.layerGroup().addTo(map);
    drawLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Basemap layers
  useEffect(() => {
    const group = basemapGroupRef.current;
    if (!group) return;
    group.clearLayers();
    addBasemapToGroup(group, basemap);
  }, [basemap]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom]);

  // Update live NASA GIBS science overlay tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (gibsTileRef.current) {
      map.removeLayer(gibsTileRef.current);
      gibsTileRef.current = null;
    }

    const url = getGibsTileUrl(gibsLayer);
    if (url) {
      const maxNativeZoom = gibsLayer === 'modis_ndvi' ? 9 : 6;
      gibsTileRef.current = L.tileLayer(url, {
        opacity: 0.38,
        maxNativeZoom,
        maxZoom: 18,
        attribution: 'NASA GIBS | NASA POWER & CMR',
        zIndex: 10,
      }).addTo(map);
    }
  }, [gibsLayer]);

  // Quick 1-click mode handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isQuickPin) return;

    map.getContainer().style.cursor = 'crosshair';
    const handleQuickClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const d = 0.0023; // ~25 ha area around clicked point
      setIsQuickPin(false);
      onPolygonComplete([
        [lat + d, lng - d],
        [lat + d, lng + d],
        [lat - d, lng + d],
        [lat - d, lng - d],
      ]);
    };

    map.on('click', handleQuickClick);
    return () => {
      map.off('click', handleQuickClick);
      map.getContainer().style.cursor = '';
    };
  }, [isQuickPin, onPolygonComplete]);

  // Drawing mode handlers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isDrawing) {
      setDraftPoints([]);
      if (!isQuickPin) {
        map.getContainer().style.cursor = '';
      }
      return;
    }

    setIsQuickPin(false);
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
  }, [isDrawing, isQuickPin, onPolygonComplete]);

  // Render draft polygon vertices
  useEffect(() => {
    const layer = drawLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (draftPoints.length === 0) return;

    if (draftPoints.length >= 2) {
      L.polyline(draftPoints, {
        color: '#7ed957',
        weight: 2.5,
        dashArray: '6, 6',
      }).addTo(layer);
    }

    if (draftPoints.length >= 3) {
      L.polygon(draftPoints, {
        color: '#7ed957',
        weight: 2,
        fillColor: '#7ed957',
        fillOpacity: 0.22,
      }).addTo(layer);
    }

    draftPoints.forEach((pt, idx) => {
      L.circleMarker(pt, {
        radius: idx === 0 ? 7 : 5,
        color: '#ffffff',
        weight: 2,
        fillColor: idx === 0 ? '#004aad' : '#7ed957',
        fillOpacity: 1,
      }).addTo(layer);
    });
  }, [draftPoints]);

  // Render farm polygon colored by selected backtest year
  useEffect(() => {
    const layer = polyLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!analysis) return;

    const currentPt = backtestSeries[yearIdx];
    const fillColor = getPolygonYearColor(currentPt);
    const boundaryCoords = analysis.polygonGeoJson.geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );

    const poly = L.polygon(boundaryCoords, {
      color: '#ffffff',
      weight: 2.5,
      fillColor,
      fillOpacity: 0.32,
    });

    if (currentPt) {
      poly.bindTooltip(
        `<div style="font-family:Inter,sans-serif;font-size:12px;">
          <strong>${analysis.soil.municipality} (${analysis.areaHa} ha)</strong><br/>
          Safra ${currentPt.year}: <b>${currentPt.relYieldPct}% do potencial</b><br/>
          Chuva na safra: ${currentPt.seasonRainMm} mm | ETc: ${currentPt.seasonEtcMm} mm
        </div>`,
        { sticky: true }
      );
    }

    poly.addTo(layer);
  }, [analysis, backtestSeries, yearIdx]);

  const currentPt = backtestSeries[yearIdx];

  return (
    <div className="map-wrapper">
      <div ref={containerRef} id="farm-leaflet-map" className="leaflet-container-root" />

      {/* Drawing Toolbar */}
      <div className="map-draw-toolbar">
        {!isDrawing && !isQuickPin ? (
          <>
            <button
              type="button"
              id="btn-quick-pin"
              className="map-tool-btn primary"
              onClick={() => setIsQuickPin(true)}
            >
              <MapPin size={15} />
              <span>Marcar com 1 clique</span>
            </button>
            <button
              type="button"
              id="btn-draw-polygon"
              className="map-tool-btn"
              onClick={onStartDrawing}
            >
              <Pencil size={15} />
              <span>Desenhar contorno</span>
            </button>
            {analysis && (
              <button
                type="button"
                id="btn-clear-polygon"
                className="map-tool-btn"
                onClick={onClearPolygon}
                title="Limpar área"
              >
                <Trash2 size={15} />
              </button>
            )}
          </>
        ) : isQuickPin ? (
          <div className="draw-active-pill">
            <span>Clique no centro da sua lavoura</span>
            <button
              type="button"
              className="map-tool-btn"
              onClick={() => setIsQuickPin(false)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="draw-active-pill">
            <span>Marque os vértices no mapa ({draftPoints.length} pontos)</span>
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
                <span>Concluir</span>
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

      {/* Historical Backtest Scrub Bar */}
      {analysis && backtestSeries.length > 0 && (
        <div className="map-timetravel-card">
          <div className="tt-header">
            <button
              type="button"
              className="tt-play-btn"
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? 'Pausar' : 'Reproduzir safras'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <div className="tt-info">
              <span className="tt-label">Histórico de safras na área (2005–2024)</span>
              <div className="tt-status-row">
                <strong>Safra {currentPt?.year}</strong>
                <span className={`tt-pill ${currentPt?.status}`}>
                  {currentPt?.status === 'seca'
                    ? 'Seca'
                    : currentPt?.status === 'excesso'
                      ? 'Chuva forte'
                      : 'Boa'}
                </span>
                <span className="tt-yield">
                  Colheita: {currentPt?.relYieldPct}%
                </span>
              </div>
            </div>
            {onOpenCropDashboard && (
              <button
                type="button"
                className="tt-cta-btn"
                onClick={onOpenCropDashboard}
              >
                <span>Comparar</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
          <input
            type="range"
            className="tt-slider"
            min={0}
            max={backtestSeries.length - 1}
            value={yearIdx}
            onChange={(e) => {
              setIsPlaying(false);
              setYearIdx(Number(e.target.value));
            }}
          />
        </div>
      )}

      {/* Honest Legend */}
      <div className="map-legend-card">
        <div className="legend-title">Cor da lavoura no ano</div>
        <div className="legend-stops">
          <div className="legend-stop">
            <span className="legend-swatch" style={{ backgroundColor: '#7ed957' }} />
            <span>Boa</span>
          </div>
          <div className="legend-stop">
            <span className="legend-swatch" style={{ backgroundColor: '#dc2626' }} />
            <span>Seca</span>
          </div>
          <div className="legend-stop">
            <span className="legend-swatch" style={{ backgroundColor: '#004aad' }} />
            <span>Chuva forte</span>
          </div>
        </div>
      </div>
    </div>
  );
}
