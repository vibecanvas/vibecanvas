import type { Accessor } from "solid-js";
import { TerminalWidget } from "./terminal-widget";

type THostedTerminalElement = {
  id: string;
  data: {
    workingDirectory: string;
  };
};

type TTerminalHostedWidgetProps = {
  element: Accessor<THostedTerminalElement>;
  registerBeforeRemove?: (handler: (() => void | Promise<void>) | null) => void;
};

export function TerminalHostedWidget(props: TTerminalHostedWidgetProps) {
  return (
    <div class="h-full w-full min-h-0 flex-1">
      <TerminalWidget
        terminalKey={props.element().id}
        workingDirectory={props.element().data.workingDirectory}
        title="untitled"
        showChrome={false}
        registerBeforeRemove={props.registerBeforeRemove}
      />
    </div>
  );
}
