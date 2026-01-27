# Corrigir Checkbox - TaskItem.tsx

## Context

### Original Request
Corrigir o funcionamento do Checkbox nas listas de tarefas. Atualmente ao clicar no checkbox, além de marcar como concluída/não concluída, também navega para tasks/$id. Corrigir para que o clique no checkbox apenas alterne o status da tarefa (concluída/não concluída) sem navegar. Além disso, mudar o visual do componente checkbox para parecer um checkbox de texto: [ ] para não concluída e [x] para concluída.

### Interview Summary
**Key Discussions**:
- Root cause: Checkbox Radix está dentro de `<button onClick={handleClick}>` que navega. Evento bubbles up.
- Solução: Substituir `<Checkbox>` por `<button>` com `stopPropagation` + texto `[ ]` / `[x]`
- Aplicar em todas as 3 variantes + SubtaskRow (4 locais total)
- Remover import do Checkbox após substituição
- Seguir padrão existente do SubtaskItem.tsx (linhas 54-60)
- Usuário confirmou: aplicar em tasks E SubtaskRows
- Usuário confirmou: mesmo estilo visual do SubtaskItem (text-primary/text-muted-foreground)

**Research Findings**:
- TaskItem.tsx: 404 linhas, 3 variantes de rendering + SubtaskRow helper
- SubtaskRow tem bug latente de double-fire: `<button onClick={onToggle}>` + `<Checkbox onCheckedChange={onToggle}>` — substituição corrige isso
- DeleteButton (linha 353) demonstra o padrão `stopPropagation` correto
- Parent `handleKeyDown` intercepta Space/Enter e navega — checkbox buttons precisam `stopPropagation` em `onKeyDown` também

### Metis Review
**Identified Gaps** (addressed):
- **Keyboard event propagation**: Parent button `handleKeyDown` intercepta Space/Enter para navegação. Novos checkbox buttons precisam `onKeyDown` com `stopPropagation` para evitar que pressionar Space/Enter no checkbox navegue.
- **shrink-0 class**: Todos os checkboxes atuais têm `shrink-0`. Replacement buttons devem manter para evitar layout shift.
- **SubtaskRow double-fire bug**: O button wrapper já chama `onToggle()` no click, e o Checkbox interno também tem `onCheckedChange={onToggle}` — replacement com texto puro corrige isso automaticamente.
- **Spinner conditional**: Variantes compact e full têm ternário spinner/checkbox — manter estrutura do ternário intacta.

---

## Work Objectives

### Core Objective
Corrigir o comportamento do checkbox no TaskItem para (1) não disparar navegação ao clicar e (2) usar visual texto `[ ]` / `[x]` em vez do Radix Checkbox.

### Concrete Deliverables
- `src/components/tasks/TaskItem.tsx` editado com 4 substituições de `<Checkbox>` + 1 import removido

### Definition of Done
- [ ] Clicar no checkbox de task na lista NÃO navega — apenas alterna status
- [ ] Clicar fora do checkbox continua navegando normalmente
- [ ] Checkbox exibe `[ ]` / `[x]` com cores corretas
- [ ] Sem erros TypeScript (`npx tsc --noEmit`)

### Must Have
- `stopPropagation` em AMBOS `onClick` E `onKeyDown` nos 3 checkbox buttons das variantes de task
- `shrink-0` em todos os replacement elements
- Padrão visual idêntico ao SubtaskItem.tsx: `{isDone ? "[x]" : "[ ]"}`
- Remoção do import `Checkbox` da linha 2

### Must NOT Have (Guardrails)
- NÃO tocar SubtaskItem.tsx (já usa o padrão correto)
- NÃO refatorar ou extrair componente compartilhado de checkbox
- NÃO alterar lógica do `handleClick` ou `handleKeyDown` do parent button
- NÃO adicionar animações além de `transition-colors`
- NÃO alterar UnscheduledTask.tsx (checkbox da Agenda é diferente propósito)
- NÃO adicionar novos imports (é uma remoção-only de import)
- NÃO adicionar aria-labels extras (manter consistência com SubtaskItem)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (projeto tem Bun)
- **User wants tests**: NO (task simples, verificação manual)
- **Framework**: N/A
- **QA approach**: Manual verification + TypeScript check

---

## Task Flow

```
Task 1 (Replace all 4 Checkbox instances + remove import)
  → Task 2 (Verify TypeScript + visual)
```

---

## TODOs

- [ ] 1. Substituir todos os 4 `<Checkbox>` por botões texto `[ ]` / `[x]` + remover import

  **What to do**:

  **1a. Remover import do Checkbox (linha 2)**:
  Remover a linha: `import { Checkbox } from "@/components/ui/checkbox";`

  **1b. Done variant (linhas 122-126)** — Substituir:
  ```tsx
  // DE:
  <Checkbox
    checked={isDone}
    onCheckedChange={onToggle}
    className="text-primary shrink-0"
  />

  // PARA:
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
      }
    }}
    className="text-primary shrink-0 transition-colors"
  >
    {isDone ? "[x]" : "[ ]"}
  </button>
  ```

  **1c. Compact variant (linhas 171-175)** — Substituir (dentro do ternário, manter Loader2 no branch spinner):
  ```tsx
  // DE:
  <Checkbox
    checked={isDone}
    onCheckedChange={onToggle}
    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
  />

  // PARA:
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
      }
    }}
    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
  >
    {isDone ? "[x]" : "[ ]"}
  </button>
  ```

  **1d. Full variant (linhas 224-228)** — Mesmo padrão do compact (mesmo className):
  ```tsx
  // DE:
  <Checkbox
    checked={isDone}
    onCheckedChange={onToggle}
    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
  />

  // PARA:
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.stopPropagation();
      }
    }}
    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
  >
    {isDone ? "[x]" : "[ ]"}
  </button>
  ```

  **1e. SubtaskRow (linhas 390-397)** — Substituir Checkbox por texto. O wrapper `<button>` já tem `stopPropagation`, então aqui basta trocar o visual:
  ```tsx
  // DE:
  <Checkbox
    checked={isDone}
    onCheckedChange={onToggle}
    className={cn(
      "text-xs transition-colors",
      isDone ? "text-primary" : "text-muted-foreground hover:text-primary",
    )}
  />

  // PARA:
  <span
    className={cn(
      "text-xs transition-colors",
      isDone ? "text-primary" : "text-muted-foreground",
    )}
  >
    {isDone ? "[x]" : "[ ]"}
  </span>
  ```
  Nota: Na SubtaskRow, usamos `<span>` ao invés de `<button>` porque o wrapper `<button>` já cuida do click e stopPropagation. O `<Checkbox>` interno tinha `onCheckedChange={onToggle}` que causava double-fire — a substituição por `<span>` corrige esse bug latente.

  **Must NOT do**:
  - NÃO alterar nenhum outro código no arquivo além das 4 substituições + 1 remoção de import
  - NÃO alterar a estrutura dos ternários spinner/checkbox
  - NÃO alterar o `handleClick` ou `handleKeyDown` do parent button
  - NÃO adicionar novos imports
  - NÃO refatorar para componente compartilhado

  **Parallelizable**: NO (único TODO)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `src/components/tasks/SubtaskItem.tsx:54-60` — Padrão de referência para texto `[x]`/`[ ]`. Usa botão com onClick e classes `text-primary` / `text-muted-foreground hover:text-primary`. Seguir exatamente este visual.
  - `src/components/tasks/TaskItem.tsx:349-367` (DeleteButton) — Padrão de `e.stopPropagation()` no onClick. Demonstra como impedir propagação para o parent button.
  - `src/components/tasks/TaskItem.tsx:375-403` (SubtaskRow) — Padrão de `e.stopPropagation()` no wrapper button. O Checkbox interno será substituído por `<span>`.
  - `src/components/tasks/TaskItem.tsx:87-102` (handleKeyDown/handleClick) — Funções do parent button que interceptam Space/Enter para navegação. É POR ISSO que os novos checkbox buttons precisam `stopPropagation` em `onKeyDown` também.

  **API/Type References**:
  - `src/components/tasks/TaskItem.tsx:25-39` (TaskItemProps) — `onToggle: () => void` é o callback de toggle de status. `isDone?: boolean` indica estado. `disableNavigation?: boolean` controla se handleClick navega.

  **Acceptance Criteria**:

  **Manual Execution Verification:**

  **TypeScript check:**
  - [ ] `npx tsc --noEmit` → sem erros no arquivo modificado

  **Visual verification via Playwright:**
  - [ ] Navegar para `http://localhost:1420/tasks`
  - [ ] Verificar que task list mostra `[ ]` ao lado de cada task pendente
  - [ ] Verificar que tasks concluídas mostram `[x]`
  - [ ] Clicar no `[ ]` de uma task → status alterna para done, mostra `[x]`, NÃO navega
  - [ ] Clicar no `[x]` de uma task done → status volta para pending, mostra `[ ]`, NÃO navega
  - [ ] Clicar no título da task → navega para `/tasks/$taskId` normalmente
  - [ ] Se subtasks visíveis: verificar que SubtaskRow mostra `[ ]` / `[x]` e funciona sem double-toggle

  **Commit**: YES
  - Message: `fix(tasks): corrigir checkbox - impedir navegacao ao clicar e mudar visual para [ ]/[x]`
  - Files: `src/components/tasks/TaskItem.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(tasks): corrigir checkbox - impedir navegacao ao clicar e mudar visual para [ ]/[x]` | `src/components/tasks/TaskItem.tsx` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: no errors
```

### Final Checklist
- [ ] Checkbox de task na lista NÃO navega ao clicar — apenas toggle de status
- [ ] Clique no título/badges da task continua navegando normalmente
- [ ] Visual `[ ]` / `[x]` em todas as variantes (done, compact, full)
- [ ] Visual `[ ]` / `[x]` no SubtaskRow
- [ ] Cores corretas: `text-primary` (checked), `text-muted-foreground` (unchecked)
- [ ] Import `Checkbox` removido sem erros
- [ ] Keyboard: Space/Enter no checkbox faz toggle, não navega
- [ ] Bug de double-fire no SubtaskRow corrigido (era `<Checkbox onCheckedChange>` + `<button onClick>`)
- [ ] Zero erros TypeScript
