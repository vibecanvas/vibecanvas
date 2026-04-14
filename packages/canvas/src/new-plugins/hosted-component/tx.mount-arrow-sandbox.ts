export type TPortalMountArrowSandbox = {
  root: HTMLDivElement;
  logging: import("../../new-services/logging/LoggingService").LoggingService;
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
  portal.logging.log({
    kind: "plugin",
    name: "hosted-component",
    level: 1,
    event: "arrow.mount.start",
    payload: {
      overlayId: portal.root.dataset.hostedComponentOverlayId ?? null,
      rootClientWidth: portal.root.clientWidth,
      rootClientHeight: portal.root.clientHeight,
    },
  });
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

  portal.logging.log({
    kind: "plugin",
    name: "hosted-component",
    level: 2,
    event: "arrow.mount.host-created",
    payload: {
      overlayId: portal.root.dataset.hostedComponentOverlayId ?? null,
      hostStyleWidth: host.style.width,
      hostStyleHeight: host.style.height,
      hostPosition: host.style.position,
      rootScaleX: portal.root.style.getPropertyValue("--vc-hosted-component-scale-x"),
      rootScaleY: portal.root.style.getPropertyValue("--vc-hosted-component-scale-y"),
    },
  });

  void portal.arrow.render(host, portal.arrow.html`${portal.arrow.sandbox({ source })}`).then(() => {
    const sandboxElement = host.querySelector("arrow-sandbox");
    if (!(sandboxElement instanceof portal.root.ownerDocument.defaultView?.HTMLElement)) {
      portal.logging.warn({
        kind: "plugin",
        name: "hosted-component",
        level: 1,
        event: "arrow.mount.missing-sandbox-element",
        payload: {
          overlayId: portal.root.dataset.hostedComponentOverlayId ?? null,
          childCount: host.childElementCount,
        },
      });
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

    portal.logging.log({
      kind: "plugin",
      name: "hosted-component",
      level: 2,
      event: "arrow.mount.complete",
      payload: {
        overlayId: portal.root.dataset.hostedComponentOverlayId ?? null,
        rootRect: portal.root.getBoundingClientRect().toJSON?.() ?? {
          x: portal.root.getBoundingClientRect().x,
          y: portal.root.getBoundingClientRect().y,
          width: portal.root.getBoundingClientRect().width,
          height: portal.root.getBoundingClientRect().height,
        },
        hostRect: host.getBoundingClientRect().toJSON?.() ?? {
          x: host.getBoundingClientRect().x,
          y: host.getBoundingClientRect().y,
          width: host.getBoundingClientRect().width,
          height: host.getBoundingClientRect().height,
        },
        sandboxRect: sandboxElement.getBoundingClientRect().toJSON?.() ?? {
          x: sandboxElement.getBoundingClientRect().x,
          y: sandboxElement.getBoundingClientRect().y,
          width: sandboxElement.getBoundingClientRect().width,
          height: sandboxElement.getBoundingClientRect().height,
        },
        shadowChildTag: sandboxElement.shadowRoot?.firstElementChild?.tagName ?? null,
      },
    });
  });
}
