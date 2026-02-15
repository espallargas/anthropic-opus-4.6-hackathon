import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { UsageReport } from '@/lib/chatStore';

interface UsageBadgeProps {
  report: UsageReport;
}

export function UsageBadge({ report }: UsageBadgeProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  // API input_tokens excludes cached tokens — add them for the real total
  const totalInput = report.totalInputTokens + report.cacheCreationTokens + report.cacheReadTokens;
  const total = totalInput + report.totalOutputTokens;

  if (total === 0) return null;

  const agentEntries = Object.entries(report.agentUsage);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground/40 hover:text-muted-foreground/70 text-[10px] transition-colors"
      >
        {t('usage.label')}: {total.toLocaleString()}
      </button>

      {expanded && (
        <div className="mt-1 space-y-0.5 ps-2">
          <div className="text-muted-foreground/40 text-[10px]">
            {t('usage.input')}: {totalInput.toLocaleString()}
            {report.cacheReadTokens > 0 && (
              <span className="ms-1">
                ({report.cacheReadTokens.toLocaleString()} {t('usage.cached')})
              </span>
            )}
            {report.cacheReadTokens === 0 && report.cacheCreationTokens > 0 && (
              <span className="ms-1">({t('usage.cache_miss')})</span>
            )}
          </div>
          <div className="text-muted-foreground/40 text-[10px]">
            {t('usage.output')}: {report.totalOutputTokens.toLocaleString()}
          </div>
          {agentEntries.map(([name, usage]) => {
            const label = t(`agent.${name}`) !== `agent.${name}` ? t(`agent.${name}`) : name;
            return (
              <div
                key={name}
                className="text-muted-foreground/40 flex items-center gap-2 text-[10px]"
              >
                <span className="truncate">{label}</span>
                <span>{(usage.input_tokens + usage.output_tokens).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
