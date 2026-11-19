import { MODULE_ID } from "../../constants";

export const PANEL_ID = "cyberpunk-character-panel";
const PANEL_VERSION = 1;

export interface PanelSubject {
  actor: Actor;
  token: TokenDocument | null;
  reason: string;
}

export interface PanelPalette {
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentLine: string;
  accentInk: string;
  variables: Record<string, string>;
}

export interface PanelSlotContext {
  region: string;
  subject: PanelSubject | null;
  palette: PanelPalette;
  container: HTMLElement;
}

export interface PanelSlot {
  id: string;
  region: "bar-end" | "quick" | "drawer";
  order?: number;
  label?: string;
  icon?: string;
  render(context: PanelSlotContext): Node | string | null;
  onAction?(action: string, event: Event, context: PanelSlotContext): unknown;
}

export interface PanelApi {
  version: number;
  getSubject(): PanelSubject | null;
  registerSlot(slot: PanelSlot): boolean;
  unregisterSlot(id: string): void;
  requestRender(regions?: string[]): void;
  getPalette(): PanelPalette | null;
}

function isApi(value: unknown): value is PanelApi {
  const api = value as Partial<PanelApi> | null;
  return (
    typeof api === "object" &&
    api !== null &&
    typeof api.version === "number" &&
    typeof api.registerSlot === "function" &&
    typeof api.getSubject === "function"
  );
}

function applyPalette(palette: PanelPalette | null): void {
  const root = document.documentElement.style;
  if (!palette) {
    root.removeProperty("--cck-panel-accent");
    root.removeProperty("--cck-panel-soft");
    return;
  }
  root.setProperty("--cck-panel-accent", palette.accent);
  root.setProperty("--cck-panel-soft", palette.accentSoft);
}

export function connectPanel(onConnect: (api: PanelApi) => void): void {
  let connected = false;
  const connect = (value: unknown) => {
    if (connected || !isApi(value)) return;
    if (value.version !== PANEL_VERSION) {
      console.warn(`${MODULE_ID} | Character Panel API v${value.version}; integration off`);
      connected = true;
      return;
    }
    connected = true;
    applyPalette(value.getPalette());
    Hooks.on("ccpRendered", () => applyPalette(value.getPalette()));
    onConnect(value);
  };
  Hooks.on("ccpReady", connect);
  const panel = game.modules.get(PANEL_ID);
  if (panel?.active) connect(panel.api);
}
