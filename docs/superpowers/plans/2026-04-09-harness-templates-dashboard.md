# Harness Templates + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Harness Engineering weaknesses #5 (Harness Templates), #6 (Self-Correction Loop), #7 (Harnessability Diagnosis), #8 (Unified Dashboard) across deep-work and deep-dashboard plugins.

**Architecture:** #5 and #6 extend the existing deep-work plugin (topology detection layer on registry.json, review-check sensor in SENSOR_RUN pipeline). #7 and #8 are a new deep-dashboard plugin at `~/Dev/deep-dashboard` with skills + lib modules. Implementation order follows bottom-up dependencies: #5 → #7 → #6 → #8.

**Tech Stack:** Node.js (CJS modules), JSON configs, Claude Code plugin skills (markdown)

**Spec:** `docs/superpowers/specs/2026-04-09-harness-templates-dashboard-design.md` (v2, 3-way reviewed)

---

## File Structure

### deep-work (existing plugin, `~/Dev/deep-work/`)

```
templates/
  topology-registry.json          # NEW — 6 topology definitions with detect/priority
  topology-detector.js            # NEW — detect topology from project root
  topology-detector.test.js       # NEW — topology detection tests
  template-loader.js              # NEW — load + deep merge templates
  template-loader.test.js         # NEW — loader + custom merge tests
  topologies/                     # NEW — per-topology template JSON files
    nextjs-app.json
    react-spa.json
    express-api.json
    python-web.json
    python-lib.json
    generic.json
  custom/                         # NEW — user custom topologies (empty, gitkeep)
    .gitkeep
sensors/
  review-check.js                 # NEW — review-check sensor (always-on + fitness layers)
  review-check.test.js            # NEW — review-check tests
  run-sensors.js                  # MODIFY — add review-check to pipeline, per-sensor rounds
```

### deep-dashboard (new plugin, `~/Dev/deep-dashboard/`)

```
.claude-plugin/
  plugin.json                     # NEW — plugin metadata
lib/
  harnessability/
    scorer.js                     # NEW — 6-dimension scoring engine
    scorer.test.js                # NEW — scorer tests
    checklist.json                # NEW — per-dimension check items
  dashboard/
    collector.js                  # NEW — receipt/scan data collector
    collector.test.js             # NEW — collector tests
    effectiveness.js              # NEW — effectiveness score calculator
    effectiveness.test.js         # NEW — effectiveness tests
    formatter.js                  # NEW — CLI table + markdown output
    formatter.test.js             # NEW — formatter tests
    action-router.js              # NEW — suggested_action per finding
skills/
  deep-harnessability.md          # NEW — /deep-harnessability skill
  deep-harness-dashboard.md       # NEW — /deep-harness-dashboard skill
package.json                      # NEW — @deep-suite/deep-dashboard
README.md                         # NEW
```

---

## Task 1: Topology Registry + Detector (#5, deep-work)

**Files:**
- Create: `~/Dev/deep-work/templates/topology-registry.json`
- Create: `~/Dev/deep-work/templates/topology-detector.js`
- Create: `~/Dev/deep-work/templates/topology-detector.test.js`

- [ ] **Step 1: Write topology detector tests**

```javascript
// ~/Dev/deep-work/templates/topology-detector.test.js
'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { detectTopology } = require('./topology-detector.js');

function createTempProject(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'topo-'));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('detectTopology', () => {
  let tmpDir;
  afterEach(() => { if (tmpDir) cleanup(tmpDir); });

  it('detects nextjs-app with next.config.js + app/ directory', () => {
    tmpDir = createTempProject({
      'next.config.js': 'module.exports = {}',
      'package.json': JSON.stringify({ dependencies: { next: '14.0.0', react: '18.0.0' } }),
      'app/page.tsx': '',
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'nextjs-app');
    assert.equal(result.confidence, 'high');
  });

  it('detects react-spa with react but no next/express', () => {
    tmpDir = createTempProject({
      'package.json': JSON.stringify({ dependencies: { react: '18.0.0', 'react-dom': '18.0.0' } }),
      'src/App.tsx': '',
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'react-spa');
  });

  it('detects express-api with express in deps', () => {
    tmpDir = createTempProject({
      'package.json': JSON.stringify({ dependencies: { express: '4.18.0' } }),
      'src/index.js': '',
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'express-api');
  });

  it('detects python-web with fastapi', () => {
    tmpDir = createTempProject({
      'pyproject.toml': '[project]\ndependencies = ["fastapi"]',
      'main.py': '',
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'python-web');
  });

  it('detects python-lib without web framework', () => {
    tmpDir = createTempProject({
      'pyproject.toml': '[project]\nname = "mylib"',
      'src/lib.py': '',
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'python-lib');
  });

  it('returns generic for unknown projects', () => {
    tmpDir = createTempProject({ 'README.md': '# hello' });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'generic');
    assert.equal(result.confidence, 'low');
  });

  it('prefers higher priority (nextjs-app over react-spa)', () => {
    tmpDir = createTempProject({
      'next.config.js': 'module.exports = {}',
      'package.json': JSON.stringify({ dependencies: { next: '14.0.0', react: '18.0.0' } }),
      'app/page.tsx': '',
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'nextjs-app');
  });

  it('detects fastify as express-api', () => {
    tmpDir = createTempProject({
      'package.json': JSON.stringify({ dependencies: { fastify: '4.0.0' } }),
    });
    const result = detectTopology(tmpDir);
    assert.equal(result.topology, 'express-api');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Dev/deep-work && node --test templates/topology-detector.test.js`
Expected: FAIL — `Cannot find module './topology-detector.js'`

- [ ] **Step 3: Create topology registry**

```json
// ~/Dev/deep-work/templates/topology-registry.json
{
  "$schema": "topology-registry-v1",
  "topologies": [
    {
      "id": "nextjs-app",
      "priority": 100,
      "display_name": "Next.js App Router",
      "detect": {
        "marker_files": ["next.config.js", "next.config.mjs", "next.config.ts"],
        "marker_dirs": ["app"],
        "deps": ["next"]
      }
    },
    {
      "id": "react-spa",
      "priority": 90,
      "display_name": "React SPA",
      "detect": {
        "deps": ["react"],
        "exclude_deps": ["next", "express", "fastify", "hono"]
      }
    },
    {
      "id": "express-api",
      "priority": 80,
      "display_name": "Express/Fastify API",
      "detect": {
        "deps_any": ["express", "fastify", "hono"],
        "exclude_deps": ["next"]
      }
    },
    {
      "id": "python-web",
      "priority": 70,
      "display_name": "Python Web Service",
      "detect": {
        "python_deps_any": ["fastapi", "flask", "django"]
      }
    },
    {
      "id": "python-lib",
      "priority": 60,
      "display_name": "Python Library/CLI",
      "detect": {
        "python_project": true,
        "exclude_python_deps": ["fastapi", "flask", "django"]
      }
    },
    {
      "id": "generic",
      "priority": 0,
      "display_name": "Generic",
      "detect": { "always": true }
    }
  ]
}
```

- [ ] **Step 4: Implement topology detector**

```javascript
// ~/Dev/deep-work/templates/topology-detector.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY_PATH = path.join(__dirname, 'topology-registry.json');

function loadTopologyRegistry(registryPath) {
  const raw = fs.readFileSync(registryPath || REGISTRY_PATH, 'utf-8');
  return JSON.parse(raw);
}

function readPackageJsonDeps(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
  } catch {
    return null;
  }
}

function readPythonDeps(projectRoot) {
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  try {
    const content = fs.readFileSync(pyprojectPath, 'utf-8');
    // Simple TOML dep extraction — match dependencies = ["pkg1", "pkg2"]
    const match = content.match(/dependencies\s*=\s*\[([^\]]*)\]/);
    if (!match) return [];
    return match[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '').split(/[>=<!\s]/)[0]) || [];
  } catch {
    return [];
  }
}

function isPythonProject(projectRoot) {
  return ['pyproject.toml', 'setup.py', 'requirements.txt'].some(f =>
    fs.existsSync(path.join(projectRoot, f))
  );
}

function matchTopology(projectRoot, topo, jsDeps, pythonDeps) {
  const detect = topo.detect;

  if (detect.always) return true;

  // Marker files check
  if (detect.marker_files) {
    const hasMarker = detect.marker_files.some(f => fs.existsSync(path.join(projectRoot, f)));
    if (!hasMarker) return false;
  }

  // Marker dirs check
  if (detect.marker_dirs) {
    const hasDir = detect.marker_dirs.some(d => {
      try { return fs.statSync(path.join(projectRoot, d)).isDirectory(); } catch { return false; }
    });
    if (!hasDir) return false;
  }

  // JS/TS deps (all required)
  if (detect.deps) {
    if (!jsDeps) return false;
    if (!detect.deps.every(d => d in jsDeps)) return false;
  }

  // JS/TS deps (any of)
  if (detect.deps_any) {
    if (!jsDeps) return false;
    if (!detect.deps_any.some(d => d in jsDeps)) return false;
  }

  // JS/TS excluded deps
  if (detect.exclude_deps) {
    if (jsDeps && detect.exclude_deps.some(d => d in jsDeps)) return false;
  }

  // Python deps (any of)
  if (detect.python_deps_any) {
    if (!detect.python_deps_any.some(d => pythonDeps.includes(d))) return false;
  }

  // Python project check
  if (detect.python_project) {
    if (!isPythonProject(projectRoot)) return false;
  }

  // Python excluded deps
  if (detect.exclude_python_deps) {
    if (detect.exclude_python_deps.some(d => pythonDeps.includes(d))) return false;
  }

  return true;
}

function detectTopology(projectRoot, registryPath) {
  const registry = loadTopologyRegistry(registryPath);
  const sorted = [...registry.topologies].sort((a, b) => b.priority - a.priority);
  const jsDeps = readPackageJsonDeps(projectRoot);
  const pythonDeps = readPythonDeps(projectRoot);

  for (const topo of sorted) {
    if (matchTopology(projectRoot, topo, jsDeps, pythonDeps)) {
      const confidence = topo.id === 'generic' ? 'low'
        : (topo.detect.marker_files || topo.detect.marker_dirs) ? 'high' : 'medium';
      return {
        topology: topo.id,
        display_name: topo.display_name,
        priority: topo.priority,
        confidence,
      };
    }
  }

  return { topology: 'generic', display_name: 'Generic', priority: 0, confidence: 'low' };
}

module.exports = { detectTopology, loadTopologyRegistry, matchTopology };

if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd();
  const result = detectTopology(projectRoot);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `cd ~/Dev/deep-work && node --test templates/topology-detector.test.js`
Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
cd ~/Dev/deep-work
git add templates/topology-registry.json templates/topology-detector.js templates/topology-detector.test.js
git commit -m "feat(#5): add topology registry and detector

6 built-in topologies with priority-based detection:
nextjs-app (100), react-spa (90), express-api (80),
python-web (70), python-lib (60), generic (0)"
```

---

## Task 2: Template Files + Loader (#5, deep-work)

**Files:**
- Create: `~/Dev/deep-work/templates/topologies/nextjs-app.json`
- Create: `~/Dev/deep-work/templates/topologies/react-spa.json`
- Create: `~/Dev/deep-work/templates/topologies/express-api.json`
- Create: `~/Dev/deep-work/templates/topologies/python-web.json`
- Create: `~/Dev/deep-work/templates/topologies/python-lib.json`
- Create: `~/Dev/deep-work/templates/topologies/generic.json`
- Create: `~/Dev/deep-work/templates/template-loader.js`
- Create: `~/Dev/deep-work/templates/template-loader.test.js`
- Create: `~/Dev/deep-work/templates/custom/.gitkeep`

- [ ] **Step 1: Write template loader tests**

```javascript
// ~/Dev/deep-work/templates/template-loader.test.js
'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { loadTemplate, deepMerge } = require('./template-loader.js');

describe('deepMerge', () => {
  it('replaces scalars', () => {
    const base = { a: 1, b: 'hello' };
    const override = { a: 2 };
    assert.deepEqual(deepMerge(base, override), { a: 2, b: 'hello' });
  });

  it('recursively merges objects', () => {
    const base = { guides: { phase1: ['a'], phase3: ['b'] } };
    const override = { guides: { phase3: ['c'] } };
    const result = deepMerge(base, override);
    assert.deepEqual(result.guides.phase1, ['a']); // preserved
    assert.deepEqual(result.guides.phase3, ['c']); // replaced
  });

  it('replaces arrays entirely (not append)', () => {
    const base = { rules: [1, 2, 3] };
    const override = { rules: [4, 5] };
    assert.deepEqual(deepMerge(base, override).rules, [4, 5]);
  });
});

describe('loadTemplate', () => {
  it('loads built-in template by topology id', () => {
    const tpl = loadTemplate('nextjs-app');
    assert.equal(tpl.topology, 'nextjs-app');
    assert.ok(tpl.guides.phase1.length > 0);
    assert.ok(tpl.fitness_defaults.rules.length > 0);
  });

  it('returns generic for unknown topology', () => {
    const tpl = loadTemplate('unknown-topology');
    assert.equal(tpl.topology, 'generic');
  });

  it('merges custom template over built-in', () => {
    // Create a temp custom dir with override
    const customDir = fs.mkdtempSync(path.join(os.tmpdir(), 'custom-'));
    const override = {
      topology: 'nextjs-app',
      guides: { phase3: ['custom guide only'] },
    };
    fs.writeFileSync(path.join(customDir, 'nextjs-app.json'), JSON.stringify(override));

    const tpl = loadTemplate('nextjs-app', customDir);
    assert.deepEqual(tpl.guides.phase3, ['custom guide only']);
    assert.ok(tpl.guides.phase1.length > 0); // base preserved

    fs.rmSync(customDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Dev/deep-work && node --test templates/template-loader.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Create 6 topology template files**

Create all 6 JSON files in `~/Dev/deep-work/templates/topologies/`. Each follows the schema from spec §2.4 with `id`, `max`, `include` fields for fitness_defaults (matching the actual fitness.json schema).

Key files (showing nextjs-app as example — others follow same structure):

```json
// ~/Dev/deep-work/templates/topologies/nextjs-app.json
{
  "topology": "nextjs-app",
  "display_name": "Next.js App Router",
  "guides": {
    "phase1": [
      "Identify Server vs Client Component boundaries (check 'use client' directives)",
      "Map API route structure (app/api/ directory)",
      "Check data fetching patterns (RSC fetch vs client-side fetch)",
      "Review middleware.ts for request interception logic"
    ],
    "phase3": [
      "Minimize 'use client' — prefer Server Components by default",
      "Use Server Actions for mutations over API routes",
      "Keep layout.tsx and page.tsx focused — extract shared logic to lib/",
      "Colocate loading.tsx and error.tsx with their page"
    ],
    "phase4": [
      "Check for hydration mismatch warnings in test output",
      "Verify no server-only imports in client components",
      "Review bundle size impact of new client components"
    ]
  },
  "sensors": {
    "priority": ["lint", "typecheck", "coverage"],
    "recommended": ["bundle-size"]
  },
  "fitness_defaults": {
    "rules": [
      {
        "id": "no-large-client-components",
        "type": "file-metric",
        "check": "line-count",
        "max": 200,
        "include": "**/*.tsx",
        "severity": "advisory"
      },
      {
        "id": "colocated-tests",
        "type": "structure",
        "check": "colocated",
        "source_glob": "app/**/*.tsx",
        "test_pattern": "**/*.test.{tsx,ts}",
        "severity": "advisory"
      }
    ]
  },
  "harnessability_hints": {
    "type_system": "Enable strict mode in tsconfig.json",
    "test_pattern": "Colocated __tests__/ directories or *.test.tsx files"
  }
}
```

```json
// ~/Dev/deep-work/templates/topologies/generic.json
{
  "topology": "generic",
  "display_name": "Generic",
  "guides": {
    "phase1": [
      "Identify primary language and build system",
      "Check for existing test infrastructure",
      "Review project structure and entry points"
    ],
    "phase3": [
      "Follow existing code conventions observed in phase 1",
      "Keep functions focused — single responsibility"
    ],
    "phase4": [
      "Verify all new code has corresponding tests"
    ]
  },
  "sensors": {
    "priority": ["lint", "typecheck"],
    "recommended": []
  },
  "fitness_defaults": {
    "rules": [
      {
        "id": "max-file-lines",
        "type": "file-metric",
        "check": "line-count",
        "max": 500,
        "include": "**/*.{ts,js,py,cs,cpp}",
        "severity": "advisory"
      }
    ]
  },
  "harnessability_hints": {
    "type_system": "Add type checking for your language",
    "test_pattern": "Add a test framework and write tests alongside source code"
  }
}
```

Create `react-spa.json`, `express-api.json`, `python-web.json`, `python-lib.json` following the same structure with topology-specific guides, sensors, and fitness_defaults.

- [ ] **Step 4: Implement template loader with deep merge**

```javascript
// ~/Dev/deep-work/templates/template-loader.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const TOPOLOGIES_DIR = path.join(__dirname, 'topologies');
const CUSTOM_DIR = path.join(__dirname, 'custom');

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overVal = override[key];
    if (
      overVal && typeof overVal === 'object' && !Array.isArray(overVal) &&
      baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}

function loadBuiltinTemplate(topologyId) {
  const filePath = path.join(TOPOLOGIES_DIR, `${topologyId}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function loadCustomTemplate(topologyId, customDir) {
  const dir = customDir || CUSTOM_DIR;
  const filePath = path.join(dir, `${topologyId}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function loadTemplate(topologyId, customDir) {
  const builtin = loadBuiltinTemplate(topologyId) || loadBuiltinTemplate('generic');
  const custom = loadCustomTemplate(topologyId, customDir);

  if (!custom) return builtin;
  return deepMerge(builtin, custom);
}

module.exports = { loadTemplate, deepMerge, loadBuiltinTemplate, loadCustomTemplate };
```

- [ ] **Step 5: Create custom directory with .gitkeep**

```bash
mkdir -p ~/Dev/deep-work/templates/custom
touch ~/Dev/deep-work/templates/custom/.gitkeep
```

- [ ] **Step 6: Run tests and verify they pass**

Run: `cd ~/Dev/deep-work && node --test templates/template-loader.test.js`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
cd ~/Dev/deep-work
git add templates/topologies/ templates/template-loader.js templates/template-loader.test.js templates/custom/
git commit -m "feat(#5): add template files and loader with deep merge

6 topology templates (nextjs-app, react-spa, express-api, python-web, python-lib, generic).
Loader supports custom/ override with deep merge (objects recursive, arrays replace)."
```

---

## Task 3: Phase Integration (#5, deep-work)

**Files:**
- Modify: `~/Dev/deep-work/commands/deep-research.md` — add topology detection + guides.phase1
- Modify: `~/Dev/deep-work/commands/deep-implement.md` — add guides.phase3 injection
- Modify: `~/Dev/deep-work/health/fitness/fitness-generator.js` — use fitness_defaults as seed

- [ ] **Step 1: Add topology detection to deep-research.md**

In the Phase 1 Research command, add after the existing Health Check section:

```markdown
### Topology Detection

After Health Check, detect the project topology and inject topology-specific research guides:

1. Run topology detection: `node templates/topology-detector.js <project-root>`
2. Load the matching template: topology-specific guides for Phase 1
3. Add to research context:
   - Detected topology name and confidence
   - Template's `guides.phase1` items as additional research checklist
   - Template's `harnessability_hints` for context
4. Store detection result in session state for use by Phase 3/4
```

- [ ] **Step 2: Add guides.phase3 injection to deep-implement.md**

In the Phase 3 Implement command, add topology guides to the implementation context:

```markdown
### Topology Guides

Before each slice implementation, load the session's detected topology template and inject `guides.phase3` as implementation guidelines. These are **Advisory** — inform the agent's decisions but do not block.
```

- [ ] **Step 3: Extend fitness-generator to use template fitness_defaults**

Modify `~/Dev/deep-work/health/fitness/fitness-generator.js`:

```javascript
// Add at top of file, after existing requires:
const { detectTopology } = require('../../templates/topology-detector.js');
const { loadTemplate } = require('../../templates/template-loader.js');

// Add to generateFitnessConfig function, before returning rules:
// After UNIVERSAL_RULES and JS_TS_RULES are assembled, merge template defaults:
function getTemplateRules(projectRoot) {
  const topoResult = detectTopology(projectRoot);
  const template = loadTemplate(topoResult.topology);
  return (template.fitness_defaults && template.fitness_defaults.rules) || [];
}

// In generateFitnessConfig, merge template rules with existing rules,
// deduplicate by id (existing rules take precedence):
// const templateRules = getTemplateRules(projectRoot);
// const existingIds = new Set(rules.map(r => r.id));
// for (const tr of templateRules) {
//   if (!existingIds.has(tr.id)) rules.push(tr);
// }
```

- [ ] **Step 4: Test fitness-generator extension**

Run: `cd ~/Dev/deep-work && node --test health/fitness/fitness.test.js`
Expected: Existing tests still PASS. Template rules are additive only.

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/deep-work
git add commands/deep-research.md commands/deep-implement.md health/fitness/fitness-generator.js
git commit -m "feat(#5): integrate topology templates into phases 1/3 and fitness generator

Phase 1: topology detection + guides.phase1 injection
Phase 3: guides.phase3 advisory injection
Fitness generator: template fitness_defaults as seed rules"
```

---

## Task 4: deep-dashboard Plugin Scaffold (#7/#8, new plugin)

**Files:**
- Create: `~/Dev/deep-dashboard/.claude-plugin/plugin.json`
- Create: `~/Dev/deep-dashboard/package.json`
- Create: `~/Dev/deep-dashboard/README.md`
- Create: `~/Dev/deep-dashboard/lib/` directory structure

- [ ] **Step 1: Create plugin directory structure**

```bash
mkdir -p ~/Dev/deep-dashboard/.claude-plugin
mkdir -p ~/Dev/deep-dashboard/lib/harnessability
mkdir -p ~/Dev/deep-dashboard/lib/dashboard
mkdir -p ~/Dev/deep-dashboard/skills
```

- [ ] **Step 2: Create plugin.json**

```json
// ~/Dev/deep-dashboard/.claude-plugin/plugin.json
{
  "name": "deep-dashboard",
  "version": "1.0.0",
  "description": "Cross-plugin harness diagnostics — harnessability scoring and unified dashboard for the deep-suite ecosystem",
  "author": {
    "name": "sungmin"
  },
  "license": "MIT",
  "keywords": [
    "harness",
    "dashboard",
    "harnessability",
    "diagnostics",
    "deep-suite"
  ],
  "category": "productivity"
}
```

- [ ] **Step 3: Create package.json**

```json
// ~/Dev/deep-dashboard/package.json
{
  "name": "@deep-suite/deep-dashboard",
  "version": "1.0.0",
  "description": "Cross-plugin harness diagnostics for deep-suite",
  "private": true,
  "scripts": {
    "test": "node --test lib/**/*.test.js"
  }
}
```

- [ ] **Step 4: Initialize git repo**

```bash
cd ~/Dev/deep-dashboard
git init
git add .
git commit -m "chore: scaffold deep-dashboard plugin"
```

---

## Task 5: Harnessability Scorer (#7, deep-dashboard)

**Files:**
- Create: `~/Dev/deep-dashboard/lib/harnessability/checklist.json`
- Create: `~/Dev/deep-dashboard/lib/harnessability/scorer.js`
- Create: `~/Dev/deep-dashboard/lib/harnessability/scorer.test.js`

- [ ] **Step 1: Write scorer tests**

```javascript
// ~/Dev/deep-dashboard/lib/harnessability/scorer.test.js
'use strict';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { scoreHarnessability } = require('./scorer.js');

function createProject(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-'));
  for (const [fp, content] of Object.entries(files)) {
    const full = path.join(dir, fp);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

function cleanup(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

describe('scoreHarnessability', () => {
  let tmpDir;
  afterEach(() => { if (tmpDir) cleanup(tmpDir); });

  it('scores a well-configured TypeScript project highly', () => {
    tmpDir = createProject({
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
      'package.json': JSON.stringify({
        devDependencies: { eslint: '8.0.0', prettier: '3.0.0', jest: '29.0.0' }
      }),
      'src/index.ts': 'export const x = 1;',
      'src/index.test.ts': 'test("x", () => {})',
      '.github/workflows/ci.yml': 'name: CI',
      '.eslintrc.json': '{}',
    });
    const result = scoreHarnessability(tmpDir);
    assert.ok(result.total >= 7, `Expected >= 7, got ${result.total}`);
    assert.equal(result.grade, 'Good');
    assert.ok(result.dimensions.type_safety.score >= 8);
  });

  it('scores a bare project poorly', () => {
    tmpDir = createProject({ 'main.py': 'print("hello")' });
    const result = scoreHarnessability(tmpDir);
    assert.ok(result.total <= 3, `Expected <= 3, got ${result.total}`);
    assert.equal(result.grade, 'Poor');
  });

  it('returns recommendations for low dimensions', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ dependencies: {} }),
      'src/app.js': '',
    });
    const result = scoreHarnessability(tmpDir);
    assert.ok(result.recommendations.length > 0);
    assert.ok(result.recommendations[0].dimension);
    assert.ok(result.recommendations[0].action);
  });

  it('total is weighted average of dimensions', () => {
    tmpDir = createProject({
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
      'package.json': JSON.stringify({ devDependencies: { jest: '29.0.0', eslint: '8.0.0' } }),
      'src/index.ts': '',
      'src/index.test.ts': '',
    });
    const result = scoreHarnessability(tmpDir);
    assert.ok(result.total >= 0 && result.total <= 10);
    assert.ok(result.dimensions.type_safety);
    assert.ok(result.dimensions.module_boundaries);
    assert.ok(result.dimensions.test_infra);
    assert.ok(result.dimensions.sensor_readiness);
    assert.ok(result.dimensions.linter_formatter);
    assert.ok(result.dimensions.ci_cd);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Dev/deep-dashboard && node --test lib/harnessability/scorer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Create checklist definition**

```json
// ~/Dev/deep-dashboard/lib/harnessability/checklist.json
{
  "dimensions": {
    "type_safety": {
      "weight": 0.25,
      "checks": [
        { "id": "ts_strict", "label": "TypeScript strict mode enabled", "detect": "tsconfig_strict" },
        { "id": "ts_exists", "label": "TypeScript configured", "detect": "tsconfig_exists" },
        { "id": "mypy_strict", "label": "mypy strict mode", "detect": "mypy_strict" },
        { "id": "type_hints", "label": "Python type hints present", "detect": "python_type_hints" }
      ]
    },
    "module_boundaries": {
      "weight": 0.20,
      "checks": [
        { "id": "no_circular", "label": "No circular dependencies config", "detect": "depcruiser_config" },
        { "id": "src_structure", "label": "Organized source directory", "detect": "src_dir_exists" },
        { "id": "index_files", "label": "Module entry points defined", "detect": "index_files" }
      ]
    },
    "test_infra": {
      "weight": 0.20,
      "checks": [
        { "id": "test_framework", "label": "Test framework installed", "detect": "test_framework" },
        { "id": "test_files", "label": "Test files exist", "detect": "test_files_exist" },
        { "id": "coverage_config", "label": "Coverage configuration present", "detect": "coverage_config" }
      ]
    },
    "sensor_readiness": {
      "weight": 0.15,
      "checks": [
        { "id": "lint_available", "label": "Linter configured", "detect": "linter_config" },
        { "id": "typecheck_available", "label": "Type checker available", "detect": "typecheck_available" },
        { "id": "pkg_manager", "label": "Package manager lock file", "detect": "lock_file" }
      ]
    },
    "linter_formatter": {
      "weight": 0.10,
      "checks": [
        { "id": "linter_config", "label": "Linter config file present", "detect": "linter_config_file" },
        { "id": "formatter_config", "label": "Formatter configured", "detect": "formatter_config" }
      ]
    },
    "ci_cd": {
      "weight": 0.10,
      "checks": [
        { "id": "ci_config", "label": "CI configuration present", "detect": "ci_config_exists" },
        { "id": "ci_tests", "label": "CI runs tests", "detect": "ci_runs_tests" }
      ]
    }
  }
}
```

- [ ] **Step 4: Implement scorer**

```javascript
// ~/Dev/deep-dashboard/lib/harnessability/scorer.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CHECKLIST = require('./checklist.json');
const WEIGHTS = Object.fromEntries(
  Object.entries(CHECKLIST.dimensions).map(([k, v]) => [k, v.weight])
);

// --- Detection functions ---
const DETECTORS = {
  tsconfig_strict(root) {
    try {
      const tc = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf-8'));
      return tc.compilerOptions?.strict === true;
    } catch { return false; }
  },
  tsconfig_exists(root) {
    return fs.existsSync(path.join(root, 'tsconfig.json'));
  },
  mypy_strict(root) {
    try {
      const content = fs.readFileSync(path.join(root, 'mypy.ini'), 'utf-8');
      return content.includes('strict = True') || content.includes('strict=True');
    } catch {
      try {
        const pyproject = fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf-8');
        return pyproject.includes('[tool.mypy]') && pyproject.includes('strict = true');
      } catch { return false; }
    }
  },
  python_type_hints(root) {
    try {
      return fs.existsSync(path.join(root, 'py.typed')) ||
        fs.existsSync(path.join(root, 'pyproject.toml'));
    } catch { return false; }
  },
  depcruiser_config(root) {
    return ['.dependency-cruiser.js', '.dependency-cruiser.cjs', '.dependency-cruiser.json']
      .some(f => fs.existsSync(path.join(root, f)));
  },
  src_dir_exists(root) {
    return ['src', 'lib', 'app'].some(d => {
      try { return fs.statSync(path.join(root, d)).isDirectory(); } catch { return false; }
    });
  },
  index_files(root) {
    const srcDir = path.join(root, 'src');
    try {
      return fs.readdirSync(srcDir).some(f => f.startsWith('index.'));
    } catch { return false; }
  },
  test_framework(root) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      return ['jest', 'vitest', 'mocha', '@testing-library/react', 'ava', 'tap'].some(d => d in allDeps);
    } catch {
      return fs.existsSync(path.join(root, 'pytest.ini')) ||
        fs.existsSync(path.join(root, 'pyproject.toml'));
    }
  },
  test_files_exist(root) {
    function findTestFiles(dir, depth = 0) {
      if (depth > 3) return false;
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          if (entry.isFile() && /\.(test|spec)\.(js|ts|tsx|py)$/.test(entry.name)) return true;
          if (entry.isDirectory() && (entry.name === '__tests__' || entry.name === 'tests' || entry.name === 'test')) return true;
          if (entry.isDirectory() && findTestFiles(path.join(dir, entry.name), depth + 1)) return true;
        }
      } catch { /* ignore */ }
      return false;
    }
    return findTestFiles(root);
  },
  coverage_config(root) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
      if (pkg.jest?.collectCoverage || pkg.jest?.coverageDirectory) return true;
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      return 'c8' in allDeps || '@vitest/coverage-v8' in allDeps || 'nyc' in allDeps;
    } catch { return false; }
  },
  linter_config(root) {
    return ['.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs',
            'ruff.toml', '.flake8', '.pylintrc']
      .some(f => fs.existsSync(path.join(root, f)));
  },
  typecheck_available(root) {
    return fs.existsSync(path.join(root, 'tsconfig.json')) ||
      fs.existsSync(path.join(root, 'mypy.ini'));
  },
  lock_file(root) {
    return ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'uv.lock']
      .some(f => fs.existsSync(path.join(root, f)));
  },
  linter_config_file(root) {
    return DETECTORS.linter_config(root);
  },
  formatter_config(root) {
    return ['.prettierrc', '.prettierrc.json', '.prettierrc.js', 'prettier.config.js',
            '.editorconfig', 'biome.json']
      .some(f => fs.existsSync(path.join(root, f)));
  },
  ci_config_exists(root) {
    return fs.existsSync(path.join(root, '.github', 'workflows')) ||
      fs.existsSync(path.join(root, '.gitlab-ci.yml')) ||
      fs.existsSync(path.join(root, '.circleci'));
  },
  ci_runs_tests(root) {
    const ghDir = path.join(root, '.github', 'workflows');
    try {
      for (const f of fs.readdirSync(ghDir)) {
        const content = fs.readFileSync(path.join(ghDir, f), 'utf-8');
        if (content.includes('test') || content.includes('jest') || content.includes('pytest')) return true;
      }
    } catch { /* ignore */ }
    return false;
  },
};

function scoreDimension(root, dimensionKey) {
  const dim = CHECKLIST.dimensions[dimensionKey];
  const checks = dim.checks;
  let passed = 0;
  const details = [];

  for (const check of checks) {
    const detector = DETECTORS[check.detect];
    const result = detector ? detector(root) : false;
    if (result) passed++;
    details.push({ id: check.id, label: check.label, passed: result });
  }

  const score = checks.length > 0 ? Math.round((passed / checks.length) * 10) : 0;
  return { score, passed, total: checks.length, details };
}

function getGrade(total) {
  if (total >= 8) return 'Excellent';
  if (total >= 5) return 'Good';
  if (total >= 3) return 'Fair';
  return 'Poor';
}

function scoreHarnessability(projectRoot) {
  const dimensions = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, dim] of Object.entries(CHECKLIST.dimensions)) {
    const result = scoreDimension(projectRoot, key);
    dimensions[key] = result;
    weightedSum += result.score * dim.weight;
    totalWeight += dim.weight;
  }

  const total = Math.round((weightedSum / totalWeight) * 10) / 10;
  const grade = getGrade(total);

  // Build recommendations for low-scoring dimensions
  const recommendations = [];
  for (const [key, dim] of Object.entries(dimensions)) {
    if (dim.score < 5) {
      for (const detail of dim.details) {
        if (!detail.passed) {
          recommendations.push({
            dimension: key,
            check: detail.id,
            action: detail.label,
          });
        }
      }
    }
  }

  return {
    total,
    grade,
    dimensions,
    recommendations,
    scored_at: new Date().toISOString(),
  };
}

module.exports = { scoreHarnessability, scoreDimension, DETECTORS };

if (require.main === module) {
  const root = process.argv[2] || process.cwd();
  const result = scoreHarnessability(root);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `cd ~/Dev/deep-dashboard && node --test lib/harnessability/scorer.test.js`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
cd ~/Dev/deep-dashboard
git add lib/harnessability/
git commit -m "feat(#7): add harnessability scorer with 6 dimensions

Checklist-based scoring: type_safety (25%), module_boundaries (20%),
test_infra (20%), sensor_readiness (15%), linter_formatter (10%), ci_cd (10%).
All measurements computational — file existence, config parsing, grep."
```

---

## Task 6: Harnessability Skill + Result Output (#7, deep-dashboard)

**Files:**
- Create: `~/Dev/deep-dashboard/skills/deep-harnessability.md`

- [ ] **Step 1: Create harnessability skill**

```markdown
// ~/Dev/deep-dashboard/skills/deep-harnessability.md
---
name: deep-harnessability
description: Assess codebase harnessability — type safety, module boundaries, test infrastructure, sensor readiness, linter/formatter, CI/CD. Outputs a 0-10 score with recommendations.
---

# Harnessability Diagnosis

Assess how "harness-able" this codebase is. All measurements are computational — no LLM inference needed.

## Steps

1. Run the scorer:
   ```bash
   node "PLUGIN_DIR/lib/harnessability/scorer.js" "PROJECT_ROOT"
   ```

2. Display the formatted report to the user (use the bar chart format):
   ```
   [Harnessability Report] Score: X.X/10 (Grade)

     Type Safety      ████████░░  8/10  ✓ tsconfig strict mode
     Module Bounds    ██████░░░░  6/10  ! 3 items need attention
     ...
   ```

3. Save the result to `.deep-dashboard/harnessability-report.json` in the project root:
   ```bash
   mkdir -p .deep-dashboard
   # Write scorer output to file
   ```

4. If any dimension scores below 5, present the top 3 recommendations.

## Output File

The result file at `.deep-dashboard/harnessability-report.json` is consumed by:
- deep-work Phase 1 Research (if file exists and is < 24h old)
- deep-harness-dashboard (as a data source)
```

- [ ] **Step 2: Commit**

```bash
cd ~/Dev/deep-dashboard
git add skills/deep-harnessability.md
git commit -m "feat(#7): add /deep-harnessability skill definition"
```

---

## Task 7: review-check Sensor — Always-on Layer (#6, deep-work)

**Files:**
- Create: `~/Dev/deep-work/sensors/review-check.js`
- Create: `~/Dev/deep-work/sensors/review-check.test.js`

- [ ] **Step 1: Write review-check tests**

```javascript
// ~/Dev/deep-work/sensors/review-check.test.js
'use strict';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { runReviewCheck } = require('./review-check.js');

function createProject(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-'));
  for (const [fp, content] of Object.entries(files)) {
    const full = path.join(dir, fp);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

function cleanup(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

describe('runReviewCheck', () => {
  let tmpDir;
  afterEach(() => { if (tmpDir) cleanup(tmpDir); });

  it('returns not_applicable when all sources missing (generic + no rules + no fitness)', () => {
    tmpDir = createProject({ 'README.md': '# hello' });
    const result = runReviewCheck(tmpDir, { topology: 'generic', changedFiles: ['README.md'] });
    assert.equal(result.status, 'not_applicable');
  });

  it('runs always-on layer with topology guides', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ dependencies: { next: '14.0.0' } }),
      'next.config.js': '',
      'app/page.tsx': 'export default function Page() { return <div>hi</div> }',
    });
    const result = runReviewCheck(tmpDir, {
      topology: 'nextjs-app',
      changedFiles: ['app/page.tsx'],
    });
    assert.equal(result.status, 'completed');
    assert.ok(result.alwaysOn);
    assert.ok(result.alwaysOn.guides.length > 0);
  });

  it('runs fitness layer when fitness.json exists', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ dependencies: { next: '14.0.0' } }),
      '.deep-review/fitness.json': JSON.stringify({
        version: 1,
        rules: [{
          id: 'max-file-lines',
          type: 'file-metric',
          check: 'line-count',
          max: 10,
          include: '**/*.tsx',
          severity: 'required',
        }],
      }),
      'app/page.tsx': Array(20).fill('const x = 1;').join('\n'),
    });
    const result = runReviewCheck(tmpDir, {
      topology: 'nextjs-app',
      changedFiles: ['app/page.tsx'],
    });
    assert.ok(result.fitness);
    assert.ok(result.fitness.failed > 0);
  });

  it('skips fitness layer when fitness.json is absent', () => {
    tmpDir = createProject({
      'package.json': JSON.stringify({ dependencies: { next: '14.0.0' } }),
      'next.config.js': '',
      'app/page.tsx': '',
    });
    const result = runReviewCheck(tmpDir, {
      topology: 'nextjs-app',
      changedFiles: ['app/page.tsx'],
    });
    assert.equal(result.fitness, null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Dev/deep-work && node --test sensors/review-check.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement review-check sensor**

```javascript
// ~/Dev/deep-work/sensors/review-check.js
'use strict';
const path = require('node:path');
const { loadTemplate } = require('../templates/template-loader.js');
const { loadFitness, validateFitness, runFitnessCheck } = require('../health/fitness/fitness-validator.js');

/**
 * Run review-check sensor on changed files.
 *
 * Two layers:
 * - always-on: topology guides check (computational)
 * - fitness: fitness.json rules against changed files (computational)
 *
 * @param {string} projectRoot - absolute path to project
 * @param {object} options
 * @param {string} options.topology - detected topology id
 * @param {string[]} options.changedFiles - files changed in this slice
 * @param {string} [options.rulesYamlPath] - path to rules.yaml (for inferential, not used in v1 computational)
 * @returns {{ status: string, alwaysOn: object|null, fitness: object|null, violations: object[] }}
 */
function runReviewCheck(projectRoot, options) {
  const { topology, changedFiles } = options;
  const violations = [];

  // --- Always-on layer ---
  const template = loadTemplate(topology);
  const isGeneric = topology === 'generic';
  const hasGuides = template.guides && template.guides.phase3 && template.guides.phase3.length > 0 && !isGeneric;

  // Check if rules.yaml exists
  const rulesYamlExists = false; // v1: not parsed computationally, inferential only

  // All sources missing → not_applicable
  const fitnessData = loadFitness(projectRoot);
  if (!hasGuides && !rulesYamlExists && !fitnessData) {
    return { status: 'not_applicable', alwaysOn: null, fitness: null, violations: [] };
  }

  let alwaysOn = null;
  if (hasGuides) {
    alwaysOn = {
      guides: template.guides.phase3,
      topology: template.display_name || topology,
    };
  }

  // --- Fitness layer ---
  let fitness = null;
  if (fitnessData) {
    const validation = validateFitness(fitnessData);
    if (validation.valid || validation.validRules.length > 0) {
      // Filter rules to only check changed files' relevant patterns
      const fitnessResult = runFitnessCheck(projectRoot, validation.validRules, { changedFiles });

      fitness = {
        total: fitnessResult.total,
        passed: fitnessResult.passed,
        failed: fitnessResult.failed,
        results: fitnessResult.results,
      };

      // Collect violations
      for (const r of fitnessResult.results) {
        if (!r.passed && r.status !== 'not_applicable') {
          violations.push({
            source: 'fitness',
            ruleId: r.ruleId,
            severity: r.severity || 'advisory',
            details: r.violations || [],
          });
        }
      }
    }
  }

  const hasRequired = violations.some(v => v.severity === 'required');

  return {
    status: 'completed',
    alwaysOn,
    fitness,
    violations,
    hasRequired,
  };
}

/**
 * Format review-check results into agent FIX feedback.
 */
function formatReviewCheckFeedback(result, sliceName) {
  if (result.status === 'not_applicable') return null;
  if (result.violations.length === 0 && !result.alwaysOn) return null;

  const lines = [];
  lines.push(`[REVIEW-CHECK] ${result.violations.length} violation(s) found in slice "${sliceName}"`);
  lines.push('');

  let idx = 1;
  for (const v of result.violations) {
    const tag = v.severity === 'required' ? 'REQUIRED' : 'ADVISORY';
    lines.push(`${idx}. [${tag}] ${v.source}: ${v.ruleId}`);
    if (v.details.length > 0) {
      for (const d of v.details.slice(0, 3)) {
        lines.push(`   ${d.file || d.message || JSON.stringify(d)}`);
      }
    }
    idx++;
  }

  if (result.alwaysOn) {
    lines.push('');
    lines.push(`[TOPOLOGY GUIDES] ${result.alwaysOn.topology}:`);
    for (const g of result.alwaysOn.guides) {
      lines.push(`  - ${g}`);
    }
  }

  return lines.join('\n');
}

module.exports = { runReviewCheck, formatReviewCheckFeedback };
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `cd ~/Dev/deep-work && node --test sensors/review-check.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd ~/Dev/deep-work
git add sensors/review-check.js sensors/review-check.test.js
git commit -m "feat(#6): add review-check sensor with always-on + fitness layers

Always-on: topology guides (advisory). Fitness: fitness.json rules
against changed files. not_applicable only when all sources missing."
```

---

## Task 8: Pipeline Integration (#6, deep-work)

**Files:**
- Modify: `~/Dev/deep-work/sensors/run-sensors.js` — add review-check to pipeline
- Modify: `~/Dev/deep-work/commands/deep-implement.md` — per-sensor round tracking
- Modify: `~/Dev/deep-work/commands/deep-test.md` — review-check in Phase 4

- [ ] **Step 1: Add review-check to run-sensors.js**

In `run-sensors.js`, after the existing sensor execution loop, add review-check as the final sensor:

```javascript
// Add to requires at top:
const { runReviewCheck, formatReviewCheckFeedback } = require('./review-check.js');

// Add after typecheck sensor execution in the main runSensors function:
// Review-check sensor (runs after lint + typecheck)
// const reviewResult = runReviewCheck(projectRoot, {
//   topology: sessionState.topology || 'generic',
//   changedFiles: changedFiles,
// });
// if (reviewResult.status !== 'not_applicable') {
//   results.push({ sensor: 'review-check', ...reviewResult });
// }
```

- [ ] **Step 2: Update deep-implement.md for per-sensor rounds**

Add to the SENSOR_RUN section:

```markdown
### Per-Sensor Round Tracking

Each sensor has an independent 3-round correction limit:
- `lint_rounds`: 0/3
- `typecheck_rounds`: 0/3
- `review_check_rounds`: 0/3

When a sensor fails and triggers SENSOR_FIX, only that sensor's counter increments.
After 3 failures for a sensor, skip it and proceed to next sensor.
The global SENSOR_RUN→FIX→CLEAN loop continues until all sensors pass or exhaust their rounds.
```

- [ ] **Step 3: Commit**

```bash
cd ~/Dev/deep-work
git add sensors/run-sensors.js commands/deep-implement.md commands/deep-test.md
git commit -m "feat(#6): integrate review-check into sensor pipeline

Per-sensor 3-round limit (lint, typecheck, review-check independent).
review-check runs after lint+typecheck in SENSOR_RUN pipeline."
```

---

## Task 9: Dashboard Data Collector + Effectiveness (#8, deep-dashboard)

**Files:**
- Create: `~/Dev/deep-dashboard/lib/dashboard/collector.js`
- Create: `~/Dev/deep-dashboard/lib/dashboard/collector.test.js`
- Create: `~/Dev/deep-dashboard/lib/dashboard/effectiveness.js`
- Create: `~/Dev/deep-dashboard/lib/dashboard/effectiveness.test.js`
- Create: `~/Dev/deep-dashboard/lib/dashboard/action-router.js`

- [ ] **Step 1: Write collector tests**

```javascript
// ~/Dev/deep-dashboard/lib/dashboard/collector.test.js
'use strict';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { collectData } = require('./collector.js');

function createProject(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-'));
  for (const [fp, content] of Object.entries(files)) {
    const full = path.join(dir, fp);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}
function cleanup(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

describe('collectData', () => {
  let tmpDir;
  afterEach(() => { if (tmpDir) cleanup(tmpDir); });

  it('collects deep-work receipts', () => {
    tmpDir = createProject({
      '.deep-work/receipts/SLICE-001.json': JSON.stringify({ quality_score: 8.2 }),
      '.deep-work/receipts/SLICE-002.json': JSON.stringify({ quality_score: 7.5 }),
    });
    const data = collectData(tmpDir);
    assert.equal(data.deepWork.receipts.length, 2);
  });

  it('marks missing plugins as no_data', () => {
    tmpDir = createProject({ 'README.md': '' });
    const data = collectData(tmpDir);
    assert.equal(data.deepWork.status, 'no_data');
    assert.equal(data.deepReview.status, 'no_data');
    assert.equal(data.deepDocs.status, 'no_data');
  });

  it('collects deep-docs last-scan.json', () => {
    tmpDir = createProject({
      '.deep-docs/last-scan.json': JSON.stringify({ freshness: 0.8, dead_refs: 2 }),
    });
    const data = collectData(tmpDir);
    assert.equal(data.deepDocs.status, 'available');
    assert.equal(data.deepDocs.data.dead_refs, 2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Dev/deep-dashboard && node --test lib/dashboard/collector.test.js`
Expected: FAIL

- [ ] **Step 3: Implement collector**

```javascript
// ~/Dev/deep-dashboard/lib/dashboard/collector.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

function collectDeepWork(projectRoot) {
  const receiptsDir = path.join(projectRoot, '.deep-work', 'receipts');
  try {
    const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.json')).sort();
    const receipts = files.map(f => readJsonSafe(path.join(receiptsDir, f))).filter(Boolean);
    return { status: 'available', receipts };
  } catch {
    return { status: 'no_data', receipts: [] };
  }
}

function collectDeepReview(projectRoot) {
  const receiptsDir = path.join(projectRoot, '.deep-review', 'receipts');
  const fitnessPath = path.join(projectRoot, '.deep-review', 'fitness.json');
  try {
    const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.json')).sort();
    const receipts = files.map(f => readJsonSafe(path.join(receiptsDir, f))).filter(Boolean);
    const fitness = readJsonSafe(fitnessPath);
    return { status: 'available', receipts, fitness };
  } catch {
    const fitness = readJsonSafe(fitnessPath);
    if (fitness) return { status: 'available', receipts: [], fitness };
    return { status: 'no_data', receipts: [], fitness: null };
  }
}

function collectDeepDocs(projectRoot) {
  const scanPath = path.join(projectRoot, '.deep-docs', 'last-scan.json');
  const data = readJsonSafe(scanPath);
  if (data) return { status: 'available', data };
  return { status: 'no_data', data: null };
}

function collectHarnessability(projectRoot) {
  const reportPath = path.join(projectRoot, '.deep-dashboard', 'harnessability-report.json');
  const data = readJsonSafe(reportPath);
  if (data) {
    // Check staleness (24h)
    const age = Date.now() - new Date(data.scored_at).getTime();
    if (age > 24 * 60 * 60 * 1000) return { status: 'stale', data };
    return { status: 'available', data };
  }
  return { status: 'no_data', data: null };
}

function collectData(projectRoot) {
  return {
    deepWork: collectDeepWork(projectRoot),
    deepReview: collectDeepReview(projectRoot),
    deepDocs: collectDeepDocs(projectRoot),
    harnessability: collectHarnessability(projectRoot),
  };
}

module.exports = { collectData, collectDeepWork, collectDeepReview, collectDeepDocs, collectHarnessability };
```

- [ ] **Step 4: Implement effectiveness scorer**

```javascript
// ~/Dev/deep-dashboard/lib/dashboard/effectiveness.js
'use strict';

const WEIGHTS = {
  health: 0.30,
  fitness: 0.25,
  session: 0.25,
  harnessability: 0.20,
};

function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(10, ((value - min) / (max - min)) * 10));
}

function calculateEffectiveness(data) {
  const scores = {};
  let totalWeight = 0;
  let weightedSum = 0;

  // Health status (from deep-work health_report in latest receipt)
  const latestReceipt = data.deepWork.receipts?.slice(-1)[0];
  if (latestReceipt?.health_report) {
    const hr = latestReceipt.health_report;
    const sensors = hr.sensors || [];
    const clean = sensors.filter(s => s.status === 'clean').length;
    scores.health = sensors.length > 0 ? (clean / sensors.length) * 10 : null;
  }

  // Fitness status
  if (data.deepReview.fitness) {
    const rules = data.deepReview.fitness.rules || [];
    // We can't run fitness here, use latest receipt's fitness_delta
    if (latestReceipt?.fitness_delta) {
      const fd = latestReceipt.fitness_delta;
      scores.fitness = fd.total > 0 ? (fd.passed / fd.total) * 10 : null;
    }
  }

  // Session quality (average of last 3)
  if (data.deepWork.receipts?.length > 0) {
    const recent = data.deepWork.receipts.slice(-3);
    const qualityScores = recent.map(r => r.quality_score).filter(Boolean);
    if (qualityScores.length > 0) {
      const avg = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      scores.session = normalize(avg, 0, 100);
    }
  }

  // Harnessability
  if (data.harnessability.data) {
    scores.harnessability = data.harnessability.data.total; // already 0-10
  }

  // Weighted average with not_applicable redistribution
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    if (scores[key] != null) {
      totalWeight += weight;
      weightedSum += scores[key] * weight;
    }
  }

  const effectiveness = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;

  return { effectiveness, scores };
}

module.exports = { calculateEffectiveness };
```

- [ ] **Step 5: Implement action router**

```javascript
// ~/Dev/deep-dashboard/lib/dashboard/action-router.js
'use strict';

const ACTION_MAP = {
  'dependency-vuln': { action: 'npm audit fix', category: 'health' },
  'dead-export': { action: 'Remove unused export or add to health-ignore.json', category: 'health' },
  'stale-config': { action: 'Fix broken config references', category: 'health' },
  'coverage-trend': { action: 'Add tests in next deep-work session', category: 'health' },
  'file-metric': { action: 'Split large file in deep-work session', category: 'fitness' },
  'forbidden-pattern': { action: 'Remove forbidden pattern', category: 'fitness' },
  'structure': { action: 'Add colocated test file', category: 'fitness' },
  'dependency': { action: 'Fix dependency constraint', category: 'fitness' },
  'docs-stale': { action: 'Run /deep-docs-scan', category: 'docs' },
};

function getSuggestedActions(data) {
  const actions = [];

  // Health findings
  const latestReceipt = data.deepWork.receipts?.slice(-1)[0];
  if (latestReceipt?.health_report) {
    for (const sensor of latestReceipt.health_report.sensors || []) {
      if (sensor.status !== 'clean' && ACTION_MAP[sensor.type]) {
        actions.push({
          finding: sensor.type,
          severity: sensor.severity || 'advisory',
          suggested_action: ACTION_MAP[sensor.type].action,
          detail: sensor.summary || '',
        });
      }
    }
  }

  // Fitness findings
  if (latestReceipt?.fitness_delta) {
    for (const result of latestReceipt.fitness_delta.results || []) {
      if (!result.passed && ACTION_MAP[result.type]) {
        actions.push({
          finding: result.ruleId,
          severity: result.severity || 'advisory',
          suggested_action: ACTION_MAP[result.type].action,
          detail: `${result.violations?.length || 0} violation(s)`,
        });
      }
    }
  }

  // Docs findings
  if (data.deepDocs.data && data.deepDocs.data.dead_refs > 0) {
    actions.push({
      finding: 'docs-stale',
      severity: 'advisory',
      suggested_action: ACTION_MAP['docs-stale'].action,
      detail: `${data.deepDocs.data.dead_refs} dead reference(s)`,
    });
  }

  // Sort by severity (required first)
  actions.sort((a, b) => (a.severity === 'required' ? -1 : 1) - (b.severity === 'required' ? -1 : 1));

  return actions;
}

module.exports = { getSuggestedActions, ACTION_MAP };
```

- [ ] **Step 6: Run tests and verify they pass**

Run: `cd ~/Dev/deep-dashboard && node --test lib/dashboard/collector.test.js`
Expected: All 3 tests PASS

- [ ] **Step 7: Commit**

```bash
cd ~/Dev/deep-dashboard
git add lib/dashboard/
git commit -m "feat(#8): add dashboard collector, effectiveness scorer, and action router

Collector reads receipts from deep-work, deep-review, deep-docs.
Effectiveness: 4 dimensions with not_applicable redistribution.
Action router maps findings to suggested_action strings."
```

---

## Task 10: Dashboard Formatter + Skill (#8, deep-dashboard)

**Files:**
- Create: `~/Dev/deep-dashboard/lib/dashboard/formatter.js`
- Create: `~/Dev/deep-dashboard/lib/dashboard/formatter.test.js`
- Create: `~/Dev/deep-dashboard/skills/deep-harness-dashboard.md`

- [ ] **Step 1: Write formatter tests**

```javascript
// ~/Dev/deep-dashboard/lib/dashboard/formatter.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatCLI, formatMarkdown } = require('./formatter.js');

const MOCK_DATA = {
  topology: 'nextjs-app',
  harnessability: { total: 7.4, grade: 'Good' },
  effectiveness: 7.1,
  health: [
    { type: 'dead-export', status: 'clean' },
    { type: 'dependency-vuln', status: 'failed', summary: '2 critical' },
  ],
  fitness: [
    { ruleId: 'no-large-files', passed: true },
    { ruleId: 'colocated-tests', passed: false, violations: [{ file: 'src/a.ts' }] },
  ],
  sessions: [
    { id: 12, date: '2026-04-09', quality: 8.2 },
  ],
  actions: [
    { finding: 'dependency-vuln', suggested_action: 'npm audit fix', severity: 'required' },
  ],
};

describe('formatCLI', () => {
  it('produces non-empty string output', () => {
    const output = formatCLI(MOCK_DATA);
    assert.ok(output.length > 0);
    assert.ok(output.includes('Harness Dashboard'));
    assert.ok(output.includes('nextjs-app'));
    assert.ok(output.includes('7.4'));
  });

  it('includes suggested actions', () => {
    const output = formatCLI(MOCK_DATA);
    assert.ok(output.includes('npm audit fix'));
  });
});

describe('formatMarkdown', () => {
  it('produces valid markdown', () => {
    const md = formatMarkdown(MOCK_DATA);
    assert.ok(md.startsWith('# Deep-Suite Harness Dashboard'));
    assert.ok(md.includes('|'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Dev/deep-dashboard && node --test lib/dashboard/formatter.test.js`
Expected: FAIL

- [ ] **Step 3: Implement formatter**

```javascript
// ~/Dev/deep-dashboard/lib/dashboard/formatter.js
'use strict';

function bar(score, max = 10) {
  const filled = Math.round(score);
  const empty = max - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatCLI(data) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════╗');
  lines.push('║           Deep-Suite Harness Dashboard               ║');
  lines.push('╠══════════════════════════════════════════════════════╣');

  const topo = data.topology || 'unknown';
  const hScore = data.harnessability?.total ?? 'N/A';
  const hGrade = data.harnessability?.grade ?? '';
  lines.push(`║ Topology: ${topo.padEnd(12)} │ Harnessability: ${hScore}/10 (${hGrade})`.padEnd(55) + '║');

  lines.push('╠══════════════════════════════════════════════════════╣');

  // Health Status
  if (data.health && data.health.length > 0) {
    lines.push('║ ◆ Health Status'.padEnd(55) + '║');
    for (const h of data.health) {
      const icon = h.status === 'clean' ? '✓' : '✗';
      const detail = h.summary || h.status;
      lines.push(`║   ${h.type.padEnd(18)} ${icon} ${detail}`.padEnd(55) + '║');
    }
    lines.push('║'.padEnd(55) + '║');
  }

  // Fitness Rules
  if (data.fitness && data.fitness.length > 0) {
    lines.push(`║ ◆ Fitness Rules (${data.fitness.length} rules)`.padEnd(55) + '║');
    for (const f of data.fitness) {
      const icon = f.passed ? '✓ pass' : '✗ fail';
      lines.push(`║   ${f.ruleId.padEnd(20)} ${icon}`.padEnd(55) + '║');
    }
    lines.push('║'.padEnd(55) + '║');
  }

  // Recent Sessions
  if (data.sessions && data.sessions.length > 0) {
    lines.push(`║ ◆ Recent Sessions (last ${data.sessions.length})`.padEnd(55) + '║');
    for (const s of data.sessions) {
      lines.push(`║   #${s.id} ${s.date} quality:${s.quality}`.padEnd(55) + '║');
    }
    lines.push('║'.padEnd(55) + '║');
  }

  // Effectiveness
  lines.push('╠══════════════════════════════════════════════════════╣');
  const eff = data.effectiveness ?? 'N/A';
  lines.push(`║ Overall Harness Effectiveness: ${eff}/10`.padEnd(55) + '║');

  // Actions
  if (data.actions && data.actions.length > 0) {
    lines.push('║'.padEnd(55) + '║');
    lines.push('║ Suggested actions:'.padEnd(55) + '║');
    for (let i = 0; i < Math.min(data.actions.length, 3); i++) {
      const a = data.actions[i];
      lines.push(`║  ${i + 1}. ${a.suggested_action} (${a.finding})`.padEnd(55) + '║');
    }
  }

  lines.push('╚══════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

function formatMarkdown(data) {
  const lines = [];
  lines.push('# Deep-Suite Harness Dashboard');
  lines.push('');
  lines.push(`**Topology:** ${data.topology || 'unknown'} | **Harnessability:** ${data.harnessability?.total ?? 'N/A'}/10 (${data.harnessability?.grade ?? ''})`);
  lines.push('');

  if (data.health && data.health.length > 0) {
    lines.push('## Health Status');
    lines.push('| Sensor | Status | Detail |');
    lines.push('|--------|--------|--------|');
    for (const h of data.health) {
      lines.push(`| ${h.type} | ${h.status === 'clean' ? '✓' : '✗'} | ${h.summary || ''} |`);
    }
    lines.push('');
  }

  if (data.fitness && data.fitness.length > 0) {
    lines.push('## Fitness Rules');
    lines.push('| Rule | Status |');
    lines.push('|------|--------|');
    for (const f of data.fitness) {
      lines.push(`| ${f.ruleId} | ${f.passed ? '✓ pass' : '✗ fail'} |`);
    }
    lines.push('');
  }

  lines.push(`## Overall Effectiveness: ${data.effectiveness ?? 'N/A'}/10`);
  lines.push('');

  if (data.actions && data.actions.length > 0) {
    lines.push('## Suggested Actions');
    for (const a of data.actions) {
      lines.push(`- **${a.finding}**: ${a.suggested_action}`);
    }
  }

  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

module.exports = { formatCLI, formatMarkdown, bar };
```

- [ ] **Step 4: Create dashboard skill**

```markdown
// ~/Dev/deep-dashboard/skills/deep-harness-dashboard.md
---
name: deep-harness-dashboard
description: Unified harness dashboard — aggregates sensor results from deep-work, deep-review, deep-docs into a single view with effectiveness scoring and action routing.
---

# Harness Dashboard

Aggregates cross-plugin sensor data into a unified view.

## Steps

1. Collect data from all available plugins:
   ```bash
   node "PLUGIN_DIR/lib/dashboard/collector.js" "PROJECT_ROOT"
   ```

2. Run harnessability scorer if report is stale or missing:
   ```bash
   node "PLUGIN_DIR/lib/harnessability/scorer.js" "PROJECT_ROOT"
   ```

3. Calculate effectiveness score:
   ```bash
   node -e "
     const { collectData } = require('PLUGIN_DIR/lib/dashboard/collector.js');
     const { calculateEffectiveness } = require('PLUGIN_DIR/lib/dashboard/effectiveness.js');
     const { getSuggestedActions } = require('PLUGIN_DIR/lib/dashboard/action-router.js');
     const { formatCLI } = require('PLUGIN_DIR/lib/dashboard/formatter.js');
     const data = collectData('PROJECT_ROOT');
     const eff = calculateEffectiveness(data);
     const actions = getSuggestedActions(data);
     // ... compose and format
   "
   ```

4. Display the CLI dashboard to the user.

5. Ask: "리포트 파일을 생성할까요? (y/n)"
   - If yes: generate `harness-report-YYYY-MM-DD.md` using `formatMarkdown()`
   - Ask: "git commit할까요? (y/n)"

## Options

- `--json` — output raw JSON instead of formatted CLI table
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `cd ~/Dev/deep-dashboard && node --test lib/dashboard/formatter.test.js`
Expected: All 3 tests PASS

- [ ] **Step 6: Run all tests**

Run: `cd ~/Dev/deep-dashboard && npm test`
Expected: All tests PASS across scorer, collector, formatter

- [ ] **Step 7: Commit**

```bash
cd ~/Dev/deep-dashboard
git add lib/dashboard/formatter.js lib/dashboard/formatter.test.js skills/
git commit -m "feat(#8): add dashboard formatter, skill, and complete dashboard

CLI table + markdown output. /deep-harness-dashboard skill.
Asks user approval before generating markdown report file."
```

---

## Post-Implementation

### Documentation Updates

After all tasks complete:
1. Update `~/Dev/deep-suite/docs/harness-engineering-roadmap.md` — mark #5, #6, #7, #8 as ✅
2. Update `~/Dev/deep-suite/docs/harness-engineering-gap-analysis.md` — update scores and coverage matrix
3. Update `~/Dev/deep-work/README.md` — add topology templates section
4. Create `~/Dev/deep-dashboard/README.md` — plugin documentation

### Test Summary

| Location | Test File | Coverage |
|----------|-----------|----------|
| deep-work | `templates/topology-detector.test.js` | Topology detection (8 cases) |
| deep-work | `templates/template-loader.test.js` | Loader + deep merge (5 cases) |
| deep-work | `sensors/review-check.test.js` | Review-check sensor (4 cases) |
| deep-dashboard | `lib/harnessability/scorer.test.js` | Harnessability scoring (4 cases) |
| deep-dashboard | `lib/dashboard/collector.test.js` | Data collection (3 cases) |
| deep-dashboard | `lib/dashboard/formatter.test.js` | CLI + markdown output (3 cases) |

Total: ~27 test cases across 6 test files.
