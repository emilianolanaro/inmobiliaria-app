import { getDatabase } from "../../../shared/infrastructure/database/database";

import type { ExChacra } from "../domain/ExChacra";

interface ExChacraRow {
  id: string;
  numero: number;
  geometry_geojson: string;
  source: "manual" | "imported";
  created_at: string;
  updated_at: string;
}

export async function saveExChacra(
  exChacra: ExChacra,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      INSERT INTO exchacras (
        id,
        numero,
        geometry_geojson,
        source,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      exChacra.id,
      exChacra.numero,
      exChacra.geometryGeoJson,
      exChacra.source,
      exChacra.createdAt,
      exChacra.updatedAt,
    ],
  );
}

export async function getAllExChacras(): Promise<
  ExChacra[]
> {
  const db = await getDatabase();

  const rows = await db.select<ExChacraRow[]>(
    `
      SELECT
        id,
        numero,
        geometry_geojson,
        source,
        created_at,
        updated_at
      FROM exchacras
      ORDER BY numero
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    numero: row.numero,
    geometryGeoJson: row.geometry_geojson,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}