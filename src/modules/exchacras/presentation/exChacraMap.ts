import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type Geometry from "ol/geom/Geometry";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

import {
  Fill,
  Stroke,
  Style,
  Text,
} from "ol/style";

import { getAllExChacras } from "../infrastructure/SqliteExChacraRepository";

/*
 * Tipo concreto del VectorSource que utilizamos
 * para las EXCHACRAS.
 *
 * Cada entidad del mapa es un Feature independiente.
 */
export type ExChacraVectorSource =
  VectorSource<Feature<Geometry>>;

/*
 * --------------------------------------------------
 * CAPA DE EXCHACRAS GUARDADAS
 * --------------------------------------------------
 *
 * Crea:
 *
 * - VectorSource
 * - VectorLayer
 *
 * Cada EXCHACRA almacenada en SQLite aparecerá
 * como un Feature independiente dentro del source.
 */
export function createExChacraLayer(
  visible: boolean,
) {
  const source =
    new VectorSource<Feature<Geometry>>();

  const layer = new VectorLayer({
    source,

    visible,

    style: (feature) => {
      const numero =
        feature.get("numero");

      return new Style({
        stroke: new Stroke({
          color:
            "rgba(124, 45, 18, 0.95)",

          width: 3,
        }),

        fill: new Fill({
          color:
            "rgba(251, 146, 60, 0.18)",
        }),

        text: new Text({
          text:
            numero !== undefined
              ? `EXCHACRA ${numero}`
              : "",

          font:
            "bold 15px Arial, sans-serif",

          fill: new Fill({
            color: "#7c2d12",
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
    layer,
  };
}

/*
 * --------------------------------------------------
 * CAPA TEMPORAL DE DIBUJO
 * --------------------------------------------------
 *
 * Esta capa contiene el polígono rojo mientras
 * estamos creando una nueva EXCHACRA.
 *
 * Todavía no representa información guardada
 * en SQLite.
 */
export function createExChacraDraftLayer() {
  const source =
    new VectorSource<Feature<Geometry>>();

  const layer = new VectorLayer({
    source,

    style: new Style({
      stroke: new Stroke({
        color: "#dc2626",
        width: 3,
      }),

      fill: new Fill({
        color:
          "rgba(220, 38, 38, 0.15)",
      }),
    }),
  });

  return {
    source,
    layer,
  };
}

/*
 * --------------------------------------------------
 * CARGAR EXCHACRAS DESDE SQLITE
 * --------------------------------------------------
 *
 * SQLite:
 *   GeoJSON EPSG:4326
 *
 * OpenLayers:
 *   EPSG:3857
 *
 * Esta función realiza la transformación y
 * genera un Feature independiente por EXCHACRA.
 */
export async function loadExChacrasIntoSource(
  source: ExChacraVectorSource,
): Promise<void> {
  const exChacras =
    await getAllExChacras();

  const format = new GeoJSON();

  const features:
    Feature<Geometry>[] =
    exChacras.map((exChacra) => {
      /*
       * geometryGeoJson está almacenado
       * como TEXT dentro de SQLite.
       */
      const geometryGeoJson =
        JSON.parse(
          exChacra.geometryGeoJson,
        );

      /*
       * Convertimos la geometría desde
       * coordenadas geográficas a la
       * proyección visual de OpenLayers.
       */
      const geometry =
        format.readGeometry(
          geometryGeoJson,
          {
            dataProjection:
              "EPSG:4326",

            featureProjection:
              "EPSG:3857",
          },
        );

      /*
       * Cada EXCHACRA es su propio Feature.
       *
       * Esto será fundamental más adelante
       * para seleccionar, filtrar, colorear,
       * editar o eliminar una en particular.
       */
      const feature =
        new Feature<Geometry>({
          geometry,
        });

      feature.setProperties({
        id: exChacra.id,
        numero: exChacra.numero,
        source: exChacra.source,
      });

      return feature;
    });

  source.clear();

  source.addFeatures(features);

  console.info(
    `EXCHACRAS locales cargadas: ${features.length}`,
  );
}