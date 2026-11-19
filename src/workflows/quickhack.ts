import type { Point } from "../domain/area";
import type { Defense } from "../domain/attack-rules";
import { mortallyWounded } from "../domain/cues";
import type { DamageResult } from "../domain/gm-request";
import type { PackQuickhack } from "../domain/pack";
import { announceDamage, postResolution } from "./announce";
import {
  awareAfterQuickhack,
  breachBlocker,
  breachDv,
  checkPassed,
  firewallDv,
  forceOutSucceeds,
  inJackInRange,
  intrusionBy,
  isLocked,
  jackInBlocker,
  lockFor,
  netAudience,
  quickhackBlocker,
  targetStaysUnaware,
  turnKey,
  type NetIntrusion,
  type NetState,
} from "../domain/quickhack";
import type { CardAudience } from "../domain/routing";
import { emitCue } from "../effects/engine";
import { activePacks } from "../effects/packs";
import { rollSkill, type NativeRollResult } from "../integrations/cpr/attack-adapter";
import { countPart, interfaceRank, rollInterface } from "../integrations/cpr/net-adapter";
import { findSkill, SKILLS } from "../integrations/cpr/weapon-adapter";
import { requestGm } from "../integrations/foundry/gm-executor";
import {
  directDamage,
  dropIntrusion,
  netState,
  ongoingEffects,
  removeExpired,
} from "../integrations/foundry/net-store";
import { quickhackSettings } from "../integrations/foundry/settings";
import {
  attackerToken,
  distanceBetween,
  distanceToPoint,
  singleTarget,
  squareSize,
} from "../integrations/foundry/tokens";
import { executorId, ownerRecipients } from "../integrations/foundry/users";
import { newState, type Outcome, type TargetResult } from "../ui/resolution-card";
import { speakerFor, targetEntry, warn } from "./combat-common";
import { requestDefense } from "./defense";

export type NetAction = "jackIn" | "breach" | "quickhack" | "jackOut" | "forceOut";

export interface QuickhackOptions {
  action: NetAction;
  quickhackId?: string;
  runnerUuid?: string;
  skipDialog?: boolean;
}

interface Actorish {
  token: Token;
  actor: Actor;
}

export interface NetView {
  rank: number;
  hasNeuroport: boolean;
  passwalls: number;
  inRange: boolean;
  visible: boolean;
  locked: boolean;
  state: NetState;
  intrusion: NetIntrusion | null;
  turn: string | null;
}

export function quickhacksEnabled(): boolean {
  return quickhackSettings().enabled;
}

export function availableQuickhacks(): PackQuickhack[] {
  const seen = new Set<string>();
  const list: PackQuickhack[] = [];
  for (const pack of activePacks()) {
    if (!pack.kinds.includes("quickhacks")) continue;
    for (const quickhack of pack.quickhacks) {
      if (seen.has(quickhack.id)) continue;
      seen.add(quickhack.id);
      list.push(quickhack);
    }
  }
  return list;
}

export function currentTurn(): string | null {
  const combat = game.combat;
  return turnKey(combat?.started ? combat : null);
}

export function netView(runner: Token, target: Token): NetView {
  const names = quickhackSettings();
  const state = netState(target.document);
  const actor = target.actor;
  return {
    rank: runner.actor ? interfaceRank(runner.actor) : 0,
    hasNeuroport: actor ? countPart(actor, "neuroport", names) > 0 : false,
    passwalls: actor ? countPart(actor, "selfIce", names) : 0,
    inRange: inJackInRange(distanceBetween(runner, target), squareSize()),
    visible: !target.document.hidden || game.user.isGM,
    locked: runner.actor ? isLocked(state, runner.actor.uuid, game.time.worldTime) : false,
    state,
    intrusion: intrusionBy(state, runner.document.uuid),
    turn: currentTurn(),
  };
}

export function awareIntruders(token: Token): NetIntrusion[] {
  return netState(token.document).intrusions.filter((entry) => entry.aware);
}

function tokenByUuid(uuid: string): Token | null {
  return (canvas?.tokens?.placeables ?? []).find((token) => token.document.uuid === uuid) ?? null;
}

function acting(): Actorish | null {
  const token = attackerToken();
  if (typeof token === "string") {
    warn(`CCK.Attack.${token}`);
    return null;
  }
  if (!token.actor) return null;
  if (!executorId()) {
    warn("CCK.Gm.no-gm");
    return null;
  }
  return { token, actor: token.actor };
}

function targetOf(): Actorish | null {
  const token = singleTarget();
  if (typeof token === "string") {
    warn(`CCK.Attack.${token}`);
    return null;
  }
  return token.actor ? { token, actor: token.actor } : null;
}

function audienceFor(aware: boolean, runner: Actor, target: Actor): CardAudience {
  const audience = netAudience(aware, !runner.hasPlayerOwner, !target.hasPlayerOwner);
  return audience === "runner" ? { users: ownerRecipients(runner) } : audience;
}

interface NetCard {
  mode: string;
  name: string;
  outcome: Outcome;
  attackTotal?: number | null;
  dv?: number | null;
  defense?: Defense | null;
  applied?: DamageResult | null;
  effect?: string | null;
  error?: string | null;
  notes?: string[];
  rollLabel?: string;
}

async function postNetCard(
  self: Actorish,
  other: Actorish,
  card: NetCard,
  audience: CardAudience,
): Promise<void> {
  const applied = card.applied ?? null;
  const target: TargetResult = {
    ...targetEntry(other.token.document.uuid, other.actor.name),
    outcome: card.outcome,
    defense: card.defense ?? null,
    applied: applied && applied.hpReduction > 0 ? applied : null,
    effect: card.effect ?? null,
    error: card.error ?? null,
  };
  await postResolution(
    newState({
      attackerUuid: self.token.document.uuid,
      attackerName: self.actor.name,
      weaponName: card.name,
      mode: card.mode,
      distance: null,
      attackTotal: card.attackTotal ?? null,
      dv: card.dv ?? null,
      damageTotal: applied?.rolled ?? null,
      multiplier: null,
      critical: false,
      rollLabel: card.rollLabel ?? "CCK.Net.Interface",
      dvLabel: "CCK.Card.Dv",
      notes: card.notes ?? [],
      targets: [target],
    }),
    speakerFor(self),
    audience,
  );
}

function cue(
  name: "quickhack.jackIn" | "quickhack.success" | "quickhack.fail" | "quickhack.forceOut",
  source: Token,
  target: Token,
  qualifiers: string[] = [],
): void {
  emitCue({ name, source: source.id, targets: [target.id], qualifiers });
}

function cueDamage(source: string | null, target: string, applied: DamageResult): void {
  if (applied.hpReduction <= 0) return;
  const base = { source, targets: [target], qualifiers: ["quickhack"] };
  emitCue({ ...base, name: "damage.applied" });
  if (mortallyWounded(applied.hpBefore, applied.hpAfter)) {
    emitCue({ ...base, name: "actor.mortallyWounded" });
  }
}

function interfaceCheck(self: Actorish, title: string, skipDialog: boolean) {
  return rollInterface(self.actor, title, {
    actor: self.actor,
    tokenId: self.token.id,
    skipDialog,
  });
}

function netrunning(): string {
  return game.i18n.localize("CCK.Menu.Net");
}

function gmError(error: string): string {
  warn(`CCK.Gm.${error}`);
  return `CCK.Gm.${error}`;
}

async function jackIn(self: Actorish, other: Actorish, skipDialog: boolean): Promise<void> {
  const view = netView(self.token, other.token);
  const blocker = jackInBlocker({ ...view, linked: view.intrusion !== null });
  if (blocker) return warn(`CCK.Menu.Why-${blocker}`);
  const title = game.i18n.localize("CCK.Mode.jackIn");
  const notes: string[] = [];
  const firewall = firewallDv(view.rank);
  if (firewall !== null) {
    const roll = await interfaceCheck(self, title, skipDialog);
    if (!roll) return;
    if (!checkPassed(roll.total, firewall)) {
      cue("quickhack.fail", self.token, other.token);
      await postNetCard(
        self,
        other,
        {
          mode: "jackIn",
          name: netrunning(),
          outcome: "hack-failed",
          attackTotal: roll.total,
          dv: firewall,
          notes: ["CCK.Net.FirewallHeld"],
        },
        audienceFor(false, self.actor, other.actor),
      );
      return;
    }
    notes.push("CCK.Net.FirewallPassed");
  }
  let aware = true;
  let mine: NativeRollResult | null = null;
  let defense: Defense | null = null;
  if (interfaceRank(other.actor) > 0) notes.push("CCK.Net.RunnerAlwaysAware");
  else {
    mine = await interfaceCheck(self, title, skipDialog);
    if (!mine) return;
    const answer = await requestDefense(other.actor, {
      purpose: "jackIn",
      skill: "will",
      optional: false,
      attackerName: self.actor.name,
      defenderUuid: other.actor.uuid,
      defenderTokenId: other.token.id,
      weaponName: title,
      dv: null,
    });
    if (answer.choice !== "rolled") {
      return warn("CCK.Attack.no-defense", { defender: other.actor.name });
    }
    aware = !targetStaysUnaware(mine.total, answer.total);
    defense = { kind: "contest", total: answer.total };
  }
  const result = await requestGm({
    op: "netJackIn",
    attackerUuid: self.token.document.uuid,
    targetUuid: other.token.document.uuid,
    aware,
  });
  if (result.ok) cue("quickhack.jackIn", self.token, other.token);
  await postNetCard(
    self,
    other,
    {
      mode: "jackIn",
      name: netrunning(),
      outcome: aware ? "net-aware" : "net-unaware",
      attackTotal: mine?.total ?? null,
      defense,
      notes,
      error: result.ok ? null : gmError(result.error),
    },
    audienceFor(aware, self.actor, other.actor),
  );
}

async function breach(self: Actorish, other: Actorish, skipDialog: boolean): Promise<void> {
  const view = netView(self.token, other.token);
  const blocker = breachBlocker(view.intrusion, view.passwalls, view.inRange);
  const dv = breachDv(view.passwalls);
  if (blocker || dv === null || !view.intrusion) {
    return warn(`CCK.Menu.Why-${blocker ?? "nothing-to-breach"}`);
  }
  const title = game.i18n.localize("CCK.Mode.breach");
  const roll = await interfaceCheck(self, title, skipDialog);
  if (!roll) return;
  const passed = checkPassed(roll.total, dv);
  let error: string | null = null;
  if (passed) {
    const result = await requestGm({
      op: "netBreach",
      attackerUuid: self.token.document.uuid,
      targetUuid: other.token.document.uuid,
    });
    if (!result.ok) error = gmError(result.error);
  }
  const left = view.passwalls - view.intrusion.breached - (passed && !error ? 1 : 0);
  await postNetCard(
    self,
    other,
    {
      mode: "breach",
      name: netrunning(),
      outcome: passed ? "breached" : "hack-failed",
      attackTotal: roll.total,
      dv,
      notes: [left > 0 ? "CCK.Net.PasswallsLeft" : "CCK.Net.PasswallsDone"],
      error,
    },
    audienceFor(view.intrusion.aware, self.actor, other.actor),
  );
}

async function runQuickhack(
  self: Actorish,
  other: Actorish,
  quickhackId: string | undefined,
  skipDialog: boolean,
): Promise<void> {
  const quickhack = availableQuickhacks().find((entry) => entry.id === quickhackId);
  if (!quickhack) return warn("CCK.Menu.Why-no-quickhacks");
  const view = netView(self.token, other.token);
  const blocker = quickhackBlocker({
    rank: view.rank,
    tier: quickhack.tier,
    intrusion: view.intrusion,
    passwalls: view.passwalls,
    inRange: view.inRange,
    turn: view.turn,
    requiresUnaware: quickhack.requiresUnaware,
  });
  if (blocker || !view.intrusion) return warn(`CCK.Menu.Why-${blocker ?? "not-linked"}`);
  const roll = await interfaceCheck(self, quickhack.name, skipDialog);
  if (!roll) return;
  const success = checkPassed(roll.total, quickhack.dv);
  const result = await requestGm({
    op: "netHack",
    attackerUuid: self.token.document.uuid,
    targetUuid: other.token.document.uuid,
    quickhackId: quickhack.id,
    success,
  });
  const applied = result.ok ? result.result : null;
  if (result.ok) {
    cue(success ? "quickhack.success" : "quickhack.fail", self.token, other.token, [quickhack.id]);
    if (applied) {
      cueDamage(self.token.id, other.token.id, applied);
      announceDamage({
        attackerUuid: self.token.document.uuid,
        targetUuid: other.token.document.uuid,
        source: "quickhack",
        result: applied,
      });
    }
  }
  const aware = awareAfterQuickhack(view.intrusion.aware, quickhack.alerts, success);
  await postNetCard(
    self,
    other,
    {
      mode: "quickhack",
      name: quickhack.name,
      outcome: success ? "hacked" : "hack-failed",
      attackTotal: roll.total,
      dv: quickhack.dv,
      applied,
      effect: applied?.note ?? null,
      notes: success && !quickhack.alerts ? ["CCK.Net.Silent"] : [],
      error: result.ok ? null : gmError(result.error),
    },
    audienceFor(aware, self.actor, other.actor),
  );
}

async function jackOut(self: Actorish, other: Actorish): Promise<void> {
  if (!intrusionBy(netState(other.token.document), self.token.document.uuid)) {
    return warn("CCK.Menu.Why-not-linked");
  }
  const result = await requestGm({
    op: "netJackOut",
    attackerUuid: self.token.document.uuid,
    targetUuid: other.token.document.uuid,
  });
  if (!result.ok) return void gmError(result.error);
  ui.notifications.info(game.i18n.format("CCK.Net.JackedOut", { target: other.actor.name }));
}

function chooseIntruder(self: Actorish, runnerUuid: string | undefined): Actorish | null {
  const intruders = awareIntruders(self.token);
  const intrusion = runnerUuid
    ? intruders.find((entry) => entry.runnerUuid === runnerUuid)
    : intruders.length === 1
      ? intruders[0]
      : undefined;
  if (!intrusion) {
    warn(intruders.length > 1 ? "CCK.Net.ChooseRunner" : "CCK.Menu.Why-no-intruder");
    return null;
  }
  const token = tokenByUuid(intrusion.runnerUuid);
  if (!token?.actor) {
    warn("CCK.Gm.not-found");
    return null;
  }
  return { token, actor: token.actor };
}

async function forceOut(
  self: Actorish,
  runnerUuid: string | undefined,
  skipDialog: boolean,
): Promise<void> {
  const runner = chooseIntruder(self, runnerUuid);
  if (!runner) return;
  const skill = findSkill(self.actor, "concentration");
  if (!skill) return warn("CCK.Attack.no-skill", { skill: SKILLS.concentration });
  const title = game.i18n.localize("CCK.Mode.forceOut");
  const mine = await rollSkill(skill, { actor: self.actor, tokenId: self.token.id, skipDialog });
  if (!mine) return;
  const answer = await requestDefense(runner.actor, {
    purpose: "forceOut",
    skill: "interface",
    optional: false,
    attackerName: self.actor.name,
    defenderUuid: runner.actor.uuid,
    defenderTokenId: runner.token.id,
    weaponName: title,
    dv: null,
  });
  if (answer.choice !== "rolled") {
    return warn("CCK.Attack.no-defense", { defender: runner.actor.name });
  }
  const success = forceOutSucceeds(mine.total, answer.total);
  let error: string | null = null;
  if (success) {
    const result = await requestGm({
      op: "netForceOut",
      attackerUuid: self.token.document.uuid,
      targetUuid: runner.token.document.uuid,
    });
    if (result.ok) cue("quickhack.forceOut", self.token, runner.token);
    else error = gmError(result.error);
  }
  await postNetCard(
    self,
    runner,
    {
      mode: "forceOut",
      name: netrunning(),
      outcome: success ? "forced-out" : "net-held",
      attackTotal: mine.total,
      defense: { kind: "contest", total: answer.total },
      notes: success ? ["CCK.Net.Locked"] : [],
      error,
      rollLabel: "CCK.Net.Concentration",
    },
    audienceFor(true, runner.actor, self.actor),
  );
}

export async function quickhack(options: QuickhackOptions): Promise<void> {
  if (!quickhacksEnabled()) return warn("CCK.Net.Disabled");
  const self = acting();
  if (!self) return;
  const skipDialog = options.skipDialog ?? false;
  if (options.action === "forceOut") return forceOut(self, options.runnerUuid, skipDialog);
  const other = targetOf();
  if (!other) return;
  if (other.token === self.token) return warn("CCK.Menu.Why-self");
  switch (options.action) {
    case "jackIn":
      return jackIn(self, other, skipDialog);
    case "breach":
      return breach(self, other, skipDialog);
    case "quickhack":
      return runQuickhack(self, other, options.quickhackId, skipDialog);
    case "jackOut":
      return jackOut(self, other);
  }
}

function isExecutor(): boolean {
  return executorId() === game.user.id;
}

function advanced(prior: CombatState, current: CombatState): boolean {
  const priorRound = prior.round ?? 0;
  const currentRound = current.round ?? 0;
  if (currentRound !== priorRound) return currentRound > priorRound;
  return (current.turn ?? 0) > (prior.turn ?? 0);
}

async function burnEndedTurn(combat: Combat, prior: CombatState): Promise<void> {
  const combatant = prior.combatantId ? combat.combatants.get(prior.combatantId) : undefined;
  const actor = combatant?.actor;
  const token = combatant?.token;
  if (!actor || !token) return;
  for (const ongoing of ongoingEffects(actor)) {
    const applied = await directDamage(actor, ongoing.formula);
    const entry: TargetResult = { ...targetEntry(token.uuid, actor.name), outcome: "applied" };
    const target = { ...entry, applied: applied.hpReduction > 0 ? applied : null };
    cueDamage(null, token.id, applied);
    announceDamage({
      attackerUuid: token.uuid,
      targetUuid: token.uuid,
      source: "ongoing",
      result: applied,
    });
    await postResolution(
      newState({
        attackerUuid: token.uuid,
        attackerName: actor.name,
        weaponName: ongoing.name,
        mode: "ongoing",
        distance: null,
        attackTotal: null,
        dv: null,
        damageTotal: applied.rolled ?? null,
        multiplier: null,
        critical: false,
        targets: [target],
      }),
      ChatMessage.getSpeaker({ actor, token }),
      actor.hasPlayerOwner ? "public" : "gm",
    );
  }
}

async function onTurnChange(combat: Combat, prior: CombatState, current: CombatState) {
  if (!isExecutor() || !combat.started) return;
  if (advanced(prior, current)) await burnEndedTurn(combat, prior);
  for (const combatant of combat.combatants.contents) {
    if (combatant.actor) await removeExpired(combatant.actor, combat);
  }
}

async function dropIfFar(
  target: Token,
  distance: number | null,
  intrusion: NetIntrusion,
): Promise<void> {
  if (distance !== null && inJackInRange(distance, squareSize())) return;
  const lock = lockFor(intrusion.runnerActorUuid, game.time.worldTime);
  if (await dropIntrusion(target.document, intrusion.runnerUuid, lock)) {
    ui.notifications.info(
      game.i18n.format("CCK.Net.OutOfRange", {
        runner: intrusion.runnerName,
        target: target.actor?.name ?? target.name,
      }),
    );
  }
}

function finalCenter(document: TokenDocument, changes: Record<string, unknown>): Point {
  const size = canvas?.grid.size ?? 100;
  const x = typeof changes.x === "number" ? changes.x : document.x;
  const y = typeof changes.y === "number" ? changes.y : document.y;
  return { x: x + (document.width * size) / 2, y: y + (document.height * size) / 2 };
}

async function onTokenMoved(
  document: TokenDocument,
  changes: Record<string, unknown>,
): Promise<void> {
  const moved = tokenByUuid(document.uuid);
  if (!moved) return;
  const center = finalCenter(document, changes);
  const from = (token: Token | null) => (token ? distanceToPoint(token, center) : null);
  for (const intrusion of netState(document).intrusions) {
    await dropIfFar(moved, from(tokenByUuid(intrusion.runnerUuid)), intrusion);
  }
  for (const token of canvas?.tokens?.placeables ?? []) {
    const intrusion = intrusionBy(netState(token.document), document.uuid);
    if (intrusion) await dropIfFar(token, from(token), intrusion);
  }
}

export function initQuickhacks(): void {
  if (!quickhacksEnabled()) return;
  Hooks.on("combatTurnChange", (combat, prior, current) => {
    void onTurnChange(combat, prior, current);
  });
  Hooks.on("updateToken", (document, changes) => {
    if (!isExecutor() || !("x" in changes || "y" in changes)) return;
    if (canvas?.scene?.id !== document.parent?.id) return;
    void onTokenMoved(document, changes);
  });
}
