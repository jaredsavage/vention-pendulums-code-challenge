import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import stringify from 'json-stringify-pretty-compact';

// The JSON files in data/, listed, read and written the same way everywhere.

// Sorted without the extension, so hand-test comes before hand-test-copy.
export function jsonFileNames(directory: string) {
  return globSync('*.json', { cwd: directory })
    .map((fileName) => basename(fileName, '.json'))
    .sort();
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path: string, value: object) {
  writeFileSync(path, jsonText(value));
}

// Never replaces a file that's there already.
export function createJson(path: string, value: object) {
  writeFileSync(path, jsonText(value), { flag: 'wx' });
}

// Laid out like the hand-written files: short objects like anchors on one line,
// with the spaces inside their braces that Prettier expects.
function jsonText(value: object) {
  const compact = stringify(value);
  const oneLineObject = /\{([^{}\n]+)\}/g;
  const spaced = compact.replace(oneLineObject, '{ $1 }');

  return `${spaced}\n`;
}
