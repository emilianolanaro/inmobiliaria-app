import Database from "@tauri-apps/plugin-sql";

/*
 * Una sola conexión SQLite para toda
 * la ejecución de la aplicación.
 */
let database:
  Database | null = null;

/*
 * La ruta es administrada por Tauri.
 *
 * No estamos creando inmobiliaria.db
 * dentro del repositorio.
 */
const DATABASE_URL =
  "sqlite:inmobiliaria.db";

/*
 * Devuelve la conexión local.
 *
 * La creación/evolución de tablas ya
 * NO pertenece a TypeScript.
 *
 * El esquema se administra mediante
 * migraciones de Tauri/Rust.
 */
export async function getDatabase():
  Promise<Database> {
  if (database) {
    return database;
  }

  database =
    await Database.load(
      DATABASE_URL,
    );

  return database;
}