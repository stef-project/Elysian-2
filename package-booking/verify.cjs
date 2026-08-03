#!/usr/bin/env node
/**
 * Vérifie l'intégrité de package-booking/ avant tout merge :
 *   1. Chaque fichier .gs a une syntaxe JS valide.
 *   2. TOUT-EN-UN.gs contient exactement les mêmes fonctions top-level que
 *      l'ensemble des fichiers individuels — ni omise, ni en trop.
 *   3. Aucune constante ALL_CAPS n'est référencée sans être déclarée quelque
 *      part dans le dossier — c'est exactement le type de régression qui a
 *      cassé le parrainage/les codes promo lors du merge de la PR #33
 *      (des constantes supprimées de Constants.gs mais encore utilisées
 *      ailleurs).
 *
 * Usage : node package-booking/verify.cjs
 * Utilisé par .github/workflows/ci.yml sur chaque PR/push.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.gs'));

let failed = false;

// --- 1. Syntaxe ---------------------------------------------------------

for (const file of files) {
  const source = fs.readFileSync(path.join(dir, file), 'utf8');
  try {
    new vm.Script(source, { filename: file });
  } catch (err) {
    console.error(`SYNTAX ERROR in ${file}:\n${err.message}`);
    failed = true;
  }
}
if (!failed) console.log(`Syntax OK (${files.length} files).`);

// --- 2. Parité des fonctions individuel <-> TOUT-EN-UN.gs ---------------

function extractFunctionNames(source) {
  return new Set(Array.from(source.matchAll(/^function ([A-Za-z0-9_]+)/gm), (m) => m[1]));
}

const individualFuncs = new Set();
for (const file of files) {
  if (file === 'TOUT-EN-UN.gs') continue;
  for (const name of extractFunctionNames(fs.readFileSync(path.join(dir, file), 'utf8'))) {
    individualFuncs.add(name);
  }
}

const combinedSource = fs.readFileSync(path.join(dir, 'TOUT-EN-UN.gs'), 'utf8');
const combinedFuncs = extractFunctionNames(combinedSource);

const missingFromCombined = [...individualFuncs].filter((f) => !combinedFuncs.has(f));
const extraInCombined = [...combinedFuncs].filter((f) => !individualFuncs.has(f));

if (missingFromCombined.length || extraInCombined.length) {
  failed = true;
  if (missingFromCombined.length) {
    console.error(`Functions missing from TOUT-EN-UN.gs: ${missingFromCombined.join(', ')}`);
  }
  if (extraInCombined.length) {
    console.error(`Functions only in TOUT-EN-UN.gs (stale, not in any individual file): ${extraInCombined.join(', ')}`);
  }
} else {
  console.log(`Function parity OK (${individualFuncs.size} functions).`);
}

// --- 3. Constantes ALL_CAPS référencées mais jamais déclarées -----------

// Globals JS/Apps Script légitimes qu'on ne veut pas signaler comme
// "constante non déclarée" (ils ne sont déclarés nulle part dans le dossier
// mais existent nativement dans l'environnement d'exécution).
const KNOWN_GLOBALS = new Set([
  'JSON', 'Math', 'Date', 'NaN', 'Infinity', 'RegExp', 'Promise', 'Object',
  'Array', 'String', 'Number', 'Boolean', 'Error', 'TypeError', 'RangeError',
  'Map', 'Set', 'Symbol', 'Console',
  'SpreadsheetApp', 'PropertiesService', 'ScriptApp', 'MailApp', 'GmailApp',
  'CalendarApp', 'ContentService', 'HtmlService', 'UrlFetchApp', 'Utilities',
  'Logger', 'CacheService', 'LockService', 'Session', 'DriveApp', 'FormApp',
  'XmlService', 'Browser', 'ContactsApp',
]);

/**
 * Remplace le contenu des chaînes et des commentaires par des espaces (en
 * préservant les retours à la ligne), caractère par caractère, pour ne pas
 * se faire piéger par des apostrophes échappées (ex. 'd\'expiration') comme
 * le ferait une regex naïve du type /'[^']*'/.
 */
function blankStringsAndComments(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    const two = source.slice(i, i + 2);
    if (two === '//') {
      while (i < n && source[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (two === '/*') {
      out += '  ';
      i += 2;
      while (i < n && source.slice(i, i + 2) !== '*/') {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < n) { out += '  '; i += 2; }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      out += ' ';
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < n) {
          out += source[i] === '\n' ? '\n' : ' ';
          out += source[i + 1] === '\n' ? '\n' : ' ';
          i += 2;
          continue;
        }
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < n) { out += ' '; i++; }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const declared = new Set(KNOWN_GLOBALS);
const perFileCleaned = {};

for (const file of files) {
  const source = fs.readFileSync(path.join(dir, file), 'utf8');
  const cleaned = blankStringsAndComments(source);
  perFileCleaned[file] = cleaned;
  if (file === 'TOUT-EN-UN.gs') continue; // ne compte que les déclarations des fichiers individuels
  for (const m of cleaned.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Z0-9_]*)\b/g)) {
    declared.add(m[1]);
  }
}

const undeclaredRefs = []; // { name, file }
const CONST_TOKEN = /\b[A-Z][A-Z0-9_]{2,}\b/g;

for (const file of files) {
  if (file === 'TOUT-EN-UN.gs') continue; // c'est une concaténation, déjà couvert par les fichiers individuels
  const cleaned = perFileCleaned[file];
  for (const m of cleaned.matchAll(CONST_TOKEN)) {
    const name = m[1] ?? m[0];
    const idx = m.index;
    const before = cleaned[idx - 1];
    const afterIdx = idx + name.length;
    let after = cleaned[afterIdx];
    let k = afterIdx;
    while (cleaned[k] === ' ') k++;
    after = cleaned[k];
    if (before === '.') continue; // accès membre, ex. TABS.CLIENTS
    if (after === ':') continue; // clé d'objet littéral
    if (!declared.has(name)) {
      undeclaredRefs.push({ name, file });
    }
  }
}

if (undeclaredRefs.length) {
  failed = true;
  const byName = new Map();
  for (const { name, file } of undeclaredRefs) {
    if (!byName.has(name)) byName.set(name, new Set());
    byName.get(name).add(file);
  }
  console.error('Possible reference to undeclared constant(s):');
  for (const [name, filesSet] of byName) {
    console.error(`  ${name} (in ${[...filesSet].join(', ')})`);
  }
} else {
  console.log(`No undeclared constant references found (${declared.size - KNOWN_GLOBALS.size} declared constants).`);
}

process.exit(failed ? 1 : 0);
