import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway';
import {
  CfnApi,
  HttpApi,
  HttpMethod,
  HttpStage,
  LogGroupLogDestination,
  PayloadFormatVersion,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { IFunction } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import type { LogPolicy } from './log-policy.js';

export interface ServiceHttpApiProps {
  readonly handler: IFunction;
  readonly logs: LogPolicy;
  readonly throttleRate: number;
  readonly throttleBurst: number;
}

export class ServiceHttpApi extends Construct {
  readonly url: string;

  constructor(scope: Construct, id: string, props: ServiceHttpApiProps) {
    super(scope, id);

    const accessLogs = new LogGroup(this, 'AccessLogs', {
      retention: props.logs.retention,
      removalPolicy: props.logs.removalPolicy,
    });

    const api = new HttpApi(this, 'Api', {
      createDefaultStage: false,
    });
    const apiResource = api.node.defaultChild;
    if (!(apiResource instanceof CfnApi)) {
      throw new Error('Expected the HTTP API resource.');
    }
    // HttpApi copies its construct id into the physical name. Drop it so CloudFormation generates one.
    apiResource.addPropertyDeletionOverride('Name');

    const stage = new HttpStage(this, 'Stage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: {
        rateLimit: props.throttleRate,
        burstLimit: props.throttleBurst,
      },
      accessLogSettings: {
        destination: new LogGroupLogDestination(accessLogs),
        format: AccessLogFormat.custom(
          JSON.stringify({
            requestId: '$context.requestId',
            httpMethod: '$context.httpMethod',
            status: '$context.status',
          }),
        ),
      },
    });

    api.addRoutes({
      path: '/health',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('HealthIntegration', props.handler, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
      }),
    });

    this.url = `${stage.url}health`;
  }
}
