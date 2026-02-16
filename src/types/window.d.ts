/**
 * Ambient type declarations for global augmentations.
 * These must remain in a .d.ts file as they augment global types.
 */

// Module declaration for plotly.js-dist-min (no @types available)
declare module "plotly.js-dist-min" {
  export function newPlot(
    root: string | HTMLElement,
    data: object[],
    layout?: object,
    config?: object,
  ): Promise<void>;
  export function react(
    root: string | HTMLElement,
    data: object[],
    layout?: object,
    config?: object,
  ): Promise<void>;
  export function relayout(root: string | HTMLElement, layout: object): Promise<void>;
  export function purge(root: string | HTMLElement): void;
}

interface Window {
  /** Global render function for re-rendering the UI */
  render?: () => void | Promise<void>;
  /** Internal state exposed for testing */
  __pds_state?: {
    programme: import("./programme").Programme;
  };
  /** Bootstrap library */
  bootstrap?: {
    Popover: {
      new (element: Element, options?: object): { dispose(): void };
      getInstance(element: Element): { dispose(): void } | null;
      getOrCreateInstance(element: Element, options?: object): { show(): void; hide(): void };
    };
    Collapse: {
      new (element: Element, options?: object): { show(): void; hide(): void };
      getInstance(element: Element): { show(): void; hide(): void } | null;
      getOrCreateInstance(element: Element, options?: object): { show(): void; hide(): void };
    };
  };
}
