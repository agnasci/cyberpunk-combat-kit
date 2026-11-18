export const GRAPPLE_PENALTY = -2;
export const CHOKE_ROUNDS_TO_KNOCKOUT = 3;

export type GrappleRole = "attacker" | "defender";

export interface GrappleLink {
  role: GrappleRole;
  partnerUuid: string;
  chokeStreak: number;
  lastChokeRound: number | null;
}

export function contestWon(activeTotal: number, opposingTotal: number): boolean {
  return activeTotal > opposingTotal;
}

export interface ChokeOutcome {
  hpAfter: number;
  knockedOut: boolean;
  streak: number;
}

export function nextChokeStreak(link: GrappleLink, round: number | null): number {
  if (round === null || link.lastChokeRound === null) return link.chokeStreak + 1;
  return round === link.lastChokeRound + 1 ? link.chokeStreak + 1 : 1;
}

export function chokeOutcome(hpBefore: number, body: number, streak: number): ChokeOutcome {
  const raw = hpBefore - body;
  const dropsBelowZero = hpBefore > 1 && raw < 0;
  return {
    hpAfter: dropsBelowZero ? 1 : raw,
    knockedOut: dropsBelowZero || streak >= CHOKE_ROUNDS_TO_KNOCKOUT,
    streak,
  };
}
