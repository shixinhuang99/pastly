use std::sync::Mutex;

use aes_gcm::{Aes256Gcm, Key};
use anyhow::Result;
use axum::{
	extract::{Extension, Json},
	http::HeaderMap,
};
use mdns_sd::{IfKind, ServiceDaemon, ServiceInfo};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

use crate::crypto::{
	compute_pin_hash, decrypt_content, derive_aes_key, encrypt_content,
};

const SERVICE_TYPE: &str = "_pastly._udp.local.";
const PIN_HASH_HEADER: &str = "X-PIN-Hash";

static MDNS: Mutex<Option<ServiceDaemon>> = Mutex::new(None);
static SHUTDOWN_HTTP_SERVER_TX: Mutex<Option<oneshot::Sender<()>>> =
	Mutex::new(None);
static PIN: Mutex<Option<String>> = Mutex::new(None);
static PIN_HASH: Mutex<Option<String>> = Mutex::new(None);
static AES_KEY: Mutex<Option<Key<Aes256Gcm>>> = Mutex::new(None);

#[cfg(debug_assertions)]
fn print_global_vars() {
	println!("MDNS: {}", MDNS.lock().unwrap().is_some());
	println!(
		"SHUTDOWN_HTTP_SERVER_TX: {}",
		SHUTDOWN_HTTP_SERVER_TX.lock().unwrap().is_some()
	);
	println!("PIN: {:#?}", PIN.lock().unwrap());
	println!("PIN_HASH: {:#?}", PIN_HASH.lock().unwrap());
	println!("AES_KEY: {}", AES_KEY.lock().unwrap().is_some());
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
	id: String,
	name: String,
	ip: String,
	port: u16,
	pin_hash: Option<String>,
}

impl DeviceInfo {
	fn from_service_info(service_info: ServiceInfo) -> Option<Self> {
		let id = service_info.get_property_val_str("id")?.to_string();
		let name = service_info.get_property_val_str("name")?.to_string();
		let ip = service_info.get_addresses_v4().iter().next()?.to_string();
		let port = service_info.get_port();
		let pin_hash = service_info
			.get_property_val_str("pin_hash")
			.map(|s| s.to_string());

		Some(Self {
			id,
			name,
			ip,
			port,
			pin_hash,
		})
	}
}

pub async fn start_server(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
	pin: Option<String>,
) -> Result<()> {
	set_pin_hash_and_aes_key(pin).await?;

	start_mdns(app.clone(), id, name, port).await?;
	start_http_server(app, port).await?;

	#[cfg(debug_assertions)]
	print_global_vars();

	Ok(())
}

async fn set_pin_hash_and_aes_key(pin: Option<String>) -> Result<()> {
	tokio::task::spawn_blocking(move || {
		if let Some(pin) = pin.as_deref() {
			let mut pin_lock = PIN.lock().unwrap();
			if pin_lock.is_none()
				|| pin_lock.as_ref().is_some_and(|old_pin| old_pin != pin)
			{
				*pin_lock = Some(pin.to_string());

				let pin_hash = compute_pin_hash(pin);
				let mut pin_hash_lock = PIN_HASH.lock().unwrap();
				*pin_hash_lock = Some(pin_hash);

				let aes_key = derive_aes_key(pin);
				let mut aes_key_lock = AES_KEY.lock().unwrap();
				*aes_key_lock = Some(aes_key);
			}
		} else {
			let _ = PIN.lock().unwrap().take();
			let _ = PIN_HASH.lock().unwrap().take();
			let _ = AES_KEY.lock().unwrap().take();
		}
	})
	.await?;

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
	let pin_hash = {
		let pin_hash_lock = PIN_HASH.lock().unwrap();
		if let Some(pin_hash) = pin_hash_lock.as_ref() {
			properties.push(("pin_hash", pin_hash.clone()));
		}
		pin_hash_lock.clone()
	};

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
					if let Some(device_info) =
						DeviceInfo::from_service_info(info)
					{
						if device_info.id != id
							&& device_info.pin_hash == pin_hash
						{
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

	let mut mdns_lock = MDNS.lock().unwrap();
	*mdns_lock = Some(mdns);

	println!("start mdns");

	Ok(())
}

async fn shutdown_mdns(id: String) {
	use mdns_sd::DaemonStatus;

	let mdns = {
		let mut mdns_lock = MDNS.lock().unwrap();
		let Some(mdns) = mdns_lock.take() else {
			return;
		};
		mdns
	};
	let _ = mdns.stop_browse(SERVICE_TYPE);
	let full_name = format!("{}.{}", id, SERVICE_TYPE);
	if let Ok(unregister_rx) = mdns.unregister(&full_name) {
		let _ = unregister_rx.recv_async().await;
	}
	if let Ok(rx) = mdns.shutdown() {
		while let Ok(status) = rx.recv_async().await {
			if let DaemonStatus::Shutdown = status {
				break;
			}
		}
	}

	println!("shutdown mdns");
}

fn is_mdns_running() -> bool {
	MDNS.lock().unwrap().is_some()
}

async fn start_http_server(app: AppHandle, port: u16) -> Result<()> {
	use axum::{Router, routing::post, serve};
	use tokio::net::TcpListener;

	if is_http_server_running() {
		return Ok(());
	}

	let (tx, rx) = oneshot::channel::<()>();

	{
		let mut tx_lock = SHUTDOWN_HTTP_SERVER_TX.lock().unwrap();
		*tx_lock = Some(tx);
	}

	let service: Router<()> = Router::new()
		.route("/broadcast", post(handle_broadcast))
		.layer(Extension(app));
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
	let mut tx_lock = SHUTDOWN_HTTP_SERVER_TX.lock().unwrap();
	if let Some(tx) = tx_lock.take() {
		let _ = tx.send(());
	};
}

fn is_http_server_running() -> bool {
	SHUTDOWN_HTTP_SERVER_TX.lock().unwrap().is_some()
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ClipItem {
	kind: String,
	value: String,
	iv: String,
}

#[derive(Clone, Serialize)]
struct ClipboardSync {
	kind: String,
	value: String,
}

async fn handle_broadcast(
	headers: HeaderMap,
	Extension(app): Extension<AppHandle>,
	Json(payload): Json<ClipItem>,
) {
	let pin_hash = PIN_HASH.lock().unwrap().clone();
	let aes_key = *AES_KEY.lock().unwrap();
	let req_pin_hash = headers.get(PIN_HASH_HEADER);

	match (pin_hash, aes_key) {
		(Some(pin_hash), Some(aes_key)) => {
			if req_pin_hash.is_none()
				|| req_pin_hash
					.is_some_and(|v| v.as_bytes() != pin_hash.as_bytes())
			{
				return;
			}
			match decrypt_content(&payload.value, &payload.iv, &aes_key) {
				Ok(content) => {
					app.emit(
						"clipboard_sync",
						ClipboardSync {
							kind: payload.kind,
							value: content,
						},
					)
					.unwrap();
				}
				Err(err) => {
					println!("{}", err);
				}
			};
		}
		(None, None) => {
			app.emit(
				"clipboard_sync",
				ClipboardSync {
					kind: payload.kind,
					value: payload.value,
				},
			)
			.unwrap();
		}
		_ => (),
	}
}

pub async fn broadcast_clipboard_sync(
	mut clip_item: ClipItem,
	devices: Vec<DeviceInfo>,
) -> Result<()> {
	use reqwest::header::{HeaderMap, HeaderValue};
	use std::time::Duration;

	let pin_hash = PIN_HASH.lock().unwrap().clone();
	let aes_key = *AES_KEY.lock().unwrap();

	if let Some(aes_key) = aes_key {
		let (value, iv) = encrypt_content(&clip_item.value, &aes_key)?;
		clip_item.value = value;
		clip_item.iv = iv;
	}

	let pin_hash_hv = if let Some(pin_hash) = pin_hash {
		if let Ok(hv) = HeaderValue::from_str(&pin_hash) {
			Some(hv)
		} else {
			return Err(anyhow::anyhow!("Cannot set X-PIN-Hash"));
		}
	} else {
		None
	};

	let mut builder = reqwest::Client::builder()
		.http1_only()
		.timeout(Duration::from_secs(10));

	if let Some(hv) = &pin_hash_hv {
		let mut headers = HeaderMap::new();
		headers.insert(PIN_HASH_HEADER, hv.clone());
		builder = builder.default_headers(headers);
	}

	let Ok(client) = builder.build() else {
		return Err(anyhow::anyhow!("Cannot to build the request client"));
	};

	for device in devices {
		println!("Ready send to {}", device.name);
		let url = format!("http://{}:{}/broadcast", device.ip, device.port);
		let req = client.post(url).json(&clip_item);
		tokio::spawn(async move {
			if req.send().await.is_ok() {
				println!("Send to {}", device.name);
			} else {
				println!("Failed send to {}", device.name);
			}
		});
	}

	Ok(())
}
