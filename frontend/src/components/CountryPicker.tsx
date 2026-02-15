import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { countryCentroids, countryCodeToFlag, getCountryNameLocalized } from '@/lib/countries';
import { useI18n } from '@/lib/i18n';

interface CountryPickerProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  exclude?: string[];
}

export function CountryPicker({
  value,
  onChange,
  multiple = false,
  exclude = [],
}: CountryPickerProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    let list = countries;
    if (exclude.length > 0) {
      const excluded = new Set(exclude);
      list = list.filter((c) => !excluded.has(c.code));
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, countries, exclude]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered.length]);

  const selectedCodes = multiple ? (value as string[]) : value ? [value as string] : [];

  const handleSelect = useCallback(
    (code: string) => {
      setSearch('');
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
      inputRef.current?.focus();
    },
    [multiple, value, onChange],
  );

  const removeTag = (code: string) => {
    if (!multiple) return;
    onChange((value as string[]).filter((c) => c !== code));
  };

  const scrollHighlightedIntoView = useCallback((index: number) => {
    if (!listRef.current || index < 0) return;
    const items = listRef.current.querySelectorAll('[data-country-item]');
    items[index]?.scrollIntoView({ block: 'nearest' });
  }, []);

  const GRID_COLS = 3;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = filtered.length;
      if (len === 0) return;

      const navigate = (next: number) => {
        e.preventDefault();
        setHighlightIndex(next);
        scrollHighlightedIntoView(next);
      };

      // When nothing is highlighted yet, any arrow enters the grid at index 0
      if (highlightIndex < 0) {
        if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
          navigate(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowRight': {
          const next = highlightIndex < len - 1 ? highlightIndex + 1 : 0;
          navigate(next);
          break;
        }
        case 'ArrowLeft': {
          const prev = highlightIndex > 0 ? highlightIndex - 1 : len - 1;
          navigate(prev);
          break;
        }
        case 'ArrowDown': {
          const next = highlightIndex + GRID_COLS < len ? highlightIndex + GRID_COLS : highlightIndex;
          navigate(next);
          break;
        }
        case 'ArrowUp': {
          const prev = highlightIndex - GRID_COLS >= 0 ? highlightIndex - GRID_COLS : highlightIndex;
          navigate(prev);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < len) {
            handleSelect(filtered[highlightIndex].code);
          }
          break;
        }
      }
    },
    [filtered, highlightIndex, handleSelect, scrollHighlightedIntoView],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Selected tags for multi-select */}
      {multiple && selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCodes.map((code) => (
            <span
              key={code}
              className="bg-muted/50 text-foreground flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            >
              {countryCodeToFlag(code)} {getCountryNameLocalized(code, t)}
              <button
                type="button"
                onClick={() => removeTag(code)}
                className="text-muted-foreground hover:text-foreground ms-0.5 cursor-pointer"
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
        onKeyDown={handleKeyDown}
        placeholder={t('setup.search.placeholder')}
        className="border-border bg-muted/30 text-foreground placeholder-muted-foreground/70 focus:border-input w-full rounded-lg border px-4 py-2.5 text-sm transition-colors outline-none"
      />
      <div
        ref={listRef}
        className="grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto p-1"
      >
        {filtered.map((country, i) => {
          const isSelected = selectedCodes.includes(country.code);
          const isHighlighted = i === highlightIndex;
          return (
            <button
              key={country.code}
              type="button"
              data-country-item
              onClick={() => handleSelect(country.code)}
              className={`relative flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-start text-sm transition-all ${
                isSelected
                  ? 'bg-muted/50 ring-ring/30 scale-[1.02] ring-1'
                  : isHighlighted
                    ? 'bg-muted/40 ring-ring/20 ring-1'
                    : 'bg-muted/30 hover:bg-accent'
              }`}
            >
              <span className="shrink-0 text-base">{countryCodeToFlag(country.code)}</span>
              <span className="text-foreground/90 truncate">{country.name}</span>
              {multiple && isSelected && (
                <span className="bg-primary text-primary-foreground absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
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
