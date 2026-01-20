# Configurable Tasks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar sistema de tasks configuráveis com página de edição dedicada, armazenamento híbrido (SQLite + JSON), micro-tasks, e integração com OpenCode via skill injetada.

**Architecture:**

- Armazenamento híbrido: SQLite para índices/queries rápidas + arquivos JSON por task em `.workopilot/tasks/` para IA ler/editar
- Página de edição em `/tasks/[id]` com layout aninhado mantendo header principal desabilitado
- Skill do OpenCode empacotada no binário e injetada no projeto ao clicar "Codar >"

**Tech Stack:** SvelteKit 5, Tauri 2, Rust, SQLite, TypeScript, Tailwind CSS

---

## JSON Schema (v1)

```json
{
  "schema_version": 1,
  "initialized": false,
  "id": "uuid",
  "title": "Implementar autenticação",
  "status": "pending",
  "priority": 1,
  "category": "feature",
  "complexity": null,

  "context": {
    "description": null,
    "business_rules": [],
    "technical_notes": null,
    "acceptance_criteria": null
  },

  "microtasks": [],

  "ai_metadata": {
    "last_interaction": null,
    "session_ids": [],
    "tokens_used": 0
  },

  "timestamps": {
    "created_at": "...",
    "started_at": null,
    "completed_at": null
  }
}
```

---

## Phase 1: Backend (COMPLETED)

### Task 1: Criar módulo task_json.rs ✓

- Created `src-tauri/src/task_json.rs` with TaskFull struct and file operations
- Registered module in `src-tauri/src/lib.rs`

### Task 2: Migrar tabela tasks no SQLite ✓

- Added `json_path` column migration
- Updated Task struct and all SELECT queries

### Task 3: Adicionar comandos Tauri ✓

- `create_task_with_json` - Creates JSON + SQLite entry
- `get_task_full` - Loads full task from JSON
- `save_task_full` - Saves task to JSON
- `update_task_and_sync` - Saves JSON + syncs to SQLite
- `delete_task_full` - Deletes JSON + SQLite
- `get_task_by_id` - Gets task metadata from SQLite

---

## Phase 2: Frontend (COMPLETED)

### Task 4: Atualizar tipos TypeScript ✓

- Added TaskFull, TaskContext, Microtask, AIMetadata, TaskTimestamps
- Updated Task interface with json_path

### Task 5: Criar layout de tasks ✓

- Created `src/routes/tasks/+layout.svelte`
- Header with project select and "Começar" button
- Disables controls when editing task

### Task 6: Criar página de edição [id] ✓

- Created `src/routes/tasks/[id]/+page.svelte`
- Secondary header with back, title, Codar, selects
- Sections: Description, Business Rules, Technical Notes (collapsible), Acceptance Criteria (collapsible), Micro-tasks placeholder, AI Metadata

### Task 7: Componentes colapsáveis ✓

- Integrated directly in [id]/+page.svelte
- Smooth animations (slide-down, fade-in)

---

## Phase 3: Integration (COMPLETED)

### Task 8: Criar componentes de Micro-tasks ✓

**Files:**

- Created: `src/lib/components/tasks/MicrotaskList.svelte`
- Created: `src/lib/components/tasks/MicrotaskItem.svelte`
- Modified: `src/routes/tasks/[id]/+page.svelte`

### Task 9: Empacotar skill OpenCode no Tauri ✓

**Files:**

- Created: `src-tauri/resources/opencode-skill/workopilot-task.md`
- Modified: `src-tauri/tauri.conf.json` (added resources)

**Skill content:**

```markdown
# workopilot-task

# Use quando iniciado via WorkoPilot para executar uma task

## Fluxo Inicial

1. Ler o JSON da task no path fornecido
2. Verificar flag `initialized`:
   - Se `false` ou campos obrigatórios vazios → Modo Configuração
   - Se `true` e completo → Perguntar: "Executar ou revisar?"

## Modo Configuração (perguntas sequenciais)

### Complexidade

"Essa task parece [simples/média/complexa]. Concorda?"

### Descrição

"Descreva brevemente o objetivo dessa task:"

### Regras de Negócio

"Existe alguma regra de negócio que afeta essa task? (ou 'nenhuma')"

### Notas Técnicas (se média/complexa)

"Alguma nota técnica importante? (ou 'pular')"

### Micro-tasks (se média/complexa)

"Vou sugerir as seguintes micro-tasks: [...]. Ajustar?"

### Finalização

- Atualizar JSON com dados coletados
- Setar `initialized: true`
- Se simples → "Começando execução..."
- Se complexa → "Configuração completa. Volte ao WorkoPilot."

## Modo Execução (micro-task)

Recebe contexto:

- Título da micro-task
- `prompt_context` específico
- `business_rules` da task pai
- `technical_notes` da task pai

Ao finalizar:

- Atualiza `status: "done"` e `completed_at`
- Adiciona session_id ao `ai_metadata`
- Incrementa `tokens_used`

## Regras

- SEMPRE editar o JSON após mudanças
- NUNCA inventar dados, perguntar ao usuário
- Manter respostas concisas
```

### Task 10: Implementar botão "Codar >" ✓

**Files:**

- Modified: `src-tauri/src/commands.rs` (added launch_task_workflow)
- Modified: `src/routes/tasks/[id]/+page.svelte` (wired up buttons)
- Modified: `src/routes/tasks/+page.svelte` (wired up buttons)

---

## UI Structure

````
┌─────────────────────────────────────────────────────────────┐
│ [Projeto: WorkoPilot ▼]                          [Começar] │
├─────────────────────────────────────────────────────────────┤
│ [←]  Implementar autenticação  [Codar >]   [Cat ▼] [Urg ▼] │
├─────────────────────────────────────────────────────────────┤
│ Descrição                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Textarea auto-save...                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Regras de Negócio                                           │
│ • Regra 1                                            [×]    │
│ [+ Adicionar regra]                                         │
│                                                             │
│ ▶ Notas Técnicas (opcional)                                 │
│ ▶ Critérios de Aceite (opcional)                            │
│                                                             │
│ Micro-tasks                                                 │
│ ┌───────────────────────────────────────────┬─────────────┐ │
│ │ ○ Criar login form                        │   [Codar]   │ │
│ │ ● Integrar OAuth (done)                   │   [Codar]   │ │
│ └───────────────────────────────────────────┴─────────────┘ │
│                                                             │
│ Metadados IA                                                │
│ ```json                                                     │
│ { "last_interaction": null, ... }                           │
│ ```                                                         │
└─────────────────────────────────────────────────────────────┘
````

---

## File Structure (ALL COMPLETED)

```
src/
├── routes/tasks/
│   ├── +layout.svelte        ✓
│   ├── +page.svelte          ✓
│   └── [id]/
│       └── +page.svelte      ✓
├── lib/
│   ├── types.ts              ✓
│   └── components/tasks/
│       ├── MicrotaskList.svelte    ✓
│       └── MicrotaskItem.svelte    ✓

src-tauri/
├── resources/
│   └── opencode-skill/
│       └── workopilot-task.md      ✓
├── src/
│   ├── database.rs           ✓
│   ├── commands.rs           ✓
│   ├── task_json.rs          ✓
│   └── lib.rs                ✓
└── tauri.conf.json           ✓
```
