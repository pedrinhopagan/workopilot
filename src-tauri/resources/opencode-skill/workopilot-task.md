# workopilot-task

# Skill para executar tasks do WorkoPilot

## Contexto

Voce foi iniciado pelo WorkoPilot para trabalhar em uma task especifica.
O arquivo JSON da task contem todas as informacoes necessarias.

## Deteccao de Modo

Ao receber o prompt, identifique o modo baseado nas seguintes regras:

| Condicao | Modo |
|----------|------|
| Prompt menciona "estruturar" OU `ai_metadata.structuring_complete === false` | **Estruturacao** |
| Prompt menciona "subtask" + ID de subtask | **Execucao** |
| Prompt contem "REVISAR" | **Revisao** |

**IMPORTANTE**: Sempre ler o JSON primeiro para verificar o estado atual.

---

## Modo 1: Estruturacao

Ativado quando `ai_metadata.structuring_complete === false` ou prompt pede estruturacao.

**Objetivo**: Guiar o usuario na quebra da task em subtasks detalhadas.

### Fluxo

#### 1. Avaliar Complexidade

Analise o titulo e contexto inicial:

"Essa task parece [simples/media/complexa]. Concorda?"

- **Simples**: Pode ser executada diretamente, sem subtasks
- **Media**: 2-4 subtasks ajudam a organizar
- **Complexa**: Essencial quebrar em subtasks detalhadas

#### 2. Coletar Descricao

"Descreva brevemente o objetivo dessa task (ou 'pular' se o titulo e suficiente):"

#### 3. Coletar Regras de Negocio

"Existe alguma regra de negocio que afeta essa task? (ou 'nenhuma')"

- Perguntar uma de cada vez ate o usuario dizer "pronto"

#### 4. Coletar Notas Tecnicas (se media/complexa)

"Alguma nota tecnica importante? Stack, libs, padroes a seguir? (ou 'pular')"

#### 5. Definir Criterios de Aceite (se media/complexa)

"Quais sao os criterios de aceite? Como saberemos que esta pronto? (ou 'pular')"

#### 6. Criar Subtasks (se media/complexa)

Sugira subtasks baseado no contexto coletado:

"Baseado no que discutimos, sugiro as seguintes subtasks:
1. [sugestao 1]
2. [sugestao 2]
...
Ajustar, adicionar ou remover alguma?"

Para cada subtask, preencher:

```json
{
  "id": "uuid-gerado",
  "title": "nome claro da subtask",
  "status": "pending",
  "order": 0,
  "description": "descricao detalhada (opcional)",
  "acceptance_criteria": ["criterio 1", "criterio 2"],
  "technical_notes": "notas tecnicas especificas (opcional)",
  "prompt_context": null,
  "created_at": "iso-date-atual",
  "completed_at": null
}
```

#### 7. Finalizar Estruturacao

Atualizar o JSON:

```json
{
  "initialized": true,
  "status": "in_progress",
  "complexity": "[valor acordado]",
  "context": {
    "description": "[coletado]",
    "business_rules": ["[coletado]"],
    "technical_notes": "[coletado]",
    "acceptance_criteria": ["[coletado]"]
  },
  "subtasks": ["[criadas]"],
  "ai_metadata": {
    "structuring_complete": true,
    "last_interaction": "[agora]"
  },
  "timestamps": {
    "started_at": "[agora]"
  }
}
```

**Mensagem final**:
- Se simples: "Estruturacao completa! Volte ao WorkoPilot e clique 'Codar' para executar."
- Se media/complexa: "Estruturacao completa! Volte ao WorkoPilot e clique 'Codar' em uma subtask especifica."

---

## Modo 2: Execucao

Ativado quando o prompt contem um ID de subtask para executar.

**Objetivo**: Executar a subtask especifica usando todo o contexto disponivel.

### Fluxo

#### 1. Localizar Subtask

Ler o JSON e encontrar a subtask pelo ID fornecido no prompt.

#### 2. Montar Contexto

Usar como contexto para execucao:

**Da subtask**:
- `title`: O que fazer
- `description`: Detalhes da implementacao
- `acceptance_criteria`: O que "pronto" significa
- `technical_notes`: Dicas de implementacao
- `prompt_context`: Contexto adicional

**Da task pai**:
- `context.business_rules`: Regras que afetam a implementacao
- `context.technical_notes`: Notas tecnicas gerais

#### 3. Executar

Implementar a subtask com foco total. Nao desviar para outras subtasks.

#### 4. Finalizar Subtask

Ao concluir, atualizar o JSON:

```json
{
  "subtasks": [{
    "id": "[id-da-subtask]",
    "status": "done",
    "completed_at": "[agora]"
  }],
  "ai_metadata": {
    "last_interaction": "[agora]",
    "session_ids": ["[adicionar session atual]"],
    "tokens_used": "[incrementar]"
  }
}
```

**Se todas as subtasks estiverem "done"**:
- Atualizar `task.status: "awaiting_review"`

**Mensagem final**:
"Subtask concluida! Volte ao WorkoPilot para continuar com a proxima subtask ou revisar a task."

---

## Modo 3: Revisao

Ativado quando o prompt contem "REVISAR".

**Objetivo**: Revisar todo o trabalho feito e marcar a task como concluida.

### Fluxo

#### 1. Verificar Status das Subtasks

Listar todas as subtasks e seus status:

```
Subtasks:
- [x] Subtask 1 (done)
- [x] Subtask 2 (done)
- [ ] Subtask 3 (pending) <- PROBLEMA!
```

Se houver subtasks pendentes, avisar o usuario e nao prosseguir.

#### 2. Revisar Trabalho

Para cada subtask concluida:
- Verificar se os criterios de aceite foram atendidos
- Verificar se o codigo esta correto

#### 3. Rodar Verificacoes

Executar checks conforme o projeto:
- `npm run check` ou `cargo build`
- Verificar erros de lint/tipo

#### 4. Apresentar Resumo

```
RESUMO DA REVISAO:

Subtasks completadas: X/Y
Criterios atendidos:
- [x] Criterio 1
- [x] Criterio 2

Verificacoes:
- Build: OK
- Lint: OK

Pendencias: [lista ou "nenhuma"]
```

#### 5. Confirmar Conclusao

"Marcar task como concluida? (sim/nao)"

Se sim, atualizar o JSON:

```json
{
  "status": "done",
  "timestamps": {
    "completed_at": "[agora]"
  },
  "ai_metadata": {
    "last_interaction": "[agora]"
  }
}
```

---

## Regras Importantes

- **SEMPRE** salvar o JSON apos qualquer alteracao
- **NUNCA** inventar dados - perguntar ao usuario quando necessario
- **MANTER** respostas concisas e focadas
- **VERIFICAR** se a subtask foi realmente completada antes de marcar como done
- **FOCAR** apenas na subtask atual durante execucao (nao desviar)

---

## Schema JSON v2 (referencia)

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
