import { useState, useMemo } from 'react';
import {
  Plane,
  GraduationCap,
  Briefcase,
  Users,
  Shield,
  TrendingUp,
  Home,
  MoreHorizontal,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Pill } from '@/components/ui/Pill';

interface ObjectivePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const OBJECTIVE_KEYS = [
  'setup.objective.temporary_visit',
  'setup.objective.education',
  'setup.objective.work',
  'setup.objective.family_reunion',
  'setup.objective.seek_protection',
  'setup.objective.investments',
  'setup.objective.permanent_residence',
  'setup.objective.other',
] as const;

const OBJECTIVE_ICONS: Record<string, React.ReactNode> = {
  'setup.objective.temporary_visit': <Plane className="h-4 w-4" />,
  'setup.objective.education': <GraduationCap className="h-4 w-4" />,
  'setup.objective.work': <Briefcase className="h-4 w-4" />,
  'setup.objective.family_reunion': <Users className="h-4 w-4" />,
  'setup.objective.seek_protection': <Shield className="h-4 w-4" />,
  'setup.objective.investments': <TrendingUp className="h-4 w-4" />,
  'setup.objective.permanent_residence': <Home className="h-4 w-4" />,
  'setup.objective.other': <MoreHorizontal className="h-4 w-4" />,
};

const PREDEFINED_KEYS = new Set(OBJECTIVE_KEYS.slice(0, -1));

export function ObjectivePicker({ value, onChange }: ObjectivePickerProps) {
  const { t } = useI18n();
  const [customText, setCustomText] = useState('');

  const selected = useMemo(() => {
    if (!value) return new Set<string>();
    return new Set(value.split(', ').filter(Boolean));
  }, [value]);

  const isOtherSelected =
    selected.has('setup.objective.other') ||
    [...selected].some(
      (v) => v !== '' && !PREDEFINED_KEYS.has(v as (typeof OBJECTIVE_KEYS)[number]),
    );

  const handlePillClick = (key: string) => {
    const next = new Set(selected);
    if (key === 'setup.objective.other') {
      if (isOtherSelected) {
        next.delete('setup.objective.other');
        // Remove custom text entry too
        for (const v of next) {
          if (!PREDEFINED_KEYS.has(v as (typeof OBJECTIVE_KEYS)[number])) {
            next.delete(v);
          }
        }
      } else {
        next.add('setup.objective.other');
      }
      setCustomText('');
    } else {
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
    }
    onChange([...next].join(', '));
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    const next = new Set(selected);
    // Remove old "other" placeholder and any prior custom text
    next.delete('setup.objective.other');
    for (const v of next) {
      if (!PREDEFINED_KEYS.has(v as (typeof OBJECTIVE_KEYS)[number])) {
        next.delete(v);
      }
    }
    next.add(text || 'setup.objective.other');
    onChange([...next].join(', '));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {OBJECTIVE_KEYS.map((key) => {
          const isSelected = key === 'setup.objective.other' ? isOtherSelected : selected.has(key);
          return (
            <Pill
              key={key}
              icon={OBJECTIVE_ICONS[key]}
              selected={isSelected}
              onClick={() => handlePillClick(key)}
            >
              {t(key)}
            </Pill>
          );
        })}
      </div>
      {isOtherSelected && (
        <input
          type="text"
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder={t('setup.objective.other.placeholder')}
          autoFocus
          className="border-border bg-muted/30 text-foreground placeholder-muted-foreground/70 focus:border-input focus:bg-muted/40 w-full rounded-lg border px-4 py-2.5 text-sm transition-colors outline-none"
        />
      )}
    </div>
  );
}
