export type TVibecanvasSandboxSource = Record<string, string>;

const VIBECANVAS_UI_IMPORT = '@vibecanvas/ui';
const VIBECANVAS_UI_SHIM_PATH = './__vibecanvas_ui__.ts';

function replaceVibecanvasUiImports(source: string) {
  return source
    .replaceAll(`from '${VIBECANVAS_UI_IMPORT}'`, `from '${VIBECANVAS_UI_SHIM_PATH}'`)
    .replaceAll(`from \"${VIBECANVAS_UI_IMPORT}\"`, `from \"${VIBECANVAS_UI_SHIM_PATH}\"`);
}

export function createVibecanvasUiShimSource() {
  return [
    "import { getUser, listUsers } from 'host:vibecanvas/ui';",
    '',
    'export const api = {',
    '  users: {',
    '    get(id: string) {',
    '      return getUser(id);',
    '    },',
    '    list() {',
    '      return listUsers();',
    '    },',
    '  },',
    '};',
  ].join('\n');
}

export function prepareVibecanvasSandboxSource(source: TVibecanvasSandboxSource): TVibecanvasSandboxSource {
  const hasMainTs = typeof source['main.ts'] === 'string';
  const hasMainJs = typeof source['main.js'] === 'string';

  if (hasMainTs === hasMainJs) {
    throw new Error('Hosted UI source must contain exactly one main.ts or main.js entry file.');
  }

  const prepared = Object.fromEntries(
    Object.entries(source).map(([path, contents]) => [path, replaceVibecanvasUiImports(contents)]),
  );

  prepared['__vibecanvas_ui__.ts'] = createVibecanvasUiShimSource();
  return prepared;
}
