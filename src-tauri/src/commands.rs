use crate::database::{
    ActivityLog, ActivityLogSearchResult, CalendarTask, Project, ProjectRoute, ProjectWithConfig, 
    SessionLog, Task, TaskExecution, TaskFull, TaskImage, TaskImageMetadata, TmuxConfig, UserSession,
};
use crate::AppState;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::process::Command;
use tauri::{Emitter, Manager, State};

#[tauri::command]
pub fn get_projects(state: State<AppState>) -> Result<Vec<Project>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project_with_config(
    state: State<AppState>,
    project_id: String,
) -> Result<ProjectWithConfig, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_project_with_config(&project_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_project(
    state: State<AppState>,
    name: String,
    path: String,
    description: Option<String>,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_project(&name, &path, description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project(
    state: State<AppState>,
    project_id: String,
    name: String,
    description: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_project(&project_id, &name, description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project_name(
    state: State<AppState>,
    project_id: String,
    name: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_project_name(&project_id, &name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project_routes(
    state: State<AppState>,
    project_id: String,
    routes: Vec<ProjectRoute>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let routes_json = serde_json::to_string(&routes).map_err(|e| e.to_string())?;
    db.update_project_routes(&project_id, &routes_json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project_tmux_config(
    state: State<AppState>,
    project_id: String,
    tmux_config: TmuxConfig,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let config_json = serde_json::to_string(&tmux_config).map_err(|e| e.to_string())?;
    db.update_project_tmux_config(&project_id, &config_json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project_business_rules(
    state: State<AppState>,
    project_id: String,
    rules: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_project_business_rules(&project_id, &rules)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_projects_order(
    state: State<AppState>,
    project_orders: Vec<(String, i32)>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_projects_order(&project_orders)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_tmux_configured(
    state: State<AppState>,
    project_id: String,
    configured: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_tmux_configured(&project_id, configured)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(state: State<AppState>, project_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_project(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn launch_project_tmux(state: State<AppState>, project_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;

    let session_name = &project.tmux_config.session_name;
    let mut sorted_tabs = project.tmux_config.tabs.clone();
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
        let route = project
            .routes
            .iter()
            .find(|r| r.id == tab.route_id)
            .unwrap_or_else(|| project.routes.first().unwrap());

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

#[tauri::command]
pub fn open_env_file(path: String) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn detect_project_structure(root_path: String) -> Result<Vec<ProjectRoute>, String> {
    let root = std::path::Path::new(&root_path);
    let mut routes = vec![];
    let mut order = 0;

    let root_route = ProjectRoute {
        id: uuid::Uuid::new_v4().to_string(),
        path: root_path.clone(),
        order,
        env_path: if root.join(".env").exists() {
            Some(root.join(".env").to_string_lossy().to_string())
        } else {
            None
        },
    };
    routes.push(root_route);
    order += 1;

    let apps_dir = root.join("apps");
    if apps_dir.exists() && apps_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&apps_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let has_package = path.join("package.json").exists()
                        || path.join("Cargo.toml").exists()
                        || path.join("go.mod").exists();

                    if has_package {
                        let env_path = if path.join(".env").exists() {
                            Some(path.join(".env").to_string_lossy().to_string())
                        } else {
                            None
                        };

                        routes.push(ProjectRoute {
                            id: uuid::Uuid::new_v4().to_string(),
                            path: path.to_string_lossy().to_string(),
                            order,
                            env_path,
                        });
                        order += 1;
                    }
                }
            }
        }
    }

    let packages_dir = root.join("packages");
    if packages_dir.exists() && packages_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&packages_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let has_package = path.join("package.json").exists();

                    if has_package {
                        routes.push(ProjectRoute {
                            id: uuid::Uuid::new_v4().to_string(),
                            path: path.to_string_lossy().to_string(),
                            order,
                            env_path: None,
                        });
                        order += 1;
                    }
                }
            }
        }
    }

    Ok(routes)
}

#[tauri::command]
pub fn get_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tasks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_urgent_tasks(
    state: State<AppState>,
    project_id: String,
    limit: i32,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_urgent_tasks(&project_id, limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_tasks(
    state: State<AppState>,
    project_id: String,
    limit: i32,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_active_tasks(&project_id, limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_task(
    state: State<AppState>,
    project_id: String,
    title: String,
    priority: i32,
    category: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_task(&project_id, &title, priority, &category)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_task_status(
    state: State<AppState>,
    task_id: String,
    status: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_task_status(&task_id, &status)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_task_status_and_substatus(
    state: State<AppState>,
    task_id: String,
    status: String,
    substatus: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_task_status_and_substatus(&task_id, &status, substatus.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn schedule_task(
    state: State<AppState>,
    task_id: String,
    scheduled_date: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.schedule_task(&task_id, &scheduled_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unschedule_task(state: State<AppState>, task_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.unschedule_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tasks_for_month(
    state: State<AppState>,
    year: i32,
    month: i32,
    project_id: Option<String>,
) -> Result<Vec<CalendarTask>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tasks_for_month(year, month, project_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_unscheduled_tasks(
    state: State<AppState>,
    project_id: Option<String>,
    category: Option<String>,
    priority: Option<i32>,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_unscheduled_tasks(project_id.as_deref(), category.as_deref(), priority)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tasks_for_date(state: State<AppState>, date: String) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tasks_for_date(&date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_session_logs(state: State<AppState>) -> Result<Vec<SessionLog>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_session_logs().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_ai_suggestion(tasks: Vec<Task>) -> Result<String, String> {
    if tasks.is_empty() {
        return Ok(
            "Adicione algumas tarefas para receber sugestões de fluxo de trabalho.".to_string(),
        );
    }

    let high_priority: Vec<_> = tasks
        .iter()
        .filter(|t| t.priority == 1 && t.status != "done")
        .collect();
    let medium_priority: Vec<_> = tasks
        .iter()
        .filter(|t| t.priority == 2 && t.status != "done")
        .collect();
    let pending_count = tasks.iter().filter(|t| t.status != "done").count();

    if pending_count == 0 {
        return Ok(
            "Parabéns! Todas as tarefas estão concluídas. Hora de adicionar mais ou relaxar."
                .to_string(),
        );
    }

    let mut suggestion = String::new();

    if !high_priority.is_empty() {
        let task = &high_priority[0];
        suggestion.push_str(&format!(
            "Comece por \"{}\" (prioridade alta, categoria: {}). ",
            task.title, task.category
        ));
    }

    if high_priority.len() > 1 {
        suggestion.push_str(&format!(
            "Você tem {} tarefas de alta prioridade no total. ",
            high_priority.len()
        ));
    }

    if !medium_priority.is_empty() && high_priority.is_empty() {
        let task = &medium_priority[0];
        suggestion.push_str(&format!("Foque em \"{}\" primeiro. ", task.title));
    }

    suggestion.push_str(&format!("Total de {} tarefas pendentes.", pending_count));

    Ok(suggestion)
}

#[tauri::command]
pub fn create_task_with_json(
    state: State<AppState>,
    project_id: String,
    _project_path: String,
    title: String,
    priority: i32,
    category: String,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    let task_full = TaskFull::new(task_id.clone(), title, priority, category);

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_task_full(&task_full, &project_id)
        .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub fn get_task_full(
    state: State<AppState>,
    _project_path: String,
    task_id: String,
) -> Result<TaskFull, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task_full(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_task_full(
    state: State<AppState>,
    _project_path: String,
    task: TaskFull,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_task_full(&task).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_task_and_sync(
    state: State<AppState>,
    _project_path: String,
    task: TaskFull,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_task_full(&task).map_err(|e| e.to_string())?;
    db.update_task(
        &task.id,
        &task.title,
        task.priority,
        &task.category,
        &task.status,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_task_full(
    state: State<AppState>,
    _project_path: String,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_task_by_id(state: State<AppState>, task_id: String) -> Result<Task, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task_by_id(&task_id).map_err(|e| e.to_string())
}

/// Generate the ASCII loading animation bash script
fn generate_loading_animation_script(
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

fn launch_in_workopilot_session(
    _app_handle: &tauri::AppHandle,
    project: &ProjectWithConfig,
    initial_prompt: &str,
    task_id: &str,
    is_structuring: bool,
) -> Result<(), String> {
    eprintln!("[WorkoPilot] launch_in_workopilot_session called");
    
    let session_name = "workopilot";

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
    let tab_name = format!("{}-{}", safe_name, task_short);
    
    eprintln!("[WorkoPilot] Session: {}, Tab: {}, is_structuring: {}", session_name, tab_name, is_structuring);

    let first_route = project.routes.first().ok_or_else(|| {
        eprintln!("[WorkoPilot] No routes configured for project");
        "No routes configured".to_string()
    })?;
    let project_path = &first_route.path;
    
    eprintln!("[WorkoPilot] Project path: {}", project_path);

    let escaped_prompt = initial_prompt.replace('\\', "\\\\").replace('"', "\\\"");

    if !is_structuring {
        if let Ok(output) = Command::new("tmux")
            .args(["has-session", "-t", session_name])
            .output()
        {
            if output.status.success() {
                if let Ok(windows_output) = Command::new("tmux")
                    .args(["list-windows", "-t", session_name, "-F", "#{window_name}"])
                    .output()
                {
                    let windows = String::from_utf8_lossy(&windows_output.stdout);
                    if windows.lines().any(|w| w == tab_name) {
                        if let Ok(pane_output) = Command::new("tmux")
                            .args([
                                "display-message",
                                "-p",
                                "-t",
                                &format!("{}:{}", session_name, tab_name),
                                "#{pane_current_command}",
                            ])
                            .output()
                        {
                            let pane_cmd = String::from_utf8_lossy(&pane_output.stdout)
                                .trim()
                                .to_string();
                            if pane_cmd == "node" {
                                Command::new("tmux")
                                    .args([
                                        "send-keys",
                                        "-t",
                                        &format!("{}:{}", session_name, tab_name),
                                        &escaped_prompt,
                                        "Enter",
                                    ])
                                    .spawn()
                                    .map_err(|e| format!("Failed to send keys: {}", e))?;

                                Command::new("tmux")
                                    .args([
                                        "select-window",
                                        "-t",
                                        &format!("{}:{}", session_name, tab_name),
                                    ])
                                    .spawn()
                                    .map_err(|e| format!("Failed to select window: {}", e))?;

                                return Ok(());
                            }
                        }
                    }
                }
            }
        }
    }

    eprintln!("[WorkoPilot] Creating new window, generating script...");
    
    let loading_animation =
        generate_loading_animation_script(session_name, &tab_name, &escaped_prompt);

    let script = format!(
        r#"#!/usr/bin/env bash
SESSION="{session_name}"
TAB_NAME="{tab_name}"
PROJECT_PATH="{project_path}"

echo "[WorkoPilot Script] Starting..."
echo "[WorkoPilot Script] Session: $SESSION, Tab: $TAB_NAME"
echo "[WorkoPilot Script] Project path: $PROJECT_PATH"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "[WorkoPilot Script] Session exists, killing old window if any..."
    # Kill existing tab if it exists (might be in bad state)
    tmux kill-window -t "$SESSION:$TAB_NAME" 2>/dev/null
    tmux new-window -t "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
else
    echo "[WorkoPilot Script] Creating new session..."
    tmux new-session -d -s "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
fi

sleep 0.3
echo "[WorkoPilot Script] Sending opencode command..."
tmux send-keys -t "$SESSION:$TAB_NAME" "opencode" Enter

{loading_animation}

tmux select-window -t "$SESSION:$TAB_NAME"
echo "[WorkoPilot Script] Attaching to session..."
tmux attach-session -t "$SESSION"
"#
    );

    eprintln!("[WorkoPilot] Spawning alacritty...");
    
    match Command::new("alacritty")
        .arg("-e")
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .spawn()
    {
        Ok(child) => {
            eprintln!("[WorkoPilot] Alacritty spawned successfully, pid: {:?}", child.id());
            Ok(())
        }
        Err(e) => {
            eprintln!("[WorkoPilot] Failed to spawn alacritty: {}", e);
            Err(format!("Failed to launch terminal: {}", e))
        }
    }
}

fn get_skills_resource_dir(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    // Try resource_dir first (production), fallback to src-tauri/resources (dev)
    app_handle
        .path()
        .resource_dir()
        .map(|p| p.join("resources").join("opencode-skills"))
        .ok()
        .filter(|p| p.exists())
        .or_else(|| {
            // Dev mode fallback: use src-tauri/resources directly
            let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join("opencode-skills");
            if dev_path.exists() {
                Some(dev_path)
            } else {
                None
            }
        })
        .ok_or_else(|| "Could not find skills resource directory".to_string())
}

fn get_opencode_skills_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME")
        .map_err(|_| "Could not determine HOME directory".to_string())?;
    Ok(std::path::Path::new(&home)
        .join(".config")
        .join("opencode")
        .join("skills"))
}

/// Syncs WorkoPilot skills to ~/.config/opencode/skills/
/// This is the single source of truth - skills are stored in WorkoPilot bundle
/// and synced to OpenCode's personal skills directory
fn sync_skills_to_opencode(app_handle: &tauri::AppHandle) -> Result<u32, String> {
    let resource_dir = get_skills_resource_dir(app_handle)?;
    let skills_base_dir = get_opencode_skills_dir()?;

    eprintln!("[WorkoPilot] Syncing skills from: {:?} to {:?}", resource_dir, skills_base_dir);

    let skill_names = [
        "workopilot-structure",
        "workopilot-execute-all",
        "workopilot-execute-subtask",
        "workopilot-review",
        "workopilot-quickfix",
    ];

    let mut synced_count = 0u32;

    for skill_name in skill_names {
        let skill_source = resource_dir.join(skill_name).join("SKILL.md");
        let skill_dest_dir = skills_base_dir.join(skill_name);

        std::fs::create_dir_all(&skill_dest_dir)
            .map_err(|e| format!("Failed to create skill directory {}: {}", skill_name, e))?;

        let skill_dest = skill_dest_dir.join("SKILL.md");
        std::fs::copy(&skill_source, &skill_dest)
            .map_err(|e| format!("Failed to copy skill {} from {:?}: {}", skill_name, skill_source, e))?;
        
        synced_count += 1;
    }

    eprintln!("[WorkoPilot] Synced {} skills to OpenCode", synced_count);
    Ok(synced_count)
}

#[tauri::command]
pub fn sync_skills(app_handle: tauri::AppHandle) -> Result<u32, String> {
    sync_skills_to_opencode(&app_handle)
}

#[tauri::command]
pub fn launch_task_workflow(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
    subtask_id: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;

    let task_full = db.get_task_full(&task_id).map_err(|e| e.to_string())?;

    let (initial_prompt, is_structuring) = if let Some(ref st_id) = subtask_id {
        let subtask_title = task_full.subtasks.iter()
            .find(|s| s.id == *st_id)
            .map(|s| s.title.clone())
            .unwrap_or_else(|| "Subtask".to_string());
        (
            format!(
                "Executar subtask: {} (task: {}), utilize a skill workopilot-execute-subtask para executar a subtask {} da task {}",
                subtask_title, task_full.title, st_id, task_id
            ),
            false,
        )
    } else if !task_full.ai_metadata.structuring_complete {
        (
            format!(
                "Estruturar: {}, utilize a skill workopilot-structure para estruturar a task de id: {}",
                task_full.title, task_id
            ),
            true,
        )
    } else {
        (
            format!(
                "Executar: {}, utilize a skill workopilot-execute-all para executar a task de id: {}",
                task_full.title, task_id
            ),
            false,
        )
    };

    drop(db);
    launch_in_workopilot_session(
        &app_handle,
        &project,
        &initial_prompt,
        &task_id,
        is_structuring,
    )
}

#[tauri::command]
pub fn launch_task_structure(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;
    let task_full = db.get_task_full(&task_id).map_err(|e| e.to_string())?;
    
    db.update_task_status_and_substatus(&task_id, "active", Some("structuring"))
        .map_err(|e| e.to_string())?;
    drop(db);

    let initial_prompt = format!(
        "Estruturar: {}, utilize a skill workopilot-structure para estruturar a task de id: {}",
        task_full.title, task_id
    );

    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id, true)
}

#[tauri::command]
pub fn launch_task_execute_all(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;
    let task_full = db.get_task_full(&task_id).map_err(|e| e.to_string())?;
    
    db.update_task_status_and_substatus(&task_id, "active", Some("executing"))
        .map_err(|e| e.to_string())?;
    drop(db);

    let initial_prompt = format!(
        "Executar: {}, utilize a skill workopilot-execute-all para executar a task de id: {}",
        task_full.title, task_id
    );

    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id, false)
}

#[tauri::command]
pub fn launch_task_execute_subtask(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
    subtask_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;
    let task_full = db.get_task_full(&task_id).map_err(|e| e.to_string())?;
    let subtask_title = task_full.subtasks.iter()
        .find(|s| s.id == subtask_id)
        .map(|s| s.title.clone())
        .unwrap_or_else(|| "Subtask".to_string());
    
    db.update_task_status_and_substatus(&task_id, "active", Some("executing"))
        .map_err(|e| e.to_string())?;
    drop(db);

    let initial_prompt = format!(
        "Executar subtask: {} (task: {}), utilize a skill workopilot-execute-subtask para executar a subtask {} da task {}",
        subtask_title, task_full.title, subtask_id, task_id
    );

    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id, false)
}

#[tauri::command]
pub fn launch_task_review(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
) -> Result<(), String> {
    eprintln!("[WorkoPilot] launch_task_review called: project_id={}, task_id={}", project_id, task_id);
    
    let db = state.db.lock().map_err(|e| {
        eprintln!("[WorkoPilot] Failed to lock db: {}", e);
        e.to_string()
    })?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| {
            eprintln!("[WorkoPilot] Failed to get project: {}", e);
            e.to_string()
        })?;
    let task_full = db.get_task_full(&task_id).map_err(|e| e.to_string())?;
    drop(db);

    eprintln!("[WorkoPilot] Project found: {}, path: {}", project.name, project.path);

    let initial_prompt = format!(
        "Revisar: {}, utilize a skill workopilot-review para revisar a task de id: {}",
        task_full.title, task_id
    );
    
    eprintln!("[WorkoPilot] Launching session with prompt: {}", initial_prompt);
    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id, false)
}

#[tauri::command]
pub fn enrich_calendar_tasks(
    state: State<AppState>,
    tasks: Vec<CalendarTask>,
    _project_paths: std::collections::HashMap<String, String>,
) -> Result<Vec<CalendarTask>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut enriched = vec![];

    for mut task in tasks {
        if let Ok((total, done)) = db.get_subtask_counts(&task.id) {
            task.subtask_count = total;
            task.subtask_done_count = done;
        }
        enriched.push(task);
    }

    Ok(enriched)
}

#[tauri::command]
pub fn start_task_execution(
    state: State<AppState>,
    task_id: String,
    subtask_id: Option<String>,
    tmux_session: Option<String>,
    pid: Option<i32>,
    total_steps: Option<i32>,
) -> Result<TaskExecution, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.start_execution(
        &task_id,
        subtask_id.as_deref(),
        tmux_session.as_deref(),
        pid,
        total_steps.unwrap_or(0),
    )
    .map_err(|e| format!("Failed to start execution: {}", e))
}

#[tauri::command]
pub fn end_task_execution(
    state: State<AppState>,
    task_id: String,
    status: String,
    error_message: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.end_execution(&task_id, &status, error_message.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_task_execution_progress(
    state: State<AppState>,
    task_id: String,
    current_step: Option<i32>,
    total_steps: Option<i32>,
    description: Option<String>,
    waiting_for_input: Option<bool>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_execution_progress(
        &task_id,
        current_step,
        total_steps,
        description.as_deref(),
        waiting_for_input,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_task_execution(
    state: State<AppState>,
    task_id: String,
) -> Result<Option<TaskExecution>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_active_execution(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_active_executions(state: State<AppState>) -> Result<Vec<TaskExecution>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_active_executions().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cleanup_stale_task_executions(
    state: State<AppState>,
    timeout_minutes: Option<i32>,
) -> Result<i32, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.cleanup_stale_executions(timeout_minutes.unwrap_or(5))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn focus_tmux_session(app_handle: tauri::AppHandle, session_name: String) -> Result<(), String> {
    use std::process::Command;

    let script = format!(
        r#"#!/usr/bin/env bash
SESSION="{session_name}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux attach-session -t "$SESSION"
else
    echo "Session $SESSION not found"
    sleep 2
fi
"#
    );

    Command::new("alacritty")
        .arg("-e")
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("Failed to focus terminal: {}", e))?;

    crate::window::hide(&app_handle);

    Ok(())
}

#[derive(Clone, serde::Serialize)]
pub struct QuickfixPayload {
    pub task_id: String,
    pub status: String,
    pub prompt: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn launch_quickfix_background(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    project_id: String,
    task_id: String,
    quickfix_prompt: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;
    let task_full = db.get_task_full(&task_id).map_err(|e| e.to_string())?;
    drop(db);

    let first_route = project.routes.first().ok_or("No routes configured")?;
    let project_path = first_route.path.clone();

    let full_prompt = format!(
        "Quickfix: {}, utilize a skill workopilot-quickfix para ajustar a task de id: {}. Ajuste solicitado: {}",
        task_full.title, task_id, quickfix_prompt
    );

    let _ = app_handle.emit("quickfix-changed", QuickfixPayload {
        task_id: task_id.clone(),
        status: "running".to_string(),
        prompt: Some(quickfix_prompt.clone()),
        error: None,
    });

    let app_handle_clone = app_handle.clone();
    let task_id_clone = task_id.clone();

    std::thread::spawn(move || {
        let result = Command::new("opencode")
            .current_dir(&project_path)
            .arg("--prompt")
            .arg(&full_prompt)
            .arg("--yes")
            .output();

        match result {
            Ok(output) => {
                if !output.status.success() {
                    let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
                    eprintln!("[WorkoPilot] Quickfix failed: {}", error_msg);
                    let _ = app_handle_clone.emit("quickfix-changed", QuickfixPayload {
                        task_id: task_id_clone,
                        status: "failed".to_string(),
                        prompt: None,
                        error: Some(error_msg),
                    });
                } else {
                    eprintln!("[WorkoPilot] Quickfix completed successfully");
                    let _ = app_handle_clone.emit("quickfix-changed", QuickfixPayload {
                        task_id: task_id_clone,
                        status: "completed".to_string(),
                        prompt: None,
                        error: None,
                    });
                }
            }
            Err(e) => {
                let error_msg = e.to_string();
                eprintln!("[WorkoPilot] Failed to run quickfix: {}", error_msg);
                let _ = app_handle_clone.emit("quickfix-changed", QuickfixPayload {
                    task_id: task_id_clone,
                    status: "failed".to_string(),
                    prompt: None,
                    error: Some(error_msg),
                });
            }
        }
    });

    Ok(())
}

const MAX_IMAGES_PER_TASK: i32 = 5;
const ALLOWED_MIME_TYPES: &[&str] = &["image/png", "image/jpeg", "image/gif", "image/webp"];

#[tauri::command]
pub fn add_task_image(
    state: State<AppState>,
    task_id: String,
    file_data: String,
    file_name: String,
    mime_type: String,
) -> Result<String, String> {
    if !ALLOWED_MIME_TYPES.contains(&mime_type.as_str()) {
        return Err(format!(
            "Invalid mime type: {}. Allowed: PNG, JPG, GIF, WebP",
            mime_type
        ));
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;

    let current_count = db.get_task_image_count(&task_id).map_err(|e| e.to_string())?;
    if current_count >= MAX_IMAGES_PER_TASK {
        return Err(format!(
            "Maximum of {} images per task reached",
            MAX_IMAGES_PER_TASK
        ));
    }

    let data = STANDARD
        .decode(&file_data)
        .map_err(|e| format!("Invalid base64 data: {}", e))?;

    db.add_task_image(&task_id, &data, &mime_type, &file_name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_task_images(state: State<AppState>, task_id: String) -> Result<Vec<TaskImageMetadata>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task_images_metadata(&task_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_task_image(state: State<AppState>, image_id: String) -> Result<TaskImage, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task_image(&image_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_task_image(state: State<AppState>, image_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_task_image(&image_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_task_image_from_path(
    state: State<AppState>,
    task_id: String,
    file_path: String,
) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let path = Path::new(&file_path);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png")
        .to_string();

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mime_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "png" => "image/png",
        _ => return Err(format!("Unsupported image format: {}", ext)),
    };

    if !ALLOWED_MIME_TYPES.contains(&mime_type) {
        return Err(format!(
            "Invalid mime type: {}. Allowed: PNG, JPG, GIF, WebP",
            mime_type
        ));
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;

    let current_count = db.get_task_image_count(&task_id).map_err(|e| e.to_string())?;
    if current_count >= MAX_IMAGES_PER_TASK {
        return Err(format!(
            "Maximum of {} images per task reached",
            MAX_IMAGES_PER_TASK
        ));
    }

    let data = fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    db.add_task_image(&task_id, &data, mime_type, &file_name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_activity_logs(
    state: State<AppState>,
    event_type: Option<String>,
    entity_type: Option<String>,
    project_id: Option<String>,
    limit: Option<i32>,
) -> Result<Vec<ActivityLog>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_activity_logs(
        event_type.as_deref(),
        entity_type.as_deref(),
        project_id.as_deref(),
        limit,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_activity_logs(
    state: State<AppState>,
    query: Option<String>,
    event_types: Option<Vec<String>>,
    project_id: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
    cursor: Option<String>,
    limit: Option<i32>,
) -> Result<ActivityLogSearchResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_activity_logs(
        query.as_deref(),
        event_types,
        project_id.as_deref(),
        from_date.as_deref(),
        to_date.as_deref(),
        cursor.as_deref(),
        limit.unwrap_or(30),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_user_sessions(
    state: State<AppState>,
    limit: Option<i32>,
) -> Result<Vec<UserSession>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_user_sessions(limit).map_err(|e| e.to_string())
}
