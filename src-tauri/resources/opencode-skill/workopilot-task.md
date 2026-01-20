# workopilot-task

# Skill para executar tasks do WorkoPilot

## REGRA CRITICA

**VOCE DEVE SALVAR O ARQUIVO JSON APOS CADA ALTERACAO.**

Use a ferramenta `Write` para salvar o arquivo JSON sempre que:
- Criar subtasks
- Atualizar status de subtask
- Modificar qualquer campo
- Finalizar estruturacao
- Finalizar execucao
- Finalizar revisao

O caminho do arquivo JSON esta no prompt inicial (ex: `.workopilot/tasks/{id}.json`).

---

## Contexto

Voce foi iniciado pelo WorkoPilot para trabalhar em uma task especifica.
O arquivo JSON da task contem todas as informacoes necessarias.

## Fluxo Inicial OBRIGATORIO

1. **Ler o arquivo JSON** usando a ferramenta `Read` no path fornecido
2. Identificar o modo baseado no prompt e estado do JSON
3. Executar o modo correspondente
4. **SALVAR o arquivo JSON** usando a ferramenta `Write` com as alteracoes

---

## Deteccao de Modo

| Condicao | Modo |
|----------|------|
| Prompt menciona "estruturar" OU `ai_metadata.structuring_complete === false` | **Estruturacao** |
| Prompt menciona "subtask" + ID de subtask | **Execucao** |
| Prompt contem "REVISAR" | **Revisao** |

---

## Modo 1: Estruturacao

Ativado quando `ai_metadata.structuring_complete === false` ou prompt pede estruturacao.

### Fluxo

1. **Ler o JSON** com `Read`
2. Avaliar complexidade com o usuario (simples/media/complexa)
3. Coletar descricao, regras de negocio, notas tecnicas, criterios de aceite
4. Criar subtasks se media/complexa
5. **SALVAR o JSON** com `Write` incluindo:
   - `initialized: true`
   - `status: "in_progress"`
   - `complexity: "[valor]"`
   - `context` atualizado
   - `subtasks` criadas
   - `ai_metadata.structuring_complete: true`
   - `ai_metadata.last_interaction: "[agora ISO]"`
   - `timestamps.started_at: "[agora ISO]"`

### Exemplo de subtask

```json
{
  "id": "sub-001",
  "title": "Implementar componente X",
  "status": "pending",
  "order": 0,
  "description": "Criar componente com...",
  "acceptance_criteria": ["Deve fazer X", "Deve fazer Y"],
  "technical_notes": "Usar pattern Z",
  "prompt_context": null,
  "created_at": "2026-01-20T12:00:00Z",
  "completed_at": null
}
```

### Finalizacao

Apos salvar, dizer:
- Se simples: "Estruturacao completa! Volte ao WorkoPilot e clique 'Codar' para executar."
- Se media/complexa: "Estruturacao completa! Volte ao WorkoPilot e clique 'Codar' em uma subtask especifica."

---

## Modo 2: Execucao

Ativado quando o prompt contem um ID de subtask.

### Fluxo

1. **Ler o JSON** com `Read`
2. Encontrar a subtask pelo ID
3. Usar contexto da subtask + task pai para implementar
4. Executar a implementacao
5. **SALVAR o JSON** com `Write` atualizando:
   - `subtasks[i].status: "done"`
   - `subtasks[i].completed_at: "[agora ISO]"`
   - `ai_metadata.last_interaction: "[agora ISO]"`
   - Se TODAS subtasks done: `status: "awaiting_review"`

### Contexto para execucao

Da subtask:
- `title`, `description`, `acceptance_criteria`, `technical_notes`, `prompt_context`

Da task pai:
- `context.business_rules`, `context.technical_notes`

### Finalizacao

Apos salvar, dizer:
"Subtask concluida! Volte ao WorkoPilot para continuar com a proxima subtask ou revisar."

---

## Modo 3: Revisao

Ativado quando o prompt contem "REVISAR".

### Fluxo

1. **Ler o JSON** com `Read`
2. Verificar se todas subtasks estao "done"
3. Revisar criterios de aceite
4. Rodar verificacoes (`npm run check` ou `cargo build`)
5. Apresentar resumo
6. Se usuario confirmar, **SALVAR o JSON** com `Write`:
   - `status: "done"`
   - `timestamps.completed_at: "[agora ISO]"`
   - `ai_metadata.last_interaction: "[agora ISO]"`

---

## CHECKLIST DE SALVAMENTO

Antes de encerrar qualquer modo, verifique:

- [ ] Li o arquivo JSON atual?
- [ ] Fiz as alteracoes necessarias no objeto JSON?
- [ ] Usei `Write` para salvar o arquivo com o JSON completo atualizado?
- [ ] O arquivo foi salvo com sucesso?

**SE NAO SALVOU, O WORKOPILOT NAO VERA AS ALTERACOES!**

---

## Schema JSON v2

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
