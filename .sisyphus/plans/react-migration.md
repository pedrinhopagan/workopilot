# Migrar Frontend: Svelte 5 para React

## Context

### Original Request
Migrar o frontend de Svelte 5/SvelteKit para React, mantendo funcionalidade e visual exatamente iguais.

### Interview Summary
**Key Discussions**:
- **Estrategia**: Reescrita completa (nao incremental)
- **Stack**: TanStack Router (file-based routing) + Zustand (state management)
- **Verificacao**: QA manual apos cada fase

**Research Findings**:
- Projeto tem 24 componentes Svelte, 5 rotas, 4 stores, 2 services
- Services usam Svelte stores internamente - precisam migracao significativa
- Tailwind CSS v4 permanece inalterado
- Tauri 2.x APIs sao framework-agnostic

### Metis Review
**Identified Gaps** (addressed):
- Services precisam Zustand integration (nao sao "mostly unchanged")
- OpenCode service tem reconnection logic que precisa cleanup React
- Dialog state pode ter multiplos dialogs abertos (contador, nao boolean)
- Tauri event listeners precisam pattern de hook consistente
- Ordem das fases ajustada: services antes de rotas, complexidade crescente

---

## Work Objectives

### Core Objective
Substituir framework UI de Svelte 5 para React mantendo 100% de paridade funcional e visual.

### Concrete Deliverables
- App React funcional com TanStack Router
- Zustand stores equivalentes aos Svelte stores
- Todos os 24 componentes migrados
- Todas as 5 rotas funcionando identicamente
- Integracao Tauri preservada

### Definition of Done
- [x] `bun dev` abre app sem erros
- [x] `bun build` compila sem erros TypeScript
- [x] Todas as rotas renderizam corretamente
- [x] Keyboard shortcuts Alt+1-4 funcionam
- [x] Window hide-on-blur funciona (com excecao de dialog)
- [x] OpenCode connection funciona
- [x] Task CRUD completo funciona
- [x] Subtask CRUD funciona
- [x] Agenda drag-drop funciona
- [x] Zero erros no console

### Must Have
- Paridade visual pixel-perfect (mesmas cores, espacamentos, layouts)
- Paridade funcional completa (todas interacoes funcionando)
- Mesmos timings (150ms hide delay, 5000ms polling)
- Mesmas chamadas invoke() ao backend

### Must NOT Have (Guardrails)
- **NO color changes**: Todas cores hex preservadas exatamente
- **NO spacing changes**: Classes Tailwind identicas
- **NO new features**: Sem loading skeletons, error boundaries, UX improvements
- **NO behavior changes**: Timings e logica identicos
- **NO new abstractions**: Sem utility functions que nao existem no Svelte
- **NO premature optimization**: Sem React.memo/useMemo/useCallback desnecessarios
- **NO additional dependencies**: Apenas react, tanstack-router, zustand
- **NO tests**: QA manual conforme decidido
- **NO component splitting**: Manter estrutura, apenas extrair hooks se necessario

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual-only
- **Framework**: none

### Manual QA Protocol

**Por Fase:**
Apos cada fase, verificar manualmente que o app funciona antes de prosseguir.

**Evidence Required:**
- Console limpo (sem erros/warnings)
- Funcionalidades testadas manualmente
- Comparacao visual com versao Svelte

---

## Task Flow

```
Phase 1 (Infra) 
    |
Phase 2 (Stores/Services)
    |
Phase 3 (Shared Components)
    |
Phase 4 (Simple Routes: settings, logs)
    |
Phase 5 (Medium Routes: projects, agenda)
    |
Phase 6 (Complex Routes: tasks)
    |
Phase 7 (Cleanup)
```

## Parallelization

| Group | Tasks        | Reason                                   |
| ----- | ------------ | ---------------------------------------- |
| A     | 4, 5         | Stores independentes                     |
| B     | 8, 9, 10, 11 | Componentes compartilhados independentes |
| C     | 12, 13       | Rotas simples independentes              |
| D     | 14, 15       | Rotas medias independentes               |

| Task  | Depends On | Reason                          |
| ----- | ---------- | ------------------------------- |
| 3     | 1, 2       | Entry point precisa de config   |
| 6     | 4, 5       | Service precisa de stores       |
| 7     | 6          | Root layout precisa de services |
| 8-11  | 7          | Componentes precisam de root    |
| 12-17 | 8-11       | Rotas precisam de componentes   |
| 18    | 12-17      | Cleanup apos todas rotas        |

---

## TODOs

### Phase 1: Infrastructure

- [x] 1. Atualizar package.json

  **What to do**:
  - Remover dependencias Svelte: @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, svelte, svelte-check
  - Adicionar dependencias React: react@^19, react-dom@^19, @tanstack/react-router@^1, zustand@^5
  - Adicionar devDependencies: @vitejs/plugin-react@^4, @tanstack/router-plugin@^1, @types/react@^19, @types/react-dom@^19
  - Atualizar scripts: remover svelte-kit sync, manter dev/build/tauri

  **Must NOT do**:
  - Adicionar outras dependencias alem das listadas
  - Mudar versoes do Tailwind ou Tauri

  **Parallelizable**: NO (primeiro passo)

  **References**:
  - `package.json` - estrutura atual de dependencias
  - TanStack Router docs: https://tanstack.com/router/latest/docs/framework/react/quick-start

  **Acceptance Criteria**:
  - [ ] `bun install` executa sem erros
  - [ ] Dependencias Svelte removidas do node_modules
  - [ ] Dependencias React instaladas

  **Commit**: YES
  - Message: `chore: replace svelte dependencies with react stack`
  - Files: `package.json, bun.lockb`

---

- [x] 2. Reconfigurar vite.config.ts

  **What to do**:
  - Remover @sveltejs/vite-plugin-svelte
  - Adicionar @vitejs/plugin-react
  - Adicionar @tanstack/router-plugin/vite (TanStackRouterVite)
  - Manter @tailwindcss/vite
  - Configurar alias "@" para "/src"
  - Manter clearScreen: false, port: 1420, strictPort: true

  **Must NOT do**:
  - Mudar porta do dev server
  - Alterar configuracoes de Tailwind

  **Parallelizable**: YES (com task 1, mas executar apos install)

  **References**:
  - `vite.config.ts` - configuracao atual (se existir) ou `svelte.config.js`
  - TanStack Router Vite plugin: https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing

  **Acceptance Criteria**:
  - [ ] Arquivo vite.config.ts criado/atualizado
  - [ ] Plugins React e TanStack Router configurados
  - [ ] Alias "@" configurado

  **Commit**: NO (agrupa com task 3)

---

- [x] 3. Criar entry point React

  **What to do**:
  - Criar index.html na raiz com div#root
  - Criar src/main.tsx com createRoot e RouterProvider
  - Criar src/routes/__root.tsx com layout base (estrutura do +layout.svelte atual)
  - Criar src/routes/index.tsx com redirect para /projects
  - Criar src/routerConfig.ts com createRouter
  - Deletar src/app.html
  - Atualizar tauri.conf.json: frontendDist de "../build" para "../dist"

  **Must NOT do**:
  - Implementar logica completa do root layout ainda (so estrutura)
  - Adicionar providers extras

  **Parallelizable**: NO (depende de 1, 2)

  **References**:
  - `src/app.html` - template HTML atual
  - `src/routes/+layout.svelte:85-89` - estrutura do container principal
  - `src-tauri/tauri.conf.json` - configuracao do Tauri

  **Acceptance Criteria**:
  - [ ] `bun dev:web` abre pagina React vazia sem erros
  - [ ] Console sem erros
  - [ ] Navegacao para /projects funciona (mesmo que rota vazia)

  **Commit**: YES
  - Message: `feat: setup react entry point with tanstack router`
  - Files: `index.html, src/main.tsx, src/routes/__root.tsx, src/routes/index.tsx, src/routerConfig.ts, src-tauri/tauri.conf.json`
  - Pre-commit: `bun dev:web` (verificar que abre)

---

### Phase 2: Stores & Services

- [x] 4. Migrar stores para Zustand

  **What to do**:
  - Criar src/stores/selectedProject.ts com Zustand (selectedProjectId, projectsList, actions)
  - Criar src/stores/dialogState.ts com Zustand (openDialogCount para suportar multiplos dialogs)
  - Criar src/stores/agenda.ts com Zustand (selectedDate, currentMonth, draggedTask, drawerCollapsed)
  - Criar src/stores/structuringNotification.ts com Zustand
  - Manter mesma shape de dados dos stores Svelte
  - Usar pattern: `create<StoreType>((set, get) => ({ ... }))`

  **Must NOT do**:
  - Mudar shape dos dados
  - Adicionar computed/derived que nao existem
  - Usar immer ou outros middlewares

  **Parallelizable**: YES (stores sao independentes entre si)

  **References**:
  - `src/lib/stores/selectedProject.ts:1-6` - store atual
  - `src/lib/stores/dialogState.ts` - store de dialog
  - `src/lib/stores/agenda.ts:1-17` - store de agenda
  - Zustand docs: https://zustand-demo.pmnd.rs/

  **Acceptance Criteria**:
  - [ ] Todos 4 stores criados
  - [ ] TypeScript compila sem erros
  - [ ] Shape identica aos stores Svelte (exceto dialogState que vira contador)

  **Commit**: YES
  - Message: `feat: migrate svelte stores to zustand`
  - Files: `src/stores/*.ts`

---

- [x] 5. Criar hook useTauriEvent

  **What to do**:
  - Criar src/hooks/useTauriEvent.ts
  - Hook recebe eventName e callback
  - Usa useEffect para listen() e cleanup na unmount
  - Retorna unlisten function para cleanup manual se necessario

  **Must NOT do**:
  - Adicionar logica alem de subscribe/unsubscribe
  - Criar outros hooks ainda

  **Parallelizable**: YES (com task 4)

  **References**:
  - `src/routes/+layout.svelte:37-54` - pattern atual de onFocusChanged
  - Tauri events: https://tauri.app/develop/calling-rust/#event-system

  **Acceptance Criteria**:
  - [ ] Hook criado e tipado
  - [ ] TypeScript compila sem erros

  **Commit**: NO (agrupa com task 6)

---

- [x] 6. Migrar services (opencode, structuringMonitor)

  **What to do**:
  - Migrar src/services/opencode.ts: remover dependencia de Svelte stores, usar callbacks puros
  - Migrar src/services/structuringMonitor.ts: mesmo approach
  - Manter mesma API publica (startPolling, stopPolling, onSessionIdle, onFileChange)
  - Preservar logica de reconnection com exponential backoff
  - Preservar todos timings (5000ms polling, etc)

  **Must NOT do**:
  - Mudar logica de negocio
  - Mudar timings
  - Adicionar error handling que nao existe

  **Parallelizable**: NO (depende de task 4, 5)

  **References**:
  - `src/lib/services/opencode.ts` - service OpenCode atual
  - `src/lib/services/structuringMonitor.ts` - service de monitoring

  **Acceptance Criteria**:
  - [ ] Services migrados
  - [ ] TypeScript compila sem erros
  - [ ] API publica identica

  **Commit**: YES
  - Message: `feat: migrate opencode and structuring services to react`
  - Files: `src/services/*.ts, src/hooks/useTauriEvent.ts`

---

- [x] 7. Implementar root layout completo

  **What to do**:
  - Atualizar src/routes/__root.tsx com toda logica do +layout.svelte
  - Implementar auto-hide on blur usando useTauriEvent
  - Implementar keyboard shortcuts Alt+1-4 com useEffect
  - Integrar StructuringCompleteModal (placeholder por enquanto)
  - Usar useDialogStore para verificar dialog aberto
  - Preservar timing de 150ms no hide delay

  **Must NOT do**:
  - Mudar timing de 150ms
  - Mudar estrutura do container (classes Tailwind)
  - Adicionar error boundaries

  **Parallelizable**: NO (depende de tasks 4, 5, 6)

  **References**:
  - `src/routes/+layout.svelte:1-90` - implementacao completa atual
  - `src/routes/+layout.svelte:65-80` - keyboard shortcuts
  - `src/routes/+layout.svelte:37-54` - focus change handling

  **Acceptance Criteria**:
  - [ ] Root layout renderiza container correto
  - [ ] Alt+1-4 navega entre rotas
  - [ ] Window esconde ao perder foco (se dialog fechado)
  - [ ] `tauri dev` funciona com layout basico

  **Commit**: YES
  - Message: `feat: implement root layout with tauri integration`
  - Files: `src/routes/__root.tsx`
  - Pre-commit: `tauri dev` (verificar que abre e shortcuts funcionam)

---

### Phase 3: Shared Components

- [x] 8. Migrar TabBar.tsx

  **What to do**:
  - Converter src/lib/components/TabBar.svelte para src/components/TabBar.tsx
  - Usar useLocation() do TanStack Router para tab ativa
  - Usar Link do TanStack Router para navegacao
  - Preservar todas classes Tailwind (class -> className)

  **Must NOT do**:
  - Mudar cores ou espacamentos
  - Adicionar animacoes que nao existem

  **Parallelizable**: YES (com tasks 9, 10, 11)

  **References**:
  - `src/lib/components/TabBar.svelte` - componente atual

  **Acceptance Criteria**:
  - [ ] TabBar renderiza identico ao Svelte
  - [ ] Navegacao funciona
  - [ ] Tab ativa destacada corretamente

  **Commit**: NO (agrupa com tasks 9-11)

---

- [x] 9. Migrar Select.tsx

  **What to do**:
  - Converter src/lib/components/Select.svelte para src/components/Select.tsx
  - Props: value, onChange, options, placeholder
  - Controlled component pattern

  **Must NOT do**:
  - Mudar estilo visual
  - Adicionar features (search, multi-select)

  **Parallelizable**: YES (com tasks 8, 10, 11)

  **References**:
  - `src/lib/components/Select.svelte` - componente atual

  **Acceptance Criteria**:
  - [ ] Select renderiza identico
  - [ ] Selecao funciona
  - [ ] Dropdown abre/fecha corretamente

  **Commit**: NO (agrupa com tasks 8, 10, 11)

---

- [x] 10. Migrar ConfirmDialog.tsx

  **What to do**:
  - Converter src/lib/components/ConfirmDialog.svelte para src/components/ConfirmDialog.tsx
  - Integrar com useDialogStore (incrementar/decrementar contador ao abrir/fechar)
  - Props: isOpen, onConfirm, onCancel, title, message

  **Must NOT do**:
  - Mudar animacoes ou transicoes
  - Mudar z-index ou overlay

  **Parallelizable**: YES (com tasks 8, 9, 11)

  **References**:
  - `src/lib/components/ConfirmDialog.svelte` - componente atual
  - `src/lib/stores/dialogState.ts` - integracao com store

  **Acceptance Criteria**:
  - [ ] Dialog renderiza identico
  - [ ] Abre e fecha corretamente
  - [ ] Window nao esconde enquanto dialog aberto

  **Commit**: NO (agrupa com tasks 8, 9, 11)

---

- [x] 11. Migrar StructuringCompleteModal.tsx

  **What to do**:
  - Converter src/lib/components/StructuringCompleteModal.svelte para src/components/StructuringCompleteModal.tsx
  - Integrar com useStructuringNotificationStore
  - Integrar com useDialogStore

  **Must NOT do**:
  - Mudar visual ou comportamento

  **Parallelizable**: YES (com tasks 8, 9, 10)

  **References**:
  - `src/lib/components/StructuringCompleteModal.svelte` - componente atual
  - `src/lib/stores/structuringNotification.ts` - store relacionado

  **Acceptance Criteria**:
  - [ ] Modal renderiza identico
  - [ ] Aparece quando structuring completa
  - [ ] Fecha corretamente

  **Commit**: YES
  - Message: `feat: migrate shared components (TabBar, Select, ConfirmDialog, Modal)`
  - Files: `src/components/TabBar.tsx, src/components/Select.tsx, src/components/ConfirmDialog.tsx, src/components/StructuringCompleteModal.tsx`

---

### Phase 4: Simple Routes

- [x] 12. Migrar rota /settings

  **What to do**:
  - Converter src/routes/settings/+page.svelte para src/routes/settings.tsx
  - Migrar toda logica e UI
  - Preservar todas chamadas invoke()

  **Must NOT do**:
  - Mudar layout ou estilo
  - Mudar comportamento

  **Parallelizable**: YES (com task 13)

  **References**:
  - `src/routes/settings/+page.svelte` - pagina atual

  **Acceptance Criteria**:
  - [ ] Pagina renderiza identica
  - [ ] Todas configuracoes funcionam
  - [ ] Dados salvam corretamente

  **Commit**: NO (agrupa com task 13)

---

- [x] 13. Migrar rota /logs

  **What to do**:
  - Converter src/routes/logs/+page.svelte para src/routes/logs.tsx
  - Migrar toda logica e UI
  - Preservar listagem e formatacao

  **Must NOT do**:
  - Adicionar paginacao se nao existe
  - Mudar formatacao de datas

  **Parallelizable**: YES (com task 12)

  **References**:
  - `src/routes/logs/+page.svelte` - pagina atual

  **Acceptance Criteria**:
  - [ ] Pagina renderiza identica
  - [ ] Logs carregam corretamente
  - [ ] Scroll funciona

  **Commit**: YES
  - Message: `feat: migrate settings and logs routes`
  - Files: `src/routes/settings.tsx, src/routes/logs.tsx`

---

### Phase 5: Medium Routes

- [x] 14. Migrar rota /projects

  **What to do**:
  - Converter src/routes/projects/+page.svelte para src/routes/projects/route.tsx
  - Converter src/routes/projects/+layout.svelte para src/routes/projects.tsx (layout)
  - Converter src/routes/projects/settings/+page.svelte para src/routes/projects/settings.tsx
  - Integrar com useProjectStore
  - Preservar CRUD de projetos

  **Must NOT do**:
  - Mudar fluxo de criacao/edicao
  - Mudar visual

  **Parallelizable**: YES (com task 15)

  **References**:
  - `src/routes/projects/+page.svelte` - lista de projetos
  - `src/routes/projects/+layout.svelte` - layout
  - `src/routes/projects/settings/+page.svelte` - config do projeto

  **Acceptance Criteria**:
  - [ ] Lista de projetos renderiza
  - [ ] Criar projeto funciona
  - [ ] Editar projeto funciona
  - [ ] Deletar projeto funciona
  - [ ] Selecao de projeto funciona

  **Commit**: NO (agrupa com task 15)

---

- [x] 15. Migrar rota /agenda

  **What to do**:
  - Converter src/routes/agenda/+page.svelte para src/routes/agenda.tsx
  - Migrar TODOS componentes de agenda:
    - Calendar.tsx
    - CalendarDay.tsx
    - DayDrawer.tsx
    - DayTaskItem.tsx
    - TaskChip.tsx
    - UnscheduledPanel.tsx
    - UnscheduledTask.tsx
  - Integrar com useAgendaStore
  - Preservar drag-and-drop funcionalidade

  **Must NOT do**:
  - Mudar visual do calendario
  - Mudar logica de drag-drop
  - Mudar navegacao de meses

  **Parallelizable**: YES (com task 14)

  **References**:
  - `src/routes/agenda/+page.svelte` - pagina principal
  - `src/lib/components/agenda/*.svelte` - todos componentes de agenda
  - `src/lib/stores/agenda.ts` - store de estado

  **Acceptance Criteria**:
  - [ ] Calendario renderiza corretamente
  - [ ] Navegacao de meses funciona
  - [ ] Drag-drop de tasks funciona
  - [ ] Drawer abre/fecha corretamente
  - [ ] Tasks nao agendadas aparecem no painel

  **Commit**: YES
  - Message: `feat: migrate projects and agenda routes`
  - Files: `src/routes/projects/**, src/routes/agenda.tsx, src/components/agenda/**`

---

### Phase 6: Complex Routes

- [x] 16. Migrar rota /tasks (lista)

  **What to do**:
  - Converter src/routes/tasks/+page.svelte para src/routes/tasks/route.tsx
  - Converter src/routes/tasks/+layout.svelte para src/routes/tasks.tsx (layout)
  - Preservar listagem e filtros

  **Must NOT do**:
  - Mudar visual da lista
  - Mudar logica de filtros

  **Parallelizable**: NO (fazer antes de task 17)

  **References**:
  - `src/routes/tasks/+page.svelte` - lista de tasks
  - `src/routes/tasks/+layout.svelte` - layout

  **Acceptance Criteria**:
  - [ ] Lista de tasks renderiza
  - [ ] Filtros funcionam
  - [ ] Click navega para detalhe

  **Commit**: NO (agrupa com task 17)

---

- [x] 17. Migrar rota /tasks/[id] (detalhe)

  **What to do**:
  - Converter src/routes/tasks/[id]/+page.svelte para src/routes/tasks/$id.tsx
  - Migrar componentes de subtask:
    - SubtaskList.tsx
    - SubtaskItem.tsx
  - Preservar TODAS interacoes (structure, execute, review, etc)
  - Preservar integracao com OpenCode events
  - Preservar sync manual
  - Extrair hooks se necessario para gerenciar complexidade:
    - useTaskData() - fetch e state da task
    - useTaskActions() - acoes (save, sync, etc)

  **Must NOT do**:
  - Mudar visual
  - Mudar fluxo de estados (pending -> ready -> in_progress -> done)
  - Simplificar ou "melhorar" a UI
  - Splittar alem de hooks

  **Parallelizable**: NO (depende de task 16)

  **References**:
  - `src/routes/tasks/[id]/+page.svelte` - pagina de detalhe (complexa)
  - `src/lib/components/tasks/SubtaskList.svelte` - lista de subtasks
  - `src/lib/components/tasks/SubtaskItem.svelte` - item de subtask

  **Acceptance Criteria**:
  - [ ] Detalhe da task renderiza completo
  - [ ] Todas acoes funcionam (structure, execute, review, mark done)
  - [ ] Subtasks CRUD funciona
  - [ ] OpenCode events atualizam UI
  - [ ] Sync manual funciona
  - [ ] Estado da task persiste corretamente

  **Commit**: YES
  - Message: `feat: migrate tasks routes with full functionality`
  - Files: `src/routes/tasks/**, src/components/tasks/**`
  - Pre-commit: QA manual completo das tasks

---

### Phase 7: Cleanup

- [x] 18. Remover arquivos Svelte e finalizar

  **What to do**:
  - Deletar todos arquivos .svelte em src/
  - Deletar src/lib/ (migrado para src/components, src/stores, src/services)
  - Deletar svelte.config.js
  - Deletar src/app.html (ja substituido)
  - Verificar que nenhuma referencia a Svelte resta
  - Rodar build final

  **Must NOT do**:
  - Deletar types.ts (permanece)
  - Deletar app.css (permanece)

  **Parallelizable**: NO (ultimo passo)

  **References**:
  - Lista de arquivos .svelte identificados no inicio

  **Acceptance Criteria**:
  - [ ] Zero arquivos .svelte no projeto
  - [ ] `bun build` compila sem erros
  - [ ] `tauri build` gera binario funcional
  - [ ] App funciona identico ao Svelte original

  **Commit**: YES
  - Message: `chore: remove svelte files and finalize migration`
  - Files: todos arquivos deletados
  - Pre-commit: `bun build && tauri build`

---

## Commit Strategy

| After Task | Message                                                    | Files                                                                   | Verification           |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| 1          | `chore: replace svelte dependencies with react stack`      | package.json, bun.lockb                                                 | bun install            |
| 3          | `feat: setup react entry point with tanstack router`       | index.html, src/main.tsx, src/routes/*, tauri.conf.json                 | bun dev:web            |
| 4          | `feat: migrate svelte stores to zustand`                   | src/stores/*.ts                                                         | tsc                    |
| 6          | `feat: migrate opencode and structuring services to react` | src/services/*.ts, src/hooks/*.ts                                       | tsc                    |
| 7          | `feat: implement root layout with tauri integration`       | src/routes/__root.tsx                                                   | tauri dev              |
| 11         | `feat: migrate shared components`                          | src/components/*.tsx                                                    | visual check           |
| 13         | `feat: migrate settings and logs routes`                   | src/routes/settings.tsx, src/routes/logs.tsx                            | manual QA              |
| 15         | `feat: migrate projects and agenda routes`                 | src/routes/projects/**, src/routes/agenda.tsx, src/components/agenda/** | manual QA              |
| 17         | `feat: migrate tasks routes with full functionality`       | src/routes/tasks/**, src/components/tasks/**                            | manual QA completo     |
| 18         | `chore: remove svelte files and finalize migration`        | deleted files                                                           | bun build, tauri build |

---

## Success Criteria

### Verification Commands
```bash
bun install          # Dependencias instaladas
bun dev:web          # Dev server React funciona
bun build            # Build compila sem erros
tauri dev            # App Tauri funciona
tauri build          # Binario gerado
```

### Final Checklist
- [x] Todas rotas funcionam identicamente
- [x] Todos shortcuts funcionam (Alt+1-4)
- [x] Window hide/show funciona
- [x] OpenCode integration funciona
- [x] Task flow completo funciona
- [x] Agenda drag-drop funciona
- [x] Zero arquivos Svelte restantes
- [x] Zero erros TypeScript
- [x] Zero erros no console
- [x] Visual identico ao original

---

## Post-migration fixes

- [x] 1. Restore Agenda side panel + drawer parity
- [x] 2. Implement Projects settings route
- [x] 3. Guard Tauri APIs for web mode
- [x] 4. Fix task list AI sync stale closure
- [x] 5. Complete Projects page parity blocks/actions
