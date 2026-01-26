---
name: workopilot-commit
description: Commitar as mudancas de uma task do WorkoPilot usando git-master, gerando mensagem de commit baseada na task e marcando como done.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o prompt mencionar "commit" ou "commitar" a task
- Quando a task foi revisada e aprovada (ready-to-commit)
- Quando o usuario quer finalizar a task commitando as mudancas

## What I do
- Leio a task via CLI para obter contexto (titulo, subtasks, descricao)
- Analiso as mudancas pendentes no git (staged e unstaged)
- Uso a skill git-master para fazer um commit organizado
- Mensagem de commit no formato: `feat(workopilot): {task.title} [task-id]`
- Apos commit bem-sucedido, marco a task como done via CLI
- Informo o resultado ao usuario

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

Use os comandos da CLI WorkoPilot para ler e atualizar dados:

```bash
# Ler task completa (inclui subtasks)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}

# Marcar task como done apos commit
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status done
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## REGRA CRITICA: USAR GIT-MASTER

**VOCE DEVE CARREGAR A SKILL git-master ANTES DE FAZER QUALQUER OPERACAO GIT.**

A skill git-master contem as regras e boas praticas para operacoes git.
Carregue-a com: `use_skill("git-master")` ou `load_skills: ["git-master"]`

---

## Contexto

Voce foi iniciado pelo WorkoPilot para COMMITAR as mudancas de uma task.
A task ja foi implementada e revisada. Seu objetivo e fazer o commit final e marcar como done.

---

## Fluxo de Execucao

### 1. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
O JSON retornado inclui titulo, subtasks e metadados.

### 2. Carregar a skill git-master
Carregue a skill git-master para obter as regras de commit:
```
use_skill("git-master")
```

### 3. Analisar mudancas pendentes
Verifique o estado do repositorio:
```bash
git status
git diff --stat
git diff --cached --stat
```

### 4. Selecionar arquivos para commit
**IMPORTANTE**: NAO use `git add .` cegamente!

- Analise quais arquivos foram modificados pela task
- Adicione APENAS os arquivos relevantes a task
- Exclua arquivos nao relacionados (ex: configuracoes pessoais, arquivos temporarios)
- Se houver duvida, pergunte ao usuario

```bash
git add <arquivo1> <arquivo2> ...
```

### 5. Gerar mensagem de commit
A mensagem deve seguir o formato:

```
feat(workopilot): {titulo da task} [{task-id}]

Subtasks implementadas:
- {subtask 1 titulo}
- {subtask 2 titulo}
- ...
```

**Regras da mensagem:**
- Primeira linha: `feat(workopilot): {titulo}` (max 72 chars se possivel)
- Se o titulo for muito longo, resuma mantendo a essencia
- Corpo: lista das subtasks implementadas
- Rodape: ID da task para rastreabilidade
- Use a skill git-master para validar o formato

### 6. Fazer o commit
```bash
git commit -m "feat(workopilot): {titulo} [{task-id}]

Subtasks implementadas:
- {subtask 1}
- {subtask 2}
..."
```

### 7. Marcar task como done
Apos commit bem-sucedido:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status done
```

### 8. Informar resultado
Apresente ao usuario:
- Hash do commit
- Arquivos commitados
- Mensagem de commit usada
- Confirmacao de que a task foi marcada como done

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --status done` | Marca task como concluida |
| `update-task {id} --status pending` | Marca que IA terminou (usuario pode agir) |

---

## Tratamento de Erros

### Se nao houver mudancas para commitar
> "Nao encontrei mudancas pendentes para commitar.
> Verifique se as alteracoes ja foram commitadas anteriormente."

### Se o commit falhar
- Verifique se ha conflitos
- Verifique se ha hooks de pre-commit que falharam
- Informe o erro ao usuario e sugira correcoes
- NAO marque a task como done se o commit falhar

### Se a task nao existir
> "Task nao encontrada. Verifique o ID e tente novamente."

---

## Finalizacao

Apos commit e atualizacao via CLI com sucesso, diga:

> "Commit realizado com sucesso!
>
> **Detalhes:**
> - **Commit**: `{hash}` 
> - **Mensagem**: feat(workopilot): {titulo}
> - **Arquivos**: {N} arquivos commitados
> - **Task**: Marcada como done
>
> A task '{titulo}' foi finalizada!"

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Li a task via CLI (`get-task`)?
- [ ] Carreguei a skill git-master?
- [ ] Analisei as mudancas pendentes (git status/diff)?
- [ ] Adicionei APENAS arquivos relevantes (nao usei git add .)?
- [ ] Mensagem de commit segue o formato feat(workopilot)?
- [ ] Commit foi bem-sucedido?
- [ ] Marquei a task como done via CLI?
- [ ] Informei o resultado ao usuario?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
