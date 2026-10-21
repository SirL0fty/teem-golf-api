import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import type { RuntimeLimits } from '@teem-labs/utils';
import type { Construct } from 'constructs';
import { HealthFunction } from '../constructs/health-function.js';
import { ServiceHttpApi } from '../constructs/http-api.js';
import type { LogPolicy } from '../constructs/log-policy.js';

export interface ServiceStackProps extends StackProps {
  readonly logs: LogPolicy;
  readonly limits: RuntimeLimits;
}

export class GolfApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const health = new HealthFunction(this, 'Health', {
      logs: props.logs,
      reservedConcurrentExecutions: props.limits.reservedConcurrentExecutions,
    });
    const httpApi = new ServiceHttpApi(this, 'HttpApi', {
      handler: health.handler,
      logs: props.logs,
      throttleRate: props.limits.throttleRate,
      throttleBurst: props.limits.throttleBurst,
    });

    new CfnOutput(this, 'HealthUrl', {
      value: httpApi.url,
    });
  }
}
