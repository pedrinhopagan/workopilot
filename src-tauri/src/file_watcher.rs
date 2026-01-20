use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct TaskUpdatedPayload {
    pub task_id: String,
    pub project_path: String,
    pub source: String,
}

pub struct ProjectWatcher {
    stop_flag: Arc<Mutex<bool>>,
    thread_handle: Option<thread::JoinHandle<()>>,
}

pub struct FileWatcherManager {
    watchers: HashMap<String, ProjectWatcher>,
    internal_writes: Arc<Mutex<HashMap<String, std::time::Instant>>>,
}

impl FileWatcherManager {
    pub fn new() -> Self {
        FileWatcherManager {
            watchers: HashMap::new(),
            internal_writes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn mark_internal_write(&self, task_id: &str) {
        if let Ok(mut writes) = self.internal_writes.lock() {
            writes.insert(task_id.to_string(), std::time::Instant::now());
        }
    }

    pub fn is_internal_write(&self, task_id: &str) -> bool {
        if let Ok(mut writes) = self.internal_writes.lock() {
            if let Some(instant) = writes.get(task_id) {
                if instant.elapsed() < Duration::from_secs(2) {
                    writes.remove(task_id);
                    return true;
                }
                writes.remove(task_id);
            }
        }
        false
    }

    pub fn start_watching(
        &mut self,
        project_path: String,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        if self.watchers.contains_key(&project_path) {
            return Ok(());
        }

        let tasks_dir = PathBuf::from(&project_path)
            .join(".workopilot")
            .join("tasks");

        if !tasks_dir.exists() {
            std::fs::create_dir_all(&tasks_dir)
                .map_err(|e| format!("Failed to create tasks directory: {}", e))?;
        }

        let stop_flag = Arc::new(Mutex::new(false));
        let stop_flag_clone = stop_flag.clone();
        let project_path_clone = project_path.clone();
        let internal_writes = self.internal_writes.clone();

        let thread_handle = thread::spawn(move || {
            let (tx, rx) = channel();

            let mut debouncer = match new_debouncer(Duration::from_millis(500), tx) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("[FileWatcher] Failed to create debouncer: {}", e);
                    return;
                }
            };

            if let Err(e) = debouncer
                .watcher()
                .watch(&tasks_dir, RecursiveMode::NonRecursive)
            {
                eprintln!("[FileWatcher] Failed to watch directory: {}", e);
                return;
            }

            eprintln!("[FileWatcher] Started watching: {:?}", tasks_dir);

            loop {
                if let Ok(stop) = stop_flag_clone.lock() {
                    if *stop {
                        eprintln!("[FileWatcher] Stopping watcher for: {}", project_path_clone);
                        break;
                    }
                }

                match rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(Ok(events)) => {
                        for event in events {
                            if event.kind == DebouncedEventKind::Any {
                                if let Some(file_name) = event.path.file_name() {
                                    let file_name_str = file_name.to_string_lossy();
                                    if file_name_str.ends_with(".json") {
                                        let task_id =
                                            file_name_str.trim_end_matches(".json").to_string();

                                        if let Ok(writes) = internal_writes.lock() {
                                            if let Some(instant) = writes.get(&task_id) {
                                                if instant.elapsed() < Duration::from_secs(2) {
                                                    continue;
                                                }
                                            }
                                        }

                                        eprintln!("[FileWatcher] Task file changed: {}", task_id);

                                        let payload = TaskUpdatedPayload {
                                            task_id: task_id.clone(),
                                            project_path: project_path_clone.clone(),
                                            source: "ai".to_string(),
                                        };

                                        if let Err(e) = app_handle.emit("task-updated", payload) {
                                            eprintln!("[FileWatcher] Failed to emit event: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Ok(Err(e)) => {
                        eprintln!("[FileWatcher] Watch error: {:?}", e);
                    }
                    Err(_) => {}
                }
            }
        });

        self.watchers.insert(
            project_path,
            ProjectWatcher {
                stop_flag,
                thread_handle: Some(thread_handle),
            },
        );

        Ok(())
    }

    pub fn stop_watching(&mut self, project_path: &str) {
        if let Some(mut watcher) = self.watchers.remove(project_path) {
            if let Ok(mut stop) = watcher.stop_flag.lock() {
                *stop = true;
            }
            if let Some(handle) = watcher.thread_handle.take() {
                let _ = handle.join();
            }
        }
    }

    pub fn stop_all(&mut self) {
        let paths: Vec<String> = self.watchers.keys().cloned().collect();
        for path in paths {
            self.stop_watching(&path);
        }
    }
}

impl Drop for FileWatcherManager {
    fn drop(&mut self) {
        self.stop_all();
    }
}
