import type { ExChacra } from "../domain/ExChacra";

import { saveExChacra } from "../infrastructure/SqliteExChacraRepository";

export async function createExChacra(
  numero: number,
  geometryGeoJson: string,
): Promise<ExChacra> {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(
      "El número de EXCHACRA debe ser un entero mayor a cero.",
    );
  }

  const now = new Date().toISOString();

  const exChacra: ExChacra = {
    id: crypto.randomUUID(),

    numero,

    geometryGeoJson,

    source: "manual",

    createdAt: now,
    updatedAt: now,
  };

  await saveExChacra(exChacra);

  return exChacra;
}