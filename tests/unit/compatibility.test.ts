import { describe, expect, it } from "vitest";
import { checkSystemCompatibility } from "../../src/domain/compatibility";

const CPR = "cyberpunk-red-core";
const TESTED = "v0.92.4";

describe("checkSystemCompatibility", () => {
  it("aceita o sistema e a versão testados", () => {
    expect(checkSystemCompatibility({ id: CPR, version: TESTED }, CPR, TESTED)).toEqual({
      status: "supported",
    });
  });

  it("avisa sobre versão não testada", () => {
    expect(checkSystemCompatibility({ id: CPR, version: "v0.93.0" }, CPR, TESTED)).toEqual({
      status: "untested-version",
      tested: TESTED,
      found: "v0.93.0",
    });
  });

  it("recusa outro sistema", () => {
    expect(checkSystemCompatibility({ id: "dnd5e", version: "4.0.0" }, CPR, TESTED)).toEqual({
      status: "wrong-system",
      found: "dnd5e",
    });
  });
});
