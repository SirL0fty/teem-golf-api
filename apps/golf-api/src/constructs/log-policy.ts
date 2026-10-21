import { RemovalPolicy } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface LogPolicy {
  readonly retention: RetentionDays;
  readonly removalPolicy: RemovalPolicy;
}

export const defaultLogPolicy: LogPolicy = {
  retention: RetentionDays.ONE_WEEK,
  removalPolicy: RemovalPolicy.DESTROY,
};
