import {
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import Map from "ol/Map";
import Draw from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";
import Snap from "ol/interaction/Snap";

import { useMapStore } from "../../map/application/useMapStore";

import { createExChacra } from "../application/createExChacra";

import {
  type ExChacraVectorSource,
  loadExChacrasIntoSource,
  createExChacraSnapInteraction,
  attachExChacraSnapFeedback,
} from "./exChacraMap";

interface UseExChacraCreationParams {
  mapRef:
    RefObject<Map | null>;

  draftSourceRef:
    RefObject<
      ExChacraVectorSource | null
    >;

  exChacrasSourceRef:
    RefObject<
      ExChacraVectorSource | null
    >;
}

/*
 * Hook encargado exclusivamente del proceso
 * de creación de una nueva EXCHACRA.
 *
 * MapView solamente le entrega referencias
 * al mapa y a los VectorSource.
 */
export function useExChacraCreation({
  mapRef,
  draftSourceRef,
  exChacrasSourceRef,
}: UseExChacraCreationParams) {
  /*
   * Estado global que indica si el usuario
   * activó "+ Nueva EXCHACRA".
   */
  const drawingMode =
    useMapStore(
      (state) =>
        state.drawingMode,
    );

  const stopDrawing =
    useMapStore(
      (state) =>
        state.stopDrawing,
    );

  /*
   * Interacción Draw activa actualmente.
   */
  const drawInteractionRef =
    useRef<Draw | null>(null);

  /*
  * Snap activo durante el dibujo.
  */
  const snapInteractionRef =
    useRef<Snap | null>(null);
  /*
   * Geometría terminada pero todavía
   * no guardada en SQLite.
   */
  const [
    pendingGeometry,
    setPendingGeometry,
  ] =
    useState<string | null>(null);

  /*
   * Número ingresado por el usuario.
   */
  const [
    numberValue,
    setNumberValue,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  /*
   * --------------------------------------------------
   * ACTIVAR / DESACTIVAR DRAW
   * --------------------------------------------------
   */
  useEffect(() => {
    const map =
      mapRef.current;

    const draftSource =
      draftSourceRef.current;

    const exChacrasSource =
      exChacrasSourceRef.current;

    if (
      !map ||
      !draftSource ||
      !exChacrasSource
    ) {
      return;
    }

    /*
     * Si quedó alguna interacción anterior,
     * la eliminamos antes de crear otra.
     */
    if (
      drawInteractionRef.current
    ) {
      map.removeInteraction(
        drawInteractionRef.current,
      );

      drawInteractionRef.current =
        null;
    }

    if (
      drawingMode !==
      "exchacra"
    ) {
      return;
    }

    if (snapInteractionRef.current) {
      map.removeInteraction(
        snapInteractionRef.current,
      );

      snapInteractionRef.current =
        null;
    }

    /*
     * Una nueva operación comienza
     * siempre con el borrador limpio.
     */
    draftSource.clear();

    const draw =
      new Draw({
        source: draftSource,
        type: "Polygon",
      });

    /*
    * El dibujo temporal se podrá enganchar
    * a las EXCHACRAS ya guardadas.
    */
    const snap =
      createExChacraSnapInteraction(
        exChacrasSource,
      );

    snapInteractionRef.current =
      snap;

    drawInteractionRef.current =
      draw;

    /*
     * El usuario terminó de dibujar.
     */
    draw.on(
      "drawend",
      (event) => {
        const geometry =
          event.feature
            .getGeometry();

        if (!geometry) {
          return;
        }

        const format =
          new GeoJSON();

        /*
         * OpenLayers:
         * EPSG:3857
         *
         * SQLite:
         * EPSG:4326
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

        setPendingGeometry(
          JSON.stringify(
            geometryObject,
          ),
        );

        setNumberValue("");

        setError(null);

        /*
         * Solamente permitimos dibujar
         * una EXCHACRA por operación.
         */
        map.removeInteraction(
          draw,
        );

        drawInteractionRef.current =
          null;

        stopDrawing();

        map.removeInteraction(
          snap,
        );

        snapInteractionRef.current =
          null;

        removeSnapFeedback();
      },
    );

    /*
    * IMPORTANTE:
    *
    * Snap se agrega DESPUÉS de Draw.
    * OpenLayers procesa las interacciones
    * en el orden necesario para que Snap
    * modifique primero la coordenada
    * utilizada por Draw.
    */
    map.addInteraction(draw);
    map.addInteraction(snap);

    const removeSnapFeedback =
      attachExChacraSnapFeedback(
        map,
        snap,
      );

    return () => {
      map.removeInteraction(draw);

      if (
        drawInteractionRef.current ===
        draw
      ) {
        drawInteractionRef.current =
          null;
      }

      map.removeInteraction(snap);

      removeSnapFeedback();

      if (
        snapInteractionRef.current ===
        snap
      ) {
        snapInteractionRef.current =
          null;
      }
    };
  }, [
    drawingMode,
    mapRef,
    draftSourceRef,
    stopDrawing,
  ]);

  /*
   * --------------------------------------------------
   * GUARDAR
   * --------------------------------------------------
   */
  async function save() {
    if (!pendingGeometry) {
      return;
    }

    const numero =
      Number(numberValue);

    if (
      !Number.isInteger(numero) ||
      numero <= 0
    ) {
      setError(
        "Ingresá un número de EXCHACRA válido.",
      );

      return;
    }

    try {
      setError(null);

      await createExChacra(
        numero,
        pendingGeometry,
      );

      /*
       * Recargamos desde SQLite.
       *
       * La base es nuestra fuente de verdad,
       * no el Feature temporal.
       */
      const exChacrasSource =
        exChacrasSourceRef.current;

      if (exChacrasSource) {
        await loadExChacrasIntoSource(
          exChacrasSource,
        );
      }

      draftSourceRef.current
        ?.clear();

      setPendingGeometry(null);

      setNumberValue("");

      setError(null);
    } catch (saveError) {
      console.error(
        "Error guardando EXCHACRA:",
        saveError,
      );

      setError(
        "No se pudo guardar la EXCHACRA. Verificá que ese número no exista.",
      );
    }
  }

  /*
   * --------------------------------------------------
   * CANCELAR
   * --------------------------------------------------
   */
  function cancel() {
    draftSourceRef.current
      ?.clear();

    setPendingGeometry(null);

    setNumberValue("");

    setError(null);
  }

  return {
    isDialogOpen:
      pendingGeometry !== null,

    numberValue,

    error,

    setNumberValue,

    save,

    cancel,
  };
}