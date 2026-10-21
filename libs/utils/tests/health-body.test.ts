import { describe, expect, it } from 'bun:test';
import { healthBody } from '../src/health-body.js';

describe('healthBody', () => {
  it('returns an ok body for a service name', () => {
    expect(healthBody(' golf-api ')).toEqual({ status: 'ok', service: 'golf-api' });
  });

  it('rejects a blank service name', () => {
    expect(() => healthBody('   ')).toThrow('Service name is required.');
  });
});
