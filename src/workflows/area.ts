import { attackBlocker, canDodge, resolveAttack, type Defense } from "../domain/attack-rules";
import { postResolution } from "./announce";
import {
  explosionSquare,
  shellArea,
  withinSquare,
  type AreaShape,
  type Point,
} from "../domain/area";
import { EXPLOSION_SIDE, SHELL_DV, SHELL_RANGE } from "../domain/modes";
import { resolutionAudience } from "../domain/routing";
import { rollDamage, type NativeRollOptions } from "../integrations/cpr/attack-adapter";
import { combatantSnapshot, findItem } from "../integrations/cpr/weapon-adapter";
import {
  placeArea,
  removeArea,
  showArea,
  snapToCenter,
  tokensInArea,
} from "../integrations/foundry/area-placement";
import {
  distanceToPoint,
  pixelsPerUnit,
  restingCenter,
  squareSize,
  targetedTokens,
  tokenForUuid,
} from "../integrations/foundry/tokens";
import { showPlacementHint } from "../ui/placement-hint";
import {
  newState,
  updateCard,
  type ResolutionState,
  type TargetResult,
} from "../ui/resolution-card";
import { dvLookup, nativeAttack } from "./attack-steps";
import { cueArea, cueFire, cueOutcomes, qualifiersFor } from "./combat-cues";
import {
  applicationFor,
  applyTo,
  speakerFor,
  targetEntry,
  warn,
  type AttackContext,
} from "./combat-common";
import { requestDefense, type DefenseRequest } from "./defense";

async function choose(
  hintKey: string,
  make: (point: Point) => AreaShape,
  initial: Point,
  allowed?: (point: Point) => boolean,
): Promise<AreaShape | null> {
  const hide = showPlacementHint(hintKey);
  try {
    return await placeArea(make, initial, allowed);
  } finally {
    hide();
  }
}

async function withArea<T>(area: AreaShape, run: () => Promise<T>): Promise<T> {
  const template = await showArea(area);
  cueArea("area.place", area.t === "rect" ? blastCenter(area) : area);
  try {
    return await run();
  } finally {
    removeArea(template);
  }
}

function initialPoint(context: AttackContext): Point {
  const [target] = targetedTokens().filter((token) => token !== context.token);
  if (target) return restingCenter(target);
  const origin = restingCenter(context.token);
  return { x: origin.x + SHELL_RANGE * pixelsPerUnit(), y: origin.y };
}

function rangedBlocker(context: AttackContext): string | null {
  return attackBlocker({
    hasWeapon: true,
    equipped: context.weapon.equipped,
    kind: "ranged",
    magazine: context.weapon.magazine,
    inRange: true,
  });
}

function blastCenter(area: AreaShape): Point {
  const half = ((area.distance / Math.SQRT2) * pixelsPerUnit()) / 2;
  return { x: area.x + half, y: area.y + half };
}

function blastAt(point: Point): AreaShape {
  return explosionSquare(snapToCenter(point), EXPLOSION_SIDE, pixelsPerUnit());
}

interface Defended {
  token: Token;
  actor: Actor;
  entry: TargetResult;
  dodge: number | null;
}

async function gatherDodges(
  tokens: Token[],
  base: Omit<DefenseRequest, "defenderUuid" | "defenderTokenId">,
): Promise<Defended[]> {
  return Promise.all(
    tokens.map(async (token) => {
      const actor = token.actor as Actor;
      const snapshot = combatantSnapshot(actor);
      const entry = targetEntry(snapshot.uuid, snapshot.name);
      if (!canDodge("ranged", snapshot.ref)) return { token, actor, entry, dodge: null };
      const answer = await requestDefense(actor, {
        ...base,
        defenderUuid: snapshot.uuid,
        defenderTokenId: token.id,
      });
      return { token, actor, entry, dodge: answer.choice === "rolled" ? answer.total : null };
    }),
  );
}

interface DamageSummary {
  targets: TargetResult[];
  damageTotal: number | null;
  critical: boolean;
}

async function damageAll(
  attackerUuid: string,
  item: Item,
  roll: NativeRollOptions,
  targets: TargetResult[],
): Promise<DamageSummary> {
  if (!targets.some((target) => target.outcome === "hit")) {
    return { targets, damageTotal: null, critical: false };
  }
  const damage = await rollDamage(item, "attack", roll);
  if (!damage) return { targets, damageTotal: null, critical: false };
  const application = applicationFor(damage, true);
  const results: TargetResult[] = [];
  for (const target of targets) {
    results.push(
      target.outcome === "hit" ? await applyTo(attackerUuid, target, application) : target,
    );
  }
  return { targets: results, damageTotal: damage.total, critical: damage.critical };
}

function areaAudience(attackerIsNpc: boolean, actors: Actor[]) {
  const allNpc = actors.every((actor) => !actor.hasPlayerOwner);
  return resolutionAudience(attackerIsNpc, allNpc);
}

export async function shellAttack(context: AttackContext): Promise<void> {
  const blocker = rangedBlocker(context);
  if (blocker) return warn(`CCK.Attack.${blocker}`);
  const origin = restingCenter(context.token);
  const start = (context.token.document.width * squareSize()) / 2;
  const area = await choose(
    "CCK.Area.PlaceShell",
    (point) => shellArea(origin, point, SHELL_RANGE, start, pixelsPerUnit()),
    initialPoint(context),
  );
  if (!area) return;
  const tokens = tokensInArea(area, { exclude: context.token, sightFrom: origin });
  if (tokens.length === 0) return warn("CCK.Area.empty");

  await withArea(area, async () => {
    const attackRoll = await nativeAttack(context);
    if (!attackRoll) return;
    cueFire(context, tokens);
    let targets: TargetResult[];
    if (attackRoll.total <= SHELL_DV) {
      targets = tokens.map((token) => {
        const snapshot = combatantSnapshot(token.actor as Actor);
        return {
          ...targetEntry(snapshot.uuid, snapshot.name),
          defense: { kind: "dv", value: SHELL_DV },
        };
      });
    } else {
      const defended = await gatherDodges(tokens, {
        purpose: "ranged",
        skill: "evasion",
        optional: true,
        attackerName: context.attacker.name,
        weaponName: context.weapon.name,
        dv: SHELL_DV,
      });
      targets = defended.map(({ entry, dodge }) => {
        const defense: Defense =
          dodge === null ? { kind: "dv", value: SHELL_DV } : { kind: "dodge", total: dodge };
        const hit = resolveAttack(attackRoll.total, defense).hit;
        return { ...entry, defense, outcome: hit ? "hit" : dodge === null ? "miss" : "dodged" };
      });
    }
    const summary = await damageAll(context.attacker.uuid, context.item, context.roll, targets);
    await postResolution(
      newState({
        attackerUuid: context.attacker.uuid,
        attackerName: context.attacker.name,
        weaponName: context.weapon.name,
        mode: "shell",
        distance: null,
        attackTotal: attackRoll.total,
        dv: null,
        damageTotal: summary.damageTotal,
        multiplier: null,
        critical: summary.critical,
        targets: summary.targets,
      }),
      speakerFor(context),
      areaAudience(
        context.attacker.isNpc,
        tokens.map((token) => token.actor as Actor),
      ),
    );
    cueOutcomes(context.token, qualifiersFor(context), summary.targets, summary.critical);
  });
}

interface Detonation {
  attackerUuid: string;
  attackerName: string;
  item: Item;
  weaponName: string;
  attackTotal: number;
  roll: NativeRollOptions;
}

async function detonate(area: AreaShape, detonation: Detonation) {
  cueArea("area.detonate", blastCenter(area));
  const tokens = tokensInArea(area, { sightFrom: blastCenter(area) });
  const defended = await gatherDodges(tokens, {
    purpose: "area",
    skill: "evasion",
    optional: true,
    attackerName: detonation.attackerName,
    weaponName: detonation.weaponName,
    dv: detonation.attackTotal,
  });
  const targets = defended.map(({ entry, dodge }): TargetResult => {
    if (dodge === null) return { ...entry, outcome: "hit" };
    const defense: Defense = { kind: "dodge", total: dodge };
    return {
      ...entry,
      defense,
      outcome: resolveAttack(detonation.attackTotal, defense).hit ? "hit" : "dodged",
    };
  });
  const summary = await damageAll(
    detonation.attackerUuid,
    detonation.item,
    detonation.roll,
    targets,
  );
  return { ...summary, actors: tokens.map((token) => token.actor as Actor) };
}

export async function explosiveAttack(context: AttackContext): Promise<void> {
  const blocker = rangedBlocker(context);
  if (blocker) return warn(`CCK.Attack.${blocker}`);
  const lookup = await dvLookup(context);
  if (lookup === "no-table") return warn("CCK.Attack.no-table");
  const inRange = (point: Point) =>
    lookup(distanceToPoint(context.token, snapToCenter(point))) !== null;
  const area = await choose("CCK.Area.PlaceExplosion", blastAt, initialPoint(context), inRange);
  if (!area) return;
  const center = blastCenter(area);
  const distance = distanceToPoint(context.token, center);
  const dv = lookup(distance);
  if (dv === null) return warn("CCK.Attack.out-of-range");

  await withArea(area, async () => {
    const attackRoll = await nativeAttack(context);
    if (!attackRoll) return;
    cueFire(context, [], center);
    const base = {
      attackerUuid: context.attacker.uuid,
      attackerName: context.attacker.name,
      weaponName: context.weapon.name,
      mode: "explosion",
      distance: Number.isFinite(distance) ? distance : null,
      attackTotal: attackRoll.total,
      dv,
      multiplier: null,
    };
    if (attackRoll.total <= dv) {
      await postResolution(
        newState({
          ...base,
          damageTotal: null,
          critical: false,
          notes: ["CCK.Explosion.Missed"],
          pending: {
            center,
            attackerTokenUuid: context.token.document.uuid,
            weaponId: context.weapon.id,
            attackTotal: attackRoll.total,
          },
        }),
        speakerFor(context),
        "public",
      );
      return;
    }
    const result = await detonate(area, {
      attackerUuid: context.attacker.uuid,
      attackerName: context.attacker.name,
      item: context.item,
      weaponName: context.weapon.name,
      attackTotal: attackRoll.total,
      roll: context.roll,
    });
    await postResolution(
      newState({
        ...base,
        damageTotal: result.damageTotal,
        critical: result.critical,
        targets: result.targets,
      }),
      speakerFor(context),
      areaAudience(context.attacker.isNpc, result.actors),
    );
    cueOutcomes(context.token, qualifiersFor(context), result.targets, result.critical);
  });
}

export async function detonatePending(message: ChatMessage, state: ResolutionState): Promise<void> {
  const pending = state.pending;
  if (!pending || !game.user.isGM) return;
  const attackerToken = (await fromUuid(pending.attackerTokenUuid)) as TokenDocument | null;
  const actor = attackerToken?.actor ?? null;
  const item = actor ? findItem(actor, pending.weaponId) : undefined;
  if (!pending.center || !attackerToken || !actor || !item) return warn("CCK.Gm.not-found");
  const intended = pending.center;
  const area = await choose("CCK.Area.PlaceLanding", blastAt, intended, (point) =>
    withinSquare(intended, EXPLOSION_SIDE, pixelsPerUnit(), snapToCenter(point)),
  );
  if (!area) return;
  await withArea(area, async () => {
    const result = await detonate(area, {
      attackerUuid: state.attackerUuid,
      attackerName: state.attackerName,
      item,
      weaponName: state.weaponName,
      attackTotal: pending.attackTotal,
      roll: { actor, tokenId: attackerToken.id, skipDialog: false },
    });
    await updateCard(message, {
      ...state,
      pending: null,
      notes: [...state.notes, "CCK.Explosion.Detonated"],
      damageTotal: result.damageTotal,
      critical: result.critical,
      targets: result.targets,
    });
    cueOutcomes(tokenForUuid(pending.attackerTokenUuid), [], result.targets, result.critical);
  });
}
