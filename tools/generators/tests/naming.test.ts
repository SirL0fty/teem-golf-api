import { describe, expect, it } from 'bun:test';
import { classNameFor, validateAppName } from '../src/app/generator.js';

describe('app names', () => {
  it('accepts kebab-case and builds a stack class name', () => {
    expect(validateAppName(' sample-api ')).toBe('sample-api');
    expect(classNameFor('sample-api')).toBe('SampleApiStack');
  });

  it('rejects names that are not kebab-case', () => {
    expect(() => validateAppName('Sample')).toThrow('must be lowercase words');
  });
});
