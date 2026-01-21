---
name: workopilot-execute-all
description: Executar uma task completa do WorkoPilot, implementando todas as subtasks em sequencia e atualizando o status de cada uma.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o prompt mencionar "executar" a task completa
- Quando `structuring_complete === true` e o usuario quer executar tudo de uma vez
- Quando nao ha subtask especifica mencionada

## What I do
- Leio a task via CLI para entender o escopo
- Executo cada subtask em ordem (se existirem)
- Atualizo o status de cada subtask para "in_progress" e depois "done" via CLI
- Marco a task como "awaiting_review" ao finalizar

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

Use os comandos da CLI WorkoPilot para ler e atualizar dados:

```bash
# Ler task completa (inclui subtasks)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}

# Atualizar status da subtask
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --status in_progress
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --status done

# Atualizar status da task (limpa substatus "executing" e muda para awaiting_review)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --substatus awaiting_review
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## Contexto

Voce foi iniciado pelo WorkoPilot para EXECUTAR uma task completa.
A task ja foi estruturada e esta pronta para implementacao.

## Pre-requisitos

Antes de executar, verifique:
- `ai_metadata.structuring_complete` deve ser `true`
- `context.description` deve estar preenchido
- Se houver subtasks, execute-as na ordem

---

## Fluxo de Execucao

### 1. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
O JSON retornado inclui todas as subtasks.

### 2. Analisar o escopo
- Leia `context.description` para entender o objetivo
- Leia `context.business_rules` para restricoes
- Leia `context.technical_notes` para orientacoes tecnicas
- Liste as subtasks pendentes em ordem

### 3. Executar subtasks (se existirem)
Para cada subtask em ordem:

a) **Marcar como in_progress**:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --status in_progress
```

b) **Implementar**:
- Use o contexto da subtask + task pai
- Siga `acceptance_criteria` da subtask
- Respeite `technical_notes`

c) **Marcar como done**:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --status done
```

d) **Repetir** para proxima subtask.

### 4. Executar task simples (sem subtasks)
Se nao houver subtasks:
- Implemente diretamente baseado em `context`
- Siga `acceptance_criteria` da task

### 5. Finalizar
Quando todas as subtasks estiverem done (ou task simples concluida):
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --substatus awaiting_review
```

**NOTA**: Use `--substatus awaiting_review` para atualizar o substatus corretamente. Isso limpa o status "Executando" e muda para "Aguardando revisao".

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --status {status}` | Atualiza status da task |
| `update-task {id} --substatus {substatus}` | Atualiza substatus (executing, awaiting_review, awaiting_user, null) |
| `update-subtask {id} --status {status}` | Atualiza status da subtask (pending, in_progress, done) |
| `list-tasks [--project {id}]` | Lista tasks do projeto |

---

## Contexto para Implementacao

**Da task pai (sempre usar):**
- `context.description` - Objetivo geral
- `context.business_rules` - Restricoes globais
- `context.technical_notes` - Stack e padroes

**Da subtask atual:**
- `title` - O que fazer
- `description` - Detalhes especificos
- `acceptance_criteria` - Criterios de sucesso
- `technical_notes` - Notas especificas
- `prompt_context` - Contexto adicional

---

## Finalizacao

Apos atualizar via CLI com sucesso, diga:

> "Execucao completa! Todas as {N} subtasks foram implementadas.
> 
> **Resumo:**
> - [Lista das subtasks concluidas]
> 
> Volte ao WorkoPilot para revisar a implementacao antes de finalizar."

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Li a task via CLI (`get-task`)?
- [ ] Executei todas as subtasks na ordem?
- [ ] Atualizei status de cada subtask via CLI?
- [ ] Setei task para `awaiting_review`?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
