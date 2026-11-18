interface FoundryUser {
  readonly id: string;
  readonly name: string;
  readonly isGM: boolean;
  readonly active: boolean;
  readonly character: FoundryActor | null;
  readonly targets: Set<FoundryToken>;
}

interface FoundryItem {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: unknown;
  createRoll(type: string, actor: FoundryActor, info?: Record<string, unknown>): unknown;
  confirmRoll(roll: unknown): Promise<unknown> | unknown;
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
  testUserPermission(user: FoundryUser, level: string): boolean;
  update(data: Record<string, unknown>): Promise<unknown>;
}

interface FoundryTokenDocument {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly actor: FoundryActor | null;
}

interface FoundryToken {
  readonly id: string;
  readonly name: string;
  readonly isOwner: boolean;
  readonly actor: FoundryActor | null;
  readonly document: FoundryTokenDocument;
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
  type User = FoundryUser;
  type ChatMessage = FoundryChatMessage;
  type RollTable = FoundryRollTable;

  const Hooks: {
    once(hook: "init" | "ready", fn: () => void): number;
    on(
      hook: "renderChatMessage",
      fn: (message: FoundryChatMessage, html: JQuery | HTMLElement) => void,
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
    settings: { get(namespace: string, key: string): unknown };
    socket: {
      on(event: string, fn: (data: unknown, senderId: string) => void): void;
      emit(event: string, data: unknown): void;
    };
    packs: { get(id: string): FoundryPack | undefined };
    modules: { get(id: string): { api?: unknown } | undefined };
  };

  const canvas:
    | {
        readonly scene: { readonly grid: { readonly distance: number } } | null;
        readonly tokens: {
          readonly controlled: readonly FoundryToken[];
        } | null;
        readonly grid: {
          readonly size: number;
          measurePath(waypoints: { x: number; y: number }[]): { distance: number };
        };
      }
    | undefined;

  function fromUuid(uuid: string): Promise<unknown>;
  function renderTemplate(path: string, data: Record<string, unknown>): Promise<string>;
  function loadTemplates(paths: string[]): Promise<unknown>;

  const ChatMessage: {
    create(data: Record<string, unknown>): Promise<FoundryChatMessage | undefined>;
    getSpeaker(options: { actor?: FoundryActor; token?: FoundryTokenDocument }): unknown;
    getWhisperRecipients(name: string): FoundryUser[];
  };

  const foundry: {
    utils: { randomID(length?: number): string };
    applications: {
      api: {
        DialogV2: {
          wait(options: {
            window: { title: string };
            content: string;
            buttons: FoundryDialogButton[];
            rejectClose?: boolean;
            close?: () => unknown;
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
