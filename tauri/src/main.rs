#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod crypto;
mod sync;

#[cfg(any(target_os = "macos", target_os = "windows"))]
use tauri::RunEvent;
#[cfg(target_os = "windows")]
use tauri::tray::{MouseButton, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::sync::{ClipItem, DeviceInfo};

fn main() {
	let app = tauri::Builder::default()
		.setup(|app| {
			#[cfg(debug_assertions)]
			if let Some(window) = app.get_webview_window("main") {
				window.open_devtools();
			};

			let _ = app.handle().plugin(tauri_plugin_autostart::init(
				tauri_plugin_autostart::MacosLauncher::LaunchAgent,
				Some(vec!["-s"]),
			));

			let args: Vec<String> = std::env::args().collect();

			if !args.contains(&"-s".to_string()) {
				if let Some(ww) = app.get_webview_window("main") {
					let _ = ww.show();
					let _ = ww.set_focus();
				}
			}

			#[cfg(target_os = "linux")]
			delay_restart(app, args);

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			get_host_name,
			start_server,
			shutdown_server,
			broadcast_clipboard_sync,
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
fn show_main_window(app: &AppHandle) {
	let Some(ww) = app.get_webview_window("main") else {
		return;
	};
	let _ = ww.show();
	let _ = ww.set_focus();
}

// temporary solution for tray icon not showing up
#[cfg(target_os = "linux")]
fn delay_restart(app: &tauri::App, args: Vec<String>) {
	use std::{
		thread::{sleep, spawn},
		time::Duration,
	};
	use tauri::process::restart;

	if !args.contains(&"-s".to_string()) || args.contains(&"-r".to_string()) {
		return;
	}

	let mut env = app.env();
	spawn(move || {
		sleep(Duration::from_secs(2));
		env.args_os.push("-r".into());
		println!("delay restart");
		restart(&env);
	});
}

#[tauri::command]
fn get_host_name() -> String {
	hostname::get()
		.ok()
		.map(|s| s.to_string_lossy().to_string())
		.unwrap_or_default()
}

#[tauri::command]
async fn start_server(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
	pin: Option<String>,
) -> Result<(), String> {
	#[cfg(target_os = "linux")]
	{
		let args: Vec<String> = std::env::args().collect();
		if args.contains(&"-s".to_string()) && !args.contains(&"-r".to_string())
		{
			return Ok(());
		}
	}

	sync::start_server(app, id, name, port, pin)
		.await
		.map_err(|err| err.to_string())
}

#[tauri::command]
async fn shutdown_server(id: String) {
	sync::shutdown_server(id).await;
}

#[tauri::command]
async fn broadcast_clipboard_sync(
	clip_item: ClipItem,
	devices: Vec<DeviceInfo>,
) -> Result<(), String> {
	sync::broadcast_clipboard_sync(clip_item, devices)
		.await
		.map_err(|err| err.to_string())
}
