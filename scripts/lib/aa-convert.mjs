import { createHash } from "node:crypto";

export const TEMPLATES = {
  ranged: [200, 200, 200],
  melee: [200, 300, 300],
};

const MENUS = ["melee", "range", "preset", "aefx"];
const MAX_SCALE = 10;
const AREA_SIDE_SQUARES = 5;

export function slug(text, max = 40) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

function singular(word) {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function normalizeLabel(text) {
  return slug(text, 80)
    .split("-")
    .filter((word) => word && word !== "ammo" && word !== "weapon" && word !== "weapons")
    .map(singular)
    .join("-");
}

export function labelIndex(ids, lang) {
  const index = new Map();
  for (const [id, key] of Object.entries(ids ?? {})) {
    const label = lang[key];
    if (typeof label === "string") index.set(normalizeLabel(label), id);
    index.set(normalizeLabel(id.replace(/([a-z])([A-Z])/g, "$1 $2")), id);
  }
  return index;
}

export function classify(label, system) {
  const ammo = /^(.+?)\s*\((.+?)\)\s*(no template)?$/i.exec(label.trim());
  if (ammo) {
    const variety = system.varieties.get(normalizeLabel(ammo[1]));
    const type = system.types.get(normalizeLabel(ammo[2]));
    if (variety && type) {
      return { kind: "ammo", qualifier: `ammo-${variety}-${type}`, variety, noTemplate: !!ammo[3] };
    }
  }
  const weaponType = system.weaponTypes.get(normalizeLabel(label));
  if (weaponType) return { kind: "weaponType", qualifier: weaponType };
  return { kind: "item", qualifier: `item-${slug(label)}`, looksLikeAmmo: !!ammo };
}

function flatten(node) {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node && typeof node === "object") {
    return Object.entries(node)
      .filter(([key]) => !key.startsWith("_"))
      .flatMap(([, value]) => flatten(value));
  }
  return [];
}

function usable(files, available) {
  return files.length > 0 && files.every((file) => available.has(file));
}

export function resolveVideo(video, context) {
  if (!video) return null;
  const { db, available, moduleId, overrides } = context;
  const key = video.enableCustom
    ? `custom:${video.customPath ?? ""}`
    : [video.dbSection, video.menuType, video.animation, video.variant, video.color].join(".");
  const forced = overrides.videos?.[key];
  if (typeof forced === "string" && !forced.includes("/")) {
    const [dbSection, menuType, animation, variant, color] = forced.split(".");
    const inner = { dbSection, menuType, animation, variant, color, enableCustom: false };
    const resolved = resolveVideo(inner, { ...context, overrides: {} });
    return {
      key,
      files: resolved?.files ?? [],
      note: resolved?.files.length ? "override" : "missing",
    };
  }
  if (forced) return { key, files: [forced].flat(), note: "override" };
  if (video.enableCustom) {
    const path = String(video.customPath ?? "");
    if (!path) return { key, files: [], note: "empty" };
    if (available.has(path)) return { key, files: [path], note: "exact" };
    const moved = path.replace(/^modules\/[^/]+\//, `modules/${moduleId}/`);
    if (available.has(moved)) return { key, files: [moved], note: "module" };
    const base = path.split("/").pop()?.toLowerCase();
    const byName = [...available].find((file) => file.split("/").pop()?.toLowerCase() === base);
    return byName ? { key, files: [byName], note: "name" } : { key, files: [], note: "missing" };
  }
  const animation = db[video.dbSection]?.[video.menuType]?.[video.animation];
  if (!animation) return { key, files: [], note: "no-key" };
  const variant = animation[video.variant];
  const exact = variant ? flatten(variant[video.color]) : [];
  if (usable(exact, available)) return { key, files: exact, note: "exact" };
  if (variant) {
    for (const color of Object.keys(variant).filter((name) => !name.startsWith("_"))) {
      const files = flatten(variant[color]);
      if (usable(files, available)) return { key, files, note: `color:${color}` };
    }
  }
  for (const other of Object.keys(animation).filter((name) => !name.startsWith("_"))) {
    const colors = animation[other];
    for (const color of Object.keys(colors ?? {}).filter((name) => !name.startsWith("_"))) {
      const files = flatten(colors[color]);
      if (usable(files, available)) return { key, files, note: `variant:${other}.${color}` };
    }
  }
  return { key, files: [], note: "missing" };
}

function shortHash(text) {
  return createHash("sha1").update(text).digest("hex").slice(0, 6);
}

function videoKey(files) {
  const base = (files[0] ?? "").split("/").pop() ?? "";
  const stem = base.replace(/_\d{1,3}ft_.*$/i, "").replace(/\.[a-z0-9]+$/i, "");
  return `v-${slug(stem, 30)}-${shortHash(files.join("|"))}`;
}

function soundKey(file) {
  return `s-${slug(file.replace(/\.[a-z0-9]+$/i, ""), 34)}-${shortHash(file)}`;
}

function soundFile(sound) {
  if (!sound?.enable || !sound.file) return null;
  return decodeURIComponent(String(sound.file)).split("/").pop() ?? null;
}

function clampScale(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(MAX_SCALE, Math.max(0.1, number)) : 1;
}

function timing(options, delayKey = "delay") {
  const out = {};
  const delay = Number(options?.[delayKey] ?? 0);
  const repeat = Math.round(Number(options?.repeat ?? 1));
  if (delay > 0) out.delay = Math.min(5000, delay);
  if (repeat > 1) {
    out.repeat = Math.min(10, repeat);
    out.repeatDelay = Math.min(5000, Number(options?.repeatDelay ?? 250));
  }
  return out;
}

export function createConverter({ db, available, moduleId, system, overrides = {} }) {
  const assets = new Map();
  const external = new Map();
  const sounds = new Map();
  const cues = new Map();
  const report = {
    converted: [],
    skipped: [],
    videos: [],
    byItemName: [],
    ammoUnmatched: [],
    sounds: [],
  };
  const context = { db, available, moduleId, overrides };

  function videoStep(video, label, step) {
    const resolved = resolveVideo(video, context);
    if (!resolved) return null;
    report.videos.push({ entry: label, key: resolved.key, note: resolved.note });
    if (resolved.files.length === 0) {
      return step.fallback
        ? { type: "procedural", effect: step.fallback, at: step.fallbackAt, scale: 1 }
        : null;
    }
    const files = resolved.files.slice(0, 8);
    const key = videoKey(files);
    external.set(key, files.length === 1 ? files[0] : files);
    const out = { type: "sprite", asset: key, at: step.at };
    if (step.template) out.template = step.template;
    if (step.fallback) out.fallback = step.fallback;
    if (step.scale !== undefined && step.scale !== 1) out.scale = clampScale(step.scale);
    if (step.persist) out.persist = true;
    const options = step.options ?? {};
    if (Number(options.opacity ?? 1) < 1) out.opacity = Number(options.opacity);
    if (Number(options.playbackRate ?? 1) !== 1) out.playbackRate = Number(options.playbackRate);
    if (options.randomOffset) out.randomOffset = true;
    Object.assign(out, timing(options));
    return out;
  }

  function soundStep(sound, label) {
    const file = soundFile(sound);
    if (!file) return null;
    const key = soundKey(file);
    sounds.set(key, file);
    report.sounds.push({ entry: label, file });
    const out = { type: "sound", asset: key };
    const volume = Number(sound.volume ?? 1);
    if (volume !== 1) out.volume = Math.max(0, Math.min(1.5, volume));
    const start = Number(sound.startTime ?? 0);
    if (start > 0) out.startTime = Math.min(10000, start);
    Object.assign(out, timing(sound));
    return out;
  }

  function addCue(key, steps, label) {
    const clean = steps.filter(Boolean).slice(0, 8);
    if (clean.length === 0) return;
    if (cues.has(key)) {
      report.skipped.push({ entry: label, reason: `duplicate:${key}` });
      return;
    }
    cues.set(key, clean);
    report.converted.push({ entry: label, key });
  }

  function cueKey(menu, label, fallback, target) {
    const id = `${menu}:${label}`;
    if (overrides.keys && id in overrides.keys) return overrides.keys[id];
    if (target?.kind === "item") {
      (target.looksLikeAmmo ? report.ammoUnmatched : report.byItemName).push(id);
    }
    return fallback;
  }

  function convertAttack(entry, menu) {
    const label = `${menu}:${entry.label}`;
    const target = classify(entry.label, system);
    if (target.kind === "ammo" && target.noTemplate) {
      report.skipped.push({ entry: label, reason: "covered-by-preset" });
      return;
    }
    if (overrides.keys?.[`${menu}:${entry.label}`] === null) {
      report.skipped.push({ entry: label, reason: "override-null" });
      return;
    }
    const melee = menu === "melee";
    const key = cueKey(menu, entry.label, `attack.fire:${target.qualifier}`, target);
    if (!key) return report.skipped.push({ entry: label, reason: "override-null" });
    const primary = entry.primary ?? {};
    const steps = [
      videoStep(primary.video, label, {
        at: "path",
        template: melee ? TEMPLATES.melee : TEMPLATES.ranged,
        fallback: melee ? "impact" : "tracer",
        fallbackAt: melee ? "target" : "path",
        options: primary.options,
      }),
      soundStep(primary.sound, label),
    ];
    if (entry.secondary?.enable) {
      steps.push(
        videoStep(entry.secondary.video, label, {
          at: "target",
          scale: entry.secondary.options?.size,
          options: entry.secondary.options,
        }),
        soundStep(entry.secondary.sound, label),
      );
    }
    addCue(key, steps, label);
  }

  function convertPreset(entry) {
    const label = `preset:${entry.label}`;
    if (entry.presetType !== "proToTemp") {
      report.skipped.push({ entry: label, reason: `preset:${entry.presetType}` });
      return;
    }
    const target = classify(entry.label, system);
    const data = entry.data ?? {};
    const fire = cueKey("preset", entry.label, `attack.fire:${target.qualifier}`, target);
    if (fire) {
      addCue(
        fire,
        [
          videoStep(data.projectile, label, {
            at: "path",
            template: TEMPLATES.ranged,
            fallback: "tracer",
            fallbackAt: "path",
            options: data.projectile?.options,
          }),
          soundStep(data.projectile?.sound, label),
        ],
        label,
      );
    }
    const shell = target.kind === "ammo" && /shell/i.test(target.variety);
    const impactKey = cueKey(
      "preset-impact",
      entry.label,
      shell ? `attack.hit:${target.qualifier}` : `area.detonate:${target.qualifier}`,
    );
    if (!impactKey) return;
    const at = shell ? "target" : "point";
    const area = shell ? 1 : AREA_SIDE_SQUARES;
    const steps = [];
    if (data.preExplosion?.enable) {
      steps.push(
        videoStep(data.preExplosion, label, {
          at,
          scale: area * Number(data.preExplosion.options?.scale ?? 1),
          options: data.preExplosion.options,
        }),
        soundStep(data.preExplosion.sound, label),
      );
    }
    steps.push(
      videoStep(data.explosion, label, {
        at,
        scale: area * Number(data.explosion?.options?.scale ?? 1),
        fallback: "explosion",
        fallbackAt: at,
        options: data.explosion?.options,
      }),
      soundStep(data.explosion?.sound, label),
    );
    addCue(impactKey, steps, `${label} (impacto)`);
  }

  function convertEffect(entry) {
    const label = `aefx:${entry.label}`;
    if (entry.activeEffectType !== "ontoken") {
      report.skipped.push({ entry: label, reason: `aefx:${entry.activeEffectType}` });
      return;
    }
    const key = cueKey("aefx", entry.label, `status.active:${slug(entry.label)}`);
    if (!key) return report.skipped.push({ entry: label, reason: "override-null" });
    const primary = entry.primary ?? {};
    addCue(
      key,
      [
        videoStep(primary.video, label, {
          at: "target",
          scale: primary.options?.size ?? 1,
          persist: true,
          options: primary.options,
        }),
      ],
      label,
    );
  }

  return {
    convert(exported) {
      for (const menu of MENUS) {
        for (const entry of exported[menu] ?? []) {
          if (!entry?.label) continue;
          if (menu === "preset") convertPreset(entry);
          else if (menu === "aefx") convertEffect(entry);
          else convertAttack(entry, menu);
        }
      }
      for (const menu of Object.keys(exported).filter((name) => Array.isArray(exported[name]))) {
        if (!MENUS.includes(menu) && exported[menu].length > 0) {
          report.skipped.push({ entry: menu, reason: "menu-not-supported" });
        }
      }
    },
    extend(extra = {}) {
      for (const [key, spec] of Object.entries(extra).sort(([a], [b]) => a.localeCompare(b))) {
        const base = cues.get(spec?.from);
        if (!base) {
          report.skipped.push({ entry: `extra:${key}`, reason: `no-base:${spec?.from}` });
          continue;
        }
        const sound = soundStep(
          { enable: true, file: spec.sound, volume: spec.volume ?? 0.75 },
          `extra:${key}`,
        );
        const visuals = base.filter((step) => step.type !== "sound");
        addCue(key, sound ? [...visuals, sound] : visuals, `extra:${key}`);
      }
    },
    result() {
      const sorted = (map) =>
        Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
      return {
        cues: sorted(cues),
        external: sorted(external),
        sounds: sorted(sounds),
        assets: sorted(assets),
        report,
      };
    },
  };
}
