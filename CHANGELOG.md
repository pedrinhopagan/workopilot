# Changelog

All notable changes to WorkoPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
