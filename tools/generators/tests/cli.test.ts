import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'bun:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const appName = 'cli-proof-app';
const appDir = join(repoRoot, 'apps', appName);

function cleanup(): void {
  rmSync(appDir, { recursive: true, force: true });
  const restore = spawnSync(
    'git',
    ['checkout', '--', 'cdk-deploy-order.txt', 'tools/module-boundaries.json'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (restore.status !== 0) {
    throw new Error(restore.stderr);
  }
}

describe('generator CLI', () => {
  afterAll(() => {
    cleanup();
  });

  it('runs the documented generate:app command', () => {
    cleanup();
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
    expect(readFileSync(join(repoRoot, 'cdk-deploy-order.txt'), 'utf8')).toContain(`${appName}\n`);
    const stackTest = readFileSync(join(appDir, 'tests', `${appName}-stack.test.ts`), 'utf8');
    expect(stackTest).toContain("resourceCountIs('AWS::Lambda::Function', 0)");
    expect(stackTest).toContain('runtimeLimitsFrom');
  }, 120_000);
});
