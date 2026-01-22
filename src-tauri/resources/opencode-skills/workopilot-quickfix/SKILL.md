---
name: workopilot-quickfix
description: Aplicar um ajuste rapido em uma task do WorkoPilot, fazendo modificacoes minimas e pontuais conforme solicitado pelo usuario.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: workopilot
---

## When to use me
- Quando o usuario quer fazer um ajuste rapido na task
- Quando executado via input de quick-fix da interface
- Quando a modificacao e pequena e pontual

## What I do
- Leio a task atual via CLI
- Aplico o ajuste solicitado pelo usuario
- Preservo a estrutura existente da task
- Atualizo via CLI (update-task, update-subtask)
- Faco modificacoes MINIMAS - apenas o necessario

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

Use os comandos da CLI WorkoPilot para ler e atualizar dados:

```bash
# Ler task completa (inclui subtasks)
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}

# Atualizar task
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --title "novo titulo"
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status pending

# Atualizar subtask
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --title "novo titulo"
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-subtask {subtaskId} --description "nova descricao"
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## Contexto

Voce foi iniciado pelo WorkoPilot para fazer um AJUSTE RAPIDO.
O prompt contem o ID da task e a descricao do ajuste desejado.
Faca APENAS o que foi solicitado - nada mais, nada menos.

---

## Fluxo de Execucao

### 1. Extrair informacoes do prompt
- ID da task
- Descricao do ajuste solicitado

### 2. Ler a task via CLI
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```
O JSON retornado inclui todas as subtasks e metadados.

### 3. Entender o ajuste solicitado
Analise o que o usuario pediu:
- E uma mudanca de titulo?
- E uma mudanca de descricao?
- E uma mudanca de status?
- E uma correcao em subtask?
- E uma modificacao no codigo?

### 4. Aplicar ajuste MINIMO
Execute APENAS a modificacao solicitada.
- Se for mudanca de dados: use a CLI
- Se for mudanca de codigo: edite apenas o necessario
- NAO faca refatoracoes adicionais
- NAO melhore coisas nao solicitadas

### 5. Confirmar ao usuario
Informe o que foi alterado de forma concisa.

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --title {title}` | Atualiza titulo da task |
| `update-task {id} --status {status}` | Atualiza status (pending, active, completed) |
| `update-task {id} --description {desc}` | Atualiza descricao |
| `update-subtask {id} --title {title}` | Atualiza titulo da subtask |
| `update-subtask {id} --status {status}` | Atualiza status da subtask |
| `update-subtask {id} --description {desc}` | Atualiza descricao da subtask |

---

## Exemplos de Quick-fix

### Exemplo 1: Mudar titulo
Prompt: "Mude o titulo para 'Novo titulo da task'"
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --title "Novo titulo da task"
```

### Exemplo 2: Corrigir um typo no codigo
Prompt: "Corrija o typo 'recieve' para 'receive' no arquivo X"
- Abra o arquivo
- Faca a correcao pontual
- NAO refatore mais nada

### Exemplo 3: Adicionar uma subtask
Prompt: "Adicione uma subtask para fazer X"
- Use a CLI para adicionar (se disponivel)
- Ou informe que precisa ser feito via interface

---

## Finalizacao

Apos aplicar o ajuste, diga de forma concisa:

> "Pronto! Ajuste aplicado:
> - [descricao do que foi alterado]
> 
> Mais alguma coisa?"

---

## Principios do Quick-fix

1. **Minimalismo**: Faca APENAS o solicitado
2. **Velocidade**: Seja rapido e direto
3. **Preservacao**: Nao mexa no que nao foi pedido
4. **Confirmacao**: Sempre informe o que foi feito

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Li a task via CLI (`get-task`)?
- [ ] Entendi exatamente o que foi solicitado?
- [ ] Fiz APENAS a modificacao pedida?
- [ ] Atualizei via CLI (se aplicavel)?
- [ ] Informei ao usuario o que foi alterado?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
