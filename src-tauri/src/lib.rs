use tauri_plugin_sql::{
    Migration,
    MigrationKind,
};

/*
 * Migraciones de la base de datos local.
 *
 * Cada cambio futuro de estructura tendrá
 * una versión distinta:
 *
 * 1 -> EXCHACRAS
 * 2 -> barrios
 * 3 -> manzanas
 * etc.
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
    let migrations =
        database_migrations();

    tauri::Builder::default()
        /*
         * SQLite local.
         *
         * Las migraciones se ejecutarán
         * cuando abramos inmobiliaria.db.
         */
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:inmobiliaria.db",
                    migrations,
                )
                .build(),
        )

        /*
         * Lo conservamos porque más adelante
         * volveremos a consumir ATER.
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