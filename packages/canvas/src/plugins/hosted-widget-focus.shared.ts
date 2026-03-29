export const HOSTED_WIDGET_FOCUS_ROOT_SELECTOR = '[data-hosted-widget-focus-root="true"]';

const HOSTED_WIDGET_FOCUS_RETRY_DELAYS_MS = [0, 16, 48, 96];

function mountContainsActiveElement(mountElement: HTMLElement) {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && mountElement.contains(activeElement);
}

function focusHostedWidgetFocusRoot(mountElement: HTMLElement) {
  const focusRoot = mountElement.querySelector<HTMLElement>(HOSTED_WIDGET_FOCUS_ROOT_SELECTOR);
  if (!focusRoot) return false;
  if (mountContainsActiveElement(mountElement)) return true;
  focusRoot.focus({ preventScroll: true });
  return mountContainsActiveElement(mountElement);
}

export function scheduleHostedWidgetFocus(mountElement: HTMLElement) {
  let cancelled = false;
  const timerIds: number[] = [];

  const attemptFocus = (index: number) => {
    if (cancelled || !mountElement.isConnected) return;
    if (mountContainsActiveElement(mountElement)) return;

    const didFocus = focusHostedWidgetFocusRoot(mountElement);
    if (didFocus) return;

    const nextDelay = HOSTED_WIDGET_FOCUS_RETRY_DELAYS_MS[index + 1];
    if (typeof nextDelay !== "number") return;

    const timeoutId = window.setTimeout(() => {
      attemptFocus(index + 1);
    }, nextDelay);
    timerIds.push(timeoutId);
  };

  const firstTimeoutId = window.setTimeout(() => {
    attemptFocus(0);
  }, HOSTED_WIDGET_FOCUS_RETRY_DELAYS_MS[0]);
  timerIds.push(firstTimeoutId);

  return () => {
    cancelled = true;
    timerIds.forEach((timerId) => window.clearTimeout(timerId));
  };
}
