import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
import type { Accessor } from "solid-js";
import type { THostedWidgetChrome, THostedWidgetElementMap } from "../../services/canvas/interface";
import { TerminalWidget } from "./TerminalWidget";

type TTerminalHostedWidgetProps = {
  element: Accessor<THostedWidgetElementMap["terminal"]>;
  apiService?: TOrpcSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  registerBeforeRemove?: (handler: (() => void | Promise<void>) | null) => void;
  registerFocus?: (handler: (() => void) | null) => void;
  registerInsertText?: (handler: ((text: string) => void) | null) => void;
};

export function TerminalHostedWidget(props: TTerminalHostedWidgetProps) {
  return (
    <div data-terminal-hosted-wrapper="true" class="h-full w-full min-h-0 min-w-0 flex-1">
      <TerminalWidget
        terminalKey={props.element().id}
        workingDirectory={props.element().data.workingDirectory}
        title="untitled"
        showChrome={false}
        apiService={props.apiService}
        setWindowChrome={props.setWindowChrome}
        registerBeforeRemove={props.registerBeforeRemove}
        registerFocus={props.registerFocus}
        registerInsertText={props.registerInsertText}
      />
    </div>
  );
}
