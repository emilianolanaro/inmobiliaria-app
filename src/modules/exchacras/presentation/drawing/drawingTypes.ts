/*
 * Modo principal utilizado para crear
 * una nueva EXCHACRA.
 */
export type ExChacraDrawMode =
  | "rectangle"
  | "free";

/*
 * En modo rectángulo tenemos dos formas
 * diferentes de construir la geometría.
 */
export type RectangleDrawMode =
  | "diagonal"
  | "dimensions";