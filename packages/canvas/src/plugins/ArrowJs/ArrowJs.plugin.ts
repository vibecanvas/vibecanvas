import type { IPlugin, IPluginContext } from "../shared/interface";
import { createEffect } from "solid-js";
import { CanvasMode } from "../../services/canvas/enum";
import { render } from '@arrow-js/framework'
import { html } from '@arrow-js/core'
import { sandbox } from '@arrow-js/sandbox'

const source = {
  'main.ts': [
    "import { html, reactive } from '@arrow-js/core'",
    '',
    'const state = reactive({ count: 0 })',
    '',
    'export default html`<button @click="${() => state.count++}">',
    '  Count ${() => state.count}',
    '</button>`',
  ].
    join('\n'),
  'main.css': [
    'button {',
    '  font: inherit;',
    '  padding: 0.75rem 1rem;',
    '}',
  ].
    join('\n'),
}

export class ArrowJsPlugin implements IPlugin {

  apply(context: IPluginContext): void {
    const root = document.createElement('div')
    root.id = 'arrowjs'
    root.style.position = 'absolute'
    root.style.left = '50%'
    root.style.top = '50%'
    root.style.width = '100px'
    root.style.height = '100px'
    root.style.backgroundColor = 'red'
    root.style.opacity = '0.5'

    document.body.appendChild(root)
    const view = html`<section>${sandbox({ source })}</section>`;

    render(root, view)



  }
}
