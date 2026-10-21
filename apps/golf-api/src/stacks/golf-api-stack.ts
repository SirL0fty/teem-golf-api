import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { HealthFunction } from '../constructs/health-function.js';
import { ServiceHttpApi } from '../constructs/http-api.js';
import type { LogPolicy } from '../constructs/log-policy.js';

export interface ServiceStackProps extends StackProps {
  readonly logs: LogPolicy;
}

export class GolfApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const health = new HealthFunction(this, 'Health', { logs: props.logs });
    const httpApi = new ServiceHttpApi(this, 'HttpApi', {
      handler: health.handler,
      logs: props.logs,
    });

    new CfnOutput(this, 'HealthUrl', {
      value: httpApi.url,
    });
  }
}
