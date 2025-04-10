#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![])
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_clipboard::init())
		.run(tauri::generate_context!())
		.expect("Failed to launch app");
}
