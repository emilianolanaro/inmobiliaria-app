import {
  updateExChacraNumber as updateExChacraNumberInDatabase,
} from "../infrastructure/SqliteExChacraRepository";

/*
 * Modifica únicamente el número visible
 * de una EXCHACRA existente.
 */
export async function updateExChacraNumber(
  id: string,
  numero: number,
): Promise<void> {
  if (!id) {
    throw new Error(
      "La EXCHACRA no tiene identificador.",
    );
  }

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    throw new Error(
      "El número de EXCHACRA debe ser un entero mayor a cero.",
    );
  }

  await updateExChacraNumberInDatabase(
    id,
    numero,
    new Date().toISOString(),
  );
}