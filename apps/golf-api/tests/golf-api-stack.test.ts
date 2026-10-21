import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'bun:test';
import { createApp } from '../bin/golf-api.js';
import { GolfApiStack } from '../src/stacks/golf-api-stack.js';

describe('GolfApiStack', () => {
  it('deploys GET /health with generated names and explicit logs', () => {
    const app = createApp();
    const child = app.node.tryFindChild('GolfApiStack');
    if (!(child instanceof GolfApiStack)) {
      throw new Error('Expected the GolfApiStack.');
    }

    const template = Template.fromStack(child);
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /health',
    });
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 2);

    const functions = Object.values(template.findResources('AWS::Lambda::Function'));
    const fn = functions[0];
    if (fn === undefined) {
      throw new Error('Expected one Lambda function.');
    }
    expect(fn.Properties).not.toHaveProperty('FunctionName');
    expect(fn.Properties.Runtime).toBe('nodejs24.x');
    expect(fn.Properties.Architectures).toEqual(['arm64']);
    expect(fn.Properties.MemorySize).toBe(128);
    expect(fn.Properties.Timeout).toBe(3);
    expect(fn.Properties.ReservedConcurrentExecutions).toBe(5);

    const groups = Object.values(template.findResources('AWS::Logs::LogGroup'));
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.DeletionPolicy).toBe('Delete');
      expect(group.Properties.RetentionInDays).toBe(7);
      expect(group.Properties).not.toHaveProperty('LogGroupName');
    }

    const apis = Object.values(template.findResources('AWS::ApiGatewayV2::Api'));
    const api = apis[0];
    if (api === undefined) {
      throw new Error('Expected one HTTP API.');
    }
    expect(api.Properties).not.toHaveProperty('Name');
    expect(api.Properties.ProtocolType).toBe('HTTP');
    template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      DefaultRouteSettings: {
        ThrottlingRateLimit: 10,
        ThrottlingBurstLimit: 20,
      },
      AccessLogSettings: {
        Format:
          '{"requestId":"$context.requestId","httpMethod":"$context.httpMethod","status":"$context.status"}',
      },
    });
    expect(JSON.stringify(template.findOutputs('HealthUrl'))).toContain('/health');
    expect(bundledHandler()).toContain('Service name is required.');
  }, { timeout: 120_000 });
});

function bundledHandler(): string {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '../cdk.out');
  const assetDir = readdirSync(outDir).find((name) => name.startsWith('asset.'));
  if (assetDir === undefined) {
    throw new Error('Expected a bundled Lambda asset.');
  }
  return readFileSync(join(outDir, assetDir, 'index.js'), 'utf8');
}
