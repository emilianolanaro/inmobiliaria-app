import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from "react";

import Collection from "ol/Collection";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Snap from "ol/interaction/Snap";
import type Geometry from "ol/geom/Geometry";

import Modify from "ol/interaction/Modify";
import type Select from "ol/interaction/Select";
import Translate from "ol/interaction/Translate";

import type Map from "ol/Map";

import { createExChacra } from "../application/createExChacra";

import { deleteExChacra } from "../application/deleteExChacra";

import { updateExChacraGeometry } from "../application/updateExChacraGeometry";

import { updateExChacraNumber } from "../application/updateExChacraNumber";

import type {
  SelectedExChacra,
} from "./ExChacraSelectionPanel";

import {
  attachExChacraSnapFeedback,
  createExChacraSnapInteraction,
  type ExChacraVectorSource,
  loadExChacrasIntoSource,
} from "./exChacraMap";

import {
  createAdjacentRectangleGeometry,
  snapFeatureToExistingExChacras,
  type AdjacentDirection,
} from "./drawing/duplicatePlacement";

/*
 * Modos posibles del editor.
 */
export type ExChacraEditorMode =
  | "idle"
  | "shape"
  | "duplicate";

interface Params {
  mapRef:
    RefObject<Map | null>;

  selectInteractionRef:
    RefObject<Select | null>;

  selectedFeatureRef:
    RefObject<
      Feature<Geometry> | null
    >;

  exChacrasSourceRef:
    RefObject<
      ExChacraVectorSource | null
    >;

  draftSourceRef:
    RefObject<
      ExChacraVectorSource | null
    >;

  selectedExChacra:
    SelectedExChacra | null;

  setSelectedExChacra:
    Dispatch<
      SetStateAction<
        SelectedExChacra | null
      >
    >;
}

/*
 * Convierte una geometría que está siendo
 * mostrada por OpenLayers a nuestro formato
 * persistente:
 *
 * EPSG:3857
 *       ↓
 * EPSG:4326
 *       ↓
 * GeoJSON
 *       ↓
 * SQLite
 */
function geometryToGeoJson(
  feature: Feature<Geometry>,
): string {
  const geometry =
    feature.getGeometry();

  if (!geometry) {
    throw new Error(
      "La EXCHACRA no tiene geometría.",
    );
  }

  const format =
    new GeoJSON();

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

  return JSON.stringify(
    geometryObject,
  );
}

export function useExChacraEditing({
  mapRef,
  selectInteractionRef,
  selectedFeatureRef,
  exChacrasSourceRef,
  draftSourceRef,
  selectedExChacra,
  setSelectedExChacra,
}: Params) {
  /*
   * Estado actual del editor.
   */
  const [
    mode,
    setMode,
  ] =
    useState<ExChacraEditorMode>(
      "idle",
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  /*
   * Número que utilizaremos cuando
   * estemos creando una copia.
   */
  const [
    duplicateNumber,
    setDuplicateNumber,
  ] =
    useState("");

  /*
   * Interacción OpenLayers para modificar
   * los vértices.
   */
  const modifyInteractionRef =
    useRef<Modify | null>(
      null,
    );

  /*
  * Snap utilizado tanto durante Modify
  * como durante Translate.
  */
  const snapInteractionRef =
    useRef<Snap | null>(null);

  /*
  * Cleanup del feedback visual.
  */
  const snapFeedbackCleanupRef =
    useRef<
      (() => void) | null
    >(null);

  /*
   * Interacción para mover una copia
   * completa sin alterar su forma.
   */
  const translateInteractionRef =
    useRef<Translate | null>(
      null,
    );

  /*
   * Copia temporal que estamos moviendo.
   */
  const duplicateFeatureRef =
    useRef<
      Feature<Geometry> | null
    >(null);

  /*
   * Guardamos la geometría original antes
   * de entrar en modo edición.
   *
   * Esto permite implementar Cancelar.
   */
  const originalGeometryRef =
    useRef<Geometry | null>(
      null,
    );

  /*
   * --------------------------------------------------
   * MODIFICAR NÚMERO
   * --------------------------------------------------
   */
  async function saveNumber(
    value: string,
  ) {
    const feature =
      selectedFeatureRef.current;

    if (
      !feature ||
      !selectedExChacra
    ) {
      return;
    }

    const numero =
      Number(value);

    if (
      !Number.isInteger(numero) ||
      numero <= 0
    ) {
      setError(
        "Ingresá un número válido.",
      );

      return;
    }

    try {
      setError(null);

      await updateExChacraNumber(
        selectedExChacra.id,
        numero,
      );

      /*
       * SQLite ya fue actualizado.
       *
       * Actualizamos también el Feature
       * que ya tenemos en memoria para no
       * necesitar recargar todo el mapa.
       */
      feature.set(
        "numero",
        numero,
      );

      feature.changed();

      setSelectedExChacra(
        (current) =>
          current
            ? {
                ...current,
                numero,
              }
            : null,
      );
    } catch (saveError) {
      console.error(
        "Error modificando el número:",
        saveError,
      );

      setError(
        "No se pudo guardar. Verificá que ese número no esté siendo usado por otra EXCHACRA.",
      );
    }
  }

  /*
   * --------------------------------------------------
   * EDITAR FORMA
   * --------------------------------------------------
   */
  function startShapeEditing() {
    const map =
      mapRef.current;

    const selectInteraction =
      selectInteractionRef.current;

    const feature =
      selectedFeatureRef.current;

    const geometry =
      feature?.getGeometry();

    const exChacrasSource =
      exChacrasSourceRef.current;

    if (
      !map ||
      !selectInteraction ||
      !feature ||
      !geometry
    ) {
      return;
    }

    if (mode !== "idle") {
      return;
    }

    if (
      !map ||
      !selectInteraction ||
      !feature ||
      !geometry ||
      !exChacrasSource
    ) {
      return;
    }

    setError(null);

    /*
     * Guardamos la geometría actual.
     *
     * clone() es fundamental:
     * no queremos guardar una referencia
     * que Modify vaya cambiando.
     */
    originalGeometryRef.current =
      geometry.clone();

    /*
     * La selección deja de responder
     * mientras editamos vértices.
     */
    selectInteraction.setActive(
      false,
    );

    /*
     * Modify trabaja exactamente sobre
     * el Feature seleccionado.
     */
    const modify =
      new Modify({
        features:
          selectInteraction
            .getFeatures(),
      });

    map.addInteraction(
      modify,
    );

    /*
    * Snap contra todas las EXCHACRAS
    * actualmente guardadas.
    */
    const snap =
      createExChacraSnapInteraction(
        exChacrasSource,
      );

    /*
    * Snap debe agregarse después
    * de Modify.
    */
    map.addInteraction(snap);

    snapInteractionRef.current =
      snap;

    snapFeedbackCleanupRef.current =
      attachExChacraSnapFeedback(
        map,
        snap,
      );

    modifyInteractionRef.current =
      modify;

    setMode("shape");
  }

  /*
   * Confirmar la nueva forma.
   */
  async function saveShape() {
    const feature =
      selectedFeatureRef.current;

    const selected =
      selectedExChacra;

    if (
      !feature ||
      !selected
    ) {
      return;
    }

    try {
      setError(null);

      const geoJson =
        geometryToGeoJson(
          feature,
        );

      await updateExChacraGeometry(
        selected.id,
        geoJson,
      );

      stopShapeEditing();

      originalGeometryRef.current =
        null;
    } catch (saveError) {
      console.error(
        "Error guardando geometría:",
        saveError,
      );

      setError(
        "No se pudo guardar la nueva forma.",
      );
    }
  }

  /*
   * Cancelar devuelve exactamente
   * la forma que tenía antes.
   */
  function cancelShape() {
    const feature =
      selectedFeatureRef.current;

    const originalGeometry =
      originalGeometryRef.current;

    if (
      feature &&
      originalGeometry
    ) {
      feature.setGeometry(
        originalGeometry.clone(),
      );

      feature.changed();
    }

    stopShapeEditing();

    originalGeometryRef.current =
      null;

    setError(null);
  }

  function stopShapeEditing() {
    const map =
      mapRef.current;

    if (
      map &&
      modifyInteractionRef.current
    ) {
      map.removeInteraction(
        modifyInteractionRef.current,
      );
    }

    /*
    * Eliminamos también el efecto imán.
    */
    if (
      map &&
      snapInteractionRef.current
    ) {
      map.removeInteraction(
        snapInteractionRef.current,
      );
    }

    snapFeedbackCleanupRef.current?.();

    modifyInteractionRef.current =
      null;

    snapInteractionRef.current =
      null;

    snapFeedbackCleanupRef.current =
      null;

    selectInteractionRef.current
      ?.setActive(true);

    setMode("idle");
  }

  /*
   * --------------------------------------------------
   * ELIMINAR
   * --------------------------------------------------
   */
  async function remove() {
    const feature =
      selectedFeatureRef.current;

    const selected =
      selectedExChacra;

    const source =
      exChacrasSourceRef.current;

    const selectInteraction =
      selectInteractionRef.current;

    if (
      !feature ||
      !selected ||
      !source
    ) {
      return;
    }

    /*
     * Por ahora utilizamos una confirmación
     * del sistema.
     *
     * Más adelante podemos reemplazarla
     * por nuestro propio modal.
     */
    const confirmed =
      window.confirm(
        `¿Eliminar definitivamente la EXCHACRA ${selected.numero}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      await deleteExChacra(
        selected.id,
      );

      /*
       * SQLite ya no contiene la entidad.
       *
       * También la sacamos del mapa.
       */
      source.removeFeature(
        feature,
      );

      selectInteraction
        ?.getFeatures()
        .clear();

      selectedFeatureRef.current =
        null;

      setSelectedExChacra(
        null,
      );
    } catch (deleteError) {
      console.error(
        "Error eliminando EXCHACRA:",
        deleteError,
      );

      setError(
        "No se pudo eliminar la EXCHACRA.",
      );
    }
  }


    /*
    * --------------------------------------------------
    * INICIAR UNA OPERACIÓN DE DUPLICACIÓN
    * --------------------------------------------------
    *
    * Recibe una geometría ya preparada.
    *
    * Puede provenir de:
    *
    * - una copia idéntica en el mismo lugar;
    * - una copia ya posicionada a la derecha;
    * - izquierda;
    * - arriba;
    * - abajo.
    */
    function beginDuplicate(
      geometry: Geometry,
    ) {
      const map =
        mapRef.current;

      const draftSource =
        draftSourceRef.current;

      const exChacrasSource =
        exChacrasSourceRef.current;

      const selectInteraction =
        selectInteractionRef.current;

      if (
        !map ||
        !draftSource ||
        !exChacrasSource ||
        !selectInteraction
      ) {
        return;
      }

      if (
        mode !== "idle"
      ) {
        return;
      }

      setError(null);

      setDuplicateNumber("");

      /*
      * Nueva entidad temporal.
      *
      * Todavía NO tiene UUID porque
      * todavía no fue guardada.
      */
      const duplicateFeature =
        new Feature<Geometry>({
          geometry,
        });

      draftSource.clear();

      draftSource.addFeature(
        duplicateFeature,
      );

      duplicateFeatureRef.current =
        duplicateFeature;

      /*
      * Solamente nuestra copia puede
      * ser arrastrada.
      */
      const features =
        new Collection<
          Feature<Geometry>
        >([
          duplicateFeature,
        ]);

      const translate =
        new Translate({
          features,
        });

      /*
      * --------------------------------------------------
      * SNAP DEL POLÍGONO COMPLETO
      * --------------------------------------------------
      *
      * Cuando el usuario suelta la copia
      * cerca de otra EXCHACRA, buscamos:
      *
      * - vértices cercanos;
      * - centros de bordes cercanos.
      *
      * Si encontramos una coincidencia,
      * movemos TODA la copia.
      */
      translate.on(
        "translateend",
        () => {
          snapFeatureToExistingExChacras(
            duplicateFeature,
            exChacrasSource,

            /*
            * Tolerancia en METROS.
            */
            8,
          );
        },
      );

      map.addInteraction(
        translate,
      );

      translateInteractionRef.current =
        translate;

      /*
      * Mientras movemos una copia,
      * no queremos seleccionar otras
      * EXCHACRAS accidentalmente.
      */
      selectInteraction.setActive(
        false,
      );

      setMode(
        "duplicate",
      );
    }

    /*
    * --------------------------------------------------
    * DUPLICAR Y MOVER LIBREMENTE
    * --------------------------------------------------
    *
    * Comportamiento que ya teníamos.
    */
    function startDuplicate() {
      const geometry =
        selectedFeatureRef.current
          ?.getGeometry();

      if (!geometry) {
        return;
      }

      /*
      * La geometría original jamás
      * se modifica.
      */
      beginDuplicate(
        geometry.clone(),
      );
    }

    /*
    * --------------------------------------------------
    * DUPLICAR CONTIGUA
    * --------------------------------------------------
    *
    * Esta es la nueva operación:
    *
    *        ↑
    *
    *   ← ORIGINAL →
    *
    *        ↓
    *
    * La posición inicial de la copia
    * ya queda matemáticamente pegada
    * al borde correspondiente.
    */
    function startAdjacentDuplicate(
      direction:
        AdjacentDirection,
    ) {
      const geometry =
        selectedFeatureRef.current
          ?.getGeometry();

      if (!geometry) {
        return;
      }

      try {
        setError(null);

        const adjacentGeometry =
          createAdjacentRectangleGeometry(
            geometry,
            direction,
          );

        beginDuplicate(
          adjacentGeometry,
        );
      } catch (
        duplicateError
      ) {
        console.error(
          "No se pudo duplicar la EXCHACRA contigua:",
          duplicateError,
        );

        setError(
          duplicateError instanceof Error
            ? duplicateError.message
            : "No se pudo crear la copia contigua.",
        );
      }
    }

  /*
   * Guardar la copia como una entidad
   * completamente nueva, con otro UUID.
   */
  async function saveDuplicate() {
    const duplicateFeature =
      duplicateFeatureRef.current;

    const source =
      exChacrasSourceRef.current;

    const selectInteraction =
      selectInteractionRef.current;

    if (
      !duplicateFeature ||
      !source
    ) {
      return;
    }

    const numero =
      Number(
        duplicateNumber,
      );

    if (
      !Number.isInteger(numero) ||
      numero <= 0
    ) {
      setError(
        "Ingresá un número válido para la nueva EXCHACRA.",
      );

      return;
    }

    try {
      setError(null);

      const geoJson =
        geometryToGeoJson(
          duplicateFeature,
        );

      /*
       * createExChacra genera un UUID nuevo.
       *
       * Por lo tanto la copia es una entidad
       * independiente del original.
       */
      const created =
        await createExChacra(
          numero,
          geoJson,
        );

      /*
       * Terminamos la herramienta temporal.
       */
      stopDuplicate();

      /*
       * Limpiamos la antigua selección antes
       * de reconstruir los Features desde DB.
       */
      selectInteraction
        ?.getFeatures()
        .clear();

      await loadExChacrasIntoSource(
        source,
      );

      /*
       * Buscamos el Feature recién creado
       * utilizando su UUID.
       */
      const createdFeature =
        source
          .getFeatures()
          .find(
            (feature) =>
              feature.get("id") ===
              created.id,
          );

      if (createdFeature) {
        selectedFeatureRef.current =
          createdFeature;

        selectInteraction
          ?.getFeatures()
          .push(
            createdFeature,
          );

        setSelectedExChacra({
          id: created.id,
          numero:
            created.numero,
        });
      }

      setDuplicateNumber("");
    } catch (duplicateError) {
      console.error(
        "Error duplicando EXCHACRA:",
        duplicateError,
      );

      setError(
        "No se pudo guardar la copia. Verificá que el número no exista.",
      );
    }
  }

  /*
   * Cancelar elimina únicamente
   * la copia temporal.
   *
   * La EXCHACRA original no se toca.
   */
  function cancelDuplicate() {
    stopDuplicate();

    setDuplicateNumber("");

    setError(null);
  }

  function stopDuplicate() {
    const map =
      mapRef.current;

    if (
      map &&
      translateInteractionRef.current
    ) {
      map.removeInteraction(
        translateInteractionRef.current,
      );
    }

    translateInteractionRef.current =
      null;

    duplicateFeatureRef.current =
      null;

    draftSourceRef.current
      ?.clear();

    selectInteractionRef.current
      ?.setActive(true);

    if (
      map &&
      snapInteractionRef.current
    ) {
      map.removeInteraction(
        snapInteractionRef.current,
      );
    }

    snapFeedbackCleanupRef.current?.();

    snapInteractionRef.current =
      null;

    snapFeedbackCleanupRef.current =
      null;  

    setMode("idle");
  }

  return {
    mode,
    error,
    duplicateNumber,
    setDuplicateNumber,
    saveNumber,
    startShapeEditing,
    saveShape,
    cancelShape,
    remove,
    startDuplicate,
    saveDuplicate,
    cancelDuplicate,
    startAdjacentDuplicate,
  };
}