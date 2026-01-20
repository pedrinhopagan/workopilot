use crate::database::{
    CalendarTask, Project, ProjectRoute, ProjectWithConfig, SessionLog, Task, TmuxConfig,
};
use crate::task_json::{delete_task_json, load_task_json, save_task_json, TaskFull};
use crate::AppState;
use std::process::Command;
use tauri::{Manager, State};

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
    project_path: String,
    title: String,
    priority: i32,
    category: String,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    let json_path = format!(".workopilot/tasks/{}.json", task_id);

    let task_full = TaskFull::new(task_id.clone(), title.clone(), priority, category.clone());
    save_task_json(&project_path, &task_full)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.add_task_with_json(
        &task_id,
        &project_id,
        &title,
        priority,
        &category,
        &json_path,
    )
    .map_err(|e| e.to_string())?;

    Ok(task_id)
}

#[tauri::command]
pub fn get_task_full(project_path: String, task_id: String) -> Result<TaskFull, String> {
    load_task_json(&project_path, &task_id)
}

#[tauri::command]
pub fn save_task_full(
    state: State<AppState>,
    project_path: String,
    task: TaskFull,
) -> Result<(), String> {
    if let Ok(watcher) = state.file_watcher.lock() {
        watcher.mark_internal_write(&task.id);
    }
    save_task_json(&project_path, &task)
}

#[tauri::command]
pub fn update_task_and_sync(
    state: State<AppState>,
    project_path: String,
    task: TaskFull,
) -> Result<(), String> {
    if let Ok(watcher) = state.file_watcher.lock() {
        watcher.mark_internal_write(&task.id);
    }
    save_task_json(&project_path, &task)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
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
    project_path: String,
    task_id: String,
) -> Result<(), String> {
    delete_task_json(&project_path, &task_id)?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_task_by_id(state: State<AppState>, task_id: String) -> Result<Task, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task_by_id(&task_id).map_err(|e| e.to_string())
}

fn launch_in_workopilot_session(
    _app_handle: &tauri::AppHandle,
    project: &ProjectWithConfig,
    initial_prompt: &str,
    task_id: &str,
) -> Result<(), String> {
    let session_name = "workopilot";

    // Tab name: "{project} - {task truncated}"
    let task_short = if task_id.len() > 12 {
        &task_id[..12]
    } else {
        task_id
    };
    let tab_name = format!("{} - {}...", &project.name, task_short);

    let first_route = project.routes.first().ok_or("No routes configured")?;
    let project_path = &first_route.path;

    let escaped_prompt = initial_prompt.replace('\\', "\\\\").replace('"', "\\\"");

    let script = format!(
        r#"#!/usr/bin/env bash
SESSION="{session_name}"
TAB_NAME="{tab_name}"
PROJECT_PATH="{project_path}"
PROMPT="{escaped_prompt}"

if tmux has-session -t "$SESSION" 2>/dev/null; then
    # Session exists, create new window
    tmux new-window -t "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
    tmux send-keys -t "$SESSION:$TAB_NAME" "opencode" Enter
    sleep 2
    tmux send-keys -t "$SESSION:$TAB_NAME" "$PROMPT" Enter
    tmux select-window -t "$SESSION:$TAB_NAME"
    tmux attach-session -t "$SESSION"
else
    # Create new session
    tmux new-session -d -s "$SESSION" -n "$TAB_NAME" -c "$PROJECT_PATH"
    tmux send-keys -t "$SESSION:$TAB_NAME" "opencode" Enter
    sleep 2
    tmux send-keys -t "$SESSION:$TAB_NAME" "$PROMPT" Enter
    tmux attach-session -t "$SESSION"
fi
"#
    );

    Command::new("alacritty")
        .arg("-e")
        .arg("bash")
        .arg("-c")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("Failed to launch tmux: {}", e))?;

    Ok(())
}

fn copy_skill_file(app_handle: &tauri::AppHandle, project_path: &str) -> Result<(), String> {
    let skill_source = app_handle
        .path()
        .resource_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("resources")
        .join("opencode-skill")
        .join("workopilot-task.md");

    let skill_dest_dir = std::path::Path::new(project_path)
        .join(".opencode")
        .join("skills");

    std::fs::create_dir_all(&skill_dest_dir)
        .map_err(|e| format!("Failed to create skills directory: {}", e))?;

    let skill_dest = skill_dest_dir.join("workopilot-task.md");
    std::fs::copy(&skill_source, &skill_dest)
        .map_err(|e| format!("Failed to copy skill: {}", e))?;

    Ok(())
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

    // Copy skill file
    copy_skill_file(&app_handle, &project.path)?;

    let task_json_path = format!(".workopilot/tasks/{}.json", task_id);

    // Load task to check structuring_complete
    let task_full = load_task_json(&project.path, &task_id)?;

    let initial_prompt = if let Some(st_id) = subtask_id {
        format!(
            "Usar skill workopilot-task para executar a subtask {} da task em {}",
            st_id, task_json_path
        )
    } else if !task_full.ai_metadata.structuring_complete {
        format!(
            "Usar skill workopilot-task para estruturar a task em {}",
            task_json_path
        )
    } else {
        format!(
            "Usar skill workopilot-task para a task em {}",
            task_json_path
        )
    };

    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id)
}

#[tauri::command]
pub fn launch_task_review(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_id: String,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let project = db
        .get_project_with_config(&project_id)
        .map_err(|e| e.to_string())?;

    // Copy skill file
    copy_skill_file(&app_handle, &project.path)?;

    let task_json_path = format!(".workopilot/tasks/{}.json", task_id);
    let initial_prompt = format!(
        "Usar skill workopilot-task para REVISAR a task em {}",
        task_json_path
    );

    // Launch in workopilot tmux session
    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id)
}

#[tauri::command]
pub fn start_watching_project(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    project_path: String,
) -> Result<(), String> {
    let mut watcher = state.file_watcher.lock().map_err(|e| e.to_string())?;
    watcher.start_watching(project_path, app_handle)
}

#[tauri::command]
pub fn stop_watching_project(state: State<AppState>, project_path: String) -> Result<(), String> {
    let mut watcher = state.file_watcher.lock().map_err(|e| e.to_string())?;
    watcher.stop_watching(&project_path);
    Ok(())
}
