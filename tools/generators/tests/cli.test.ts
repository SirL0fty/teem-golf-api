import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const appName = 'cli-proof-app';
const appDir = join(repoRoot, 'apps', appName);
const orderPath = join(repoRoot, 'cdk-deploy-order.txt');
const boundariesPath = join(repoRoot, 'tools/module-boundaries.json');

describe('generator CLI', () => {
  it('runs the documented generate:app command', () => {
    const orderBefore = readFileSync(orderPath, 'utf8');
    const boundariesBefore = readFileSync(boundariesPath, 'utf8');
    rmSync(appDir, { recursive: true, force: true });
    try {
      const result = spawnSync('bun', ['run', 'generate:app', '--', appName], {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 120_000,
        env: {
          ...process.env,
          NX_DAEMON: 'false',
          AWS_EC2_METADATA_DISABLED: 'true',
          CDK_DISABLE_CLI_TELEMETRY: '1',
        },
      });
      const output = `${result.stdout}\n${result.stderr}`;
      if (result.status !== 0) {
        throw new Error(output);
      }
      expect(existsSync(join(appDir, 'AGENTS.md'))).toBe(true);
      expect(existsSync(join(appDir, 'README.md'))).toBe(true);
      expect(readFileSync(orderPath, 'utf8')).toContain(`${appName}\n`);
      const stackTest = readFileSync(join(appDir, 'tests', `${appName}-stack.test.ts`), 'utf8');
      expect(stackTest).toContain("resourceCountIs('AWS::Lambda::Function', 0)");
      expect(stackTest).toContain('runtimeLimitsFrom');
      expect(readFileSync(join(appDir, 'bin', `${appName}.ts`), 'utf8').startsWith('#!')).toBe(false);
    } finally {
      rmSync(appDir, { recursive: true, force: true });
      writeFileSync(orderPath, orderBefore);
      writeFileSync(boundariesPath, boundariesBefore);
    }
  }, 120_000);
});
