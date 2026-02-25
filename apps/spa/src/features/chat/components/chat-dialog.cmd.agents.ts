import type { TDialogView } from "./chat-dialog"

type TAgentDialogArgs = {
  agents: Array<{
    name: string
    model?: { providerID?: string; modelID?: string }
    mode?: string
    hidden?: boolean
  }>
  selectedAgentName: string | null
  onSelectAgent: (agentName: string) => void
}

function isSelectableAgent(agent: TAgentDialogArgs["agents"][number]): boolean {
  const hidden = (agent as { hidden?: boolean }).hidden
  const mode = (agent as { mode?: string }).mode
  return !hidden && mode !== "subagent"
}

function getAgentName(agent: TAgentDialogArgs["agents"][number]): string {
  return (agent as { name?: string }).name ?? ""
}

function getAgentDetail(agent: TAgentDialogArgs["agents"][number]): string {
  const model = agent.model
  if (!model) return ""
  return model.providerID ?? model.modelID ?? ""
}

export function createAgentsDialogView(args: TAgentDialogArgs): TDialogView {
  const selectableAgents = args.agents.filter(isSelectableAgent)

  const items = selectableAgents.map((agent) => {
    const name = getAgentName(agent)
    const isSelected = name === args.selectedAgentName

    return {
      id: name,
      label: name,
      detail: getAgentDetail(agent),
      indicator: (isSelected ? "check" : null) as "check" | null,
      onAction: () => args.onSelectAgent(name),
    }
  })

  return {
    id: "agents-menu",
    title: "Select Agent",
    searchable: true,
    items,
  }
}

export default function createAgentsDialogViewFactory(
  agents: TAgentDialogArgs["agents"],
  selectedAgentName: TAgentDialogArgs["selectedAgentName"],
  onSelectAgent: TAgentDialogArgs["onSelectAgent"],
): () => TDialogView {
  return () => createAgentsDialogView({ agents, selectedAgentName, onSelectAgent })
}
