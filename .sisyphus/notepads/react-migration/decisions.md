# Decisions - React Migration

## 2026-01-20: Task 1 - Package.json Update

### Version choices
- React 19: Latest stable, required for @types/react@^19 compatibility
- TanStack Router v1: Stable release with file-based routing
- Zustand v5: Latest with improved TypeScript support
- @vitejs/plugin-react v4: Compatible with Vite 5.x

### Script removal rationale
- `check` script removed entirely since it depended on svelte-kit sync and svelte-check
- Will need new type-check script later (tsc --noEmit or similar)

## 2026-01-20: Task 4 - Zustand Stores

### dialogState: Counter vs Boolean
Plan specified `openDialogCount` counter instead of Svelte's `isDialogOpen` boolean. This allows tracking multiple nested dialogs - window hide-on-blur should only trigger when count reaches 0.

### structuringNotification: Set in Store State
Svelte used module-level `Set<string>` for `alreadyNotifiedTaskIds`. Zustand stores this in state as `notifiedTaskIds: Set<string>`. When updating, creates new Set to trigger reactivity.

### Store Organization
- One store per domain (selectedProject, dialogState, agenda, structuringNotification)
- Naming: `use[Feature]Store`
- Location: `src/stores/[feature].ts`

## 2026-01-20: Task 6 - Services Migration

### Callback Pattern vs Stores
OpenCode service originally used Svelte stores (`openCodeConnected`, `openCodeError`) for reactive state. Migrated to callback-based pattern:
- `onConnectionChange(cb)` / `onError(cb)` return unsubscribe functions
- Consumers (React components) can subscribe and update their own state
- Service remains framework-agnostic

### Zustand Store Access in Non-React Code
StructuringMonitor is a plain service (not a React component). To access Zustand store:
- Use `useStore.getState()` for synchronous access
- Avoids hook rules violation
- Pattern: `useStructuringNotificationStore.getState().showNotification(...)`

### Import Paths
- `$lib/types` works because SvelteKit tsconfig still active
- `@/` alias only in Vite, not tsconfig - use relative paths for TypeScript
- Future: Update tsconfig.json with `paths: { "@/*": ["./src/*"] }` when SvelteKit removed

## 2026-01-20: Component Parity Fixes

### Type Aliases Preference
User prefers `type` over `interface` for component props. This aligns with calibration notes: "type always, interface only when necessary (extends, declaration merging)".

### Select Props Scope
Svelte Select has `class?: string` prop but it's for internal styling composition. React version should NOT expose `className` prop - consumers should wrap in a div if custom styling needed. This maintains strict parity.

### Error Handling Pattern
StructuringCompleteModal async handlers must use try/catch/finally (not .catch()) to ensure:
1. Navigation only happens on success
2. State cleanup always happens (finally)
3. Matches Svelte behavior exactly

## 2026-01-20: tsconfig.json Update

### Keep Updated Configuration
Keeping the React-focused tsconfig.json with Svelte references removed. Rationale:
- LSP diagnostics are clean (no errors)
- Svelte-specific config no longer needed
- Cleaner configuration for React-only codebase