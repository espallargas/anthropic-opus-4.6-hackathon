import { useState } from 'react';
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

  const allOptions = OBJECTIVE_KEYS.map((key) => t(key));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {allOptions.map((label) => {
          const isSelected = label === otherLabel ? isOtherSelected : value === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handlePillClick(label)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm transition-all ${
                isSelected
                  ? 'bg-white/15 text-white ring-1 ring-white/30'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
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
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 transition-colors outline-none focus:border-white/25 focus:bg-white/8"
        />
      )}
    </div>
  );
}
