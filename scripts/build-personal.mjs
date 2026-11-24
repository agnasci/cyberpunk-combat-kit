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

const PACK_FILE = "cck-pack.json";
const SKIP_IN_BUILD = new Set(["overrides.json", "import-report.json"]);
const copyPack = (from, to) =>
  cpSync(from, join(PERSONAL_OUT, to), {
    recursive: true,
    filter: (source) => !SKIP_IN_BUILD.has(source.split(/[\\/]/).pop()),
  });
const personalFolders = [];
const packsRoot = join(PRIVATE, "packs");
if (existsSync(packsRoot)) {
  for (const entry of readdirSync(packsRoot, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!entry.isDirectory() || !existsSync(join(packsRoot, entry.name, PACK_FILE))) continue;
    copyPack(join(packsRoot, entry.name), `personal-packs/${entry.name}`);
    personalFolders.push(`personal-packs/${entry.name}`);
  }
}
const packDir = join(PRIVATE, "pack");
if (existsSync(packDir)) {
  copyPack(packDir, "personal");
  personalFolders.push("personal");
}

const manifestPath = join(PERSONAL_OUT, "module.json");
const manifest = mergeManifest(JSON.parse(readFileSync(manifestPath, "utf8")), overlay);
delete manifest.manifest;
delete manifest.download;
if (personalFolders.length > 0) {
  const flags = manifest.flags ?? {};
  manifest.flags = {
    ...flags,
    [manifest.id]: { ...flags[manifest.id], personalPacks: personalFolders },
  };
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const compendiumSrc = join(PRIVATE, "compendium", "src");
const hasCompendium =
  existsSync(compendiumSrc) &&
  readdirSync(compendiumSrc, { withFileTypes: true }).some((entry) => entry.isDirectory());
if (hasCompendium) {
  console.warn("build:personal: compilação do compêndio pessoal ainda não implementada (P-03).");
}

console.log(`build:personal: edição pessoal ${manifest.version} em dist-personal/.`);
