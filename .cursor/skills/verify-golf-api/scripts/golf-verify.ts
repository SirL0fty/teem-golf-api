#!/usr/bin/env bun
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HEALTH_BODY,
  HEALTH_PATH,
  NOT_FOUND_BODY,
  appNamePattern,
  classNameForApp,
  cleanupTargets,
  evidenceDir,
  evidenceSurvivesCleanup,
  golfTemplateProblems,
  instanceDir,
  isRecord,
  isVerifyServer,
  layoutFor,
  parseHealthReport,
  parseLambdaResult,
  parseRunId,
  readGolfSynth,
  scratchDir,
  type SynthFacts,
  type VerifyLayout,
} from './checks.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

interface InstanceState {
  readonly runId: string;
  readonly pid: number;
  readonly port: number;
  readonly url: string;
  readonly assetPath: string;
  readonly repoRoot: string;
  readonly startedAt: string;
}

interface HttpApiEvent {
  readonly version: '2.0';
  readonly routeKey: 'GET /health';
  readonly rawPath: '/health';
  readonly rawQueryString: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly requestContext: {
    readonly http: {
      readonly method: 'GET';
      readonly path: '/health';
      readonly protocol: 'HTTP/1.1';
      readonly sourceIp: '127.0.0.1';
      readonly userAgent: 'golf-verify';
    };
    readonly requestId: string;
    readonly routeKey: 'GET /health';
    readonly stage: '$default';
    readonly timeEpoch: number;
  };
  readonly isBase64Encoded: false;
}

type DriveFeature = 'health' | 'health-query' | 'health-miss' | 'synth' | 'generator';

type Command =
  | { readonly kind: 'launch' }
  | { readonly kind: 'doctor' }
  | { readonly kind: 'url' }
  | { readonly kind: 'evidence' }
  | { readonly kind: 'cleanup' }
  | { readonly kind: 'drive'; readonly feature: DriveFeature; readonly rest: readonly string[] }
  | { readonly kind: 'serve'; readonly runId: string; readonly port: number; readonly assetPath: string };

function findRepoRoot(start: string): string {
  let dir = start;
  for (let depth = 0; depth < 8; depth += 1) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const parsed: unknown = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (isRecord(parsed) && parsed.name === 'teem-golf-api') {
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error('golf-verify must run inside the teem-golf-api checkout.');
}

function verifyHome(): string {
  return process.env.GOLF_VERIFY_HOME ?? '/tmp/verify-golf-api';
}

function verifyPort(): number {
  const raw = process.env.GOLF_VERIFY_PORT ?? '4173';
  if (!/^\d+$/.test(raw)) {
    throw new Error(`GOLF_VERIFY_PORT must be an integer. Received "${raw}".`);
  }
  const port = Number(raw);
  if (port < 1 || port > 65535) {
    throw new Error(`GOLF_VERIFY_PORT ${port} is outside 1-65535.`);
  }
  return port;
}

function awsClearedEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, PATH: base.PATH };
  delete env.AWS_ACCESS_KEY_ID;
  delete env.AWS_SECRET_ACCESS_KEY;
  delete env.AWS_SESSION_TOKEN;
  delete env.AWS_PROFILE;
  env.AWS_EC2_METADATA_DISABLED = 'true';
  env.CDK_DISABLE_CLI_TELEMETRY = '1';
  return env;
}

function processCommandLine(pid: number): string | null {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ').trim();
  } catch {
    return null;
  }
}

function pidListeningOnPort(port: number): number | null {
  const needle = `0100007F:${port.toString(16).toUpperCase().padStart(4, '0')}`;
  let inode: string | null = null;
  for (const line of readFileSync('/proc/net/tcp', 'utf8').split('\n').slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts[1] === needle && parts[3] === '0A') {
      inode = parts[9] ?? null;
      break;
    }
  }
  if (inode === null) {
    return null;
  }
  const target = `socket:[${inode}]`;
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) {
      continue;
    }
    const fdDir = `/proc/${entry}/fd`;
    let fds: string[];
    try {
      fds = readdirSync(fdDir);
    } catch {
      continue;
    }
    for (const fd of fds) {
      try {
        if (readlinkSync(join(fdDir, fd)) === target) {
          return Number(entry);
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

function isErrno(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

function acquireLock(layout: VerifyLayout): void {
  mkdirSync(layout.workDir, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(layout.lockFile, 'wx');
      writeSync(fd, `${process.pid}\n`);
      closeSync(fd);
      return;
    } catch (error) {
      if (!isErrno(error, 'EEXIST')) {
        throw error;
      }
      const owner = existsSync(layout.lockFile) ? readFileSync(layout.lockFile, 'utf8').trim() : '';
      const pid = Number(owner);
      const line = Number.isInteger(pid) ? processCommandLine(pid) : null;
      const alive = line !== null && line.split(' ').some((token) => token.endsWith('/golf-verify.ts') || token === 'golf-verify.ts');
      if (alive) {
        throw new Error(`Another golf-verify command holds the checkout lock (pid ${owner}).`);
      }
      if (existsSync(layout.lockFile)) {
        unlinkSync(layout.lockFile);
      }
    }
  }
  throw new Error(`Could not acquire ${layout.lockFile}.`);
}

function releaseLock(layout: VerifyLayout): void {
  if (!existsSync(layout.lockFile)) {
    return;
  }
  if (readFileSync(layout.lockFile, 'utf8').trim() === String(process.pid)) {
    unlinkSync(layout.lockFile);
  }
}

async function withLock(layout: VerifyLayout, body: () => Promise<void>): Promise<void> {
  acquireLock(layout);
  try {
    await body();
  } finally {
    releaseLock(layout);
  }
}

function runLogged(command: string, args: readonly string[], cwd: string, logPath: string): void {
  mkdirSync(dirname(logPath), { recursive: true });
  const result = spawnSync(command, args, {
    cwd,
    env: awsClearedEnv(process.env),
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  writeFileSync(logPath, `$ ${command} ${args.join(' ')}\n${output}`);
  if (result.status !== 0) {
    const tail = output.slice(-1500);
    throw new Error(`${command} ${args.join(' ')} exited ${result.status ?? 'null'}. See ${logPath}.\n${tail}`);
  }
}

function bunCommand(args: readonly string[]): { readonly command: string; readonly args: readonly string[] } {
  return { command: process.execPath, args };
}

function bunxCommand(args: readonly string[]): { readonly command: string; readonly args: readonly string[] } {
  const sibling = join(dirname(process.execPath), 'bunx');
  if (existsSync(sibling)) {
    return { command: sibling, args };
  }
  return { command: process.execPath, args: ['x', ...args] };
}

function gitText(repoRoot: string, args: readonly string[]): string {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited ${result.status ?? 'null'}. ${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}

function curlStatus(method: string, url: string, headerPath: string, bodyPath: string): number {
  mkdirSync(dirname(bodyPath), { recursive: true });
  const args = [
    '--silent',
    '--show-error',
    '--http1.1',
    '--request',
    method,
    '--dump-header',
    headerPath,
    '--output',
    bodyPath,
    '--write-out',
    '%{http_code}',
    url,
  ];
  const result = spawnSync('curl', args, { encoding: 'utf8' });
  writeFileSync(`${bodyPath}.curl`, `$ curl ${args.join(' ')}\n${result.stderr ?? ''}`);
  if (result.status !== 0) {
    throw new Error(`curl ${method} ${url} exited ${result.status ?? 'null'}. ${result.stderr ?? ''}`);
  }
  const status = Number((result.stdout ?? '').trim());
  if (!Number.isInteger(status)) {
    throw new Error(`curl returned a non-numeric status "${result.stdout ?? ''}".`);
  }
  return status;
}

function readCurrent(layout: VerifyLayout): string | null {
  if (!existsSync(layout.currentFile)) {
    return null;
  }
  return parseRunId(readFileSync(layout.currentFile, 'utf8').trim());
}

function writeCurrent(layout: VerifyLayout, runId: string): void {
  mkdirSync(layout.workDir, { recursive: true });
  const tmp = `${layout.currentFile}.tmp`;
  writeFileSync(tmp, `${parseRunId(runId)}\n`);
  renameSync(tmp, layout.currentFile);
}

function rememberEvidence(layout: VerifyLayout, path: string): void {
  mkdirSync(layout.workDir, { recursive: true });
  writeFileSync(layout.lastEvidenceFile, `${path}\n`);
}

function ensureRunId(layout: VerifyLayout): string {
  const current = readCurrent(layout);
  if (current !== null) {
    return current;
  }
  const runId = parseRunId(process.env.GOLF_VERIFY_RUN_ID ?? randomUUID());
  writeCurrent(layout, runId);
  return runId;
}

function statePath(layout: VerifyLayout, runId: string): string {
  return join(instanceDir(layout, runId), 'state.json');
}

function parseState(value: unknown): InstanceState {
  if (!isRecord(value)) {
    throw new Error('Instance state must be an object.');
  }
  const { runId, pid, port, url, assetPath, repoRoot, startedAt } = value;
  if (typeof runId !== 'string' || typeof url !== 'string' || typeof assetPath !== 'string') {
    throw new Error('Instance state is missing runId, url, or assetPath.');
  }
  if (typeof pid !== 'number' || typeof port !== 'number' || typeof repoRoot !== 'string' || typeof startedAt !== 'string') {
    throw new Error('Instance state is missing pid, port, repoRoot, or startedAt.');
  }
  return { runId: parseRunId(runId), pid, port, url, assetPath, repoRoot, startedAt };
}

function readState(layout: VerifyLayout, runId: string): InstanceState | null {
  const path = statePath(layout, runId);
  if (!existsSync(path)) {
    return null;
  }
  return parseState(JSON.parse(readFileSync(path, 'utf8')));
}

function writeState(layout: VerifyLayout, state: InstanceState): void {
  const dir = instanceDir(layout, state.runId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'state.json');
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, path);
}

function loadHandler(assetIndex: string): (event: HttpApiEvent) => unknown {
  const require = createRequire(assetIndex);
  const loaded: unknown = require(assetIndex);
  if (!isRecord(loaded) || typeof loaded.handler !== 'function') {
    throw new Error(`${assetIndex} does not export handler.`);
  }
  return loaded.handler as (event: HttpApiEvent) => unknown;
}

function buildEvent(rawQueryString: string): HttpApiEvent {
  return {
    version: '2.0',
    routeKey: 'GET /health',
    rawPath: HEALTH_PATH,
    rawQueryString,
    headers: { host: '127.0.0.1' },
    requestContext: {
      http: {
        method: 'GET',
        path: HEALTH_PATH,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'golf-verify',
      },
      requestId: randomUUID(),
      routeKey: 'GET /health',
      stage: '$default',
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
  };
}

function serve(port: number, assetPath: string): void {
  const handler = loadHandler(assetPath);
  Bun.serve({
    hostname: '127.0.0.1',
    port,
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method !== 'GET' || url.pathname !== HEALTH_PATH) {
        console.log(`${request.method} ${url.pathname} 404`);
        return new Response(NOT_FOUND_BODY, {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }
      try {
        const result = parseLambdaResult(await Promise.resolve(handler(buildEvent(url.searchParams.toString()))));
        console.log(`GET ${url.pathname} ${result.statusCode}`);
        return new Response(result.body, { status: result.statusCode, headers: result.headers });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`GET ${url.pathname} 500`);
        return new Response(JSON.stringify({ message }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    },
  });
}

async function waitUntilHealthy(url: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}${HEALTH_PATH}`);
      const body = await response.text();
      if (response.status === 200 && body === HEALTH_BODY) {
        parseHealthReport(body);
        return;
      }
      last = `${response.status} ${body}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await Bun.sleep(100);
  }
  throw new Error(`GET ${url}${HEALTH_PATH} did not return ${HEALTH_BODY}. Last response: ${last}`);
}

function signalPid(pid: number, signalName: NodeJS.Signals): void {
  try {
    process.kill(pid, signalName);
  } catch (error) {
    if (isErrno(error, 'ESRCH')) {
      return;
    }
    throw error;
  }
}

function stopPid(pid: number, runId: string): void {
  const line = processCommandLine(pid);
  if (line === null) {
    return;
  }
  if (!isVerifyServer(line, runId)) {
    throw new Error(`Refusing to kill pid ${pid}. Its command line is not the golf-verify server for ${runId}.`);
  }
  signalPid(pid, 'SIGTERM');
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (processCommandLine(pid) === null) {
      return;
    }
    Bun.sleepSync(50);
  }
  const still = processCommandLine(pid);
  if (still !== null && isVerifyServer(still, runId)) {
    signalPid(pid, 'SIGKILL');
  }
}

function installAndSynth(repoRoot: string, logDir: string): string {
  const install = bunCommand(['install', '--frozen-lockfile']);
  runLogged(install.command, install.args, repoRoot, join(logDir, 'bun-install.log'));
  const synth = bunxCommand(['nx', 'run', 'golf-api:synth', '--skip-nx-cache']);
  runLogged(synth.command, synth.args, repoRoot, join(logDir, 'synth.log'));
  const facts = readGolfSynth(join(repoRoot, 'apps/golf-api/cdk.out'));
  const problems = golfTemplateProblems(facts);
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
  if (facts.assetIndex === null) {
    throw new Error('Synth did not leave a Lambda bundle.');
  }
  return facts.assetIndex;
}

async function launch(repoRoot: string, layout: VerifyLayout): Promise<void> {
  const current = readCurrent(layout);
  if (current !== null) {
    const existing = readState(layout, current);
    if (existing !== null) {
      const line = processCommandLine(existing.pid);
      if (line !== null && isVerifyServer(line, existing.runId)) {
        throw new Error(`An instance is already running at ${existing.url}. Run cleanup before launch.`);
      }
    }
  }

  const runId = parseRunId(process.env.GOLF_VERIFY_RUN_ID ?? randomUUID());
  const port = verifyPort();
  const listener = pidListeningOnPort(port);
  if (listener !== null) {
    throw new Error(`Port ${port} is already used by pid ${listener}. Set GOLF_VERIFY_PORT to a free port.`);
  }

  const proof = evidenceDir(layout.home, runId);
  const launchDir = join(proof, 'launch');
  mkdirSync(launchDir, { recursive: true });
  rememberEvidence(layout, proof);

  let assetPath = '';
  await withLock(layout, async () => {
    assetPath = installAndSynth(repoRoot, launchDir);
  });
  if (assetPath.length === 0) {
    throw new Error('Synth finished without an asset path.');
  }
  writeFileSync(join(launchDir, 'asset-path.txt'), `${assetPath}\n`);

  const logPath = join(instanceDir(layout, runId), 'server.log');
  mkdirSync(dirname(logPath), { recursive: true });
  const logFd = openSync(logPath, 'a');
  const child = spawn(process.execPath, [SCRIPT_PATH, 'serve', '--run-id', runId, '--port', String(port), '--asset', assetPath], {
    cwd: repoRoot,
    env: awsClearedEnv(process.env),
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  closeSync(logFd);
  if (child.pid === undefined) {
    throw new Error('The local server did not return a pid.');
  }

  const url = `http://127.0.0.1:${port}`;
  const state: InstanceState = {
    runId,
    pid: child.pid,
    port,
    url,
    assetPath,
    repoRoot,
    startedAt: new Date().toISOString(),
  };
  writeState(layout, state);
  writeCurrent(layout, runId);

  try {
    await waitUntilHealthy(url);
  } catch (error) {
    stopPid(child.pid, runId);
    throw error;
  }

  console.log(`ready\nrunId=${runId}\npid=${child.pid}\nurl=${url}\nevidence=${proof}`);
}

async function inspect(layout: VerifyLayout): Promise<InstanceState> {
  const runId = readCurrent(layout);
  if (runId === null) {
    throw new Error('No current instance. Run launch first.');
  }
  const state = readState(layout, runId);
  if (state === null) {
    throw new Error(`Run ${runId} has no instance state.`);
  }
  const line = processCommandLine(state.pid);
  if (line === null || !isVerifyServer(line, state.runId)) {
    throw new Error(`Pid ${state.pid} is not the golf-verify server for ${state.runId}.`);
  }
  const listener = pidListeningOnPort(state.port);
  if (listener !== state.pid) {
    throw new Error(`Port ${state.port} is owned by pid ${listener ?? 'none'}, not ${state.pid}.`);
  }
  if (!existsSync(state.assetPath)) {
    throw new Error(`Bundled handler is missing at ${state.assetPath}.`);
  }
  const response = await fetch(`${state.url}${HEALTH_PATH}`);
  const body = await response.text();
  if (response.status !== 200 || body !== HEALTH_BODY) {
    throw new Error(`GET ${state.url}${HEALTH_PATH} returned ${response.status} ${body}.`);
  }
  parseHealthReport(body);
  return state;
}

async function doctor(layout: VerifyLayout): Promise<InstanceState> {
  const state = await inspect(layout);
  const response = await fetch(`${state.url}${HEALTH_PATH}`);
  const body = await response.text();
  if (response.status !== 200 || body !== HEALTH_BODY) {
    throw new Error(`GET ${state.url}${HEALTH_PATH} returned ${response.status} ${body}.`);
  }
  console.log(
    `ok\nrunId=${state.runId}\npid=${state.pid}\nport=${state.port}\nurl=${state.url}\nasset=${state.assetPath}\nhealth=${body}`,
  );
  return state;
}

async function driveHealth(layout: VerifyLayout): Promise<void> {
  const state = await inspect(layout);
  const dir = join(evidenceDir(layout.home, state.runId), 'health');
  mkdirSync(dir, { recursive: true });
  const beforeGit = gitText(state.repoRoot, ['status', '--porcelain']);
  const beforeAsset = `${statSync(state.assetPath).mtimeMs}:${statSync(state.assetPath).size}`;
  writeFileSync(join(dir, 'request.txt'), `GET ${HEALTH_PATH} HTTP/1.1\nHost: 127.0.0.1:${state.port}\n`);
  const status = curlStatus('GET', `${state.url}${HEALTH_PATH}`, join(dir, 'response.headers'), join(dir, 'response.body'));
  const body = readFileSync(join(dir, 'response.body'), 'utf8');
  const afterGit = gitText(state.repoRoot, ['status', '--porcelain']);
  const afterAsset = `${statSync(state.assetPath).mtimeMs}:${statSync(state.assetPath).size}`;
  writeFileSync(join(dir, 'git-status-before.txt'), beforeGit);
  writeFileSync(join(dir, 'git-status-after.txt'), afterGit);
  writeFileSync(join(dir, 'response.status'), `${status}\n`);
  rememberEvidence(layout, dir);
  if (status !== 200 || body !== HEALTH_BODY) {
    throw new Error(`GET ${HEALTH_PATH} returned ${status} ${body}.`);
  }
  parseHealthReport(body);
  if (beforeGit !== afterGit) {
    throw new Error('git status changed during GET /health. See the evidence directory.');
  }
  if (beforeAsset !== afterAsset) {
    throw new Error('The bundled handler changed during GET /health.');
  }
  console.log(`status=${status}\nbody=${body}\ngitStatusUnchanged=true\nassetUnchanged=true\nevidence=${dir}`);
}

async function driveHealthQuery(layout: VerifyLayout): Promise<void> {
  const state = await inspect(layout);
  const dir = join(evidenceDir(layout.home, state.runId), 'health-query');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'request.txt'), `GET ${HEALTH_PATH}?ready=1 HTTP/1.1\nHost: 127.0.0.1:${state.port}\n`);
  const status = curlStatus(
    'GET',
    `${state.url}${HEALTH_PATH}?ready=1`,
    join(dir, 'response.headers'),
    join(dir, 'response.body'),
  );
  const body = readFileSync(join(dir, 'response.body'), 'utf8');
  rememberEvidence(layout, dir);
  if (status !== 200 || body !== HEALTH_BODY) {
    throw new Error(`GET ${HEALTH_PATH}?ready=1 returned ${status} ${body}.`);
  }
  console.log(`status=${status}\nbody=${body}\nevidence=${dir}`);
}

async function driveHealthMiss(layout: VerifyLayout): Promise<void> {
  const state = await inspect(layout);
  const dir = join(evidenceDir(layout.home, state.runId), 'health-miss');
  mkdirSync(dir, { recursive: true });
  const missing = curlStatus('GET', `${state.url}/missing`, join(dir, 'missing.headers'), join(dir, 'missing.body'));
  const missingBody = readFileSync(join(dir, 'missing.body'), 'utf8');
  const posted = curlStatus('POST', `${state.url}${HEALTH_PATH}`, join(dir, 'post.headers'), join(dir, 'post.body'));
  const postedBody = readFileSync(join(dir, 'post.body'), 'utf8');
  rememberEvidence(layout, dir);
  if (missing !== 404 || missingBody !== NOT_FOUND_BODY) {
    throw new Error(`GET /missing returned ${missing} ${missingBody}.`);
  }
  if (posted !== 404 || postedBody !== NOT_FOUND_BODY) {
    throw new Error(`POST ${HEALTH_PATH} returned ${posted} ${postedBody}.`);
  }
  console.log(`GET /missing status=${missing}\nPOST /health status=${posted}\nevidence=${dir}`);
}

async function driveSynth(repoRoot: string, layout: VerifyLayout): Promise<void> {
  const runId = ensureRunId(layout);
  const dir = join(evidenceDir(layout.home, runId), 'synth');
  mkdirSync(dir, { recursive: true });
  rememberEvidence(layout, dir);
  await withLock(layout, async () => {
    installAndSynth(repoRoot, dir);
  });
  const facts: SynthFacts = readGolfSynth(join(repoRoot, 'apps/golf-api/cdk.out'));
  writeFileSync(join(dir, 'template-facts.json'), `${JSON.stringify(facts, null, 2)}\n`);
  copyFileSync(join(repoRoot, 'apps/golf-api/cdk.out/GolfApiStack.template.json'), join(dir, 'GolfApiStack.template.json'));
  console.log(`route=GET /health\nasset=${facts.assetIndex ?? ''}\naccountIdLiterals=${facts.accountIdLiterals}\nevidence=${dir}`);
}

function schemaPattern(repoRoot: string): RegExp {
  return appNamePattern(readFileSync(join(repoRoot, 'tools/generators/src/app/schema.json'), 'utf8'));
}

function appDirectory(repoRoot: string, name: string): string {
  const pattern = schemaPattern(repoRoot);
  if (!pattern.test(name)) {
    throw new Error(`App name "${name}" does not match ${pattern}.`);
  }
  const apps = resolve(repoRoot, 'apps');
  const appDir = resolve(apps, name);
  if (!appDir.startsWith(`${apps}${sep}`)) {
    throw new Error(`App path ${appDir} escapes ${apps}.`);
  }
  return appDir;
}

function parseGeneratorName(rest: readonly string[]): string {
  if (rest.length !== 2 || rest[0] !== '--name' || rest[1] === undefined || rest[1].startsWith('-')) {
    throw new Error('Use drive generator --name <kebab-case-name>.');
  }
  return rest[1];
}

function restoreGenerator(repoRoot: string, layout: VerifyLayout, runId: string): boolean {
  const dir = scratchDir(layout, runId);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return false;
  }
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!isRecord(parsed) || typeof parsed.name !== 'string') {
    throw new Error(`Scratch manifest ${manifestPath} has no name.`);
  }
  const appDir = appDirectory(repoRoot, parsed.name);
  rmSync(appDir, { recursive: true, force: true });
  copyFileSync(join(dir, 'module-boundaries.json'), join(repoRoot, 'tools/module-boundaries.json'));
  copyFileSync(join(dir, 'bun.lock'), join(repoRoot, 'bun.lock'));
  const install = bunCommand(['install', '--frozen-lockfile']);
  runLogged(install.command, install.args, repoRoot, join(dir, 'restore-install.log'));
  rmSync(dir, { recursive: true, force: true });
  return true;
}

async function driveGenerator(repoRoot: string, layout: VerifyLayout, rest: readonly string[]): Promise<void> {
  const name = parseGeneratorName(rest);
  const appDir = appDirectory(repoRoot, name);
  if (existsSync(appDir)) {
    throw new Error(`${appDir} already exists.`);
  }
  const runId = ensureRunId(layout);
  const dir = join(evidenceDir(layout.home, runId), 'generator');
  const scratch = scratchDir(layout, runId);
  mkdirSync(dir, { recursive: true });
  mkdirSync(scratch, { recursive: true });
  copyFileSync(join(repoRoot, 'tools/module-boundaries.json'), join(scratch, 'module-boundaries.json'));
  copyFileSync(join(repoRoot, 'bun.lock'), join(scratch, 'bun.lock'));
  writeFileSync(join(scratch, 'manifest.json'), `${JSON.stringify({ name, runId }, null, 2)}\n`);
  rememberEvidence(layout, dir);

  try {
    await withLock(layout, async () => {
      const generate = bunCommand(['run', 'generate:app', '--', name]);
      runLogged(generate.command, generate.args, repoRoot, join(dir, 'generate.log'));
      const install = bunCommand(['install']);
      runLogged(install.command, install.args, repoRoot, join(dir, 'bun-install.log'));
      const test = bunxCommand(['nx', 'run', `${name}:test`]);
      runLogged(test.command, test.args, repoRoot, join(dir, 'test.log'));
      const synth = bunxCommand(['nx', 'run', `${name}:synth`, '--skip-nx-cache']);
      runLogged(synth.command, synth.args, repoRoot, join(dir, 'synth.log'));
    });

    const className = classNameForApp(name);
    const agents = readFileSync(join(appDir, 'AGENTS.md'), 'utf8');
    const readme = readFileSync(join(appDir, 'README.md'), 'utf8');
    const stack = readFileSync(join(appDir, 'src/stacks', `${name}-stack.ts`), 'utf8');
    const boundaries = readFileSync(join(repoRoot, 'tools/module-boundaries.json'), 'utf8');
    const lockfile = readFileSync(join(repoRoot, 'bun.lock'), 'utf8');
    const templatePath = join(appDir, 'cdk.out', `${className}.template.json`);
    const templateText = readFileSync(templatePath, 'utf8');
    const template: unknown = JSON.parse(templateText);
    if (!agents.startsWith(`# ${name}\n`) || !agents.includes(className)) {
      throw new Error(`apps/${name}/AGENTS.md does not name ${name} and ${className}.`);
    }
    if (!readme.startsWith(`# ${name}\n`)) {
      throw new Error(`apps/${name}/README.md does not title ${name}.`);
    }
    if (!stack.includes(`export class ${className}`)) {
      throw new Error(`apps/${name}/src/stacks/${name}-stack.ts does not export ${className}.`);
    }
    if (!boundaries.includes(`"sourceTag": "scope:${name}"`)) {
      throw new Error(`tools/module-boundaries.json has no scope:${name}.`);
    }
    if (!lockfile.includes(`"@teem-labs/${name}"`)) {
      throw new Error(`bun.lock has no @teem-labs/${name} workspace.`);
    }
    if (!isRecord(template) || !isRecord(template.Resources)) {
      throw new Error(`${templatePath} has no Resources object.`);
    }
    const types = Object.values(template.Resources).flatMap((resource) =>
      isRecord(resource) && typeof resource.Type === 'string' ? [resource.Type] : [],
    );
    if (types.includes('AWS::Lambda::Function') || types.includes('AWS::ApiGatewayV2::Route')) {
      throw new Error(`Generated ${className} synthesized a Lambda or an HTTP route.`);
    }
    writeFileSync(join(dir, 'resource-types.txt'), `${types.join('\n')}\n`);
    writeFileSync(join(dir, 'boundaries.diff'), gitText(repoRoot, ['diff', '--', 'tools/module-boundaries.json']));
    writeFileSync(join(dir, 'bun.lock.diff'), gitText(repoRoot, ['diff', '--', 'bun.lock']));
    copyFileSync(join(appDir, 'AGENTS.md'), join(dir, 'AGENTS.md'));
    copyFileSync(join(appDir, 'README.md'), join(dir, 'README.md'));
    console.log(
      `created=apps/${name}\nclass=${className}\nscope=scope:${name}\nresourceTypes=${types.join(',') || 'none'}\nevidence=${dir}`,
    );
  } catch (error) {
    restoreGenerator(repoRoot, layout, runId);
    throw error;
  }
}

async function cleanup(repoRoot: string, layout: VerifyLayout): Promise<void> {
  const runId = readCurrent(layout);
  if (runId === null) {
    const last = existsSync(layout.lastEvidenceFile) ? readFileSync(layout.lastEvidenceFile, 'utf8').trim() : '';
    console.log(last.length > 0 ? `idle\nevidence=${last}` : 'idle');
    return;
  }
  if (!evidenceSurvivesCleanup(layout, runId)) {
    throw new Error(`Cleanup targets overlap evidence for ${runId}.`);
  }
  const state = readState(layout, runId);
  if (state !== null) {
    stopPid(state.pid, state.runId);
  }
  const restored = restoreGenerator(repoRoot, layout, runId);
  for (const target of cleanupTargets(layout, runId)) {
    rmSync(target, { recursive: true, force: true });
  }
  const evidence = existsSync(layout.lastEvidenceFile) ? readFileSync(layout.lastEvidenceFile, 'utf8').trim() : evidenceDir(layout.home, runId);
  console.log(`stopped\nrestoredGenerator=${restored}\nevidence=${evidence}`);
}

function showEvidence(layout: VerifyLayout): void {
  if (!existsSync(layout.lastEvidenceFile)) {
    throw new Error('No evidence pointer. Run a drive first.');
  }
  const path = readFileSync(layout.lastEvidenceFile, 'utf8').trim();
  if (!existsSync(path)) {
    throw new Error(`Evidence path ${path} does not exist.`);
  }
  console.log(`evidence=${path}\nexists=true`);
}

function parseCommand(argv: readonly string[]): Command {
  const [name, ...rest] = argv;
  switch (name) {
    case 'launch':
      return { kind: 'launch' };
    case 'doctor':
      return { kind: 'doctor' };
    case 'url':
      return { kind: 'url' };
    case 'evidence':
      return { kind: 'evidence' };
    case 'cleanup':
      return { kind: 'cleanup' };
    case 'drive':
      return { kind: 'drive', feature: parseFeature(rest[0]), rest: rest.slice(1) };
    case 'serve':
      return parseServe(rest);
    default: {
      throw new Error('Use launch, doctor, url, drive, evidence, or cleanup.');
    }
  }
}

function parseFeature(value: string | undefined): DriveFeature {
  switch (value) {
    case 'health':
    case 'health-query':
    case 'health-miss':
    case 'synth':
    case 'generator':
      return value;
    default: {
      throw new Error('Use drive health, drive health-query, drive health-miss, drive synth, or drive generator --name <name>.');
    }
  }
}

function parseServe(rest: readonly string[]): Command {
  let runId = '';
  let port = '';
  let assetPath = '';
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (value === undefined) {
      throw new Error('serve flags need values.');
    }
    switch (flag) {
      case '--run-id':
        runId = value;
        break;
      case '--port':
        port = value;
        break;
      case '--asset':
        assetPath = value;
        break;
      default: {
        throw new Error(`Unknown serve flag ${flag ?? ''}.`);
      }
    }
  }
  if (!/^\d+$/.test(port)) {
    throw new Error('serve requires --port.');
  }
  return { kind: 'serve', runId: parseRunId(runId), port: Number(port), assetPath };
}

async function runCommand(command: Command, repoRoot: string, layout: VerifyLayout): Promise<void> {
  switch (command.kind) {
    case 'launch':
      await launch(repoRoot, layout);
      return;
    case 'doctor':
      await doctor(layout);
      return;
    case 'url': {
      const state = await inspect(layout);
      console.log(state.url);
      return;
    }
    case 'evidence':
      showEvidence(layout);
      return;
    case 'cleanup':
      await cleanup(repoRoot, layout);
      return;
    case 'serve':
      serve(command.port, command.assetPath);
      return;
    case 'drive':
      await drive(command.feature, command.rest, repoRoot, layout);
      return;
    default: {
      const unexpected: never = command;
      throw new Error(`Unhandled command ${String(unexpected)}.`);
    }
  }
}

async function drive(feature: DriveFeature, rest: readonly string[], repoRoot: string, layout: VerifyLayout): Promise<void> {
  switch (feature) {
    case 'health':
      await driveHealth(layout);
      return;
    case 'health-query':
      await driveHealthQuery(layout);
      return;
    case 'health-miss':
      await driveHealthMiss(layout);
      return;
    case 'synth':
      await driveSynth(repoRoot, layout);
      return;
    case 'generator':
      await driveGenerator(repoRoot, layout, rest);
      return;
    default: {
      const unexpected: never = feature;
      throw new Error(`Unhandled feature ${String(unexpected)}.`);
    }
  }
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));
  if (command.kind === 'serve') {
    serve(command.port, command.assetPath);
    return;
  }
  const repoRoot = findRepoRoot(dirname(SCRIPT_PATH));
  const layout = layoutFor(verifyHome(), repoRoot);
  await runCommand(command, repoRoot, layout);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
