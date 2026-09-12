import { getDatabase } from "../../../shared/infrastructure/database/database";

import type { ExChacra } from "../domain/ExChacra";

/*
 * Representación exacta de una fila
 * tal como viene desde SQLite.
 */
interface ExChacraRow {
  id: string;
  numero: number;
  geometry_geojson: string;
  source: "manual" | "imported";
  created_at: string;
  updated_at: string;
}

/*
 * --------------------------------------------------
 * CREAR
 * --------------------------------------------------
 */
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

/*
 * --------------------------------------------------
 * OBTENER TODAS
 * --------------------------------------------------
 */
export async function getAllExChacras():
  Promise<ExChacra[]> {
  const db = await getDatabase();

  const rows =
    await db.select<ExChacraRow[]>(
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

    geometryGeoJson:
      row.geometry_geojson,

    source: row.source,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  }));
}

/*
 * --------------------------------------------------
 * MODIFICAR NÚMERO
 * --------------------------------------------------
 */
export async function updateExChacraNumber(
  id: string,
  numero: number,
  updatedAt: string,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE exchacras
      SET
        numero = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      numero,
      updatedAt,
      id,
    ],
  );
}

/*
 * --------------------------------------------------
 * MODIFICAR GEOMETRÍA
 * --------------------------------------------------
 */
export async function updateExChacraGeometry(
  id: string,
  geometryGeoJson: string,
  updatedAt: string,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      UPDATE exchacras
      SET
        geometry_geojson = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      geometryGeoJson,
      updatedAt,
      id,
    ],
  );
}

/*
 * --------------------------------------------------
 * ELIMINAR
 * --------------------------------------------------
 */
export async function deleteExChacraById(
  id: string,
): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `
      DELETE FROM exchacras
      WHERE id = ?
    `,
    [id],
  );
}