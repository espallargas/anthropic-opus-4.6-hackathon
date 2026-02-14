import { AgentCard } from '@/components/AgentCard';
import type { AgentExecution } from '@/lib/chatStore';

interface AgentActivityPanelProps {
  agents: AgentExecution[];
}

export function AgentActivityPanel({ agents }: AgentActivityPanelProps) {
  return (
    <div className="my-2 space-y-2 border-l-2 border-white/10 pl-3">
      {agents.map((agent) => (
        <AgentCard key={`${agent.agentName}-${agent.task}`} agent={agent} />
      ))}
    </div>
  );
}
