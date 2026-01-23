use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const SOCKET_PATH: &str = "/tmp/workopilot.sock";
const DEBOUNCE_MS: u64 = 300;

#[derive(Debug, Deserialize, Clone)]
pub struct DbChangeNotification {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    #[serde(default)]
    pub project_id: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct DbChangedPayload {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub project_id: Option<String>,
}

pub struct IpcSocketServer {
    shutdown_flag: Arc<AtomicBool>,
    listener_thread: Option<thread::JoinHandle<()>>,
}

impl IpcSocketServer {
    pub fn new(app_handle: AppHandle) -> Result<Self, String> {
        let socket_path = Path::new(SOCKET_PATH);
        if socket_path.exists() {
            std::fs::remove_file(socket_path)
                .map_err(|e| format!("Failed to remove existing socket: {}", e))?;
        }

        let listener = UnixListener::bind(SOCKET_PATH)
            .map_err(|e| format!("Failed to bind socket at {}: {}", SOCKET_PATH, e))?;

        listener
            .set_nonblocking(true)
            .map_err(|e| format!("Failed to set non-blocking: {}", e))?;

        let shutdown_flag = Arc::new(AtomicBool::new(false));
        let shutdown_flag_clone = shutdown_flag.clone();

        let debounce_state: Arc<Mutex<HashMap<String, (Instant, DbChangeNotification)>>> =
            Arc::new(Mutex::new(HashMap::new()));

        let listener_thread = thread::spawn(move || {
            Self::run_listener(listener, app_handle, shutdown_flag_clone, debounce_state);
        });

        eprintln!("[WORKOPILOT] IPC socket server started at {}", SOCKET_PATH);

        Ok(Self {
            shutdown_flag,
            listener_thread: Some(listener_thread),
        })
    }

    fn run_listener(
        listener: UnixListener,
        app_handle: AppHandle,
        shutdown_flag: Arc<AtomicBool>,
        debounce_state: Arc<Mutex<HashMap<String, (Instant, DbChangeNotification)>>>,
    ) {
        let app_handle_debounce = app_handle.clone();
        let debounce_state_emitter = debounce_state.clone();
        let shutdown_flag_emitter = shutdown_flag.clone();

        thread::spawn(move || {
            Self::run_debounce_emitter(
                app_handle_debounce,
                debounce_state_emitter,
                shutdown_flag_emitter,
            );
        });

        loop {
            if shutdown_flag.load(Ordering::Relaxed) {
                break;
            }

            match listener.accept() {
                Ok((stream, _)) => {
                    let debounce_state = debounce_state.clone();
                    thread::spawn(move || {
                        Self::handle_connection(stream, debounce_state);
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(100));
                }
                Err(e) => {
                    eprintln!("[WORKOPILOT] Socket accept error: {}", e);
                    thread::sleep(Duration::from_millis(100));
                }
            }
        }

        eprintln!("[WORKOPILOT] IPC socket listener stopped");
    }

    fn handle_connection(
        stream: UnixStream,
        debounce_state: Arc<Mutex<HashMap<String, (Instant, DbChangeNotification)>>>,
    ) {
        let reader = BufReader::new(stream);

        for line in reader.lines() {
            match line {
                Ok(data) => {
                    if data.trim().is_empty() {
                        continue;
                    }

                    match serde_json::from_str::<DbChangeNotification>(&data) {
                        Ok(notification) => {
                            let debounce_key =
                                format!("{}:{}", notification.entity_type, notification.entity_id);

                            if let Ok(mut state) = debounce_state.lock() {
                                state.insert(debounce_key, (Instant::now(), notification.clone()));
                            }

                            eprintln!(
                                "[WORKOPILOT] Received notification: {} {} {}",
                                notification.operation,
                                notification.entity_type,
                                notification.entity_id
                            );
                        }
                        Err(e) => {
                            eprintln!("[WORKOPILOT] Failed to parse notification: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[WORKOPILOT] Error reading from socket: {}", e);
                    break;
                }
            }
        }
    }

    fn run_debounce_emitter(
        app_handle: AppHandle,
        debounce_state: Arc<Mutex<HashMap<String, (Instant, DbChangeNotification)>>>,
        shutdown_flag: Arc<AtomicBool>,
    ) {
        let debounce_duration = Duration::from_millis(DEBOUNCE_MS);

        loop {
            if shutdown_flag.load(Ordering::Relaxed) {
                break;
            }

            thread::sleep(Duration::from_millis(50));

            let mut notifications_to_emit: Vec<DbChangeNotification> = Vec::new();

            if let Ok(mut state) = debounce_state.lock() {
                let now = Instant::now();
                let mut keys_to_remove: Vec<String> = Vec::new();

                for (key, (timestamp, notification)) in state.iter() {
                    if now.duration_since(*timestamp) >= debounce_duration {
                        notifications_to_emit.push(notification.clone());
                        keys_to_remove.push(key.clone());
                    }
                }

                for key in keys_to_remove {
                    state.remove(&key);
                }
            }

            for notification in notifications_to_emit {
                let payload = DbChangedPayload {
                    entity_type: notification.entity_type.clone(),
                    entity_id: notification.entity_id.clone(),
                    operation: notification.operation.clone(),
                    project_id: notification.project_id.clone(),
                };

                if let Err(e) = app_handle.emit("db-changed", payload) {
                    eprintln!("[WORKOPILOT] Failed to emit db-changed event: {}", e);
                } else {
                    eprintln!(
                        "[WORKOPILOT] Emitted db-changed: {} {} {}",
                        notification.operation, notification.entity_type, notification.entity_id
                    );
                }
            }
        }

        eprintln!("[WORKOPILOT] Debounce emitter stopped");
    }

    pub fn shutdown(&mut self) {
        eprintln!("[WORKOPILOT] Shutting down IPC socket server...");

        self.shutdown_flag.store(true, Ordering::Relaxed);

        if let Some(handle) = self.listener_thread.take() {
            let _ = handle.join();
        }

        let socket_path = Path::new(SOCKET_PATH);
        if socket_path.exists() {
            if let Err(e) = std::fs::remove_file(socket_path) {
                eprintln!("[WORKOPILOT] Failed to remove socket file: {}", e);
            }
        }

        eprintln!("[WORKOPILOT] IPC socket server stopped");
    }
}

impl Drop for IpcSocketServer {
    fn drop(&mut self) {
        self.shutdown();
    }
}
