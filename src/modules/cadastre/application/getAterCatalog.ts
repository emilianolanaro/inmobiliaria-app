import type { CadastreLayer } from "../domain/CadastreLayer";

import { fetchAterLayers } from "../infrastructure/AterWfsService";

export async function getAterCatalog(): Promise<
  CadastreLayer[]
> {
  return fetchAterLayers();
}