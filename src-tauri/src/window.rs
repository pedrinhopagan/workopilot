use crate::AppState;
use tauri::{AppHandle, Manager, WebviewWindow};

fn get_main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn is_pinned_window(app: &AppHandle) -> bool {
    let state = app.state::<AppState>();
    let db = state.db.lock().unwrap();
    match db.get_setting("pinned_window") {
        Ok(Some(value)) => value == "true",
        _ => false,
    }
}

pub fn toggle(app: &AppHandle) {
    if let Some(window) = get_main_window(app) {
        let is_visible = window.is_visible().unwrap_or(false);

        if is_visible {
            // If pinned, don't hide - just focus
            if is_pinned_window(app) {
                let _ = window.set_focus();
            } else {
                let _ = window.hide();
            }
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

pub fn show(app: &AppHandle) {
    if let Some(window) = get_main_window(app) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn hide(app: &AppHandle) {
    if is_pinned_window(app) {
        return;
    }
    if let Some(window) = get_main_window(app) {
        let _ = window.hide();
    }
}

#[tauri::command]
pub fn hide_window(app: AppHandle) {
    hide(&app);
}
