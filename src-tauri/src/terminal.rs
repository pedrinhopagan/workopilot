use crate::commands::{Project, TaskFull};
use crate::AppState;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::State;

pub const SESSION_NAME: &str = "workopilot";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TerminalAction {
    LaunchProject,
    FocusSession,
    Structure,
    ExecuteAll,
    ExecuteSubtask,
    Review,
}

impl TerminalAction {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "launch_project" => Ok(TerminalAction::LaunchProject),
            "focus" | "focus_session" => Ok(TerminalAction::FocusSession),
            "structure" => Ok(TerminalAction::Structure),
            "execute_all" => Ok(TerminalAction::ExecuteAll),
            "execute_subtask" => Ok(TerminalAction::ExecuteSubtask),
            "review" => Ok(TerminalAction::Review),
            _ => Err(format!("Unknown terminal action: {}", s)),
        }
    }
}

macro_rules! sidecar_call {
    ($state:expr, $method:expr) => {{
        let mut sidecar = $state.sidecar.sidecar.lock().map_err(|e| e.to_string())?;
        if !sidecar.is_running() {
            sidecar.start()?;
        }
        sidecar.call($method, None)
    }};
    ($state:expr, $method:expr, $params:expr) => {{
        let mut sidecar = $state.sidecar.sidecar.lock().map_err(|e| e.to_string())?;
        if !sidecar.is_running() {
            sidecar.start()?;
        }
        sidecar.call($method, Some($params))
    }};
}

pub fn get_project_and_task(
    state: &State<AppState>,
    project_id: &str,
    task_id: Option<&str>,
) -> Result<(Project, Option<TaskFull>), String> {
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| format!("Failed to deserialize project: {}", e))?;

    let task = if let Some(tid) = task_id {
        let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": tid }))?;
        let task_full: TaskFull = serde_json::from_value(task_result)
            .map_err(|e| format!("Failed to deserialize task: {}", e))?;
        Some(task_full)
    } else {
        None
    };

    Ok((project, task))
}

/// Format: {sanitized_project_name}-{task_id[:8]}
pub fn get_tab_name(project: &Project, task_id: &str) -> String {
    let task_short = if task_id.len() > 8 {
        &task_id[..8]
    } else {
        task_id
    };

    let safe_name: String = project
        .name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();

    format!("{}-{}", safe_name, task_short)
}

// ============================================================================
// Tmux Session Management - Centralized Functions
// ============================================================================

use std::process::Command;

/// Result type for tmux operations
pub type TmuxResult<T> = Result<T, String>;

/// Checks if the 'workopilot' session exists in tmux
pub fn session_exists() -> bool {
    Command::new("tmux")
        .args(["has-session", "-t", SESSION_NAME])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Lists all window names in the 'workopilot' session
pub fn list_windows() -> TmuxResult<Vec<String>> {
    if !session_exists() {
        return Ok(vec![]);
    }

    let output = Command::new("tmux")
        .args(["list-windows", "-t", SESSION_NAME, "-F", "#{window_name}"])
        .output()
        .map_err(|e| format!("Failed to list tmux windows: {}", e))?;

    if output.status.success() {
        let windows = String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.to_string())
            .collect();
        Ok(windows)
    } else {
        Ok(vec![])
    }
}

/// Finds a tab (window) by name in the 'workopilot' session.
/// Returns Some(window_name) if found, None otherwise.
pub fn find_tab_by_name(tab_name: &str) -> TmuxResult<Option<String>> {
    let windows = list_windows()?;
    Ok(windows.into_iter().find(|w| w == tab_name))
}

/// Selects (focuses) a tab within the tmux session.
/// This makes the tab active but doesn't bring the terminal window to front.
pub fn select_tab(tab_name: &str) -> TmuxResult<()> {
    let output = Command::new("tmux")
        .args([
            "select-window",
            "-t",
            &format!("{}:{}", SESSION_NAME, tab_name),
        ])
        .output()
        .map_err(|e| format!("Failed to select tmux window: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to select tmux window: {}", stderr))
    }
}

/// Gets the current command running in a tab's pane.
/// Used to check if opencode (node) is running.
pub fn get_pane_command(tab_name: &str) -> TmuxResult<String> {
    let output = Command::new("tmux")
        .args([
            "display-message",
            "-p",
            "-t",
            &format!("{}:{}", SESSION_NAME, tab_name),
            "#{pane_current_command}",
        ])
        .output()
        .map_err(|e| format!("Failed to get pane command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Ok(String::new())
    }
}

/// Sends keys to a specific tab in the 'workopilot' session.
pub fn send_keys(tab_name: &str, keys: &str) -> TmuxResult<()> {
    let output = Command::new("tmux")
        .args([
            "send-keys",
            "-t",
            &format!("{}:{}", SESSION_NAME, tab_name),
            keys,
            "Enter",
        ])
        .output()
        .map_err(|e| format!("Failed to send keys to tmux: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to send keys to tmux: {}", stderr))
    }
}

pub fn focus_terminal_window() -> TmuxResult<bool> {
    let clients_output = Command::new("tmux")
        .args(["list-clients", "-t", SESSION_NAME, "-F", "#{client_tty}"])
        .output()
        .map_err(|e| format!("Failed to list tmux clients: {}", e))?;

    if !clients_output.status.success() || clients_output.stdout.is_empty() {
        eprintln!("[WorkoPilot] No tmux clients attached to session");
        return Ok(false);
    }

    let search_output = Command::new("xdotool")
        .args(["search", "--class", "Alacritty"])
        .output()
        .map_err(|e| format!("Failed to search for Alacritty windows: {}", e))?;

    if !search_output.status.success() {
        eprintln!("[WorkoPilot] xdotool search failed");
        return Ok(false);
    }

    let window_ids = String::from_utf8_lossy(&search_output.stdout);

    for window_id in window_ids.lines() {
        let window_id = window_id.trim();
        if window_id.is_empty() {
            continue;
        }

        let name_output = Command::new("xdotool")
            .args(["getwindowname", window_id])
            .output();

        if let Ok(output) = name_output {
            let window_name = String::from_utf8_lossy(&output.stdout).to_lowercase();

            if window_name.contains(SESSION_NAME) || window_name.contains("tmux") {
                eprintln!(
                    "[WorkoPilot] Found window: {} ({})",
                    window_id,
                    window_name.trim()
                );

                let activate_result = Command::new("xdotool")
                    .args(["windowactivate", "--sync", window_id])
                    .output();

                if let Ok(result) = activate_result {
                    if result.status.success() {
                        eprintln!("[WorkoPilot] Window activated successfully");
                        return Ok(true);
                    }
                }
            }
        }
    }

    eprintln!("[WorkoPilot] No matching Alacritty window found");
    Ok(false)
}

/// Checks if opencode (node) is running in a specific tab.
pub fn is_opencode_running(tab_name: &str) -> bool {
    get_pane_command(tab_name)
        .map(|cmd| cmd == "node")
        .unwrap_or(false)
}

pub fn generate_prompt(
    action: &TerminalAction,
    task: &TaskFull,
    subtask_id: Option<&str>,
) -> String {
    match action {
        TerminalAction::Structure => format!(
            "Estruturar: {}, utilize a skill workopilot-structure para estruturar a task de id: {}",
            task.title, task.id
        ),
        TerminalAction::ExecuteAll => format!(
            "Executar: {}, utilize a skill workopilot-execute-all para executar a task de id: {}",
            task.title, task.id
        ),
        TerminalAction::ExecuteSubtask => {
            let subtask_title = subtask_id
                .and_then(|sid| task.subtasks.iter().find(|s| s.id == sid))
                .map(|s| s.title.clone())
                .unwrap_or_else(|| "Subtask".to_string());
            let sid = subtask_id.unwrap_or("unknown");
            format!(
                "Executar subtask: {} (task: {}), utilize a skill workopilot-execute-subtask para executar a subtask {} da task {}",
                subtask_title, task.title, sid, task.id
            )
        }
        TerminalAction::Review => format!(
            "Revisar: {}, utilize a skill workopilot-review para revisar a task de id: {}",
            task.title, task.id
        ),
        TerminalAction::LaunchProject | TerminalAction::FocusSession => String::new(),
    }
}

pub fn generate_loading_animation_script(
    session_name: &str,
    tab_name: &str,
    escaped_prompt: &str,
) -> String {
    format!(
        r##"
clear
printf '\e[?25l'
stty -echo 2>/dev/null

GREEN="\e[38;5;143m"
GREEN4="\e[38;5;65m"
DIM="\e[38;5;238m"
WHITE="\e[38;5;255m"
R="\e[0m"
B="\e[1m"

COLS=$(tput cols)
ROWS=$(tput lines)

LOGO1="██╗    ██╗  ██████╗  ██████╗  ██╗  ██╗  ██████╗  ██████╗  ██╗ ██╗       ██████╗  ████████╗"
LOGO2="██║    ██║ ██╔═══██╗ ██╔══██╗ ██║ ██╔╝ ██╔═══██╗ ██╔══██╗ ██║ ██║      ██╔═══██╗ ╚══██╔══╝"
LOGO3="██║ █╗ ██║ ██║   ██║ ██████╔╝ █████╔╝  ██║   ██║ ██████╔╝ ██║ ██║      ██║   ██║    ██║   "
LOGO4="██║███╗██║ ██║   ██║ ██╔══██╗ ██╔═██╗  ██║   ██║ ██╔═══╝  ██║ ██║      ██║   ██║    ██║   "
LOGO5="╚███╔███╔╝ ╚██████╔╝ ██║  ██║ ██║  ██╗ ╚██████╔╝ ██║      ██║ ███████╗ ╚██████╔╝    ██║   "
LOGO6=" ╚══╝╚══╝   ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝  ╚═════╝  ╚═╝      ╚═╝ ╚══════╝  ╚═════╝     ╚═╝   "

CX=$(( (COLS - 88) / 2 ))
CY=$(( (ROWS - 16) / 2 ))
[ $CX -lt 1 ] && CX=1
[ $CY -lt 1 ] && CY=1

BAR_WIDTH=50
BAR_Y=$((CY + 8))
BAR_X=$(( (COLS - BAR_WIDTH - 2) / 2 ))
MSG_Y=$((CY + 11))
MSG_X=$(( (COLS - 22) / 2 ))

draw_base() {{
    clear
    printf "\e[3;10H$GREEN4✦$R"
    printf "\e[4;$((COLS-10))H$GREEN4✧$R"
    printf "\e[3;$((COLS/2))H$GREEN4◆$R"
    printf "\e[$((ROWS-3));15H$GREEN4✧$R"
    printf "\e[$((ROWS-4));$((COLS-15))H$GREEN4✦$R"
    printf "\e[$((ROWS-3));$((COLS/2-5))H$GREEN4◇$R"
    printf "\e[$((CY-2));$((CX+20))H$GREEN4✦$R"
    printf "\e[$((CY+8));$((CX-3))H$GREEN4◇$R"
    printf "\e[$((CY+8));$((CX+90))H$GREEN4✧$R"
    printf "\e[$CY;${{CX}}H$GREEN$B$LOGO1$R"
    printf "\e[$((CY+1));${{CX}}H$GREEN$B$LOGO2$R"
    printf "\e[$((CY+2));${{CX}}H$GREEN$B$LOGO3$R"
    printf "\e[$((CY+3));${{CX}}H$GREEN$B$LOGO4$R"
    printf "\e[$((CY+4));${{CX}}H$GREEN$B$LOGO5$R"
    printf "\e[$((CY+5));${{CX}}H$GREEN$B$LOGO6$R"
    printf "\e[$BAR_Y;${{BAR_X}}H$DIM[$R"
    printf "\e[$BAR_Y;$((BAR_X + BAR_WIDTH + 1))H$DIM]$R"
    printf "\e[$((ROWS-2));$((COLS/2-20))H$DIM⚡ Preparando seu ambiente de código ⚡$R"
}}

draw_progress() {{
    local filled=$1
    printf "\e[$BAR_Y;$((BAR_X + 1))H"
    for j in $(seq 1 $BAR_WIDTH); do
        if [ $j -le $filled ]; then
            printf "$GREEN█$R"
        else
            printf "$DIM░$R"
        fi
    done
    printf "\e[$MSG_Y;${{MSG_X}}H$WHITE Iniciando OpenCode...$R"
}}

draw_success() {{
    printf "\e[$BAR_Y;$((BAR_X + 1))H"
    for j in $(seq 1 $BAR_WIDTH); do
        printf "$GREEN█$R"
    done
    printf "\e[$MSG_Y;${{MSG_X}}H$GREEN$B✓$R $WHITE$BOpenCode Pronto!$R   "
}}

draw_base

NODE_READY=0
PROGRESS=0

for i in $(seq 1 90); do
    PANE_CMD=$(tmux display-message -p -t "{session_name}:{tab_name}" '#{{pane_current_command}}' 2>/dev/null)
    if [ "$PANE_CMD" = "node" ]; then
        NODE_READY=1
        while [ $PROGRESS -lt $BAR_WIDTH ]; do
            PROGRESS=$((PROGRESS + 2))
            [ $PROGRESS -gt $BAR_WIDTH ] && PROGRESS=$BAR_WIDTH
            draw_progress $PROGRESS
            sleep 0.03
        done
        break
    fi
    PROGRESS=$((i * BAR_WIDTH / 100))
    [ $PROGRESS -gt $((BAR_WIDTH - 8)) ] && PROGRESS=$((BAR_WIDTH - 8))
    draw_progress $PROGRESS
    sleep 0.35
done

if [ $NODE_READY -eq 1 ]; then
    draw_success
    sleep 2.5
    tmux send-keys -t "{session_name}:{tab_name}" "{escaped_prompt}" Enter
fi

printf '\e[?25h'
stty echo 2>/dev/null
"##
    )
}

fn focus_task_terminal(
    app_handle: &tauri::AppHandle,
    project: &Project,
    task_id: &str,
) -> TmuxResult<()> {
    let tab_name = get_tab_name(project, task_id);
    let project_path = project
        .routes
        .first()
        .map(|r| r.path.as_str())
        .ok_or("No routes configured")?;

    eprintln!("[WorkoPilot] focus_task_terminal: tab_name={}", tab_name);

    if find_tab_by_name(&tab_name)?.is_none() {
        eprintln!("[WorkoPilot] Tab does not exist, creating new tab");
        launch_new_task_terminal(project_path, &tab_name, "")?;
        crate::window::hide(app_handle);
        return Ok(());
    }

    select_tab(&tab_name)?;

    if focus_terminal_window()? {
        crate::window::hide(app_handle);
    }

    Ok(())
}

fn execute_task_action(
    project: &Project,
    task_id: &str,
    prompt: &str,
    force_new_tab: bool,
) -> TmuxResult<()> {
    let tab_name = get_tab_name(project, task_id);
    let project_path = project
        .routes
        .first()
        .map(|r| r.path.as_str())
        .ok_or("No routes configured")?;

    eprintln!(
        "[WorkoPilot] execute_task_action: tab={}, force_new={}, prompt_len={}",
        tab_name,
        force_new_tab,
        prompt.len()
    );

    let escaped_prompt = prompt.replace('\\', "\\\\").replace('"', "\\\"");

    if !force_new_tab {
        if let Some(_) = find_tab_by_name(&tab_name)? {
            if is_opencode_running(&tab_name) {
                eprintln!("[WorkoPilot] Tab exists with opencode, sending prompt directly");
                send_keys(&tab_name, &escaped_prompt)?;
                select_tab(&tab_name)?;
                focus_terminal_window()?;
                return Ok(());
            }
            eprintln!("[WorkoPilot] Tab exists but opencode not running, will recreate");
        }
    }

    launch_new_task_terminal(project_path, &tab_name, &escaped_prompt)
}

fn has_attached_client() -> bool {
    Command::new("tmux")
        .args(["list-clients", "-t", SESSION_NAME])
        .output()
        .map(|o| o.status.success() && !o.stdout.is_empty())
        .unwrap_or(false)
}

fn launch_new_task_terminal(
    project_path: &str,
    tab_name: &str,
    escaped_prompt: &str,
) -> TmuxResult<()> {
    eprintln!(
        "[WorkoPilot] launch_new_task_terminal: tab={}, path={}",
        tab_name, project_path
    );

    let has_client = has_attached_client();
    eprintln!("[WorkoPilot] Session has attached client: {}", has_client);

    if has_client {
        eprintln!("[WorkoPilot] Reusing existing terminal, creating tab via tmux commands");

        let _ = Command::new("tmux")
            .args([
                "kill-window",
                "-t",
                &format!("{}:{}", SESSION_NAME, tab_name),
            ])
            .output();

        let new_window = Command::new("tmux")
            .args([
                "new-window",
                "-t",
                SESSION_NAME,
                "-n",
                tab_name,
                "-c",
                project_path,
            ])
            .output()
            .map_err(|e| format!("Failed to create tmux window: {}", e))?;

        if !new_window.status.success() {
            return Err("Failed to create new tmux window".to_string());
        }

        std::thread::sleep(std::time::Duration::from_millis(300));

        Command::new("tmux")
            .args([
                "send-keys",
                "-t",
                &format!("{}:{}", SESSION_NAME, tab_name),
                "opencode",
                "Enter",
            ])
            .output()
            .map_err(|e| format!("Failed to send opencode command: {}", e))?;

        std::thread::sleep(std::time::Duration::from_secs(3));

        send_keys(tab_name, escaped_prompt)?;
        select_tab(tab_name)?;
        focus_terminal_window()?;

        return Ok(());
    }

    let loading_animation =
        generate_loading_animation_script(SESSION_NAME, tab_name, escaped_prompt);

    let script = format!(
        r#"#!/usr/bin/env bash
SESSION="{session_name}"
TAB_NAME="{tab_name}"
PROJECT_PATH="{project_path}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-window -t "$SESSION:$TAB_NAME" 2>/dev/null
    tmux new-window -t "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
else
    tmux new-session -d -s "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
fi

sleep 0.3
tmux send-keys -t "$SESSION:$TAB_NAME" "opencode" Enter

{loading_animation}

tmux select-window -t "$SESSION:$TAB_NAME"
tmux attach-session -t "$SESSION"
"#,
        session_name = SESSION_NAME,
        tab_name = tab_name,
        project_path = project_path,
        loading_animation = loading_animation,
    );

    Command::new("alacritty")
        .arg("-e")
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("Failed to launch terminal: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn terminal_action(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    action: String,
    project_id: String,
    task_id: Option<String>,
    subtask_id: Option<String>,
) -> Result<(), String> {
    let action_type = TerminalAction::from_str(&action)?;

    eprintln!(
        "[WorkoPilot] terminal_action: {:?}, project: {}, task: {:?}, subtask: {:?}",
        action_type, project_id, task_id, subtask_id
    );

    let (project, task_opt) = get_project_and_task(&state, &project_id, task_id.as_deref())?;

    match action_type {
        TerminalAction::LaunchProject => {
            launch_project_session(&project)?;
        }

        TerminalAction::FocusSession => {
            let tid = task_id.ok_or("task_id required for focus action")?;
            focus_task_terminal(&app_handle, &project, &tid)?;
        }

        TerminalAction::Structure => {
            let tid = task_id.ok_or("task_id required for structure action")?;
            let task = task_opt.ok_or("task not found")?;

            sidecar_call!(
                state,
                "tasks.updateStatus",
                json!({
                    "id": tid,
                    "status": "in_progress",
                    "modifiedBy": "user"
                })
            )?;

            let prompt = generate_prompt(&action_type, &task, None);
            execute_task_action(&project, &tid, &prompt, true)?;
        }

        TerminalAction::ExecuteAll => {
            let tid = task_id.ok_or("task_id required for execute_all action")?;
            let task = task_opt.ok_or("task not found")?;

            sidecar_call!(
                state,
                "tasks.updateStatus",
                json!({
                    "id": tid,
                    "status": "in_progress",
                    "modifiedBy": "user"
                })
            )?;

            let prompt = generate_prompt(&action_type, &task, None);
            execute_task_action(&project, &tid, &prompt, false)?;
        }

        TerminalAction::ExecuteSubtask => {
            let tid = task_id.ok_or("task_id required for execute_subtask action")?;
            let task = task_opt.ok_or("task not found")?;
            let sid = subtask_id.ok_or("subtask_id required for execute_subtask action")?;

            sidecar_call!(
                state,
                "tasks.updateStatus",
                json!({
                    "id": tid,
                    "status": "in_progress",
                    "modifiedBy": "user"
                })
            )?;

            let prompt = generate_prompt(&action_type, &task, Some(&sid));
            execute_task_action(&project, &tid, &prompt, false)?;
        }

        TerminalAction::Review => {
            let tid = task_id.ok_or("task_id required for review action")?;
            let task = task_opt.ok_or("task not found")?;

            let prompt = generate_prompt(&action_type, &task, None);
            execute_task_action(&project, &tid, &prompt, false)?;
        }
    }

    Ok(())
}

fn launch_project_session(project: &Project) -> TmuxResult<()> {
    let tmux_config = project.tmux_config.as_ref().ok_or("No tmux config")?;
    let routes = &project.routes;

    let session_name = &tmux_config.session_name;
    let mut sorted_tabs = tmux_config.tabs.clone();
    sorted_tabs.sort_by_key(|t| t.order);

    let mut script = format!(
        r#"#!/usr/bin/env bash
SESSION="{session_name}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux attach-session -t "$SESSION"
    exit 0
fi

"#
    );

    for (i, tab) in sorted_tabs.iter().enumerate() {
        let route = routes
            .iter()
            .find(|r| r.id == tab.route_id)
            .unwrap_or_else(|| routes.first().unwrap());

        let path = &route.path;
        let tab_name = &tab.name;

        if i == 0 {
            script.push_str(&format!(
                r#"tmux new-session -d -s "$SESSION" -n "{tab_name}" -c "{path}"
"#
            ));
        } else {
            script.push_str(&format!(
                r#"tmux new-window -t "$SESSION" -n "{tab_name}" -c "{path}"
"#
            ));
        }

        if let Some(cmd) = &tab.startup_command {
            if !cmd.is_empty() {
                script.push_str(&format!(
                    r#"tmux send-keys -t "$SESSION:{tab_name}" "{cmd}" Enter
"#
                ));
            }
        }
    }

    if let Some(first_tab) = sorted_tabs.first() {
        script.push_str(&format!(
            r#"
tmux select-window -t "$SESSION:{}"
tmux attach-session -t "$SESSION"
"#,
            first_tab.name
        ));
    }

    Command::new("alacritty")
        .arg("-e")
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("Failed to launch tmux: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_terminal_action_from_str() {
        assert_eq!(
            TerminalAction::from_str("launch_project").unwrap(),
            TerminalAction::LaunchProject
        );
        assert_eq!(
            TerminalAction::from_str("focus").unwrap(),
            TerminalAction::FocusSession
        );
        assert_eq!(
            TerminalAction::from_str("structure").unwrap(),
            TerminalAction::Structure
        );
        assert_eq!(
            TerminalAction::from_str("execute_all").unwrap(),
            TerminalAction::ExecuteAll
        );
        assert_eq!(
            TerminalAction::from_str("execute_subtask").unwrap(),
            TerminalAction::ExecuteSubtask
        );
        assert_eq!(
            TerminalAction::from_str("review").unwrap(),
            TerminalAction::Review
        );
        assert!(TerminalAction::from_str("invalid").is_err());
    }

    #[test]
    fn test_get_tab_name() {
        let project = Project {
            id: "123".to_string(),
            name: "My Project".to_string(),
            path: "/tmp".to_string(),
            description: None,
            display_order: 0,
            routes: vec![],
            tmux_config: None,
            business_rules: None,
            tmux_configured: false,
            created_at: None,
            color: None,
        };

        // Test with long task_id
        let tab_name = get_tab_name(&project, "1769173112207-zweq0yz");
        assert_eq!(tab_name, "MyProject-17691731");

        // Test with short task_id
        let tab_name = get_tab_name(&project, "abc123");
        assert_eq!(tab_name, "MyProject-abc123");
    }
}
