import {
  deleteExChacraById,
} from "../infrastructure/SqliteExChacraRepository";

/*
 * Elimina definitivamente una EXCHACRA
 * de la base local.
 */
export async function deleteExChacra(
  id: string,
): Promise<void> {
  if (!id) {
    throw new Error(
      "La EXCHACRA no tiene identificador.",
    );
  }

  await deleteExChacraById(id);
}