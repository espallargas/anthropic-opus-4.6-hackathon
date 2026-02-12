import { useEffect, useState } from 'react'
import { countryCentroids } from '@/lib/countries'

interface GeoFeature {
  type: 'Feature'
  properties: {
    ISO_A2: string
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

interface GeoJSON {
  features: GeoFeature[]
}

export interface PolygonData {
  lat: number
  lng: number
  geometry: GeoFeature['geometry']
  countryCode: string
  isOrigin: boolean
  isDestination: boolean
}

export interface ArcData {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  strokeColor: string
  altitude: number
  isBase: boolean
}

export interface GlobeStyle {
  backgroundColor: string
  atmosphereColor: string
  atmosphereAltitude: number
  countryStrokeColor: string
}

const style: GlobeStyle = {
  backgroundColor: 'rgba(0,0,0,0)',
  atmosphereColor: '#0ef',
  atmosphereAltitude: 0.18,
  countryStrokeColor: 'rgba(220,230,240,0.6)',
}

export function useGlobe(origin?: string, destination?: string) {
  const [loading, setLoading] = useState(true)
  const [geoJSON, setGeoJSON] = useState<GeoJSON | null>(null)
  const [polygonsData, setPolygonsData] = useState<PolygonData[]>([])
  const [arcsData, setArcsData] = useState<ArcData[]>([])
  const [pointOfView, setPointOfView] = useState<{
    lat: number
    lng: number
    altitude: number
  } | null>(null)

  // Fetch GeoJSON on mount
  useEffect(() => {
    const fetchGeoJSON = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson',
        )
        const data = await res.json()
        setGeoJSON(data)
      } catch (err) {
        console.error('Failed to fetch GeoJSON:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchGeoJSON()
  }, [])

  // Derive polygons data
  useEffect(() => {
    if (!geoJSON) return

    const polygons: PolygonData[] = geoJSON.features
      .filter((f) => f.properties.ISO_A2 !== 'AQ')
      .map((f) => ({
        lat: 0,
        lng: 0,
        geometry: f.geometry,
        countryCode: f.properties.ISO_A2,
        isOrigin: origin === f.properties.ISO_A2,
        isDestination: destination === f.properties.ISO_A2,
      }))

    setPolygonsData(polygons)
  }, [geoJSON, origin, destination])

  // Derive arcs data and POV
  useEffect(() => {
    if (!origin || !destination) {
      setArcsData([])
      if (origin) {
        const originData = countryCentroids[origin]
        if (originData) {
          setPointOfView({
            lat: originData.lat,
            lng: originData.lng,
            altitude: 2.5,
          })
        }
      }
      return
    }

    const originData = countryCentroids[origin]
    const destData = countryCentroids[destination]

    if (!originData || !destData) {
      setArcsData([])
      return
    }

    // Calculate great circle midpoint
    const toRad = (d: number) => (d * Math.PI) / 180
    const toDeg = (r: number) => (r * 180) / Math.PI

    const lat1 = toRad(originData.lat)
    const lng1 = toRad(originData.lng)
    const lat2 = toRad(destData.lat)
    const lng2 = toRad(destData.lng)

    const dLng = lng2 - lng1
    const x = Math.cos(lat2) * Math.cos(dLng)
    const y = Math.cos(lat2) * Math.sin(dLng)

    const midLat = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt((Math.cos(lat1) + x) ** 2 + y ** 2),
    )
    const midLng = lng1 + Math.atan2(y, Math.cos(lat1) + x)

    // Calculate angular distance for dynamic altitude
    const centralAngle = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng),
    )
    const arcAltitude = Math.max(0.2, Math.min(0.8, centralAngle / Math.PI))

    // Two arcs: base static + pulse animation
    const arcs: ArcData[] = [
      {
        startLat: originData.lat,
        startLng: originData.lng,
        endLat: destData.lat,
        endLng: destData.lng,
        strokeColor: 'rgba(0,229,255,0.3)',
        altitude: arcAltitude,
        isBase: true,
      },
      {
        startLat: originData.lat,
        startLng: originData.lng,
        endLat: destData.lat,
        endLng: destData.lng,
        strokeColor: 'rgba(255,160,40,0.8)',
        altitude: arcAltitude,
        isBase: false,
      },
    ]

    setArcsData(arcs)

    // POV at midpoint with zoom based on distance
    const minAltitude = 2.2
    const maxAltitude = 3.5
    const altitude = minAltitude + (maxAltitude - minAltitude) * (centralAngle / Math.PI)

    setPointOfView({
      lat: toDeg(midLat),
      lng: toDeg(midLng),
      altitude,
    })
  }, [origin, destination])

  return {
    loading,
    polygonsData,
    arcsData,
    pointOfView,
    style,
  }
}
