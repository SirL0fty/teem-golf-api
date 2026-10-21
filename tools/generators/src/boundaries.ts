export interface DepConstraint {
  readonly sourceTag: string;
  readonly onlyDependOnLibsWithTags: readonly string[];
}

export interface ModuleBoundaries {
  readonly depConstraints: readonly DepConstraint[];
}

export const MODULE_BOUNDARIES_PATH = 'tools/module-boundaries.json';

export function parseModuleBoundaries(value: unknown): ModuleBoundaries {
  if (typeof value !== 'object' || value === null || !('depConstraints' in value)) {
    throw new Error('Module boundaries must be an object with depConstraints.');
  }
  if (!Array.isArray(value.depConstraints)) {
    throw new Error('depConstraints must be an array.');
  }

  const depConstraints: DepConstraint[] = [];
  for (const entry of value.depConstraints) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('sourceTag' in entry) ||
      !('onlyDependOnLibsWithTags' in entry)
    ) {
      throw new Error('Each depConstraint needs sourceTag and onlyDependOnLibsWithTags.');
    }
    if (typeof entry.sourceTag !== 'string' || entry.sourceTag.length === 0) {
      throw new Error('sourceTag must be a non-empty string.');
    }
    if (!Array.isArray(entry.onlyDependOnLibsWithTags)) {
      throw new Error(`onlyDependOnLibsWithTags for ${entry.sourceTag} must be an array.`);
    }
    const onlyDependOnLibsWithTags: string[] = [];
    for (const tag of entry.onlyDependOnLibsWithTags) {
      if (typeof tag !== 'string' || tag.length === 0) {
        throw new Error(`Tags for ${entry.sourceTag} must be non-empty strings.`);
      }
      onlyDependOnLibsWithTags.push(tag);
    }
    depConstraints.push({ sourceTag: entry.sourceTag, onlyDependOnLibsWithTags });
  }

  return { depConstraints };
}

export function withScopeConstraint(boundaries: ModuleBoundaries, scope: string): ModuleBoundaries {
  const sourceTag = `scope:${scope}`;
  const constraint: DepConstraint = {
    sourceTag,
    onlyDependOnLibsWithTags: [sourceTag, 'scope:shared'],
  };
  const existing = boundaries.depConstraints.filter((entry) => entry.sourceTag !== sourceTag);
  return { depConstraints: [...existing, constraint] };
}
