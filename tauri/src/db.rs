use tauri_plugin_sql::{Migration, MigrationKind};

pub fn migration_v1() -> Migration {
	Migration {
		version: 1,
		description: "migrate all images to a independent images table",
		sql: include_str!("../migrations/001_migrate_images.sql"),
		kind: MigrationKind::Up,
	}
}
