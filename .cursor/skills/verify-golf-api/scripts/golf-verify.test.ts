import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import {
  ACCESS_LOG_FORMAT,
  BOOTSTRAP_PARAMETER,
  HEALTH_BODY,
  appNamePattern,
  classNameForApp,
  cleanupTargets,
  evidenceDir,
  evidenceSurvivesCleanup,
  golfTemplateProblems,
  isVerifyServer,
  layoutFor,
  parseHealthReport,
  parseLambdaResult,
  parseRunId,
  readGolfSynth,
  type SynthFacts,
} from './checks.js';

const repoRoot = join(import.meta.dir, '../../../..');

function facts(overrides: Partial<SynthFacts> = {}): SynthFacts {
  return {
    routeKeys: ['GET /health'],
    functionCount: 1,
    runtime: 'nodejs24.x',
    architectures: ['arm64'],
    memorySize: 128,
    timeout: 3,
    handler: 'index.handler',
    functionNameSet: false,
    protocolTypes: ['HTTP'],
    apiNameSet: false,
    stageNames: ['$default'],
    autoDeploy: [true],
    accessLogFormats: [ACCESS_LOG_FORMAT],
    payloadFormats: ['2.0'],
    integrationTypes: ['AWS_PROXY'],
    logGroupCount: 2,
    logRetentions: [7, 7],
    logDeletionPolicies: ['Delete', 'Delete'],
    logGroupNamesSet: 0,
    permissionPrincipals: ['apigateway.amazonaws.com'],
    roleCount: 1,
    bootstrapDefault: BOOTSTRAP_PARAMETER,
    bootstrapType: 'AWS::SSM::Parameter::Value<String>',
    accountIdLiterals: 0,
    assetIndex: 'index.js',
    bundleIncludesServiceGuard: true,
    healthUrlText: JSON.stringify({ 'Fn::Join': ['', ['https://', '.execute-api.']] }),
    dockerImageCount: 0,
    ...overrides,
  };
}

describe('golf-verify checks', () => {
  it('parses the health body and the lambda result', () => {
    expect(parseHealthReport(HEALTH_BODY)).toEqual({ status: 'ok', service: 'golf-api' });
    expect(parseLambdaResult({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: HEALTH_BODY })).toEqual({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: HEALTH_BODY,
    });
    expect(() => parseHealthReport('{"status":"ok"}')).toThrow('Health body');
    expect(() => parseLambdaResult({ statusCode: 200 })).toThrow('statusCode');
  });

  it('recognises only the server command for a run id', () => {
    const line = '/usr/bin/bun /repo/.cursor/skills/verify-golf-api/scripts/golf-verify.ts serve --run-id abcdef12 --port 4173';
    expect(isVerifyServer(line, 'abcdef12')).toBe(true);
    expect(isVerifyServer(line.replace(' serve ', ' launch '), 'abcdef12')).toBe(false);
    expect(isVerifyServer(line, 'abcdef13')).toBe(false);
    expect(() => parseRunId('..')).toThrow('Run id');
  });

  it('keeps evidence outside the paths cleanup deletes', () => {
    const layout = layoutFor('/tmp/verify-golf-api', repoRoot);
    const runId = 'abcdef12';
    expect(evidenceSurvivesCleanup(layout, runId)).toBe(true);
    const evidence = evidenceDir(layout.home, runId);
    for (const target of cleanupTargets(layout, runId)) {
      expect(target === evidence).toBe(false);
      expect(evidence.startsWith(`${target}/`)).toBe(false);
    }
    expect(layout.lastEvidenceFile.startsWith(evidence)).toBe(false);
  });

  it('uses the generator schema and class name', () => {
    const pattern = appNamePattern(
      JSON.stringify({ properties: { name: { pattern: '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' } } }),
    );
    expect(pattern.test('verify-scratch')).toBe(true);
    expect(pattern.test('Scratch')).toBe(false);
    expect(classNameForApp('sample-api')).toBe('SampleApiStack');
  });

  it('accepts the golf-api template facts and rejects a named function', () => {
    expect(golfTemplateProblems(facts())).toEqual([]);
    expect(golfTemplateProblems(facts({ functionNameSet: true })).join('\n')).toContain('FunctionName');
    expect(golfTemplateProblems(facts({ accountIdLiterals: 1 })).join('\n')).toContain('account id');
  });

  it('reads a synth directory and counts account id literals', () => {
    const cdkOut = mkdtempSync(join(tmpdir(), 'golf-synth-'));
    const hash = 'a'.repeat(64);
    const assetDir = join(cdkOut, `asset.${hash}`);
    mkdirSync(assetDir);
    writeFileSync(join(assetDir, 'index.js'), 'throw new Error("Service name is required.");\n');
    writeFileSync(join(cdkOut, 'GolfApiStack.assets.json'), '{"dockerImages":{}}\n');
    writeFileSync(
      join(cdkOut, 'GolfApiStack.template.json'),
      JSON.stringify({
        Resources: {
          Route: { Type: 'AWS::ApiGatewayV2::Route', Properties: { RouteKey: 'GET /health' } },
          Fn: {
            Type: 'AWS::Lambda::Function',
            Properties: {
              Runtime: 'nodejs24.x',
              Architectures: ['arm64'],
              MemorySize: 128,
              Timeout: 3,
              Handler: 'index.handler',
              Code: { S3Key: `${hash}.zip` },
            },
          },
          Api: { Type: 'AWS::ApiGatewayV2::Api', Properties: { ProtocolType: 'HTTP' } },
          Stage: {
            Type: 'AWS::ApiGatewayV2::Stage',
            Properties: {
              StageName: '$default',
              AutoDeploy: true,
              AccessLogSettings: { Format: ACCESS_LOG_FORMAT },
            },
          },
          Integration: {
            Type: 'AWS::ApiGatewayV2::Integration',
            Properties: { PayloadFormatVersion: '2.0', IntegrationType: 'AWS_PROXY' },
          },
          LogsA: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 7 }, DeletionPolicy: 'Delete' },
          LogsB: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 7 }, DeletionPolicy: 'Delete' },
          Perm: {
            Type: 'AWS::Lambda::Permission',
            Properties: { Principal: 'apigateway.amazonaws.com' },
          },
          Role: { Type: 'AWS::IAM::Role', Properties: {} },
        },
        Outputs: { HealthUrl: { Value: { 'Fn::Join': ['', ['https://', '.execute-api.', '/']] } } },
        Parameters: {
          BootstrapVersion: {
            Type: 'AWS::SSM::Parameter::Value<String>',
            Default: BOOTSTRAP_PARAMETER,
          },
        },
      }),
    );

    expect(golfTemplateProblems(readGolfSynth(cdkOut))).toEqual([]);

    const templatePath = join(cdkOut, 'GolfApiStack.template.json');
    writeFileSync(templatePath, readFileSync(templatePath, 'utf8').replace('"Delete"', '"Delete 123456789012"'));
    expect(readGolfSynth(cdkOut).accountIdLiterals).toBe(1);
  });
});
