# COMPONENTS (src/components)

## OVERVIEW

Shared UI components plus feature-specific components for tasks and agenda. Uses shadcn/ui primitives and Tailwind CSS tokens.

## STRUCTURE

```
components/
├── ui/                 # shadcn/ui primitives
├── tasks/              # task-specific components
├── agenda/             # agenda components
├── TabBar.tsx
├── ProjectSelect.tsx
├── HotkeyInput.tsx
└── StructuringCompleteModal.tsx
```

## CONVENTIONS

- Use `cn()` from `src/lib/utils` for class merging.
- Tailwind + CSS variables for colors and spacing.
- Portuguese UI text (labels, buttons, helpers).
- `Props` types defined above component; named exports.

## ANTI-PATTERNS

- Hardcoded hex colors or inline style colors
- Large components without extracting subcomponents/hooks
