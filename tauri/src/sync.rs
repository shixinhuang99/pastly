use std::sync::Mutex;

use anyhow::Result;
use mdns_sd::{DaemonStatus, ServiceDaemon, ServiceInfo};
use serde::Serialize;
use tauri::{AppHandle, Emitter, async_runtime::spawn};

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

	println!("{:#?}", service_info.get_addresses());
	let ip = service_info.get_hostname().to_string();
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

	println!("start server");

	Ok(())
}

pub async fn shutdown_server() {
	shutdown_mdns().await;

	println!("shutdown server");
}

async fn start_mdns(
	app: AppHandle,
	id: String,
	name: String,
	port: u16,
) -> Result<()> {
	use mdns_sd::ServiceEvent::*;

	let service_type = "_pastly._udp.local.";
	let local_ip = local_ip_address::local_ip()?;
	let host_name = format!("{}.local.", id.clone());

	let service_info = ServiceInfo::new(
		service_type,
		&id.clone(),
		&host_name,
		local_ip,
		port,
		&[("id", id), ("name", name)][..],
	)?;

	let mdns = ServiceDaemon::new()?;
	mdns.set_multicast_loop_v4(false)?;
	mdns.set_multicast_loop_v6(false)?;
	mdns.enable_interface(vec!["en0"])?;
	mdns.register(service_info)?;

	let rx = mdns.browse(service_type)?;
	spawn(async move {
		while let Ok(event) = rx.recv_async().await {
			match event {
				ServiceResolved(info) => {
					println!("mdns service resolved: {:#?}", info);
					if let Some(device_info) = server_info_to_device_info(info)
					{
						app.emit("mdns_service_resolved", device_info).unwrap();
					}
				}
				ServiceRemoved(_, name) => {
					println!("mdns service removed: \"{}\"", name);
					app.emit("mdns_service_removed", name).unwrap();
				}
				_ => (),
			}
		}
	});

	let mut old_mdns = MDNS.lock().unwrap();
	*old_mdns = Some(mdns);

	Ok(())
}

async fn shutdown_mdns() {
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
	if let Ok(rx) = mdns.shutdown() {
		while let Ok(status) = rx.recv_async().await {
			if let DaemonStatus::Shutdown = status {
				return;
			}
		}
	}
}
