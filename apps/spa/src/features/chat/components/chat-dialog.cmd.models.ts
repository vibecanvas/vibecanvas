import type { TDialogItem, TDialogView } from "./chat-dialog"

type TRecentModel = {
  providerId: string
  modelId: string
  usedAt: number
}

type TModelsDialogArgs = {
  providers: Array<{
    id: string
    name: string
    models: Record<
      string,
      {
        id: string
        name: string
        status: string
      }
    >
  }>
  recentModels: TRecentModel[]
  selectedModel: { providerID: string; modelID: string } | null
  onSelectModel: (providerID: string, modelID: string) => void
}

export function createModelsDialogView(args: TModelsDialogArgs): TDialogView {
  const items: TDialogItem[] = []

  // Recent section
  if (args.recentModels.length > 0) {
    const validRecentModels = args.recentModels
      .map((recent) => {
        const provider = args.providers.find((p) => p.id === recent.providerId)
        const model = provider?.models[recent.modelId]
        if (model && model.status !== "deprecated") {
          return {
            provider,
            model,
            recent,
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (validRecentModels.length > 0) {
      items.push({ id: "recent-header", label: "Recent", section: "Recent" })
      for (const { provider, model } of validRecentModels) {
        const isSelected =
          args.selectedModel?.providerID === provider.id &&
          args.selectedModel?.modelID === model.id
        items.push({
          id: `${provider.id}:${model.id}`,
          label: model.name,
          detail: provider.name,
          section: "Recent",
          indicator: isSelected ? "check" : null,
          onAction: () => args.onSelectModel(provider.id, model.id),
        })
      }
    }
  }

  // Provider sections
  for (const provider of args.providers) {
    const activeModels = Object.values(provider.models).filter(
      (m) => m.status !== "deprecated"
    )
    if (activeModels.length === 0) continue

    items.push({
      id: `${provider.id}-header`,
      label: provider.name,
      section: provider.name,
    })

    for (const model of activeModels) {
      const isSelected =
        args.selectedModel?.providerID === provider.id &&
        args.selectedModel?.modelID === model.id
      items.push({
        id: `${provider.id}:${model.id}`,
        label: model.name,
        detail: provider.name,
        section: provider.name,
        indicator: isSelected ? "check" : null,
        onAction: () => args.onSelectModel(provider.id, model.id),
      })
    }
  }

  return {
    id: "models-menu",
    title: "Select Model",
    searchable: true,
    items,
  }
}

export default function createModelsDialogViewFactory(
  providers: TModelsDialogArgs["providers"],
  recentModels: TModelsDialogArgs["recentModels"],
  selectedModel: TModelsDialogArgs["selectedModel"],
  onSelectModel: TModelsDialogArgs["onSelectModel"]
): () => TDialogView {
  return () =>
    createModelsDialogView({
      providers,
      recentModels,
      selectedModel,
      onSelectModel,
    })
}
