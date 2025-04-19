#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sync;

use tauri::Manager;
#[cfg(target_os = "windows")]
use tauri::tray::{MouseButton, TrayIconEvent};
#[cfg(any(target_os = "macos", target_os = "windows"))]
use tauri::{AppHandle, RunEvent};

fn main() {
	let app = tauri::Builder::default()
		.setup(|app| {
			#[cfg(debug_assertions)]
			if let Some(window) = app.get_webview_window("main") {
				window.open_devtools();
			};

			let _ = app.handle().plugin(tauri_plugin_autostart::init(
				tauri_plugin_autostart::MacosLauncher::LaunchAgent,
				None,
			));

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_host_name,
			start_server,
			shutdown_server
		])
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_clipboard::init())
		.plugin(tauri_plugin_sql::Builder::default().build())
		.plugin(tauri_plugin_single_instance::init(|app, _, _| {
			if let Some(ww) = app.get_webview_window("main") {
				if ww.is_minimized().is_ok_and(|v| v) {
					let _ = ww.unminimize();
				}
				let _ = ww.set_focus();
			}
		}))
		.build(tauri::generate_context!())
		.expect("Failed to launch app");

	app.run(|_app_handle, _event| {
		#[cfg(target_os = "macos")]
		if let RunEvent::Reopen { .. } = _event {
			show_main_window(_app_handle);
		}

		#[cfg(target_os = "windows")]
		if let RunEvent::TrayIconEvent(tray_icon_event) = _event {
			match tray_icon_event {
				TrayIconEvent::Click { button, .. }
				| TrayIconEvent::DoubleClick { button, .. } => {
					if let MouseButton::Left = button {
						show_main_window(_app_handle);
					}
				}
				_ => (),
			}
		}
	});
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn show_main_window(app_handle: &AppHandle) {
	let Some(window) = app_handle.get_webview_window("main") else {
		return;
	};
	let _ = window.show();
	let _ = window.set_focus();
}

#[tauri::command]
fn get_host_name() -> String {
	hostname::get()
		.ok()
		.map(|osstr| osstr.to_string_lossy().to_string())
		.unwrap_or_default()
}

#[tauri::command]
async fn start_server(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
) -> Result<(), String> {
	if let Err(err) = sync::start_server(app, id, name, port).await {
		return Err(err.to_string());
	}
	Ok(())
}

#[tauri::command]
async fn shutdown_server(id: String) {
	sync::shutdown_server(id).await;
}
