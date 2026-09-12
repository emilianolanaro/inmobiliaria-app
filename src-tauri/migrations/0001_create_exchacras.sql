CREATE TABLE IF NOT EXISTS exchacras (
    id TEXT PRIMARY KEY,
    numero INTEGER NOT NULL UNIQUE,
    geometry_geojson TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);