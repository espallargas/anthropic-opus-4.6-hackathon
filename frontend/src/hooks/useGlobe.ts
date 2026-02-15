import { useEffect, useState } from 'react';
import { countryCentroids } from '@/lib/countries';

interface GeoFeature {
  type: 'Feature';
  properties: {
    ISO_A2: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSON {
  features: GeoFeature[];
}

export interface PolygonData {
  lat: number;
  lng: number;
  geometry: GeoFeature['geometry'];
  countryCode: string;
  isOrigin: boolean;
  isDestination: boolean;
}

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  altitude: number;
  isBase: boolean;
}

export interface RingData {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
}

export function useGlobe(origin?: string, destination?: string) {
  const [loading, setLoading] = useState(true);
  const [geoJSON, setGeoJSON] = useState<GeoJSON | null>(null);
  const [polygonsData, setPolygonsData] = useState<PolygonData[]>([]);
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [ringsData, setRingsData] = useState<RingData[]>([]);
  const [pointOfView, setPointOfView] = useState<{
    lat: number;
    lng: number;
    altitude: number;
  } | null>(null);

  // Fetch GeoJSON on mount
  useEffect(() => {
    const fetchGeoJSON = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
        );
        const data = await res.json();
        setGeoJSON(data);
      } catch (err) {
        console.error('Failed to fetch GeoJSON:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGeoJSON();
  }, []);

  // Derive polygons data
  useEffect(() => {
    if (!geoJSON) return;

    const polygons: PolygonData[] = geoJSON.features
      .filter((f) => f.properties.ISO_A2 !== 'AQ')
      .map((f) => ({
        lat: 0,
        lng: 0,
        geometry: f.geometry,
        countryCode: f.properties.ISO_A2,
        isOrigin: origin === f.properties.ISO_A2,
        isDestination: destination === f.properties.ISO_A2,
      }));

    setPolygonsData(polygons);
  }, [geoJSON, origin, destination]);

  // Derive arcs data and POV
  useEffect(() => {
    if (!origin || !destination) {
      setArcsData([]);
      setRingsData([]);
      if (origin) {
        const originData = countryCentroids[origin];
        if (originData) {
          setPointOfView({
            lat: originData.lat,
            lng: originData.lng,
            altitude: 2.5,
          });
        }
      }
      return;
    }

    const originData = countryCentroids[origin];
    const destData = countryCentroids[destination];

    if (!originData || !destData) {
      setArcsData([]);
      setRingsData([]);
      return;
    }

    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;

    const lat1 = toRad(originData.lat);
    const lng1 = toRad(originData.lng);
    const lat2 = toRad(destData.lat);
    const lng2 = toRad(destData.lng);

    const dLng = lng2 - lng1;
    const x = Math.cos(lat2) * Math.cos(dLng);
    const y = Math.cos(lat2) * Math.sin(dLng);

    const midLat = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt((Math.cos(lat1) + x) ** 2 + y ** 2),
    );
    const midLng = lng1 + Math.atan2(y, Math.cos(lat1) + x);

    const cosAngle = Math.min(
      1,
      Math.max(
        -1,
        Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng),
      ),
    );
    const centralAngle = Math.acos(cosAngle);
    const arcAltitude = Math.max(0.2, Math.min(0.8, centralAngle / Math.PI));

    const shared = {
      startLat: originData.lat,
      startLng: originData.lng,
      endLat: destData.lat,
      endLng: destData.lng,
      altitude: arcAltitude,
    };

    const arcs: ArcData[] = [
      { ...shared, isBase: true },
      { ...shared, isBase: false },
    ];

    setArcsData(arcs);

    // Pulsing rings at both endpoints
    setRingsData([
      {
        lat: originData.lat,
        lng: originData.lng,
        maxR: 3,
        propagationSpeed: 2,
        repeatPeriod: 1200,
      },
      { lat: destData.lat, lng: destData.lng, maxR: 3, propagationSpeed: 2, repeatPeriod: 1200 },
    ]);

    // Camera: tilted midpoint so the arc curvature is visible
    const bearing = Math.atan2(
      Math.sin(dLng) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng),
    );
    const perpBearing = bearing + Math.PI / 2;
    const offsetAngle = Math.min(0.26, centralAngle * 0.3);

    const midLatDeg = toDeg(midLat);
    const midLngDeg = toDeg(midLng);

    let tiltLat = midLatDeg + toDeg(offsetAngle) * Math.cos(perpBearing);
    let tiltLng = midLngDeg + (toDeg(offsetAngle) * Math.sin(perpBearing)) / Math.cos(midLat);

    // Bias toward equator: flip if tilt moves away from it
    if (Math.abs(tiltLat) > Math.abs(midLatDeg)) {
      tiltLat = midLatDeg - toDeg(offsetAngle) * Math.cos(perpBearing);
      tiltLng = midLngDeg - (toDeg(offsetAngle) * Math.sin(perpBearing)) / Math.cos(midLat);
    }

    const minAltitude = 2.5;
    const maxAltitude = 4.0;
    const altitude = minAltitude + (maxAltitude - minAltitude) * (centralAngle / Math.PI);

    setPointOfView({ lat: tiltLat, lng: tiltLng, altitude });
  }, [origin, destination]);

  return { loading, polygonsData, arcsData, ringsData, pointOfView };
}
