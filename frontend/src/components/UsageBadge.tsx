import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { UsageReport } from '@/lib/chatStore';

interface UsageBadgeProps {
  report: UsageReport;
}

export function UsageBadge({ report }: UsageBadgeProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const total = report.totalInputTokens + report.totalOutputTokens;

  if (total === 0) return null;

  const agentEntries = Object.entries(report.agentUsage);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-white/20 transition-colors hover:text-white/40"
      >
        {t('usage.label')}: {total.toLocaleString()}
      </button>

      {expanded && agentEntries.length > 0 && (
        <div className="mt-1 space-y-0.5 pl-2">
          {agentEntries.map(([name, usage]) => {
            const label = t(`agent.${name}`) !== `agent.${name}` ? t(`agent.${name}`) : name;
            return (
              <div key={name} className="flex items-center gap-2 text-[10px] text-white/20">
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
