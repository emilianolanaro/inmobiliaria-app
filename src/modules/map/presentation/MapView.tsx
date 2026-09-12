import { useEffect, useRef, useState } from "react";

import Map from "ol/Map";
import View from "ol/View";
import Draw from "ol/interaction/Draw";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

import {
  Fill,
  Stroke,
  Style,
  Text,
} from "ol/style";

import { fromLonLat } from "ol/proj";

import { useMapStore } from "../application/useMapStore";

import { getAterBlocksForChajari } from "../../cadastre/application/getAterBlocksForChajari";

import { createExChacra } from "../../exchacras/application/createExChacra";

import { getAllExChacras } from "../../exchacras/infrastructure/SqliteExChacraRepository";

import "ol/ol.css";
import "./MapView.css";

const CHAJARI_COORDINATES = [-57.98, -30.75];

/**
 * Obtiene el número de manzana informado por ATER.
 *
 * ATER devuelve valores como:
 * "0007" -> "7"
 * "0125" -> "125"
 *
 * Más adelante relacionaremos cada manzana
 * con su EXCHACRA correspondiente.
 */
function getBlockNumber(
  properties: Record<string, unknown>,
): string {
  const value = properties.manz;

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return "";
  }

  const rawValue = String(value).trim();

  return rawValue.replace(/^0+(?=\d)/, "");
}

/**
 * Carga desde SQLite todas las EXCHACRAS
 * guardadas localmente y las convierte
 * en Features de OpenLayers.
 *
 * En la base de datos las geometrías
 * están almacenadas en EPSG:4326.
 *
 * OpenLayers trabaja visualmente
 * en EPSG:3857, por eso transformamos
 * las coordenadas al cargarlas.
 */
async function loadExChacras(
    source: VectorSource<Feature<Geometry>>,
  ): Promise<void> {
    /*
    * Obtenemos todas las EXCHACRAS
    * almacenadas en SQLite.
    */
    const exChacras =
      await getAllExChacras();

    /*
    * GeoJSON se encargará de convertir
    * nuestras geometrías guardadas
    * al formato que utiliza OpenLayers.
    */
    const format = new GeoJSON();

    /*
    * Dejamos explícitamente indicado que
    * este array solamente contendrá
    * Feature<Geometry>.
    *
    * Esto evita la ambigüedad de tipos que
    * estaba generando readFeature().
    */
    const features: Feature<Geometry>[] =
      exChacras.map((exChacra) => {
        /*
        * geometryGeoJson está guardado en
        * SQLite como TEXT.
        *
        * Primero volvemos a convertirlo
        * en un objeto JavaScript.
        */
        const geometryGeoJson =
          JSON.parse(
            exChacra.geometryGeoJson,
          );

        /*
        * Leemos únicamente la geometría.
        *
        * Al mismo tiempo hacemos la
        * transformación:
        *
        * EPSG:4326
        *     ↓
        * EPSG:3857
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
        * Creamos nosotros explícitamente
        * el Feature de OpenLayers.
        *
        * De esta manera TypeScript sabe
        * exactamente qué tipo estamos
        * agregando al VectorSource.
        */
        const feature =
          new Feature<Geometry>({
            geometry,
          });

        /*
        * Agregamos los atributos que
        * necesitaremos en el mapa.
        *
        * Por ejemplo, el estilo utiliza
        * "numero" para mostrar:
        *
        * EXCHACRA 95
        */
        feature.setProperties({
          id: exChacra.id,
          numero: exChacra.numero,
          source: exChacra.source,
        });

        return feature;
      });

    /*
    * Eliminamos lo que había actualmente
    * en la capa.
    */
    source.clear();

    /*
    * Agregamos la información recién
    * cargada desde SQLite.
    */
    source.addFeatures(features);

    console.info(
      `EXCHACRAS locales cargadas: ${features.length}`,
    );
  }

function MapView() {
  /*
   * --------------------------------------------------
   * REFERENCIA AL ELEMENTO HTML DEL MAPA
   * --------------------------------------------------
   */

  const mapElement =
    useRef<HTMLDivElement | null>(null);

  /*
   * --------------------------------------------------
   * REFERENCIAS OPENLAYERS
   * --------------------------------------------------
   */

  const mapRef =
    useRef<Map | null>(null);

  const baseLayerRef =
    useRef<TileLayer<OSM> | null>(null);

  const blocksLayerRef =
    useRef<VectorLayer<VectorSource> | null>(null);

  const blockLabelsLayerRef =
    useRef<VectorLayer<VectorSource> | null>(null);

  const exChacrasLayerRef =
    useRef<VectorLayer<VectorSource> | null>(null);

  const draftSourceRef =
    useRef<VectorSource | null>(null);

  const drawInteractionRef =
    useRef<Draw | null>(null);

  /*
   * --------------------------------------------------
   * ESTADO GLOBAL DEL MAPA - ZUSTAND
   * --------------------------------------------------
   */

  const baseMapVisible = useMapStore(
    (state) => state.baseMapVisible,
  );

  const blocksVisible = useMapStore(
    (state) => state.layers.blocks,
  );

  const exChacrasVisible = useMapStore(
    (state) => state.layers.exchacras,
  );

  const drawingMode = useMapStore(
    (state) => state.drawingMode,
  );

  const stopDrawing = useMapStore(
    (state) => state.stopDrawing,
  );

  /*
   * --------------------------------------------------
   * ESTADO DEL FORMULARIO DE NUEVA EXCHACRA
   * --------------------------------------------------
   */

  const [
    pendingExChacraGeometry,
    setPendingExChacraGeometry,
  ] = useState<string | null>(null);

  const [
    exChacraNumber,
    setExChacraNumber,
  ] = useState("");

  const [
    saveError,
    setSaveError,
  ] = useState<string | null>(null);

  /*
   * --------------------------------------------------
   * CREACIÓN DEL MAPA
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    /*
     * MAPA BASE
     */

    const baseLayer = new TileLayer({
      source: new OSM(),
      visible: baseMapVisible,
    });

    /*
     * MANZANAS ATER
     */

    const blocksSource =
      new VectorSource();

    const blocksLayer =
      new VectorLayer({
        source: blocksSource,

        visible: blocksVisible,

        style: new Style({
          stroke: new Stroke({
            color: "rgba(30, 64, 175, 0.95)",
            width: 2,
          }),

          fill: new Fill({
            color: "rgba(59, 130, 246, 0.28)",
          }),
        }),
      });

    /*
     * NÚMEROS DE MANZANA
     *
     * Esta capa permanece visible aunque
     * ocultemos el coloreado de manzanas.
     */

    const blockLabelsLayer =
      new VectorLayer({
        source: blocksSource,

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

    /*
     * EXCHACRAS GUARDADAS LOCALMENTE
     */

    const exChacrasSource =
      new VectorSource();

    const exChacrasLayer =
      new VectorLayer({
        source: exChacrasSource,

        visible: exChacrasVisible,

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

    /*
     * CAPA TEMPORAL DE DIBUJO
     *
     * El polígono permanece acá hasta
     * que el usuario indique el número
     * y confirme Guardar.
     */

    const draftSource =
      new VectorSource();

    const draftLayer =
      new VectorLayer({
        source: draftSource,

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

    /*
     * Guardamos referencias.
     */

    baseLayerRef.current =
      baseLayer;

    blocksLayerRef.current =
      blocksLayer;

    blockLabelsLayerRef.current =
      blockLabelsLayer;

    exChacrasLayerRef.current =
      exChacrasLayer;

    draftSourceRef.current =
      draftSource;

    /*
     * CREACIÓN DE OPENLAYERS
     */

    const map = new Map({
      target: mapElement.current,

      layers: [
        baseLayer,

        // Catastro local
        exChacrasLayer,

        // Datos ATER
        blocksLayer,
        blockLabelsLayer,

        // Dibujo actualmente en edición
        draftLayer,
      ],

      view: new View({
        center: fromLonLat(
          CHAJARI_COORDINATES,
        ),

        zoom: 14,
      }),
    });

    mapRef.current = map;

    /*
     * Cargamos las EXCHACRAS previamente
     * guardadas en SQLite.
     */

    void loadExChacras(
      exChacrasSource,
    ).catch((error) => {
      console.error(
        "Error cargando EXCHACRAS:",
        error,
      );
    });

    /*
     * CLEANUP
     */

    return () => {
      map.setTarget(undefined);

      mapRef.current = null;

      baseLayerRef.current = null;

      blocksLayerRef.current = null;

      blockLabelsLayerRef.current =
        null;

      exChacrasLayerRef.current =
        null;

      draftSourceRef.current = null;

      drawInteractionRef.current =
        null;
    };
  }, []);

  /*
   * --------------------------------------------------
   * VISIBILIDAD DEL MAPA BASE
   * --------------------------------------------------
   */

  useEffect(() => {
    baseLayerRef.current?.setVisible(
      baseMapVisible,
    );
  }, [baseMapVisible]);

  /*
   * --------------------------------------------------
   * VISIBILIDAD DE MANZANAS
   * --------------------------------------------------
   */

  useEffect(() => {
    blocksLayerRef.current?.setVisible(
      blocksVisible,
    );
  }, [blocksVisible]);

  /*
   * --------------------------------------------------
   * VISIBILIDAD DE EXCHACRAS
   * --------------------------------------------------
   */

  useEffect(() => {
    exChacrasLayerRef.current?.setVisible(
      exChacrasVisible,
    );
  }, [exChacrasVisible]);

  /*
   * --------------------------------------------------
   * CARGA DE MANZANAS DESDE ATER
   * --------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadBlocks() {
      try {
        const geoJson =
          await getAterBlocksForChajari();

        if (cancelled) {
          return;
        }

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

        const source =
          blocksLayerRef.current
            ?.getSource();

        if (!source) {
          return;
        }

        source.clear();

        source.addFeatures(features);

        console.info(
          `Manzanas ATER cargadas: ${features.length}`,
        );
      } catch (error) {
        console.error(
          "No se pudieron cargar las manzanas de ATER:",
          error,
        );
      }
    }

    void loadBlocks();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * --------------------------------------------------
   * HERRAMIENTA PARA DIBUJAR EXCHACRAS
   * --------------------------------------------------
   */

  useEffect(() => {
    const map =
      mapRef.current;

    const draftSource =
      draftSourceRef.current;

    if (!map || !draftSource) {
      return;
    }

    /*
     * Si existía una interacción anterior,
     * primero la eliminamos.
     */

    if (drawInteractionRef.current) {
      map.removeInteraction(
        drawInteractionRef.current,
      );

      drawInteractionRef.current =
        null;
    }

    /*
     * Si no estamos en modo dibujo,
     * no hacemos nada más.
     */

    if (
      drawingMode !== "exchacra"
    ) {
      return;
    }

    /*
     * Limpiamos cualquier dibujo
     * temporal anterior.
     */

    draftSource.clear();

    /*
     * Creamos herramienta Polygon.
     */

    const draw =
      new Draw({
        source: draftSource,
        type: "Polygon",
      });

    drawInteractionRef.current =
      draw;

    /*
     * EVENTO: el usuario terminó
     * de dibujar el polígono.
     */

    draw.on(
      "drawend",
      (event) => {
        const geometry =
          event.feature.getGeometry();

        if (!geometry) {
          return;
        }

        const format =
          new GeoJSON();

        /*
         * OpenLayers trabaja visualmente
         * en EPSG:3857.
         *
         * Para almacenarlo convertimos
         * a EPSG:4326.
         */

        const geometryObject =
          format.writeGeometryObject(
            geometry,
            {
              featureProjection:
                "EPSG:3857",

              dataProjection:
                "EPSG:4326",

              decimals: 7,
            },
          );

        setPendingExChacraGeometry(
          JSON.stringify(
            geometryObject,
          ),
        );

        setExChacraNumber("");

        setSaveError(null);

        /*
         * Finalizamos la herramienta
         * después de crear un polígono.
         */

        map.removeInteraction(
          draw,
        );

        drawInteractionRef.current =
          null;

        stopDrawing();
      },
    );

    map.addInteraction(draw);

    /*
     * Cleanup si cambia el modo.
     */

    return () => {
      map.removeInteraction(draw);

      if (
        drawInteractionRef.current ===
        draw
      ) {
        drawInteractionRef.current =
          null;
      }
    };
  }, [
    drawingMode,
    stopDrawing,
  ]);

  /*
   * --------------------------------------------------
   * GUARDAR NUEVA EXCHACRA
   * --------------------------------------------------
   */

  async function handleSaveExChacra() {
    if (
      !pendingExChacraGeometry
    ) {
      return;
    }

    const numero =
      Number(exChacraNumber);

    if (
      !Number.isInteger(numero) ||
      numero <= 0
    ) {
      setSaveError(
        "Ingresá un número de EXCHACRA válido.",
      );

      return;
    }

    try {
      setSaveError(null);

      /*
       * Caso de uso.
       *
       * Esto termina guardando
       * la EXCHACRA en SQLite.
       */

      await createExChacra(
        numero,
        pendingExChacraGeometry,
      );

      /*
       * Recargamos la capa directamente
       * desde SQLite.
       *
       * De esta manera lo que vemos en
       * pantalla siempre refleja la BD.
       */

      const source =
        exChacrasLayerRef.current
          ?.getSource();

      if (source) {
        await loadExChacras(
          source,
        );
      }

      /*
       * Limpiamos polígono temporal.
       */

      draftSourceRef.current
        ?.clear();

      /*
       * Cerramos formulario.
       */

      setPendingExChacraGeometry(
        null,
      );

      setExChacraNumber("");

      setSaveError(null);
    } catch (error) {
      console.error(
        "Error guardando EXCHACRA:",
        error,
      );

      setSaveError(
        "No se pudo guardar la EXCHACRA. Verificá que ese número no exista.",
      );
    }
  }

  /*
   * --------------------------------------------------
   * CANCELAR NUEVA EXCHACRA
   * --------------------------------------------------
   */

  function handleCancelExChacra() {
    draftSourceRef.current
      ?.clear();

    setPendingExChacraGeometry(
      null,
    );

    setExChacraNumber("");

    setSaveError(null);
  }

  /*
   * --------------------------------------------------
   * INTERFAZ
   * --------------------------------------------------
   */

  return (
    <div className="map-container">
      <div
        ref={mapElement}
        className="map"
      />

      {pendingExChacraGeometry && (
        <div className="exchacra-dialog">
          <h3>
            Nueva EXCHACRA
          </h3>

          <label>
            Número

            <input
              type="number"
              min="1"
              autoFocus
              value={
                exChacraNumber
              }
              onChange={(
                event,
              ) =>
                setExChacraNumber(
                  event.target.value,
                )
              }
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  void handleSaveExChacra();
                }
              }}
            />
          </label>

          {saveError && (
            <p className="exchacra-dialog__error">
              {saveError}
            </p>
          )}

          <div className="exchacra-dialog__actions">
            <button
              type="button"
              onClick={
                handleCancelExChacra
              }
            >
              Cancelar
            </button>

            <button
              type="button"
              className="exchacra-dialog__save"
              onClick={() =>
                void handleSaveExChacra()
              }
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;