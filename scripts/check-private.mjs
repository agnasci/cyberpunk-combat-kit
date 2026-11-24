import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PRIVATE_DIRS = ["private", "dist-personal"];
const PUBLIC_BUILD = "dist";
const TEMPLATE_DIR = "private.example";
const SHIPPED_DIRS = ["src", "lang", "templates", "styles", "dist"];
const MIN_TOKEN_LENGTH = 4;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ogg",
  ".mp3",
  ".wav",
  ".webm",
  ".mp4",
  ".woff",
  ".woff2",
  ".zip",
  ".ldb",
  ".pdf",
]);

function toPosix(path) {
  return path.split(sep).join("/");
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function collectPackIds(manifest) {
  const ids = [];
  if (!manifest || typeof manifest !== "object") return ids;
  for (const entry of Array.isArray(manifest.quickhacks) ? manifest.quickhacks : []) {
    if (entry && typeof entry.id === "string") ids.push(entry.id);
  }
  for (const key of Object.keys(manifest.assets ?? {})) ids.push(key);
  for (const key of Object.keys(manifest.external ?? {})) ids.push(key);
  return ids;
}

function collectDocumentIds(value, ids) {
  if (Array.isArray(value)) {
    for (const item of value) collectDocumentIds(item, ids);
    return ids;
  }
  if (!value || typeof value !== "object") return ids;
  for (const [key, inner] of Object.entries(value)) {
    if ((key === "_id" || key === "quickhackId") && typeof inner === "string") ids.push(inner);
    else collectDocumentIds(inner, ids);
  }
  return ids;
}

function privateTokens(root) {
  const privateRoot = join(root, "private");
  const templateRoot = join(root, TEMPLATE_DIR);
  const templateTokens = new Set(
    collectPackIds(readJson(join(templateRoot, "pack", "cck-pack.json"))),
  );
  for (const file of walk(templateRoot)) templateTokens.add(basename(file));

  const ids = new Set(collectPackIds(readJson(join(privateRoot, "pack", "cck-pack.json"))));
  for (const file of walk(join(privateRoot, "packs"))) {
    if (basename(file) === "cck-pack.json")
      collectPackIds(readJson(file)).forEach((id) => ids.add(id));
  }
  for (const file of walk(join(privateRoot, "compendium", "src"))) {
    if (file.endsWith(".json")) collectDocumentIds(readJson(file), []).forEach((id) => ids.add(id));
  }
  const fileNames = new Set(walk(privateRoot).map((file) => basename(file)));

  const keep = (token) => token.length >= MIN_TOKEN_LENGTH && !templateTokens.has(token);
  return { ids: [...ids].filter(keep), fileNames: [...fileNames].filter(keep) };
}

function tokenPattern(tokens) {
  if (tokens.length === 0) return null;
  return new RegExp(`(?<![\\w-])(${tokens.map(escapeRegExp).join("|")})(?![\\w-])`);
}

function isShippedPath(relativePath) {
  return SHIPPED_DIRS.some((dir) => relativePath.startsWith(`${dir}/`));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isTextCandidate(path) {
  const lower = path.toLowerCase();
  for (const extension of BINARY_EXTENSIONS) if (lower.endsWith(extension)) return false;
  return statSync(path).size <= MAX_TEXT_BYTES;
}

export function findLeaks(root) {
  const problems = [];

  const trackedPrivate = git(root, ["ls-files", "--", ...PRIVATE_DIRS]);
  for (const file of trackedPrivate) problems.push(`versionado em pasta privada: ${file}`);

  const publicFiles = [
    ...git(root, ["ls-files", "--cached", "--others", "--exclude-standard"]).map((file) =>
      join(root, file),
    ),
    ...walk(join(root, PUBLIC_BUILD)),
  ].filter((file) => existsSync(file));

  const privateFiles = walk(join(root, "private")).filter((file) => statSync(file).size > 0);
  if (privateFiles.length === 0) return problems;

  const templateHashes = new Set(walk(join(root, TEMPLATE_DIR)).map(hashFile));
  const privateHashes = new Map();
  for (const file of privateFiles) {
    const hash = hashFile(file);
    if (!templateHashes.has(hash)) privateHashes.set(hash, file);
  }

  const tokens = privateTokens(root);
  const idPattern = tokenPattern(tokens.ids);
  const fileNamePattern = tokenPattern(tokens.fileNames);

  for (const file of publicFiles) {
    const shown = toPosix(relative(root, file));
    const source = privateHashes.get(hashFile(file));
    if (source) {
      problems.push(`cópia de ${toPosix(relative(root, source))} em ${shown}`);
      continue;
    }
    if (!isTextCandidate(file)) continue;
    const text = readFileSync(file, "utf8");
    const patterns = isShippedPath(shown) ? [idPattern, fileNamePattern] : [idPattern];
    for (const pattern of patterns) {
      const match = pattern?.exec(text);
      if (match) {
        problems.push(`referência privada "${match[1]}" em ${shown}`);
        break;
      }
    }
  }

  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const root = process.argv[2] ?? process.cwd();
  const problems = findLeaks(root);
  if (problems.length > 0) {
    console.error("check-private: conteúdo pessoal fora de private/:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("check-private: nenhum vazamento encontrado.");
}
