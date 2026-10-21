export const DEFAULT_THROTTLE_RATE = 10;
export const DEFAULT_THROTTLE_BURST = 20;
export const DEFAULT_RESERVED_CONCURRENCY = 5;

export interface RuntimeLimits {
  readonly throttleRate: number;
  readonly throttleBurst: number;
  readonly reservedConcurrentExecutions: number;
}

export function runtimeLimitsFrom(context: Readonly<Record<string, unknown>>): RuntimeLimits {
  return {
    throttleRate: positiveInteger(context, 'throttleRate', DEFAULT_THROTTLE_RATE),
    throttleBurst: positiveInteger(context, 'throttleBurst', DEFAULT_THROTTLE_BURST),
    reservedConcurrentExecutions: positiveInteger(
      context,
      'reservedConcurrentExecutions',
      DEFAULT_RESERVED_CONCURRENCY,
    ),
  };
}

function positiveInteger(
  context: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  if (!Object.hasOwn(context, key)) {
    return fallback;
  }
  const value = context[key];
  if (value === undefined) {
    return fallback;
  }
  let parsed = Number.NaN;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    parsed = Number(value);
  }
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}
