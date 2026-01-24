# Changelog

All notable changes to WorkoPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.4] - 2026-01-24

### Changes
- fixes queries
- chore: bump version to v0.6.3
- fix(sidecar): use nullish() for optional filters in listFullPaginated
- chore: bump version to v0.6.1
- chore: cleanup exports and build artifacts
- fix: convert null to undefined for priority/category filters
- fix: sync TASK_CATEGORIES with backend schema
- chore: bump version to v0.6.0
- chore: remove release artifacts from git, add to gitignore
- build
- agents md
- projects rework completed
- refactor(terminal): centralizar gerenciamento de terminal em módulo dedicado
- cleanup
- migração pra trpc concluída
- chore: update dependencies and lockfiles
- docs: update documentation and add coding standards
- refactor(routes): update all routes and add home dashboard
- refactor(frontend): update hooks, stores, types and services
- feat(lib): add taskProgressState constants and search schemas

## [0.6.3] - 2026-01-24

### Changes
- fix(sidecar): use nullish() for optional filters in listFullPaginated
- chore: bump version to v0.6.1
- chore: cleanup exports and build artifacts
- fix: convert null to undefined for priority/category filters
- fix: sync TASK_CATEGORIES with backend schema
- chore: bump version to v0.6.0
- chore: remove release artifacts from git, add to gitignore
- build
- agents md
- projects rework completed
- refactor(terminal): centralizar gerenciamento de terminal em módulo dedicado
- cleanup
- migração pra trpc concluída
- chore: update dependencies and lockfiles
- docs: update documentation and add coding standards
- refactor(routes): update all routes and add home dashboard
- refactor(frontend): update hooks, stores, types and services
- feat(lib): add taskProgressState constants and search schemas
- refactor(components): update shared components and remove deprecated
- feat(ui): add shadcn/ui component library

## [0.6.2] - 2026-01-24

### Changes
- fix(sidecar): use nullish() for optional filters in listFullPaginated
- chore: bump version to v0.6.1
- chore: cleanup exports and build artifacts
- fix: convert null to undefined for priority/category filters
- fix: sync TASK_CATEGORIES with backend schema
- chore: bump version to v0.6.0
- chore: remove release artifacts from git, add to gitignore
- build
- agents md
- projects rework completed
- refactor(terminal): centralizar gerenciamento de terminal em módulo dedicado
- cleanup
- migração pra trpc concluída
- chore: update dependencies and lockfiles
- docs: update documentation and add coding standards
- refactor(routes): update all routes and add home dashboard
- refactor(frontend): update hooks, stores, types and services
- feat(lib): add taskProgressState constants and search schemas
- refactor(components): update shared components and remove deprecated
- feat(ui): add shadcn/ui component library

## [0.6.1] - 2026-01-24

### Changes
- chore: cleanup exports and build artifacts
- fix: convert null to undefined for priority/category filters
- fix: sync TASK_CATEGORIES with backend schema
- chore: bump version to v0.6.0
- chore: remove release artifacts from git, add to gitignore
- build
- agents md
- projects rework completed
- refactor(terminal): centralizar gerenciamento de terminal em módulo dedicado
- cleanup
- migração pra trpc concluída
- chore: update dependencies and lockfiles
- docs: update documentation and add coding standards
- refactor(routes): update all routes and add home dashboard
- refactor(frontend): update hooks, stores, types and services
- feat(lib): add taskProgressState constants and search schemas
- refactor(components): update shared components and remove deprecated
- feat(ui): add shadcn/ui component library
- refactor(tauri): update Rust backend commands and activity logger
- chore(cli): remove generated artifacts and lockfile

## [0.6.0] - 2026-01-24

### Changes
- chore: remove release artifacts from git, add to gitignore
- build
- agents md
- projects rework completed
- refactor(terminal): centralizar gerenciamento de terminal em módulo dedicado
- cleanup
- migração pra trpc concluída
- chore: update dependencies and lockfiles
- docs: update documentation and add coding standards
- refactor(routes): update all routes and add home dashboard
- refactor(frontend): update hooks, stores, types and services
- feat(lib): add taskProgressState constants and search schemas
- refactor(components): update shared components and remove deprecated
- feat(ui): add shadcn/ui component library
- refactor(tauri): update Rust backend commands and activity logger
- chore(cli): remove generated artifacts and lockfile
- refactor(sdk/sidecar): update TasksModule and handlers
- refactor(core): update domain entities, ports, repositories and migrations
- chore: add dist/ to gitignore - build artifacts should not be committed
- feat(cli): add sync-skills command with plugin auto-sync

## [0.5.0] - 2026-01-22

### Changes
- chore: update dependencies and build artifacts
- fix(sidecar): handle projectId/project_id naming in handlers
- refactor(tasks): update route files and shared components
- feat(tasks): add /tasks/$taskId components for task editing
- feat(tasks): add /tasks/$taskId utils with React Hook Form + Zod
- feat(tasks): add /tasks components with new structure
- feat(tasks): add /tasks utils with TanStack Query hooks
- feat(hooks): add global useUpdateTask hook with TanStack Query
- refactor(cli): update CLI for new task status values
- refactor(tauri): update Rust backend for new task schema
- refactor(core): simplify task status to pending/in_progress/done
- chore: bump version to v0.4.1
- release: v0.4.0
- Cleanup + rework back
- feat(agenda): add AI-powered task distribution across selected dates
- feat(tasks): add collapsible images section to task detail page
- refactor(tasks): extract ImageThumbnail component with confirmation dialog
- feat(cli): add --scheduled-date option to update-task command
- refactor(skills): centralize skills in ~/.config/opencode/skills/ and fix substatus updates
- feat(components): add SelectFolderKDE and SelectImageKDE with dialog state management

## [0.4.1] - 2026-01-22

### Changes
- release: v0.4.0
- Cleanup + rework back
- feat(agenda): add AI-powered task distribution across selected dates
- feat(tasks): add collapsible images section to task detail page
- refactor(tasks): extract ImageThumbnail component with confirmation dialog
- feat(cli): add --scheduled-date option to update-task command
- refactor(skills): centralize skills in ~/.config/opencode/skills/ and fix substatus updates
- feat(components): add SelectFolderKDE and SelectImageKDE with dialog state management
- feat(opencode): improve prompt format for better OpenCode session titles
- feat: add manual status update with chip-styled dropdown
- feat: add AUR publish script with auto version bump and changelog
- chore: cleanup - update build artifacts
- chore: update build artifacts
- feat(tasks): add substatus system and improve task UI
- feat(logs): redesign UI with optimized SQLite-based pagination
- feat(projects): add drag and drop reordering for sidebar projects
- feat(settings): replace select dropdowns with modern hotkey recorder component
- configs para deploy
- feat(logs): UI - Pagina de Logs com Timeline
- Setup logs + publishing AUR
