import type { Page } from '@playwright/test';

/** Inject one WebGL canvas resize error only after experiment 002 registered its document listener. */
export async function injectHarmonographInitialResizeFailure(page: Page) {
  await page.addInitScript(() => {
    const probe = { injected: 0, visibilityRegistrations: 0, visibilityCalls: 0, stageObservations: 0, resizeCallbacks: 0, stageDisconnects: 0, armed: false };
    Object.assign(window, { __harmonographFailureProbe: probe });
    const webglCanvases = new WeakSet<HTMLCanvasElement>();

    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
      const result = Reflect.apply(getContext, this, args);
      if (String(args[0]).includes('webgl') && result) webglCanvases.add(this);
      return result;
    } as typeof getContext;

    const width = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')!;
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
      configurable: true, enumerable: width.enumerable,
      get(this: HTMLCanvasElement) { return width.get!.call(this); },
      set(this: HTMLCanvasElement, value: number) {
        if (probe.armed && webglCanvases.has(this) && probe.injected === 0) {
          probe.injected++;
          throw new Error('injected WebGL resize failure after 002 listener registration');
        }
        width.set!.call(this, value);
      },
    });

    const documentAdd = document.addEventListener.bind(document);
    Object.defineProperty(document, 'addEventListener', {
      configurable: true,
      value(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (type === 'visibilitychange' && document.querySelector('#harm-stage')) {
          probe.visibilityRegistrations++;
          probe.armed = true;
          const wrapped: EventListener = event => {
            probe.visibilityCalls++;
            if (typeof listener === 'function') listener.call(document, event);
            else listener.handleEvent(event);
          };
          documentAdd(type, wrapped, options);
        } else documentAdd(type, listener, options);
      },
    });

    const ResizeObserverImpl = window.ResizeObserver;
    window.ResizeObserver = class extends ResizeObserverImpl {
      private tracked: { value: boolean };
      constructor(callback: ResizeObserverCallback) {
        const tracked = { value: false };
        super((entries, observer) => {
          if (tracked.value) probe.resizeCallbacks++;
          callback(entries, observer);
        });
        this.tracked = tracked;
      }
      observe(element: Element, options?: ResizeObserverOptions) {
        if (element.id === 'harm-stage') {
          this.tracked.value = true;
          probe.stageObservations++;
        }
        super.observe(element, options);
      }
      disconnect() {
        if (this.tracked.value) probe.stageDisconnects++;
        super.disconnect();
      }
    };
  });
}

export function harmonographProbe(page: Page) {
  return page.evaluate(() => (window as typeof window & { __harmonographFailureProbe?: {
    injected: number; visibilityRegistrations: number; visibilityCalls: number;
    stageObservations: number; resizeCallbacks: number; stageDisconnects: number; armed: boolean;
  } }).__harmonographFailureProbe);
}

/** Simulate a real hidden-to-visible lifecycle, without relying on OS tab throttling. */
export async function simulateTabReturn(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
