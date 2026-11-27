export interface InitiativeCandidate {
  id: string;
  initiative: number | null;
  owner: boolean;
  activePlayerOwner: boolean;
  defeated: boolean;
}

export function initiativeToRoll(
  candidates: readonly InitiativeCandidate[],
  isGM: boolean,
): string[] {
  return candidates
    .filter((candidate) => candidate.initiative === null && !candidate.defeated)
    .filter((candidate) => (isGM ? !candidate.activePlayerOwner : candidate.owner))
    .map((candidate) => candidate.id);
}

export function combatJustStarted(
  changedRound: unknown,
  previousRound: number | null | undefined,
): boolean {
  return changedRound === 1 && (previousRound ?? 0) === 0;
}
