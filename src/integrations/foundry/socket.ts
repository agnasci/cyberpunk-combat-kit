import { MODULE_ID } from "../../constants";

const CHANNEL = `module.${MODULE_ID}`;

export type Handler = (payload: unknown, senderId: string) => Promise<unknown>;

export type RequestResult = { ok: true; value: unknown } | { ok: false; error: string };

interface RequestEnvelope {
  type: "request";
  kind: string;
  requestId: string;
  to: string;
  payload: unknown;
}

interface ResponseEnvelope {
  type: "response";
  requestId: string;
  to: string;
  ok: boolean;
  value?: unknown;
  error?: string;
}

const handlers = new Map<string, Handler>();
const pending = new Map<string, (result: RequestResult) => void>();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runHandler(
  kind: string,
  payload: unknown,
  senderId: string,
): Promise<RequestResult> {
  const handler = handlers.get(kind);
  if (!handler) return { ok: false, error: `unknown-kind:${kind}` };
  try {
    return { ok: true, value: await handler(payload, senderId) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function isRequest(data: unknown): data is RequestEnvelope {
  const value = data as Partial<RequestEnvelope> | null;
  return (
    value?.type === "request" &&
    typeof value.kind === "string" &&
    typeof value.requestId === "string" &&
    typeof value.to === "string"
  );
}

function isResponse(data: unknown): data is ResponseEnvelope {
  const value = data as Partial<ResponseEnvelope> | null;
  return (
    value?.type === "response" &&
    typeof value.requestId === "string" &&
    typeof value.to === "string" &&
    typeof value.ok === "boolean"
  );
}

export function initSocket(): void {
  game.socket.on(CHANNEL, (data, senderId) => {
    if (isResponse(data)) {
      if (data.to !== game.user.id) return;
      const resolve = pending.get(data.requestId);
      if (!resolve) return;
      pending.delete(data.requestId);
      resolve(data.ok ? { ok: true, value: data.value } : { ok: false, error: data.error ?? "" });
      return;
    }
    if (!isRequest(data) || data.to !== game.user.id) return;
    void runHandler(data.kind, data.payload, senderId).then((result) => {
      const response: ResponseEnvelope = {
        type: "response",
        requestId: data.requestId,
        to: senderId,
        ok: result.ok,
        ...(result.ok ? { value: result.value } : { error: result.error }),
      };
      game.socket.emit(CHANNEL, response);
    });
  });
}

export function registerHandler(kind: string, handler: Handler): void {
  handlers.set(kind, handler);
}

export function request(
  kind: string,
  to: string,
  payload: unknown,
  timeoutMs: number,
): Promise<RequestResult> {
  if (to === game.user.id) return runHandler(kind, payload, game.user.id);
  const requestId = foundry.utils.randomID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({ ok: false, error: "timeout" });
    }, timeoutMs);
    pending.set(requestId, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
    const envelope: RequestEnvelope = { type: "request", kind, requestId, to, payload };
    game.socket.emit(CHANNEL, envelope);
  });
}
