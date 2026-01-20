use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct TaskContext {
    pub description: Option<String>,
    pub business_rules: Vec<String>,
    pub technical_notes: Option<String>,
    pub acceptance_criteria: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub status: String,
    pub order: i32,

    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub acceptance_criteria: Option<Vec<String>>,
    #[serde(default)]
    pub technical_notes: Option<String>,
    #[serde(default)]
    pub prompt_context: Option<String>,

    pub created_at: String,
    #[serde(default)]
    pub completed_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AIMetadata {
    pub last_interaction: Option<String>,
    pub session_ids: Vec<String>,
    pub tokens_used: i64,
    #[serde(default)]
    pub structuring_complete: bool,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct TaskTimestamps {
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
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
    #[serde(default)]
    pub modified_at: Option<String>,
    #[serde(default)]
    pub modified_by: Option<String>,
}

impl TaskFull {
    pub fn new(id: String, title: String, priority: i32, category: String) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        TaskFull {
            schema_version: 2,
            initialized: false,
            id,
            title,
            status: "pending".to_string(),
            priority,
            category,
            complexity: None,
            context: TaskContext::default(),
            subtasks: vec![],
            ai_metadata: AIMetadata::default(),
            timestamps: TaskTimestamps {
                created_at: now.clone(),
                started_at: None,
                completed_at: None,
            },
            modified_at: Some(now),
            modified_by: Some("user".to_string()),
        }
    }
}

pub fn get_workopilot_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".workopilot")
        .join("tasks")
}

pub fn get_task_json_path(project_path: &str, task_id: &str) -> PathBuf {
    get_workopilot_dir(project_path).join(format!("{}.json", task_id))
}

pub fn ensure_workopilot_dir(project_path: &str) -> Result<(), String> {
    let dir = get_workopilot_dir(project_path);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create .workopilot/tasks: {}", e))
}

pub fn save_task_json(project_path: &str, task: &TaskFull) -> Result<(), String> {
    ensure_workopilot_dir(project_path)?;
    let path = get_task_json_path(project_path, &task.id);
    let json = serde_json::to_string_pretty(task).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| format!("Failed to write task JSON: {}", e))
}

pub fn migrate_v1_to_v2(task: &mut TaskFull) {
    if task.schema_version >= 2 {
        return;
    }
    task.schema_version = 2;
    task.ai_metadata.structuring_complete = true;
}

pub fn load_task_json(project_path: &str, task_id: &str) -> Result<TaskFull, String> {
    let path = get_task_json_path(project_path, task_id);
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read task JSON: {}", e))?;

    let mut task: TaskFull =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse task JSON: {}", e))?;

    if task.schema_version < 2 {
        migrate_v1_to_v2(&mut task);
        save_task_json(project_path, &task)?;
    }

    Ok(task)
}

pub fn delete_task_json(project_path: &str, task_id: &str) -> Result<(), String> {
    let path = get_task_json_path(project_path, task_id);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete task JSON: {}", e))?;
    }
    Ok(())
}
