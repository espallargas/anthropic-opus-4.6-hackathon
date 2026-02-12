import { useRef, useEffect, useState, useCallback } from 'react'
import ReactGlobe from 'react-globe.gl'
import { useGlobe } from '@/hooks/useGlobe'

interface GlobeProps {
  origin?: string
  destination?: string
  className?: string
}

export function Globe({ origin, destination, className = '' }: GlobeProps) {
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 400, height: 500 })

  const { loading, polygonsData, arcsData, pointOfView, style } = useGlobe(origin, destination)

  // Measure container size responsively
  const updateSize = useCallback(() => {
    if (!containerRef.current) return
    setSize({
      width: containerRef.current.clientWidth || 400,
      height: containerRef.current.clientHeight || 500,
    })
  }, [])

  useEffect(() => {
    if (loading) return

    // Measure on first render after loading
    updateSize()
    const handleResize = () => {
      updateSize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [loading, updateSize])

  // Smooth rotation to POV on origin change
  useEffect(() => {
    if (!globeRef.current || !pointOfView) return

    // Use 0 duration on first set to avoid animation, 1000ms on updates
    const duration = globeRef.current._pov ? 1000 : 0
    globeRef.current.pointOfView(
      { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude },
      duration,
    )
  }, [pointOfView])

  // Memoized color accessors
  const polygonCapColor = useCallback(
    (feature: { properties?: { ISO_A2: string }; countryCode?: string }) => {
      const code = feature.properties?.ISO_A2 || feature.countryCode
      if (code === origin) return 'rgba(0,200,255,0.45)'
      if (code === destination) return 'rgba(255,100,200,0.45)'
      return 'rgba(0,20,40,0.3)'
    },
    [origin, destination],
  )

  const arcDashColor = useCallback((arc: { isBase?: boolean }) => {
    return arc.isBase ? 'rgba(0,229,255,0.3)' : 'rgba(255,160,40,0.8)'
  }, [])

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-[#000008] ${className}`}
      >
        <div className="text-muted-foreground text-xs">Loading globe...</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <style>
        {`
          [data-globe-container] > div {
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
          }
        `}
      </style>
      <ReactGlobe
        ref={globeRef}
        width={size.width || 400}
        height={size.height || 500}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor={style.atmosphereColor}
        atmosphereAltitude={style.atmosphereAltitude}
        polygonsData={polygonsData}
        polygonCapColor={polygonCapColor}
        polygonStrokeColor={() => style.countryStrokeColor}
        polygonAltitude={(d: { isOrigin?: boolean; isDestination?: boolean }) =>
          d.isOrigin || d.isDestination ? 0.02 : 0.005
        }
        polygonsTransitionDuration={300}
        arcsData={arcsData}
        arcColor={arcDashColor}
        arcDashLength={0.9}
        arcDashGap={0.3}
        arcDashAnimateTime={3000}
        arcAltitude={(d: { altitude?: number }) => d.altitude ?? 0.3}
        arcStroke={1.8}
        arcCurveResolution={32}
        polygonCapCurvatureResolution={10}
        rendererConfig={{ antialias: true }}
        onGlobeReady={() => {
          if (globeRef.current?.renderer) {
            globeRef.current.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
          }
        }}
      />
    </div>
  )
}
