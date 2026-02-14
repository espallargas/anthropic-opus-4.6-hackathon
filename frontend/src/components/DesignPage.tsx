import { Heart, Home, Mail, Search, Settings, Star, Trash2, Plus, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { StatusDot } from '@/components/ui/StatusDot';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ExpandableSection } from '@/components/ui/ExpandableSection';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AgentCard } from '@/components/AgentCard';
import { ThinkingCard } from '@/components/ThinkingCard';
import { ToolCallCard } from '@/components/ToolCallCard';
import { UsageBadge } from '@/components/UsageBadge';
import type { AgentExecution, ThinkingBlock, ToolCall, UsageReport } from '@/lib/chatStore';

const COLOR_SWATCHES = [
  { var: '--background', label: 'background' },
  { var: '--foreground', label: 'foreground' },
  { var: '--card', label: 'card' },
  { var: '--primary', label: 'primary' },
  { var: '--secondary', label: 'secondary' },
  { var: '--muted', label: 'muted' },
  { var: '--accent', label: 'accent' },
  { var: '--destructive', label: 'destructive' },
  { var: '--border', label: 'border' },
  { var: '--input', label: 'input' },
  { var: '--ring', label: 'ring' },
];

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'ghost',
  'link',
] as const;
const BUTTON_SIZES = ['xs', 'sm', 'default', 'lg', 'icon'] as const;

const MOCK_AGENTS: AgentExecution[] = [
  {
    agentName: 'analyze_pathways',
    agentLabel: 'Pathway Strategist',
    task: 'Analyzing immigration routes for BR to US',
    status: 'running',
    toolCalls: [
      { id: 'tc-1', name: 'search_visa_requirements', input: {}, status: 'done' },
      { id: 'tc-2', name: 'check_eligibility', input: {}, status: 'calling' },
    ],
    tokens: 'Analyzing available pathways based on nationality and destination...',
  },
  {
    agentName: 'list_required_documents',
    agentLabel: 'Documentation Specialist',
    task: 'Listing documents for work visa',
    status: 'done',
    toolCalls: [{ id: 'tc-3', name: 'list_required_documents', input: {}, status: 'done' }],
    resultSummary: 'Found 12 required documents for H-1B visa application.',
    usage: { input_tokens: 2400, output_tokens: 850 },
    durationMs: 4200,
  },
  {
    agentName: 'check_eligibility',
    agentLabel: 'Eligibility Analyst',
    task: 'Checking eligibility criteria',
    status: 'error',
    toolCalls: [],
    tokens: 'Failed to retrieve eligibility data from source.',
  },
];

const MOCK_THINKING: ThinkingBlock[] = [
  {
    id: 'think-1',
    content:
      'The user is asking about immigration pathways from Brazil to the United States. I should consider the main visa categories: H-1B for skilled workers, L-1 for intra-company transfers, EB-2/EB-3 for employment-based green cards...',
    status: 'thinking',
    type: 'high',
  },
  {
    id: 'think-2',
    content:
      'Based on the analysis, the most viable pathway appears to be the EB-2 NIW route given the applicant qualifications.',
    status: 'done',
    type: 'adaptive',
  },
];

const MOCK_TOOL_CALLS: ToolCall[] = [
  { id: 'mtc-1', name: 'search_visa_requirements', input: {}, status: 'calling' },
  { id: 'mtc-2', name: 'analyze_pathways', input: {}, status: 'done' },
];

const MOCK_USAGE: UsageReport = {
  totalInputTokens: 12500,
  totalOutputTokens: 4200,
  agentUsage: {
    analyze_pathways: { input_tokens: 5000, output_tokens: 1800 },
    list_required_documents: { input_tokens: 4000, output_tokens: 1200 },
    check_eligibility: { input_tokens: 3500, output_tokens: 1200 },
  },
};

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="space-y-4">
      <SectionHeader>{t(id)}</SectionHeader>
      {children}
    </section>
  );
}

export function DesignPage() {
  const { t } = useI18n();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-12 px-6 py-8">
        <div>
          <h1 className="text-foreground text-2xl font-bold">{t('design.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('design.subtitle')}</p>
        </div>

        {/* A. Color Palette */}
        <Section id="design.section.palette">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {COLOR_SWATCHES.map(({ var: cssVar, label }) => (
              <div key={cssVar} className="flex flex-col items-center gap-1.5">
                <div
                  className="border-border h-12 w-12 rounded-lg border shadow-sm"
                  style={{ background: `var(${cssVar})` }}
                />
                <span className="text-muted-foreground text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* B. Typography */}
        <Section id="design.section.typography">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground mb-2 text-xs font-medium">Color hierarchy</p>
              <p className="text-foreground text-sm">text-foreground — Primary text</p>
              <p className="text-foreground/80 text-sm">text-foreground/80 — Slightly dimmed</p>
              <p className="text-muted-foreground text-sm">
                text-muted-foreground — Secondary text
              </p>
              <p className="text-muted-foreground/70 text-sm">text-muted-foreground/70 — Dimmed</p>
              <p className="text-muted-foreground/50 text-sm">
                text-muted-foreground/50 — Very dimmed
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium">Line spacing</p>
              <div className="border-border max-w-md rounded-lg border p-3">
                <p className="text-foreground/80 text-sm leading-tight">
                  <span className="text-muted-foreground/50 text-xs">leading-tight (1.25):</span>
                  <br />
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua.
                </p>
              </div>
              <div className="border-border max-w-md rounded-lg border p-3">
                <p className="text-foreground/80 text-sm leading-normal">
                  <span className="text-muted-foreground/50 text-xs">leading-normal (1.5):</span>
                  <br />
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua.
                </p>
              </div>
              <div className="border-primary/20 max-w-md rounded-lg border p-3">
                <p className="text-foreground/80 text-sm leading-[1.85]">
                  <span className="text-primary/60 text-xs">leading-[1.85] (chat messages):</span>
                  <br />
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua.
                </p>
              </div>
              <div className="border-border max-w-md rounded-lg border p-3">
                <p className="text-foreground/80 text-sm leading-loose">
                  <span className="text-muted-foreground/50 text-xs">leading-loose (2.0):</span>
                  <br />
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* C. Buttons */}
        <Section id="design.section.buttons">
          <div className="space-y-3">
            {BUTTON_VARIANTS.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground w-24 text-xs">{variant}</span>
                {BUTTON_SIZES.map((size) => (
                  <Button key={`${variant}-${size}`} variant={variant} size={size}>
                    {size === 'icon' ? <Star /> : size}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </Section>

        {/* D. Form Inputs */}
        <Section id="design.section.inputs">
          <div className="max-w-sm space-y-3">
            <Input placeholder="Default input placeholder" />
            <Textarea placeholder="Textarea placeholder text..." />
            <Input placeholder="Invalid input" aria-invalid="true" />
          </div>
        </Section>

        {/* E. Cards */}
        <Section id="design.section.cards">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description with supporting text.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Card content area. This shows how text and elements render inside a card component.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
        </Section>

        {/* F. Status Indicators */}
        <Section id="design.section.status">
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">StatusDot</p>
              <div className="flex items-center gap-4">
                {(['active', 'pending', 'error', 'running'] as const).map((status) => (
                  <div key={status} className="flex items-center gap-2">
                    <StatusDot status={status} size="sm" />
                    <StatusDot status={status} size="md" />
                    <span className="text-muted-foreground text-[10px]">{status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">StatusBadge</p>
              <div className="flex flex-wrap items-center gap-2">
                {(['pending', 'running', 'done', 'error', 'searching', 'indexing'] as const).map(
                  (status) => (
                    <StatusBadge key={status} status={status}>
                      {status}
                    </StatusBadge>
                  ),
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* G. Glass Panel */}
        <Section id="design.section.glass">
          <GlassPanel className="rounded-lg p-4">
            <p className="text-foreground/80 text-sm">
              This is a GlassPanel component. On glass-enabled themes (Aurora, Nebula, Cosmos) it
              shows a backdrop-blur effect. On other themes it renders as a solid background.
            </p>
          </GlassPanel>
        </Section>

        {/* H. Expandable Section */}
        <Section id="design.section.expandable">
          <div className="space-y-2">
            <ExpandableSection title="Expanded by default" defaultOpen>
              <div className="text-muted-foreground px-2 py-2 text-xs">
                This section starts open. Click to collapse.
              </div>
            </ExpandableSection>
            <ExpandableSection
              title="With icon and badge"
              icon={<Settings className="text-muted-foreground h-3 w-3" />}
              badge={
                <StatusBadge status="running" className="ml-auto">
                  3
                </StatusBadge>
              }
              defaultOpen={false}
            >
              <div className="text-muted-foreground px-2 py-2 text-xs">
                This section has an icon and a badge. It starts collapsed.
              </div>
            </ExpandableSection>
          </div>
        </Section>

        {/* I. Icon Buttons */}
        <Section id="design.section.icon_buttons">
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-2 text-[10px]">ghost / md</p>
              <div className="flex items-center gap-2">
                <IconButton icon={Home} title="Home" />
                <IconButton icon={Search} title="Search" />
                <IconButton icon={Mail} title="Mail" />
                <IconButton icon={Heart} title="Heart" />
                <IconButton icon={Trash2} title="Trash" />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-[10px]">ghost / sm</p>
              <div className="flex items-center gap-2">
                <IconButton icon={Home} size="sm" title="Home" />
                <IconButton icon={Search} size="sm" title="Search" />
                <IconButton icon={Mail} size="sm" title="Mail" />
                <IconButton icon={Heart} size="sm" title="Heart" />
                <IconButton icon={Trash2} size="sm" title="Trash" />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-[10px]">subtle / md</p>
              <div className="flex items-center gap-2">
                <IconButton icon={Plus} variant="subtle" title="Plus" />
                <IconButton icon={Download} variant="subtle" title="Download" />
                <IconButton icon={Settings} variant="subtle" title="Settings" />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-[10px]">subtle / sm</p>
              <div className="flex items-center gap-2">
                <IconButton icon={Plus} variant="subtle" size="sm" title="Plus" />
                <IconButton icon={Download} variant="subtle" size="sm" title="Download" />
                <IconButton icon={Settings} variant="subtle" size="sm" title="Settings" />
              </div>
            </div>
          </div>
        </Section>

        {/* J. Section Header */}
        <Section id="design.section.section_header">
          <SectionHeader>Sample Section Header</SectionHeader>
        </Section>

        {/* K. Agent Cards */}
        <Section id="design.section.agents">
          <div className="space-y-2">
            {MOCK_AGENTS.map((agent, i) => (
              <AgentCard key={i} agent={agent} />
            ))}
          </div>
        </Section>

        {/* L. Thinking Cards */}
        <Section id="design.section.thinking">
          <div className="space-y-2">
            {MOCK_THINKING.map((thinking) => (
              <ThinkingCard key={thinking.id} thinking={thinking} />
            ))}
          </div>
        </Section>

        {/* M. Tool Call Cards */}
        <Section id="design.section.tools">
          <div className="space-y-2">
            {MOCK_TOOL_CALLS.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        </Section>

        {/* N. Usage Badge */}
        <Section id="design.section.usage">
          <UsageBadge report={MOCK_USAGE} />
        </Section>

        {/* O. Animations */}
        <Section id="design.section.animations">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { cls: 'animate-agent-active border-blue-400/30', label: 'agent-active' },
              { cls: 'animate-agent-complete border-green-400/15', label: 'agent-complete' },
              { cls: 'animate-thinking-pulse border-purple-400/30', label: 'thinking-pulse' },
              { cls: 'animate-agent-indexing border-purple-400/30', label: 'agent-indexing' },
            ].map(({ cls, label }) => (
              <div
                key={label}
                className={`flex h-20 items-center justify-center rounded-lg border text-xs ${cls}`}
              >
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  );
}
