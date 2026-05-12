// Suite-level e2e regression guard for the M5.7 cross-plugin handoff +
// compaction-state round-trip. Pins the 4-artifact fixture set under
// tests/fixtures/handoff-roundtrip/ against the M3 envelope schema, the
// per-payload schemas (handoff / compaction-state), the identity-triplet
// invariant (artifact_kind == schema.name), and the parent_run_id chain
// that closes the deep-work ↔ deep-evolve round-trip.
//
// What this catches (regressions in any of these silently breaks the
// dashboard's 3 M5-activated metrics in production):
//   1. A producer drops envelope.parent_run_id or mis-targets it → reverse
//      handoff no longer chains → roundtrip_success_rate diverges
//   2. A producer renames a payload field (e.g., preserved_artifact_paths
//      → preserved_paths) → compaction.preserved_artifact_ratio breaks
//   3. envelope.schema.{name,version} drifts away from artifact_kind →
//      validate-artifact.js identity check fails downstream
//
// Scope: schema + structural contract only. The dashboard's metric *math*
// is tested in claude-deep-dashboard (separate repo); we mirror the math
// inline here just enough to assert the fixture set produces the expected
// roundtrip_success_rate=1.0 and frequency=2 values.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const fixtureDir = resolve(repoRoot, 'tests/fixtures/handoff-roundtrip');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const AjvCtor = Ajv2020.default ?? Ajv2020;
const addFormatsFn = addFormats.default ?? addFormats;

function makeValidator(relPath) {
  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);
  return ajv.compile(readJson(resolve(repoRoot, relPath)));
}

const envelopeValidate = makeValidator('schemas/artifact-envelope.schema.json');
const handoffValidate = makeValidator('schemas/handoff.schema.json');
const compactionValidate = makeValidator('schemas/compaction-state.schema.json');

const fixtureFiles = readdirSync(fixtureDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

function loadFixtures() {
  return fixtureFiles.map((f) => ({
    name: f,
    path: resolve(fixtureDir, f),
    data: readJson(resolve(fixtureDir, f)),
  }));
}

describe('handoff-roundtrip e2e fixture set (M5.7.B regression guard)', () => {
  test('fixture set contains exactly 4 envelope-wrapped artifacts', () => {
    assert.equal(fixtureFiles.length, 4, `expected 4 fixtures, got ${fixtureFiles.length}: ${fixtureFiles.join(', ')}`);
  });

  test('all fixtures pass M3 envelope schema', () => {
    for (const fx of loadFixtures()) {
      const ok = envelopeValidate(fx.data);
      assert.equal(
        ok,
        true,
        `${fx.name} envelope errors: ${JSON.stringify(envelopeValidate.errors, null, 2)}`,
      );
    }
  });

  test('all fixtures satisfy identity-triplet (artifact_kind == schema.name)', () => {
    for (const fx of loadFixtures()) {
      const { envelope } = fx.data;
      assert.equal(
        envelope.artifact_kind,
        envelope.schema.name,
        `${fx.name}: envelope.artifact_kind "${envelope.artifact_kind}" != schema.name "${envelope.schema.name}"`,
      );
    }
  });

  test('all fixtures pin schema.version to "1.0" (lock-not-additive policy)', () => {
    for (const fx of loadFixtures()) {
      assert.equal(fx.data.envelope.schema.version, '1.0', `${fx.name}: schema.version drift`);
      assert.equal(fx.data.schema_version, '1.0', `${fx.name}: envelope schema_version drift`);
      assert.equal(fx.data.payload.schema_version, '1.0', `${fx.name}: payload schema_version drift`);
    }
  });

  test('handoff payloads validate against handoff.schema.json', () => {
    const handoffs = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'handoff');
    assert.equal(handoffs.length, 2, 'expected exactly 2 handoff artifacts');
    for (const fx of handoffs) {
      const ok = handoffValidate(fx.data.payload);
      assert.equal(
        ok,
        true,
        `${fx.name} handoff payload errors: ${JSON.stringify(handoffValidate.errors, null, 2)}`,
      );
    }
  });

  test('compaction-state payloads validate against compaction-state.schema.json', () => {
    const compactions = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'compaction-state');
    assert.equal(compactions.length, 2, 'expected exactly 2 compaction-state artifacts');
    for (const fx of compactions) {
      const ok = compactionValidate(fx.data.payload);
      assert.equal(
        ok,
        true,
        `${fx.name} compaction payload errors: ${JSON.stringify(compactionValidate.errors, null, 2)}`,
      );
    }
  });

  test('handoff kinds cover both directions (phase-5-to-evolve + evolve-to-deep-work)', () => {
    const handoffs = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'handoff');
    const kinds = handoffs.map((h) => h.data.payload.handoff_kind).sort();
    assert.deepEqual(kinds, ['evolve-to-deep-work', 'phase-5-to-evolve']);
  });

  test('compaction-state covers both producers (one each)', () => {
    const compactions = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'compaction-state');
    const producers = compactions.map((c) => c.data.envelope.producer).sort();
    assert.deepEqual(producers, ['deep-evolve', 'deep-work']);
  });

  test('compaction triggers match canonical scenario (phase-transition + loop-epoch-end)', () => {
    const compactions = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'compaction-state');
    const triggers = compactions.map((c) => c.data.payload.trigger).sort();
    assert.deepEqual(triggers, ['loop-epoch-end', 'phase-transition']);
  });

  test('reverse handoff parent_run_id chains to forward handoff envelope.run_id', () => {
    const fixtures = loadFixtures();
    const forward = fixtures.find(
      (f) => f.data.envelope.artifact_kind === 'handoff' && f.data.payload.handoff_kind === 'phase-5-to-evolve',
    );
    const reverse = fixtures.find(
      (f) => f.data.envelope.artifact_kind === 'handoff' && f.data.payload.handoff_kind === 'evolve-to-deep-work',
    );
    assert.ok(forward, 'forward handoff fixture missing');
    assert.ok(reverse, 'reverse handoff fixture missing');
    assert.equal(
      reverse.data.envelope.parent_run_id,
      forward.data.envelope.run_id,
      'reverse handoff envelope.parent_run_id must equal forward handoff envelope.run_id',
    );
    assert.equal(reverse.data.payload.from.producer, forward.data.payload.to.producer);
    assert.equal(reverse.data.payload.to.producer, forward.data.payload.from.producer);
  });

  test('within-plugin git context is internally consistent', () => {
    const fixtures = loadFixtures();
    for (const producer of ['deep-work', 'deep-evolve']) {
      const heads = new Set(
        fixtures.filter((f) => f.data.envelope.producer === producer).map((f) => f.data.envelope.git.head),
      );
      assert.equal(
        heads.size,
        1,
        `${producer} artifacts must share git.head; got ${[...heads].join(', ')}`,
      );
    }
  });

  test('cross-plugin handoff transitions branches (deep-work ↔ deep-evolve)', () => {
    const fixtures = loadFixtures();
    const forward = fixtures.find(
      (f) => f.data.envelope.producer === 'deep-work' && f.data.envelope.artifact_kind === 'handoff',
    );
    const reverse = fixtures.find(
      (f) => f.data.envelope.producer === 'deep-evolve' && f.data.envelope.artifact_kind === 'handoff',
    );
    assert.notEqual(
      forward.data.envelope.git.branch,
      reverse.data.envelope.git.branch,
      'forward and reverse handoff must live on different branches (cross-session)',
    );
  });

  test('dashboard metric mirror: roundtrip_success_rate computes to 1.0', () => {
    // Mirror of dashboard collector: count initiating handoffs whose receiver
    // (payload.to.producer) emits a reverse handoff with parent_run_id ==
    // initiating envelope.run_id. Pure structural — no fuzzy matching.
    const fixtures = loadFixtures();
    const initiating = fixtures.filter(
      (f) => f.data.envelope.artifact_kind === 'handoff' && f.data.payload.handoff_kind === 'phase-5-to-evolve',
    );
    const reverses = fixtures.filter(
      (f) => f.data.envelope.artifact_kind === 'handoff' && f.data.payload.handoff_kind === 'evolve-to-deep-work',
    );
    const closed = initiating.filter((init) =>
      reverses.some(
        (rev) =>
          rev.data.envelope.parent_run_id === init.data.envelope.run_id &&
          rev.data.payload.from.producer === init.data.payload.to.producer,
      ),
    );
    const successRate = closed.length / initiating.length;
    assert.equal(successRate, 1.0, `expected roundtrip_success_rate=1.0, got ${successRate}`);
  });

  test('dashboard metric mirror: compaction.frequency == 2', () => {
    const compactions = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'compaction-state');
    assert.equal(compactions.length, 2, `expected compaction.frequency=2, got ${compactions.length}`);
  });

  test('dashboard metric mirror: compaction.preserved_artifact_ratio (mean) matches fixture-derived value', () => {
    // ratio per compaction = preserved / (preserved + discarded); mean across
    // all compactions. Skip when denom=0 (full-reset trivially undefined).
    const compactions = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'compaction-state');
    const ratios = compactions
      .map((c) => {
        const preserved = c.data.payload.preserved_artifact_paths?.length ?? 0;
        const discarded = c.data.payload.discarded_artifact_paths?.length ?? 0;
        const denom = preserved + discarded;
        return denom === 0 ? null : preserved / denom;
      })
      .filter((r) => r !== null);

    assert.ok(ratios.length > 0, 'at least one compaction must contribute to the ratio');
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    assert.ok(Number.isFinite(mean), 'mean must be finite');

    // Fixture math:
    //   02-deep-work-compaction:    preserved=2 / (2+3) = 0.4
    //   03-deep-evolve-compaction:  preserved=2 / (2+3) = 0.4
    //   mean = 0.4 (exact)
    // If a producer renames preserved_artifact_paths / discarded_artifact_paths,
    // or shifts counts in either fixture, this assertion fires.
    assert.equal(mean.toFixed(4), '0.4000', `expected mean=0.4000, got ${mean}`);
  });

  test('all envelopes carry M3 provenance.tool_versions.node (audit trail)', () => {
    for (const fx of loadFixtures()) {
      const node = fx.data.envelope.provenance.tool_versions?.node;
      assert.ok(node, `${fx.name}: missing provenance.tool_versions.node`);
    }
  });

  test('handoff key_artifacts paths use repo-relative form (no leading slash)', () => {
    const handoffs = loadFixtures().filter((f) => f.data.envelope.artifact_kind === 'handoff');
    for (const fx of handoffs) {
      for (const ka of fx.data.payload.key_artifacts ?? []) {
        assert.ok(
          !ka.path.startsWith('/'),
          `${fx.name} key_artifact path "${ka.path}" must be repo-relative (no leading slash)`,
        );
      }
    }
  });
});
