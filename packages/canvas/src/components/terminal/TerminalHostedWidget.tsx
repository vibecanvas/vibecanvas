import type { Accessor } from "solid-js";
import type { THostedWidgetElementMap, TTerminalSafeClient } from "../../services/canvas/interface";
import { TerminalWidget } from "./TerminalWidget";

type TTerminalHostedWidgetProps = {
  element: Accessor<THostedWidgetElementMap["terminal"]>;
  safeClient?: TTerminalSafeClient;
  registerBeforeRemove?: (handler: (() => void | Promise<void>) | null) => void;
};

export function TerminalHostedWidget(props: TTerminalHostedWidgetProps) {
  return (
    <div data-terminal-hosted-wrapper="true" class="h-full w-full min-h-0 min-w-0 flex-1">
      <TerminalWidget
        terminalKey={props.element().id}
        workingDirectory={props.element().data.workingDirectory}
        title="untitled"
        showChrome={false}
        safeClient={props.safeClient}
        registerBeforeRemove={props.registerBeforeRemove}
      />
    </div>
  );
}
