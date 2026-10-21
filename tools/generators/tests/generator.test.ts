import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { describe, expect, it } from 'bun:test';
import appGenerator from '../src/app/generator.js';
import { MODULE_BOUNDARIES_PATH, parseModuleBoundaries } from '../src/boundaries.js';

describe('app generator', () => {
  it('writes AGENTS.md, README.md, and a scope constraint', async () => {
    const tree = createTreeWithEmptyWorkspace({ formatter: 'none' });
    tree.write('cdk-deploy-order.txt', 'golf-api\n');
    tree.write(
      MODULE_BOUNDARIES_PATH,
      `${JSON.stringify(
        {
          depConstraints: [
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:package'] },
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
          ],
        },
        null,
        2,
      )}\n`,
    );

    await appGenerator(tree, { name: 'sample-api' });

    const agents = tree.read('apps/sample-api/AGENTS.md', 'utf8');
    const readme = tree.read('apps/sample-api/README.md', 'utf8');
    expect(agents).toContain('# sample-api');
    expect(agents).toContain('SampleApiStack');
    expect(readme).toContain('# sample-api');
    expect(tree.exists('apps/sample-api/cdk.json')).toBe(true);
    expect(tree.exists('apps/sample-api/cdk.context.json')).toBe(true);
    expect(tree.exists('apps/sample-api/tests/sample-api-stack.test.ts')).toBe(true);
    expect(tree.exists('apps/sample-api/project.json')).toBe(true);
    const pkg = tree.read('apps/sample-api/package.json', 'utf8');
    expect(pkg).toContain('./bin/sample-api.ts');
    expect(pkg).toContain('@teem-labs/utils');

    const bin = tree.read('apps/sample-api/bin/sample-api.ts', 'utf8');
    expect(bin?.startsWith('#!')).toBe(false);

    const stackTest = tree.read('apps/sample-api/tests/sample-api-stack.test.ts', 'utf8');
    expect(stackTest).toContain("resourceCountIs('AWS::Lambda::Function', 0)");
    expect(stackTest).toContain('runtimeLimitsFrom');

    const order = tree.read('cdk-deploy-order.txt', 'utf8');
    expect(order).toBe('golf-api\nsample-api\n');

    const raw = tree.read(MODULE_BOUNDARIES_PATH, 'utf8');
    if (raw === null) {
      throw new Error(`Missing ${MODULE_BOUNDARIES_PATH}.`);
    }
    const tags = parseModuleBoundaries(JSON.parse(raw)).depConstraints.map((entry) => entry.sourceTag);
    expect(tags).toContain('scope:sample-api');
  });

  it('does not duplicate an app already listed in deploy order', async () => {
    const tree = createTreeWithEmptyWorkspace({ formatter: 'none' });
    tree.write(MODULE_BOUNDARIES_PATH, '{"depConstraints":[]}\n');
    tree.write('cdk-deploy-order.txt', 'sample-api\n');

    await appGenerator(tree, { name: 'sample-api' });

    expect(tree.read('cdk-deploy-order.txt', 'utf8')).toBe('sample-api\n');
    expect(tree.exists('apps/sample-api/AGENTS.md')).toBe(true);
  });

  it('refuses to overwrite an existing app', async () => {
    const tree = createTreeWithEmptyWorkspace({ formatter: 'none' });
    tree.write(MODULE_BOUNDARIES_PATH, '{"depConstraints":[]}\n');
    tree.write('apps/sample-api/README.md', '# existing\n');

    await expect(appGenerator(tree, { name: 'sample-api' })).rejects.toThrow('apps/sample-api already exists');
  });
});
