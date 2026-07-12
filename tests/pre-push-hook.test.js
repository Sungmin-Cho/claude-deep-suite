import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const hook = resolve(repoRoot, 'scripts/hooks/pre-push');

const LOCAL_GIT_ENV_VARS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
];

function withoutLocalGitEnv() {
  const env = { ...process.env };
  for (const name of LOCAL_GIT_ENV_VARS) delete env[name];
  return env;
}

test('pre-push clears inherited repository-local Git env before running preflight', {
  skip: process.platform === 'win32',
}, () => {
  const dir = mkdtempSync(join(tmpdir(), 'deep-suite-pre-push-'));
  try {
    const init = spawnSync('git', ['init'], {
      cwd: dir,
      env: withoutLocalGitEnv(),
      encoding: 'utf8',
    });
    assert.equal(init.status, 0, init.stderr);

    mkdirSync(join(dir, 'node_modules'));
    const binDir = join(dir, 'bin');
    mkdirSync(binDir);
    const capture = join(dir, 'npm-env.txt');
    const fakeNpm = join(binDir, 'npm');
    writeFileSync(fakeNpm, [
      '#!/bin/sh',
      '{',
      '  printf "cwd=%s\\n" "$PWD"',
      '  printf "argv=%s\\n" "$*"',
      ...LOCAL_GIT_ENV_VARS.flatMap((name) => [
        '  if [ "${' + name + '+x}" = x ]; then',
        '    printf "git_env=%s\\n" "' + name + '"',
        '  fi',
      ]),
      '} > "$CAPTURE_FILE"',
      '',
    ].join('\n'));
    chmodSync(fakeNpm, 0o755);

    const env = {
      ...withoutLocalGitEnv(),
      PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
      CAPTURE_FILE: capture,
      GIT_DIR: join(dir, '.git'),
      GIT_WORK_TREE: dir,
      GIT_INDEX_FILE: join(dir, '.git', 'index'),
    };
    const result = spawnSync('sh', [hook], {
      cwd: dir,
      env,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);

    const captured = readFileSync(capture, 'utf8').split('\n');
    assert.equal(captured[0], `cwd=${realpathSync(dir)}`);
    assert.equal(captured[1], 'argv=run --silent preflight');
    for (const name of LOCAL_GIT_ENV_VARS) {
      assert.equal(
        captured.includes(`git_env=${name}`),
        false,
        `${name} leaked from the Git hook into npm`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
