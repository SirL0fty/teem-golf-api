import { describe, expect, it } from 'bun:test';
import { health } from '../src/functions/health.js';
import { handler } from '../src/lambdas/health.js';

describe('health', () => {
  it('reports the service as ok', () => {
    expect(health()).toEqual({ status: 'ok', service: 'golf-api' });
  });

  it('returns that report as JSON', () => {
    expect(handler()).toEqual({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'ok', service: 'golf-api' }),
    });
  });
});
