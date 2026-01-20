# workopilot-task

# Use quando iniciado via WorkoPilot para executar uma task

## Contexto

Você foi iniciado pelo WorkoPilot para trabalhar em uma task específica.
O arquivo JSON da task contém todas as informações necessárias.

## Fluxo Inicial

1. Ler o JSON da task no path fornecido
2. Verificar flag `initialized`:
   - Se `false` ou campos obrigatórios vazios → Modo Configuração
   - Se `true` e completo → Perguntar: "Executar ou revisar configuração?"

## Modo Configuração

Fazer perguntas sequenciais para configurar a task:

### 1. Complexidade

Analise o título e pergunte:
"Essa task parece [simples/média/complexa] com base no título. Concorda?"

- **Simples**: Execução direta, sem micro-tasks necessárias
- **Média**: 2-4 micro-tasks podem ajudar
- **Complexa**: Quebrar em micro-tasks detalhadas é essencial

### 2. Descrição

"Descreva brevemente o objetivo dessa task (ou 'pular' se o título é suficiente):"

### 3. Regras de Negócio

"Existe alguma regra de negócio que afeta essa task? (ou 'nenhuma')"

- Se houver, perguntar uma de cada vez até o usuário dizer "pronto"

### 4. Notas Técnicas (se média/complexa)

"Alguma nota técnica importante? Stack, libs, padrões a seguir? (ou 'pular')"

### 5. Critérios de Aceite (se média/complexa)

"Quais são os critérios de aceite? Como saberemos que está pronto? (ou 'pular')"

### 6. Micro-tasks (se média/complexa)

Sugira micro-tasks baseado no contexto coletado:
"Baseado no que discutimos, sugiro as seguintes micro-tasks:

1. [sugestão 1]
2. [sugestão 2]
   ...
   Ajustar, adicionar ou remover alguma?"

### 7. Finalização

- Atualizar o arquivo JSON com todos os dados coletados
- Setar `initialized: true`
- Setar `complexity` com o valor acordado
- Setar `timestamps.started_at` com a data atual
- Se simples → "Configuração completa! Começando execução..."
- Se complexa → "Configuração completa! Volte ao WorkoPilot e clique 'Codar' em uma micro-task específica."

## Modo Execução (Task Simples)

Se a task é simples ou o usuário quer executar diretamente:

1. Ler todas as informações do JSON
2. Executar a task conforme descrito
3. Ao finalizar:
   - Atualizar `status: "done"`
   - Atualizar `timestamps.completed_at`
   - Incrementar `ai_metadata.tokens_used` (estimativa)
   - Adicionar session_id ao `ai_metadata.session_ids`

## Modo Execução (Micro-task)

Quando executando uma micro-task específica:

1. O prompt conterá o ID da micro-task
2. Ler o JSON e encontrar a micro-task pelo ID
3. Usar como contexto:
   - `microtask.title` e `microtask.prompt_context`
   - `context.business_rules` da task pai
   - `context.technical_notes` da task pai
4. Executar focado apenas nessa micro-task
5. Ao finalizar:
   - Atualizar `microtask.status: "done"`
   - Atualizar `microtask.completed_at`
   - Incrementar `ai_metadata.tokens_used`
   - Adicionar session_id ao `ai_metadata.session_ids`

## Regras Importantes

- **SEMPRE** editar o arquivo JSON após qualquer mudança
- **NUNCA** inventar dados - perguntar ao usuário quando necessário
- **MANTER** respostas concisas e focadas
- **VERIFICAR** se a task foi realmente completada antes de marcar como done
- **LEMBRAR** que logs serão gerados automaticamente baseados nas mudanças do JSON

## Schema do JSON (referência)

```json
{
  "schema_version": 1,
  "initialized": false,
  "id": "uuid",
  "title": "string",
  "status": "pending|in_progress|done",
  "priority": 1|2|3,
  "category": "feature|bug|refactor|test|docs",
  "complexity": null|"simple"|"medium"|"complex",
  "context": {
    "description": "string|null",
    "business_rules": ["string"],
    "technical_notes": "string|null",
    "acceptance_criteria": ["string"]|null
  },
  "microtasks": [{
    "id": "uuid",
    "title": "string",
    "status": "pending|done",
    "prompt_context": "string|null",
    "completed_at": "iso-date|null"
  }],
  "ai_metadata": {
    "last_interaction": "iso-date|null",
    "session_ids": ["string"],
    "tokens_used": 0
  },
  "timestamps": {
    "created_at": "iso-date",
    "started_at": "iso-date|null",
    "completed_at": "iso-date|null"
  }
}
```
