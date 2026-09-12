import {
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import Map from "ol/Map";
import Draw from "ol/interaction/Draw";
import GeoJSON from "ol/format/GeoJSON";

import { useMapStore } from "../../map/application/useMapStore";

import { createExChacra } from "../application/createExChacra";

import {
  type ExChacraVectorSource,
  loadExChacrasIntoSource,
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

    if (
      !map ||
      !draftSource
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
      },
    );

    map.addInteraction(draw);

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