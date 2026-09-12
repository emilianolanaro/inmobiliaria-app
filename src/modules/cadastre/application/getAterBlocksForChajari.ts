import { getAterCatalog } from "./getAterCatalog";

import { fetchAterFeatures } from "../infrastructure/AterWfsService";

const CHAJARI_BOUNDING_BOX = {
  minLongitude: -58.05,
  minLatitude: -30.82,
  maxLongitude: -57.90,
  maxLatitude: -30.68,
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function getAterBlocksForChajari(): Promise<
  Record<string, unknown>
> {
  const layers = await getAterCatalog();

  const blockLayer = layers.find((layer) => {
    const searchableText = normalize(
      `${layer.name} ${layer.title}`,
    );

    return searchableText.includes("manzan");
  });

  if (!blockLayer) {
    throw new Error(
      "ATER no informó ninguna capa de manzanas",
    );
  }

  console.info(
    `Cargando manzanas desde ATER: ${blockLayer.name}`,
  );

  return fetchAterFeatures(
    blockLayer.name,
    CHAJARI_BOUNDING_BOX,
  );
}