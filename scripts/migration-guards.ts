import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

const guardEntrySchema = z.object({
  id: z.string().min(1),
  phase: z.union([z.literal('widen'), z.literal('narrow')]),
  requires: z.array(z.string().min(1)),
});

const guardManifestSchema = z.object({
  entries: z.array(guardEntrySchema).min(1),
});

function parseArgs(argv: string[]) {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const mode = positional[0] ?? 'deploy';
  const timeoutMsRaw = positional[1] ?? `${45 * 60 * 1000}`;
  const intervalMsRaw = positional[2] ?? '5000';
  const timeoutMs = Number(timeoutMsRaw);
  const intervalMs = Number(intervalMsRaw);
  const useProd = argv.includes('--prod');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid timeoutMs: ${timeoutMsRaw}`);
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error(`Invalid intervalMs: ${intervalMsRaw}`);
  }
  return { mode, timeoutMs, intervalMs, useProd };
}

function manifestPath() {
  return join(import.meta.dir, '..', 'convex', 'migration-guards.json');
}

async function loadManifest() {
  const path = manifestPath();
  if (!existsSync(path)) {
    throw new Error(`Missing manifest: ${path}`);
  }
  const json = await Bun.file(path).json();
  return guardManifestSchema.parse(json);
}

function requiredForAnyNarrow(entries: z.infer<typeof guardManifestSchema>['entries']) {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.phase === 'narrow') {
      for (const id of entry.requires) ids.add(id);
    }
  }
  return Array.from(ids).sort();
}

function deploySet(entries: z.infer<typeof guardManifestSchema>['entries']) {
  return entries
    .filter((entry) => entry.phase === 'widen')
    .map((entry) => entry.id)
    .sort();
}

function cmdFor(functionName: string, args: unknown, useProd: boolean): string {
  const prodFlag = useProd ? ' --prod' : '';
  return `bunx convex run ${functionName} '${JSON.stringify(args)}'${prodFlag}`;
}

function runCmd(command: string) {
  const proc = Bun.spawnSync({
    cmd: ['bash', '-lc', command],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = proc.stdout.toString();
  const stderr = proc.stderr.toString();
  if (proc.exitCode !== 0) {
    throw new Error(
      [`Command failed: ${command}`, stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
    );
  }
  return stdout.trim();
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function deployMode(timeoutMs: number, intervalMs: number, useProd: boolean) {
  const manifest = await loadManifest();
  const idsToRun = deploySet(manifest.entries);
  const required = requiredForAnyNarrow(manifest.entries);

  if (idsToRun.length === 0) {
    throw new Error('No widen migrations defined in migration-guards.json');
  }
  if (required.length === 0) {
    throw new Error('No required migration IDs found for narrow guards');
  }

  runCmd(cmdFor('migrations:runRequired', { ids: idsToRun }, useProd));
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      runCmd(cmdFor('migrations:assertReadyForNarrow', { required }, useProd));
      runCmd(cmdFor('migrations:syncMigrationRuns', { ids: required }, useProd));
      console.log(JSON.stringify({ ok: true, required, idsToRun }));
      return;
    } catch {
      await sleep(intervalMs);
    }
  }
  throw new Error(`Timed out waiting for migrations to complete after ${timeoutMs}ms`);
}

async function narrowCheckMode(useProd: boolean) {
  const manifest = await loadManifest();
  const required = requiredForAnyNarrow(manifest.entries);
  if (required.length === 0) {
    throw new Error('No required migration IDs found for narrow guards');
  }
  runCmd(cmdFor('migrations:assertReadyForNarrow', { required }, useProd));
  console.log(JSON.stringify({ ok: true, required }));
}

const { mode, timeoutMs, intervalMs, useProd } = parseArgs(process.argv.slice(2));

if (mode === 'deploy') {
  await deployMode(timeoutMs, intervalMs, useProd);
} else if (mode === 'narrow-check') {
  await narrowCheckMode(useProd);
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
