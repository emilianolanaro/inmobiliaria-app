import {
  useEffect,
  useRef,
  useState,
} from "react";

import Map from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import Select from "ol/interaction/Select";
import { singleClick } from "ol/events/condition";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import {Fill, Stroke, Style,} from "ol/style";
import { fromLonLat } from "ol/proj";
import { useMapStore } from "../application/useMapStore";

import ExChacraDialog from "../../exchacras/presentation/ExChacraDialog";
import ExChacraSelectionPanel, {
  type SelectedExChacra,
} from "../../exchacras/presentation/ExChacraSelectionPanel";
import {
  createExChacraDraftLayer,
  createExChacraLayer,
  type ExChacraVectorSource,
  loadExChacrasIntoSource,
} from "../../exchacras/presentation/exChacraMap";
import ExChacraDrawingPanel from "../../exchacras/presentation/ExChacraDrawingPanel";
import {
  useExChacraDrawing,
} from "../../exchacras/presentation/drawing/useExChacraDrawing";
import {
  useExChacraEditing,
} from "../../exchacras/presentation/useExChacraEditing";

import "ol/ol.css";
import "./MapView.css";


/*
 * Centro inicial aproximado de Chajarí.
 *
 * [longitud, latitud]
 */
const CHAJARI_COORDINATES = [
  -57.98,
  -30.75,
];

function MapView() {
  /*
   * --------------------------------------------------
   * ELEMENTO HTML
   * --------------------------------------------------
   */

  const mapElement =
    useRef<HTMLDivElement | null>(
      null,
    );

  /*
   * --------------------------------------------------
   * REFERENCIA AL MAPA
   * --------------------------------------------------
   */

  const mapRef =
    useRef<Map | null>(null);

  /*
   * --------------------------------------------------
   * CAPAS
   * --------------------------------------------------
   */

  const baseLayerRef =
    useRef<
      TileLayer<OSM> | null
    >(null);

  const exChacrasLayerRef =
    useRef<
      ReturnType<
        typeof createExChacraLayer
      >["layer"] | null
    >(null);

  /*
   * Capa exclusivamente dedicada
   * a "EXCHACRA 95", etc.
   */
  const exChacraLabelsLayerRef =
    useRef<
      ReturnType<
        typeof createExChacraLayer
      >["labelsLayer"] | null
    >(null);

  /*
   * --------------------------------------------------
   * SOURCES
   * --------------------------------------------------
   */

  const exChacrasSourceRef =
    useRef<
      ExChacraVectorSource | null
    >(null);

  const draftSourceRef =
    useRef<
      ExChacraVectorSource | null
    >(null);

  /*
   * --------------------------------------------------
   * SELECCIÓN
   * --------------------------------------------------
   */

  const selectInteractionRef =
    useRef<Select | null>(
      null,
    );

  /*
   * Guardamos también el Feature real.
   *
   * Más adelante será el objeto que
   * editaremos, moveremos o duplicaremos.
   */
  const selectedFeatureRef =
    useRef<
      Feature<Geometry> | null
    >(null);

  const [
    selectedExChacra,
    setSelectedExChacra,
  ] =
    useState<
      SelectedExChacra | null
    >(null);

  /*
   * --------------------------------------------------
   * ESTADO GLOBAL DEL MAPA
   * --------------------------------------------------
   */

  const baseMapVisible =
    useMapStore(
      (state) =>
        state.baseMapVisible,
    );

  const exChacrasVisible =
    useMapStore(
      (state) =>
        state.layers.exchacras,
    );

  const exChacraLabelsVisible =
    useMapStore(
      (state) =>
        state.exChacraLabelsVisible,
    );

  const drawingMode =
    useMapStore(
      (state) =>
        state.drawingMode,
    );

  /*
   * --------------------------------------------------
   * CREACIÓN DE EXCHACRAS
   * --------------------------------------------------
   */

  const exChacraDrawing =
  useExChacraDrawing({
    mapRef,
    draftSourceRef,
    exChacrasSourceRef,
  });
   
  /*
 * --------------------------------------------------
 * EDITOR DE EXCHACRAS EXISTENTES
 * --------------------------------------------------
 */
const exChacraEditing =
  useExChacraEditing({
    mapRef,
    selectInteractionRef,
    selectedFeatureRef,
    exChacrasSourceRef,
    draftSourceRef,
    selectedExChacra,
    setSelectedExChacra,
  });  
  /*
   * --------------------------------------------------
   * INICIALIZAR OPENLAYERS
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    /*
     * MAPA BASE
     */
    const baseLayer =
      new TileLayer({
        source: new OSM(),

        visible:
          baseMapVisible,
      });

    /*
     * EXCHACRAS
     *
     * Ahora devuelve:
     *
     * - source
     * - layer
     * - labelsLayer
     */
    const exChacras =
      createExChacraLayer(
        exChacrasVisible,

        exChacraLabelsVisible,
      );

    /*
     * DIBUJO TEMPORAL
     */
    const draft =
      createExChacraDraftLayer();

    /*
     * Guardamos referencias.
     */
    baseLayerRef.current =
      baseLayer;

    exChacrasLayerRef.current =
      exChacras.layer;

    exChacraLabelsLayerRef.current =
      exChacras.labelsLayer;

    exChacrasSourceRef.current =
      exChacras.source;

    draftSourceRef.current =
      draft.source;

    /*
     * --------------------------------------------------
     * MAPA
     * --------------------------------------------------
     */
    const map =
      new Map({
        target:
          mapElement.current,

        layers: [
          baseLayer,

          /*
           * Polígonos.
           */
          exChacras.layer,

          /*
           * Textos.
           */
          exChacras.labelsLayer,

          /*
           * Dibujo en curso.
           */
          draft.layer,
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
    * --------------------------------------------------
    * SELECCIÓN DE EXCHACRAS
    * --------------------------------------------------
    *
    * Un clic:
    *   selecciona.
    *
    * Otro clic sobre la misma:
    *   deselecciona.
    */
    const selectInteraction =
      new Select({
        /*
        * Solamente se pueden seleccionar
        * Features de la capa de EXCHACRAS.
        */
        layers: [
          exChacras.layer,
        ],

        /*
        * La interacción se ejecuta
        * con un clic normal.
        */
        condition: singleClick,

        /*
        * Hace que el mismo clic funcione
        * como toggle:
        *
        * no seleccionada -> seleccionada
        * seleccionada    -> deseleccionada
        */
        toggleCondition: singleClick,

        /*
        * Solamente queremos trabajar con
        * una EXCHACRA a la vez.
        */
        multi: false,

        /*
        * Facilita hacer clic cerca
        * de los bordes del polígono.
        */
        hitTolerance: 6,

        /*
        * Estilo de la EXCHACRA
        * actualmente seleccionada.
        */
        style: new Style({
          stroke: new Stroke({
            color:
              "rgba(109, 40, 217, 1)",

            width: 4,
          }),

          fill: new Fill({
            color:
              "rgba(139, 92, 246, 0.22)",
          }),
        }),
      });

    selectInteraction.on(
      "select",
      (event) => {
        /*
        * Si se seleccionó una nueva EXCHACRA,
        * nos aseguramos de que sea la única
        * que quede seleccionada.
        */
        const feature =
          event.selected[0] as
            | Feature<Geometry>
            | undefined;

        if (feature) {
          const selectedFeatures =
            selectInteraction
              .getFeatures();

          /*
          * Quitamos cualquier otra selección.
          *
          * Esto mantiene el comportamiento
          * de selección única aunque usemos
          * toggleCondition.
          */
          const others =
            selectedFeatures
              .getArray()
              .filter(
                (selectedFeature) =>
                  selectedFeature !==
                  feature,
              );

          for (
            const otherFeature
            of others
          ) {
            selectedFeatures.remove(
              otherFeature,
            );
          }

          const id =
            feature.get("id");

          const numero =
            feature.get("numero");

          if (
            typeof id !== "string" ||
            typeof numero !== "number"
          ) {
            return;
          }

          selectedFeatureRef.current =
            feature;

          setSelectedExChacra({
            id,
            numero,
          });

          return;
        }

        /*
        * Si no hay Feature seleccionado pero
        * sí hubo uno deseleccionado, significa
        * que el usuario hizo nuevamente clic
        * sobre la EXCHACRA seleccionada.
        */
        if (
          event.deselected.length > 0
        ) {
          selectedFeatureRef.current =
            null;

          setSelectedExChacra(
            null,
          );
        }
      },
    );

    map.addInteraction(
      selectInteraction,
    );

    selectInteractionRef.current =
      selectInteraction;

    /*
     * --------------------------------------------------
     * CARGAR SQLITE
     * --------------------------------------------------
     */
    void loadExChacrasIntoSource(
      exChacras.source,
    ).catch((error) => {
      console.error(
        "Error cargando EXCHACRAS:",
        error,
      );
    });

    /*
     * --------------------------------------------------
     * CLEANUP
     * --------------------------------------------------
     */
    return () => {
      map.removeInteraction(
        selectInteraction,
      );

      map.setTarget(undefined);

      mapRef.current = null;

      baseLayerRef.current =
        null;

      exChacrasLayerRef.current =
        null;

      exChacraLabelsLayerRef.current =
        null;

      exChacrasSourceRef.current =
        null;

      draftSourceRef.current =
        null;

      selectInteractionRef.current =
        null;

      selectedFeatureRef.current =
        null;
    };
  }, []);

  /*
   * --------------------------------------------------
   * VISIBILIDAD MAPA BASE
   * --------------------------------------------------
   */

  useEffect(() => {
    baseLayerRef.current
      ?.setVisible(
        baseMapVisible,
      );
  }, [baseMapVisible]);

  /*
   * --------------------------------------------------
   * VISIBILIDAD DE POLÍGONOS
   * --------------------------------------------------
   */

  useEffect(() => {
    exChacrasLayerRef.current
      ?.setVisible(
        exChacrasVisible,
      );
  }, [exChacrasVisible]);

  /*
   * --------------------------------------------------
   * VISIBILIDAD DE ETIQUETAS
   * --------------------------------------------------
   */

  useEffect(() => {
    exChacraLabelsLayerRef.current
      ?.setVisible(
        exChacraLabelsVisible,
      );
  }, [
    exChacraLabelsVisible,
  ]);

  /*
   * --------------------------------------------------
   * SELECCIÓN VS DIBUJO
   * --------------------------------------------------
   *
   * Mientras se está dibujando una nueva
   * EXCHACRA desactivamos Select.
   *
   * Así los clics utilizados para dibujar
   * no seleccionan otras EXCHACRAS.
   */
  useEffect(() => {
    const selectInteraction =
      selectInteractionRef.current;

    if (!selectInteraction) {
      return;
    }

    const isDrawing =
      drawingMode !== null;

    selectInteraction.setActive(
      !isDrawing,
    );

    if (isDrawing) {
      /*
       * Limpiamos selección anterior.
       */
      selectInteraction
        .getFeatures()
        .clear();

      selectedFeatureRef.current =
        null;

      setSelectedExChacra(
        null,
      );
    }
  }, [drawingMode]);

  /*
   * --------------------------------------------------
   * CERRAR SELECCIÓN
   * --------------------------------------------------
   */

  function clearSelection() {
    selectInteractionRef.current
      ?.getFeatures()
      .clear();

    selectedFeatureRef.current =
      null;

    setSelectedExChacra(
      null,
    );
  }

  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <div className="map-container">
      <div
        ref={mapElement}
        className="map"
      />

      {selectedExChacra &&
        !exChacraDrawing.isNumberDialogOpen && (
          <ExChacraSelectionPanel
            exChacra={
              selectedExChacra
            }

            mode={
              exChacraEditing.mode
            }

            error={
              exChacraEditing.error
            }

            onClose={
              clearSelection
            }

            onUpdateNumber={
              exChacraEditing.saveNumber
            }

            onStartShapeEditing={
              exChacraEditing
                .startShapeEditing
            }

            onSaveShape={
              exChacraEditing
                .saveShape
            }

            onCancelShape={
              exChacraEditing
                .cancelShape
            }

            onDuplicate={
              exChacraEditing
                .startDuplicate
            }

            onDelete={
              exChacraEditing
                .remove
            }
            
            onDuplicateAdjacent={
              exChacraEditing
                .startAdjacentDuplicate
            }
          />
        )}

      {exChacraDrawing
        .isDrawingPanelOpen && (
        <ExChacraDrawingPanel
          drawMode={
            exChacraDrawing
              .drawMode
          }

          rectangleMode={
            exChacraDrawing
              .rectangleMode
          }

          widthValue={
            exChacraDrawing
              .widthValue
          }

          heightValue={
            exChacraDrawing
              .heightValue
          }

          rotationValue={
            exChacraDrawing
              .rotationValue
          }

          exactRectangleReady={
            exChacraDrawing
              .exactRectangleReady
          }

          error={
            exChacraDrawing.error
          }

          onDrawModeChange={
            exChacraDrawing
              .changeDrawMode
          }

          onRectangleModeChange={
            exChacraDrawing
              .changeRectangleMode
          }

          onWidthChange={
            exChacraDrawing
              .setWidthValue
          }

          onHeightChange={
            exChacraDrawing
              .setHeightValue
          }

          onRotationChange={
            exChacraDrawing
              .setRotationValue
          }

          onGenerateRectangle={
            exChacraDrawing
              .generateExactRectangle
          }

          onConfirmRectangle={
            exChacraDrawing
              .confirmExactRectangle
          }

          onCancel={
            exChacraDrawing
              .cancelDrawing
          }

          fixedLengthEnabled={
            exChacraDrawing
              .fixedLengthEnabled
          }

          fixedLengthValue={
            exChacraDrawing
              .fixedLengthValue
          }

          freeVertexCount={
            exChacraDrawing
              .freeVertexCount
          }

          liveSegmentLength={
            exChacraDrawing
              .liveSegmentLength
          }

          liveSegmentAngle={
            exChacraDrawing
              .liveSegmentAngle
          }

          onFixedLengthEnabledChange={
            exChacraDrawing
              .setFixedLengthEnabled
          }

          onFixedLengthValueChange={
            exChacraDrawing
              .setFixedLengthValue
          }

          onUndoFreePoint={
            exChacraDrawing
              .undoFreePoint
          }

          onFinishFreePolygon={
            exChacraDrawing
              .finishFreePolygon
          }
        />
      )}

      {exChacraDrawing
        .isNumberDialogOpen && (
        <ExChacraDialog
          title="Guardar EXCHACRA"

          numberValue={
            exChacraDrawing
              .numberValue
          }

          error={
            exChacraDrawing.error
          }

          onNumberChange={
            exChacraDrawing
              .setNumberValue
          }

          onCancel={
            exChacraDrawing
              .cancelNumberDialog
          }

          onSave={() =>
            void exChacraDrawing
              .save()
          }
        />
      )}

      {exChacraEditing.mode ===
        "duplicate" && (
        <ExChacraDialog
          title="Duplicar EXCHACRA"

          description="Arrastrá la copia roja sobre el mapa hasta su nueva ubicación y asignale un número."

          saveLabel="Guardar copia"

          numberValue={
            exChacraEditing
              .duplicateNumber
          }

          error={
            exChacraEditing.error
          }

          onNumberChange={
            exChacraEditing
              .setDuplicateNumber
          }

          onCancel={
            exChacraEditing
              .cancelDuplicate
          }

          onSave={() =>
            void exChacraEditing
              .saveDuplicate()
          }
        />
      )}
    </div>
  );
}

export default MapView;