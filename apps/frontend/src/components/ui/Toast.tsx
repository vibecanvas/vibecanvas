import { Toast as KobalteToast, toaster } from "@kobalte/core/toast";
import { Portal } from "solid-js/web";
import X from "lucide-solid/icons/x";

export { toaster };

export function Toaster() {
  return (
    <Portal>
      <KobalteToast.Region>
        <KobalteToast.List class="fixed bottom-4 right-4 flex flex-col gap-2 w-80 z-50" />
      </KobalteToast.Region>
    </Portal>
  );
}

type ToastVariant = "default" | "error" | "success";

type ToastProps = {
  toastId: number;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

const variantStyles: Record<ToastVariant, { container: string; progress: string; title: string }> = {
  default: {
    container: "bg-card border-border",
    progress: "bg-muted-foreground",
    title: "text-foreground",
  },
  error: {
    container: "bg-destructive/10 border-destructive",
    progress: "bg-destructive",
    title: "text-destructive",
  },
  success: {
    container: "bg-success/10 border-success",
    progress: "bg-success",
    title: "text-foreground",
  },
};

export function Toast(props: ToastProps) {
  const variant = () => props.variant ?? "default";
  const styles = () => variantStyles[variant()];

  return (
    <KobalteToast
      toastId={props.toastId}
      class={`${styles().container} border p-3 shadow-md animate-in slide-in-from-right-full duration-200`}
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          {props.title && (
            <KobalteToast.Title class={`font-medium text-sm ${styles().title}`}>
              {props.title}
            </KobalteToast.Title>
          )}
          {props.description && (
            <KobalteToast.Description class="text-xs text-muted-foreground mt-1">
              {props.description}
            </KobalteToast.Description>
          )}
        </div>
        <KobalteToast.CloseButton class="p-1 hover:bg-accent transition-colors">
          <X size={14} class="text-muted-foreground" />
        </KobalteToast.CloseButton>
      </div>
      <KobalteToast.ProgressTrack class="h-0.5 bg-accent/20 mt-2">
        <KobalteToast.ProgressFill
          class={`h-full ${styles().progress}`}
          style={{ width: "var(--kb-toast-progress-fill-width)" }}
        />
      </KobalteToast.ProgressTrack>
    </KobalteToast>
  );
}

export function showToast(title: string, description?: string) {
  return toaster.show((props) => (
    <Toast toastId={props.toastId} title={title} description={description} />
  ));
}

export function showErrorToast(title: string, description?: string) {
  return toaster.show((props) => (
    <Toast toastId={props.toastId} title={title} description={description} variant="error" />
  ));
}

export function showSuccessToast(title: string, description?: string) {
  return toaster.show((props) => (
    <Toast toastId={props.toastId} title={title} description={description} variant="success" />
  ));
}
