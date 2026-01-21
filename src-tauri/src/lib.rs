mod activity_logger;
mod commands;
mod database;
mod settings;
mod token_tracker;
mod tray;
mod window;

use activity_logger::ActivityLogger;
use database::Database;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Database>,
    pub activity_logger: ActivityLogger,
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
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_projects,
            commands::get_project_with_config,
            commands::add_project,
            commands::update_project,
            commands::update_project_name,
            commands::update_project_routes,
            commands::update_project_tmux_config,
            commands::update_project_business_rules,
            commands::update_projects_order,
            commands::set_tmux_configured,
            commands::delete_project,
            commands::launch_project_tmux,
            commands::open_env_file,
            commands::detect_project_structure,
            commands::get_tasks,
            commands::get_urgent_tasks,
            commands::add_task,
            commands::update_task_status,
            commands::schedule_task,
            commands::unschedule_task,
            commands::get_tasks_for_month,
            commands::get_unscheduled_tasks,
            commands::get_tasks_for_date,
            commands::get_session_logs,
            commands::get_ai_suggestion,
            commands::get_setting,
            commands::set_setting,
            commands::create_task_with_json,
            commands::get_task_full,
            commands::save_task_full,
            commands::update_task_and_sync,
            commands::delete_task_full,
            commands::get_task_by_id,
            commands::launch_task_workflow,
            commands::launch_task_structure,
            commands::launch_task_execute_all,
            commands::launch_task_execute_subtask,
            commands::launch_task_review,
            commands::enrich_calendar_tasks,
            commands::start_task_execution,
            commands::end_task_execution,
            commands::update_task_execution_progress,
            commands::get_active_task_execution,
            commands::get_all_active_executions,
            commands::cleanup_stale_task_executions,
            commands::focus_tmux_session,
            commands::launch_quickfix_background,
            commands::add_task_image,
            commands::get_task_images,
            commands::get_task_image,
            commands::delete_task_image,
            commands::get_activity_logs,
            commands::get_user_sessions,
            settings::get_shortcut,
            settings::set_shortcut,
            window::hide_window,
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
