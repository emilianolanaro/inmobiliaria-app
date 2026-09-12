import GeoJSON from "ol/format/GeoJSON";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

import {
  Fill,
  Stroke,
  Style,
  Text,
} from "ol/style";

import { getAterBlocksForChajari } from "../application/getAterBlocksForChajari";

/*
 * ATER devuelve números como:
 *
 * "0007"
 * "0015"
 * "0125"
 *
 * Para visualización los convertimos en:
 *
 * 7
 * 15
 * 125
 */
function getBlockNumber(
  properties: Record<string, unknown>,
): string {
  const value =
    properties.manz;

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/^0+(?=\d)/, "");
}

/*
 * --------------------------------------------------
 * CREAR CAPAS DE MANZANAS ATER
 * --------------------------------------------------
 *
 * Ambas capas usan el mismo VectorSource.
 *
 * Una dibuja el polígono.
 * La otra dibuja el número.
 */
export function createAterBlocksLayers(
  visible: boolean,
) {
  const source =
    new VectorSource();

  const blocksLayer =
    new VectorLayer({
      source,

      visible,

      style: new Style({
        stroke: new Stroke({
          color:
            "rgba(30, 64, 175, 0.95)",

          width: 2,
        }),

        fill: new Fill({
          color:
            "rgba(59, 130, 246, 0.28)",
        }),
      }),
    });

  const labelsLayer =
    new VectorLayer({
      source,

      /*
       * Actualmente los números permanecen
       * siempre visibles.
       *
       * Más adelante les agregaremos
       * su propio checkbox.
       */
      visible: true,

      declutter: false,

      style: (feature) => {
        const blockNumber =
          getBlockNumber(
            feature.getProperties(),
          );

        if (!blockNumber) {
          return undefined;
        }

        return new Style({
          text: new Text({
            text: blockNumber,

            font:
              "bold 14px Arial, sans-serif",

            textAlign: "center",

            textBaseline: "middle",

            fill: new Fill({
              color: "#111827",
            }),

            stroke: new Stroke({
              color: "#ffffff",
              width: 4,
            }),

            overflow: true,
          }),
        });
      },
    });

  return {
    source,
    blocksLayer,
    labelsLayer,
  };
}

/*
 * --------------------------------------------------
 * DESCARGAR MANZANAS DE ATER
 * --------------------------------------------------
 */
export async function loadAterBlocksIntoSource(
  source: VectorSource,
): Promise<void> {
  const geoJson =
    await getAterBlocksForChajari();

  const features =
    new GeoJSON().readFeatures(
      geoJson,
      {
        dataProjection:
          "EPSG:4326",

        featureProjection:
          "EPSG:3857",
      },
    );

  source.clear();

  source.addFeatures(features);

  console.info(
    `Manzanas ATER cargadas: ${features.length}`,
  );
}