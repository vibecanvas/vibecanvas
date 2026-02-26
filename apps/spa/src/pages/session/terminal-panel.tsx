import { TerminalWidget } from "@/features/terminal/components/terminal-widget";

type TTerminalPanelProps = {
  terminalKey: string;
  workingDirectory: string;
};

export function TerminalPanel(props: TTerminalPanelProps) {
  return (
    <section class="h-full w-full bg-background p-3">
      <TerminalWidget terminalKey={props.terminalKey} workingDirectory={props.workingDirectory} />
    </section>
  );
}
