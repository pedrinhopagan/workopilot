use crate::database::Database;
use crate::token_tracker;
use std::sync::Mutex;

pub struct ActivityLogger {
    current_session_id: Mutex<Option<String>>,
}

impl ActivityLogger {
    pub fn new() -> Self {
        ActivityLogger {
            current_session_id: Mutex::new(None),
        }
    }

    pub fn log_event(
        &self,
        db: &Database,
        event_type: &str,
        entity_type: Option<&str>,
        entity_id: Option<&str>,
        project_id: Option<&str>,
        metadata: Option<&str>,
    ) -> Result<String, String> {
        db.insert_activity_log(event_type, entity_type, entity_id, project_id, metadata)
            .map_err(|e| e.to_string())
    }

    pub fn log_user_session_start(
        &self,
        db: &Database,
        app_version: Option<&str>,
    ) -> Result<String, String> {
        let session_id = db
            .start_user_session(app_version)
            .map_err(|e| e.to_string())?;

        let mut current = self.current_session_id.lock().map_err(|e| e.to_string())?;
        *current = Some(session_id.clone());

        let metadata = serde_json::json!({
            "app_version": app_version,
        })
        .to_string();

        self.log_event(
            db,
            "user_session_start",
            Some("user"),
            Some(&session_id),
            None,
            Some(&metadata),
        )?;

        Ok(session_id)
    }

    pub fn log_user_session_end(&self, db: &Database) -> Result<(), String> {
        let current = self.current_session_id.lock().map_err(|e| e.to_string())?;

        if let Some(session_id) = current.as_ref() {
            db.end_user_session(session_id).map_err(|e| e.to_string())?;

            db.insert_activity_log(
                "user_session_end",
                Some("user"),
                Some(session_id),
                None,
                None,
            )
            .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn log_task_created(
        &self,
        db: &Database,
        task_id: &str,
        task_title: &str,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        let metadata = serde_json::json!({
            "task_title": task_title,
        })
        .to_string();

        self.log_event(
            db,
            "task_created",
            Some("task"),
            Some(task_id),
            project_id,
            Some(&metadata),
        )?;

        Ok(())
    }

    pub fn log_task_status_changed(
        &self,
        db: &Database,
        task_id: &str,
        old_status: &str,
        new_status: &str,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        let event_type = match new_status {
            "structuring" | "working" => "task_started",
            "completed" => "task_completed",
            _ => "task_status_changed",
        };

        let metadata = serde_json::json!({
            "old_status": old_status,
            "new_status": new_status,
        })
        .to_string();

        self.log_event(
            db,
            event_type,
            Some("task"),
            Some(task_id),
            project_id,
            Some(&metadata),
        )?;

        Ok(())
    }

    pub fn log_subtask_status_changed(
        &self,
        db: &Database,
        subtask_id: &str,
        task_id: &str,
        old_status: &str,
        new_status: &str,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        let event_type = match new_status {
            "in_progress" => "subtask_started",
            "done" | "completed" => "subtask_completed",
            _ => "subtask_status_changed",
        };

        let metadata = serde_json::json!({
            "task_id": task_id,
            "old_status": old_status,
            "new_status": new_status,
        })
        .to_string();

        self.log_event(
            db,
            event_type,
            Some("subtask"),
            Some(subtask_id),
            project_id,
            Some(&metadata),
        )?;

        Ok(())
    }

    pub fn log_ai_session_start(
        &self,
        db: &Database,
        session_id: &str,
        task_id: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        let metadata = serde_json::json!({
            "task_id": task_id,
        })
        .to_string();

        self.log_event(
            db,
            "ai_session_start",
            Some("ai_session"),
            Some(session_id),
            project_id,
            Some(&metadata),
        )?;

        Ok(())
    }

    pub fn log_ai_session_end(
        &self,
        db: &Database,
        session_id: &str,
        task_id: Option<&str>,
        project_id: Option<&str>,
        tokens_input: Option<i64>,
        tokens_output: Option<i64>,
    ) -> Result<(), String> {
        let (final_input, final_output, final_total, model) =
            if tokens_input.is_some() || tokens_output.is_some() {
                (
                    tokens_input.unwrap_or(0),
                    tokens_output.unwrap_or(0),
                    tokens_input.unwrap_or(0) + tokens_output.unwrap_or(0),
                    None,
                )
            } else {
                match token_tracker::parse_opencode_session_tokens(session_id) {
                    Ok(usage) => (
                        usage.input_tokens + usage.cache_read_tokens,
                        usage.output_tokens,
                        usage.total_tokens,
                        usage.model,
                    ),
                    Err(_) => (0, 0, 0, None),
                }
            };

        let metadata = serde_json::json!({
            "task_id": task_id,
            "tokens_input": final_input,
            "tokens_output": final_output,
            "tokens_total": final_total,
            "model": model,
        })
        .to_string();

        self.log_event(
            db,
            "ai_session_end",
            Some("ai_session"),
            Some(session_id),
            project_id,
            Some(&metadata),
        )?;

        if final_total > 0 {
            let _ = db.increment_daily_tokens(final_total);

            if let Some(tid) = task_id {
                let _ = db.add_task_tokens(tid, final_total, session_id);
            }
        }

        Ok(())
    }

    pub fn log_ai_session_end_with_auto_tokens(
        &self,
        db: &Database,
        session_id: &str,
        task_id: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<(), String> {
        self.log_ai_session_end(db, session_id, task_id, project_id, None, None)
    }
}

impl Default for ActivityLogger {
    fn default() -> Self {
        Self::new()
    }
}
