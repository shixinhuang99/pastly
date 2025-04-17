#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
use tauri::tray::{MouseButton, TrayIconEvent};
use tauri::{AppHandle, Manager, RunEvent};

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
		.invoke_handler(tauri::generate_handler![])
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

	app.run(|app_handle, event| {
		#[cfg(target_os = "macos")]
		if let RunEvent::Reopen { .. } = event {
			show_main_window(app_handle);
		}

		#[cfg(target_os = "windows")]
		if let RunEvent::TrayIconEvent(tray_icon_event) = event {
			match tray_icon_event {
				TrayIconEvent::Click { button, .. }
				| TrayIconEvent::DoubleClick { button, .. } => {
					if let MouseButton::Left = button {
						show_main_window(app_handle);
					}
				}
				_ => (),
			}
		}
	});
}

fn show_main_window(app_handle: &AppHandle) {
	let Some(window) = app_handle.get_webview_window("main") else {
		return;
	};
	let _ = window.show();
	let _ = window.set_focus();
}
