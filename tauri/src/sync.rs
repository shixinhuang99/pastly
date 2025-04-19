use std::sync::Mutex;

use aes_gcm::{Aes256Gcm, Key};
use anyhow::Result;
use mdns_sd::{IfKind, ServiceDaemon, ServiceInfo};
use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

const SERVICE_TYPE: &str = "_pastly._udp.local.";

static MDNS: Mutex<Option<ServiceDaemon>> = Mutex::new(None);
static SHUTDOWN_HTTP_SERVER_TX: Mutex<Option<oneshot::Sender<()>>> =
	Mutex::new(None);
static PIN: Mutex<String> = Mutex::new(String::new());
static PIN_HASH: Mutex<String> = Mutex::new(String::new());
static AES_KEY: Mutex<Option<Key<Aes256Gcm>>> = Mutex::new(None);

#[cfg(debug_assertions)]
fn print_global_vars() {
	println!("MDNS: {}", MDNS.lock().unwrap().is_some());
	println!(
		"SHUTDOWN_HTTP_SERVER_TX: {}",
		SHUTDOWN_HTTP_SERVER_TX.lock().unwrap().is_some()
	);
	println!("PIN: {}", PIN.lock().unwrap());
	println!("PIN_HASH: {}", PIN_HASH.lock().unwrap());
	println!("AES_KEY: {}", AES_KEY.lock().unwrap().is_some());
}

#[derive(Clone, Serialize)]
struct DeviceInfo {
	id: String,
	name: String,
	ip: String,
	port: u16,
}

fn server_info_to_device_info(service_info: ServiceInfo) -> Option<DeviceInfo> {
	let id = service_info.get_property_val_str("id")?.to_string();
	let name = service_info.get_property_val_str("name")?.to_string();
	let ip = service_info.get_addresses_v4().iter().next()?.to_string();
	let port = service_info.get_port();

	Some(DeviceInfo { id, name, ip, port })
}

pub async fn start_server(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
	pin: Option<String>,
) -> Result<()> {
	if let Some(pin) = pin.as_deref() {
		let mut old_pin = PIN.lock().unwrap();
		if *old_pin != pin {
			*old_pin = pin.to_string();
			let pin_hash = compute_pin_hash(pin);
			let mut old_pin_hash = PIN_HASH.lock().unwrap();
			*old_pin_hash = pin_hash;
			let aes_key = derive_aes_key(pin);
			let mut old_ase_key = AES_KEY.lock().unwrap();
			*old_ase_key = Some(aes_key);
		}
	}

	start_mdns(app, id, name, port).await?;
	start_http_server(port).await?;

	#[cfg(debug_assertions)]
	print_global_vars();

	Ok(())
}

pub async fn shutdown_server(id: String) {
	shutdown_mdns(id).await;
	shutdown_http_server();

	#[cfg(debug_assertions)]
	print_global_vars();
}

async fn start_mdns(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
) -> Result<()> {
	use mdns_sd::ServiceEvent::*;

	if is_mdns_running() {
		return Ok(());
	}

	let local_ip = local_ip_address::local_ip()?;
	let host_name = format!("{}.local.", &id);
	let mut properties = vec![("id", id.clone()), ("name", name)];

	{
		let pin_hash = PIN_HASH.lock().unwrap();
		properties.push(("pin_hash", pin_hash.clone()));
	}

	let service_info = ServiceInfo::new(
		SERVICE_TYPE,
		&id,
		&host_name,
		local_ip,
		port,
		&properties[..],
	)?;

	let mdns = ServiceDaemon::new()?;
	mdns.set_multicast_loop_v4(false)?;
	mdns.set_multicast_loop_v6(false)?;
	mdns.enable_interface(vec![IfKind::IPv4])?;
	mdns.register(service_info)?;

	let rx = mdns.browse(SERVICE_TYPE)?;
	tokio::spawn(async move {
		while let Ok(event) = rx.recv_async().await {
			match event {
				ServiceResolved(info) => {
					println!("mdns service resolved: {:#?}", info);
					if let Some(device_info) = server_info_to_device_info(info)
					{
						if device_info.id != id {
							app.emit("device_found", device_info).unwrap();
						}
					}
				}
				ServiceRemoved(_, full_name) => {
					println!("mdns service removed: \"{}\"", full_name);
					if let Some(id) =
						full_name.strip_suffix(&format!(".{}", SERVICE_TYPE))
					{
						app.emit("device_removed", id).unwrap();
					}
				}
				_other_event => {
					#[cfg(debug_assertions)]
					println!("{:#?}", _other_event);
				}
			}
		}
	});

	let mut old_mdns_opt = MDNS.lock().unwrap();
	*old_mdns_opt = Some(mdns);

	println!("start mdns");

	Ok(())
}

async fn shutdown_mdns(id: String) {
	use mdns_sd::DaemonStatus;

	let mdns = {
		let mut mdns_opt = MDNS.lock().unwrap();
		let Some(mdns) = mdns_opt.take() else {
			return;
		};
		mdns
	};
	let _ = mdns.stop_browse(SERVICE_TYPE);
	let full_name = format!("{}.{}", id, SERVICE_TYPE);
	if let Ok(unregister_rx) = mdns.unregister(&full_name) {
		let _ = unregister_rx.recv_async().await;
		if let Ok(rx) = mdns.shutdown() {
			while let Ok(status) = rx.recv_async().await {
				if let DaemonStatus::Shutdown = status {
					break;
				}
			}
		}
	}

	println!("shutdown mdns");
}

fn is_mdns_running() -> bool {
	let mdns_opt = MDNS.lock().unwrap();
	mdns_opt.is_some()
}

async fn start_http_server(port: u16) -> Result<()> {
	use axum::{Router, routing::post, serve};
	use tokio::net::TcpListener;

	if is_http_server_running() {
		return Ok(());
	}

	let (tx, rx) = oneshot::channel::<()>();

	{
		let mut old_tx = SHUTDOWN_HTTP_SERVER_TX.lock().unwrap();
		*old_tx = Some(tx);
	}

	let service: Router<()> =
		Router::new().route("/broadcast", post(move || async { "hello" }));
	let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?;

	tokio::spawn(async move {
		serve(listener, service)
			.with_graceful_shutdown(async {
				let _ = rx.await;
				println!("shutdown http server");
			})
			.await
			.unwrap();
	});

	println!("start http server");

	Ok(())
}

fn shutdown_http_server() {
	let mut old_tx = SHUTDOWN_HTTP_SERVER_TX.lock().unwrap();
	if let Some(tx) = old_tx.take() {
		let _ = tx.send(());
	};
}

fn is_http_server_running() -> bool {
	let tx = SHUTDOWN_HTTP_SERVER_TX.lock().unwrap();
	tx.is_some()
}

fn compute_pin_hash(pin: &str) -> String {
	let mut hasher = Sha256::new();
	hasher.update(pin);
	let result = hasher.finalize();
	hex::encode(result)
}

fn derive_aes_key(pin: &str) -> Key<Aes256Gcm> {
	use pbkdf2::pbkdf2_hmac;

	let mut key = [0u8; 32];
	let salt = b"pastly";
	pbkdf2_hmac::<Sha256>(pin.as_bytes(), salt, 100000, &mut key);
	*Key::<Aes256Gcm>::from_slice(&key)
}
