---
name: workopilot-structure
description: Estruturar tasks do WorkoPilot atraves de dialogo com o usuario, coletando descricao, regras de negocio, criterios de aceite e criando subtasks quando necessario.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o prompt mencionar "estruturar" uma task
- Quando `ai_metadata.structuring_complete === false`
- Quando uma nova task precisa ser detalhada antes da execucao

## What I do
- Dialogo com o usuario para coletar informacoes da task
- Preencho descricao, regras de negocio, notas tecnicas e criterios de aceite
- Avalio complexidade (simple/medium/complex)
- Crio subtasks para tasks medias ou complexas
- Atualizo o banco de dados via CLI com `structuring_complete: true`

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

Use os comandos da CLI WorkoPilot para ler e atualizar dados:

```bash
# Ler task completa
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}

# Atualizar campos da task
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status in_progress
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --description "descricao"
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --complexity medium
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --structuring-complete true

# Criar subtasks
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts create-subtask {taskId} --title "Titulo da subtask" --description "Descricao" --order 0
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## Contexto

Voce foi iniciado pelo WorkoPilot para ESTRUTURAR uma task.
Seu objetivo e dialogar com o usuario para coletar todas as informacoes necessarias antes da execucao.

## Fluxo OBRIGATORIO

### 1. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
Analise o JSON retornado para entender o estado atual.

### 2. Dialogar com o usuario
Faca perguntas para coletar:
- **Descricao detalhada**: O que exatamente precisa ser feito?
- **Regras de negocio**: Existem restricoes ou requisitos especificos?
- **Notas tecnicas**: Stack, libs, padroes a seguir?
- **Criterios de aceite**: Como saber se esta pronto?

### 3. Avaliar complexidade
Com base nas respostas, determine:
- `simple`: Tarefa direta, sem subtasks necessarias
- `medium`: Requer 2-4 subtasks
- `complex`: Requer 5+ subtasks ou multiplas areas

### 4. Atualizar a task via CLI
```bash
# Atualizar descricao
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --description "descricao coletada"

# Atualizar complexidade
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --complexity medium
```

### 5. Criar subtasks (se necessario)
Para tasks medium/complex, crie subtasks via CLI:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts create-subtask {taskId} --title "Titulo" --description "Descricao" --order 0
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts create-subtask {taskId} --title "Titulo 2" --description "Descricao 2" --order 1
```

### 6. Finalizar estruturacao
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --structuring-complete true --initialized true --substatus null
```

**IMPORTANTE**: 
- O flag `--initialized true` marca a task como "pronta para executar" no WorkoPilot.
- O flag `--substatus null` limpa o status "Estruturando" para que a UI atualize corretamente.

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --status {status}` | Atualiza status (pending, in_progress, done) |
| `update-task {id} --title {title}` | Atualiza titulo |
| `update-task {id} --description {desc}` | Atualiza descricao do contexto |
| `update-task {id} --complexity {level}` | Atualiza complexidade (simple, medium, complex) |
| `update-task {id} --structuring-complete true` | Marca estruturacao como completa |
| `update-task {id} --initialized true` | Marca task como pronta para executar |
| `update-task {id} --substatus null` | Limpa o substatus (ex: "structuring") |
| `create-subtask {taskId} --title {t} [--description {d}] [--order {n}]` | Cria nova subtask |
| `list-tasks [--project {id}] [--status {s}]` | Lista tasks |

---

## Campos OBRIGATORIOS

Estes campos NAO podem ficar null/vazios apos estruturacao:
- `context.description` - Descricao da task (via --description)
- `context.acceptance_criteria` - Pelo menos 1 criterio
- `complexity` - "simple", "medium" ou "complex" (via --complexity)
- `ai_metadata.structuring_complete` - DEVE ser `true` (via --structuring-complete)
- `initialized` - DEVE ser `true` para ficar pronta para executar (via --initialized)

**NOTA**: Alguns campos como acceptance_criteria e business_rules ainda nao tem suporte direto na CLI. Para estes, a UI do WorkoPilot deve ser usada ou a CLI deve ser expandida.

---

## Finalizacao

Apos atualizar via CLI com sucesso, diga:

**Se simples:**
> "Estruturacao completa! A task esta pronta para execucao.
> Volte ao WorkoPilot para escolher a proxima acao:
> - **Executar Tudo**: Executar a task inteira de uma vez
> - **Revisar**: Verificar se tudo esta correto antes de executar"

**Se media/complexa:**
> "Estruturacao completa! Criei {N} subtasks para esta task.
> Volte ao WorkoPilot para escolher a proxima acao:
> - **Executar Tudo**: Executar todas as subtasks sequencialmente
> - **Executar Subtask**: Focar em uma subtask especifica
> - **Revisar**: Verificar a estrutura antes de executar"

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Li a task via CLI (`get-task`)?
- [ ] Dialoguei com o usuario para coletar informacoes?
- [ ] Atualizei descricao via CLI?
- [ ] Defini complexidade via CLI?
- [ ] Criei subtasks via CLI (se necessario)?
- [ ] Setei `--structuring-complete true`?
- [ ] Setei `--initialized true` para marcar como pronta para executar?
- [ ] Setei `--substatus null` para limpar o status "Estruturando"?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
