---
name: workopilot-review
description: Revisar uma task completa do WorkoPilot, verificando criterios de aceite, rodando verificacoes tecnicas e finalizando a task se aprovada.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o prompt mencionar "revisar" a task
- Quando `status === 'awaiting_review'`
- Quando todas as subtasks estao com status "done"

## What I do
- Verifico se todos os criterios de aceite foram atendidos
- Rodo verificacoes tecnicas (build, lint, tests)
- Apresento um resumo da revisao ao usuario
- Se aprovado, marco a task como "done" via CLI
- Se reprovado, informo os problemas encontrados

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

Use os comandos da CLI WorkoPilot para ler e atualizar dados:

```bash
# Ler task completa (inclui subtasks)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}

# Aprovar task (marcar como done e limpar substatus)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status done --substatus null
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## Contexto

Voce foi iniciado pelo WorkoPilot para REVISAR uma task.
Seu objetivo e verificar se a implementacao atende aos requisitos antes de finalizar.

---

## Fluxo de Revisao

### 1. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
O JSON retornado inclui todas as subtasks e metadados.

### 2. Verificar pre-requisitos
- `status` deve ser "awaiting_review" ou todas subtasks "done"
- `ai_metadata.structuring_complete` deve ser `true`

### 3. Analisar a task
Carregue e entenda:
- `context.description` - Objetivo original
- `context.business_rules` - Restricoes a verificar
- `context.acceptance_criteria` - Criterios principais
- Todas as subtasks e seus criterios

### 4. Verificar criterios de aceite
Para cada criterio em `context.acceptance_criteria`:
- [ ] Esta implementado?
- [ ] Funciona corretamente?
- [ ] Segue as regras de negocio?

Para cada subtask, verificar seus `acceptance_criteria`:
- [ ] Subtask implementada corretamente?
- [ ] Criterios atendidos?

### 5. Rodar verificacoes tecnicas
Execute comandos de verificacao do projeto:
- `npm run check` ou `npm run lint` (se existir)
- `cargo build` ou `cargo check` (se Rust)
- `npm run test` (se houver testes)
- Outros comandos relevantes ao projeto

### 6. Apresentar resumo
Crie um resumo da revisao:

```
## Revisao da Task: {titulo}

### Criterios de Aceite
- [x] Criterio 1 - OK
- [x] Criterio 2 - OK
- [ ] Criterio 3 - PENDENTE: [motivo]

### Subtasks
- [x] Subtask 1 - Implementada
- [x] Subtask 2 - Implementada

### Verificacoes Tecnicas
- Build: OK
- Lint: OK (ou X warnings)
- Tests: OK (ou X falhas)

### Resultado
[APROVADO/REPROVADO]
```

### 7. Decisao final

**Se APROVADO:**
Pergunte ao usuario: "A revisao foi positiva. Deseja marcar a task como concluida?"

Se sim:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status done --substatus null
```

**NOTA**: Use `--substatus null` para limpar qualquer substatus anterior (como "awaiting_review").

**Se REPROVADO:**
Informe os problemas encontrados e pergunte como proceder:
- Corrigir agora (usar skill execute-subtask ou execute-all)
- Voltar ao WorkoPilot para decidir

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --status done --substatus null` | Marca task como concluida e limpa substatus |
| `update-task {id} --status in_progress` | Volta task para em progresso |
| `update-task {id} --substatus {substatus}` | Atualiza substatus (executing, awaiting_review, awaiting_user, null) |
| `get-logs --entity-id {id}` | Ver historico de operacoes |

---

## Finalizacao

**Se aprovado e finalizado:**
> "Task '{titulo}' revisada e CONCLUIDA!
> 
> **Resumo:**
> - Todos os criterios de aceite atendidos
> - {N} subtasks implementadas com sucesso
> - Verificacoes tecnicas passaram
> 
> A task foi marcada como 'done'. Parabens!"

**Se reprovado:**
> "Task '{titulo}' revisada - encontrados {N} problemas.
> 
> **Problemas:**
> - [lista de problemas]
> 
> **Opcoes:**
> - Posso tentar corrigir agora
> - Volte ao WorkoPilot para executar subtasks especificas
> 
> Como deseja proceder?"

---

## Checklist de Revisao

### Funcionalidade
- [ ] Todos os criterios de aceite atendidos?
- [ ] Todas as subtasks implementadas?
- [ ] Regras de negocio respeitadas?

### Qualidade
- [ ] Codigo segue padroes do projeto?
- [ ] Sem erros de lint/type?
- [ ] Build passa?
- [ ] Testes passam (se existirem)?

### Documentacao
- [ ] Codigo comentado onde necessario?
- [ ] README atualizado (se aplicavel)?

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Li a task via CLI (`get-task`)?
- [ ] Verifiquei todos os criterios de aceite?
- [ ] Rodei verificacoes tecnicas?
- [ ] Apresentei resumo ao usuario?
- [ ] Se aprovado, atualizei status para done via CLI?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
