import { countryCodeToFlag, getCountryNameLocalized } from '@/lib/countries';
import { OBJECTIVE_ICON_MAP } from '@/lib/chatUtils';
import { MapPin, Flag, Target, MoreHorizontal } from 'lucide-react';

interface SelectionSummaryProps {
  nationalities: string[];
  origin: string;
  destination: string;
  objective: string;
  t: (key: string) => string;
  className?: string;
}

export function SelectionSummary({
  nationalities,
  origin,
  destination,
  objective,
  t,
  className = '',
}: SelectionSummaryProps) {
  const hasAny = nationalities.length > 0 || origin || destination || objective;
  if (!hasAny) return null;

  const objectives = objective.split(', ').filter((k) => k && k !== 'setup.objective.other');

  return (
    <div
      className={`border-border/30 bg-background/60 flex flex-col gap-3 rounded-xl border p-4 text-sm backdrop-blur-md ${className}`}
    >
      {/* Nationalities */}
      {nationalities.length > 0 && (
        <div className="flex items-start gap-2.5">
          <Flag className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="text-muted-foreground/60 block text-[11px] font-medium">
              {t('greeting.nationalities')}
            </span>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {nationalities.map((code, i) => (
                <span key={code} className="text-foreground/80 text-xs">
                  {countryCodeToFlag(code)} {getCountryNameLocalized(code, t)}
                  {i < nationalities.length - 1 && ','}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Origin */}
      {origin && (
        <div className="flex items-start gap-2.5">
          <MapPin className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="text-muted-foreground/60 block text-[11px] font-medium">
              {t('greeting.origin')}
            </span>
            <span className="text-foreground/80 mt-0.5 block text-xs">
              {countryCodeToFlag(origin)} {getCountryNameLocalized(origin, t)}
            </span>
          </div>
        </div>
      )}

      {/* Destination */}
      {destination && (
        <div className="flex items-start gap-2.5">
          <MapPin className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="text-muted-foreground/60 block text-[11px] font-medium">
              {t('greeting.destination')}
            </span>
            <span className="text-foreground/80 mt-0.5 block text-xs">
              {countryCodeToFlag(destination)} {getCountryNameLocalized(destination, t)}
            </span>
          </div>
        </div>
      )}

      {/* Objectives */}
      {objectives.length > 0 && (
        <div className="flex items-start gap-2.5">
          <Target className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="text-muted-foreground/60 block text-[11px] font-medium">
              {t('greeting.objective')}
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {objectives.map((key) => {
                const Icon = OBJECTIVE_ICON_MAP[key] ?? MoreHorizontal;
                return (
                  <span
                    key={key}
                    className="border-border/40 bg-muted/40 text-foreground/70 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                  >
                    <Icon className="h-3 w-3" />
                    {t(key)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
