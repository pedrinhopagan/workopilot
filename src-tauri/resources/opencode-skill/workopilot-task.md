# workopilot-task

# Use quando iniciado via WorkoPilot para executar uma task

## Contexto

Voce foi iniciado pelo WorkoPilot para trabalhar em uma task especifica.
O arquivo JSON da task contem todas as informacoes necessarias.

## Fluxo Inicial

1. Ler o JSON da task no path fornecido
2. Verificar o modo baseado no prompt e estado da task:
   - Prompt menciona "estruturar" ou `ai_metadata.structuring_complete: false` -> Modo Estruturacao
   - Prompt menciona "subtask" com ID -> Modo Execucao (Subtask)
   - Prompt menciona "REVISAR" -> Modo Revisao
   - Task estruturada sem subtask especifica -> Modo Execucao (Task)

---

## Modo Estruturacao

Quando `ai_metadata.structuring_complete` e `false` ou prompt pede estruturacao.

### 1. Complexidade

Analise o titulo e pergunte:
"Essa task parece [simples/media/complexa] com base no titulo. Concorda?"

- **Simples**: Execucao direta, sem subtasks necessarias
- **Media**: 2-4 subtasks podem ajudar
- **Complexa**: Quebrar em subtasks detalhadas e essencial

### 2. Descricao

"Descreva brevemente o objetivo dessa task (ou 'pular' se o titulo e suficiente):"

### 3. Regras de Negocio

"Existe alguma regra de negocio que afeta essa task? (ou 'nenhuma')"

- Se houver, perguntar uma de cada vez ate o usuario dizer "pronto"

### 4. Notas Tecnicas (se media/complexa)

"Alguma nota tecnica importante? Stack, libs, padroes a seguir? (ou 'pular')"

### 5. Criterios de Aceite (se media/complexa)

"Quais sao os criterios de aceite? Como saberemos que esta pronto? (ou 'pular')"

### 6. Subtasks (se media/complexa)

Sugira subtasks baseado no contexto coletado:
"Baseado no que discutimos, sugiro as seguintes subtasks:

1. [sugestao 1]
2. [sugestao 2]
...

Ajustar, adicionar ou remover alguma?"

Para cada subtask, preencher:
- `title`: nome claro da subtask
- `order`: posicao na lista (0, 1, 2...)
- `description`: opcional, descricao detalhada
- `acceptance_criteria`: opcional, lista de criterios
- `technical_notes`: opcional, notas tecnicas especificas

### 7. Finalizacao

- Atualizar o arquivo JSON com todos os dados coletados
- Setar `initialized: true`
- Setar `complexity` com o valor acordado
- Setar `ai_metadata.structuring_complete: true`
- Setar `timestamps.started_at` com a data atual
- Setar `status: "in_progress"`

Mensagem final:
- Se simples -> "Estruturacao completa! Comecando execucao..."
- Se media/complexa -> "Estruturacao completa! Volte ao WorkoPilot e clique 'Codar' em uma subtask especifica."

---

## Modo Execucao (Task Simples)

Se a task e simples ou o usuario quer executar diretamente:

1. Ler todas as informacoes do JSON
2. Executar a task conforme descrito
3. Ao finalizar:
   - Atualizar `status: "done"`
   - Atualizar `timestamps.completed_at`
   - Incrementar `ai_metadata.tokens_used` (estimativa)
   - Adicionar session_id ao `ai_metadata.session_ids`

---

## Modo Execucao (Subtask)

Quando executando uma subtask especifica (prompt contem ID da subtask):

1. Ler o JSON e encontrar a subtask pelo ID
2. Usar como contexto:
   - `subtask.title`, `subtask.description`, `subtask.acceptance_criteria`
   - `subtask.technical_notes` e `subtask.prompt_context`
   - `context.business_rules` da task pai
   - `context.technical_notes` da task pai
3. Executar focado apenas nessa subtask
4. Ao finalizar:
   - Atualizar `subtask.status: "done"`
   - Atualizar `subtask.completed_at`
   - Incrementar `ai_metadata.tokens_used`
   - Adicionar session_id ao `ai_metadata.session_ids`
   - Se todas subtasks estao "done", atualizar `task.status: "awaiting_review"`

---

## Modo Revisao

Quando prompt menciona "REVISAR" ou task esta em `status: "awaiting_review"`:

1. Ler o JSON completo da task
2. Verificar todas as subtasks:
   - Listar o que foi implementado em cada subtask
   - Verificar se criterios de aceite foram atendidos
3. Rodar verificacoes:
   - `npm run check` ou `cargo build` conforme o projeto
   - Verificar se ha erros de lint/tipo
4. Apresentar resumo:
   - "Todas as subtasks foram completadas. Verificacoes: [resultado]"
   - "Criterios atendidos: [lista]"
   - "Pendencias: [se houver]"
5. Perguntar: "Marcar task como concluida? (sim/nao)"
6. Se sim:
   - Atualizar `status: "done"`
   - Atualizar `timestamps.completed_at`

---

## Regras Importantes

- **SEMPRE** editar o arquivo JSON apos qualquer mudanca
- **NUNCA** inventar dados - perguntar ao usuario quando necessario
- **MANTER** respostas concisas e focadas
- **VERIFICAR** se a subtask/task foi realmente completada antes de marcar como done
- **LEMBRAR** que logs serao gerados automaticamente baseados nas mudancas do JSON

---

## Schema do JSON v2 (referencia)

```json
{
  "schema_version": 2,
  "initialized": false,
  "id": "uuid",
  "title": "string",
  "status": "pending|in_progress|awaiting_review|done",
  "priority": 1|2|3,
  "category": "feature|bug|refactor|test|docs",
  "complexity": null|"simple"|"medium"|"complex",
  "context": {
    "description": "string|null",
    "business_rules": ["string"],
    "technical_notes": "string|null",
    "acceptance_criteria": ["string"]|null
  },
  "subtasks": [{
    "id": "uuid",
    "title": "string",
    "status": "pending|in_progress|done",
    "order": 0,
    "description": "string|null",
    "acceptance_criteria": ["string"]|null,
    "technical_notes": "string|null",
    "prompt_context": "string|null",
    "created_at": "iso-date",
    "completed_at": "iso-date|null"
  }],
  "ai_metadata": {
    "last_interaction": "iso-date|null",
    "session_ids": ["string"],
    "tokens_used": 0,
    "structuring_complete": false
  },
  "timestamps": {
    "created_at": "iso-date",
    "started_at": "iso-date|null",
    "completed_at": "iso-date|null"
  }
}
```
