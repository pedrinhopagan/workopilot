# Design: Sistema de Tarefas com Subtasks

**Data:** 2026-01-20  
**Status:** Aprovado  
**Autor:** Brainstorming session

---

## 1. Visão Geral

Transformar o sistema de tarefas do WorkoPilot para suportar subtasks estruturadas, permitindo:
- Estruturação colaborativa via chat (IA + usuário)
- Execução focada por subtask
- Revisão automática com sincronização de status
- Visualização de progresso em todas as views

---

## 2. Modelo de Dados (JSON Schema v2)

```json
{
  "schema_version": 2,
  "initialized": boolean,
  "id": "uuid",
  "title": "string",
  "status": "pending" | "in_progress" | "awaiting_review" | "done",
  "priority": 1 | 2 | 3,
  "category": "feature" | "bug" | "refactor" | "test" | "docs",
  "complexity": "string | null",
  
  "context": {
    "description": "string | null",
    "business_rules": ["string"],
    "technical_notes": "string | null",
    "acceptance_criteria": ["string"] | null
  },
  
  "subtasks": [
    {
      "id": "uuid",
      "title": "string",
      "status": "pending" | "in_progress" | "done",
      "order": number,
      
      "description": "string | null",
      "acceptance_criteria": ["string"] | null,
      "technical_notes": "string | null",
      "prompt_context": "string | null",
      
      "created_at": "ISO string",
      "completed_at": "ISO string | null"
    }
  ],
  
  "ai_metadata": {
    "last_interaction": "ISO string | null",
    "session_ids": ["string"],
    "tokens_used": number,
    "structuring_complete": boolean
  },
  
  "timestamps": {
    "created_at": "ISO string",
    "started_at": "ISO string | null",
    "completed_at": "ISO string | null"
  },
  
  "modified_at": "ISO string | null",
  "modified_by": "user" | "ai" | null
}
```

### Mudancas do v1 para v2:
- `microtasks[]` substituido por `subtasks[]` com campos mais ricos
- Novo status `awaiting_review` para task pai
- `ai_metadata.structuring_complete` para controlar fluxo
- Campos de subtask sao opcionais (exceto id, title, status, order)

---

## 3. Fluxo de Execucao

```
1. CRIAR TASK
   - Usuario cria task (titulo + descricao opcional)
   - status: "pending", structuring_complete: false

2. ESTRUTURAR (primeiro "Codar")
   - Abre tmux sessao "workopilot" (ou nova tab)
   - OpenCode recebe JSON + prompt de estruturacao
   - Dialogo: IA faz perguntas, usuario responde
   - IA cria subtasks no JSON
   - Ao finalizar: structuring_complete: true, status: "in_progress"

3. EXECUTAR SUBTASKS
   - "Codar" na task: foca na proxima subtask pendente
   - "Codar" na subtask: foco explicito naquela subtask
   - JSON completo sempre enviado
   - IA atualiza status conforme progresso

4. REVISAR
   - Botao destacado quando todas subtasks "done"
   - Disponivel a qualquer momento (acao secundaria)
   - Verifica implementacao vs criterios
   - Roda testes existentes
   - Sincroniza status com realidade do codigo
   - Se OK: task status "done"
   - Se problemas: mantem "awaiting_review" + lista pendencias
```

---

## 4. Gerenciamento de Tmux

- Sessao unica: `workopilot`
- Se nao existe: cria sessao + primeira tab
- Se existe: cria nova tab na sessao
- Nome da tab: `{projeto} - {task_title truncado ~20 chars}`
- Exemplo: `ralph - Melhorar JSON...`

---

## 5. Interface: Pagina de Tarefas (/tasks)

- Subtasks sempre visiveis abaixo da task pai (indentadas)
- Checkbox da task: toggle status
- Checkbox da subtask: toggle status (atualiza JSON)
- `[Codar >]` na task: estruturacao ou execucao geral
- `[Codar >]` na subtask: execucao focada
- `[Revisar]`: destacado quando todas subtasks "done", secundario sempre disponivel
- Indicador de progresso: "2/4 concluidas"

---

## 6. Interface: Pagina de Edicao (/tasks/[id])

- Header: titulo editavel, categoria, prioridade, botoes Sync/Codar/Revisar
- Secoes colapsaveis: Descricao, Regras de Negocio, Notas Tecnicas, Criterios de Aceite
- Area dedicada SUBTASKS:
  - Lista com checkbox, titulo, botao Codar
  - Clique expande: descricao, criterios, notas tecnicas
  - Botoes: deletar, reordenar (drag ou setas)
  - Input para adicionar nova subtask
- Metadados IA no final

---

## 7. Interface: Agenda/Calendario

- Card no calendario: titulo truncado + "+N subtasks" se houver
- Drawer do dia: task com subtasks expandidas
- Checkboxes funcionais no drawer
- Clique no titulo navega para edicao

---

## 8. Prompts

### Estruturacao (structuring_complete = false)
- Objetivo: dialogar para definir subtasks e criterios
- Ao finalizar: structuring_complete: true, status: "in_progress"

### Execucao (task inteira)
- Lista subtasks pendentes
- Foca na proxima pendente
- Atualiza JSON ao completar cada uma

### Execucao (subtask especifica)
- Foco explicito na subtask selecionada
- Mostra criterios de aceite dela
- Atualiza status ao completar

### Revisao
- Verifica cada subtask vs criterios
- Roda testes existentes
- Sincroniza status com realidade
- Marca task "done" se tudo OK

---

## 9. Migracao v1 para v2

Ao carregar JSON com schema_version: 1:
1. Converte microtasks[] para subtasks[]
2. Adiciona campos novos com valores default
3. structuring_complete = true (assume ja estruturada)
4. order = posicao no array original
5. schema_version = 2
6. Salva JSON atualizado

---

## 10. Arquivos a Modificar

### Backend (Rust)
- `src-tauri/src/task_json.rs` - Structs e migracao
- `src-tauri/src/commands.rs` - Comandos tmux e subtasks
- `src-tauri/src/lib.rs` - Registrar novos comandos

### Frontend (Svelte/TypeScript)
- `src/lib/types.ts` - Tipos atualizados
- `src/routes/tasks/+page.svelte` - Lista com subtasks
- `src/routes/tasks/[id]/+page.svelte` - Editor com area de subtasks
- `src/lib/components/tasks/SubtaskList.svelte` - Novo componente
- `src/lib/components/tasks/SubtaskItem.svelte` - Novo componente
- `src/lib/components/agenda/DayDrawer.svelte` - Subtasks no drawer
- `src/lib/components/agenda/TaskChip.svelte` - Indicador +N subtasks

### Remover
- `src/lib/components/tasks/MicrotaskList.svelte`
- `src/lib/components/tasks/MicrotaskItem.svelte`
