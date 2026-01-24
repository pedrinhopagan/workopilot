mod activity_logger;
mod commands;
mod database;
mod ipc_socket;
mod settings;
mod sidecar;
mod sidecar_commands;
mod token_tracker;
mod tray;
mod window;

use activity_logger::ActivityLogger;
use database::Database;
use ipc_socket::IpcSocketServer;
use sidecar::SidecarState;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Database>,
    pub activity_logger: ActivityLogger,
    pub ipc_socket: Mutex<Option<IpcSocketServer>>,
    pub sidecar: SidecarState,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("GDK_BACKEND", "x11");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    let db = Database::new().expect("Failed to initialize database");
    let activity_logger = ActivityLogger::new();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState { 
            db: Mutex::new(db),
            activity_logger,
            ipc_socket: Mutex::new(None),
            sidecar: SidecarState::new(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::launch_project_tmux,
            commands::open_env_file,
            commands::detect_project_structure,
            commands::get_ai_suggestion,
            commands::launch_task_workflow,
            commands::launch_task_structure,
            commands::launch_task_execute_all,
            commands::launch_task_execute_subtask,
            commands::launch_task_review,
            commands::focus_tmux_session,
            commands::launch_quickfix_background,
            commands::add_task_image,
            commands::add_task_image_from_path,
            commands::get_task_images,
            commands::get_task_image,
            commands::delete_task_image,
            commands::get_user_sessions,
            commands::sync_skills,
            settings::get_shortcut,
            settings::set_shortcut,
            window::hide_window,
            sidecar_commands::sidecar_call,
            sidecar_commands::sidecar_status,
            sidecar_commands::sidecar_restart,
            sidecar_commands::get_trpc_url,
        ])
        .setup(|app| {
            settings::register_initial_shortcut(app.handle())?;
            tray::setup_tray(app)?;
            
            let state = app.state::<AppState>();
            if let Ok(db) = state.db.lock() {
                let app_version = app.package_info().version.to_string();
                if let Err(e) = state.activity_logger.log_user_session_start(&db, Some(&app_version)) {
                    eprintln!("[WORKOPILOT] Failed to log user session start: {}", e);
                }
            }
            
            match commands::sync_skills(app.handle().clone()) {
                Ok(count) => eprintln!("[WORKOPILOT] Synced {} skills to OpenCode on startup", count),
                Err(e) => eprintln!("[WORKOPILOT] Failed to sync skills on startup: {}", e),
            }
            
            match IpcSocketServer::new(app.handle().clone()) {
                Ok(server) => {
                    if let Ok(mut ipc_socket) = state.ipc_socket.lock() {
                        *ipc_socket = Some(server);
                    }
                }
                Err(e) => eprintln!("[WORKOPILOT] Failed to start IPC socket server: {}", e),
            }
            
            if let Ok(mut sidecar) = state.sidecar.sidecar.lock() {
                match sidecar.start() {
                    Ok(_) => eprintln!("[WORKOPILOT] Sidecar started"),
                    Err(e) => eprintln!("[WORKOPILOT] Failed to start sidecar: {}", e),
                }
            }
            
            if std::env::var("WORKOPILOT_DEV").is_ok() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_title("WorkoPilot [DEV]");
                }
                eprintln!("[WORKOPILOT-DEV] Setup completo. Atalho: Alt+O");
            } else {
                eprintln!("[WORKOPILOT] Setup completo. Atalho: Alt+P");
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(tray::handle_run_event);
}
