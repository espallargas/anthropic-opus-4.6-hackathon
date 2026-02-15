import { useRef, useEffect, useState, useMemo } from 'react';
import ReactGlobe from 'react-globe.gl';
import {
  MeshBasicMaterial,
  AmbientLight,
  ColorManagement,
  LinearSRGBColorSpace,
  NoToneMapping,
} from 'three';
import { useGlobe } from '@/hooks/useGlobe';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

// Disable Three.js automatic sRGB conversions so colors render as specified
ColorManagement.enabled = false;

interface GlobeProps {
  origin?: string;
  destination?: string;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeInstance = any;

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

/** Resolve any CSS color expression (var, color-mix, oklch…) to a hex string for Three.js */
function resolveCssColor(cssExpr: string): string {
  const el = document.createElement('div');
  el.style.color = cssExpr;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  el.remove();

  const rgbComma = computed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbComma) {
    return rgbToHex(parseInt(rgbComma[1]), parseInt(rgbComma[2]), parseInt(rgbComma[3]));
  }

  const rgbSpace = computed.match(/rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (rgbSpace) {
    return rgbToHex(
      Math.round(parseFloat(rgbSpace[1])),
      Math.round(parseFloat(rgbSpace[2])),
      Math.round(parseFloat(rgbSpace[3])),
    );
  }

  const srgb = computed.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgb) {
    return rgbToHex(
      Math.round(parseFloat(srgb[1]) * 255),
      Math.round(parseFloat(srgb[2]) * 255),
      Math.round(parseFloat(srgb[3]) * 255),
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return rgbToHex(r, g, b);
  }

  return '#888888';
}

function cssVarToHex(varName: string): string {
  return resolveCssColor(`var(${varName})`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function Globe({ origin, destination, className = '' }: GlobeProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const globeRef = useRef<GlobeInstance>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [size, setSize] = useState({ width: 400, height: 500 });

  const { loading, polygonsData, arcsData, ringsData, pointOfView } = useGlobe(origin, destination);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const foregroundColor = useMemo(() => cssVarToHex('--foreground'), [theme]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const countryColor = useMemo(() => cssVarToHex('--muted-foreground'), [theme]);
  // Harmonious pair: both derived from --primary, one darker (origin) one lighter (destination)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const originColor = useMemo(
    () => resolveCssColor('color-mix(in oklch, var(--primary) 85%, var(--background))'),
    [theme],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const destinationColor = useMemo(
    () => resolveCssColor('color-mix(in oklch, var(--primary) 55%, white)'),
    [theme],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const globeMaterial = useMemo(
    () => new MeshBasicMaterial({ color: cssVarToHex('--card') }),
    [theme],
  );

  useEffect(() => {
    if (loading || !containerRef.current) return;

    const el = containerRef.current;
    const measure = () => {
      setSize({
        width: el.clientWidth || 400,
        height: el.clientHeight || 500,
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // Smooth rotation to POV on origin/destination change
  useEffect(() => {
    if (!globeRef.current || !pointOfView) return;

    const duration = hasInitialized.current ? 1500 : 0;
    globeRef.current.pointOfView(
      { lat: pointOfView.lat, lng: pointOfView.lng, altitude: pointOfView.altitude },
      duration,
    );
    hasInitialized.current = true;
  }, [pointOfView]);

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
      >
        <div className="text-muted-foreground text-xs">{t('globe.loading')}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <ReactGlobe
        ref={globeRef}
        width={size.width || 400}
        height={size.height || 500}
        globeMaterial={globeMaterial}
        backgroundColor="rgba(0,0,0,0)"
        polygonsData={polygonsData}
        polygonCapColor={(d: { isOrigin?: boolean; isDestination?: boolean }) => {
          if (d.isOrigin) return originColor;
          if (d.isDestination) return destinationColor;
          return countryColor;
        }}
        polygonSideColor={() => 'rgba(0,0,0,0)'}
        polygonStrokeColor={() => 'rgba(0,0,0,0)'}
        polygonAltitude={(d: { isOrigin?: boolean; isDestination?: boolean }) =>
          d.isOrigin || d.isDestination ? 0.02 : 0.005
        }
        polygonsTransitionDuration={300}
        showAtmosphere={true}
        atmosphereColor="#ffffff"
        atmosphereAltitude={0.15}
        arcsData={arcsData}
        arcColor={(d: { isBase?: boolean }) => {
          const { r, g, b } = hexToRgb(foregroundColor);
          if (d.isBase) return `rgba(${r},${g},${b},0.15)`;
          return `rgba(${r},${g},${b},0.8)`;
        }}
        arcDashLength={(d: { isBase?: boolean }) => (d.isBase ? 0 : 0.25)}
        arcDashGap={(d: { isBase?: boolean }) => (d.isBase ? 0 : 0.5)}
        arcDashAnimateTime={(d: { isBase?: boolean }) => (d.isBase ? 0 : 3000)}
        arcStroke={(d: { isBase?: boolean }) => (d.isBase ? 0.6 : 1.5)}
        arcAltitude={(d: { altitude?: number }) => d.altitude ?? 0.3}
        arcCurveResolution={32}
        ringsData={ringsData}
        ringColor={() => (t: number) => {
          const { r, g, b } = hexToRgb(foregroundColor);
          return `rgba(${r},${g},${b},${Math.max(0, 0.7 - t * 0.7).toFixed(2)})`;
        }}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringAltitude={0.015}
        onGlobeReady={() => {
          if (globeRef.current) {
            const initial = pointOfView ?? { lat: 20, lng: 0, altitude: 2.5 };
            globeRef.current.pointOfView(
              { lat: initial.lat, lng: initial.lng, altitude: initial.altitude },
              0,
            );
            hasInitialized.current = true;

            // Exact color output — no gamma/tonemap shifts
            const renderer = globeRef.current.renderer();
            if (renderer) {
              renderer.outputColorSpace = LinearSRGBColorSpace;
              renderer.toneMapping = NoToneMapping;
            }

            // Single white ambient light — uniform illumination, no yellow edge glow
            globeRef.current.lights([new AmbientLight(0xffffff, 1.0)]);
          }
        }}
      />
    </div>
  );
}
