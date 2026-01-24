# SDK PACKAGE (packages/sdk)

## OVERVIEW

Thin API wrapper over `@workopilot/core`. Exposes module-based API via `WorkoPilotSDK`.

## STRUCTURE

```
packages/sdk/src/
├── WorkoPilotSDK.ts     # factory + lifecycle
├── modules/             # Tasks, Projects, Subtasks, Settings, Executions
└── index.ts             # exports + re-exports from core
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add module | `packages/sdk/src/modules/` |
| Change exports | `packages/sdk/src/index.ts` |

## CONVENTIONS

- Use `WorkoPilotSDK.create()` and `close()` for lifecycle.
- Modules are thin wrappers over core repositories (no business logic).
- Re-export core types from `index.ts` for consumers.

## ANTI-PATTERNS

- Direct SQLite access in SDK
- Duplicating domain logic already in core
