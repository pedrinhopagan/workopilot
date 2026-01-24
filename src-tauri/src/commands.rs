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

// ============================================================================
// Types (kept for commands that still need them)
// ============================================================================

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
    pub color: Option<String>,
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

// ============================================================================
// File System Commands (remain in Rust)
// ============================================================================

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

// ============================================================================
// AI Suggestion (local processing, no DB needed)
// ============================================================================

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

// ============================================================================
// Skills Sync (file system operations)
// ============================================================================

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

fn get_opencode_plugin_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME")
        .map_err(|_| "Could not determine HOME directory".to_string())?;
    Ok(std::path::Path::new(&home)
        .join(".config")
        .join("opencode")
        .join("plugin"))
}

fn get_plugin_resource_dir(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app_handle
        .path()
        .resource_dir()
        .map(|p| p.join("resources").join("opencode-plugin"))
        .ok()
        .filter(|p| p.exists())
        .or_else(|| {
            let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join("opencode-plugin");
            if dev_path.exists() {
                Some(dev_path)
            } else {
                None
            }
        })
        .ok_or_else(|| "Could not find plugin resource directory".to_string())
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

    if let Ok(plugin_resource_dir) = get_plugin_resource_dir(app_handle) {
        if let Ok(plugin_dest_dir) = get_opencode_plugin_dir() {
            let plugin_source = plugin_resource_dir.join("workopilot.js");
            if plugin_source.exists() {
                if let Err(e) = std::fs::create_dir_all(&plugin_dest_dir) {
                    eprintln!("[WorkoPilot] Failed to create plugin directory: {}", e);
                } else {
                    let plugin_dest = plugin_dest_dir.join("workopilot.js");
                    if let Err(e) = std::fs::copy(&plugin_source, &plugin_dest) {
                        eprintln!("[WorkoPilot] Failed to copy plugin: {}", e);
                    } else {
                        eprintln!("[WorkoPilot] Synced plugin to {:?}", plugin_dest);
                    }
                }
            }
        }
    }

    eprintln!("[WorkoPilot] Synced {} skills to OpenCode", synced_count);
    Ok(synced_count)
}

#[tauri::command]
pub fn sync_skills(app_handle: tauri::AppHandle) -> Result<u32, String> {
    sync_skills_to_opencode(&app_handle)
}

// ============================================================================
// Quickfix Background (spawn process)
// ============================================================================

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

// ============================================================================
// User Sessions (database access for activity tracking)
// ============================================================================

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
