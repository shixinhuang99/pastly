use std::sync::Mutex;

use anyhow::Result;
use mdns_sd::{DaemonStatus, ServiceDaemon, ServiceEvent, ServiceInfo};
use tauri::async_runtime::spawn;

static MDNS: Mutex<Option<ServiceDaemon>> = Mutex::new(None);

pub async fn start_server(id: String, name: String, port: u16) -> Result<()> {
	start_mdns(id, name, port).await?;

	println!("start server");

	Ok(())
}

pub async fn shutdown_server() {
	shutdown_mdns().await;

	println!("shutdown server");
}

async fn start_mdns(id: String, name: String, port: u16) -> Result<()> {
	let service_type = "_pastly._udp.local.";
	let local_ip = local_ip_address::local_ip()?;
	let host_name = format!("{}.local.", id.clone());

	let service_info = ServiceInfo::new(
		service_type,
		&name,
		&host_name,
		local_ip,
		port,
		None,
	)?;

	let mdns = ServiceDaemon::new()?;
	mdns.set_multicast_loop_v4(false)?;
	mdns.register(service_info)?;

	let rx = mdns.browse(service_type)?;
	spawn(async move {
		while let Ok(event) = rx.recv_async().await {
			if let ServiceEvent::ServiceResolved(info) = event {
				println!("{:#?}", info);
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
