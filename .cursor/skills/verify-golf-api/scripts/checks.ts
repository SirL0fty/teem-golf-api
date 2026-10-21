import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const HEALTH_PATH = '/health';
export const HEALTH_BODY = '{"status":"ok","service":"golf-api"}';
export const NOT_FOUND_BODY = '{"message":"Not Found"}';
export const ACCESS_LOG_FORMAT =
  '{"requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","status":"$context.status"}';
export const BOOTSTRAP_PARAMETER = '/cdk-bootstrap/hnb659fds/version';

export interface HealthReport {
  readonly status: 'ok';
  readonly service: 'golf-api';
}

export interface LambdaProxyResult {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface VerifyLayout {
  readonly home: string;
  readonly repoHash: string;
  readonly workDir: string;
  readonly currentFile: string;
  readonly lastEvidenceFile: string;
  readonly lockFile: string;
}

export interface SynthFacts {
  readonly routeKeys: readonly string[];
  readonly functionCount: number;
  readonly runtime: string | null;
  readonly architectures: readonly string[];
  readonly memorySize: number | null;
  readonly timeout: number | null;
  readonly handler: string | null;
  readonly functionNameSet: boolean;
  readonly protocolTypes: readonly string[];
  readonly apiNameSet: boolean;
  readonly stageNames: readonly string[];
  readonly autoDeploy: readonly boolean[];
  readonly accessLogFormats: readonly string[];
  readonly payloadFormats: readonly string[];
  readonly integrationTypes: readonly string[];
  readonly logGroupCount: number;
  readonly logRetentions: readonly number[];
  readonly logDeletionPolicies: readonly string[];
  readonly logGroupNamesSet: number;
  readonly permissionPrincipals: readonly string[];
  readonly roleCount: number;
  readonly bootstrapDefault: string | null;
  readonly bootstrapType: string | null;
  readonly accountIdLiterals: number;
  readonly assetIndex: string | null;
  readonly bundleIncludesServiceGuard: boolean;
  readonly healthUrlText: string;
  readonly dockerImageCount: number;
}

interface TemplateResource {
  readonly Type: string;
  readonly Properties: Readonly<Record<string, unknown>>;
  readonly DeletionPolicy?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function repoHash(repoRoot: string): string {
  return createHash('sha256').update(repoRoot).digest('hex').slice(0, 16);
}

export function layoutFor(home: string, repoRoot: string): VerifyLayout {
  const hash = repoHash(repoRoot);
  const workDir = join(home, 'work', hash);
  return {
    home,
    repoHash: hash,
    workDir,
    currentFile: join(workDir, 'current'),
    lastEvidenceFile: join(workDir, 'last-evidence-path'),
    lockFile: join(workDir, 'checkout.lock'),
  };
}

export function parseRunId(value: string): string {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(value)) {
    throw new Error(`Run id "${value}" must be 8 to 64 letters, digits, or hyphens.`);
  }
  return value;
}

export function instanceDir(layout: VerifyLayout, runId: string): string {
  return join(layout.workDir, 'instances', parseRunId(runId));
}

export function scratchDir(layout: VerifyLayout, runId: string): string {
  return join(layout.workDir, 'scratch', parseRunId(runId));
}

export function evidenceDir(home: string, runId: string): string {
  return join(home, 'evidence', parseRunId(runId));
}

export function cleanupTargets(layout: VerifyLayout, runId: string): readonly string[] {
  return [instanceDir(layout, runId), scratchDir(layout, runId), layout.currentFile];
}

export function evidenceSurvivesCleanup(layout: VerifyLayout, runId: string): boolean {
  const evidence = evidenceDir(layout.home, runId);
  return cleanupTargets(layout, runId).every(
    (target) => target !== evidence && !evidence.startsWith(`${target}/`) && !target.startsWith(`${evidence}/`),
  );
}

export function parseHealthReport(body: string): HealthReport {
  const parsed: unknown = JSON.parse(body);
  if (!isRecord(parsed) || parsed.status !== 'ok' || parsed.service !== 'golf-api') {
    throw new Error(`Health body must be ${HEALTH_BODY}. Received ${body}.`);
  }
  return { status: 'ok', service: 'golf-api' };
}

export function parseLambdaResult(value: unknown): LambdaProxyResult {
  if (!isRecord(value) || typeof value.statusCode !== 'number' || typeof value.body !== 'string') {
    throw new Error('Lambda result needs a numeric statusCode and a string body.');
  }
  const headers: Record<string, string> = {};
  if (value.headers !== undefined) {
    if (!isRecord(value.headers)) {
      throw new Error('Lambda headers must be an object of strings.');
    }
    for (const [key, header] of Object.entries(value.headers)) {
      if (typeof header !== 'string') {
        throw new Error(`Lambda header ${key} must be a string.`);
      }
      headers[key] = header;
    }
  }
  return { statusCode: value.statusCode, headers, body: value.body };
}

export function isVerifyServer(commandLine: string, runId: string): boolean {
  const tokens = commandLine.split(' ').filter((token) => token.length > 0);
  const hasScript = tokens.some((token) => token === 'golf-verify.ts' || token.endsWith('/golf-verify.ts'));
  return hasScript && tokens.includes('serve') && tokens.includes(parseRunId(runId));
}

export function appNamePattern(schemaText: string): RegExp {
  const parsed: unknown = JSON.parse(schemaText);
  if (!isRecord(parsed) || !isRecord(parsed.properties)) {
    throw new Error('App generator schema has no properties object.');
  }
  const name = parsed.properties.name;
  if (!isRecord(name) || typeof name.pattern !== 'string' || name.pattern.length === 0) {
    throw new Error('App generator schema has no name pattern.');
  }
  return new RegExp(name.pattern);
}

export function classNameForApp(name: string): string {
  const words = name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `${words}Stack`;
}

export function readGolfSynth(cdkOutDir: string): SynthFacts {
  const templatePath = join(cdkOutDir, 'GolfApiStack.template.json');
  const templateText = readFileSync(templatePath, 'utf8');
  const template: unknown = JSON.parse(templateText);
  if (!isRecord(template) || !isRecord(template.Resources)) {
    throw new Error(`${templatePath} has no Resources object.`);
  }

  const resources: TemplateResource[] = [];
  for (const resource of Object.values(template.Resources)) {
    if (!isRecord(resource) || typeof resource.Type !== 'string') {
      throw new Error(`${templatePath} has a resource without a Type.`);
    }
    const properties = isRecord(resource.Properties) ? resource.Properties : {};
    const deletion = typeof resource.DeletionPolicy === 'string' ? resource.DeletionPolicy : undefined;
    resources.push({ Type: resource.Type, Properties: properties, DeletionPolicy: deletion });
  }

  const routes = resources.filter((resource) => resource.Type === 'AWS::ApiGatewayV2::Route');
  const functions = resources.filter((resource) => resource.Type === 'AWS::Lambda::Function');
  const apis = resources.filter((resource) => resource.Type === 'AWS::ApiGatewayV2::Api');
  const stages = resources.filter((resource) => resource.Type === 'AWS::ApiGatewayV2::Stage');
  const integrations = resources.filter((resource) => resource.Type === 'AWS::ApiGatewayV2::Integration');
  const logGroups = resources.filter((resource) => resource.Type === 'AWS::Logs::LogGroup');
  const permissions = resources.filter((resource) => resource.Type === 'AWS::Lambda::Permission');
  const roles = resources.filter((resource) => resource.Type === 'AWS::IAM::Role');
  const fn = functions[0];

  const parameters = isRecord(template.Parameters) ? template.Parameters : {};
  const bootstrap = isRecord(parameters.BootstrapVersion) ? parameters.BootstrapVersion : null;
  const outputs = isRecord(template.Outputs) ? template.Outputs : {};
  const healthUrl = outputs.HealthUrl;

  const assetIndex = fn === undefined ? null : assetIndexFromFunction(cdkOutDir, fn.Properties.Code);
  const bundleIncludesServiceGuard =
    assetIndex !== null && existsSync(assetIndex) && readFileSync(assetIndex, 'utf8').includes('Service name is required.');

  return {
    routeKeys: routes.map((resource) => readString(resource.Properties, 'RouteKey')).filter((key) => key !== null),
    functionCount: functions.length,
    runtime: fn === undefined ? null : readString(fn.Properties, 'Runtime'),
    architectures: fn === undefined ? [] : readStringList(fn.Properties.Architectures),
    memorySize: fn === undefined ? null : readNumber(fn.Properties, 'MemorySize'),
    timeout: fn === undefined ? null : readNumber(fn.Properties, 'Timeout'),
    handler: fn === undefined ? null : readString(fn.Properties, 'Handler'),
    functionNameSet: fn !== undefined && 'FunctionName' in fn.Properties,
    protocolTypes: apis.map((resource) => readString(resource.Properties, 'ProtocolType')).filter((item) => item !== null),
    apiNameSet: apis.some((resource) => 'Name' in resource.Properties),
    stageNames: stages.map((resource) => readString(resource.Properties, 'StageName')).filter((item) => item !== null),
    autoDeploy: stages.map((resource) => resource.Properties.AutoDeploy).filter((item) => typeof item === 'boolean'),
    accessLogFormats: stages.map((resource) => readAccessLogFormat(resource.Properties)).filter((item) => item !== null),
    payloadFormats: integrations
      .map((resource) => readString(resource.Properties, 'PayloadFormatVersion'))
      .filter((item) => item !== null),
    integrationTypes: integrations
      .map((resource) => readString(resource.Properties, 'IntegrationType'))
      .filter((item) => item !== null),
    logGroupCount: logGroups.length,
    logRetentions: logGroups
      .map((resource) => readNumber(resource.Properties, 'RetentionInDays'))
      .filter((item) => item !== null),
    logDeletionPolicies: logGroups.map((resource) => resource.DeletionPolicy).filter((item) => item !== undefined),
    logGroupNamesSet: logGroups.filter((resource) => 'LogGroupName' in resource.Properties).length,
    permissionPrincipals: permissions
      .map((resource) => readString(resource.Properties, 'Principal'))
      .filter((item) => item !== null),
    roleCount: roles.length,
    bootstrapDefault: bootstrap === null ? null : readString(bootstrap, 'Default'),
    bootstrapType: bootstrap === null ? null : readString(bootstrap, 'Type'),
    accountIdLiterals: templateText.match(/(?<!\d)\d{12}(?!\d)/g)?.length ?? 0,
    assetIndex,
    bundleIncludesServiceGuard,
    healthUrlText: JSON.stringify(healthUrl ?? null),
    dockerImageCount: dockerImageCount(join(cdkOutDir, 'GolfApiStack.assets.json')),
  };
}

export function golfTemplateProblems(facts: SynthFacts): readonly string[] {
  const problems: string[] = [];
  if (facts.routeKeys.length !== 1 || facts.routeKeys[0] !== 'GET /health') {
    problems.push(`Expected one route GET /health, found ${facts.routeKeys.join(', ') || 'none'}.`);
  }
  if (facts.functionCount !== 1) {
    problems.push(`Expected one Lambda function, found ${facts.functionCount}.`);
  }
  if (facts.runtime !== 'nodejs24.x') {
    problems.push(`Expected runtime nodejs24.x, found ${facts.runtime ?? 'none'}.`);
  }
  if (facts.architectures.length !== 1 || facts.architectures[0] !== 'arm64') {
    problems.push(`Expected architecture arm64, found ${facts.architectures.join(', ') || 'none'}.`);
  }
  if (facts.memorySize !== 128) {
    problems.push(`Expected memory 128, found ${facts.memorySize ?? 'none'}.`);
  }
  if (facts.timeout !== 3) {
    problems.push(`Expected timeout 3, found ${facts.timeout ?? 'none'}.`);
  }
  if (facts.handler !== 'index.handler') {
    problems.push(`Expected handler index.handler, found ${facts.handler ?? 'none'}.`);
  }
  if (facts.functionNameSet) {
    problems.push('Lambda FunctionName is set. CloudFormation should generate it.');
  }
  if (facts.protocolTypes.length !== 1 || facts.protocolTypes[0] !== 'HTTP') {
    problems.push(`Expected one HTTP API, found ${facts.protocolTypes.join(', ') || 'none'}.`);
  }
  if (facts.apiNameSet) {
    problems.push('HTTP API Name is set. CloudFormation should generate it.');
  }
  if (facts.stageNames.length !== 1 || facts.stageNames[0] !== '$default') {
    problems.push(`Expected stage $default, found ${facts.stageNames.join(', ') || 'none'}.`);
  }
  if (facts.autoDeploy.length !== 1 || facts.autoDeploy[0] !== true) {
    problems.push('Expected the HTTP stage to auto deploy.');
  }
  if (facts.accessLogFormats.length !== 1 || facts.accessLogFormats[0] !== ACCESS_LOG_FORMAT) {
    problems.push('Access log format does not match the golf-api stage.');
  }
  if (facts.payloadFormats.length !== 1 || facts.payloadFormats[0] !== '2.0') {
    problems.push(`Expected payload format 2.0, found ${facts.payloadFormats.join(', ') || 'none'}.`);
  }
  if (facts.integrationTypes.length !== 1 || facts.integrationTypes[0] !== 'AWS_PROXY') {
    problems.push(`Expected AWS_PROXY integration, found ${facts.integrationTypes.join(', ') || 'none'}.`);
  }
  if (facts.logGroupCount !== 2) {
    problems.push(`Expected two log groups, found ${facts.logGroupCount}.`);
  }
  if (facts.logRetentions.length !== 2 || facts.logRetentions.some((days) => days !== 7)) {
    problems.push(`Expected both log groups to keep 7 days, found ${facts.logRetentions.join(', ') || 'none'}.`);
  }
  if (facts.logDeletionPolicies.length !== 2 || facts.logDeletionPolicies.some((policy) => policy !== 'Delete')) {
    problems.push(`Expected both log groups to delete with the stack, found ${facts.logDeletionPolicies.join(', ') || 'none'}.`);
  }
  if (facts.logGroupNamesSet !== 0) {
    problems.push('A log group sets LogGroupName. CloudFormation should generate it.');
  }
  if (facts.permissionPrincipals.length !== 1 || facts.permissionPrincipals[0] !== 'apigateway.amazonaws.com') {
    problems.push(`Expected API Gateway invoke permission, found ${facts.permissionPrincipals.join(', ') || 'none'}.`);
  }
  if (facts.roleCount !== 1) {
    problems.push(`Expected one Lambda role, found ${facts.roleCount}.`);
  }
  if (facts.bootstrapDefault !== BOOTSTRAP_PARAMETER) {
    problems.push('BootstrapVersion is missing or already resolved.');
  }
  if (facts.bootstrapType !== 'AWS::SSM::Parameter::Value<String>') {
    problems.push('BootstrapVersion is not an unresolved SSM parameter.');
  }
  if (facts.accountIdLiterals !== 0) {
    problems.push(`Template contains ${facts.accountIdLiterals} 12-digit account id literals.`);
  }
  if (facts.assetIndex === null || !facts.bundleIncludesServiceGuard) {
    problems.push('Bundled index.js is missing the service-name guard.');
  }
  if (!facts.healthUrlText.includes('https://') || !facts.healthUrlText.includes('.execute-api.')) {
    problems.push('HealthUrl output is not an execute-api HTTPS URL.');
  }
  if (facts.dockerImageCount !== 0) {
    problems.push(`Synth recorded ${facts.dockerImageCount} Docker images.`);
  }
  return problems;
}

function assetIndexFromFunction(cdkOutDir: string, code: unknown): string | null {
  if (!isRecord(code) || typeof code.S3Key !== 'string') {
    return null;
  }
  const match = /^([a-f0-9]{64})\.zip$/.exec(code.S3Key);
  if (match === null) {
    return null;
  }
  const hash = match[1];
  if (hash === undefined) {
    return null;
  }
  return join(cdkOutDir, `asset.${hash}`, 'index.js');
}

function dockerImageCount(assetsPath: string): number {
  if (!existsSync(assetsPath)) {
    return -1;
  }
  const parsed: unknown = JSON.parse(readFileSync(assetsPath, 'utf8'));
  if (!isRecord(parsed) || !isRecord(parsed.dockerImages)) {
    return -1;
  }
  return Object.keys(parsed.dockerImages).length;
}

function readAccessLogFormat(properties: Readonly<Record<string, unknown>>): string | null {
  const settings = properties.AccessLogSettings;
  if (!isRecord(settings) || typeof settings.Format !== 'string') {
    return null;
  }
  return settings.Format;
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readNumber(record: Readonly<Record<string, unknown>>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string');
}
