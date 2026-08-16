[English](./model-routing.md)

# 모델 라우팅

Deep Suite는 **결정 평면**(`deep-model-router`)을 공유하고, 집행·durable
state·로컬 안전 하한은 각 플러그인이 유지한다.

## 3계층

1. 세션당 한 번 `/deep-model-router:model-router`로 분류 규약을 배운다.
2. 반복 결정은 `route_task.py --request-json` / `--format json`.
3. ID·native effort만 필요하면 `config/model-routing.yaml`을 파싱한다.

## Locator

`../deep-model-router`나 개인 스킬 심링크는 쓰지 않는다. 탐색 순서:
`DEEP_MODEL_ROUTER_CLI`, `DEEP_MODEL_ROUTER_ROOT`, 호스트 플러그인 캐시.
부재 시 `routing_provenance: local-fallback`. HIGH/CRITICAL 하한은 낮아지지 않는다.

## 병합

라우터가 resolve 전에 `local_policy`를 집행한다(floor는 max, `allowed_families`는
교집합). 소비자는 no-downgrade 테스트만 유지한다.
