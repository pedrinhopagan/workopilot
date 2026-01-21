# WorkoPilot

Your AI-powered work copilot for development. WorkoPilot helps you manage projects and tasks with AI assistance, integrating seamlessly with your terminal workflow.

## Features

- **Project Management**: Organize multiple projects with custom configurations
- **AI-Powered Tasks**: Create, structure, and execute tasks with AI assistance
- **Tmux Integration**: Launch configured terminal sessions for each project
- **Calendar View**: Schedule and track tasks with a built-in agenda
- **Global Shortcut**: Quick access with `Alt+P` (configurable)
- **System Tray**: Runs in background for instant access

## Requirements

Before installing WorkoPilot, ensure you have the following dependencies:

| Dependency | Purpose |
|------------|---------|
| **alacritty** | Terminal emulator for task execution |
| **tmux** | Terminal multiplexer for session management |
| **opencode** | AI coding assistant (install from [opencode.ai](https://opencode.ai)) |

### Linux System Libraries

WorkoPilot requires these system libraries (installed automatically via package managers):

- `webkit2gtk-4.1` - WebView rendering
- `gtk3` - GUI toolkit
- `glib2` - Core utilities
- `xdg-utils` - Desktop integration

## Installation

### Arch Linux (AUR)

```bash
yay -S workopilot-bin
```

Or with paru:

```bash
paru -S workopilot-bin
```

### Manual Installation (Linux)

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/workopilot/releases)

2. Extract and install:

```bash
tar -xzf workopilot-linux-x86_64.tar.gz
cd workopilot-linux-x86_64
sudo install -Dm755 workopilot /usr/bin/workopilot
sudo install -Dm644 workopilot.desktop /usr/share/applications/workopilot.desktop
sudo install -Dm644 icons/128x128.png /usr/share/icons/hicolor/128x128/apps/workopilot.png
```

3. Update icon cache:

```bash
sudo gtk-update-icon-cache -f /usr/share/icons/hicolor
```

### Building from Source

Requirements:
- Rust (stable)
- Node.js 18+
- Bun

```bash
git clone https://github.com/yourusername/workopilot.git
cd workopilot
bun install
bun run build
```

The binary will be at `src-tauri/target/release/workopilot`.

## Setup

### 1. Install OpenCode

WorkoPilot uses OpenCode as its AI backend. Install it first:

```bash
# Follow instructions at https://opencode.ai
# Or install via your preferred method
```

### 2. Launch WorkoPilot

Start the application:

```bash
workopilot
```

Or find it in your application menu.

### 3. Add Your First Project

1. Click **"Add Project"** in the sidebar
2. Select your project's root directory
3. WorkoPilot will auto-detect the structure (monorepo support included)
4. Configure tmux tabs for your workflow

### 4. Create Your First Task

1. Select a project from the sidebar
2. Click **"New Task"** 
3. Enter a title and description
4. Choose **"Structure"** to let AI break it into subtasks
5. Execute with **"Run All"** or step-by-step

## Usage

### Global Shortcut

Press `Alt+P` (default) to toggle WorkoPilot visibility. Configure this in Settings.

### Project Workflow

1. **Add Project**: Point to your codebase root
2. **Configure Tmux**: Set up tabs for dev server, tests, etc.
3. **Launch**: Click the play button to open your configured terminal session

### Task Workflow

1. **Create**: Add a new task with title and description
2. **Structure**: AI breaks complex tasks into subtasks
3. **Execute**: Run tasks with AI assistance in your terminal
4. **Review**: Verify completion before marking done

### Calendar

- View tasks scheduled for each day
- Drag tasks to reschedule
- Filter by project or status

## Configuration

WorkoPilot stores its data in:

- **Database**: `~/.local/share/workopilot/workopilot.db`
- **Settings**: Stored in the database

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+P` | Toggle window (configurable) |
| `Escape` | Hide window |

## Troubleshooting

### Window doesn't appear

WorkoPilot uses X11 backend. If you're on Wayland, it should work through XWayland. If issues persist:

```bash
GDK_BACKEND=x11 workopilot
```

### Tmux sessions not launching

Ensure `alacritty` and `tmux` are installed and in your PATH:

```bash
which alacritty tmux
```

### OpenCode not working

Verify OpenCode is installed and configured:

```bash
opencode --version
```

## Development

### Project Structure

```
workopilot/
├── src/                 # SvelteKit frontend
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   ├── commands.rs # Tauri commands
│   │   ├── database.rs # SQLite operations
│   │   └── ...
├── packages/
│   └── cli/            # CLI for task management
└── aur/                # AUR packaging files
```

### Running in Development

```bash
bun run dev
```

### Building

```bash
bun run build
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
