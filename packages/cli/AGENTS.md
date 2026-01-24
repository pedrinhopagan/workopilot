# CLI PACKAGE (packages/cli)

## OVERVIEW

Commander.js CLI that calls the SDK and notifies the app over `/tmp/workopilot.sock`.

## STRUCTURE

```
packages/cli/src/
├── index.ts          # all commands
└── socket-notify.ts  # app notification helper
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add command | `packages/cli/src/index.ts` |
| Socket notify | `packages/cli/src/socket-notify.ts` |

## CONVENTIONS

- Always use `WorkoPilotSDK` (no direct core access).
- Output JSON to stdout; errors as JSON to stderr.
- Notify app after state changes via `socket-notify`.
- Validate inputs (status enums, date formats).

## ANTI-PATTERNS

- Non-JSON output for commands
- Skipping socket notify for mutations
- Importing `@workopilot/core` directly
