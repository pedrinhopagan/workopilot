# COMPONENTS (src/components)

## OVERVIEW

Shared UI components plus feature-specific components for tasks and agenda. Uses shadcn/ui primitives and Tailwind CSS tokens.

## STRUCTURE

```
components/
├── ui/                 # shadcn/ui primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── custom-select.tsx # Generic select with custom rendering
│   └── ...
├── tasks/              # task-specific components
├── agenda/             # agenda components
├── TabBar.tsx
├── PageHeader.tsx
├── ProjectSelect.tsx
├── HotkeyInput.tsx
```

## UI COMPONENTS

### CustomSelect

Generic select with custom item rendering. Use when items need complex UI (icons, badges, actions).

```tsx
<CustomSelect
  items={items}                    // T extends { id: string }
  onValueChange={(id, item) => {}} // returns id and full item
  renderItem={(item) => <MyItem />}
  renderTrigger={() => <MyTrigger />}
  label="Selecione um item"        // optional header
  triggerClassName="..."           // trigger styling
  contentClassName="..."           // dropdown styling
/>
```

**Props:**
- `items: T[]` - Array of objects with `id: string`
- `onValueChange: (value: string, item: T) => void`
- `renderItem: (item: T, isSelected: boolean) => ReactNode`
- `renderTrigger?: () => ReactNode` - Custom trigger content
- `label?: string` - Dropdown header text
- `align?: "start" | "center" | "end"`
- `side?: "top" | "bottom" | "left" | "right"`

## CONVENTIONS

- Use `cn()` from `src/lib/utils` for class merging.
- Tailwind + CSS variables for colors and spacing.
- Portuguese UI text (labels, buttons, helpers).
- `Props` types defined above component; named exports.
- Use `CustomSelect` for all dropdown implementations.

## ANTI-PATTERNS

- Hardcoded hex colors or inline style colors
- Large components without extracting subcomponents/hooks
- Manual dropdown with useState when CustomSelect works