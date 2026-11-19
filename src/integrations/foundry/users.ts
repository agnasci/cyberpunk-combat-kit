import {
  chooseExecutor,
  chooseResponder,
  type OwnerSummary,
  type UserSummary,
} from "../../domain/gm-request";

const OWNER = "OWNER";

function summaries(): UserSummary[] {
  return game.users.contents.map((user) => ({
    id: user.id,
    isGM: user.isGM,
    active: user.active,
  }));
}

export function executorId(): string | null {
  return chooseExecutor(summaries());
}

export function responderId(actor: Actor): string | null {
  const owners: OwnerSummary[] = game.users.contents.map((user) => ({
    id: user.id,
    isGM: user.isGM,
    active: user.active,
    owner: actor.testUserPermission(user, OWNER),
    characterMatches: user.character?.id === actor.id,
  }));
  return chooseResponder(owners);
}

export function userCanOwn(userId: string, actor: Actor): boolean {
  const user = game.users.get(userId);
  return !!user && (user.isGM || actor.testUserPermission(user, OWNER));
}

export function gmRecipients(): string[] {
  return game.users.contents.filter((user) => user.isGM).map((user) => user.id);
}

export function ownerRecipients(actor: Actor): string[] {
  return game.users.contents
    .filter((user) => !user.isGM && actor.testUserPermission(user, OWNER))
    .map((user) => user.id);
}
