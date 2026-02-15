import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentActivityPanel } from '@/components/AgentActivityPanel';
import { UsageBadge } from '@/components/UsageBadge';
import { ThinkingCard } from '@/components/ThinkingCard';
import type { AgentExecution, ThinkingBlock, UsageReport } from '@/lib/chatStore';

const MOCK_AGENTS: Record<string, AgentExecution[]> = {
  running: [
    {
      agentName: 'regulatory_researcher',
      agentLabel: 'Regulatory Researcher',
      task: 'Search visa requirements for Brazil → Canada',
      status: 'running',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'search_visa_requirements',
          input: { origin: 'Brazil', destination: 'Canada' },
          status: 'done',
          result: { found: true },
        },
        {
          id: 'tc-2',
          name: 'check_processing_times',
          input: { visa_type: 'work_permit' },
          status: 'calling',
        },
      ],
      tokens:
        'Analyzing visa requirements for Brazilian nationals seeking work permits in Canada...',
    },
  ],
  done: [
    {
      agentName: 'regulatory_researcher',
      agentLabel: 'Regulatory Researcher',
      task: 'Search visa requirements for Brazil → Canada',
      status: 'done',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'search_visa_requirements',
          input: { origin: 'Brazil', destination: 'Canada' },
          status: 'done',
          result: { found: true },
        },
      ],
      resultSummary: 'Found 3 eligible visa pathways for Brazilian nationals.',
      usage: { input_tokens: 1250, output_tokens: 430 },
      durationMs: 4200,
    },
  ],
  multi: [
    {
      agentName: 'discovery_coordinator',
      agentLabel: 'Discovery Coordinator',
      task: 'Coordinate initial research',
      status: 'done',
      toolCalls: [],
      resultSummary: 'Delegated to 2 specialist agents.',
      usage: { input_tokens: 800, output_tokens: 200 },
      durationMs: 1500,
    },
    {
      agentName: 'regulatory_researcher',
      agentLabel: 'Regulatory Researcher',
      task: 'Search visa requirements for Brazil → Canada',
      status: 'done',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'search_visa_requirements',
          input: { origin: 'Brazil', destination: 'Canada' },
          status: 'done',
          result: { found: true },
        },
      ],
      resultSummary: 'Found 3 eligible pathways.',
      usage: { input_tokens: 1250, output_tokens: 430 },
      durationMs: 4200,
    },
    {
      agentName: 'eligibility_analyst',
      agentLabel: 'Eligibility Analyst',
      task: 'Assess eligibility for work permit',
      status: 'running',
      toolCalls: [
        {
          id: 'tc-3',
          name: 'check_processing_times',
          input: { visa_type: 'work_permit' },
          status: 'calling',
        },
      ],
    },
  ],
  error: [
    {
      agentName: 'pathway_strategist',
      agentLabel: 'Pathway Strategist',
      task: 'Evaluate immigration pathways',
      status: 'error',
      toolCalls: [
        {
          id: 'tc-err',
          name: 'search_visa_requirements',
          input: { origin: 'Brazil', destination: 'Narnia' },
          status: 'error',
        },
      ],
    },
  ],
};

const MOCK_USAGE: UsageReport = {
  totalInputTokens: 3300,
  totalOutputTokens: 1060,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  agentUsage: {
    discovery_coordinator: { input_tokens: 800, output_tokens: 200 },
    regulatory_researcher: { input_tokens: 1250, output_tokens: 430 },
    eligibility_analyst: { input_tokens: 1250, output_tokens: 430 },
  },
};

const MOCK_THINKING: Record<string, ThinkingBlock> = {
  active: {
    content:
      'The user is asking about work visa requirements for Brazil to Canada. I need to consider the different pathways available: Express Entry, Provincial Nominee Programs, and LMIA-based work permits. Let me analyze the eligibility criteria for each...',
    status: 'thinking',
  },
  done: {
    content:
      'I analyzed the visa requirements for Brazilian nationals seeking work permits in Canada. The main pathways are: 1) Express Entry (Federal Skilled Worker) requiring CRS score >= 67, 2) Provincial Nominee Program with job offer, 3) LMIA-based work permit. Given the user profile, Express Entry seems most viable. I should present the options clearly with processing times.',
    status: 'done',
  },
};

type Scenario = keyof typeof MOCK_AGENTS;
type ThinkingScenario = keyof typeof MOCK_THINKING;

export function AgentMockControls() {
  const [active, setActive] = useState<Scenario | null>(null);
  const [activeThinking, setActiveThinking] = useState<ThinkingScenario | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed end-4 bottom-4 z-50">
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setPanelOpen(!panelOpen)}
        className="h-8 w-8 border-white/10 bg-white/5 backdrop-blur-sm"
        title="Agent Mock Controls"
      >
        <Bug className="h-4 w-4" />
      </Button>

      {panelOpen && (
        <div className="absolute end-0 bottom-10 w-80 space-y-3 rounded-lg border border-white/10 bg-black/80 p-3 backdrop-blur-md">
          <p className="text-[10px] font-medium tracking-wider text-white/40 uppercase">
            Agent Mock Controls
          </p>

          <div className="flex flex-wrap gap-1">
            {(Object.keys(MOCK_AGENTS) as Scenario[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={active === key ? 'default' : 'outline'}
                onClick={() => setActive(active === key ? null : key)}
                className="h-6 text-[10px]"
              >
                {key}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={showUsage ? 'default' : 'outline'}
              onClick={() => setShowUsage(!showUsage)}
              className="h-6 text-[10px]"
            >
              usage
            </Button>
          </div>

          <p className="text-[10px] font-medium tracking-wider text-white/40 uppercase">Thinking</p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(MOCK_THINKING) as ThinkingScenario[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={activeThinking === key ? 'default' : 'outline'}
                onClick={() => setActiveThinking(activeThinking === key ? null : key)}
                className="h-6 text-[10px]"
              >
                {key}
              </Button>
            ))}
          </div>

          {activeThinking && (
            <div className="rounded border border-white/5 bg-white/5 p-2">
              <ThinkingCard thinking={MOCK_THINKING[activeThinking]} />
            </div>
          )}

          {active && (
            <div className="rounded border border-white/5 bg-white/5 p-2">
              <AgentActivityPanel agents={MOCK_AGENTS[active]} />
            </div>
          )}

          {showUsage && (
            <div className="rounded border border-white/5 bg-white/5 p-2">
              <UsageBadge report={MOCK_USAGE} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
