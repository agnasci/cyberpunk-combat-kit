import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { parseArgs } from "node:util";
import { createConverter, labelIndex, slug } from "./lib/aa-convert.mjs";
import { parseAssignments } from "./lib/js-literal.mjs";

const USAGE = `Uso: node scripts/import-aa.mjs --export <autorec.json> --sounds <pasta> --animations <banco.js>
  --modules <Data/modules> --system <pasta do sistema CPR> --out <pasta do pacote>
  [--module JB2A_DnD5e] [--id aa-import] [--title "..."] [--overrides <ajustes.json>]`;

function fail(message) {
  console.error(`import-aa: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    export: { type: "string" },
    sounds: { type: "string" },
    animations: { type: "string" },
    modules: { type: "string" },
    system: { type: "string" },
    out: { type: "string" },
    module: { type: "string", default: "JB2A_DnD5e" },
    id: { type: "string", default: "aa-import" },
    title: { type: "string", default: "Animações importadas" },
    overrides: { type: "string" },
  },
});
for (const name of ["export", "sounds", "animations", "modules", "system", "out"]) {
  if (!values[name]) fail(`falta --${name}\n${USAGE}`);
}
if (!/^[A-Za-z0-9_-]{1,64}$/.test(values.module)) fail("--module inválido");
if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(values.id)) fail("--id inválido");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return fail(`não consegui ler ${path}: ${error.message}`);
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function loadAnimations(path, moduleId) {
  const text = readFileSync(path, "utf8");
  const target = /const\s+([A-Za-z0-9_$]+)\s*=\s*\{\s*\}/.exec(text)?.[1];
  if (!target) fail(`banco de animações sem objeto raiz: ${path}`);
  const root = `modules/${moduleId}`;
  const base = `${root}/Library/`;
  const env = { path: root, prefix: "modules", BASE: base };
  for (const found of text.matchAll(/const\s+(\w+)\s*=\s*prefix\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const folder = found[2];
    env[found[1]] = (rest) => `${base}${folder}/${rest}`;
  }
  try {
    return parseAssignments(text, target, env);
  } catch (error) {
    return fail(`banco de animações ilegível (${error.message})`);
  }
}

function loadSystem(dir) {
  const configPath = join(dir, "modules", "system", "config.js");
  const langPath = join(dir, "lang", "en.json");
  if (!existsSync(configPath) || !existsSync(langPath))
    fail(`sistema sem config.js ou lang/en.json em ${dir}`);
  const config = parseAssignments(readFileSync(configPath, "utf8"), "CPR", {}, [
    "ammoVarieties",
    "ammoTypes",
    "weaponTypes",
  ]);
  const lang = readJson(langPath);
  return {
    varieties: labelIndex(config.ammoVarieties, lang),
    types: labelIndex(config.ammoTypes, lang),
    weaponTypes: labelIndex(config.weaponTypes, lang),
  };
}

const exported = readJson(values.export);
const overrides =
  values.overrides && existsSync(values.overrides) ? readJson(values.overrides) : {};
const moduleDir = join(values.modules, values.module);
if (!existsSync(moduleDir)) fail(`módulo ${values.module} não encontrado em ${values.modules}`);
const available = new Set(
  walk(moduleDir).map(
    (file) => `modules/${values.module}/${relative(moduleDir, file).split(sep).join("/")}`,
  ),
);
const db = loadAnimations(values.animations, values.module);
const system = loadSystem(values.system);

const converter = createConverter({ db, available, moduleId: values.module, system, overrides });
converter.convert(exported);
converter.extend(overrides.extra);
const { cues, external, sounds, report } = converter.result();

mkdirSync(join(values.out, "sounds"), { recursive: true });
const assets = {};
const soundFiles = new Map(readdirSync(values.sounds).map((name) => [name.toLowerCase(), name]));
for (const [key, file] of Object.entries(sounds)) {
  const found = soundFiles.get(file.toLowerCase());
  if (!found) {
    report.sounds.push({ file, missing: true });
    continue;
  }
  const extension = found.split(".").pop().toLowerCase();
  const target = `sounds/${slug(found.replace(/\.[^.]+$/, ""), 60)}.${extension}`;
  copyFileSync(join(values.sounds, found), join(values.out, target));
  assets[key] = target;
}
for (const steps of Object.values(cues)) {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.type === "sound" && !(step.asset in assets)) steps.splice(index, 1);
  }
}
const filled = Object.fromEntries(Object.entries(cues).filter(([, steps]) => steps.length > 0));

const manifest = {
  id: values.id,
  version: "1.0.0",
  title: values.title,
  kinds: ["cues"],
  requires: [values.module],
  assets,
  external,
  cues: filled,
};
writeFileSync(join(values.out, "cck-pack.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const summary = {
  source: basename(values.export),
  module: values.module,
  cues: Object.keys(filled).length,
  videos: Object.keys(external).length,
  sounds: Object.keys(assets).length,
  notes: report.videos.reduce((count, entry) => {
    const kind = entry.note.split(":")[0];
    count[kind] = (count[kind] ?? 0) + 1;
    return count;
  }, {}),
};
writeFileSync(
  join(values.out, "import-report.json"),
  `${JSON.stringify({ summary, ...report }, null, 2)}\n`,
);
console.log(
  `import-aa: ${summary.cues} efeitos, ${summary.videos} vídeos, ${summary.sounds} sons em ${values.out}`,
);
console.log(
  `import-aa: vídeos ${JSON.stringify(summary.notes)}; pelo nome do item ${report.byItemName.length}; munição sem casamento ${report.ammoUnmatched.length}; ignorados ${report.skipped.length}`,
);
