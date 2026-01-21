# Changelog

All notable changes to WorkoPilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
