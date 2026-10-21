import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatFiles, generateFiles, joinPathFragments, type Tree } from '@nx/devkit';
import { MODULE_BOUNDARIES_PATH, parseModuleBoundaries, withScopeConstraint } from '../boundaries.js';

const generatorDirectory = dirname(fileURLToPath(import.meta.url));
const appNamePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const deployOrderPath = 'cdk-deploy-order.txt';

export interface AppGeneratorSchema {
  readonly name: string;
}

export function validateAppName(name: string): string {
  const trimmed = name.trim();
  if (!appNamePattern.test(trimmed)) {
    throw new Error(`App name "${trimmed}" must be lowercase words separated by single hyphens.`);
  }
  return trimmed;
}

export function classNameFor(name: string): string {
  const words = name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `${words}Stack`;
}

export default async function appGenerator(tree: Tree, schema: AppGeneratorSchema): Promise<void> {
  const name = validateAppName(schema.name);
  const destination = joinPathFragments('apps', name);
  if (tree.exists(destination)) {
    throw new Error(`${destination} already exists.`);
  }

  appendDeployOrder(tree, name);

  const raw = tree.read(MODULE_BOUNDARIES_PATH, 'utf8');
  if (raw === null) {
    throw new Error(`Missing ${MODULE_BOUNDARIES_PATH}.`);
  }

  const parsed: unknown = JSON.parse(raw);
  const boundaries = withScopeConstraint(parseModuleBoundaries(parsed), name);
  tree.write(MODULE_BOUNDARIES_PATH, `${JSON.stringify(boundaries, null, 2)}\n`);

  generateFiles(tree, joinPathFragments(generatorDirectory, 'files'), destination, {
    name,
    className: classNameFor(name),
    tmpl: '',
  });
  await formatFiles(tree);
}

function appendDeployOrder(tree: Tree, name: string): void {
  const raw = tree.read(deployOrderPath, 'utf8');
  const lines = (raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.includes(name)) {
    return;
  }
  tree.write(deployOrderPath, `${[...lines, name].join('\n')}\n`);
}
