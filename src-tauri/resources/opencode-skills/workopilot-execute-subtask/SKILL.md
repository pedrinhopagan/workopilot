---
name: workopilot-execute-subtask
description: Executar uma unica subtask especifica do WorkoPilot com foco dedicado, usando mais processamento para uma implementacao cuidadosa.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o prompt mencionar um ID de subtask especifico
- Quando o usuario quer focar em uma unica subtask
- Quando uma subtask e complexa e precisa de atencao especial

## What I do
- Identifico a subtask pelo ID fornecido
- Uso o contexto da task pai para consistencia
- Foco 100% na implementacao desta unica subtask
- Marco a subtask como "in_progress" e depois "done" via CLI
- Verifico se todas subtasks done para atualizar status da task

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

# Atualizar status da task pai (quando todas subtasks done)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --substatus awaiting_review
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## Contexto

Voce foi iniciado pelo WorkoPilot para executar UMA subtask especifica.
O ID da subtask esta no prompt inicial.
Foque 100% nesta subtask - as outras sao apenas contexto.

---

## Fluxo de Execucao

### 1. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
O JSON retornado inclui todas as subtasks.

### 2. Identificar a subtask
Encontre a subtask pelo ID fornecido no prompt dentro do array `subtasks`.

### 3. Carregar contexto
**Da task pai (contexto global):**
- `context.description` - Objetivo geral da task
- `context.business_rules` - Restricoes que se aplicam
- `context.technical_notes` - Stack e padroes do projeto

**Da subtask (foco principal):**
- `title` - O que fazer
- `description` - Detalhes da implementacao
- `acceptance_criteria` - Como saber se esta pronto
- `technical_notes` - Notas especificas desta subtask
- `prompt_context` - Instrucoes adicionais

### 4. Marcar como in_progress
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --status in_progress
```

### 5. Implementar
- Foque EXCLUSIVAMENTE nesta subtask
- Siga os `acceptance_criteria` da subtask
- Use o contexto da task pai para consistencia
- Dedique processamento completo a esta unica tarefa

### 6. Verificar criterios
Antes de marcar como done, verifique cada item em `acceptance_criteria`.

### 7. Marcar como done
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --status done
```

### 8. Verificar se task deve mudar de status
Releia a task para verificar se TODAS as subtasks estao done:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```

Se todas estiverem done:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --substatus awaiting_review
```

**NOTA**: Use `--substatus awaiting_review` para limpar o status "Executando" e mudar para "Aguardando revisao".

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --status {status}` | Atualiza status da task |
| `update-task {id} --substatus {substatus}` | Atualiza substatus (executing, awaiting_review, awaiting_user, null) |
| `update-subtask {id} --status {status}` | Atualiza status da subtask (pending, in_progress, done) |
| `update-subtask {id} --title {title}` | Atualiza titulo da subtask |
| `update-subtask {id} --description {desc}` | Atualiza descricao da subtask |

---

## Finalizacao

Apos atualizar via CLI com sucesso, diga:

**Se ainda ha subtasks pendentes:**
> "Subtask '{titulo}' concluida!
> 
> **Progresso da task:**
> - Concluidas: {X}/{Total}
> - Proximas pendentes: [lista]
> 
> Volte ao WorkoPilot para continuar com a proxima subtask ou revisar o progresso."

**Se foi a ultima subtask:**
> "Subtask '{titulo}' concluida! Esta era a ultima subtask.
> 
> **Todas as subtasks foram implementadas!**
> 
> Volte ao WorkoPilot para revisar a implementacao completa."

---

## Diferencial desta Skill

Esta skill existe para dar **foco dedicado** a uma unica subtask.
- Mais processamento para uma tarefa
- Analise mais profunda
- Implementacao mais cuidadosa
- Verificacao mais rigorosa dos criterios

Use quando a subtask e complexa ou requer atencao especial.

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Li a task via CLI (`get-task`)?
- [ ] Identifiquei a subtask correta pelo ID?
- [ ] Implementei seguindo os acceptance_criteria?
- [ ] Marquei a subtask como done via CLI?
- [ ] Verifiquei se todas subtasks done?
- [ ] Se sim, atualizei task para awaiting_review?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
