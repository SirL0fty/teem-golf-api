import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { App } from 'aws-cdk-lib';
import {
  budgetEmailFrom,
  budgetLimitUsdFrom,
  TeemGolfBudgets,
} from '../src/stacks/teem-golf-budgets-stack.js';

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
  new TeemGolfBudgets(app, 'TeemGolfBudgets', {
    limitUsd: budgetLimitUsdFrom(context),
    email: budgetEmailFrom(context),
  });
  return app;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  createApp();
}
