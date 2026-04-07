export const CANVAS_SUBCOMMANDS = ['list', 'query', 'patch', 'move', 'group', 'ungroup', 'delete', 'reorder'] as const

export const CANVAS_SUBCOMMAND_SET = new Set<string>(CANVAS_SUBCOMMANDS)
