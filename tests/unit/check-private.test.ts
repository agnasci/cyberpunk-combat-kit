import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = resolve("scripts/check-private.mjs");

let root = "";

function write(path: string, content: string): void {
  const full = join(root, path);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function runCheck(): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function git(...args: string[]): void {
  spawnSync("git", args, { cwd: root, encoding: "utf8" });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cck-private-"));
  git("init", "-q");
  write(".gitignore", "private/\ndist/\ndist-personal/\n");
  write("src/main.ts", "export const ready = true;\n");
  write("private.example/pack/cck-pack.json", JSON.stringify({ quickhacks: [{ id: "exemplo" }] }));
  write("docs/EFFECTS.md", "Exemplo fictício: exemplo.\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("check-private (docs/PERSONAL.md, guardas)", () => {
  it("passa sem private/", () => {
    expect(runCheck().status).toBe(0);
  });

  it("falha quando um id do pacote pessoal aparece em src/ e passa depois de removido", () => {
    write("private/pack/cck-pack.json", JSON.stringify({ quickhacks: [{ id: "segredo-teste" }] }));
    write("src/leak.ts", 'export const id = "segredo-teste";\n');
    const leaked = runCheck();
    expect(leaked.status).toBe(1);
    expect(leaked.output).toContain("segredo-teste");

    rmSync(join(root, "src/leak.ts"));
    expect(runCheck().status).toBe(0);
  });

  it("falha quando o nome de um arquivo pessoal é referenciado em src/", () => {
    write("private/pack/icons/icone-pessoal.webp", "binario");
    write("src/icon.ts", 'export const icon = "icons/icone-pessoal.webp";\n');
    expect(runCheck().status).toBe(1);
  });

  it("aceita docs que citam o nome de um arquivo de terceiros guardado em private/", () => {
    write("private/pack/sounds/alerta-terceiro.wav", "audio");
    write("docs/PERSONAL.md", "Sons do módulo de referência: alerta-terceiro.wav.\n");
    expect(runCheck().status).toBe(0);
  });

  it("falha quando um id pessoal aparece em docs/", () => {
    write("private/pack/cck-pack.json", JSON.stringify({ quickhacks: [{ id: "segredo-doc" }] }));
    write("docs/RULES.md", "segredo-doc\n");
    expect(runCheck().status).toBe(1);
  });

  it("falha quando um arquivo de private/ é copiado para dist/", () => {
    write("private/pack/sounds/alerta.wav", "conteudo-de-audio-pessoal");
    write("dist/sounds/renomeado.wav", "conteudo-de-audio-pessoal");
    const leaked = runCheck();
    expect(leaked.status).toBe(1);
    expect(leaked.output).toContain("dist/sounds/renomeado.wav");
  });

  it("falha quando há arquivo de private/ versionado", () => {
    write("private/pack/cck-pack.json", "{}");
    git("add", "-f", "private/pack/cck-pack.json");
    expect(runCheck().status).toBe(1);
  });

  it("ignora ids e arquivos que vêm do modelo private.example/", () => {
    write("private/pack/cck-pack.json", JSON.stringify({ quickhacks: [{ id: "exemplo" }] }));
    expect(runCheck().status).toBe(0);
  });
});
