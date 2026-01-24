# RUST MODULES (src-tauri/src)

## OVERVIEW

Tauri command handlers and supporting modules. Acts as thin shell around sidecar and system operations.

## MODULES

```
src-tauri/src/
├── lib.rs              # AppState + invoke_handler
├── main.rs             # entry point
├── commands.rs         # Tauri commands
├── sidecar.rs          # Bun process manager
├── sidecar_commands.rs # sidecar call/status/restart
├── ipc_socket.rs       # CLI notifications
├── window.rs           # show/hide logic
├── tray.rs             # system tray
├── settings.rs         # global shortcuts
├── activity_logger.rs  # session tracking
└── token_tracker.rs    # OpenCode token parsing
```

## CONVENTIONS

- Register commands in `lib.rs` `invoke_handler`.
- Use `Result<T, String>` for command errors.
- Use sidecar JSON-RPC for data access (`sidecar_call!`).

## ANTI-PATTERNS

- Remove `windows_subsystem` in `main.rs`
- Implement data CRUD here (use sidecar + SDK)
