import Database from "@tauri-apps/plugin-sql";

/*
 * Mantenemos una única conexión SQLite
 * durante toda la ejecución de la app.
 */
let database:
  Database | null = null;

const DATABASE_URL =
  "sqlite:inmobiliaria.db";

/*
 * El esquema ya NO se crea desde TypeScript.
 *
 * Las tablas y futuras modificaciones se
 * administran mediante migraciones de Tauri.
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