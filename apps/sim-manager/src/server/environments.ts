import { join } from 'node:path';
import { environmentSchema } from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import { jsonFileNames, readJson } from './dataFiles.ts';

const ENVIRONMENTS_DIRECTORY = join(CONFIG.DATA_DIRECTORY, 'environments');

export const environmentNames = jsonFileNames(ENVIRONMENTS_DIRECTORY);

export function readEnvironment(name: string) {
  const path = join(ENVIRONMENTS_DIRECTORY, `${name}.json`);

  return environmentSchema.parse(readJson(path));
}
