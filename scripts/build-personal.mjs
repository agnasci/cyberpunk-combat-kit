import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PRIVATE = join(ROOT, "private");
const PUBLIC_OUT = join(ROOT, "dist");
const PERSONAL_OUT = join(ROOT, "dist-personal");
const PERSONAL_SUFFIX = "-personal";

function fail(message) {
  console.error(`build:personal: ${message}`);
  process.exit(1);
}

function mergeManifest(base, overlay) {
  const entries = Object.entries({ ...base, ...overlay });
  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

if (!existsSync(PRIVATE))
  fail("pasta private/ não encontrada; crie-a a partir de private.example/.");

const overlayPath = join(PRIVATE, "module.personal.json");
if (!existsSync(overlayPath)) fail("private/module.personal.json não encontrado.");
const overlay = JSON.parse(readFileSync(overlayPath, "utf8"));
if (typeof overlay.version !== "string" || !overlay.version.endsWith(PERSONAL_SUFFIX)) {
  fail(`a versão em module.personal.json precisa terminar em "${PERSONAL_SUFFIX}".`);
}

execFileSync(process.execPath, [join(ROOT, "node_modules", "vite", "bin", "vite.js"), "build"], {
  cwd: ROOT,
  stdio: "inherit",
});

rmSync(PERSONAL_OUT, { recursive: true, force: true });
cpSync(PUBLIC_OUT, PERSONAL_OUT, { recursive: true });

const packDir = join(PRIVATE, "pack");
if (existsSync(packDir)) cpSync(packDir, join(PERSONAL_OUT, "personal"), { recursive: true });

const manifestPath = join(PERSONAL_OUT, "module.json");
const manifest = mergeManifest(JSON.parse(readFileSync(manifestPath, "utf8")), overlay);
delete manifest.manifest;
delete manifest.download;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const compendiumSrc = join(PRIVATE, "compendium", "src");
const hasCompendium =
  existsSync(compendiumSrc) &&
  readdirSync(compendiumSrc, { withFileTypes: true }).some((entry) => entry.isDirectory());
if (hasCompendium) {
  console.warn("build:personal: compilação do compêndio pessoal ainda não implementada (P-03).");
}

console.log(`build:personal: edição pessoal ${manifest.version} em dist-personal/.`);
