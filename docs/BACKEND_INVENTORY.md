# WorkoPilot Backend Inventory

> Documento gerado para guiar a reestruturacao do backend.
> Data: 2026-01-22

---

## 1. Visao Geral da Arquitetura Atual

```
workopilot/
├── src-tauri/              # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── lib.rs          # Entry point, AppState, plugins
│   │   ├── commands.rs     # 60+ Tauri commands (1428 lines)
│   │   ├── database.rs     # SQLite via rusqlite (2148+ lines)
│   │   ├── ipc_socket.rs   # Unix socket p/ CLI notificar app
│   │   ├── activity_logger.rs  # Logs de eventos/sessoes
│   │   ├── settings.rs     # Atalhos globais
│   │   ├── tray.rs         # System tray
│   │   ├── window.rs       # Show/hide/toggle
│   │   └── token_tracker.rs# Tracking de tokens AI
│   └── Cargo.toml
├── packages/
│   └── cli/                # CLI em TypeScript/Bun
│       ├── src/
│       │   ├── index.ts    # Comandos CLI (1517 lines)
│       │   ├── db.ts       # Conexao Kysely + SQLite
│       │   ├── types.ts    # Tipos TS (Database, TaskFull, etc)
│       │   ├── migrations.ts
│       │   ├── activityLogger.ts
│       │   ├── socket-notify.ts  # Notifica Tauri via Unix socket
│       │   └── logger.ts
│       └── package.json
└── src/                    # Frontend React (separado)
```

---

## 2. Modulos Rust (src-tauri/src/)

### 2.1 lib.rs (145 lines)
**Responsabilidade**: Entry point, inicializacao do app, registro de comandos.

**AppState**:
```rust
pub struct AppState {
    pub db: Mutex<Database>,
    pub activity_logger: ActivityLogger,
    pub ipc_socket: Mutex<Option<IpcSocketServer>>,
}
```

**Setup**:
- Inicializa Database
- Registra atalho global (settings::register_initial_shortcut)
- Setup tray
- Inicia IpcSocketServer
- Sync skills para ~/.config/opencode/skills/

**Comandos registrados**: 62 comandos

---

### 2.2 commands.rs (1428 lines)
**Responsabilidade**: Todos os comandos Tauri expostos ao frontend.

| Categoria | Comandos |
|-----------|----------|
| **Projects** | get_projects, get_project_with_config, add_project, update_project, update_project_name, update_project_routes, update_project_tmux_config, update_project_business_rules, update_projects_order, set_tmux_configured, delete_project |
| **Tasks** | get_tasks, get_urgent_tasks, get_active_tasks, add_task, update_task_status, schedule_task, unschedule_task, get_tasks_for_month, get_unscheduled_tasks, get_tasks_for_date, get_task_by_id |
| **TaskFull** | create_task_with_json, get_task_full, save_task_full, update_task_and_sync, delete_task_full |
| **Calendar** | get_tasks_for_month, enrich_calendar_tasks |
| **Tmux/Terminal** | launch_project_tmux, focus_tmux_session |
| **Task Workflow** | launch_task_workflow, launch_task_structure, launch_task_execute_all, launch_task_execute_subtask, launch_task_review, launch_quickfix_background |
| **Execution** | start_task_execution, end_task_execution, update_task_execution_progress, get_active_task_execution, get_all_active_executions, cleanup_stale_task_executions |
| **Images** | add_task_image, add_task_image_from_path, get_task_images, get_task_image, delete_task_image |
| **Logs** | get_session_logs, get_activity_logs, search_activity_logs, get_user_sessions |
| **Settings** | get_setting, set_setting |
| **Skills** | sync_skills |
| **Misc** | open_env_file, detect_project_structure, get_ai_suggestion |

**Dependencias internas**:
- `crate::database::*` (todos os tipos e Database)
- `crate::AppState`
- `std::process::Command` (para alacritty/tmux)

---

### 2.3 database.rs (2148+ lines)
**Responsabilidade**: Schema SQLite, migrations, CRUD completo.

**Tabelas**:
| Tabela | Campos principais |
|--------|-------------------|
| `projects` | id, name, path, description, routes (JSON), tmux_config (JSON), business_rules, tmux_configured, display_order, created_at |
| `tasks` | id, project_id, title, description, priority, category, status, due_date, scheduled_date, complexity, initialized, context_*, ai_metadata (JSON), timestamps_*, modified_* |
| `subtasks` | id, task_id, title, status, order, description, acceptance_criteria (JSON), technical_notes, prompt_context, created_at, completed_at |
| `logs` | id, project_id, project_name, session_id, summary, files_modified (JSON), tokens_*, raw_json, created_at |

| `settings` | key, value |
| `operation_logs` | id, entity_type, entity_id, operation, old_data, new_data, source, created_at |
| `task_executions` | id, task_id, subtask_id, execution_type, status, current_step, total_steps, waiting_for_input, tmux_session, pid, last_heartbeat, error_message, started_at, ended_at |
| `task_images` | id, task_id, data (BLOB), mime_type, file_name, created_at |
| `activity_logs` | id, event_type, entity_type, entity_id, project_id, metadata (JSON), created_at |
| `user_sessions` | id, started_at, ended_at, duration_seconds, app_version |

**Status de Tasks (7 valores)**:
```
pending -> structuring -> structured -> working -> standby -> ready_to_review -> completed
```

**Status de Subtasks (3 valores)**:
```
pending -> in_progress -> done
```

---

### 2.4 ipc_socket.rs (234 lines)
**Responsabilidade**: Unix socket server para CLI notificar o app de mudancas no DB.

**Socket**: `/tmp/workopilot.sock`

**Protocolo**:
```json
{
  "entity_type": "task|subtask|execution|terminal",
  "entity_id": "uuid",
  "operation": "create|update|delete",
  "project_id": "optional"
}
```

**Comportamento**:
- Debounce de 300ms
- Emite evento `db-changed` para o frontend

---

### 2.5 activity_logger.rs (265 lines)
**Responsabilidade**: Logging de eventos do usuario e sessoes AI.

**Eventos logados**:
- user_session_start/end
- task_created
- task_started/completed/status_changed
- subtask_started/completed/status_changed
- ai_session_start/end (com tokens)

---

### 2.6 settings.rs (208 lines)
**Responsabilidade**: Atalhos globais (Alt+P / Alt+O dev).

**Comandos**:
- `get_shortcut`
- `set_shortcut`

---

### 2.7 tray.rs (78 lines)
**Responsabilidade**: System tray icon e menu.

---

### 2.8 window.rs (55 lines)
**Responsabilidade**: Show/hide/toggle da janela principal.

**Comandos**:
- `hide_window`

---

## 3. CLI TypeScript (packages/cli/)

### 3.1 index.ts (1517 lines)
**Responsabilidade**: Interface CLI usando Commander.js.

| Comando | Descricao |
|---------|-----------|
| `get-task <id>` | Retorna TaskFull completa |
| `list-tasks` | Lista tasks com filtros |
| `update-task <id>` | Atualiza status, title, complexity, description, etc |
| `create-subtask <taskId>` | Cria nova subtask |
| `update-subtask <id>` | Atualiza subtask |
| `get-logs` | Operation logs |
| `migrate` | Roda migrations |
| `migrate-json-to-sqlite` | Migracao legada |
| `start-execution <taskId>` | Inicia tracking de execucao |
| `end-execution <taskId>` | Finaliza execucao |
| `update-execution <taskId>` | Atualiza progresso |
| `get-execution <taskId>` | Status de execucao |
| `cleanup-executions` | Limpa execucoes stale |
| `link-terminal <taskId>` | Liga task a sessao tmux |
| `get-terminal <taskId>` | Obtem terminal linkado |
| `unlink-terminal <taskId>` | Remove link |
| `update-terminal-subtask <taskId>` | Atualiza ultima subtask |
| `get-activity-logs` | Activity logs |
| `get-user-sessions` | User sessions |
| `check-needs-new <taskId>` | Verifica se precisa /new |
| `db-info` | Info do banco |

---

### 3.2 db.ts (45 lines)
**Responsabilidade**: Conexao com SQLite via Kysely.

**Path do DB**: `~/.local/share/workopilot/workopilot.db`

---

### 3.3 types.ts (318 lines)
**Responsabilidade**: Tipos TypeScript para o schema do banco.

**Interfaces principais**:
- `Database` (schema Kysely)
- `TaskFull`, `Subtask`, `TaskContext`, `AIMetadata`
- `Project`, `ProjectRoute`, `TmuxConfig`
- `TaskExecution`, `TaskTerminal`
- `ActivityLog`, `UserSession`

---

### 3.4 socket-notify.ts (49 lines)
**Responsabilidade**: Notifica o app Tauri via Unix socket.

---

### 3.5 activityLogger.ts (170 lines)
**Responsabilidade**: Mesmas funcoes de logging do Rust, mas em TS.

---

## 4. Fluxo de Dados

### 4.1 Frontend -> Tauri -> DB
```
React Component
    -> invoke("get_tasks")
    -> commands.rs::get_tasks()
    -> Database::get_tasks()
    -> SQLite query
    -> Return Vec<Task>
```

### 4.2 CLI -> DB -> Tauri (notificacao)
```
CLI command (bun run src/index.ts update-task ...)
    -> Kysely query direto no SQLite
    -> socket-notify.ts::notifyApp()
    -> Unix socket /tmp/workopilot.sock
    -> ipc_socket.rs recebe
    -> Emite evento "db-changed" para frontend
    -> React QueryClient invalida cache
```

### 4.3 Task Workflow (launch_task_*)
```
Frontend: click "Estruturar"
    -> invoke("launch_task_structure")
    -> commands.rs gera script bash
    -> Spawna alacritty com tmux
    -> tmux roda "opencode"
    -> Animacao de loading
    -> Envia prompt inicial
    -> OpenCode executa skill
    -> Skill usa CLI para atualizar DB
    -> CLI notifica app via socket
```

---

## 5. Duplicacoes Identificadas

| Area | Rust | TypeScript |
|------|------|------------|
| DB Access | database.rs (rusqlite) | db.ts (Kysely) |
| Tipos TaskFull | database.rs structs | types.ts interfaces |
| Activity Logging | activity_logger.rs | activityLogger.ts |
| Migrations | database.rs (inline) | migrations.ts |

---

## 6. O que DEVE permanecer no Rust

| Modulo | Razao |
|--------|-------|
| window.rs | API Tauri nativa |
| tray.rs | API Tauri nativa |
| settings.rs (atalhos) | tauri_plugin_global_shortcut |
| launch_project_tmux | Spawna processo (alacritty) |
| focus_tmux_session | Usa xdotool |
| sync_skills | Acesso a resources do bundle |

---

## 7. O que DEVE migrar para TypeScript (core)

| Funcionalidade | Razao |
|----------------|-------|
| Todo CRUD (tasks, projects, subtasks) | Unificar em um so lugar |
| Migrations | Ja existe em TS |
| Activity logging | Duplicado |
| Execution tracking | Pode ser TS |
| Settings (key/value) | Simples |
| Task images | Pode ser TS |

---

## 8. Estatisticas

| Metrica | Valor |
|---------|-------|
| Linhas Rust (src-tauri/src/) | ~4,500 |
| Linhas TS (packages/cli/src/) | ~2,500 |
| Tabelas SQLite | 10 |
| Comandos Tauri | 62 |
| Comandos CLI | 20+ |
| Status de Task | 7 |
| Status de Subtask | 3 |

---

## 9. Proximos Passos

1. Criar `packages/core` com domain/application/infrastructure
2. Mover CRUD e logica de negocio para core
3. CLI passa a usar core
4. Implementar sidecar Bun + JSON-RPC
5. Tauri commands viram proxy para sidecar
6. Remover duplicacoes do Rust

---

*Documento de referencia para a task de reestruturacao do backend.*
