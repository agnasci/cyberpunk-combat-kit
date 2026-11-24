const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/y;
const NUMBER = /-?\d+(\.\d+)?/y;

export class LiteralError extends Error {}

function skip(text, state) {
  for (;;) {
    const rest = text.slice(state.pos, state.pos + 2);
    if (/^\s/.test(rest)) state.pos += 1;
    else if (rest === "//") {
      const end = text.indexOf("\n", state.pos);
      state.pos = end < 0 ? text.length : end + 1;
    } else if (rest === "/*") {
      const end = text.indexOf("*/", state.pos + 2);
      if (end < 0) throw new LiteralError("unterminated comment");
      state.pos = end + 2;
    } else return;
  }
}

function match(text, state, pattern) {
  pattern.lastIndex = state.pos;
  const found = pattern.exec(text);
  if (!found) return null;
  state.pos = pattern.lastIndex;
  return found[0];
}

function quoted(text, state) {
  const quote = text[state.pos];
  let out = "";
  state.pos += 1;
  while (state.pos < text.length) {
    const char = text[state.pos];
    if (char === "\\") {
      out += text[state.pos + 1] ?? "";
      state.pos += 2;
    } else if (char === quote) {
      state.pos += 1;
      return out;
    } else {
      out += char;
      state.pos += 1;
    }
  }
  throw new LiteralError("unterminated string");
}

function template(text, state, env) {
  const strings = [""];
  const values = [];
  state.pos += 1;
  while (state.pos < text.length) {
    const char = text[state.pos];
    if (char === "`") {
      state.pos += 1;
      return { strings, values };
    }
    if (char === "\\") {
      strings[strings.length - 1] += text[state.pos + 1] ?? "";
      state.pos += 2;
    } else if (char === "$" && text[state.pos + 1] === "{") {
      const end = text.indexOf("}", state.pos);
      if (end < 0) throw new LiteralError("unterminated placeholder");
      const name = text.slice(state.pos + 2, end).trim();
      if (!(name in env) || typeof env[name] !== "string") {
        throw new LiteralError(`unknown placeholder ${name}`);
      }
      values.push(env[name]);
      strings.push("");
      state.pos = end + 1;
    } else {
      strings[strings.length - 1] += char;
      state.pos += 1;
    }
  }
  throw new LiteralError("unterminated template");
}

function joinTemplate({ strings, values }) {
  return strings.reduce((out, part, index) => out + (index > 0 ? values[index - 1] : "") + part);
}

function value(text, state, env) {
  skip(text, state);
  const char = text[state.pos];
  if (char === "{") return object(text, state, env);
  if (char === "[") return array(text, state, env);
  if (char === "'" || char === '"') return quoted(text, state);
  if (char === "`") return joinTemplate(template(text, state, env));
  const number = match(text, state, NUMBER);
  if (number !== null) return Number(number);
  const ident = match(text, state, IDENT);
  if (ident === null) throw new LiteralError(`unexpected ${char} at ${state.pos}`);
  if (ident === "true") return true;
  if (ident === "false") return false;
  if (ident === "null") return null;
  if (text[state.pos] === "`") {
    const tag = env[ident];
    if (typeof tag !== "function") throw new LiteralError(`unknown tag ${ident}`);
    return tag(joinTemplate(template(text, state, env)));
  }
  if (ident in env && typeof env[ident] === "string") return env[ident];
  throw new LiteralError(`unknown identifier ${ident}`);
}

function key(text, state) {
  skip(text, state);
  const char = text[state.pos];
  if (char === "'" || char === '"') return quoted(text, state);
  const found = match(text, state, IDENT) ?? match(text, state, NUMBER);
  if (found === null) throw new LiteralError(`bad key at ${state.pos}`);
  return found;
}

function object(text, state, env) {
  const out = {};
  state.pos += 1;
  for (;;) {
    skip(text, state);
    if (text[state.pos] === "}") {
      state.pos += 1;
      return out;
    }
    const name = key(text, state);
    skip(text, state);
    if (text[state.pos] !== ":") throw new LiteralError(`expected : at ${state.pos}`);
    state.pos += 1;
    out[name] = value(text, state, env);
    skip(text, state);
    if (text[state.pos] === ",") state.pos += 1;
  }
}

function array(text, state, env) {
  const out = [];
  state.pos += 1;
  for (;;) {
    skip(text, state);
    if (text[state.pos] === "]") {
      state.pos += 1;
      return out;
    }
    out.push(value(text, state, env));
    skip(text, state);
    if (text[state.pos] === ",") state.pos += 1;
  }
}

export function parseLiteralAt(text, pos, env = {}) {
  const state = { pos };
  return { value: value(text, state, env), end: state.pos };
}

export function parseAssignments(text, target, env = {}, names = null) {
  const result = {};
  const pattern = new RegExp(`${target}\\.([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*`, "g");
  for (const found of text.matchAll(pattern)) {
    if (names && !names.includes(found[1])) continue;
    const start = (found.index ?? 0) + found[0].length;
    result[found[1]] = parseLiteralAt(text, start, env).value;
  }
  return result;
}
