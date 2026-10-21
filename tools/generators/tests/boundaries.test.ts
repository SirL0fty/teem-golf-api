import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';
import { parseModuleBoundaries, withScopeConstraint } from '../src/boundaries.js';

describe('module boundaries', () => {
  const boundaries = parseModuleBoundaries({
    depConstraints: [
      { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:package'] },
      { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
    ],
  });

  it('adds a scope that can depend on itself and shared packages', () => {
    expect(withScopeConstraint(boundaries, 'golf-api').depConstraints).toContainEqual({
      sourceTag: 'scope:golf-api',
      onlyDependOnLibsWithTags: ['scope:golf-api', 'scope:shared'],
    });
  });

  it('replaces an existing scope constraint instead of duplicating it', () => {
    const twice = withScopeConstraint(withScopeConstraint(boundaries, 'golf-api'), 'golf-api');
    const scopes = twice.depConstraints.filter((entry) => entry.sourceTag === 'scope:golf-api');
    expect(scopes).toHaveLength(1);
  });

  it('parses the committed boundary file', () => {
    const path = join(dirname(fileURLToPath(import.meta.url)), '../../../tools/module-boundaries.json');
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const parsed = parseModuleBoundaries(raw);
    const tags = parsed.depConstraints.map((entry) => entry.sourceTag);
    expect(tags).toContain('scope:golf-api');
    expect(tags).toContain('type:app');
  });
});
