# WorkoPilot - Estrutura do Frontend

## Visao Geral

O frontend do WorkoPilot e uma aplicacao **React 19** com **TanStack Router** para roteamento file-based, **TanStack Query** para gerenciamento de estado do servidor, **Zustand** para estado local, e **Tailwind CSS v4** para estilizacao. A aplicacao roda como interface web dentro de um app **Tauri** (desktop).

### Stack Principal

| Tecnologia | Versao | Proposito |
|------------|--------|-----------|
| React | 19.x | UI Framework |
| TanStack Router | 1.x | Roteamento file-based |
| TanStack Query | 5.x | Server state management |
| Zustand | 5.x | Client state management |
| Tailwind CSS | 4.x | Estilizacao |
| Tauri | 2.x | Desktop runtime |
| Vite | 5.x | Build tool |
| TypeScript | 5.6 | Type safety |

---

## Estrutura de Diretorios

```
src/
├── main.tsx                    # Entry point
├── routerConfig.ts             # Configuracao do TanStack Router
├── routeTree.gen.ts            # Rotas geradas automaticamente
├── types.ts                    # Tipos TypeScript globais
├── app.css                     # Estilos globais
├── vite-env.d.ts               # Tipos do Vite
│
├── components/                 # Componentes reutilizaveis
│   ├── ui/                     # Componentes base (shadcn/ui style)
│   │   ├── index.tsx           # Re-exports
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── switch.tsx
│   │
│   ├── agenda/                 # Componentes especificos da agenda
│   │   ├── index.ts
│   │   ├── DayDrawer.tsx
│   │   └── DayTaskItem.tsx
│   │
│   ├── tasks/                  # Componentes especificos de tasks
│   │   ├── SubtaskList.tsx
│   │   ├── SubtaskItem.tsx
│   │   ├── TaskStatusSelect.tsx
│   │   ├── ImageThumbnail.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── ImageModal.tsx
│   │   └── DescriptionWithImages.tsx
│   │
│   ├── TabBar.tsx              # Barra de navegacao principal
│   ├── ConfirmDialog.tsx       # Dialog de confirmacao generico
│   ├── StructuringCompleteModal.tsx  # Modal de estruturacao concluida
│   ├── Select.tsx              # Select customizado
│   ├── HotkeyInput.tsx         # Input de atalhos de teclado
│   ├── ProjectSelect.tsx       # Seletor de projeto
│   └── SelectImageKDE.tsx      # Seletor de imagem KDE
│
├── routes/                     # Rotas (file-based routing)
│   ├── __root.tsx              # Layout raiz
│   ├── index.tsx               # Redirect /
│   │
│   ├── home.tsx                # Layout /home
│   ├── home/
│   │   └── index.tsx           # Pagina home
│   │
│   ├── projects.tsx            # Layout /projects
│   ├── projects/
│   │   ├── index.tsx           # Lista de projetos
│   │   ├── settings.tsx        # Config do projeto
│   │   └── -components/        # Componentes privados
│   │       ├── index.ts
│   │       ├── ProjectDashboard.tsx
│   │       ├── ProjectsSidebar.tsx
│   │       └── NewProjectForm.tsx
│   │
│   ├── tasks.tsx               # Layout /tasks
│   ├── tasks/
│   │   ├── index.tsx           # Lista de tasks
│   │   ├── $taskId.tsx         # Detalhe da task
│   │   ├── -components/        # Componentes privados
│   │   │   ├── index.ts
│   │   │   ├── TasksRoot.tsx
│   │   │   ├── TasksList.tsx
│   │   │   ├── TasksListItem.tsx
│   │   │   ├── TasksHeader.tsx
│   │   │   └── TasksNewTask.tsx
│   │   └── -utils/             # Hooks e utilidades privadas
│   │       ├── index.ts
│   │       ├── useGetTaskData.ts
│   │       └── useGetTaskQuery.ts
│   │
│   ├── tasks/$taskId/
│   │   ├── -components/
│   │   │   ├── index.ts
│   │   │   ├── ManageTaskRoot.tsx
│   │   │   ├── ManageTaskForm.tsx
│   │   │   ├── ManageTaskHeader.tsx
│   │   │   ├── ManageTaskMetadata.tsx
│   │   │   └── ManageTaskStatus.tsx
│   │   └── -utils/
│   │       ├── index.ts
│   │       ├── useGetTaskFullQuery.ts
│   │       ├── useTaskForm.ts
│   │       ├── useTaskMutations.ts
│   │       └── taskSchema.ts
│   │
│   ├── agenda.tsx              # Layout /agenda
│   ├── agenda/
│   │   ├── index.tsx           # Pagina do calendario
│   │   └── -components/
│   │       ├── index.ts
│   │       ├── Calendar.tsx
│   │       ├── CalendarDay.tsx
│   │       ├── TaskChip.tsx
│   │       ├── UnscheduledPanel.tsx
│   │       └── UnscheduledTask.tsx
│   │
│   ├── settings.tsx            # Configuracoes globais
│   └── logs.tsx                # Rota legada (vazia)
│
├── hooks/                      # Hooks globais
│   ├── useDbChangedListener.ts # Listener de mudancas no DB
│   ├── useTauriEvent.ts        # Hook para eventos Tauri
│   └── useUpdateTask.ts        # Hook para atualizar tasks
│
├── lib/                        # Utilidades e constantes
│   ├── utils.ts                # cn() e outras utilidades
│   ├── searchSchemas.ts        # Schemas Zod para search params
│   └── constants/
│       └── taskStatus.ts       # Constantes de status de task (~463 linhas)
│
├── services/                   # Servicos externos
│   ├── tauri.ts                # Wrapper seguro para Tauri invoke/listen
│   ├── opencode.ts             # Cliente OpenCode SDK
│   ├── structuringMonitor.ts   # Monitor de estruturacao de tasks
│   └── aiDistribution.ts       # Distribuicao de tasks com IA
│
└── stores/                     # Estado global (Zustand)
    ├── selectedProject.ts      # Projeto selecionado (persistido)
    ├── agenda.ts               # Estado do calendario
    ├── dbRefetch.ts            # Trigger de refetch global
    ├── dialogState.ts          # Estado de dialogs abertos
    └── structuringNotification.ts # Notificacoes de estruturacao
```

---

## Padroes de Arquitetura

### 1. Roteamento File-Based (TanStack Router)

- **Convencao**: Arquivos em `routes/` geram rotas automaticamente
- **Layouts**: Arquivos sem `index` sao layouts (ex: `tasks.tsx`)
- **Paginas**: `index.tsx` dentro de pastas sao paginas
- **Componentes privados**: Pastas prefixadas com `-` nao geram rotas (ex: `-components/`)
- **Parametros dinamicos**: `$param` (ex: `$taskId.tsx`)

### 2. Gerenciamento de Estado

| Tipo de Estado | Solucao | Exemplo |
|----------------|---------|---------|
| Server state | TanStack Query | Lista de tasks, dados de projeto |
| UI state local | useState | Modal aberto, form values |
| UI state global | Zustand | Projeto selecionado, dialogs |
| URL state | TanStack Router search | Filtros de tasks |

### 3. Comunicacao com Backend (Tauri)

```typescript
// Padrao: usar safeInvoke/safeListen de services/tauri.ts
import { safeInvoke, safeListen } from "../services/tauri";

// Invoke (comando)
const tasks = await safeInvoke<Task[]>("get_all_tasks");

// Listen (evento)
const unlisten = await safeListen<Payload>("event-name", (event) => {
  // handle event
});
```

### 4. Componentes UI (shadcn/ui style)

- Localizacao: `src/components/ui/`
- Padrao: CVA (class-variance-authority) para variants
- Re-export centralizado em `ui/index.tsx`

---

## Fluxos de Dados Principais

### Carregamento de Tasks

```
TasksRoot
└── useGetTaskData (hook)
    ├── useQuery("tasksFull") -> get_all_tasks_full
    ├── useQuery("activeExecutions") -> get_all_active_executions
    └── useDbRefetchStore (refetch on db-changed event)
```

### Atualizacao de Tasks

```
User Action
└── safeInvoke("update_task_and_sync")
    └── Backend emits "db-changed" / "task-updated"
        └── useDbChangedListener triggers store
            └── Query invalidation
                └── UI re-render
```

### Monitor de Estruturacao

```
__root.tsx
└── useEffect (on mount)
    ├── startPolling(30000) - verifica tasks em estruturacao
    ├── openCodeService.onSessionIdle -> checkForStructuringChanges
    └── openCodeService.onFileChange -> checkAllInProgressTasks
```

---

## Pontos de Lentidao e Problemas Identificados

### 1. **Arquivo taskStatus.ts muito grande (~463 linhas)**

**Problema**: Concentra muita logica em um unico arquivo, dificultando manutencao.

**Impacto**: 
- Muitas funcoes com nomes similares (getTaskStatus, getTaskStatusFromTask, getStatusLabel, etc.)
- Duplicacao de conceitos (TaskStatus vs TaskProgressState vs DerivedStatus)
- Exports de alias que nao agregam valor

**Recomendacao**: Separar em modulos menores:
```
lib/constants/
├── taskStatus.ts       # Apenas tipos e constantes base
├── taskProgressState.ts # Logica de estado de progresso
└── taskStyleUtils.ts   # Classes CSS e estilos
```

### 2. **Polling excessivo no structuringMonitor**

**Problema**: `startPolling(30000)` + `onSessionIdle` + `onFileChange` criam multiplos pontos de verificacao.

**Impacto**: Chamadas redundantes ao backend, especialmente quando o usuario nao esta estruturando nada.

**Recomendacao**: 
- Usar apenas eventos do backend para notificar mudancas
- Remover polling se eventos forem confiaveis
- Adicionar debounce nas verificacoes

### 3. **Renderizacoes desnecessarias na TasksList**

**Problema**: `taskFullCache` e um `Map` criado via `useMemo`, mas a comparacao de referencia pode causar re-renders.

**Impacto**: Lista de tasks pode re-renderizar mesmo quando dados nao mudaram.

**Recomendacao**:
- Memoizar `TasksListItem` com `React.memo`
- Considerar usar `useCallback` para handlers passados como props

### 4. **Ausencia de virtualizacao em listas longas**

**Problema**: TasksList e UnscheduledPanel renderizam todos os itens.

**Impacto**: Com muitas tasks, o DOM fica pesado e scroll pode ficar lento.

**Recomendacao**: Implementar virtualizacao com `@tanstack/react-virtual` para listas > 50 itens.

### 5. **Rota `/logs` vazia mas ainda no routeTree**

**Problema**: Arquivo `logs.tsx` existe mas so renderiza `<Outlet />` vazio.

**Impacto**: Rota acessivel mas sem funcionalidade, confunde usuario.

**Recomendacao**: Remover arquivo se Logs foi descontinuado (ver subtask anterior de limpeza).

### 6. **Hooks customizados com dependencias mutaveis**

**Problema**: `useGetTaskData` usa `tasksFullRef` e `filters` que podem causar stale closures.

**Impacto**: Filtros podem nao refletir estado atual em certas condicoes de race.

**Recomendacao**: Revisar dependencias de `useEffect` e `useCallback`, usar `useRef` com cuidado.

### 7. **Ausencia de Error Boundaries**

**Problema**: Nao ha tratamento de erros de renderizacao.

**Impacto**: Um erro em um componente pode crashar toda a aplicacao.

**Recomendacao**: Adicionar `ErrorBoundary` em pontos estrategicos (layouts de rota).

### 8. **Inline styles e classes hardcoded**

**Problema**: Cores como `#636363`, `#98c379` espalhadas em varios arquivos.

**Impacto**: Dificil manter consistencia visual e trocar tema.

**Recomendacao**: Centralizar cores em variaveis CSS ou Tailwind config.

---

## Recomendacoes de Melhoria

### Curto Prazo (Quick Wins)

1. **Remover arquivo `logs.tsx`** - Rota legada sem uso
2. **Adicionar React.memo** em `TasksListItem` e `SubtaskRow`
3. **Consolidar cores** - Mover hardcoded colors para CSS variables
4. **Adicionar loading skeletons** - Melhorar perceived performance

### Medio Prazo

5. **Refatorar taskStatus.ts** - Separar em modulos menores
6. **Implementar Error Boundaries** - Em `__root.tsx` e layouts de rotas
7. **Revisar polling** - Substituir por eventos quando possivel
8. **Adicionar testes** - Hooks criticos como `useGetTaskData`

### Longo Prazo

9. **Virtualizacao de listas** - `@tanstack/react-virtual`
10. **Code splitting** - Lazy load de rotas menos usadas
11. **Performance monitoring** - React DevTools Profiler em CI
12. **Design system documentado** - Storybook para componentes UI

---

## Metricas do Codebase

| Metrica | Valor |
|---------|-------|
| Total de arquivos .tsx/.ts | 90 |
| Linhas de codigo (total) | ~2345 |
| Componentes UI base | 7 |
| Stores Zustand | 5 |
| Hooks customizados | 3+ por rota |
| Rotas | 7 principais |

---

## Conclusao

O frontend do WorkoPilot possui uma arquitetura solida com boas escolhas de tecnologia. Os principais pontos de atencao sao:

1. **Organizacao**: Arquivo `taskStatus.ts` precisa ser modularizado
2. **Performance**: Falta virtualizacao e memoizacao em alguns pontos
3. **Resiliencia**: Ausencia de error boundaries
4. **Manutencao**: Cores hardcoded dificultam theming

As recomendacoes listadas podem ser implementadas incrementalmente, priorizando as de curto prazo para ganhos rapidos de qualidade.
