interface FoundryUser {
  readonly id: string;
  readonly name: string;
  readonly isGM: boolean;
  readonly active: boolean;
  readonly character: FoundryActor | null;
  readonly targets: Set<FoundryToken>;
  can(permission: string): boolean;
}

interface FoundryItem {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: unknown;
  createRoll(type: string, actor: FoundryActor, info?: Record<string, unknown>): unknown;
  confirmRoll(roll: unknown): Promise<unknown> | unknown;
  getFlag(scope: string, key: string): unknown;
}

interface FoundryActor {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly isOwner: boolean;
  readonly hasPlayerOwner: boolean;
  readonly system: unknown;
  readonly items: { find(fn: (item: FoundryItem) => boolean): FoundryItem | undefined };
  readonly itemTypes: Record<string, FoundryItem[] | undefined>;
  readonly effects: FoundryActiveEffect[];
  testUserPermission(user: FoundryUser, level: string): boolean;
  update(data: Record<string, unknown>): Promise<unknown>;
  createEmbeddedDocuments(name: string, data: Record<string, unknown>[]): Promise<unknown[]>;
  deleteEmbeddedDocuments(name: string, ids: string[]): Promise<unknown[]>;
  toggleStatusEffect(id: string, options: { active: boolean }): Promise<unknown>;
}

interface FoundryActiveEffect {
  readonly id: string;
  readonly name: string;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
}

interface FoundryCombatState {
  readonly round: number | null;
  readonly turn: number | null;
  readonly combatantId: string | null;
}

interface FoundryCombatant {
  readonly id: string;
  readonly actor: FoundryActor | null;
  readonly token: FoundryTokenDocument | null;
}

interface FoundryCombat {
  readonly id: string;
  readonly round: number;
  readonly started: boolean;
  readonly combatants: {
    readonly contents: FoundryCombatant[];
    get(id: string): FoundryCombatant | undefined;
  };
}

interface FoundryTokenDocument {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly documentName: "Token";
  readonly displayName: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly actor: FoundryActor | null;
  readonly hidden: boolean;
  readonly parent: { readonly id: string } | null;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
  unsetFlag(scope: string, key: string): Promise<unknown>;
}

interface FoundryToken {
  readonly id: string;
  readonly name: string;
  readonly isOwner: boolean;
  readonly visible: boolean;
  readonly isVisible: boolean;
  readonly controlled: boolean;
  readonly isTargeted: boolean;
  readonly bounds: { contains(x: number, y: number): boolean };
  setTarget(
    targeted: boolean,
    options?: { releaseOthers?: boolean; groupSelection?: boolean },
  ): void;
  readonly center: { readonly x: number; readonly y: number };
  readonly actor: FoundryActor | null;
  readonly document: FoundryTokenDocument;
}

interface FoundryMeasuredTemplateDocument {
  readonly id: string;
  readonly uuid: string;
  readonly x: number;
  readonly y: number;
  readonly distance: number;
  readonly direction: number;
  getFlag(scope: string, key: string): unknown;
  delete(): Promise<unknown>;
}

interface FoundryTemplatePreview {
  readonly renderFlags: { set(flags: Record<string, boolean>): void };
  draw(): Promise<unknown>;
  destroy(): void;
}

interface FoundryTemplateSource {
  updateSource(data: Record<string, unknown>): unknown;
}

interface FoundryChatMessage {
  readonly id: string;
  readonly isOwner: boolean;
  readonly flags: Record<string, unknown>;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
  update(data: Record<string, unknown>): Promise<unknown>;
}

interface FoundryRollTableResult {
  readonly range: [number, number];
  readonly text: string;
}

interface FoundryRollTable {
  readonly name: string;
  readonly results: { contents: FoundryRollTableResult[] };
}

interface FoundryPack {
  getDocuments(): Promise<unknown[]>;
}

interface FoundryPixiGraphics {
  zIndex: number;
  clear(): this;
  lineStyle(width: number, color?: number, alpha?: number): this;
  beginFill(color: number, alpha?: number): this;
  endFill(): this;
  drawCircle(x: number, y: number, radius: number): this;
  drawRect(x: number, y: number, width: number, height: number): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  destroy(): void;
}

interface FoundryPixiTexture {
  readonly baseTexture: { readonly resource?: { readonly source?: unknown } | null };
}

interface FoundryPixiSprite {
  zIndex: number;
  readonly anchor: { set(x: number, y: number): void };
  readonly position: { set(x: number, y: number): void };
  rotation: number;
  width: number;
  height: number;
  destroy(): void;
}

interface FoundrySettingConfig {
  scope: "client" | "world";
  config: boolean;
  name: string;
  hint?: string;
  type: BooleanConstructor | NumberConstructor | StringConstructor | ObjectConstructor;
  default: unknown;
  onChange?: (value: unknown) => void;
  requiresReload?: boolean;
  range?: { min: number; max: number; step: number };
  choices?: Record<string, string>;
}

interface FoundryDialogButton {
  action: string;
  label: string;
  icon?: string;
  default?: boolean;
}

declare global {
  type Actor = FoundryActor;
  type Item = FoundryItem;
  type Token = FoundryToken;
  type TokenDocument = FoundryTokenDocument;
  type MeasuredTemplateDocument = FoundryMeasuredTemplateDocument;
  type User = FoundryUser;
  type ChatMessage = FoundryChatMessage;
  type RollTable = FoundryRollTable;
  type PixiGraphics = FoundryPixiGraphics;
  type PixiTexture = FoundryPixiTexture;
  type PixiSprite = FoundryPixiSprite;
  type ActiveEffect = FoundryActiveEffect;
  type Combat = FoundryCombat;
  type CombatState = FoundryCombatState;

  const PIXI: {
    Graphics: new () => PixiGraphics;
    Sprite: new (texture: PixiTexture) => PixiSprite;
  };

  function loadTexture(src: string): Promise<PixiTexture | null>;

  const Hooks: {
    once(hook: "init" | "ready" | "closeFilePicker", fn: () => void): number;
    on(hook: "canvasTearDown" | "canvasPan", fn: () => void): number;
    off(hook: string, id: number): void;
    on(
      hook: "renderChatMessage",
      fn: (message: FoundryChatMessage, html: JQuery | HTMLElement) => void,
    ): number;
    on(
      hook: "combatTurnChange",
      fn: (combat: FoundryCombat, prior: FoundryCombatState, current: FoundryCombatState) => void,
    ): number;
    on(
      hook: "updateToken",
      fn: (token: FoundryTokenDocument, changes: Record<string, unknown>) => void,
    ): number;
    callAll(hook: string, ...args: unknown[]): boolean;
  };

  interface JQuery {
    readonly 0: HTMLElement | undefined;
  }

  const game: {
    system: { id: string; version: string };
    user: FoundryUser;
    users: {
      readonly contents: FoundryUser[];
      get(id: string): FoundryUser | undefined;
    };
    i18n: {
      localize(key: string): string;
      format(key: string, data?: Record<string, string>): string;
    };
    settings: {
      get(namespace: string, key: string): unknown;
      register(namespace: string, key: string, config: FoundrySettingConfig): void;
      set(namespace: string, key: string, value: unknown): Promise<unknown>;
      registerMenu(
        namespace: string,
        key: string,
        config: {
          name: string;
          label: string;
          hint: string;
          icon: string;
          type: new () => { render(force?: boolean): unknown };
          restricted: boolean;
        },
      ): void;
    };
    audio: {
      readonly locked: boolean;
      readonly interface?: AudioContext & { readonly gainNode?: GainNode };
    };
    combat: FoundryCombat | null;
    time: { readonly worldTime: number };
    socket: {
      on(event: string, fn: (data: unknown, senderId: string) => void): void;
      emit(event: string, data: unknown): void;
    };
    packs: { get(id: string): FoundryPack | undefined };
    modules: {
      get(
        id: string,
      ): { api?: unknown; active?: boolean; flags?: Record<string, unknown> } | undefined;
    };
  };

  const canvas:
    | {
        readonly scene: {
          readonly id: string;
          readonly grid: { readonly distance: number; readonly units: string };
          readonly templates: {
            get(id: string): FoundryMeasuredTemplateDocument | undefined;
            filter(
              fn: (template: FoundryMeasuredTemplateDocument) => boolean,
            ): FoundryMeasuredTemplateDocument[];
          };
          deleteEmbeddedDocuments(name: "MeasuredTemplate", ids: string[]): Promise<unknown[]>;
          createEmbeddedDocuments(
            name: "MeasuredTemplate",
            data: Record<string, unknown>[],
          ): Promise<FoundryMeasuredTemplateDocument[]>;
        } | null;
        readonly tokens: {
          readonly active: boolean;
          readonly controlled: readonly FoundryToken[];
          readonly placeables: readonly FoundryToken[];
        } | null;
        readonly app: {
          readonly view: HTMLCanvasElement;
          readonly screen: { readonly width: number; readonly height: number };
          readonly ticker: { add(fn: () => void): unknown; remove(fn: () => void): unknown };
        };
        readonly interface: {
          addChild(child: unknown): unknown;
          removeChild(child: unknown): unknown;
          sortChildren(): void;
        } | null;
        readonly visibility: {
          readonly tokenVision: boolean;
          testVisibility(point: { x: number; y: number }, options: { tolerance: number }): boolean;
        } | null;
        readonly stage: {
          readonly worldTransform: {
            applyInverse(point: { x: number; y: number }): { x: number; y: number };
          };
        };
        readonly templates: {
          readonly preview: { addChild(child: unknown): unknown } | null;
        } | null;
        readonly controls: { readonly ruler: { readonly active: boolean } | null } | null;
        canvasCoordinatesFromClient(point: { x: number; y: number }): { x: number; y: number };
        readonly hud: { readonly token: { clear(): void } | null } | null;
        readonly grid: {
          readonly size: number;
          getCenterPoint(point: { x: number; y: number }): { x: number; y: number };
          measurePath(waypoints: { x: number; y: number }[]): { distance: number };
        };
      }
    | undefined;

  class Roll {
    constructor(formula: string);
    readonly total: number;
    evaluate(): Promise<this>;
  }

  const CONFIG: {
    statusEffects: { id: string }[];
    Canvas: {
      polygonBackends: {
        sight: {
          testCollision(
            origin: { x: number; y: number },
            destination: { x: number; y: number },
            options: { type: string; mode: "any" },
          ): boolean;
        };
      };
    };
    MeasuredTemplate: {
      documentClass: new (
        data: Record<string, unknown>,
        context: { parent: unknown },
      ) => FoundryTemplateSource;
      objectClass: new (document: FoundryTemplateSource) => FoundryTemplatePreview;
    };
  };

  class FilePicker {
    constructor(options: {
      type: "folder" | "audio";
      current: string;
      callback: (path: string, app: { activeSource?: string }) => void;
    });
    render(force?: boolean): unknown;
  }

  function fromUuid(uuid: string): Promise<unknown>;
  function renderTemplate(path: string, data: Record<string, unknown>): Promise<string>;
  function loadTemplates(paths: string[]): Promise<unknown>;

  const ChatMessage: {
    create(data: Record<string, unknown>): Promise<FoundryChatMessage | undefined>;
    getSpeaker(options: { actor?: FoundryActor; token?: FoundryTokenDocument }): unknown;
    getWhisperRecipients(name: string): FoundryUser[];
  };

  const foundry: {
    utils: { randomID(length?: number): string; getRoute(path: string): string };
    audio: {
      AudioHelper: {
        play(
          data: { src: string; volume: number; loop: boolean; autoplay: boolean },
          socket: false,
        ): Promise<unknown>;
      };
    };
    applications: {
      api: {
        ApplicationV2: abstract new () => { render(force?: boolean): unknown };
        DialogV2: {
          wait(options: {
            window: { title: string };
            content: string;
            buttons: FoundryDialogButton[];
            rejectClose?: boolean;
            close?: () => unknown;
            render?: (event: Event, element: HTMLElement) => void;
            position?: { width?: number; height?: number };
          }): Promise<string | null>;
        };
      };
    };
  };

  const ui: {
    notifications: {
      info(message: string): unknown;
      warn(message: string): unknown;
      error(message: string): unknown;
    };
  };
}

export {};
