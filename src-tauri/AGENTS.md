# TAURI SHELL (src-tauri)

## OVERVIEW

Rust shell that handles window/tray/shortcuts, process spawning, IPC socket, and skill sync. Spawns the Bun sidecar on startup.

## STRUCTURE

```
src-tauri/
├── src/                # Rust modules and Tauri commands
├── resources/          # opencode-skills + plugin
├── tauri.conf.json     # build config + bundled resources
└── Cargo.toml          # Rust deps and version
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Commands | `src-tauri/src/commands.rs` | register in `lib.rs` |
| Sidecar spawn | `src-tauri/src/sidecar.rs` | JSON-RPC to Bun process |
| IPC socket | `src-tauri/src/ipc_socket.rs` | `/tmp/workopilot.sock` |
| Skills sync | `src-tauri/src/commands.rs` | copies to `~/.config/opencode/` |
| Resources | `src-tauri/resources/` | `opencode-skills/` + plugin |

## CONVENTIONS

- Rust handles process spawning and images; CRUD lives in TypeScript.
- Skills are bundled in `resources/opencode-skills/`.
- Sidecar emits `TRPC_URL=...` for discovery.

## ANTI-PATTERNS

- Remove `windows_subsystem` in `src-tauri/src/main.rs`
- Add new CRUD in Rust (use tRPC + SDK)
