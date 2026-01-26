---
name: workopilot-review
description: Revisar uma task completa do WorkoPilot, verificando criterios de aceite, rodando verificacoes tecnicas e sinalizando aprovacao via last_completed_action.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o prompt mencionar "revisar" a task
- Quando `status === 'pending'` e todas as subtasks estao com status "done"
- Quando o usuario quer verificar a implementacao antes de commitar

## What I do
- Verifico se todos os criterios de aceite foram atendidos
- Rodo verificacoes tecnicas (build, lint, tests)
- Apresento um resumo da revisao ao usuario
- Se aprovado, sinalizo aprovacao setando `last_completed_action=review` via CLI
- **NAO marco a task como done** - o fluxo Commit fara isso depois
- Se reprovado, informo os problemas encontrados

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

Use os comandos da CLI WorkoPilot para ler e atualizar dados:

```bash
# Ler task completa (inclui subtasks)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}

# Sinalizar aprovacao (setar last_completed_action=review)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --last-completed-action review

# Marcar task como pendente (sinaliza que IA terminou)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status pending
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

**IMPORTANTE**: Esta skill NAO marca a task como done/completed. Apenas sinaliza que a revisao foi aprovada. O passo seguinte (Commit) e responsavel por finalizar a task.

---

## Contexto

Voce foi iniciado pelo WorkoPilot para REVISAR uma task.
Seu objetivo e verificar se a implementacao atende aos requisitos.

**Fluxo completo**: Structure -> Execute -> **Review** -> Commit -> Done
Voce esta no passo Review. Apos sua aprovacao, o usuario podera commitar.

---

## Fluxo de Revisao

### 1. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
O JSON retornado inclui todas as subtasks e metadados.

### 2. Verificar pre-requisitos
- `status` deve ser "pending" e todas subtasks "done" (status visual: "Aguardando revisao")
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
Sinalizar aprovacao via CLI:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --last-completed-action review
```

Depois, informe ao usuario:
> "Revisao aprovada! A task esta pronta para commit.
> Volte ao WorkoPilot e use a acao **Commit** para finalizar."

**IMPORTANTE**: NAO marque a task como done/completed. O Commit e o proximo passo.

**Se REPROVADO:**
Informe os problemas encontrados e pergunte como proceder:
- Corrigir agora (usar skill execute-subtask ou execute-all)
- Voltar ao WorkoPilot para decidir

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --last-completed-action review` | Sinaliza que revisao foi aprovada |
| `update-task {id} --status pending` | Marca que IA terminou (usuario pode agir) |
| `get-logs --entity-id {id}` | Ver historico de operacoes |

---

## Finalizacao

**Se aprovado:**
> "Task '{titulo}' revisada e APROVADA!
> 
> **Resumo:**
> - Todos os criterios de aceite atendidos
> - {N} subtasks implementadas com sucesso
> - Verificacoes tecnicas passaram
> 
> **Proximo passo:** Use a acao **Commit** no WorkoPilot para commitar as mudancas e finalizar a task."

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
- [ ] Se aprovado, setei `--last-completed-action review` via CLI?
- [ ] NAO marquei a task como done (o Commit fara isso)?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
