import { useState } from 'react';
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

export function ObjectivePicker({ value, onChange }: ObjectivePickerProps) {
  const { t } = useI18n();
  const [customText, setCustomText] = useState('');

  const otherLabel = t('setup.objective.other');
  const isOtherSelected = value === otherLabel || (value !== '' && !options().includes(value));

  function options() {
    return OBJECTIVE_KEYS.slice(0, -1).map((key) => t(key));
  }

  const handlePillClick = (label: string) => {
    if (label === otherLabel) {
      onChange(otherLabel);
      setCustomText('');
    } else {
      onChange(label === value ? '' : label);
      setCustomText('');
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    onChange(text || otherLabel);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {OBJECTIVE_KEYS.map((key) => {
          const label = t(key);
          const isSelected = label === otherLabel ? isOtherSelected : value === label;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePillClick(label)}
              className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                isSelected
                  ? 'bg-muted/50 text-foreground ring-ring/30 ring-1'
                  : 'bg-muted/30 text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {OBJECTIVE_ICONS[key]}
              {label}
            </button>
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
