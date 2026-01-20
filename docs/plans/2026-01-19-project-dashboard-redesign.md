# Project Dashboard Redesign

## Overview

Transform the `/projects` page from a configuration-focused view into a proper home/dashboard for each project, with quick access to urgent tasks, logs, and token metrics.

## Routes Structure

- `/projects` - Home/Dashboard do projeto selecionado
- `/projects/settings` - Configuracoes do projeto (Tmux, Resumo, Excluir)
- `/settings` - Configuracoes globais (shortcut)

## Design Decisions

### Home do Projeto (Dashboard)

Layout: Stack vertical com cards

```
+---------------------------------------+
| Header: Nome + Path + [Abrir tmux][?] |
+---------------------------------------+
| TAREFAS URGENTES                      |
| - Task 1 (P1, due today)              |
| - Task 2 (P1)                         |
| - Task 3 (P2)                         |
|                        ver todas ->   |
+-------------------+-------------------+
| TOKENS DIARIO     | ULTIMO LOG        |
| [====-----] 45k   | "Implementei X.." |
+-------------------+-------------------+
| SEMANA (placeholder)                  |
| Em desenvolvimento                    |
+---------------------------------------+
```

### Urgencia de Tarefas

Ordenacao combinada:

1. `due_date` proximo/vencido (se existir) - mais urgente primeiro
2. `priority` (1=Alta > 2=Media > 3=Baixa)
3. `created_at` (mais antigas primeiro)

Mostrar: 3-5 tarefas + link sutil "ver todas"
Se vazio: CTA redirect para /tasks

### Configuracoes do Projeto (/projects/settings)

1. Descricao do projeto (textarea menor height)
2. Tmux config (rotas + tabs)
3. Resumo da aplicacao (antigo "Regras de Negocio")
4. Botao Excluir (danger, no final)

### Configuracoes Globais (/settings)

- Shortcut para abrir/fechar app (default: alt+p)
- Campo editavel para trocar a combinacao

### TabBar

```
[logo] Projetos | Tarefas | Agenda | Logs     [?]
```

Icone engrenagem no canto direito -> /settings

## Technical Changes

### Backend (Rust)

1. Add `due_date` field to Task struct and database schema
2. Add command `get_urgent_tasks(project_id, limit)` with urgency sorting
3. Add settings table for global config (shortcut)
4. Add commands for settings CRUD

### Frontend (Svelte)

1. Update Task type with optional `due_date: string | null`
2. Create `/settings/+page.svelte`
3. Create `/projects/settings/+page.svelte`
4. Refactor `/projects/+page.svelte` to dashboard layout
5. Update TabBar with settings icon
6. Move project config logic to settings page

## Implementation Order

1. Backend: due_date field + migration
2. Backend: settings table + commands
3. Frontend: types update
4. Frontend: /settings page + TabBar icon
5. Frontend: /projects/settings page
6. Frontend: /projects dashboard refactor
7. Backend: urgent tasks command
8. Integration + testing
