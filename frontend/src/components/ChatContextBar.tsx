import {
  Plane,
  GraduationCap,
  Briefcase,
  Users,
  Shield,
  TrendingUp,
  Home,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';
import { countryCodeToFlag, getCountryNameLocalized } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';
import type { SystemVars } from '@/lib/chatStore';

const OBJECTIVE_ICON_MAP: Record<string, React.ReactNode> = {
  'setup.objective.temporary_visit': <Plane className="h-3.5 w-3.5" />,
  'setup.objective.education': <GraduationCap className="h-3.5 w-3.5" />,
  'setup.objective.work': <Briefcase className="h-3.5 w-3.5" />,
  'setup.objective.family_reunion': <Users className="h-3.5 w-3.5" />,
  'setup.objective.seek_protection': <Shield className="h-3.5 w-3.5" />,
  'setup.objective.investments': <TrendingUp className="h-3.5 w-3.5" />,
  'setup.objective.permanent_residence': <Home className="h-3.5 w-3.5" />,
  'setup.objective.other': <MoreHorizontal className="h-3.5 w-3.5" />,
};

function getObjectiveIcon(objective: string): React.ReactNode {
  // Direct key match (new format) or fallback for legacy translated values
  return OBJECTIVE_ICON_MAP[objective] ?? OBJECTIVE_ICON_MAP['setup.objective.other'];
}

function resolveObjective(objective: string, t: (key: string) => string): string {
  if (objective.startsWith('setup.objective.')) return t(objective);
  return objective;
}

interface ChatContextBarProps {
  systemVars: SystemVars;
}

export function ChatContextBar({ systemVars }: ChatContextBarProps) {
  const { t } = useI18n();

  const originName = getCountryNameLocalized(systemVars.origin_country, t);
  const destName = getCountryNameLocalized(systemVars.destination_country, t);
  const originFlag = countryCodeToFlag(systemVars.origin_country);
  const destFlag = countryCodeToFlag(systemVars.destination_country);
  const objectiveIcon = getObjectiveIcon(systemVars.objective);
  const nationalities = systemVars.nationality
    ? systemVars.nationality.split(', ').filter(Boolean)
    : [];

  return (
    <div className="border-border/50 text-muted-foreground flex items-center justify-center gap-3 border-b px-4 py-2 text-xs">
      {/* Nationalities */}
      {nationalities.length > 0 && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground/50">{t('chat.context.nationalities')}</span>
            {nationalities.map((code) => (
              <span
                key={code}
                className="text-sm brightness-125"
                title={getCountryNameLocalized(code, t)}
              >
                {countryCodeToFlag(code)}
              </span>
            ))}
          </span>
          <span className="bg-border h-3 w-px" />
        </>
      )}

      {/* Objective */}
      <span className="flex items-center gap-1.5">
        {objectiveIcon}
        {resolveObjective(systemVars.objective, t)}
      </span>

      <span className="bg-border h-3 w-px" />

      {/* Origin → Destination */}
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground/50">{t('chat.context.from')}</span>
        <span className="text-sm">{originFlag}</span>
        <span>{originName}</span>
      </span>

      <ArrowRight className="text-muted-foreground/50 h-3 w-3" />

      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground/50">{t('chat.context.to')}</span>
        <span className="text-sm">{destFlag}</span>
        <span>{destName}</span>
      </span>
    </div>
  );
}
