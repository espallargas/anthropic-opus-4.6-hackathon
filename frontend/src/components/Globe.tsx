import { useRef, useEffect, useState, useCallback } from 'react';
import ReactGlobe from 'react-globe.gl';
import { useGlobe } from '@/hooks/useGlobe';
import { useI18n } from '@/lib/i18n';

interface GlobeProps {
  origin?: string;
  destination?: string;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeInstance = any;

export function Globe({ origin, destination, className = '' }: GlobeProps) {
  const { t } = useI18n();
  const globeRef = useRef<GlobeInstance>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 500 });

  const { loading, polygonsData, arcsData, pointOfView, style } = useGlobe(origin, destination);

  useEffect(() => {
    if (loading || !containerRef.current) return;

    // Measure on first render after loading
    const handleResize = () => {
      if (!containerRef.current) return;
      setSize({
        width: containerRef.current.clientWidth || 400,
        height: containerRef.current.clientHeight || 500,
      });
    };

    // Measure on mount after loading
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  // Smooth rotation to POV on origin change
  useEffect(() => {
    if (!globeRef.current || !pointOfView) return;

    // Use 0 duration on first set to avoid animation, 1000ms on updates
    const duration = globeRef.current._pov ? 1000 : 0;
    globeRef.current.pointOfView(
      { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude },
      duration,
    );
  }, [pointOfView]);

  // Memoized color accessors
  const polygonCapColor = useCallback(
    (feature: { properties?: { ISO_A2: string }; countryCode?: string }) => {
      const code = feature.properties?.ISO_A2 || feature.countryCode;
      if (code === origin) return 'rgba(0,200,255,0.45)';
      if (code === destination) return 'rgba(255,100,200,0.45)';
      return 'rgba(0,20,40,0.3)';
    },
    [origin, destination],
  );

  // Gradient color interpolation from origin (cyan) to destination (magenta)
  const arcDashColor = useCallback((arc: { isBase?: boolean }) => {
    if (arc.isBase) {
      // Base arc: gradient from cyan (origin) to magenta (destination)
      return (t: number) => {
        // Origin color: rgba(0,200,255,0.45) - cyan
        // Destination color: rgba(255,100,200,0.45) - magenta
        const startR = 0,
          startG = 200,
          startB = 255;
        const endR = 255,
          endG = 100,
          endB = 200;

        const r = Math.round(startR + (endR - startR) * t);
        const g = Math.round(startG + (endG - startG) * t);
        const b = Math.round(startB + (endB - startB) * t);

        return `rgba(${r},${g},${b},0.5)`;
      };
    } else {
      // Animated arc: amber/orange
      return 'rgba(255,160,40,0.8)';
    }
  }, []);

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-[#000008] ${className}`}
      >
        <div className="text-muted-foreground text-xs">{t('globe.loading')}</div>
      </div>
    );
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
        arcDashLength={(d: { isBase?: boolean }) => (d.isBase ? 0 : 0.9)}
        arcDashGap={(d: { isBase?: boolean }) => (d.isBase ? 0 : 0.3)}
        arcDashAnimateTime={(d: { isBase?: boolean }) => (d.isBase ? 0 : 3000)}
        arcAltitude={(d: { altitude?: number }) => d.altitude ?? 0.3}
        arcStroke={(d: { isBase?: boolean }) => (d.isBase ? 1.0 : 1.8)}
        arcCurveResolution={32}
        polygonCapCurvatureResolution={10}
        rendererConfig={{ antialias: true }}
        onGlobeReady={() => {
          // Force POV on globe ready
          if (globeRef.current && pointOfView) {
            globeRef.current.pointOfView(
              { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude },
              0,
            );
          }
        }}
      />
    </div>
  );
}
