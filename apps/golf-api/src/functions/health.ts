import { healthBody } from '@teem-labs/utils';

export function health(): ReturnType<typeof healthBody> {
  return healthBody('golf-api');
}
