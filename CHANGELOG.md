# Changelog

All notable changes to WorkoPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-01-21

### Changes
- chore: bump version to v0.2.0
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
- port
- resize textarea
- port
- react
- Better edit task
- Image input + fix task stats
- UI/UX página de tarefas
- Quickfix + better task tools UX
- WorkOpilot launch

## [0.2.0] - 2026-01-21

### Added
- Substatus system for granular task state tracking (structuring/executing/awaiting_user/awaiting_review)
- Task page UI with conditional buttons based on task state
- Color-coded status indicators throughout the app
- AUR publish script with auto version bump
- CHANGELOG.md for tracking releases

### Changed
- Migrated from Svelte to React with TanStack Router
- Redesigned logs page with optimized SQLite-based pagination
- Improved task list ordering (non-pending tasks first)

### Fixed
- "Executar Tudo" button now disabled when all subtasks are complete
- Task status transitions are now consistent

## [0.1.0] - 2026-01-20

### Added
- Initial release
- Project and task management
- AI-powered task structuring and execution
- Tmux integration for terminal sessions
- Calendar view for task scheduling
- Global shortcut (Alt+P)
- System tray support
