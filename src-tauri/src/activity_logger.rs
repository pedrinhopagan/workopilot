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

        Ok(session_id)
    }

    pub fn log_user_session_end(&self, db: &Database) -> Result<(), String> {
        let current = self.current_session_id.lock().map_err(|e| e.to_string())?;

        if let Some(session_id) = current.as_ref() {
            db.end_user_session(session_id).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn log_ai_session_end(
        &self,
        db: &Database,
        session_id: &str,
        task_id: Option<&str>,
        _project_id: Option<&str>,
        tokens_input: Option<i64>,
        tokens_output: Option<i64>,
    ) -> Result<(), String> {
        let (_final_input, _final_output, final_total) =
            if tokens_input.is_some() || tokens_output.is_some() {
                (
                    tokens_input.unwrap_or(0),
                    tokens_output.unwrap_or(0),
                    tokens_input.unwrap_or(0) + tokens_output.unwrap_or(0),
                )
            } else {
                match token_tracker::parse_opencode_session_tokens(session_id) {
                    Ok(usage) => (
                        usage.input_tokens + usage.cache_read_tokens,
                        usage.output_tokens,
                        usage.total_tokens,
                    ),
                    Err(_) => (0, 0, 0),
                }
            };

        if final_total > 0 {
            if let Some(tid) = task_id {
                let _ = db.add_task_tokens(tid, final_total, session_id);
            }
        }

        Ok(())
    }

    #[allow(dead_code)]
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
