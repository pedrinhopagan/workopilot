use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::get_db_path();

        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;
        let db = Database { conn };
        db.init_schema()?;
        Ok(db)
    }

    fn get_db_path() -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("workopilot")
            .join("workopilot.db")
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                description TEXT,
                routes TEXT DEFAULT '[]',
                tmux_config TEXT DEFAULT '{}',
                business_rules TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(id),
                title TEXT NOT NULL,
                description TEXT,
                priority INTEGER DEFAULT 2,
                category TEXT DEFAULT 'feature',
                status TEXT DEFAULT 'pending',
                estimated_minutes INTEGER,
                due_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT
            );
            
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                project_id TEXT REFERENCES projects(id),
                project_name TEXT,
                session_id TEXT,
                summary TEXT,
                files_modified TEXT,
                tokens_input INTEGER DEFAULT 0,
                tokens_output INTEGER DEFAULT 0,
                tokens_total INTEGER DEFAULT 0,
                raw_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS daily_stats (
                date TEXT PRIMARY KEY,
                tokens_used INTEGER DEFAULT 0,
                tokens_goal INTEGER DEFAULT 100000,
                tasks_completed INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )?;

        self.migrate_projects_table()?;
        self.migrate_tasks_table()?;
        self.migrate_tmux_configured()?;
        self.migrate_tasks_json_path()?;
        self.migrate_tasks_scheduled_date()?;

        Ok(())
    }

    fn migrate_tmux_configured(&self) -> Result<()> {
        let columns: Vec<String> = self
            .conn
            .prepare("PRAGMA table_info(projects)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>>>()?;

        if !columns.contains(&"tmux_configured".to_string()) {
            self.conn.execute(
                "ALTER TABLE projects ADD COLUMN tmux_configured INTEGER DEFAULT 0",
                [],
            )?;
        }

        Ok(())
    }

    fn migrate_projects_table(&self) -> Result<()> {
        let columns: Vec<String> = self
            .conn
            .prepare("PRAGMA table_info(projects)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>>>()?;

        if !columns.contains(&"routes".to_string()) {
            self.conn.execute(
                "ALTER TABLE projects ADD COLUMN routes TEXT DEFAULT '[]'",
                [],
            )?;
        }
        if !columns.contains(&"tmux_config".to_string()) {
            self.conn.execute(
                "ALTER TABLE projects ADD COLUMN tmux_config TEXT DEFAULT '{}'",
                [],
            )?;
        }
        if !columns.contains(&"business_rules".to_string()) {
            self.conn.execute(
                "ALTER TABLE projects ADD COLUMN business_rules TEXT DEFAULT ''",
                [],
            )?;
        }

        Ok(())
    }

    fn migrate_tasks_table(&self) -> Result<()> {
        let columns: Vec<String> = self
            .conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>>>()?;

        if !columns.contains(&"due_date".to_string()) {
            self.conn
                .execute("ALTER TABLE tasks ADD COLUMN due_date TEXT", [])?;
        }

        Ok(())
    }

    fn migrate_tasks_json_path(&self) -> Result<()> {
        let columns: Vec<String> = self
            .conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>>>()?;

        if !columns.contains(&"json_path".to_string()) {
            self.conn
                .execute("ALTER TABLE tasks ADD COLUMN json_path TEXT", [])?;
        }

        Ok(())
    }

    fn migrate_tasks_scheduled_date(&self) -> Result<()> {
        let columns: Vec<String> = self
            .conn
            .prepare("PRAGMA table_info(tasks)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<Result<Vec<_>>>()?;

        if !columns.contains(&"scheduled_date".to_string()) {
            self.conn
                .execute("ALTER TABLE tasks ADD COLUMN scheduled_date TEXT", [])?;
        }

        Ok(())
    }

    pub fn get_projects(&self) -> Result<Vec<Project>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, path, description FROM projects ORDER BY name")?;

        let projects = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    description: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(projects)
    }

    pub fn get_project_with_config(&self, project_id: &str) -> Result<ProjectWithConfig> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, description, routes, tmux_config, business_rules, created_at, tmux_configured
             FROM projects WHERE id = ?1"
        )?;

        stmt.query_row([project_id], |row| {
            let routes_json: String = row
                .get::<_, Option<String>>(4)?
                .unwrap_or_else(|| "[]".to_string());
            let tmux_config_json: String = row
                .get::<_, Option<String>>(5)?
                .unwrap_or_else(|| "{}".to_string());
            let business_rules: String = row.get::<_, Option<String>>(6)?.unwrap_or_default();
            let tmux_configured: bool = row.get::<_, Option<i32>>(8)?.unwrap_or(0) == 1;

            let routes: Vec<ProjectRoute> = serde_json::from_str(&routes_json).unwrap_or_default();
            let tmux_config: TmuxConfig =
                serde_json::from_str(&tmux_config_json).unwrap_or_else(|_| TmuxConfig {
                    session_name: row.get::<_, String>(1).unwrap_or_default(),
                    tabs: vec![],
                });

            Ok(ProjectWithConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                description: row.get(3)?,
                routes,
                tmux_config,
                business_rules,
                tmux_configured,
                created_at: row.get(7)?,
            })
        })
    }

    pub fn add_project(&self, name: &str, path: &str, description: Option<&str>) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let root_route_id = uuid::Uuid::new_v4().to_string();

        let default_routes = serde_json::json!([{
            "id": root_route_id,
            "path": path,
            "order": 0,
            "env_path": null
        }]);

        let default_tmux = serde_json::json!({
            "session_name": name.to_lowercase().replace(" ", "-"),
            "tabs": [{
                "id": uuid::Uuid::new_v4().to_string(),
                "name": "oc",
                "route_id": root_route_id,
                "startup_command": "opencode",
                "order": 0
            }, {
                "id": uuid::Uuid::new_v4().to_string(),
                "name": "term",
                "route_id": root_route_id,
                "startup_command": null,
                "order": 1
            }]
        });

        self.conn.execute(
            "INSERT INTO projects (id, name, path, description, routes, tmux_config) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (&id, name, path, description, default_routes.to_string(), default_tmux.to_string()),
        )?;
        Ok(id)
    }

    pub fn update_project(
        &self,
        project_id: &str,
        name: &str,
        description: Option<&str>,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET name = ?1, description = ?2 WHERE id = ?3",
            (name, description, project_id),
        )?;
        Ok(())
    }

    pub fn update_project_name(&self, project_id: &str, name: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET name = ?1 WHERE id = ?2",
            (name, project_id),
        )?;
        Ok(())
    }

    pub fn update_project_routes(&self, project_id: &str, routes: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET routes = ?1 WHERE id = ?2",
            (routes, project_id),
        )?;
        Ok(())
    }

    pub fn update_project_tmux_config(&self, project_id: &str, tmux_config: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET tmux_config = ?1 WHERE id = ?2",
            (tmux_config, project_id),
        )?;
        Ok(())
    }

    pub fn update_project_business_rules(&self, project_id: &str, rules: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET business_rules = ?1 WHERE id = ?2",
            (rules, project_id),
        )?;
        Ok(())
    }

    pub fn set_tmux_configured(&self, project_id: &str, configured: bool) -> Result<()> {
        self.conn.execute(
            "UPDATE projects SET tmux_configured = ?1 WHERE id = ?2",
            (if configured { 1 } else { 0 }, project_id),
        )?;
        Ok(())
    }

    pub fn delete_project(&self, project_id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM tasks WHERE project_id = ?1", [project_id])?;
        self.conn
            .execute("DELETE FROM projects WHERE id = ?1", [project_id])?;
        Ok(())
    }

    pub fn get_tasks(&self) -> Result<Vec<Task>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
             FROM tasks 
             ORDER BY priority ASC, created_at DESC"
        )?;

        let tasks = stmt
            .query_map([], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: row.get(4)?,
                    category: row.get(5)?,
                    status: row.get(6)?,
                    due_date: row.get(7)?,
                    json_path: row.get(8)?,
                    created_at: row.get(9)?,
                    scheduled_date: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn get_urgent_tasks(&self, project_id: &str, limit: i32) -> Result<Vec<Task>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
             FROM tasks 
             WHERE project_id = ?1 AND status = 'pending'
             ORDER BY 
                CASE WHEN due_date IS NOT NULL THEN 0 ELSE 1 END,
                due_date ASC,
                priority ASC,
                created_at ASC
             LIMIT ?2"
        )?;

        let tasks = stmt
            .query_map([project_id, &limit.to_string()], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: row.get(4)?,
                    category: row.get(5)?,
                    status: row.get(6)?,
                    due_date: row.get(7)?,
                    json_path: row.get(8)?,
                    created_at: row.get(9)?,
                    scheduled_date: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn add_task(
        &self,
        project_id: &str,
        title: &str,
        priority: i32,
        category: &str,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO tasks (id, project_id, title, priority, category) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&id, project_id, title, priority, category),
        )?;
        Ok(id)
    }

    pub fn add_task_with_json(
        &self,
        id: &str,
        project_id: &str,
        title: &str,
        priority: i32,
        category: &str,
        json_path: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO tasks (id, project_id, title, priority, category, json_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (id, project_id, title, priority, category, json_path),
        )?;
        Ok(())
    }

    pub fn update_task(
        &self,
        task_id: &str,
        title: &str,
        priority: i32,
        category: &str,
        status: &str,
    ) -> Result<()> {
        let completed_at = if status == "done" {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };

        self.conn.execute(
            "UPDATE tasks SET title = ?1, priority = ?2, category = ?3, status = ?4, completed_at = ?5 WHERE id = ?6",
            (title, priority, category, status, completed_at, task_id),
        )?;
        Ok(())
    }

    pub fn delete_task(&self, task_id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM tasks WHERE id = ?1", [task_id])?;
        Ok(())
    }

    pub fn get_task_by_id(&self, task_id: &str) -> Result<Task> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
             FROM tasks WHERE id = ?1"
        )?;

        stmt.query_row([task_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                due_date: row.get(7)?,
                json_path: row.get(8)?,
                created_at: row.get(9)?,
                scheduled_date: row.get(10)?,
            })
        })
    }

    pub fn update_task_status(&self, task_id: &str, status: &str) -> Result<()> {
        let completed_at = if status == "done" {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };

        self.conn.execute(
            "UPDATE tasks SET status = ?1, completed_at = ?2 WHERE id = ?3",
            (status, completed_at, task_id),
        )?;
        Ok(())
    }

    pub fn schedule_task(&self, task_id: &str, scheduled_date: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE tasks SET scheduled_date = ?1 WHERE id = ?2",
            (scheduled_date, task_id),
        )?;
        Ok(())
    }

    pub fn unschedule_task(&self, task_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE tasks SET scheduled_date = NULL WHERE id = ?1",
            [task_id],
        )?;
        Ok(())
    }

    pub fn get_tasks_for_month(
        &self,
        year: i32,
        month: i32,
        project_id: Option<&str>,
    ) -> Result<Vec<CalendarTask>> {
        let start_date = format!("{:04}-{:02}-01", year, month);
        let end_date = if month == 12 {
            format!("{:04}-01-01", year + 1)
        } else {
            format!("{:04}-{:02}-01", year, month + 1)
        };

        let query = "SELECT t.id, t.title, t.project_id, COALESCE(p.name, '—') as project_name,
                t.priority, t.category, t.status, t.scheduled_date, t.due_date
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.scheduled_date >= ?1 AND t.scheduled_date < ?2
         ORDER BY t.scheduled_date, t.priority";

        let mut stmt = self.conn.prepare(query)?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let rows = stmt.query_map([&start_date, &end_date], |row| {
            let scheduled: String = row.get(7)?;
            let due: Option<String> = row.get(8)?;
            let is_overdue = due
                .as_ref()
                .map(|d| scheduled > *d || today > *d)
                .unwrap_or(false);

            Ok(CalendarTask {
                id: row.get(0)?,
                title: row.get(1)?,
                project_id: row.get(2)?,
                project_name: row.get(3)?,
                priority: row.get(4)?,
                category: row.get(5)?,
                status: row.get(6)?,
                scheduled_date: scheduled,
                due_date: due,
                is_overdue,
                is_microtask: false,
                parent_task_id: None,
            })
        })?;

        let mut tasks: Vec<CalendarTask> = rows.collect::<Result<Vec<_>>>()?;

        // Filter by project_id if provided
        if let Some(pid) = project_id {
            tasks.retain(|t| t.project_id.as_deref() == Some(pid));
        }

        Ok(tasks)
    }

    pub fn get_unscheduled_tasks(
        &self,
        project_id: Option<&str>,
        category: Option<&str>,
        priority: Option<i32>,
    ) -> Result<Vec<Task>> {
        let mut query = "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
             FROM tasks
             WHERE scheduled_date IS NULL AND status != 'done'".to_string();

        if project_id.is_some() {
            query.push_str(" AND project_id = ?1");
        }
        if category.is_some() {
            query.push_str(&format!(
                " AND category = ?{}",
                if project_id.is_some() { 2 } else { 1 }
            ));
        }
        if priority.is_some() {
            let n = 1 + project_id.is_some() as i32 + category.is_some() as i32;
            query.push_str(&format!(" AND priority = ?{}", n));
        }

        query.push_str(" ORDER BY priority ASC, due_date ASC NULLS LAST, created_at DESC");

        let mut stmt = self.conn.prepare(&query)?;

        // Build params dynamically
        let mut params: Vec<&dyn rusqlite::ToSql> = vec![];
        if let Some(ref p) = project_id {
            params.push(p);
        }
        if let Some(ref c) = category {
            params.push(c);
        }
        if let Some(ref pr) = priority {
            params.push(pr);
        }

        let tasks = stmt
            .query_map(rusqlite::params_from_iter(params), |row| {
                Ok(Task {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: row.get(4)?,
                    category: row.get(5)?,
                    status: row.get(6)?,
                    due_date: row.get(7)?,
                    json_path: row.get(8)?,
                    created_at: row.get(9)?,
                    scheduled_date: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn get_tasks_for_date(&self, date: &str) -> Result<Vec<Task>> {
        let query = "SELECT id, project_id, title, description, priority, category, status, due_date, json_path, created_at, scheduled_date
             FROM tasks
             WHERE scheduled_date = ?1
             ORDER BY priority ASC, created_at ASC";

        let mut stmt = self.conn.prepare(query)?;

        let tasks = stmt
            .query_map([date], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: row.get(4)?,
                    category: row.get(5)?,
                    status: row.get(6)?,
                    due_date: row.get(7)?,
                    json_path: row.get(8)?,
                    created_at: row.get(9)?,
                    scheduled_date: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn get_session_logs(&self) -> Result<Vec<SessionLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_name, summary, tokens_total, files_modified, created_at
             FROM logs 
             ORDER BY created_at DESC
             LIMIT 50",
        )?;

        let logs = stmt
            .query_map([], |row| {
                let files_json: String = row.get(4)?;
                let files: Vec<FileModified> =
                    serde_json::from_str(&files_json).unwrap_or_default();

                Ok(SessionLog {
                    id: row.get(0)?,
                    project_name: row.get(1)?,
                    summary: row.get(2)?,
                    tokens_total: row.get(3)?,
                    files_modified: files,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(logs)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM settings WHERE key = ?1")?;
        let result = stmt.query_row([key], |row| row.get(0));
        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            (key, value),
        )?;
        Ok(())
    }
}

#[derive(serde::Serialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ProjectRoute {
    pub id: String,
    pub path: String,
    pub order: i32,
    pub env_path: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct TmuxTab {
    pub id: String,
    pub name: String,
    pub route_id: String,
    pub startup_command: Option<String>,
    pub order: i32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct TmuxConfig {
    pub session_name: String,
    pub tabs: Vec<TmuxTab>,
}

#[derive(serde::Serialize, Clone)]
pub struct ProjectWithConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub routes: Vec<ProjectRoute>,
    pub tmux_config: TmuxConfig,
    pub business_rules: String,
    pub tmux_configured: bool,
    pub created_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: i32,
    pub category: String,
    pub status: String,
    pub due_date: Option<String>,
    pub json_path: Option<String>,
    pub created_at: Option<String>,
    pub scheduled_date: Option<String>,
}

#[derive(serde::Serialize, Clone)]
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
    pub is_microtask: bool,
    pub parent_task_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct FileModified {
    pub path: String,
    pub action: String,
}

#[derive(serde::Serialize, Clone)]
pub struct SessionLog {
    pub id: String,
    pub project_name: String,
    pub summary: String,
    pub tokens_total: i32,
    pub files_modified: Vec<FileModified>,
    pub created_at: String,
}
