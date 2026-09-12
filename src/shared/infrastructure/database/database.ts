import Database from "@tauri-apps/plugin-sql";

let database: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (database) {
    return database;
  }

  database = await Database.load(
    "sqlite:inmobiliaria.db",
  );

  await database.execute(`
    CREATE TABLE IF NOT EXISTS exchacras (
      id TEXT PRIMARY KEY,
      numero INTEGER NOT NULL UNIQUE,
      geometry_geojson TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return database;
}