#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, RunEvent};

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
		.build(tauri::generate_context!())
		.expect("Failed to launch app");

	app.run(|app_handle, event| {
		#[cfg(target_os = "macos")]
		if let RunEvent::Reopen { .. } = event {
			let Some(window) = app_handle.get_webview_window("main") else {
				return;
			};
			let _ = window.show();
			let _ = window.set_focus();
		}
	});
}
