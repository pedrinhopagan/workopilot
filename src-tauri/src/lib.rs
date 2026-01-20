mod commands;
mod database;
mod file_watcher;
mod settings;
mod task_json;
mod tray;
mod window;

use database::Database;
use file_watcher::FileWatcherManager;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Database>,
    pub file_watcher: Mutex<FileWatcherManager>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("GDK_BACKEND", "x11");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    let db = Database::new().expect("Failed to initialize database");

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState {
            db: Mutex::new(db),
            file_watcher: Mutex::new(FileWatcherManager::new()),
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
            commands::launch_task_review,
            commands::start_watching_project,
            commands::stop_watching_project,
            settings::get_shortcut,
            settings::set_shortcut,
            window::hide_window,
        ])
        .setup(|app| {
            settings::register_initial_shortcut(app.handle())?;
            tray::setup_tray(app)?;
            eprintln!("[WORKOPILOT] Setup completo.");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(tray::handle_run_event);
}
