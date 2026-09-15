use tauri_plugin_sql::{
    Migration,
    MigrationKind,
};

/*
 * Migraciones de la base SQLite local.
 *
 * Cada cambio de estructura de la base
 * tendrá en el futuro una versión nueva.
 */
fn database_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,

            description:
                "create_exchacras",

            sql: include_str!(
                "../migrations/0001_create_exchacras.sql"
            ),

            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(
    mobile,
    tauri::mobile_entry_point
)]
pub fn run() {
    tauri::Builder::default()
        /*
         * SQLite local + migraciones.
         */
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:inmobiliaria.db",
                    database_migrations(),
                )
                .build(),
        )

        /*
         * Lo conservamos para ATER,
         * que volveremos a activar después.
         */
        .plugin(
            tauri_plugin_http::init(),
        )

        .run(
            tauri::generate_context!(),
        )

        .expect(
            "error while running Tauri application",
        );
}