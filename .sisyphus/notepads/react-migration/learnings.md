# Learnings - React Migration

## 2026-01-20: Task 1 - Package.json Update

### Svelte deps removed
- @sveltejs/adapter-static: ^3.0.6
- @sveltejs/kit: ^2.5.0
- @sveltejs/vite-plugin-svelte: ^4.0.0
- svelte: ^5.0.0
- svelte-check: ^4.0.0

### React deps added
- react: ^19
- react-dom: ^19
- @tanstack/react-router: ^1
- zustand: ^5

### Dev deps added
- @vitejs/plugin-react: ^4
- @tanstack/router-plugin: ^1
- @types/react: ^19
- @types/react-dom: ^19

### Scripts updated
- Removed `check` script (was: `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`)
- Kept: dev, dev:web, build, build:web, preview, tauri

### Preserved deps (unchanged)
- Tailwind: ^4.1.18 (@tailwindcss/postcss, @tailwindcss/vite, tailwindcss)
- Tauri: ^2 (@tauri-apps/api, @tauri-apps/cli, plugin-dialog, plugin-opener)
- typescript: ~5.6.2
- vite: ^5.4.0
- @opencode-ai/sdk: ^1.1.27

## 2026-01-20: Task 1 Completion Note

Task 1 (Atualizar package.json) work is complete. Checkbox marking must be done by Orchestrator - worker agents cannot modify plan files per system constraints.

## 2026-01-20: Task 2 - Vite Config Migration

### Changes Made
- Converted `vite.config.js` → `vite.config.ts`
- Removed: `sveltekit()` from `@sveltejs/kit/vite`
- Added: `tanstackRouter()` from `@tanstack/router-plugin/vite`
- Added: `react()` from `@vitejs/plugin-react`
- Kept: `tailwindcss()` from `@tailwindcss/vite`
- Added: `resolve.alias` with `"@": "/src"`

### Plugin Order
TanStack Router plugin MUST come before React plugin per official docs.

### Preserved Settings
- `clearScreen: false`
- `server.port: 1420`
- `server.strictPort: true`
- `TAURI_DEV_HOST` HMR configuration
- `src-tauri` watch ignore

### Key Learning
`TanStackRouterVite` is deprecated. Use `tanstackRouter` import instead.

## 2026-01-20: Task - Remove StrictMode

### Change Made
- Removed `StrictMode` import and wrapper from `src/main.tsx`
- `RouterProvider` now renders directly under `createRoot(...).render(...)`

### Reason
StrictMode double-invokes effects in development, which differs from Svelte behavior. Removed to maintain parity during migration.

## 2026-01-20: Task - Restore StrictMode

### Change Made
- Restored `StrictMode` import and wrapper in `src/main.tsx`
- `RouterProvider` now wrapped in `<StrictMode>` as per user request

### Reason
User explicitly requested to keep StrictMode. Double-invocation of effects in dev mode is acceptable.

## 2026-01-20: Task - Revert Index Route Redirect

### Change Made
- Reverted `window.location.replace("/projects")` back to TanStack Router's `redirect({ to: "/projects" })`
- `beforeLoad` now throws `redirect()` as per TanStack Router pattern

### Reason
`window.location` causes full page reload, losing SPA benefits. TanStack Router's `redirect` is client-side and preserves app state.

## 2026-01-20: Task 5 - useTauriEvent Hook

### Created
- `src/hooks/useTauriEvent.ts`

### Pattern
```typescript
export function useTauriEvent<T>(eventName: string, callback: (payload: T) => void) {
  const unlistenRef = useRef<UnlistenFn | null>(null)

  useEffect(() => {
    listen<T>(eventName, (event) => callback(event.payload)).then((fn) => {
      unlistenRef.current = fn
    })

    return () => {
      unlistenRef.current?.()
    }
  }, [eventName, callback])

  return () => unlistenRef.current?.()
}
```

### Key Decisions
- Uses `useRef` to store unlisten function (avoids stale closure issues)
- Returns unlisten function for manual cleanup if needed
- Generic `<T>` for typed payloads
- Extracts `event.payload` in callback (matches Svelte pattern from `+layout.svelte`)
- Dependencies: `[eventName, callback]` - re-subscribes if either changes

### Tauri Event API
- Import: `@tauri-apps/api/event`
- `listen<T>(eventName, handler)` returns `Promise<UnlistenFn>`
- Handler receives `{ payload: T }` object

## 2026-01-20: Task 4 - Zustand Stores Migration

### Stores Created
- `src/stores/selectedProject.ts` - selectedProjectId, projectsList
- `src/stores/dialogState.ts` - openDialogCount counter pattern
- `src/stores/agenda.ts` - selectedDate, currentMonth, draggedTask, drawerCollapsed
- `src/stores/structuringNotification.ts` - notification, notifiedTaskIds Set

### Zustand Pattern Used
```typescript
type StoreState = { ... }
type StoreActions = { ... }
type Store = StoreState & StoreActions

export const useStore = create<Store>((set, get) => ({
  ...initialState,
  action: () => set({ ... }),
}))
```

### Key Differences from Svelte Stores
- Svelte: Multiple `writable()` exports per file
- Zustand: Single store with all state + actions combined
- Svelte `isDialogOpen` boolean → Zustand `openDialogCount` counter (per plan requirement)
- Svelte module-level `Set` for notifiedTaskIds → Zustand store state

### Import Path
- Uses `$lib/types` (SvelteKit alias still works) for shared types
- Zustand stores in `src/stores/` directory

## 2026-01-20: Task 6 - Services Migration

### Files Created
- `src/services/opencode.ts` - OpenCode SDK event listener service
- `src/services/structuringMonitor.ts` - Task structuring completion monitor

### OpenCode Service Changes
- Removed Svelte store imports (`writable`, `openCodeConnected`, `openCodeError`)
- Added callback-based state notification:
  - `onConnectionChange(callback: (connected: boolean) => void)`
  - `onError(callback: (error: string | null) => void)`
- Internal `notifyConnection()` and `notifyError()` methods replace store updates
- `destroy()` now clears all callback sets

### StructuringMonitor Changes
- Replaced Svelte store functions with Zustand store access:
  - `showStructuringNotification(...)` → `useStructuringNotificationStore.getState().showNotification(...)`
  - `clearNotifiedTask(...)` → `useStructuringNotificationStore.getState().clearNotifiedTask(...)`
- Import path: relative `../stores/structuringNotification` (not `@/` alias)

### Preserved Behavior
- Exponential backoff: `delay * 2^(attempts-1)` starting at 1000ms
- Max reconnect attempts: 5
- Polling interval: 3000ms default
- Auto-init on window load after 1000ms delay
- All public API methods unchanged

### Import Path Note
- `@/` alias configured in vite.config.ts but not in tsconfig.json
- TypeScript LSP doesn't resolve `@/` paths
- Use `$lib/` for types (works via SvelteKit tsconfig)
- Use relative paths for `src/stores/` imports

## 2026-01-20: Task 7 - Root Layout Full Implementation

### Pattern: Svelte onMount → React useEffect
- Svelte `onMount` returns cleanup function directly
- React `useEffect` returns cleanup function, runs on unmount

### Pattern: Svelte reactive state in callbacks
- Svelte: `$state` variable accessed directly in async callbacks (reactive)
- React: Use `useRef` to hold current value for async callbacks (avoids stale closure)
- Example: `openDialogCountRef.current` instead of `openDialogCount` in setTimeout callback

### Tauri Window Focus Event
```typescript
getCurrentWindow()
  .onFocusChanged(({ payload: focused }) => { ... })
  .then((fn) => { unlisten = fn; });
```
- Returns Promise<UnlistenFn>
- Payload is boolean (focused state)
- Must store unlisten function and call in cleanup

### Auto-hide Logic
- 150ms delay before hiding (prevents flicker on quick focus changes)
- Double-check focus state after timeout (window may have regained focus)
- Check dialog count via ref (not state) to avoid stale closure
- Call `invoke("hide_window")` to hide Tauri window

### Keyboard Shortcuts Pattern
- Separate useEffect for keydown listener (cleaner separation)
- Early return pattern: `if (!e.altKey || e.key < "0" || e.key > "9") return;`
- TanStack Router: `navigate({ to: path })` instead of SvelteKit `goto(path)`

### Service Integration
- `startPolling(5000)` on mount
- `openCodeService.onSessionIdle` → `checkForStructuringChanges()`
- `openCodeService.onFileChange` → `checkAllInProgressTasks()` when path includes `workopilot.db`
- Cleanup: unlisten, unsubscribe all, stopPolling, clear timeout

### Placeholder Component Pattern
- Local stub function returning null for components not yet migrated
- Keeps TypeScript happy and marks integration point

## 2026-01-20: Task - useTauriEvent for Focus/Blur

### Tauri Window Event Names
- `tauri://focus` - window gains focus
- `tauri://blur` - window loses focus
- These are global events, use `listen()` from `@tauri-apps/api/event`

### Pattern: useTauriEvent with useCallback
```typescript
const handleFocus = useCallback(() => {
  // clear any pending hide timeout
}, []);

const handleBlur = useCallback(() => {
  // start hide timeout if no dialogs open
}, []);

useTauriEvent("tauri://focus", handleFocus);
useTauriEvent("tauri://blur", handleBlur);
```

### Key Changes from onFocusChanged
- `getCurrentWindow().onFocusChanged()` → separate `useTauriEvent` calls for focus/blur
- Callbacks must be wrapped in `useCallback` to avoid re-subscribing on every render
- Timeout ref moved to component level (not inside useEffect)
- Cleanup of timeout still happens in main useEffect return

### Modal Placement Pattern
- Modals that overlay the entire app should render OUTSIDE the main container
- Use Fragment (`<>...</>`) to wrap container + modal at same level
- Matches Svelte layout where modal is sibling to container, not child

## 2026-01-20: Task 8 - TabBar Component Migration

### TanStack Router Integration
- `useLocation()` hook to get current pathname
- `Link` component for navigation (replaces `<a href>`)
- Route type safety: LSP errors for non-existent routes are expected during incremental migration

### Svelte → React Patterns
- `$derived($page.url.pathname)` → `useLocation().pathname`
- `{#each tabs as tab}` → `tabs.map((tab) => ...)`
- `class=` → `className=`
- `onmousedown=` → `onMouseDown=`
- `onclick=` → `onClick=`
- SVG attributes: `stroke-width` → `strokeWidth`, `stroke-linecap` → `strokeLinecap`, `stroke-linejoin` → `strokeLinejoin`

### Conditional Classes Pattern
- Svelte: Template literal with ternary inside `class="... {condition ? 'active' : 'inactive'}"`
- React: Full className string in ternary `className={condition ? "full active classes" : "full inactive classes"}`

### Tauri Integration Preserved
- `getCurrentWindow().startDragging()` for window drag
- `invoke("hide_window")` for hide button
- Functions defined outside component (no hooks needed)

## 2026-01-20: Task 10 - ConfirmDialog Component Migration

### Props Mapping
- Svelte `show` → React `isOpen`
- All other props identical: `title`, `message`, `confirmText`, `cancelText`, `onConfirm`, `onCancel`, `danger`

### Dialog State Integration
- useEffect to call `openDialog()` when `isOpen` becomes true
- Cleanup function calls `closeDialog()` when dialog closes or unmounts
- Uses selector pattern: `useDialogStateStore((s) => s.openDialog)`

### Keyboard Handling
- Separate useEffect for keydown listener (only active when `isOpen`)
- Early return if `!isOpen`
- Escape → onCancel, Enter → onConfirm
- Cleanup removes event listener

### Styling Preserved
- All Tailwind classes identical to Svelte version
- z-50 overlay, bg-black/60 backdrop
- bg-[#232323] dialog, border-[#3d3a34]
- Danger variant: bg-[#bc5653] vs bg-[#909d63]

### Import Path Note
- `@/` alias not configured in tsconfig.json (only in vite.config.ts)
- Use relative imports: `../stores/dialogState`

## 2026-01-20: Task 9 - Select Component Migration

### Svelte → React Controlled Component
- Svelte: `value = $bindable()` + `onchange` callback
- React: `value` + `onChange` props (fully controlled)

### Key Differences
- Svelte `$bindable()` allows two-way binding; React uses one-way data flow
- Svelte `onchange` event handler → React `onChange` with `e.target.value`
- Svelte `setDialogOpen(true/false)` → Zustand `openDialog()/closeDialog()` counter pattern

### Dialog State Integration
- Focus: `openDialog()` increments counter
- Blur: `setTimeout(() => closeDialog(), 100)` - 100ms delay preserved from Svelte
- Delay ensures dropdown close animation completes before window can hide

### Styling Preserved
- Inline `style` object for background SVG chevron icon
- Classes identical: `px-2 py-1 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:outline-none focus:border-[#909d63] appearance-none cursor-pointer`
- Option styling: `bg-[#1c1c1c] text-[#d6d6d6]`

### Added Feature
- `placeholder` prop for disabled placeholder option (not in Svelte version but common pattern)

## 2026-01-20: Task 11 - StructuringCompleteModal Component Migration

### Store Integration
- `useStructuringNotificationStore` for notification state and actions
- `useDialogStateStore` for dialog count (prevents window auto-hide)
- Selector pattern: `useStore((s) => s.property)` for each property

### Dialog State Lifecycle
- useEffect with `notification` dependency
- When notification appears: `openDialog()` increments counter
- Cleanup function: `closeDialog()` decrements counter
- Ensures window doesn't auto-hide while modal is open

### Action Handlers Pattern
- All handlers wrapped in `useCallback` with proper dependencies
- Async handlers use `.catch()` for error handling (no try/catch)
- State reset (`setIsLaunching(false)`) happens after navigation

### Navigation
- TanStack Router: `navigate({ to: "/tasks/$taskId", params: { taskId } })`
- Type errors expected until `/tasks/$taskId` route is created
- Same pattern as TabBar.tsx `/settings` route

### Component Structure
- Main component: `StructuringCompleteModal` (orchestrates state + renders)
- Subcomponents: `ModalHeader`, `ModalTaskInfo`, `ModalActions`, `ActionButton`
- Icon components: `RocketIcon`, `TargetIcon`, `EyeIcon`, `SparklesIcon`
- All in same file (tightly coupled, <50 lines each)

### CSS Animation
- Added `@keyframes modal-in` to `src/app.css`
- `.animate-modal-in` class: `animation: modal-in 0.2s ease-out`
- Matches Svelte scoped style exactly

### Keyboard Handling
- Separate useEffect for keydown listener
- Only active when `notification` exists
- Escape key calls `handleClose()`
- Cleanup removes event listener

### Accessibility
- Backdrop has `role="button"`, `tabIndex={-1}`, `aria-label`
- Close button has `aria-label="Fechar"`
- Action buttons have proper disabled states

## 2026-01-20: Component Parity Fixes

### Type Aliases vs Interfaces
- User preference: `type` aliases instead of `interface` for props
- Changed `interface SelectProps` → `type SelectProps = { ... }`
- Changed `interface ConfirmDialogProps` → `type ConfirmDialogProps = { ... }`

### Select Component Parity
- Removed `className` prop (not in Svelte version)
- Svelte version has `class?: string` but it's for internal use with `{className}` template
- React version should not expose className to consumers

### StructuringCompleteModal Error Handling
- Svelte uses try/catch/finally pattern
- `handleClose()` and `navigate()` only called on SUCCESS (inside try, after await)
- State reset (`isLaunching`, `launchingAction`) in finally block
- Previous React version used `.catch()` but still called handleClose/navigate on failure
- Fixed to match Svelte: try/catch/finally with success-only navigation

## 2026-01-20: Task 12 - Settings Route Migration

### Route Structure
- File: `src/routes/settings.tsx`
- Uses `createFileRoute("/settings")` pattern
- Includes `TabBar` component at top (same as Svelte layout)

### State Management
- 6 state variables: `currentShortcut`, `selectedModifier`, `selectedKey`, `isEditing`, `error`, `success`
- Svelte `$state()` → React `useState()`
- Svelte `$effect()` → React `useEffect()` with dependency array

### Dialog State Integration
- Select focus/blur handlers use Zustand store
- `openDialog()` on focus, `closeDialog()` with 100ms delay on blur
- Prevents window auto-hide while dropdown is open

### Invoke Pattern
- `invoke<ShortcutConfig>("get_shortcut")` with `.catch(() => null)` for error handling
- `invoke<ShortcutConfig>("set_shortcut", { shortcut: shortcutStr })` with try/catch for user feedback

### Callbacks with useCallback
- `loadShortcut`, `saveShortcut`, `cancelEdit` wrapped in `useCallback`
- `handleSelectFocus`, `handleSelectBlur` also wrapped (used in event handlers)
- Dependencies properly specified

### Conditional Rendering
- Svelte `{#if !isEditing}...{:else}...{/if}` → React ternary `{!isEditing ? (...) : (...)}`
- Svelte `{#if error}` → React `{error && ...}`
- Svelte `{#each modifiers as mod}` → React `{modifiers.map((mod) => ...)}`

### Styling Preserved
- All Tailwind classes identical
- Color scheme: `#232323`, `#3d3a34`, `#d6d6d6`, `#636363`, `#828282`, `#909d63`, `#bc5653`
- Button variants: primary (`bg-[#909d63]`), secondary (`bg-[#2c2c2c] border`)

### Type Definition
- `ShortcutConfig` type defined locally (matches Svelte interface)
- Constants `modifiers` and `keys` at module level (outside component)

## 2026-01-20: Task 13 - Logs Route Migration

### Component Structure
- Main component: `LogsPage` (orchestrates state + renders)
- Subcomponents: `LogsSidebar`, `LogsContent`
- All in same file (tightly coupled, <50 lines each)

### State Management
- `logs: SessionLog[]` - fetched from Tauri on mount
- `selectedLog: SessionLog | null` - currently selected log
- `dailyTokens` - derived from logs.reduce()
- `tokenPercentage` - derived from dailyTokens/tokenGoal

### Svelte → React Patterns
- `$state([])` → `useState<SessionLog[]>([])`
- `$derived(...)` → computed inline (no useMemo needed for simple calculations)
- `$effect(() => loadLogs())` → `useEffect(() => { invoke().then().catch() }, [])`
- `{#each logs as log}` → `logs.map((log) => ...)`
- `{#if condition}` → `{condition && ...}` or early return

### Date/Token Formatting
- Functions defined outside component (pure, no hooks)
- `formatDate()` - uses `toLocaleString("pt-BR", {...})` - preserved exactly
- `formatTokens()` - `n >= 1000 ? (n/1000).toFixed(1)k : n.toString()` - preserved exactly

### Conditional Classes Pattern
- File action badge: ternary chain for created/deleted/modified
- Selected log: ternary for active/inactive styles
- Same pattern as Svelte but with template literals in className

### Import Path
- `$lib/types` → `../lib/types` (relative path, not alias)
- TabBar: named export `{ TabBar }` not default export

### LSP Error Note
- `Argument of type '"/logs"' is not assignable to parameter of type '"/"'`
- Expected during incremental migration - TanStack Router types regenerate on build
- Same pattern seen in other migrated routes (settings, tasks, etc.)

## 2026-01-20: Task 14 - Projects Route Migration

### Route Structure
- `src/routes/projects.tsx` - Layout with sidebar (wraps child routes via `<Outlet />`)
- `src/routes/projects/route.tsx` - Main projects page (index route)
- `src/routes/projects/settings.tsx` - Project settings page

### TanStack Router Patterns
- Layout route: `createFileRoute("/projects")` with `<Outlet />` for children
- Index route: `createFileRoute("/projects/")` (trailing slash for index)
- Child route: `createFileRoute("/projects/settings")`

### Zustand Store Integration
- `useSelectedProjectStore` replaces Svelte stores `selectedProjectId` and `projectsList`
- Selector pattern: `useSelectedProjectStore((s) => s.selectedProjectId)`
- Actions: `setSelectedProjectId`, `setProjectsList`

### Svelte Store Subscription → React
- Svelte: `selectedProjectIdStore.subscribe(value => { ... })`
- React: Direct selector access + useEffect for side effects

### Search Params Pattern
- `useSearch({ from: "/projects/" })` to access URL search params
- Type assertion: `(search as { newProject?: string }).newProject`
- Navigate with search: `navigate({ to: "/projects", search: { newProject: "true" } })`

### Link with Search Params
```tsx
<Link
  to="/projects/settings"
  search={{ projectId: selectedProjectId || "" }}
>
```

### Drag and Drop Pattern
- Svelte: `ondragstart`, `ondragover`, `ondragend` + `animate:flip`
- React: `onDragStart`, `onDragOver`, `onDragEnd` (no built-in flip animation)
- Throttle swaps with `useRef` for timestamp: `lastRouteSwapRef.current`
- Clone element for drag image: `e.dataTransfer.setDragImage(clone, ...)`

### State Updates with Immutability
- Svelte: Direct mutation `projectConfig.routes = [...projectConfig.routes, newRoute]`
- React: Immutable updates `setProjectConfig({ ...projectConfig, routes: [...projectConfig.routes, newRoute] })`

### Nested State Updates
```tsx
setProjectConfig({
  ...projectConfig,
  tmux_config: { ...projectConfig.tmux_config, tabs: newTabs }
})
```

### Dialog State for File Picker
- `openDialog()` before `open()` from `@tauri-apps/plugin-dialog`
- `closeDialog()` in finally block
- Prevents window auto-hide while file picker is open

### Component Decomposition
- Main page split into subcomponents: `ProjectHeader`, `UrgentTasksSection`, `TokensSection`, `LastLogSection`, `WeekTasksSection`, `TmuxConfigSection`
- Props types defined inline with `type` keyword
- All subcomponents in same file (tightly coupled)

### Derived Values
- Svelte: `$derived(Math.min((dailyTokens / tokenGoal) * 100, 100))`
- React: Computed inline `const tokenPercentage = Math.min((dailyTokens / tokenGoal) * 100, 100)`
- No useMemo needed for simple calculations

### Conditional Rendering for Loading States
- Early return pattern for loading/empty states
- Main content renders only when `projectConfig` exists

## 2026-01-20: Task 15 - Agenda Route Migration

### Files Created
- `src/routes/agenda.tsx` - Main agenda page
- `src/components/agenda/Calendar.tsx` - Calendar grid with month navigation
- `src/components/agenda/CalendarDay.tsx` - Individual day cell
- `src/components/agenda/TaskChip.tsx` - Task indicator in calendar
- `src/components/agenda/UnscheduledPanel.tsx` - Left panel with unscheduled tasks
- `src/components/agenda/UnscheduledTask.tsx` - Draggable task item
- `src/components/agenda/DayDrawer.tsx` - Right drawer for day details
- `src/components/agenda/DayTaskItem.tsx` - Task item in drawer

### forwardRef + useImperativeHandle Pattern
- Svelte: `export function refresh() { ... }` exposes method to parent
- React: `forwardRef` + `useImperativeHandle` for imperative API
```tsx
export const Calendar = forwardRef<CalendarRef, CalendarProps>(function Calendar(props, ref) {
  useImperativeHandle(ref, () => ({
    refresh: loadTasks,
  }));
  // ...
});
```
- Parent uses `useRef<CalendarRef>(null)` and calls `calendarRef.current?.refresh()`

### Zustand Store Integration
- `useAgendaStore` provides: `selectedDate`, `currentMonth`, `draggedTask`, `drawerCollapsed`
- Selector pattern: `useAgendaStore((s) => s.selectedDate)`
- Actions: `setSelectedDate`, `setCurrentMonth`, `setDraggedTask`, `setDrawerCollapsed`

### Drag and Drop Pattern
- Svelte: `ondragstart`, `ondragover`, `ondragleave`, `ondrop`
- React: `onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`
- Store `draggedTask` in Zustand for cross-component communication
- `e.dataTransfer.effectAllowed = "move"` for drag cursor
- `e.dataTransfer.setData("text/plain", taskId)` for data transfer

### Drawer Collapse on Drag
- When dragging from drawer, collapse it to show calendar
- `setDrawerCollapsed(true)` on drag start
- `setDrawerCollapsed(false)` on drag end
- Drawer checks `drawerCollapsed` state to hide during drag

### CSS Animation
- Added `@keyframes slide-in` to `src/app.css`
- `.animate-slide-in` class: `animation: slide-in 0.2s ease-out`
- Drawer slides in from right (translateX(100%) → translateX(0))

### Conditional Classes Pattern
- Svelte: `class:bg-[#909d63]={isSelected}` directive
- React: Helper function returning class string
```tsx
function getBackgroundClass() {
  if (isSelected) return "bg-[#909d63]";
  if (isDragOver) return "bg-[#2a2a2a]";
  if (!isCurrentMonth) return "bg-[#1c1c1c]";
  return "bg-[#232323]";
}
```

### Subtask Toggle Pattern
- Load `TaskFull` data for tasks with `json_path`
- Cache in `Map<string, TaskFull>` state
- Toggle subtask status and update via `invoke("update_task_and_sync", ...)`
- Auto-update task status to `awaiting_review` when all subtasks done

### Keyboard Handling
- Separate useEffect for keydown listener
- Escape key closes drawer
- Cleanup removes event listener

### LSP Route Errors
- `Argument of type '"/agenda"' is not assignable to parameter of type '"/"'`
- Expected during incremental migration - TanStack Router types regenerate on build
- Same pattern seen in other migrated routes (settings, logs, projects)

## 2026-01-20: Task 16 - Tasks Route Migration

### Files Created
- `src/routes/tasks.tsx` - Layout with project selector and "Começar" button
- `src/routes/tasks/route.tsx` - Main tasks list page

### Route Structure
- Layout route: `createFileRoute("/tasks")` with `<Outlet />` for children
- Index route: `createFileRoute("/tasks/")` (trailing slash for index)
- Same pattern as `/projects` route

### Layout Component
- Project selector dropdown (disabled when editing task)
- "Começar" button to launch tmux workflow
- Resets `selectedProjectId` to null on mount (shows "Todos")
- Uses `useLocation().pathname` to detect if editing task

### Page Component - State Management
- `tasks: Task[]` - all tasks from database
- `taskFullCache: Map<string, TaskFull>` - cached full task data with subtasks
- `projectPath: string | null` - path for selected project
- `deleteConfirmId: string | null` - task pending delete confirmation

### Svelte → React Patterns
- `$state([])` → `useState<Task[]>([])`
- `$derived(...)` → computed inline (filteredTasks, pendingTasks, doneTasks)
- `$effect(() => loadTasks())` → `useEffect(() => { ... }, [loadTasks])`
- `{#each tasks as task}` → `tasks.map((task) => ...)`
- `{@const taskSubtasks = ...}` → computed inside map callback

### Event Listener Pattern
- Svelte: `listen()` in `$effect`, `onDestroy` for cleanup
- React: `listen()` in `useEffect`, return cleanup function
- Store unlisten in `useRef` to avoid stale closure

### Delete Confirmation Pattern
- Click once: set `deleteConfirmId` to task id
- Click again within 3s: execute delete
- Timeout resets `deleteConfirmId` to null
- Uses functional setState to avoid stale closure: `setDeleteConfirmId((current) => ...)`

### Inline SVG Icons
- Svelte version uses inline SVG for Check and Trash2 icons
- React version preserves same SVGs (no lucide-react dependency)
- SVG attributes: `stroke-width` → `strokeWidth`, `stroke-linecap` → `strokeLinecap`

### Subtask Toggle Pattern
- Load `TaskFull` from cache
- Map subtasks to toggle status
- Auto-update task status to `awaiting_review` when all subtasks done
- Update via `invoke("update_task_and_sync", ...)`
- Update cache with functional setState

### Task-Updated Event
- Listens for `task-updated` Tauri event
- When source is "ai", reloads task from JSON and syncs to database
- Updates cache and reloads task list

### LSP Route Errors
- `Argument of type '"/tasks/"' is not assignable to parameter of type '"/"'`
- `Type '"/tasks/$taskId"' is not assignable to type '"/" | "." | ".."'`
- Expected during incremental migration - TanStack Router types regenerate on build

## 2026-01-20: Task 17 - Task Detail Route + Subtask Components Migration

### Files Created
- `src/routes/tasks/$id.tsx` - Task detail page with full editing capabilities
- `src/components/tasks/SubtaskList.tsx` - Subtask list with reordering
- `src/components/tasks/SubtaskItem.tsx` - Individual subtask with expand/collapse

### Route Structure
- Dynamic route: `createFileRoute("/tasks/$id")` with `$id` param
- Uses `Route.useParams()` to get `id` from URL
- Navigates back to `/tasks` on goBack

### Component Decomposition Pattern
Large page split into focused subcomponents:
- `TaskHeader` - Title, sync, category/priority selects, status indicators
- `ConflictWarning` - AI conflict warning banner
- `TaskStateBar` - State indicator + action buttons (structure, execute, review)
- `ActionButton` - Reusable action button with suggested state
- `DescriptionSection` - Task description textarea
- `BusinessRulesSection` - Business rules list with add/remove
- `TechnicalNotesSection` - Collapsible technical notes
- `AcceptanceCriteriaSection` - Collapsible acceptance criteria list
- `ConfigSection` - Initialized toggle
- `MetadataSection` - AI metadata JSON display
- Icon components: `SpinnerIcon`, `CheckIcon`, `RefreshIcon`, `BotIcon`, etc.

### State Management Pattern
- Multiple `useState` for local UI state (loading, saving, syncing, etc.)
- `useRef` for values needed in async callbacks (lastKnownModifiedAt, unlisten functions)
- `useCallback` for functions passed to children or used in useEffect dependencies

### OpenCode Service Integration
- `openCodeService.onSessionIdle` - Reload task when AI completes work
- `openCodeService.onFileChange` - Reload when workopilot data changes
- `openCodeService.onConnectionChange` - Track connection status
- All subscriptions cleaned up in useEffect return

### Tauri Event Listener Pattern
```typescript
listen<TaskUpdatedPayload>("task-updated", async (event) => {
  if (event.payload.task_id === taskId && event.payload.source === "ai") {
    await loadTask(true)
    setAiUpdatedRecently(true)
    setTimeout(() => setAiUpdatedRecently(false), 5000)
  }
}).then((fn) => {
  unlistenRef.current = fn
})
```

### Task State Flow
- `pending` - Not initialized, needs structuring
- `ready_to_execute` - Initialized, can execute
- `in_progress` - Has subtask in progress
- `awaiting_review` - All subtasks done, needs review
- `done` - Task completed

### Suggested Action Logic
- `pending` → suggest "structure"
- `awaiting_review` → suggest "review"
- `ready_to_execute` with no subtasks → suggest "execute_all"
- `ready_to_execute` with pending subtasks → suggest "execute_subtask"

### SubtaskList Component
- Manages `expandedIds` Set for expand/collapse state
- `sortedSubtasks` computed with useMemo
- `moveUp`/`moveDown` functions for reordering
- Renders `SubtaskItem` for each subtask

### SubtaskItem Component
- Local `newCriteria` state for adding acceptance criteria
- `isDone` and `hasDetails` derived from props
- Expand/collapse with chevron rotation animation
- Inline editing for description, criteria, technical notes

### Type Handling
- `modified_at` in TaskFull is `string | null | undefined`
- Use `?? null` when assigning to `string | null` ref
- Example: `lastKnownModifiedAtRef.current = taskToSave.modified_at ?? null`

### CSS Animations
- `animate-fade-in` - Fade in with slight translateY
- `animate-slide-down` - Slide down for expand/collapse
- `animate-pulse` - For AI updated indicator
- `animate-spin` - For loading spinners

### LSP Route Errors (Expected)
- `Property 'id' does not exist on type '{}'` - Route params not generated yet
- `Type '"/tasks/$id"' is not assignable to type '"/"'` - Route not in generated types
- These resolve after TanStack Router plugin regenerates types on build

## 2026-01-20: Type Import Path Update

### Change Made
- Moved `src/lib/types.ts` → `src/types.ts`
- Updated all imports from `$lib/types` or `../../lib/types` to correct relative paths

### Files Updated (10 total)
- `src/services/structuringMonitor.ts` → `../types`
- `src/components/tasks/SubtaskList.tsx` → `../../types`
- `src/components/tasks/SubtaskItem.tsx` → `../../types`
- `src/components/agenda/TaskChip.tsx` → `../../types`
- `src/components/agenda/Calendar.tsx` → `../../types`
- `src/components/agenda/UnscheduledPanel.tsx` → `../../types`
- `src/components/agenda/UnscheduledTask.tsx` → `../../types`
- `src/components/agenda/CalendarDay.tsx` → `../../types`
- `src/components/agenda/DayDrawer.tsx` → `../../types`
- `src/components/agenda/DayTaskItem.tsx` → `../../types`

### Import Path Pattern
- Services (`src/services/`) → `../types`
- Components (`src/components/*/`) → `../../types`
- `$lib/` alias no longer used (SvelteKit remnant)

## 2026-01-20: Tasks Index Route Full Parity

### Restored Features
- New task form with title input, category select, priority select, "Adicionar" button
- Task list with subtasks inline display
- Delete confirmation (click once to arm, click again to confirm, 3s timeout)
- "Revisar" button when all subtasks done
- "Codar >" button for task workflow
- Subtask toggle and "Codar >" per subtask
- Done tasks section with opacity-50
- `task-updated` event listener for AI sync

### Invoke Commands Used
- `get_tasks` - Load all tasks
- `get_task_full` - Load task with subtasks from JSON
- `get_project_with_config` - Get project path
- `create_task_with_json` - Create new task
- `update_task_status` - Toggle task done/pending
- `update_task_and_sync` - Save task changes to JSON + DB
- `delete_task_full` - Delete task and JSON file
- `launch_task_workflow` - Start coding workflow
- `launch_task_review` - Start review workflow

### State Management
- `tasks: Task[]` - All tasks from DB
- `taskFullCache: Map<string, TaskFull>` - Cached full task data
- `projectPath: string | null` - Selected project path
- `deleteConfirmId: string | null` - Task pending delete confirmation
- Form state: `newTaskTitle`, `newTaskPriority`, `newTaskCategory`

### Event Listener Pattern
```typescript
useEffect(() => {
  loadTasks();
  let unlisten: UnlistenFn | null = null;
  listen<TaskUpdatedPayload>("task-updated", async (event) => {
    if (event.payload.source === "ai") {
      // reload and sync task
    }
  }).then((fn) => { unlisten = fn; });
  return () => { if (unlisten) unlisten(); };
}, []);
```

### Derived Values
- `filteredTasks` - Tasks for selected project (useMemo)
- `pendingTasks` - Tasks not done (useMemo)
- `doneTasks` - Tasks done (useMemo)
- `getSubtasksForTask(taskId)` - Get subtasks from cache

### Tailwind Classes Preserved
- All colors: `#1c1c1c`, `#232323`, `#2a2a2a`, `#3d3a34`, `#636363`, `#d6d6d6`, `#909d63`, `#a0ad73`, `#bc5653`, `#ebc17a`, `#f5d08a`, `#6b7c5e`
- Inline SVG icons for check and trash

## 2026-01-20: Task Detail Route Full Parity ($taskId.tsx)

### Route Structure
- File: `src/routes/tasks/$taskId.tsx`
- Uses `createFileRoute("/tasks/$taskId")` with `$taskId` param
- Uses `Route.useParams()` to get `taskId` from URL

### State Management (Full Parity)
- 18 state variables matching Svelte version exactly
- `task: Task | null` - Basic task from DB
- `taskFull: TaskFull | null` - Full task with subtasks from JSON
- `projectPath: string | null` - Project path for invoke calls
- `isLoading`, `isSaving`, `isSyncing`, `syncSuccess` - Loading states
- `newRule`, `newCriteria` - Input states for adding rules/criteria
- `showTechnicalNotes`, `showAcceptanceCriteria` - Collapsible sections
- `aiUpdatedRecently`, `conflictWarning` - AI update indicators
- `isLaunchingStructure`, `isLaunchingExecuteAll`, `isLaunchingExecuteSubtask`, `isLaunchingReview` - Workflow states
- `showSubtaskSelector` - Subtask dropdown visibility
- `isOpenCodeConnected` - OpenCode connection status
- `lastKnownModifiedAt` - For conflict detection

### OpenCode Integration
- `openCodeService.onSessionIdle` - Reload task when AI completes work
- `openCodeService.onFileChange` - Reload when workopilot data changes
- `openCodeService.onConnectionChange` - Track connection status indicator
- Auto-init OpenCode if not connected

### Tauri Event Listener
- `listen<TaskUpdatedPayload>("task-updated", ...)` for AI updates
- Reloads task and shows "IA atualizou" indicator for 5s

### Task State Flow
- `getTaskState()` returns: pending | ready_to_execute | in_progress | awaiting_review | done
- `getSuggestedAction()` returns: structure | execute_all | execute_subtask | review | null
- State colors and labels match Svelte exactly

### Workflow Actions
- `structureTask()` - `invoke("launch_task_structure", ...)`
- `executeAll()` - `invoke("launch_task_execute_all", ...)`
- `executeSubtask(subtaskId)` - `invoke("launch_task_execute_subtask", ...)`
- `reviewTask()` - `invoke("launch_task_review", ...)`
- `codarSubtask(id)` - `invoke("launch_task_workflow", ...)`

### CRUD Operations
- `loadTask(isReload)` - Load task from DB + JSON
- `syncFromFile()` - Refresh from JSON file
- `saveTask(updatedTask)` - Save to JSON + DB with conflict detection
- `updateField(field, value)` - Update TaskFull field
- `updateContext(field, value)` - Update TaskFull.context field
- `addRule()`, `removeRule(index)` - Business rules CRUD
- `addCriteria()`, `removeCriteria(index)` - Acceptance criteria CRUD
- `addSubtask(title)`, `toggleSubtask(id)`, `removeSubtask(id)`, `updateSubtask(id, field, value)`, `reorderSubtasks(newList)` - Subtask CRUD

### CSS Animations (Inline Style Tag)
- `@keyframes fade-in` - For list items
- `@keyframes slide-down` - For collapsible sections
- `.animate-fade-in`, `.animate-slide-down` classes

### Tailwind Classes Preserved
- All colors match Svelte: `#1c1c1c`, `#232323`, `#2a2a2a`, `#3d3a34`, `#4a4a4a`, `#636363`, `#828282`, `#d6d6d6`, `#909d63`, `#a0ad73`, `#61afef`, `#e5c07b`, `#bc5653`, `#cc6663`
- State indicator with glow: `box-shadow: 0 0 8px ${color}40`
- Progress dots with connecting lines
- Action buttons with suggested state highlighting

## 2026-01-20: Animation CSS Consolidation

### Change Made
- Moved inline `<style>` from `$taskId.tsx` to global `app.css`
- Aligned animations with Svelte originals from `SubtaskItem.svelte`

### Svelte Animation Definitions (Source of Truth)
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-down {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

.animate-fade-in { animation: fade-in 0.2s ease-out; }
.animate-slide-down { animation: slide-down 0.3s ease-out; overflow: hidden; }
```

### Key Differences from Previous Inline Styles
- `fade-in`: Added `transform: translateY(-4px)` (was missing)
- `slide-down`: Uses `max-height` transition (was using `transform: translateY(-8px)`)
- `slide-down`: Duration is 0.3s (was 0.2s)
- `slide-down`: Has `overflow: hidden` on class (was missing)

### Files Changed
- `src/app.css` - Added keyframes and classes
- `src/routes/tasks/$taskId.tsx` - Removed inline `<style>` tag

## 2026-01-20: Task 3 - Tauri API Guards for Web Mode

### Problem
Browser crash: `Cannot read properties of undefined (reading 'metadata')` because Tauri globals (`window.__TAURI_INTERNALS__`) are missing when running in web mode (http://localhost:1420).

### Solution
Created `src/services/tauri.ts` helper module with safe wrappers:

```typescript
export function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__
}

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    return Promise.reject(new Error("TAURI_UNAVAILABLE"))
  }
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

export async function safeListen<T>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<() => void> {
  if (!isTauri()) {
    return () => {}
  }
  const { listen } = await import("@tauri-apps/api/event")
  return listen<T>(event, handler)
}

export function safeGetCurrentWindow() {
  if (!isTauri()) {
    return null
  }
  const { getCurrentWindow } = require("@tauri-apps/api/window")
  return getCurrentWindow()
}
```

### Key Patterns

1. **Detection**: `window.__TAURI_INTERNALS__` is the reliable way to detect Tauri runtime
2. **Dynamic imports**: Use `await import()` to avoid bundling issues
3. **Graceful degradation**: 
   - `safeInvoke` rejects with `TAURI_UNAVAILABLE` error
   - `safeListen` returns no-op unlisten function
   - `safeGetCurrentWindow` returns null

### Files Updated (16 total)
- `src/routes/__root.tsx` - Window focus handling
- `src/hooks/useTauriEvent.ts` - Event listener hook
- `src/routes/tasks/index.tsx` - Task list operations
- `src/routes/tasks/$taskId.tsx` - Task detail operations
- `src/routes/projects/index.tsx` - Project operations + dialog plugin
- `src/routes/settings.tsx` - Shortcut settings
- `src/routes/logs.tsx` - Session logs
- `src/components/TabBar.tsx` - Window dragging + hide
- `src/components/StructuringCompleteModal.tsx` - Workflow launches
- `src/components/agenda/Calendar.tsx` - Calendar tasks
- `src/components/agenda/DayDrawer.tsx` - Day drawer tasks
- `src/components/agenda/UnscheduledPanel.tsx` - Unscheduled tasks
- `src/services/structuringMonitor.ts` - Task monitoring

### Special Cases

1. **Dialog plugin**: For `@tauri-apps/plugin-dialog`, use dynamic import with `isTauri()` guard:
```typescript
async function selectPath() {
  if (!isTauri()) return;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ directory: true, multiple: false });
  // ...
}
```

2. **Window operations**: `safeGetCurrentWindow()` returns null in web mode, use optional chaining:
```typescript
safeGetCurrentWindow()?.startDragging()
```

3. **Focus handling**: Check for null window before attaching listeners:
```typescript
const win = safeGetCurrentWindow();
if (win) {
  win.onFocusChanged(({ payload: focused }: { payload: boolean }) => { ... })
    .then((fn: () => void) => { unlisten = fn; });
}
```

### Result
- Web dev (http://localhost:1420) no longer crashes on load
- Tauri behavior unchanged when running in webview
- All operations gracefully fail in web mode with appropriate error handling

## 2026-01-20: Task 4 - Stale Closure Fix in task-updated Listener

### Problem
The `task-updated` event listener in `src/routes/tasks/index.tsx` had a stale closure issue. The listener was set up in a `useEffect` with empty dependency array `[]`, but referenced `tasks` state inside the callback. This meant the callback always saw the initial empty `tasks` array.

### Svelte Behavior (Reference)
Svelte's `$state` is reactive - when accessed inside callbacks, it always returns current value. The Svelte version uses `tasks.find(t => t.id === taskId)` directly and it works because `tasks` is a reactive `$state` variable.

### React Solution
Use `useRef` to hold current tasks value, updated whenever tasks state changes:

```typescript
const [tasks, setTasks] = useState<Task[]>([]);
const tasksRef = useRef<Task[]>([]);

const loadTasks = useCallback(async () => {
  const data = await safeInvoke<Task[]>("get_tasks").catch(() => []);
  setTasks(data);
  tasksRef.current = data;
}, []);

// In event listener (empty deps is fine now)
safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
  if (event.payload.source === "ai") {
    const task = tasksRef.current.find((t) => t.id === taskId);
    // ...
  }
});
```

### Key Pattern
- `useRef` holds mutable value that persists across renders
- Update ref whenever state changes (in the same function that updates state)
- Access `ref.current` in callbacks to get current value
- No need to add ref to dependency arrays (refs are stable)

### Alternative Approaches (Not Used)
1. **Add tasks to deps**: Would cause re-subscription on every tasks change (memory leak risk, performance)
2. **Functional setState**: `setTasks(prev => ...)` - doesn't help when you need to read state, not update it
3. **useCallback with tasks dep**: Same re-subscription issue

## 2026-01-20: Agenda Route - Side Panel + Drawer Parity

### Layout Structure (Svelte → React)
- UnscheduledPanel: `w-1/3 min-w-[280px] max-w-[360px]` (left)
- Calendar: `flex-1 p-4 overflow-hidden` (center)
- DayDrawer: Fixed overlay (right, z-50)

### Main container class
- Svelte: `class="flex-1 flex overflow-hidden"`
- React: `className="flex-1 flex overflow-hidden"` (identical)

### State Management
- `useAgendaStore` provides: `selectedDate`, `setSelectedDate`
- Components already use store internally (Calendar, UnscheduledPanel, DayDrawer)
- Route only needs `setSelectedDate` for drawer close handler

### Ref Pattern for Imperative API
```tsx
const calendarRef = useRef<CalendarRef>(null);
const panelRef = useRef<UnscheduledPanelRef>(null);

function handleTaskScheduled() {
  calendarRef.current?.refresh();
  panelRef.current?.refresh();
}
```

### Projects Loading
- Svelte: `$effect(() => loadProjects())`
- React: `useEffect(() => { loadProjects(); }, [])`
- Projects passed to UnscheduledPanel for filter dropdown

### Handler Wiring
- `handleDrawerClose`: `setSelectedDate(null)` - clears selection, closes drawer
- `handleTaskScheduled`: Refreshes both calendar and panel after drag-drop
- `handleTaskChange`: Same as above, used by DayDrawer for subtask changes

## 2026-01-20: Task - Projects Settings Route Migration

### Route Structure
- File: `src/routes/projects/settings.tsx`
- Uses `createFileRoute("/projects/settings")` pattern
- Child route of `/projects` layout

### State Management
- `projectConfig: ProjectWithConfig | null` - Full project config with routes and tmux
- `deleteTarget: { type, id, name } | null` - For delete confirmation dialog
- `draggingRouteIndex`, `draggingTabIndex` - For drag-and-drop reordering
- `useRef` for throttle timestamps: `lastRouteSwapRef`, `lastTabSwapRef`

### Svelte → React Patterns
- `$state([])` → `useState<T[]>([])`
- `bind:value={route.path}` → `value={route.path}` + `onChange` + `onBlur`
- `animate:flip` → No built-in equivalent (drag reorder works without animation)
- `{@const routeName = ...}` → Computed inside map callback

### Immutable State Updates
Svelte allows direct mutation; React requires immutable updates:
```typescript
// Svelte
projectConfig.routes = [...projectConfig.routes, newRoute];

// React
setProjectConfig({ ...projectConfig, routes: [...projectConfig.routes, newRoute] });

// Nested update
setProjectConfig({
  ...projectConfig,
  tmux_config: { ...projectConfig.tmux_config, tabs: newTabs },
});
```

### Drag and Drop Pattern
- `onDragStart`, `onDragOver`, `onDragEnd` handlers
- Throttle swaps with `useRef` timestamp (100ms minimum between swaps)
- Clone element for drag image: `e.dataTransfer.setDragImage(clone, ...)`
- Use `e.nativeEvent.offsetX/Y` for drag image position (not `e.offsetX`)

### Dialog Plugin Integration
- Guard with `isTauri()` before importing `@tauri-apps/plugin-dialog`
- `openDialog()` before `open()`, `closeDialog()` in finally block
- Prevents window auto-hide while file picker is open

### Type Inference Issue
- `typeof projectConfig.tmux_config` fails when `projectConfig` can be null
- Use explicit type: `ProjectWithConfig["tmux_config"]`

### LSP Route Errors (Expected)
- `Argument of type '"/projects/settings"' is not assignable to parameter of type 'keyof FileRoutesByPath'`
- TanStack Router types regenerate on build - error resolves after build

### Invoke Commands Used
- `get_project_with_config` - Load project with routes and tmux config
- `update_project_routes` - Save routes array
- `update_project_tmux_config` - Save tmux config
- `update_project` - Save name and description
- `update_project_business_rules` - Save business rules
- `delete_project` - Delete project and associated data
- `open_env_file` - Open .env file in editor
- `get_projects` - Reload projects list after delete

## 2026-01-20: Task 5 - Projects Page Full Parity

### Missing Features Restored
1. **Edit project name flow**: `isEditingProjectName` state, inline input with Enter/Escape handlers, ok/x buttons
2. **Weekly tasks placeholder**: "Tarefas da Semana" section with calendar emoji and "Em desenvolvimento" message
3. **Tmux config status**: Shows configured/not configured state with mark configured button
4. **Links to settings/logs/tasks**: "ver todas", "ver todos", "configurar" links
5. **Codar button**: Main action button with chevron icon in header

### Layout Changes (Svelte Parity)
- Removed sidebar (Svelte version doesn't have project list sidebar in main view)
- Changed container from `<main>` to `<div className="flex-1 overflow-y-auto p-4">`
- Matched exact section order: header → urgent tasks → tokens/logs row → weekly tasks → tmux config

### New Invoke Commands
- `set_tmux_configured` - Mark tmux as configured
- `update_project_name` - Update project name
- `add_project` - Create new project (was `create_project`)

### Link Pattern for Unregistered Routes
TanStack Router's `/projects/settings` route exists but isn't in generated types. Used `<a href>` instead of `<Link to>`:
```tsx
<a href={`/projects/settings?projectId=${selectedProjectId}`} className="...">
  configurar
</a>
```

### Array.at() Compatibility
TypeScript target doesn't support `Array.at()`. Use index access instead:
```typescript
// Before
setNewProjectName(parts.at(-1) || "");

// After
setNewProjectName(parts[parts.length - 1] || "");
```

### Tailwind Classes Preserved
All colors and spacing match Svelte exactly:
- Cards: `bg-[#232323] border border-[#3d3a34] p-4`
- Text: `text-[#d6d6d6]`, `text-[#828282]`, `text-[#636363]`
- Buttons: `bg-[#909d63] text-[#1c1c1c]`, `bg-[#2c2c2c] border border-[#3d3a34]`
- Status icons: `text-[#909d63]` (configured), `text-[#ebc17a]` (not configured)

## 2026-01-20: Fix - CommonJS require in Tauri Web Guard

### Problem
Tauri runtime crash: "Can't find variable: require" because `safeGetCurrentWindow()` used CommonJS `require()` which doesn't exist in browser/Tauri webview.

### Solution
Changed `safeGetCurrentWindow` from sync with `require()` to async with dynamic `import()`:

```typescript
// Before (broken)
export function safeGetCurrentWindow() {
  if (!isTauri()) return null
  const { getCurrentWindow } = require("@tauri-apps/api/window")
  return getCurrentWindow()
}

// After (fixed)
export async function safeGetCurrentWindow() {
  if (!isTauri()) return null
  const { getCurrentWindow } = await import("@tauri-apps/api/window")
  return getCurrentWindow()
}
```

### Call Sites Updated
1. `TabBar.tsx` - `handleMouseDown` became async, uses `await safeGetCurrentWindow()`
2. `__root.tsx` - Changed to `.then()` chain for window focus listener setup

### Key Learning
- Never use `require()` in browser/Tauri code - it's Node.js only
- Dynamic `import()` works in all environments (browser, Node, Tauri)
- When converting sync to async, update all call sites to await/then

## 2026-01-20: Task Full Cache Refresh Parity

### Problem
Effect that calls `loadAllTaskFulls()` used `[tasks.length]` as dependency. This meant content changes with same array length (e.g., task status update) wouldn't trigger cache refresh.

### Svelte Behavior
Svelte's `$effect` reacts to any change in reactive state. When `tasks` array content changes (even if length stays same), the effect re-runs.

### React Solution
Changed dependency from `[tasks.length]` to `[tasks]`:

```typescript
useEffect(() => {
  if (tasks.length > 0) {
    loadAllTaskFulls();
  }
}, [tasks]);
```

### Key Learning
- `[tasks.length]` only triggers on length changes
- `[tasks]` triggers on any array reference change (which happens on every `setTasks()`)
- For parity with Svelte reactivity, use the full state value as dependency

## 2026-01-20: Projects Layout Sidebar Parity

### Changes Made
- `src/routes/projects.tsx` - Added full sidebar matching Svelte `+layout.svelte`
- `src/routes/projects/index.tsx` - Added `newProject` search param validation with Zod

### Sidebar Structure (Svelte Parity)
```tsx
<aside className="w-56 border-r border-[#3d3a34] flex flex-col bg-[#232323]">
  <div className="p-3 border-b border-[#3d3a34]">
    <span className="text-xs text-[#828282] uppercase tracking-wide">Projetos</span>
  </div>
  <ul className="flex-1 overflow-y-auto p-2">
    {/* Project list */}
  </ul>
  {!isSettingsPage && (
    <div className="p-2 border-t border-[#3d3a34]">
      {/* Novo Projeto button */}
    </div>
  )}
</aside>
```

### Layout Pattern
- `<main className="flex flex-1 overflow-hidden">` wraps sidebar + content
- Sidebar: `w-56 border-r border-[#3d3a34] flex flex-col bg-[#232323]`
- Content: `<section className="flex-1 flex flex-col overflow-hidden"><Outlet /></section>`

## 2026-01-20: Select className + SubtaskItem Save-on-Blur Parity

### Select Component - className Prop
- Svelte: `class?: string` prop passed to select element as `{className}`
- React: `className?: string` prop already implemented, concatenated with base classes
- No changes needed - React version already had parity

### Select Usages - className Values
- `UnscheduledPanel.tsx` - First Select: `className="w-full"`, Second/Third: `className="flex-1"`
- `settings.tsx` - No className needed (Svelte version also has no class prop on Select)

### SubtaskItem - Save-on-Blur Pattern
Svelte `onchange` on textarea fires on blur (native HTML behavior). React `onChange` fires on every keystroke.

**Svelte Pattern:**
```svelte
<textarea
  value={subtask.description || ''}
  onchange={(e) => onUpdate(subtask.id, 'description', e.currentTarget.value || null)}
/>
```

**React Pattern (Fixed):**
```tsx
const [description, setDescription] = useState(subtask.description || "")
const [technicalNotes, setTechnicalNotes] = useState(subtask.technical_notes || "")

useEffect(() => {
  setDescription(subtask.description || "")
  setTechnicalNotes(subtask.technical_notes || "")
}, [subtask.description, subtask.technical_notes])

<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  onBlur={() => onUpdate(subtask.id, "description", description || null)}
/>
```

**Key Points:**
- Local state for controlled input (responsive typing)
- `useEffect` syncs local state when prop changes (external updates)
- `onBlur` triggers save (matches Svelte `onchange` behavior)
- Same pattern for both `description` and `technical_notes` textareas

## 2026-01-20: Tasks Layout Header Parity

### Changes Made
- `src/routes/tasks.tsx` - Added header with project selector and "Começar" button

### Layout Structure (Svelte Parity)
```tsx
<main className="flex-1 flex flex-col overflow-hidden">
  <div className="flex items-center justify-between gap-4 p-3 border-b border-[#3d3a34] bg-[#232323]">
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#828282]">Projeto:</span>
      <Select ... />
    </div>
    <button className="px-6 py-2 bg-[#909d63] ...">Começar</button>
  </div>
  <Outlet />
</main>
```

### Key Patterns
- `useLocation().pathname !== "/tasks"` for `isEditingTask` detection
- `useEffect(() => setSelectedProjectId(null), [])` resets selection on mount
- `safeInvoke("launch_project_tmux", { projectId })` for workflow start
- Select accepts `className` prop for conditional styling (e.g., `opacity-50 pointer-events-none` when editing)

### Tailwind Classes Preserved
- Header: `flex items-center justify-between gap-4 p-3 border-b border-[#3d3a34] bg-[#232323]`
- Label: `text-xs text-[#828282]`
- Button: `px-6 py-2 bg-[#909d63] text-[#1c1c1c] text-sm font-medium hover:bg-[#a0ad73] disabled:bg-[#3d3a34] disabled:text-[#636363] disabled:cursor-not-allowed transition-colors flex items-center gap-2`

### LSP Route Error (Pre-existing)
- `Argument of type '"/tasks"' is not assignable to parameter of type 'undefined'`
- Same error exists in `projects.tsx` - TanStack Router types issue, not introduced by this change

### Project Selection Logic
- `isSettingsPage` derived from `location.pathname.includes("/settings")`
- On settings page: clicking selected project navigates back to `/projects`
- On settings page: other projects are disabled (opacity-50, cursor-not-allowed)
- On main page: clicking project sets `selectedProjectId` in store

### URL Param Auto-Open Form
- `src/routes/projects/index.tsx` validates `newProject` search param with Zod
- `useState(search.newProject === "true")` initializes form visibility
- Navigate with `navigate({ to: "/projects", search: { newProject: "true" } })`

### TanStack Router Search Params
```tsx
const searchSchema = z.object({
  newProject: z.string().optional(),
});

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  validateSearch: (search) => searchSchema.parse(search),
});

// In component
const search = useSearch({ from: "/projects/" });
const [showForm, setShowForm] = useState(search.newProject === "true");
```

## 2026-01-20: Select Component className Prop Parity

### Change Made
- Added `className` prop to `src/components/Select.tsx`
- Updated `src/routes/tasks.tsx` to pass className directly instead of wrapping in div

### Svelte Pattern
```svelte
<Select
  value={$selectedProjectId || ''}
  options={getProjectOptions()}
  onchange={(v) => selectedProjectId.set(v || null)}
  class={isEditingTask ? 'opacity-50 pointer-events-none' : ''}
/>
```

### React Pattern (Now Matching)
```tsx
<Select
  value={selectedProjectId || ""}
  options={getProjectOptions()}
  onChange={(v) => setSelectedProjectId(v || null)}
  className={isEditingTask ? "opacity-50 pointer-events-none" : ""}
/>
```

### Implementation
- `className` prop with default empty string
- Appended to base classes with template literal: `className={\`...base classes... ${className}\`}`

## 2026-01-20: Search Param Sync with useEffect

### Problem
`showNewProjectForm` state only initialized from `search.newProject` on mount. Clicking "+ Novo Projeto" button (which navigates with `search: { newProject: "true" }`) after mount didn't open the form because React state doesn't automatically sync with URL changes.

### Svelte Behavior
Svelte uses `$derived` and `$effect` for reactive URL param sync:
```svelte
let shouldShowNewProject = $derived($page.url.searchParams.get('newProject') === 'true');

$effect(() => {
  if (shouldShowNewProject) {
    showNewProjectForm = true;
  }
});
```

### React Solution
Add `useEffect` to sync state when search param changes:
```typescript
const [showNewProjectForm, setShowNewProjectForm] = useState(search.newProject === "true");

useEffect(() => {
  if (search.newProject === "true") {
    setShowNewProjectForm(true);
  }
}, [search.newProject]);
```

### Key Pattern
- Initial state from search param: `useState(search.param === "value")`
- Sync on changes: `useEffect` with `[search.param]` dependency
- Only set to `true` (not toggle) - matches Svelte `$effect` behavior
