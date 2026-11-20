export interface DeathSaveCandidate {
  id: string;
  npc: boolean;
  mortallyWounded: boolean;
  defeated: boolean;
}

export function npcDeathSaves(candidates: readonly DeathSaveCandidate[]): string[] {
  return candidates
    .filter((candidate) => candidate.npc && candidate.mortallyWounded && !candidate.defeated)
    .map((candidate) => candidate.id);
}
