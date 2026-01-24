# ROUTES (src/routes)

## OVERVIEW

TanStack Router file-based routing. Layout routes live at `routes/<segment>.tsx` with content in `routes/<segment>/index.tsx`.

## STRUCTURE

```
routes/
├── __root.tsx          # global layout + shortcuts
├── index.tsx           # redirects to /home
├── home.tsx            # layout
├── home/index.tsx      # page
├── tasks.tsx           # layout
├── tasks/index.tsx     # page
├── tasks/$taskId.tsx   # detail
├── projects.tsx        # layout
├── projects/index.tsx  # page
├── projects/settings.tsx
├── agenda.tsx          # layout
├── agenda/index.tsx
├── settings.tsx
└── logs.tsx
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Global shortcuts | `src/routes/__root.tsx` | Alt+1..4/0 navigation |
| Task routes | `src/routes/tasks/` | list + detail + utils |
| Project settings | `src/routes/projects/settings.tsx` | large, complex UI |
| Search schemas | `src/lib/searchSchemas.ts` | route search validation |

## CONVENTIONS

- `index.tsx` is the content route for a segment.
- `$param.tsx` defines dynamic segments.
- `-components/` and `-utils/` are private modules (not routes).
- RouteTree is auto-generated on save.

## ANTI-PATTERNS

- Edit `src/routeTree.gen.ts` (auto-generated)
- Create route files inside `-components/` or `-utils/`
