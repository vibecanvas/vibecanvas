export type TPortalMountArrowSandbox = {
  HTMLElement: typeof HTMLElement;
  root: HTMLDivElement;
  arrow: {
    html: typeof import("@arrow-js/core").html;
    render: typeof import("@arrow-js/framework").render;
    sandbox: typeof import("@arrow-js/sandbox").sandbox;
  };
};

export type TArgsMountArrowSandbox = {};

const source = {
  "main.ts": [
    "import { html, reactive } from '@arrow-js/core'",
    "",
    "const state = reactive({ count: 0 })",
    "",
    "export default html`",
    "  <main class=\"app\">",
    "    <p class=\"eyebrow\">Arrow sandbox</p>",
    "    <h2 class=\"title\">Hosted Counter</h2>",
    "    <button class=\"button\" @click=\"${() => state.count++}\">",
    "      Count ${() => state.count}",
    "    </button>",
    "  </main>",
    "`",
  ].join("\n"),
  "main.css": [
    ":host {",
    "  display: block;",
    "  width: 100%;",
    "  height: 100%;",
    "}",
    "",
    ".app {",
    "  box-sizing: border-box;",
    "  display: flex;",
    "  flex-direction: column;",
    "  align-items: flex-start;",
    "  gap: 12px;",
    "  width: 100%;",
    "  height: 100%;",
    "  padding: 12px;",
    "  color: white;",
    "  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);",
    "  font-family: Inter, ui-sans-serif, system-ui, sans-serif;",
    "}",
    "",
    ".eyebrow {",
    "  margin: 0;",
    "  font-size: 12px;",
    "  opacity: 0.8;",
    "  text-transform: uppercase;",
    "  letter-spacing: 0.08em;",
    "}",
    "",
    ".title {",
    "  margin: 0;",
    "  font-size: 18px;",
    "  line-height: 1.2;",
    "}",
    "",
    ".button {",
    "  appearance: none;",
    "  border: 0;",
    "  border-radius: 999px;",
    "  padding: 10px 14px;",
    "  font: inherit;",
    "  font-weight: 600;",
    "  color: #1d4ed8;",
    "  background: white;",
    "  cursor: pointer;",
    "}",
    "",
    ".button:hover {",
    "  background: #dbeafe;",
    "}",
  ].join("\n"),
};

export function txMountArrowSandbox(portal: TPortalMountArrowSandbox, args: TArgsMountArrowSandbox) {
  void args;
  portal.root.replaceChildren();
  portal.root.style.width = "100%";
  portal.root.style.height = "100%";
  portal.root.style.overflow = "hidden";
  portal.root.style.position = "relative";

  const host = portal.root.ownerDocument.createElement("div");
  host.style.position = "absolute";
  host.style.inset = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.overflow = "hidden";
  portal.root.appendChild(host);

  void portal.arrow.render(host, portal.arrow.html`${portal.arrow.sandbox({ source })}`).then(() => {
    const sandboxElement = host.querySelector("arrow-sandbox");
    if (!(sandboxElement instanceof portal.HTMLElement)) {
      return;
    }

    sandboxElement.style.position = "absolute";
    sandboxElement.style.inset = "0";
    sandboxElement.style.display = "block";
    sandboxElement.style.width = "calc(100% / var(--vc-hosted-component-scale-x))";
    sandboxElement.style.height = "calc(100% / var(--vc-hosted-component-scale-y))";
    sandboxElement.style.transformOrigin = "top left";
    sandboxElement.style.transform = "scale(var(--vc-hosted-component-scale-x), var(--vc-hosted-component-scale-y))";
    sandboxElement.style.overflow = "hidden";
  });
}
