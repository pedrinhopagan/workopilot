# Issues - React Migration

## 2026-01-20: Task 1 - Package.json Update

No issues encountered. Clean install with 5 packages removed (Svelte ecosystem).

## 2026-01-20: AppImage Bundling Blocker

**Status**: BLOCKER (for AppImage only)

**Error**: `failed to run linuxdeploy`

**Impact**: 
- `tauri build` cannot produce AppImage bundles
- deb and rpm bundles work fine

**Cause**: linuxdeploy tool is missing or not properly configured on the system. This is an external tooling issue, not a code problem.

**Workaround**: Distribute via deb/rpm packages instead of AppImage until linuxdeploy is installed/fixed.
