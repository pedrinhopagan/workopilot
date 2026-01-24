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
- Dialogo com o usuario para coletar informacoes detalhadas da task
- Preencho TODOS os campos: main_prompt, description, business_rules[], technical_notes[], acceptance_criteria[]
- Busco automaticamente informacoes tecnicas do projeto (AGENTS.md, README.md)
- Considero imagens anexadas a task
- Avalio complexidade e crio subtasks estruturadas
- Atualizo o banco de dados via CLI

---

## REGRA CRITICA

**VOCE DEVE USAR A CLI PARA TODAS AS OPERACOES.**

```bash
# Diretorio base da CLI
CLI_DIR="/home/pedro/Documents/projects/workopilot/packages/cli"

# Ler task completa
cd $CLI_DIR && bun run src/index.ts get-task {taskId}

# Atualizar campos da task
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --main-prompt "prompt original do usuario"
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --description "descricao elaborada"
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --business-rules '["regra 1", "regra 2"]'
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --technical-notes "notas tecnicas"
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --acceptance-criteria '["criterio 1", "criterio 2"]'
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --complexity medium
cd $CLI_DIR && bun run src/index.ts update-task {taskId} --structuring-complete true

# Criar subtasks
cd $CLI_DIR && bun run src/index.ts create-subtask {taskId} --title "Titulo" --description "Descricao" --order 0 --acceptance-criteria '["criterio"]' --technical-notes "notas"
```

**IMPORTANTE**: A CLI grava diretamente no SQLite. O WorkoPilot detecta mudancas automaticamente.

---

## Fluxo OBRIGATORIO de Estruturacao

### Fase 0: Inicializacao (PRIMEIRO PASSO)

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --status in_progress
```

### Fase 1: Coleta de Contexto

1. **Ler a task via CLI**:
```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts get-task {taskId}
```

**Salve os dados inicias da tarefa como `main_prompt`** - Este é o prompt original do usuario e NAO deve ser modificado pela IA posteriormente.


2. **Identificar o projeto vinculado** e ler documentacao tecnica:
   - Buscar `AGENTS.md` na raiz do projeto para entender stack, estrutura e padroes
   - Buscar `README.md` para contexto adicional
   - Se nao houver projeto vinculado, perguntar ao usuario sobre a stack

3. **Verificar imagens anexadas**:
   - O JSON da task inclui referencia a imagens em `task_images`
   - Se houver imagens, mencione ao usuario e peca contexto sobre elas
   - As imagens podem ser mockups, diagramas, screenshots de erros, etc.

### Fase 2: Dialogo Estruturado com o Usuario

Conduza uma entrevista detalhada seguindo estas etapas:

#### 2.1 Entendimento do Problema
Pergunte ao usuario:
> "Descreva em detalhes o problema que voce quer resolver. Qual e o objetivo final desta task?"

#### 2.2 Exploracao do Codebase
- Verifique as assercoes do usuario explorando o codigo relevante
- Entenda o estado atual da implementacao
- Identifique arquivos e modulos que serao afetados

#### 2.3 Consideracao de Alternativas
Pergunte ao usuario:
> "Voce considerou outras abordagens para resolver isso? Posso sugerir algumas alternativas:
> - [Alternativa 1]
> - [Alternativa 2]
> Qual abordagem voce prefere?"

#### 2.4 Detalhamento da Implementacao
Faca perguntas especificas sobre:
- Comportamento esperado em casos de borda
- Tratamento de erros
- Restricoes de performance
- Compatibilidade com codigo existente

#### 2.5 Definicao de Escopo
Defina explicitamente:
- **O que SERA implementado** (IN SCOPE)
- **O que NAO sera implementado** (OUT OF SCOPE)

Confirme com o usuario: "Este escopo esta correto?"

### Fase 3: Preenchimento dos Campos

#### 3.1 main_prompt (OBRIGATORIO)
O prompt original do usuario, exatamente como foi enviado. Fonte de verdade imutavel.

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --main-prompt "texto exato do usuario"
```

#### 3.2 description (OBRIGATORIO)
Descricao elaborada do que precisa ser feito, incluindo contexto e objetivo.

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --description "Implementar X para resolver Y, permitindo que Z..."
```

#### 3.3 business_rules[] (se aplicavel)
Lista de regras de negocio e restricoes que devem ser respeitadas.

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --business-rules '["Deve funcionar offline", "Limite de 100 itens por pagina", "Compativel com mobile"]'
```

#### 3.4 technical_notes (OBRIGATORIO)
Notas tecnicas baseadas na estrutura do projeto. DEVE incluir informacoes do AGENTS.md:
- Stack utilizada
- Padroes de codigo do projeto
- Estrutura de pastas relevante
- Componentes/bibliotecas a usar
- Convencoes de nomenclatura

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --technical-notes "Stack: React + TypeScript + TanStack Router. Usar shadcn/ui para componentes. Seguir padrao de stores Zustand existente em src/stores/. Arquivos devem seguir convencao kebab-case."
```

#### 3.5 acceptance_criteria[] (OBRIGATORIO)
Lista de criterios de aceite verificaveis. Cada criterio deve ser especifico e testavel.

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --acceptance-criteria '["Usuario pode criar nova task clicando no botao +", "Task aparece na lista imediatamente apos criacao", "Formulario valida campos obrigatorios", "Mensagem de erro exibida se titulo vazio"]'
```

### Fase 4: Avaliacao de Complexidade

Com base nas informacoes coletadas, determine:

| Complexidade | Criterios | Subtasks |
|--------------|-----------|----------|
| `trivial` | Mudanca em 1 arquivo, < 10 linhas | 0 |
| `simple` | 1-2 arquivos, logica direta | 0-1 |
| `moderate` | 3-5 arquivos, alguma complexidade | 2-4 |
| `complex` | 5+ arquivos, multiplas camadas | 4-6 |
| `epic` | Multiplos modulos, refatoracao grande | 6+ |

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --complexity moderate
```

### Fase 5: Criacao de Subtasks (se necessario)

Para tasks `moderate`, `complex` ou `epic`, crie subtasks estruturadas.

Cada subtask DEVE ter:
- `title`: Descricao curta e clara
- `description`: Detalhes da implementacao
- `technical_notes`: Notas especificas para esta subtask
- `acceptance_criteria`: Criterios verificaveis

**Busque oportunidades de criar "modulos profundos"**: funcionalidades encapsuladas que podem ser testadas isoladamente.

```bash
# Subtask 1
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts create-subtask {taskId} \
  --title "Criar componente TaskForm" \
  --description "Implementar formulario de criacao de task com campos titulo, descricao e prioridade" \
  --order 0 \
  --acceptance-criteria '["Formulario renderiza corretamente", "Validacao de campos funciona", "Submit chama API correta"]' \
  --technical-notes "Usar react-hook-form + zod. Componente em src/components/tasks/"

# Subtask 2
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts create-subtask {taskId} \
  --title "Integrar com store" \
  --description "Conectar formulario com TaskStore para persistencia" \
  --order 1 \
  --acceptance-criteria '["Dados salvos no store apos submit", "Lista atualiza automaticamente"]' \
  --technical-notes "Usar hook useTaskStore existente"
```

### Fase 6: Finalizacao

```bash
cd /home/pedro/Documents/projects/workopilot/packages/cli && bun run src/index.ts update-task {taskId} --structuring-complete true --status pending
```

---

## Comandos CLI Disponiveis

| Comando | Descricao |
|---------|-----------|
| `get-task {id}` | Retorna JSON completo da task com subtasks |
| `update-task {id} --status {status}` | Atualiza status (pending, in_progress, done) |
| `update-task {id} --main-prompt {prompt}` | Define prompt original (imutavel) |
| `update-task {id} --title {title}` | Atualiza titulo |
| `update-task {id} --description {desc}` | Atualiza descricao |
| `update-task {id} --complexity {level}` | Atualiza complexidade |
| `update-task {id} --business-rules {json}` | Define regras de negocio (JSON array) |
| `update-task {id} --technical-notes {notes}` | Define notas tecnicas |
| `update-task {id} --acceptance-criteria {json}` | Define criterios de aceite (JSON array) |
| `update-task {id} --structuring-complete true` | Marca estruturacao como completa |
| `create-subtask {taskId} --title {t} [--description {d}] [--order {n}] [--acceptance-criteria {json}] [--technical-notes {notes}]` | Cria nova subtask |

---

## Campos da Task

### Task Pai

| Campo | Obrigatorio | Descricao |
|-------|-------------|-----------|
| `title` | Sim | Titulo resumido da task |
| `main_prompt` | Sim | Prompt original do usuario (fonte de verdade, NAO alterar) |
| `description` | Sim | Descricao elaborada do que fazer |
| `business_rules[]` | Nao | Regras de negocio e restricoes |
| `technical_notes` | Sim | Stack, padroes, estrutura (baseado no AGENTS.md) |
| `acceptance_criteria[]` | Sim | Criterios verificaveis de aceite |
| `complexity` | Sim | trivial, simple, moderate, complex, epic |

### Subtask

| Campo | Obrigatorio | Descricao |
|-------|-------------|-----------|
| `title` | Sim | Titulo da subtask |
| `description` | Sim | O que implementar nesta subtask |
| `technical_notes` | Nao | Notas tecnicas especificas |
| `acceptance_criteria[]` | Sim | Criterios de aceite da subtask |

---

## Exemplo de Task Estruturada

```json
{
  "title": "Adicionar filtro por status na lista de tasks",
  "main_prompt": "quero poder filtrar as tasks por status na tela principal",
  "context": {
    "description": "Implementar sistema de filtros na lista de tasks permitindo filtrar por status (pending, in_progress, done). O filtro deve ser persistente durante a sessao e atualizar a lista em tempo real.",
    "business_rules": [
      "Filtro deve manter selecao ao navegar entre paginas",
      "Deve ser possivel selecionar multiplos status",
      "Contador deve mostrar quantidade por status"
    ],
    "technical_notes": "Frontend em React com TanStack Router. Usar shadcn/ui Select para o filtro. Estado no Zustand store (src/stores/taskStore.ts). API ja suporta filtro por status via query param.",
    "acceptance_criteria": [
      "Dropdown de filtro visivel na lista de tasks",
      "Selecionar status filtra a lista imediatamente",
      "Contador mostra quantidade de tasks por status",
      "Filtro persiste ao voltar para a pagina"
    ]
  },
  "complexity": "moderate",
  "subtasks": [
    {
      "title": "Criar componente StatusFilter",
      "description": "Componente dropdown com opcoes de status e contador",
      "technical_notes": "Usar shadcn/ui Select. Integrar com useTaskStore.",
      "acceptance_criteria": ["Renderiza opcoes de status", "Mostra contador por status"]
    },
    {
      "title": "Adicionar estado de filtro no store",
      "description": "Novo estado selectedStatuses no taskStore com persistencia",
      "technical_notes": "Adicionar em src/stores/taskStore.ts",
      "acceptance_criteria": ["Estado persiste entre navegacoes", "Resetavel via botao"]
    },
    {
      "title": "Integrar filtro com lista",
      "description": "Conectar StatusFilter com TaskList para filtrar resultados",
      "technical_notes": "Usar query params do TanStack Router para sincronizar URL",
      "acceptance_criteria": ["Lista filtra em tempo real", "URL reflete filtros ativos"]
    }
  ]
}
```

---

## Finalizacao

Apos estruturar completamente via CLI, diga:

**Se simples (sem subtasks):**
> "Estruturacao completa! A task esta pronta para execucao.
> 
> **Resumo:**
> - **Objetivo**: [resumo da description]
> - **Complexidade**: {complexity}
> - **Criterios de aceite**: {N} criterios definidos
> 
> Volte ao WorkoPilot para executar."

**Se media/complexa (com subtasks):**
> "Estruturacao completa! Criei {N} subtasks para esta task.
> 
> **Resumo:**
> - **Objetivo**: [resumo da description]
> - **Complexidade**: {complexity}
> - **Subtasks**:
>   1. [titulo subtask 1]
>   2. [titulo subtask 2]
>   ...
> 
> Volte ao WorkoPilot para escolher:
> - **Executar Tudo**: Implementar todas as subtasks sequencialmente
> - **Executar Subtask**: Focar em uma subtask especifica"

---

## Checklist Final

Antes de encerrar, verifique:
- [ ] Marquei task como `--status in_progress` NO INICIO?
- [ ] Li a task via CLI (`get-task`)?
- [ ] Busquei AGENTS.md do projeto para technical_notes?
- [ ] Verifiquei se ha imagens anexadas?
- [ ] Dialoguei com o usuario para coletar informacoes?
- [ ] Setei `--main-prompt` com o texto original do usuario?
- [ ] Setei `--description` com descricao elaborada?
- [ ] Setei `--technical-notes` baseado na estrutura do projeto?
- [ ] Setei `--acceptance-criteria` com criterios verificaveis?
- [ ] Defini `--complexity`?
- [ ] Criei subtasks com todos os campos (se necessario)?
- [ ] Setei `--structuring-complete true`?
- [ ] Setei `--status pending` para sinalizar que IA terminou?

**A CLI GRAVA DIRETAMENTE NO SQLITE - NAO USE ARQUIVOS JSON!**
