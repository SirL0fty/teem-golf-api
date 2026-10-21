import { createRequire } from 'node:module';
import { describe, expect, it } from 'bun:test';

const require = createRequire(import.meta.url);

describe('generator package entry', () => {
  it('lets Nx read package.json through the exports map', () => {
    const pkg: unknown = require('@teem-labs/generators/package.json');
    if (typeof pkg !== 'object' || pkg === null || !('generators' in pkg)) {
      throw new Error('Expected the generators package.json.');
    }
    expect(pkg.generators).toBe('./generators.json');
  });
});
