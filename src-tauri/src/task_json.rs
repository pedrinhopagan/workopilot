use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct TaskContext {
    pub description: Option<String>,
    #[serde(default)]
    pub business_rules: Vec<String>,
    pub technical_notes: Option<String>,
    pub acceptance_criteria: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub status: String,
    #[serde(default)]
    pub order: i32,

    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub acceptance_criteria: Option<Vec<String>>,
    #[serde(default)]
    pub technical_notes: Option<String>,
    #[serde(default)]
    pub prompt_context: Option<String>,

    #[serde(default = "default_created_at")]
    pub created_at: String,
    #[serde(default)]
    pub completed_at: Option<String>,
}

fn default_created_at() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AIMetadata {
    pub last_interaction: Option<String>,
    #[serde(default)]
    pub session_ids: Vec<String>,
    #[serde(default)]
    pub tokens_used: i64,
    #[serde(default)]
    pub structuring_complete: bool,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct TaskTimestamps {
    #[serde(default = "default_created_at")]
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

// V1 Microtask for migration
#[derive(Deserialize, Clone)]
struct MicrotaskV1 {
    id: String,
    title: String,
    status: String,
    #[serde(default)]
    prompt_context: Option<String>,
    #[serde(default)]
    completed_at: Option<String>,
}

// Intermediate struct for loading both v1 and v2
#[derive(Deserialize)]
struct TaskFullRaw {
    schema_version: i32,
    initialized: bool,
    id: String,
    title: String,
    status: String,
    priority: i32,
    category: String,
    complexity: Option<String>,
    context: TaskContext,
    #[serde(default)]
    subtasks: Option<Vec<Subtask>>,
    #[serde(default)]
    microtasks: Option<Vec<MicrotaskV1>>,
    #[serde(default)]
    ai_metadata: AIMetadata,
    #[serde(default)]
    timestamps: TaskTimestamps,
    #[serde(default)]
    modified_at: Option<String>,
    #[serde(default)]
    modified_by: Option<String>,
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

fn convert_microtask_to_subtask(mt: MicrotaskV1, order: i32) -> Subtask {
    Subtask {
        id: mt.id,
        title: mt.title,
        status: mt.status,
        order,
        description: None,
        acceptance_criteria: None,
        technical_notes: None,
        prompt_context: mt.prompt_context,
        created_at: chrono::Utc::now().to_rfc3339(),
        completed_at: mt.completed_at,
    }
}

pub fn load_task_json(project_path: &str, task_id: &str) -> Result<TaskFull, String> {
    let path = get_task_json_path(project_path, task_id);
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read task JSON: {}", e))?;

    let raw: TaskFullRaw =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse task JSON: {}", e))?;

    let subtasks = if let Some(st) = raw.subtasks {
        st
    } else if let Some(mt) = raw.microtasks {
        mt.into_iter()
            .enumerate()
            .map(|(i, m)| convert_microtask_to_subtask(m, i as i32))
            .collect()
    } else {
        vec![]
    };

    let task = TaskFull {
        schema_version: 2,
        initialized: raw.initialized,
        id: raw.id,
        title: raw.title,
        status: raw.status,
        priority: raw.priority,
        category: raw.category,
        complexity: raw.complexity,
        context: raw.context,
        subtasks,
        ai_metadata: AIMetadata {
            last_interaction: raw.ai_metadata.last_interaction,
            session_ids: raw.ai_metadata.session_ids,
            tokens_used: raw.ai_metadata.tokens_used,
            structuring_complete: if raw.schema_version < 2 {
                true
            } else {
                raw.ai_metadata.structuring_complete
            },
        },
        timestamps: raw.timestamps,
        modified_at: raw.modified_at,
        modified_by: raw.modified_by,
    };

    if raw.schema_version < 2 {
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
