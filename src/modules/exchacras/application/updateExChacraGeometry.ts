import {
  updateExChacraGeometry as updateExChacraGeometryInDatabase,
} from "../infrastructure/SqliteExChacraRepository";

/*
 * Guarda una nueva forma geográfica
 * para una EXCHACRA existente.
 */
export async function updateExChacraGeometry(
  id: string,
  geometryGeoJson: string,
): Promise<void> {
  if (!id) {
    throw new Error(
      "La EXCHACRA no tiene identificador.",
    );
  }

  /*
   * Validamos que el texto realmente sea
   * una geometría GeoJSON de tipo polígono.
   */
  let geometry: {
    type?: string;
  };

  try {
    geometry =
      JSON.parse(
        geometryGeoJson,
      );
  } catch {
    throw new Error(
      "La geometría no contiene GeoJSON válido.",
    );
  }

  if (
    geometry.type !== "Polygon" &&
    geometry.type !== "MultiPolygon"
  ) {
    throw new Error(
      "La geometría de una EXCHACRA debe ser un polígono.",
    );
  }

  await updateExChacraGeometryInDatabase(
    id,
    geometryGeoJson,
    new Date().toISOString(),
  );
}