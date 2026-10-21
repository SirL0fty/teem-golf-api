import { describe, expect, it } from 'bun:test';
import { runtimeLimitsFrom } from '../src/runtime-limits.js';

describe('runtimeLimitsFrom', () => {
  it('uses 10 requests per second, a burst of 20, and concurrency of 5', () => {
    expect(runtimeLimitsFrom({})).toEqual({
      throttleRate: 10,
      throttleBurst: 20,
      reservedConcurrentExecutions: 5,
    });
  });

  it('reads numbers and numeric strings from context', () => {
    expect(
      runtimeLimitsFrom({
        throttleRate: '15',
        throttleBurst: 30,
        reservedConcurrentExecutions: 2,
      }),
    ).toEqual({
      throttleRate: 15,
      throttleBurst: 30,
      reservedConcurrentExecutions: 2,
    });
  });

  it('rejects a limit that is not a positive integer', () => {
    expect(() => runtimeLimitsFrom({ throttleRate: 0 })).toThrow('throttleRate must be a positive integer.');
    expect(() => runtimeLimitsFrom({ reservedConcurrentExecutions: 'nope' })).toThrow(
      'reservedConcurrentExecutions must be a positive integer.',
    );
  });
});
