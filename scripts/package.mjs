import { Buffer } from "node:buffer";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const DIST = "dist";
const OUT = "release";
const REQUIRED = ["module.json", "scripts/main.js", "styles/combat-kit.css", "lang/en.json"];

function fail(message) {
  console.error(`package: ${message}`);
  process.exit(1);
}

function filesIn(folder) {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

function dosStamp(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, day } = dosStamp(new Date());
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const packed = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync(join(DIST, "module.json"), "utf8"));
if (manifest.version !== pkg.version) {
  fail(`module.json ${manifest.version} differs from package.json ${pkg.version}`);
}
if (!manifest.manifest || !manifest.download) fail("module.json needs manifest and download");
if (!manifest.download.includes(`/v${manifest.version}/`)) {
  fail(`download URL does not point to v${manifest.version}`);
}

const files = filesIn(DIST)
  .map((path) => relative(DIST, path).split(sep).join("/"))
  .sort();
for (const name of REQUIRED) if (!files.includes(name)) fail(`missing ${name}`);

const entries = files.map((name) => ({ name, data: readFileSync(join(DIST, name)) }));
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "module.zip"), zip(entries));
writeFileSync(join(OUT, "module.json"), readFileSync(join(DIST, "module.json")));
for (const entry of entries) console.log(`  ${entry.name} (${entry.data.length} B)`);
console.log(`package: ${OUT}/module.zip with ${entries.length} files, v${manifest.version}`);
