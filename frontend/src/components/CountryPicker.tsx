import { useState, useMemo, useRef, useEffect } from 'react';
import { countryCentroids, countryCodeToFlag, getCountryNameLocalized } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';

interface CountryPickerProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

export function CountryPicker({ value, onChange, multiple = false }: CountryPickerProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const countries = useMemo(() => {
    return Object.entries(countryCentroids)
      .map(([code]) => ({
        code,
        name: getCountryNameLocalized(code, t),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [t]);

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, countries]);

  const selectedCodes = multiple ? (value as string[]) : value ? [value as string] : [];

  const handleSelect = (code: string) => {
    if (multiple) {
      const current = [...(value as string[])];
      if (current.includes(code)) {
        onChange(current.filter((c) => c !== code));
      } else {
        onChange([...current, code]);
      }
    } else {
      onChange(code === value ? '' : code);
    }
  };

  const removeTag = (code: string) => {
    if (!multiple) return;
    onChange((value as string[]).filter((c) => c !== code));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Selected tags for multi-select */}
      {multiple && selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCodes.map((code) => (
            <span
              key={code}
              className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white"
            >
              {countryCodeToFlag(code)} {getCountryNameLocalized(code, t)}
              <button
                type="button"
                onClick={() => removeTag(code)}
                className="ml-0.5 cursor-pointer text-white/50 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('setup.search.placeholder')}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 transition-colors outline-none focus:border-white/25"
      />
      <div className="scroll-fade grid max-h-[280px] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
        {filtered.map((country) => {
          const isSelected = selectedCodes.includes(country.code);
          return (
            <button
              key={country.code}
              type="button"
              onClick={() => handleSelect(country.code)}
              className={`relative flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm transition-all ${
                isSelected
                  ? 'scale-[1.02] bg-white/15 ring-1 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="shrink-0 text-base">{countryCodeToFlag(country.code)}</span>
              <span className="truncate text-white/90">{country.name}</span>
              {multiple && isSelected && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] text-black">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
