import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Duration } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import type { LogPolicy } from './log-policy.js';

const constructDir = dirname(fileURLToPath(import.meta.url));

export interface HealthFunctionProps {
  readonly logs: LogPolicy;
}

export class HealthFunction extends Construct {
  readonly handler: NodejsFunction;

  constructor(scope: Construct, id: string, props: HealthFunctionProps) {
    super(scope, id);

    const logGroup = new LogGroup(this, 'LogGroup', {
      retention: props.logs.retention,
      removalPolicy: props.logs.removalPolicy,
    });

    this.handler = new NodejsFunction(this, 'Handler', {
      entry: join(constructDir, '../lambdas/health.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(3),
      logGroup,
      depsLockFilePath: join(constructDir, '../../../../bun.lock'),
      bundling: {
        target: 'node24',
      },
    });
  }
}
