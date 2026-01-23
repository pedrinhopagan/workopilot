use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    App, Manager, RunEvent, WindowEvent,
};

use crate::settings;
use crate::window;
use crate::AppState;

pub fn setup_tray(app: &App) -> Result<TrayIcon, Box<dyn std::error::Error>> {
    let icon = app.default_window_icon().cloned().unwrap_or_else(|| {
        Image::from_bytes(include_bytes!("../icons/32x32.png"))
            .expect("Failed to load embedded icon")
    });

    let shortcut_config = settings::get_saved_shortcut(app.handle());
    let tooltip = format!("WorkOpilot - {} para abrir", shortcut_config.display);

    let show_item = MenuItem::with_id(app, "show", "Abrir WorkOpilot", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let tray = TrayIconBuilder::with_id("workopilot-tray")
        .icon(icon)
        .tooltip(&tooltip)
        .icon_as_template(false)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => window::show(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    window::toggle(tray.app_handle());
                }
            }
        })
        .build(app)?;

    Ok(tray)
}

pub fn handle_run_event(app_handle: &tauri::AppHandle, event: RunEvent) {
    match event {
        RunEvent::WindowEvent { label, event, .. } => {
            if label == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    window::hide(app_handle);
                }
            }
        }
        RunEvent::ExitRequested { .. } => {
            let state = app_handle.state::<AppState>();

            if let Ok(mut ipc_socket) = state.ipc_socket.lock() {
                if let Some(ref mut server) = *ipc_socket {
                    server.shutdown();
                }
                *ipc_socket = None;
            }

            let db_guard = state.db.lock();
            if let Ok(db) = db_guard {
                if let Err(e) = state.activity_logger.log_user_session_end(&db) {
                    eprintln!("[WORKOPILOT] Failed to log user session end: {}", e);
                }
            }
        }
        _ => {}
    }
}
