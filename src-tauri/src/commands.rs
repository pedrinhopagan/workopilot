use crate::AppState;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::process::Command;
use tauri::{Emitter, Manager, State};

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    #[serde(default)]
    pub display_order: i32,
    #[serde(default)]
    pub routes: Vec<ProjectRoute>,
    #[serde(default)]
    pub tmux_config: Option<TmuxConfig>,
    #[serde(default)]
    pub business_rules: Option<String>,
    #[serde(default)]
    pub tmux_configured: bool,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectRoute {
    pub id: String,
    pub path: String,
    pub order: i32,
    pub env_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TmuxTab {
    pub id: String,
    pub name: String,
    pub route_id: String,
    pub startup_command: Option<String>,
    pub order: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TmuxConfig {
    pub session_name: String,
    pub tabs: Vec<TmuxTab>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Task {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: i32,
    pub category: String,
    pub status: String,
    pub due_date: Option<String>,
    pub scheduled_date: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskFull {
    pub schema_version: i32,
    pub initialized: bool,
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: i32,
    pub category: String,
    pub complexity: Option<String>,
    pub context: TaskContext,
    pub subtasks: Vec<Subtask>,
    pub ai_metadata: AIMetadata,
    pub timestamps: TaskTimestamps,
    pub modified_at: Option<String>,
    pub modified_by: Option<String>,
    pub project_id: Option<String>,
    pub due_date: Option<String>,
    pub scheduled_date: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TaskContext {
    pub description: Option<String>,
    #[serde(default)]
    pub business_rules: Vec<String>,
    pub technical_notes: Option<String>,
    pub acceptance_criteria: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Subtask {
    pub id: String,
    #[serde(default)]
    pub task_id: Option<String>,
    pub title: String,
    pub status: String,
    #[serde(default)]
    pub order: i32,
    pub description: Option<String>,
    pub acceptance_criteria: Option<Vec<String>>,
    pub technical_notes: Option<String>,
    pub prompt_context: Option<String>,
    pub created_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AIMetadata {
    pub last_interaction: Option<String>,
    pub last_completed_action: Option<String>,
    #[serde(default)]
    pub session_ids: Vec<String>,
    #[serde(default)]
    pub tokens_used: i64,
    #[serde(default)]
    pub structuring_complete: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TaskTimestamps {
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskExecution {
    pub id: String,
    pub task_id: String,
    pub subtask_id: Option<String>,
    pub execution_type: String,
    pub status: String,
    pub current_step: i32,
    pub total_steps: i32,
    pub current_step_description: Option<String>,
    pub waiting_for_input: bool,
    pub tmux_session: Option<String>,
    pub pid: Option<i32>,
    pub last_heartbeat: String,
    pub error_message: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
}

#[tauri::command]
pub fn get_projects(state: State<AppState>) -> Result<Vec<Project>, String> {
    let result = sidecar_call!(state, "projects.list")?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn get_project_with_config(state: State<AppState>, project_id: String) -> Result<Project, String> {
    let result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn add_project(
    state: State<AppState>,
    name: String,
    path: String,
    description: Option<String>,
) -> Result<String, String> {
    let result = sidecar_call!(state, "projects.create", json!({
        "name": name,
        "path": path,
        "description": description
    }))?;
    
    let project: Project = serde_json::from_value(result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    Ok(project.id)
}

#[tauri::command]
pub fn update_project(
    state: State<AppState>,
    project_id: String,
    name: String,
    description: Option<String>,
) -> Result<(), String> {
    sidecar_call!(state, "projects.update", json!({
        "id": project_id,
        "name": name,
        "description": description
    }))?;
    Ok(())
}

#[tauri::command]
pub fn update_project_name(
    state: State<AppState>,
    project_id: String,
    name: String,
) -> Result<(), String> {
    sidecar_call!(state, "projects.update", json!({
        "id": project_id,
        "name": name
    }))?;
    Ok(())
}

#[tauri::command]
pub fn update_project_routes(
    state: State<AppState>,
    project_id: String,
    routes: Vec<ProjectRoute>,
) -> Result<(), String> {
    sidecar_call!(state, "projects.update", json!({
        "id": project_id,
        "routes": routes
    }))?;
    Ok(())
}

#[tauri::command]
pub fn update_project_tmux_config(
    state: State<AppState>,
    project_id: String,
    tmux_config: TmuxConfig,
) -> Result<(), String> {
    sidecar_call!(state, "projects.update", json!({
        "id": project_id,
        "tmuxConfig": tmux_config
    }))?;
    Ok(())
}

#[tauri::command]
pub fn update_project_business_rules(
    state: State<AppState>,
    project_id: String,
    rules: String,
) -> Result<(), String> {
    sidecar_call!(state, "projects.update", json!({
        "id": project_id,
        "businessRules": rules
    }))?;
    Ok(())
}

#[tauri::command]
pub fn update_projects_order(
    state: State<AppState>,
    project_orders: Vec<(String, i32)>,
) -> Result<(), String> {
    let ordered_ids: Vec<String> = project_orders.iter().map(|(id, _)| id.clone()).collect();
    sidecar_call!(state, "projects.updateOrder", json!({
        "orderedIds": ordered_ids
    }))?;
    Ok(())
}

#[tauri::command]
pub fn set_tmux_configured(
    state: State<AppState>,
    project_id: String,
    configured: bool,
) -> Result<(), String> {
    sidecar_call!(state, "projects.update", json!({
        "id": project_id,
        "tmuxConfigured": configured
    }))?;
    Ok(())
}

#[tauri::command]
pub fn delete_project(state: State<AppState>, project_id: String) -> Result<(), String> {
    sidecar_call!(state, "projects.delete", json!({ "id": project_id }))?;
    Ok(())
}

#[tauri::command]
pub fn get_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let result = sidecar_call!(state, "tasks.list")?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn get_urgent_tasks(
    state: State<AppState>,
    project_id: String,
    limit: i32,
) -> Result<Vec<Task>, String> {
    let result = sidecar_call!(state, "tasks.list", json!({
        "projectId": project_id,
        "status": ["pending", "structured", "standby", "ready_to_review"],
        "limit": limit
    }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn get_active_tasks(
    state: State<AppState>,
    project_id: String,
    limit: i32,
) -> Result<Vec<Task>, String> {
    let result = sidecar_call!(state, "tasks.list", json!({
        "projectId": project_id,
        "status": ["structuring", "working"],
        "limit": limit
    }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn get_setting(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let result = sidecar_call!(state, "settings.get", json!({ "key": key }))?;
    if result.is_null() {
        Ok(None)
    } else {
        Ok(result.as_str().map(|s| s.to_string()))
    }
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    sidecar_call!(state, "settings.set", json!({ "key": key, "value": value }))?;
    Ok(())
}

#[tauri::command]
pub fn add_task(
    state: State<AppState>,
    project_id: String,
    title: String,
    priority: i32,
    category: String,
) -> Result<String, String> {
    let result = sidecar_call!(state, "tasks.create", json!({
        "projectId": project_id,
        "title": title,
        "priority": priority,
        "category": category
    }))?;
    
    let task: TaskFull = serde_json::from_value(result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    Ok(task.id)
}

#[tauri::command]
pub fn update_task_status(
    state: State<AppState>,
    task_id: String,
    status: String,
) -> Result<(), String> {
    sidecar_call!(state, "tasks.updateStatus", json!({
        "id": task_id,
        "status": status,
        "modifiedBy": "user"
    }))?;
    Ok(())
}

#[tauri::command]
pub fn schedule_task(
    state: State<AppState>,
    task_id: String,
    scheduled_date: String,
) -> Result<(), String> {
    sidecar_call!(state, "tasks.schedule", json!({
        "id": task_id,
        "date": scheduled_date
    }))?;
    Ok(())
}

#[tauri::command]
pub fn unschedule_task(state: State<AppState>, task_id: String) -> Result<(), String> {
    sidecar_call!(state, "tasks.unschedule", json!({ "id": task_id }))?;
    Ok(())
}

#[tauri::command]
pub fn get_tasks_for_month(
    state: State<AppState>,
    year: i32,
    month: i32,
    project_id: Option<String>,
) -> Result<Vec<Task>, String> {
    let mut params = json!({ "year": year, "month": month });
    if let Some(pid) = project_id {
        params["projectId"] = json!(pid);
    }
    let result = sidecar_call!(state, "tasks.listForMonth", params)?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn get_unscheduled_tasks(
    state: State<AppState>,
    project_id: Option<String>,
    _category: Option<String>,
    _priority: Option<i32>,
) -> Result<Vec<Task>, String> {
    let result = sidecar_call!(state, "tasks.listUnscheduled", json!({
        "projectId": project_id
    }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn get_tasks_for_date(state: State<AppState>, date: String) -> Result<Vec<Task>, String> {
    let result = sidecar_call!(state, "tasks.listForDate", json!({ "date": date }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
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
    let result = sidecar_call!(state, "tasks.create", json!({
        "projectId": project_id,
        "title": title,
        "priority": priority,
        "category": category
    }))?;
    
    let task: TaskFull = serde_json::from_value(result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    Ok(task.id)
}

#[tauri::command]
pub fn get_task_full(
    state: State<AppState>,
    _project_path: String,
    task_id: String,
) -> Result<TaskFull, String> {
    let result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn save_task_full(
    state: State<AppState>,
    _project_path: String,
    task: TaskFull,
) -> Result<(), String> {
    sidecar_call!(state, "tasks.saveFull", serde_json::to_value(&task).map_err(|e| e.to_string())?)?;
    Ok(())
}

#[tauri::command]
pub fn update_task_and_sync(
    state: State<AppState>,
    _project_path: String,
    task: TaskFull,
) -> Result<(), String> {
    sidecar_call!(state, "tasks.saveFull", serde_json::to_value(&task).map_err(|e| e.to_string())?)?;
    Ok(())
}

#[tauri::command]
pub fn delete_task_full(
    state: State<AppState>,
    _project_path: String,
    task_id: String,
) -> Result<(), String> {
    sidecar_call!(state, "tasks.delete", json!({ "id": task_id }))?;
    Ok(())
}

#[tauri::command]
pub fn get_task_by_id(state: State<AppState>, task_id: String) -> Result<Task, String> {
    let result = sidecar_call!(state, "tasks.get", json!({ "id": task_id }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
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
    let result = sidecar_call!(state, "executions.start", json!({
        "taskId": task_id,
        "subtaskId": subtask_id,
        "tmuxSession": tmux_session,
        "pid": pid,
        "totalSteps": total_steps.unwrap_or(0)
    }))?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn end_task_execution(
    state: State<AppState>,
    task_id: String,
    _status: String,
    error_message: Option<String>,
) -> Result<(), String> {
    sidecar_call!(state, "executions.end", json!({
        "taskId": task_id,
        "errorMessage": error_message
    }))?;
    Ok(())
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
    let active_result = sidecar_call!(state, "executions.getActiveForTask", json!({
        "taskId": task_id
    }))?;
    
    if active_result.is_null() {
        return Err("No active execution found".to_string());
    }
    
    let execution: TaskExecution = serde_json::from_value(active_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let mut update = json!({});
    if let Some(step) = current_step {
        update["currentStep"] = json!(step);
    }
    if let Some(total) = total_steps {
        update["totalSteps"] = json!(total);
    }
    if let Some(desc) = description {
        update["currentStepDescription"] = json!(desc);
    }
    if let Some(waiting) = waiting_for_input {
        update["waitingForInput"] = json!(waiting);
    }
    update["id"] = json!(execution.id);
    
    sidecar_call!(state, "executions.update", update)?;
    Ok(())
}

#[tauri::command]
pub fn get_active_task_execution(
    state: State<AppState>,
    task_id: String,
) -> Result<Option<TaskExecution>, String> {
    let result = sidecar_call!(state, "executions.getActiveForTask", json!({
        "taskId": task_id
    }))?;
    
    if result.is_null() {
        Ok(None)
    } else {
        let execution = serde_json::from_value(result)
            .map_err(|e| format!("Deserialize error: {}", e))?;
        Ok(Some(execution))
    }
}

#[tauri::command]
pub fn get_all_active_executions(state: State<AppState>) -> Result<Vec<TaskExecution>, String> {
    let result = sidecar_call!(state, "executions.listAllActive")?;
    serde_json::from_value(result).map_err(|e| format!("Deserialize error: {}", e))
}

#[tauri::command]
pub fn cleanup_stale_task_executions(
    state: State<AppState>,
    timeout_minutes: Option<i32>,
) -> Result<i32, String> {
    let result = sidecar_call!(state, "executions.cleanupStale", json!({
        "maxAgeMinutes": timeout_minutes.unwrap_or(5)
    }))?;
    
    result.as_i64().map(|n| n as i32).ok_or_else(|| "Invalid result".to_string())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CalendarTask {
    pub id: String,
    pub title: String,
    pub project_id: Option<String>,
    pub project_name: String,
    pub priority: i32,
    pub category: String,
    pub status: String,
    pub scheduled_date: String,
    pub due_date: Option<String>,
    pub is_overdue: bool,
    pub subtask_count: i32,
    pub subtask_done_count: i32,
}

#[tauri::command]
pub fn enrich_calendar_tasks(
    state: State<AppState>,
    tasks: Vec<CalendarTask>,
    _project_paths: std::collections::HashMap<String, String>,
) -> Result<Vec<CalendarTask>, String> {
    let mut enriched = Vec::with_capacity(tasks.len());
    
    for mut task in tasks {
        if let Ok(result) = sidecar_call!(state, "subtasks.listByTaskId", json!({
            "taskId": task.id
        })) {
            if let Ok(subtasks) = serde_json::from_value::<Vec<Subtask>>(result) {
                task.subtask_count = subtasks.len() as i32;
                task.subtask_done_count = subtasks.iter().filter(|s| s.status == "done").count() as i32;
            }
        }
        enriched.push(task);
    }
    
    Ok(enriched)
}

#[tauri::command]
pub fn launch_project_tmux(state: State<AppState>, project_id: String) -> Result<(), String> {
    let result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(result)
        .map_err(|e| format!("Deserialize error: {}", e))?;

    let tmux_config = project.tmux_config.ok_or("No tmux config")?;
    let routes = project.routes;
    
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
pub fn get_ai_suggestion(tasks: Vec<Task>) -> Result<String, String> {
    if tasks.is_empty() {
        return Ok(
            "Adicione algumas tarefas para receber sugestões de fluxo de trabalho.".to_string(),
        );
    }

    let high_priority: Vec<_> = tasks
        .iter()
        .filter(|t| t.priority == 1 && t.status != "completed")
        .collect();
    let medium_priority: Vec<_> = tasks
        .iter()
        .filter(|t| t.priority == 2 && t.status != "completed")
        .collect();
    let pending_count = tasks.iter().filter(|t| t.status != "completed").count();

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileModified {
    pub path: String,
    pub action: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionLog {
    pub id: String,
    pub project_name: String,
    pub summary: String,
    pub tokens_total: i32,
    pub files_modified: Vec<FileModified>,
    pub created_at: String,
}

#[tauri::command]
pub fn get_session_logs(_state: State<AppState>) -> Result<Vec<SessionLog>, String> {
    Ok(vec![])
}

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
    project: &Project,
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
    app_handle
        .path()
        .resource_dir()
        .map(|p| p.join("resources").join("opencode-skills"))
        .ok()
        .filter(|p| p.exists())
        .or_else(|| {
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
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    let task_full: TaskFull = serde_json::from_value(task_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;

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
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    let task_full: TaskFull = serde_json::from_value(task_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    // Update task status via sidecar
    sidecar_call!(state, "tasks.updateStatus", json!({
        "id": task_id,
        "status": "structuring",
        "modifiedBy": "user"
    }))?;

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
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    let task_full: TaskFull = serde_json::from_value(task_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    sidecar_call!(state, "tasks.updateStatus", json!({
        "id": task_id,
        "status": "working",
        "modifiedBy": "user"
    }))?;

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
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    let task_full: TaskFull = serde_json::from_value(task_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let subtask_title = task_full.subtasks.iter()
        .find(|s| s.id == subtask_id)
        .map(|s| s.title.clone())
        .unwrap_or_else(|| "Subtask".to_string());
    
    sidecar_call!(state, "tasks.updateStatus", json!({
        "id": task_id,
        "status": "working",
        "modifiedBy": "user"
    }))?;

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
    
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))
        .map_err(|e| {
            eprintln!("[WorkoPilot] Failed to get project: {}", e);
            e
        })?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| {
            eprintln!("[WorkoPilot] Failed to deserialize project: {}", e);
            format!("Deserialize error: {}", e)
        })?;
    
    let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    let task_full: TaskFull = serde_json::from_value(task_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;

    eprintln!("[WorkoPilot] Project found: {}", project.name);

    let initial_prompt = format!(
        "Revisar: {}, utilize a skill workopilot-review para revisar a task de id: {}",
        task_full.title, task_id
    );
    
    eprintln!("[WorkoPilot] Launching session with prompt: {}", initial_prompt);
    launch_in_workopilot_session(&app_handle, &project, &initial_prompt, &task_id, false)
}

#[tauri::command]
pub fn focus_tmux_session(app_handle: tauri::AppHandle, session_name: String) -> Result<(), String> {
    if let Ok(output) = Command::new("tmux")
        .args(["list-clients", "-t", &session_name, "-F", "#{client_tty}"])
        .output()
    {
        if output.status.success() && !output.stdout.is_empty() {
            if let Ok(search_output) = Command::new("xdotool")
                .args(["search", "--name", &session_name])
                .output()
            {
                if search_output.status.success() {
                    let window_ids = String::from_utf8_lossy(&search_output.stdout);
                    if let Some(window_id) = window_ids.lines().next() {
                        let _ = Command::new("xdotool")
                            .args(["windowactivate", window_id])
                            .spawn();
                        crate::window::hide(&app_handle);
                        return Ok(());
                    }
                }
            }
        }
    }

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

#[derive(Clone, Serialize)]
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
    let project_result = sidecar_call!(state, "projects.get", json!({ "id": project_id }))?;
    let project: Project = serde_json::from_value(project_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;
    
    let task_result = sidecar_call!(state, "tasks.getFull", json!({ "id": task_id }))?;
    let task_full: TaskFull = serde_json::from_value(task_result)
        .map_err(|e| format!("Deserialize error: {}", e))?;

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskImageMetadata {
    pub id: String,
    pub file_name: String,
    pub mime_type: String,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskImage {
    pub id: String,
    pub task_id: String,
    pub data: String,
    pub mime_type: String,
    pub file_name: String,
    pub created_at: Option<String>,
}

#[tauri::command]
pub fn add_task_image(
    state: State<AppState>,
    task_id: String,
    file_data: String,
    file_name: String,
    mime_type: String,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    
    const ALLOWED_MIME_TYPES: &[&str] = &["image/png", "image/jpeg", "image/gif", "image/webp"];
    const MAX_IMAGES_PER_TASK: i32 = 5;
    
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
    let images = db.get_task_images_metadata(&task_id).map_err(|e| e.to_string())?;
    Ok(images.into_iter().map(|i| TaskImageMetadata {
        id: i.id,
        file_name: i.file_name,
        mime_type: i.mime_type,
        created_at: i.created_at,
    }).collect())
}

#[tauri::command]
pub fn get_task_image(state: State<AppState>, image_id: String) -> Result<TaskImage, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let image = db.get_task_image(&image_id).map_err(|e| e.to_string())?;
    Ok(TaskImage {
        id: image.id,
        task_id: image.task_id,
        data: STANDARD.encode(&image.data),
        mime_type: image.mime_type,
        file_name: image.file_name,
        created_at: image.created_at,
    })
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
    
    const ALLOWED_MIME_TYPES: &[&str] = &["image/png", "image/jpeg", "image/gif", "image/webp"];
    const MAX_IMAGES_PER_TASK: i32 = 5;

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivityLog {
    pub id: String,
    pub event_type: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub project_id: Option<String>,
    pub metadata: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivityLogWithContext {
    pub id: String,
    pub event_type: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub project_id: Option<String>,
    pub metadata: Option<String>,
    pub created_at: String,
    pub project_name: Option<String>,
    pub task_title: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ActivityLogSearchResult {
    pub logs: Vec<ActivityLogWithContext>,
    pub total: i32,
    pub next_cursor: Option<String>,
    pub has_more: bool,
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
    let logs = db.get_activity_logs(
        event_type.as_deref(),
        entity_type.as_deref(),
        project_id.as_deref(),
        limit,
    ).map_err(|e| e.to_string())?;
    
    Ok(logs.into_iter().map(|l| ActivityLog {
        id: l.id,
        event_type: l.event_type,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        project_id: l.project_id,
        metadata: l.metadata,
        created_at: l.created_at,
    }).collect())
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
    let result = db.search_activity_logs(
        query.as_deref(),
        event_types,
        project_id.as_deref(),
        from_date.as_deref(),
        to_date.as_deref(),
        cursor.as_deref(),
        limit.unwrap_or(30),
    ).map_err(|e| e.to_string())?;
    
    Ok(ActivityLogSearchResult {
        logs: result.logs.into_iter().map(|l| ActivityLogWithContext {
            id: l.id,
            event_type: l.event_type,
            entity_type: l.entity_type,
            entity_id: l.entity_id,
            project_id: l.project_id,
            metadata: l.metadata,
            created_at: l.created_at,
            project_name: l.project_name,
            task_title: l.task_title,
        }).collect(),
        total: result.total,
        next_cursor: result.next_cursor,
        has_more: result.has_more,
    })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserSession {
    pub id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_seconds: Option<i32>,
    pub app_version: Option<String>,
}

#[tauri::command]
pub fn get_user_sessions(
    state: State<AppState>,
    limit: Option<i32>,
) -> Result<Vec<UserSession>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sessions = db.get_user_sessions(limit).map_err(|e| e.to_string())?;
    
    Ok(sessions.into_iter().map(|s| UserSession {
        id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        app_version: s.app_version,
    }).collect())
}
