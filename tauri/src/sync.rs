use std::sync::Mutex;

use anyhow::Result;
use mdns_sd::{IfKind, ServiceDaemon, ServiceInfo};
use serde::Serialize;
use tauri::{AppHandle, Emitter, async_runtime::spawn};

const SERVICE_TYPE: &str = "_pastly._udp.local.";

static MDNS: Mutex<Option<ServiceDaemon>> = Mutex::new(None);

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
) -> Result<()> {
	start_mdns(app, id, name, port).await?;

	Ok(())
}

pub async fn shutdown_server(id: String) {
	shutdown_mdns(id).await;
}

async fn start_mdns(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
) -> Result<()> {
	use mdns_sd::ServiceEvent::*;

	shutdown_mdns(id.clone()).await;

	let local_ip = local_ip_address::local_ip()?;
	let host_name = format!("{}.local.", id.clone());

	let service_info = ServiceInfo::new(
		SERVICE_TYPE,
		&id.clone(),
		&host_name,
		local_ip,
		port,
		&[("id", id), ("name", name)][..],
	)?;

	let mdns = ServiceDaemon::new()?;
	mdns.set_multicast_loop_v4(false)?;
	mdns.set_multicast_loop_v6(false)?;
	mdns.enable_interface(vec![IfKind::IPv4])?;
	mdns.register(service_info)?;

	let rx = mdns.browse(SERVICE_TYPE)?;
	spawn(async move {
		while let Ok(event) = rx.recv_async().await {
			match event {
				ServiceResolved(info) => {
					println!("mdns service resolved: {:#?}", info);
					if let Some(device_info) = server_info_to_device_info(info)
					{
						app.emit("device_found", device_info).unwrap();
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
				other_event => {
					println!("{:#?}", other_event);
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
		if mdns_opt.is_none() {
			return;
		}
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
