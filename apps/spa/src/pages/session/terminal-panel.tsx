import { Terminal } from "@/components/terminal";

type TTerminalPanelProps = {
  terminalKey: string;
  workingDirectory: string;
};

export function TerminalPanel(props: TTerminalPanelProps) {
  return (
    <section class="h-full w-full bg-background p-3">
      <Terminal terminalKey={props.terminalKey} workingDirectory={props.workingDirectory} />
    </section>
  );
}
