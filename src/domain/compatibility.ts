export interface SystemInfo {
  id: string;
  version: string;
}

export type CompatibilityResult =
  | { status: "supported" }
  | { status: "untested-version"; tested: string; found: string }
  | { status: "wrong-system"; found: string };

export function checkSystemCompatibility(
  system: SystemInfo,
  expectedId: string,
  testedVersion: string,
): CompatibilityResult {
  if (system.id !== expectedId) return { status: "wrong-system", found: system.id };
  if (system.version !== testedVersion) {
    return { status: "untested-version", tested: testedVersion, found: system.version };
  }
  return { status: "supported" };
}
