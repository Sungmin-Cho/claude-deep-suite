[한국어](./model-routing.ko.md)

# Model routing

Deep Suite shares a **decision plane** (`deep-model-router`) and leaves
execution, durable state, and local safety floors with each plugin.

## Three layers

1. Load `/deep-model-router:model-router` once per session to learn classification.
2. Repeat decisions through `route_task.py --request-json` / `--format json`.
3. Parse `config/model-routing.yaml` only when you need an id or native effort token.

## Locator

Do not import `../deep-model-router` or a personal skill symlink. Resolve in
this order: `DEEP_MODEL_ROUTER_CLI`, `DEEP_MODEL_ROUTER_ROOT`, then the host
plugin cache. Missing router → local policy with `routing_provenance:
local-fallback`. HIGH/CRITICAL floors never drop.

## Merge

The router enforces `local_policy` before resolve (`max` on floors,
intersection on `allowed_families`). Consumers keep a no-downgrade test.
