import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { App } from 'aws-cdk-lib';
import { runtimeLimitsFrom } from '@teem-labs/utils';
import { defaultLogPolicy } from '../src/constructs/log-policy.js';
import { GolfApiStack } from '../src/stacks/golf-api-stack.js';

const appDir = dirname(fileURLToPath(import.meta.url));

function readContext(cdkJsonPath: string): Record<string, unknown> {
  const raw: unknown = JSON.parse(readFileSync(cdkJsonPath, 'utf8'));
  if (typeof raw !== 'object' || raw === null || !('context' in raw)) {
    return {};
  }
  const context = raw.context;
  if (typeof context !== 'object' || context === null || Array.isArray(context)) {
    throw new Error('cdk.json context must be an object.');
  }
  return { ...context };
}

export function createApp(overrides: Readonly<Record<string, unknown>> = {}): App {
  const context = { ...readContext(join(appDir, '../cdk.json')), ...overrides };
  const app = new App({
    outdir: join(appDir, '../cdk.out'),
    context,
  });
  new GolfApiStack(app, 'GolfApiStack', {
    logs: defaultLogPolicy,
    limits: runtimeLimitsFrom(context),
  });
  return app;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  createApp();
}
