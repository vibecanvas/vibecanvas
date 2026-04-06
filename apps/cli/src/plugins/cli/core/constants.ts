export const CANVAS_SUBCOMMANDS = ['list', 'query', 'patch', 'move', 'group', 'ungroup', 'delete', 'reorder', 'render'] as const

export const CANVAS_SUBCOMMAND_SET = new Set<string>(CANVAS_SUBCOMMANDS)
