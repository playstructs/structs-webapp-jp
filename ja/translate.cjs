// Applies the Japanese overlay to one structs-webapp source file.
//
// Nothing upstream is edited. Each upstream file that needs Japanese has a twin
// under ja/strings/ (js/foo/Bar.js -> ja/strings/js/foo/Bar.js.json) mapping
// exact source text to its replacement. ja/patches.cjs holds the few changes
// that are not text (endpoints). Both are applied to the source as webpack
// reads it, so a newer structs-webapp builds with the same overlay; any entry
// whose text upstream no longer contains is reported as stale.
const fs = require('node:fs');
const path = require('node:path');

const UPSTREAM_SRC = path.resolve(__dirname, '../structs-webapp/src');
const STRINGS_DIR = path.join(__dirname, 'strings');
const GUILD_FILE = path.join(__dirname, 'guild.cjs');
const PATCHES_FILE = path.join(__dirname, 'patches.cjs');

/** @param {string} file absolute path inside structs-webapp/src */
function upstreamPath(file) {
  return path.relative(UPSTREAM_SRC, file).split(path.sep).join('/');
}

/** @param {string} rel upstream path, e.g. js/index.js */
function stringsFile(rel) {
  return path.join(STRINGS_DIR, rel + '.json');
}

/**
 * The file's twin, as written: source text to replacement, plus an optional
 * "$keep" list of English left as is on purpose (read by ja/audit.cjs).
 *
 * @return {Object<string, string|string[]>}
 */
function readStringsFile(rel) {
  const file = stringsFile(rel);
  if (!fs.existsSync(file)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`ja: ${path.relative(process.cwd(), file)}: ${error.message}`);
  }
}

/** Fills in the guild's words: {{guild}}, {{tag}}, {{motto}}, {{badge}} (guild.cjs). */
function withGuild(text) {
  delete require.cache[GUILD_FILE];
  const guild = require(GUILD_FILE);
  const words = {guild: guild.name, tag: guild.tag, motto: guild.motto, badge: guild.badge};
  return text.replace(/{{(\w+)}}/g, (match, name) => {
    if (!(name in words)) throw new Error(`ja: no guild word ${match}`);
    return words[name];
  });
}

/** @return {Object<string, string>} the replacements alone */
function loadStrings(rel) {
  return Object.fromEntries(Object.entries(readStringsFile(rel))
    .filter(([key]) => key !== '$keep')
    .map(([key, value]) => [key, withGuild(value)]));
}

/** @return {Array<[string, string]>} */
function loadPatches(rel) {
  delete require.cache[PATCHES_FILE];
  return require(PATCHES_FILE)[rel] ?? [];
}

/**
 * One pass over the source, longest text first, so a sentence is replaced
 * whole before any word in it. One pass, so a short key can never
 * match inside a replacement that was already made (names left in English).
 *
 * @param {string} source
 * @param {Array<[string, string]>} pairs
 * @param {string[]} stale collects the source text that was not found
 */
function replaceAll(source, pairs, stale) {
  const live = pairs.filter(([from]) => source.includes(from) || !stale.push(from));
  if (live.length === 0) {
    return source;
  }
  const replacements = new Map(live);
  const alternatives = [...replacements.keys()]
    .sort((a, b) => b.length - a.length)
    .map(text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return source.replace(new RegExp(alternatives.join('|'), 'g'), text => replacements.get(text));
}

/**
 * @param {string} rel upstream path
 * @param {string} source upstream text
 * @return {{code: string, stale: string[], dependencies: string[]}}
 */
function translate(rel, source) {
  const stale = [];
  const patched = replaceAll(source, loadPatches(rel), stale);
  const code = replaceAll(patched, Object.entries(loadStrings(rel)), stale);
  return {code, stale, dependencies: [stringsFile(rel), PATCHES_FILE, GUILD_FILE]};
}

module.exports = {UPSTREAM_SRC, STRINGS_DIR, upstreamPath, stringsFile, readStringsFile, loadStrings, translate};
