import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('Codex marketplace mirrors Claude plugin pins with Codex policy fields', () => {
  const claude = readJson('.claude-plugin/marketplace.json');
  const codex = readJson('.agents/plugins/marketplace.json');

  assert.equal(codex.name, claude.name);
  assert.equal(codex.interface.displayName, 'Deep Suite');
  assert.deepEqual(
    codex.plugins.map((p) => p.name),
    claude.plugins.map((p) => p.name)
  );

  const claudeByName = new Map(claude.plugins.map((p) => [p.name, p]));
  for (const plugin of codex.plugins) {
    const claudePlugin = claudeByName.get(plugin.name);
    assert.ok(claudePlugin, `missing Claude source for ${plugin.name}`);
    assert.deepEqual(plugin.source, claudePlugin.source);
    assert.equal(plugin.source.source, 'url');
    assert.match(plugin.source.url, /^https:\/\/github\.com\/Sungmin-Cho\/claude-deep-/);
    assert.match(plugin.source.sha, /^[0-9a-f]{40}$/);
    assert.equal(plugin.policy.installation, 'AVAILABLE');
    assert.equal(plugin.policy.authentication, 'ON_USE');
    assert.ok(['Coding', 'Productivity'].includes(plugin.category));
  }
});

test('Manifest Doc Sync runs for Codex marketplace path changes', () => {
  const workflow = readFileSync('.github/workflows/manifest-doc-sync.yml', 'utf8');

  assert.match(
    workflow,
    /-\s+['"]?\.agents\/plugins\/\*\*['"]?/,
    'pull_request paths must include .agents/plugins/** so Codex-only marketplace changes run CI'
  );
});
